
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Registers, Flags, Memory, ProgramFile } from '@/lib/x86/types';
import { INITIAL_REGISTERS, INITIAL_FLAGS, MEMORY_SIZE, CODE_START_ADDRESS } from '@/lib/x86/constants';
import { samplePrograms } from '@/lib/x86/sample-programs';
import { parseCode } from '@/lib/x86/parser';
import * as executor from '@/lib/x86/executor';
import { useToast } from './use-toast';
import { updateFileCode, addFile as fmAddFile, renameFile as fmRenameFile, deleteFile as fmDeleteFile } from '@/lib/x86/fileManager';

type SimulatorState = {
    registers: Registers;
    flags: Flags;
    memory: Memory;
    history: string[];
    output: string[];
    callStack: string[];
    cycles: number;
    executionTime: number;
};

const getInitialState = (dataSegment: Uint8Array): SimulatorState => {
    const initialMemory = new Uint8Array(MEMORY_SIZE);
    initialMemory.set(dataSegment, 0);
    return {
        registers: INITIAL_REGISTERS,
        flags: INITIAL_FLAGS,
        memory: initialMemory,
        history: [],
        output: [],
        callStack: [],
        cycles: 0,
        executionTime: 0,
    };
};

export const useX86Simulator = () => {
    const { toast } = useToast();
    
    const [files, setFiles] = useState<ProgramFile[]>(samplePrograms);
    const [activeFile, setActiveFile] = useState<string>(samplePrograms[0].name);

    const activeCode = useMemo(() => files.find(f => f.name === activeFile)?.code || '', [files, activeFile]);
    const { instructions: parsedInstructions, labels, lineMap, dataSegment } = useMemo(() => parseCode(activeCode), [activeCode]);

    const [simState, setSimState] = useState<SimulatorState>(() => getInitialState(dataSegment));
    const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
    const [isRunning, setIsRunning] = useState(false);
    
    const runnerRef = useRef<NodeJS.Timeout | null>(null);
    const executionStartTimeRef = useRef<number>(0);

    const currentLine = useMemo(() => lineMap.get(simState.registers.EIP) || 0, [simState.registers.EIP, lineMap]);

    const stopRunner = useCallback(() => {
        if (runnerRef.current) {
            clearInterval(runnerRef.current);
            runnerRef.current = null;
        }
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        stopRunner();
        setSimState(getInitialState(dataSegment));
        toast({ title: "Simulator Reset", description: "State cleared." });
    }, [stopRunner, dataSegment, toast]);
    
    useEffect(() => {
      reset();
    }, [activeFile, parsedInstructions, reset]);

    const executeSingleInstruction = useCallback((currentState: SimulatorState): SimulatorState => {
        const instructionIndex = currentState.registers.EIP - CODE_START_ADDRESS;
        
        if (instructionIndex < 0 || instructionIndex >= parsedInstructions.length) {
            stopRunner();
            if(!isRunning){
                toast({ variant: "destructive", title: "Execution Halted", description: "End of program reached." });
            }
            return currentState;
        }

        const instruction = parsedInstructions[instructionIndex];
        const result = executor.step(instruction, currentState.registers, currentState.flags, currentState.memory, labels, stopRunner);
        
        const newHistory = [result.historyLog, ...currentState.history].slice(0, 100);
        const newOutput = result.output ? [result.output, ...currentState.output].slice(0, 100) : currentState.output;
        
        let newCallStack = currentState.callStack;
        if (result.callStackUpdate.length > 0) {
            if (result.callStackUpdate[0] === 'ret') {
                newCallStack = newCallStack.slice(1);
            } else {
                newCallStack = [result.callStackUpdate[0], ...newCallStack];
            }
        }
        
        const newMemory = result.memoryMutated ? new Uint8Array(result.memory) : currentState.memory;

        return {
            ...currentState,
            registers: result.registers,
            flags: result.flags,
            memory: newMemory,
            history: newHistory,
            output: newOutput,
            callStack: newCallStack,
            cycles: currentState.cycles + 1,
        };
    }, [parsedInstructions, labels, stopRunner, isRunning, toast]);


    const step = useCallback(() => {
        setSimState(prevState => executeSingleInstruction(prevState));
    }, [executeSingleInstruction]);

    const run = useCallback(() => {
        if(isRunning) {
            stopRunner();
            return;
        }
        
        setIsRunning(true);
        executionStartTimeRef.current = performance.now();

        runnerRef.current = setInterval(() => {
            setSimState(prevState => {
                const currentLineForBreakpoint = lineMap.get(prevState.registers.EIP);
                
                if (currentLineForBreakpoint && breakpoints.has(currentLineForBreakpoint)) {
                    stopRunner();
                    toast({ title: "Execution Paused", description: `Breakpoint hit at line ${currentLineForBreakpoint}.` });
                    return prevState;
                }
                
                const nextState = executeSingleInstruction(prevState);
                
                // Update execution time inside the state update to keep it synced
                return {
                    ...nextState,
                    executionTime: performance.now() - executionStartTimeRef.current,
                };
            });
        }, 50); // Speed of execution
    }, [isRunning, stopRunner, executeSingleInstruction, lineMap, breakpoints, toast]);
    
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
        registers: simState.registers,
        flags: simState.flags,
        memory: simState.memory,
        files,
        activeFile,
        setActiveFile,
        updateCode,
        addFile,
        renameFile,
        deleteFile,
        breakpoints,
        toggleBreakpoint,
        history: simState.history,
        output: simState.output,
        callStack: simState.callStack,
        cycles: simState.cycles,
        executionTime: simState.executionTime,
        step,
        run,
        reset,
        isRunning,
        currentLine,
        instructions: parsedInstructions,
    };
};
