
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

    const activeCode = files.find(f => f.name === activeFile)?.code || '';
    
    const { instructions: parsedInstructions, labels, lineMap, dataSegment } = useMemo(() => parseCode(activeCode), [activeCode]);

    const currentLine = lineMap.get(registers.EIP) || 0;

    const loadDataSegment = useCallback(() => {
        const newMemory = new Uint8Array(MEMORY_SIZE);
        newMemory.set(dataSegment, 0); 
        setMemory(newMemory);
        return { memory: newMemory, labels };
    }, [dataSegment, labels]);


    // Refs to hold the latest state for the run loop
    const stateRef = useRef({
        registers,
        flags,
        memory,
        breakpoints,
        toast,
        isRunning,
        callStack,
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
            callStack,
            lineMap,
            parsedInstructions,
            labels,
        };
    }, [registers, flags, memory, breakpoints, toast, isRunning, callStack, lineMap, parsedInstructions, labels]);


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
        const { memory: newMemory } = loadDataSegment();
        setMemory(newMemory);
        setHistory([]);
        setOutput([]);
        setCallStack([]);
        setCycles(0);
        setExecutionTime(0);
        toast({ title: "Simulator Reset", description: "State cleared." });
    }, [toast, stopRunner, loadDataSegment]);

    const step = useCallback((isRun = false) => {
        const currentState = stateRef.current;
        const instructionIndex = currentState.registers.EIP - CODE_START_ADDRESS;
        
        if (instructionIndex < 0 || instructionIndex >= currentState.parsedInstructions.length) {
            if (!isRun || currentState.isRunning) {
                currentState.toast({ variant: "destructive", title: "Execution Halted", description: "End of program reached." });
            }
            stopRunner();
            return { shouldContinue: false };
        }

        const instruction = currentState.parsedInstructions[instructionIndex];
        const result = executor.step(instruction, currentState.registers, currentState.flags, currentState.memory, currentState.labels, stopRunner);

        setRegisters(result.registers);
        setFlags(result.flags);
        setHistory(h => [result.historyLog, ...h].slice(0, 100));
        
        if (result.output) {
            setOutput(o => [result.output!, ...o].slice(0, 100));
        }

        if (result.callStack.length > 0) {
            setCallStack(cs => {
                if (result.callStack[0] === 'ret') {
                    return cs.slice(1);
                }
                return [result.callStack[0], ...cs];
            });
        }

        setCycles(c => c + 1);
        return { shouldContinue: true };
    }, [stopRunner]);

    const run = useCallback(() => {
        if(stateRef.current.isRunning) {
            stopRunner();
            return;
        }
        
        const { memory: newMemory, labels: newLabels } = loadDataSegment();
        setMemory(newMemory);

        stateRef.current.memory = newMemory;
        stateRef.current.labels = newLabels;

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

            const { shouldContinue } = step(true);
            if (!shouldContinue) {
                stopRunner();
            }
        }, 50); // Speed of execution
    }, [step, stopRunner, loadDataSegment]);
    
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
        reset();
    }, [reset]);

    const addFile = useCallback(() => {
        setFiles(currentFiles => {
            const { files: newFiles, newName } = fmAddFile(currentFiles);
            setActiveFile(newName);
            return newFiles;
        });
        reset();
    }, [reset]);

    const renameFile = useCallback((oldName: string, newName: string) => {
        setFiles(currentFiles => {
            const { files: newFiles, success } = fmRenameFile(currentFiles, oldName, newName);
            if (success) {
                setActiveFile(newName);
                reset();
            } else {
                toast({ variant: "destructive", title: "Rename failed", description: `A file named "${newName}" already exists.` });
            }
            return newFiles;
        });
    }, [toast, reset]);

    const deleteFile = useCallback((fileName: string) => {
        setFiles(currentFiles => {
            const { files: newFiles, newActiveFile } = fmDeleteFile(currentFiles, fileName, activeFile);
            if (newActiveFile) {
                setActiveFile(newActiveFile);
            } else {
                const { files: withNewFile, newName } = fmAddFile([]);
                setActiveFile(newName);
                reset();
                return withNewFile;
            }
            reset();
            return newFiles;
        });
    }, [activeFile, reset]);

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
        step: () => step(false),
        run,
        reset,
        isRunning,
        currentLine,
    };
};

    