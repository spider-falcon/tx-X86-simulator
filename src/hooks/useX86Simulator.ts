
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Registers, Flags, Memory, ProgramFile, Instruction } from '@/lib/x86/types';
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
    parsedInstructions: Instruction[],
    labels: Map<string, number>,
    lineMap: Map<number, number>,
};

type ToastMessage = {
    title: string;
    description: string;
    variant?: 'default' | 'destructive' | null;
} | null;

const getInitialState = (code: string): SimulatorState => {
    const { instructions: parsedInstructions, labels, lineMap, dataSegment } = parseCode(code);
    const memory = new Uint8Array(MEMORY_SIZE);
    memory.set(dataSegment);

    return {
        registers: { ...INITIAL_REGISTERS },
        flags: { ...INITIAL_FLAGS },
        memory: memory,
        history: [],
        output: [],
        callStack: [],
        cycles: 0,
        executionTime: 0,
        parsedInstructions,
        labels,
        lineMap,
    };
};


export const useX86Simulator = () => {
    const { toast } = useToast();
    
    const [files, setFiles] = useState<ProgramFile[]>(samplePrograms);
    const [activeFile, setActiveFile] = useState<string>(samplePrograms[0].name);

    const activeCode = useMemo(() => files.find(f => f.name === activeFile)?.code || '', [files, activeFile]);

    const [simState, setSimState] = useState<SimulatorState>(() => getInitialState(activeCode));
    const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
    const [isRunning, setIsRunning] = useState(false);
    const [toastMessage, setToastMessage] = useState<ToastMessage>(null);
    
    const runnerRef = useRef<number | null>(null);
    const executionStartTimeRef = useRef<number>(0);
    
    const stopRunner = useCallback((message: ToastMessage = null) => {
        setIsRunning(false);
        if (runnerRef.current) {
            cancelAnimationFrame(runnerRef.current);
            runnerRef.current = null;
        }
        if (message) {
            setToastMessage(message);
        }
    }, []);

    const reset = useCallback(() => {
        stopRunner();
        setSimState(getInitialState(activeCode));

        const { instructions } = parseCode(activeCode);
        if (instructions.length === 0 && activeCode.trim().length > 0) {
             setToastMessage({ variant: "destructive", title: "Parser Warning", description: "No executable instructions found." });
        } else {
             setToastMessage({ title: "Simulator Reset", description: "State cleared and program reloaded." });
        }
    }, [activeCode, stopRunner]);

    // This effect ensures that when the active file changes, the simulator is properly reset.
    useEffect(() => {
        reset();
    }, [activeFile, reset]);
    
    const executeSingleInstruction = useCallback((currentState: SimulatorState): SimulatorState | null => {
        const { registers, parsedInstructions } = currentState;
        const instructionIndex = registers.EIP - CODE_START_ADDRESS;
        
        if (instructionIndex < 0 || instructionIndex >= parsedInstructions.length) {
            stopRunner({ title: "Execution Halted", description: "End of program reached.", variant: "default" });
            return null;
        }
        
        const instruction = parsedInstructions[instructionIndex];
        
        const haltExecution = (reason: string) => {
            stopRunner({title: "Execution Halted", description: reason, variant: "destructive"});
        }

        const result = executor.step(
            instruction, 
            currentState.registers, 
            currentState.flags, 
            currentState.memory, 
            currentState.labels, 
            haltExecution
        );

        if (!result) return null; // Execution was halted by the executor
        
        const newHistory = [result.historyLog, ...currentState.history].slice(0, 100);
        const newOutput = result.output ? [...currentState.output, result.output].slice(-100) : currentState.output;
        
        let newCallStack = currentState.callStack;
        if (result.callStackUpdate.length > 0) {
            if (result.callStackUpdate[0] === 'ret') {
                newCallStack = currentState.callStack.slice(1);
            } else {
                newCallStack = [result.callStackUpdate[0], ...currentState.callStack];
            }
        }
        
        return {
            ...currentState,
            registers: result.registers,
            flags: result.flags,
            memory: result.memory,
            history: newHistory,
            output: newOutput,
            callStack: newCallStack,
            cycles: currentState.cycles + 1,
        };
    }, [stopRunner]);

    useEffect(() => {
        if (toastMessage) {
            toast(toastMessage);
            setToastMessage(null);
        }
    }, [toastMessage, toast]);

    const step = useCallback(() => {
        if (isRunning || simState.parsedInstructions.length === 0) return;
        setSimState(prevState => {
            const nextState = executeSingleInstruction(prevState);
            return nextState ?? prevState;
        });
    }, [isRunning, executeSingleInstruction, simState.parsedInstructions.length]);

    const run = useCallback(() => {
        if (isRunning) {
            stopRunner();
            return;
        }

        if (simState.parsedInstructions.length === 0) {
            setToastMessage({ title: "Cannot Run", description: "No instructions to execute.", variant: "destructive" });
            return;
        }
        
        setIsRunning(true);
        executionStartTimeRef.current = performance.now();
        
        const runLoop = () => {
            setSimState(prevState => {
                if (!runnerRef.current) { // isRunning has been set to false
                    return prevState;
                }
                if (prevState.registers.EIP >= CODE_START_ADDRESS + prevState.parsedInstructions.length) {
                    stopRunner({ title: "Execution Finished", description: "End of program reached.", variant: "default" });
                    return prevState;
                }
    
                const currentLineForBreakpoint = prevState.lineMap.get(prevState.registers.EIP);
                
                if (currentLineForBreakpoint && breakpoints.has(currentLineForBreakpoint)) {
                    stopRunner({ title: "Execution Paused", description: `Breakpoint hit at line ${currentLineForBreakpoint}.`, variant: "default" });
                    return prevState;
                }
                
                const nextState = executeSingleInstruction(prevState);

                if (nextState) {
                    runnerRef.current = requestAnimationFrame(runLoop);
                    return {
                        ...nextState,
                        executionTime: performance.now() - executionStartTimeRef.current,
                    };
                }
                
                // If nextState is null, it means stopRunner was called inside executeSingleInstruction
                return prevState;
            });
        };

        runnerRef.current = requestAnimationFrame(runLoop);

    }, [isRunning, stopRunner, executeSingleInstruction, simState.parsedInstructions.length, breakpoints]);
    
    useEffect(() => {
        return () => {
            if(runnerRef.current) {
                cancelAnimationFrame(runnerRef.current);
            }
        }
    }, []);

    const currentLine = useMemo(() => simState.lineMap.get(simState.registers.EIP) || 0, [simState.registers.EIP, simState.lineMap]);

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
        if (fileName === activeFile) {
            // Immediately update the simulator state for the active file
            setSimState(getInitialState(newCode));
        }
    }, [activeFile]);

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
                setToastMessage({ title: "File Renamed", description: `"${oldName}" is now "${newName}".`});
            } else {
                setToastMessage({ variant: "destructive", title: "Rename failed", description: `A file named "${newName}" already exists.` });
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
                // If all files are deleted, create a new one
                const { files: withNewFile, newName } = fmAddFile([]);
                setActiveFile(newName);
                setToastMessage({ title: "File Deleted", description: `"${fileName}" has been removed.`});
                return withNewFile;
            }
            setToastMessage({ title: "File Deleted", description: `"${fileName}" has been removed.`});
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
        updateCode: (fileName: string, code: string) => {
            const newFiles = updateFileCode(files, fileName, code);
            setFiles(newFiles);
            if (fileName === activeFile) {
              reset(); // Re-parse and reset the state when code changes
            }
        },
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
    };
};

    