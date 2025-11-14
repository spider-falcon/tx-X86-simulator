
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Registers, Flags, Memory, ProgramFile } from '@/lib/x86/types';
import { INITIAL_REGISTERS, INITIAL_FLAGS, MEMORY_SIZE, CODE_START_ADDRESS } from '@/lib/x86/constants';
import { samplePrograms } from '@/lib/x86/sample-programs';
import { parseCode } from '@/lib/x86/parser';
import * as executor from '@/lib/x86/executor';
import { useToast } from './use-toast';
import { updateFileCode, addFile as fmAddFile, renameFile as fmRenameFile, deleteFile as fmDeleteFile } from '@/lib/x86/fileManager';

export const useX86Simulator = () => {
    const { toast } = useToast();
    const [registers, setRegisters] = useState<Registers>(INITIAL_REGISTERS);
    const [flags, setFlags] = useState<Flags>(INITIAL_FLAGS);
    const [memory, setMemory] = useState<Memory>(() => new Uint8Array(MEMORY_SIZE));
    
    const [files, setFiles] = useState<ProgramFile[]>(samplePrograms);
    const [activeFile, setActiveFile] = useState<string>(samplePrograms[0].name);

    const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
    const [history, setHistory] = useState<string[]>([]);
    const [output, setOutput] = useState<string[]>([]);
    const [callStack, setCallStack] = useState<string[]>([]);
    
    const [cycles, setCycles] = useState(0);
    const [executionTime, setExecutionTime] = useState(0);
    
    const [isRunning, setIsRunning] = useState(false);
    const runnerRef = useRef<NodeJS.Timeout | null>(null);

    const activeCode = useMemo(() => files.find(f => f.name === activeFile)?.code || '', [files, activeFile]);
    
    const { instructions: parsedInstructions, labels, lineMap, dataSegment } = useMemo(() => parseCode(activeCode), [activeCode]);

    const currentLine = useMemo(() => lineMap.get(registers.EIP) || 0, [registers.EIP, lineMap]);

    const loadDataSegment = useCallback(() => {
        const newMemory = new Uint8Array(MEMORY_SIZE);
        newMemory.set(dataSegment, 0); 
        setMemory(newMemory);
    }, [dataSegment]);


    const stateRef = useRef({
        registers,
        flags,
        memory,
        breakpoints,
        toast,
        isRunning,
        lineMap,
        parsedInstructions,
        labels,
    });

    useEffect(() => {
        stateRef.current = {
            registers,
            flags,
            memory,
            breakpoints,
            toast,
            isRunning,
            lineMap,
            parsedInstructions,
            labels,
        };
    }, [registers, flags, memory, breakpoints, toast, isRunning, lineMap, parsedInstructions, labels]);


    const stopRunner = useCallback(() => {
        if (runnerRef.current) {
            clearInterval(runnerRef.current);
            runnerRef.current = null;
        }
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        stopRunner();
        setRegisters(INITIAL_REGISTERS);
        setFlags(INITIAL_FLAGS);
        loadDataSegment();
        setHistory([]);
        setOutput([]);
        setCallStack([]);
        setCycles(0);
        setExecutionTime(0);
        toast({ title: "Simulator Reset", description: "State cleared." });
    }, [toast, stopRunner, loadDataSegment]);
    
    useEffect(() => {
      reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFile, parsedInstructions]);

    const executeInstruction = useCallback(() => {
        let shouldContinue = true;

        const instructionIndex = stateRef.current.registers.EIP - CODE_START_ADDRESS;
        
        if (instructionIndex < 0 || instructionIndex >= stateRef.current.parsedInstructions.length) {
            stopRunner();
            if(!stateRef.current.isRunning){
                toast({ variant: "destructive", title: "Execution Halted", description: "End of program reached." });
            }
            shouldContinue = false;
            return { shouldContinue };
        }

        const instruction = stateRef.current.parsedInstructions[instructionIndex];
        const result = executor.step(instruction, stateRef.current.registers, stateRef.current.flags, stateRef.current.memory, stateRef.current.labels, stopRunner);

        if (result.memoryMutated) {
            setMemory(new Uint8Array(result.memory));
        }

        setHistory(h => [result.historyLog, ...h].slice(0, 100));
        setFlags(result.flags);
        setRegisters(result.registers);
        
        if (result.output) {
            setOutput(o => [result.output!, ...o].slice(0, 100));
        }

        if (result.callStackUpdate.length > 0) {
            setCallStack(cs => {
                if (result.callStackUpdate[0] === 'ret') {
                    return cs.slice(1);
                }
                return [result.callStackUpdate[0], ...cs];
            });
        }

        setCycles(c => c + 1);

        return { shouldContinue };
    }, [stopRunner, toast]);


    const step = useCallback(() => {
        executeInstruction();
    }, [executeInstruction]);

    const run = useCallback(() => {
        if(stateRef.current.isRunning) {
            stopRunner();
            return;
        }
        
        setIsRunning(true);
        const startTime = performance.now();

        runnerRef.current = setInterval(() => {
            const { registers: currentRegisters, breakpoints: currentBreakpoints, toast: currentToast, lineMap: currentLineMap } = stateRef.current;
            setExecutionTime(performance.now() - startTime);
            
            const currentLineForBreakpoint = currentLineMap.get(currentRegisters.EIP);
            
            if (currentLineForBreakpoint && currentBreakpoints.has(currentLineForBreakpoint)) {
                stopRunner();
                currentToast({ title: "Execution Paused", description: `Breakpoint hit at line ${currentLineForBreakpoint}.` });
                return;
            }

            const { shouldContinue } = executeInstruction();
            if (!shouldContinue) {
                stopRunner();
            }
        }, 50); // Speed of execution
    }, [executeInstruction, stopRunner]);
    
    useEffect(() => {
        return () => {
            if(runnerRef.current) {
                clearInterval(runnerRef.current);
            }
        }
    }, []);

    const toggleBreakpoint = useCallback((line: number) => {
        setBreakpoints(prev => {
            const newBreakpoints = new Set(prev);
if (newBreakpoints.has(line)) {
                newBreakpoints.delete(line);
            } else {
                newBreakpoints.add(line);
            }
            return newBreakpoints;
        });
    }, []);

    const updateCode = useCallback((fileName: string, newCode: string) => {
        setFiles(currentFiles => updateFileCode(currentFiles, fileName, newCode));
    }, []);

    const addFile = useCallback(() => {
        setFiles(currentFiles => {
            const { files: newFiles, newName } = fmAddFile(currentFiles);
            setActiveFile(newName);
            return newFiles;
        });
    }, []);

    const renameFile = useCallback((oldName: string, newName: string) => {
        setFiles(currentFiles => {
            const { files: newFiles, success } = fmRenameFile(currentFiles, oldName, newName);
            if (success) {
                if (activeFile === oldName) {
                    setActiveFile(newName);
                }
                toast({ title: "File Renamed", description: `"${oldName}" is now "${newName}".`});
            } else {
                toast({ variant: "destructive", title: "Rename failed", description: `A file named "${newName}" already exists.` });
            }
            return newFiles;
        });
    }, [activeFile, toast]);

    const deleteFile = useCallback((fileName: string) => {
        setFiles(currentFiles => {
            const { files: newFiles, newActiveFile } = fmDeleteFile(currentFiles, fileName, activeFile);
            if (newActiveFile) {
                setActiveFile(newActiveFile);
            } else {
                const { files: withNewFile, newName } = fmAddFile([]);
                setActiveFile(newName);
                return withNewFile;
            }
            return newFiles;
        });
    }, [activeFile]);

    return {
        registers,
        flags,
        memory,
        files,
        activeFile,
        setActiveFile,
        updateCode,
        addFile,
        renameFile,
        deleteFile,
        breakpoints,
        toggleBreakpoint,
        history,
        output,
        callStack,
        cycles,
        executionTime,
        step,
        run,
        reset,
        isRunning,
        currentLine,
        instructions: parsedInstructions,
    };
};
