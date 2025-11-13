"use client";

import type { FC } from 'react';
import type { Memory, Registers } from '@/lib/x86/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatHex } from '@/lib/x86/utils';
import { STACK_ADDRESS_START, CODE_START_ADDRESS } from '@/lib/x86/constants';

interface MemoryDisplayProps {
    memory: Memory;
    registers: Registers;
}

const MemoryView: FC<{ memory: Memory, startAddress: number, numRows: number, ebp: number, esp: number, stackView?: boolean }> = ({ memory, startAddress, numRows, ebp, esp, stackView = false }) => {
    const rows = [];
    for (let i = 0; i < numRows; i++) {
        const address = stackView ? startAddress - i * 8 : startAddress + i * 8;
        if (address < 0 || address + 8 > memory.length) continue;
        
        const bytes = Array.from(memory.slice(address, address + 8));

        let highlightClass = '';
        if (address <= esp && esp < address + 8) {
            highlightClass = 'bg-blue-400/20'; // ESP highlight
        } else if (address <= ebp && ebp < address + 8) {
            highlightClass = 'bg-primary/20'; // EBP highlight
        }
        
        rows.push(
            <div key={address} className={`flex items-center gap-2 p-1 rounded ${highlightClass}`}>
                <span className="text-muted-foreground w-20">{formatHex(address)}:</span>
                <div className="flex-1 grid grid-cols-8 gap-1">
                    {bytes.map((byte, j) => (
                        <span key={j} className="text-center">{byte.toString(16).toUpperCase().padStart(2, '0')}</span>
                    ))}
                </div>
            </div>
        );
    }
    return <>{rows}</>;
}

const MemoryDisplay: FC<MemoryDisplayProps> = ({ memory, registers }) => {
  const stackTop = Math.min(STACK_ADDRESS_START, registers.EBP + 16);
  return (
    <Card className="flex-1 flex flex-col min-h-[250px]">
      <CardHeader>
        <CardTitle className="text-base">Memory Viewer</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2 pt-0 flex flex-col">
        <Tabs defaultValue="stack" className="flex-1 flex flex-col">
          <TabsList className="bg-card border w-full">
            <TabsTrigger value="stack" className="flex-1">Stack</TabsTrigger>
            <TabsTrigger value="memory" className="flex-1">Memory</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1 mt-2">
            <div className="font-code text-xs p-2">
                <TabsContent value="stack">
                    <MemoryView memory={memory} startAddress={stackTop} numRows={32} ebp={registers.EBP} esp={registers.ESP} stackView={true} />
                </TabsContent>
                <TabsContent value="memory">
                    <MemoryView memory={memory} startAddress={CODE_START_ADDRESS} numRows={32} ebp={registers.EBP} esp={registers.ESP} />
                </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MemoryDisplay;
