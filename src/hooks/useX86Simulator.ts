
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

type ToastMessage = {
    id: number;
    variant?: "default" | "destructive" | null;
    title: string;
    description: string;
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
    const [toastQueue, setToastQueue] = useState<ToastMessage[]>([]);
    
    const runnerRef = useRef<NodeJS.Timeout | null>(null);
    const executionStartTimeRef = useRef<number>(0);
    const stateRef = useRef(simState);
    stateRef.current = simState;

    useEffect(() => {
        if (toastQueue.length > 0) {
            const message = toastQueue[0];
            toast({ variant: message.variant, title: message.title, description: message.description });
            setToastQueue(q => q.slice(1));
        }
    }, [toastQueue, toast]);

    const queueToast = (title: string, description: string, variant: ToastMessage['variant'] = 'default') => {
        const newMessage: ToastMessage = { id: Date.now(), title, description, variant };
        setToastQueue(q => [...q, newMessage]);
    };

    const currentLine = useMemo(() => lineMap.get(simState.registers.EIP) || 0, [simState.registers.EIP, lineMap]);
    
    const stopRunner = useCallback((message?: {title: string, description: string, variant?: ToastMessage['variant']}) => {
        if (runnerRef.current) {
            clearInterval(runnerRef.current);
            runnerRef.current = null;
        }
        setIsRunning(false);
        if (message) {
            queueToast(message.title, message.description, message.variant || 'destructive');
        }
    }, []);
    
    const executeSingleInstruction = useCallback((currentState: SimulatorState): SimulatorState => {
        const instructionIndex = currentState.registers.EIP - CODE_START_ADDRESS;
        
        if (instructionIndex < 0 || instructionIndex >= parsedInstructions.length) {
            stopRunner({ title: "Execution Halted", description: "End of program reached." });
            return currentState;
        }
        
        const instruction = parsedInstructions[instructionIndex];
        const result = executor.step(
            instruction, 
            currentState.registers, 
            currentState.flags, 
            currentState.memory, 
            labels, 
            (msg) => stopRunner({title: "Execution Halted", description: msg})
        );
        
        const newHistory = [result.historyLog, ...currentState.history].slice(0, 100);
        const newOutput = result.output ? [result.output, ...currentState.output].slice(0, 100) : currentState.output;
        
        let newCallStack = currentState.callStack;
        if (result.callStackUpdate.length > 0) {
            if (result.callStackUpdate[0] === 'ret') {
                newCallStack = currentState.callStack.slice(1);
            } else {
                newCallStack = [result.callStackUpdate[0], ...currentState.callStack];
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
    }, [parsedInstructions, labels, stopRunner]);

    const reset = useCallback(() => {
        stopRunner();
        const { dataSegment } = parseCode(activeCode);
        setSimState(getInitialState(dataSegment));
        if (parsedInstructions.length === 0) {
             queueToast("Parser Warning", "No executable instructions found.", "destructive");
        } else {
             queueToast("Simulator Reset", "State cleared and program reloaded.", "default");
        }
    }, [activeCode, parsedInstructions.length, stopRunner]);

    useEffect(() => {
        reset();
    }, [activeFile]);


    const step = useCallback(() => {
        if (isRunning) return;
        setSimState(prevState => executeSingleInstruction(prevState));
    }, [isRunning, executeSingleInstruction]);

    const run = useCallback(() => {
        if(isRunning) {
            stopRunner();
            return;
        }
        
        setIsRunning(true);
        executionStartTimeRef.current = performance.now();

        runnerRef.current = setInterval(() => {
             const currentState = stateRef.current;

            if (currentState.registers.EIP >= CODE_START_ADDRESS + parsedInstructions.length) {
                stopRunner({ title: "Execution Finished", description: "End of program reached.", variant: "default" });
                return;
            }

            const currentLineForBreakpoint = lineMap.get(currentState.registers.EIP);
            
            if (currentLineForBreakpoint && breakpoints.has(currentLineForBreakpoint)) {
                stopRunner({ title: "Execution Paused", description: `Breakpoint hit at line ${currentLineForBreakpoint}.`, variant: "default" });
                return;
            }
            
            const nextState = executeSingleInstruction(currentState);
            
            setSimState({
                ...nextState,
                executionTime: performance.now() - executionStartTimeRef.current,
            });
        }, 50); 
    }, [isRunning, stopRunner, executeSingleInstruction, lineMap, breakpoints, parsedInstructions.length]);
    
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
                queueToast("File Renamed", `"${oldName}" is now "${newName}".`, "default");
            } else {
                queueToast("Rename failed", `A file named "${newName}" already exists.`, "destructive");
            }
            return newFiles;
        });
    }, [activeFile]);

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
