
"use client";

import type { FC } from 'react';
import type { Memory, Registers, Instruction } from '@/lib/x86/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatHex } from '@/lib/x86/utils';
import { STACK_ADDRESS_START, CODE_START_ADDRESS } from '@/lib/x86/constants';

interface MemoryDisplayProps {
    memory: Memory;
    registers: Registers;
    instructions: Instruction[];
}

const MemoryView: FC<{ memory: Memory, startAddress: number, numRows: number, ebp: number, esp: number, stackView?: boolean }> = ({ memory, startAddress, numRows, ebp, esp, stackView = false }) => {
    const rows = [];
    for (let i = 0; i < numRows; i++) {
        const address = stackView ? startAddress - i * 8 : startAddress + i * 8;
        if (address < 0 || address + 8 > memory.length) continue;
        
        const bytes = Array.from(memory.slice(address, address + 8));

        let highlightClass = '';
        if (stackView) {
            if (address <= esp && esp < address + 8) {
                highlightClass = 'bg-blue-400/30'; // ESP highlight
            } else if (address <= ebp && ebp < address + 8) {
                highlightClass = 'bg-primary/30'; // EBP highlight
            }
        }
        
        rows.push(
            <div key={address} className={`flex items-center gap-2 p-1 rounded ${highlightClass}`}>
                <span className="text-muted-foreground w-20">{formatHex(address)}:</span>
                <div className="flex-1 grid grid-cols-8 gap-1">
                    {bytes.map((byte, j) => (
                        <span key={j} className="text-center">{byte.toString(16).toUpperCase().padStart(2, '0')}</span>
                    ))}
                </div>
                <div className="text-muted-foreground/80 w-20 text-xs truncate font-mono">
                    {bytes.map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('')}
                </div>
            </div>
        );
    }
    return <>{rows}</>;
}

const TextSegmentView: FC<{ instructions: Instruction[] }> = ({ instructions }) => {
    return (
        <div>
            {instructions.map((inst, index) => (
                <div key={index} className="flex items-center gap-2 p-1 rounded">
                    <span className="text-muted-foreground w-20">{formatHex(CODE_START_ADDRESS + index)}:</span>
                    <div className="flex-1">
                        <span className="text-primary">{inst.operation}</span>
                        <span className="ml-2 text-foreground/80">{inst.operands.join(', ')}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const MemoryDisplay: FC<MemoryDisplayProps> = ({ memory, registers, instructions }) => {
  const stackTop = Math.min(STACK_ADDRESS_START + 8, registers.EBP + 16);
  return (
    <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">Memory Viewer</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2 pt-0 flex flex-col">
        <Tabs defaultValue="stack" className="flex-1 flex flex-col">
          <TabsList className="bg-card border w-full grid grid-cols-3">
            <TabsTrigger value="stack" className="flex-1">Stack</TabsTrigger>
            <TabsTrigger value="data" className="flex-1">.data</TabsTrigger>
            <TabsTrigger value="text" className="flex-1">.text</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1 mt-2">
            <div className="font-code text-xs p-2">
                <TabsContent value="stack">
                    <MemoryView memory={memory} startAddress={stackTop} numRows={32} ebp={registers.EBP} esp={registers.ESP} stackView={true} />
                </TabsContent>
                <TabsContent value="data">
                    <MemoryView memory={memory} startAddress={0} numRows={32} ebp={-1} esp={-1} />
                </TabsContent>
                <TabsContent value="text">
                    <TextSegmentView instructions={instructions} />
                </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MemoryDisplay;
