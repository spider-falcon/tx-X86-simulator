"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Registers, Flags, Memory, ProgramFile } from '@/lib/x86/types';
import { INITIAL_REGISTERS, INITIAL_FLAGS, MEMORY_SIZE, CODE_START_ADDRESS } from '@/lib/x86/constants';
import { samplePrograms } from '@/lib/x86/sample-programs';
import { parseCode } from '@/lib/x86/parser';
import * as executor from '@/lib/x86/executor';
import { useToast } from './use-toast';
import { updateFileCode } from '@/lib/x86/fileManager';

export const useX86Simulator = () => {
    const { toast } = useToast();
    const [registers, setRegisters] = useState<Registers>(INITIAL_REGISTERS);
    const [flags, setFlags] = useState<Flags>(INITIAL_FLAGS);
    const [memory, setMemory] = useState<Memory>(() => new Uint8Array(MEMORY_SIZE));
    
    const [files, setFiles] = useState<ProgramFile[]>(samplePrograms);
    const [activeFile, setActiveFile] = useState<string>(samplePrograms[0].name);

    const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set([5]));
    const [history, setHistory] = useState<string[]>([]);
    const [output, setOutput] = useState<string[]>([]);
    const [callStack, setCallStack] = useState<string[]>([]);
    
    const [cycles, setCycles] = useState(0);
    const [executionTime, setExecutionTime] = useState(0);
    
    const [isRunning, setIsRunning] = useState(false);
    const runnerRef = useRef<NodeJS.Timeout | null>(null);

    const activeCode = files.find(f => f.name === activeFile)?.code || '';
    const parsedInstructions = parseCode(activeCode);
    const lineMap = new Map(parsedInstructions.map((inst, i) => [CODE_START_ADDRESS + i, inst.line]));
    const currentLine = lineMap.get(registers.EIP) || 0;

    const reset = useCallback(() => {
        setRegisters(INITIAL_REGISTERS);
        setFlags(INITIAL_FLAGS);
        setMemory(new Uint8Array(MEMORY_SIZE));
        setHistory([]);
        setOutput([]);
        setCallStack([]);
        setCycles(0);
        setExecutionTime(0);
        setIsRunning(false);
        if (runnerRef.current) {
            clearInterval(runnerRef.current);
        }
        toast({ title: "Simulator Reset", description: "State cleared." });
    }, [toast]);

    const step = useCallback(() => {
        const instructionIndex = registers.EIP - CODE_START_ADDRESS;
        if (instructionIndex < 0 || instructionIndex >= parsedInstructions.length) {
            toast({ variant: "destructive", title: "Execution Halted", description: "Program counter is out of bounds." });
            setIsRunning(false);
            if (runnerRef.current) clearInterval(runnerRef.current);
            return;
        }

        const instruction = parsedInstructions[instructionIndex];
        const result = executor.step(instruction, registers, flags, memory);

        setRegisters(result.registers);
        setFlags(result.flags);
        setHistory(h => [result.historyLog, ...h].slice(0, 100));
        if (result.output) {
            setOutput(o => [result.output!, ...o]);
        }
        setCycles(c => c + 1); // Dummy cycle count

    }, [registers, flags, memory, parsedInstructions, toast]);

    const run = useCallback(() => {
        setIsRunning(true);
        const startTime = performance.now();
        runnerRef.current = setInterval(() => {
            setExecutionTime(performance.now() - startTime);
            const instructionIndex = registers.EIP - CODE_START_ADDRESS;
            const currentLine = lineMap.get(registers.EIP);
            
            if (instructionIndex < 0 || instructionIndex >= parsedInstructions.length) {
                setIsRunning(false);
                if (runnerRef.current) clearInterval(runnerRef.current);
                toast({ variant: "destructive", title: "Execution Halted", description: "End of program reached." });
                return;
            }

            if (currentLine && breakpoints.has(currentLine)) {
                setIsRunning(false);
                if (runnerRef.current) clearInterval(runnerRef.current);
                toast({ title: "Execution Paused", description: `Breakpoint hit at line ${currentLine}.` });
                return;
            }

            step();
        }, 50); // Speed of execution
    }, [registers.EIP, step, breakpoints, lineMap, toast]);

    useEffect(() => {
        if (!isRunning && runnerRef.current) {
            clearInterval(runnerRef.current);
        }
        return () => {
            if (runnerRef.current) {
                clearInterval(runnerRef.current);
            }
        };
    }, [isRunning]);

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
        setFiles(files => updateFileCode(files, fileName, newCode));
    }, []);

    return {
        registers,
        flags,
        memory,
        files,
        activeFile,
        setActiveFile,
        updateCode,
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
    };
};
