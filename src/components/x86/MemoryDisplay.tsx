
"use client";

import type { FC } from 'react';
import { useState } from 'react';
import type { Memory, Registers } from '@/lib/x86/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatHex } from '@/lib/x86/utils';
import { STACK_ADDRESS_START, CODE_START_ADDRESS } from '@/lib/x86/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


type ViewMode = 'hex' | 'bin' | 'txt';

const ViewModeToggle: FC<{ viewMode: ViewMode, setViewMode: (mode: ViewMode) => void }> = ({ viewMode, setViewMode }) => (
    <div className="flex gap-1 mb-2">
        {(['hex', 'bin', 'txt'] as ViewMode[]).map(mode => (
            <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setViewMode(mode)}
            >
                {mode.toUpperCase()}
            </Button>
        ))}
    </div>
);

const MemoryByte: FC<{ viewMode: ViewMode, byte: number}> = ({ viewMode, byte }) => {
    let content;
    switch(viewMode) {
        case 'bin':
            content = byte.toString(2).padStart(8, '0');
            break;
        case 'txt':
            content = (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
            break;
        case 'hex':
        default:
            content = byte.toString(16).toUpperCase().padStart(2, '0');
            break;
    }
    return <span className={cn("text-center", viewMode === 'bin' && 'text-[10px] tracking-tighter')}>{content}</span>;
}


const MemoryView: FC<{ memory: Memory, startAddress: number, numRows: number, ebp: number, esp: number, viewMode: ViewMode, stackView?: boolean }> = ({ memory, startAddress, numRows, ebp, esp, viewMode, stackView = false }) => {
    const rows = [];
    const bytesPerRow = viewMode === 'bin' ? 4 : 8;

    for (let i = 0; i < numRows; i++) {
        const address = stackView ? startAddress - i * bytesPerRow : startAddress + i * bytesPerRow;
        if (address < 0 || address + bytesPerRow > memory.length) continue;
        
        const endAddress = address + bytesPerRow;
        
        const bytes = Array.from(memory.slice(address, endAddress));

        let highlightClass = '';
        if (stackView) {
            const espInRow = esp >= address && esp < endAddress;
            const ebpInRow = ebp >= address && ebp < endAddress;
            if (espInRow && ebpInRow && esp === ebp) {
                highlightClass = 'bg-accent/40'; // Both at same spot
            } else if (espInRow) {
                highlightClass = 'bg-secondary/50'; 
            } else if (ebpInRow) {
                highlightClass = 'bg-primary/30'; 
            }
        }
        
        rows.push(
            <div key={address} className={`flex items-center gap-2 p-1 rounded font-mono ${highlightClass}`}>
                <span className="text-muted-foreground w-16">{formatHex(address)}:</span>
                <div className={`flex-1 grid gap-1 ${viewMode === 'bin' ? 'grid-cols-4' : 'grid-cols-8'}`}>
                    {bytes.map((byte, j) => (
                        <MemoryByte key={j} viewMode={viewMode} byte={byte} />
                    ))}
                </div>
                 {viewMode !== 'txt' && (
                    <div className="text-muted-foreground/80 w-16 text-xs font-mono">
                        {bytes.map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('')}
                    </div>
                )}
            </div>
        );
    }
    return <>{rows}</>;
}

const MemoryMatrixView: FC<{ memory: Memory }> = ({ memory }) => {
    const matrixSize = 32; // 32x32 grid
    const startAddress = 0;
    
    const getByteColor = (byte: number) => {
        if (byte === 0) return 'bg-muted/20';
        const intensity = byte / 255;
        if (intensity < 0.5) {
            const opacity = Math.round((intensity * 2) * 80) + 10; // from 10 to 90
            return `bg-secondary/${opacity}`;
        } else {
            const opacity = Math.round(((intensity - 0.5) * 2) * 80) + 10; // from 10 to 90
            return `bg-accent/${opacity}`;
        }
    }

    return (
        <TooltipProvider>
        <div className="grid grid-cols-32 gap-px p-2 bg-border rounded-lg">
            {Array.from(memory.slice(startAddress, startAddress + matrixSize * matrixSize)).map((byte, index) => (
                <Tooltip key={index} delayDuration={100}>
                    <TooltipTrigger>
                        <div className={cn("w-full aspect-square rounded-sm", getByteColor(byte))} />
                    </TooltipTrigger>
                    <TooltipContent className="font-mono p-1 px-2 text-xs">
                        <p>Addr: {formatHex(startAddress + index)}</p>
                        <p>Val: {formatHex(byte, 2)}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
        </TooltipProvider>
    )
}

const MemoryDisplay: FC<{ memory: Memory; registers: Registers; }> = ({ memory, registers }) => {
  const stackTop = Math.min(STACK_ADDRESS_START, registers.EBP + 16);
  const [stackViewMode, setStackViewMode] = useState<ViewMode>('hex');
  const [dataViewMode, setDataViewMode] = useState<ViewMode>('hex');
  const [memoryViewMode, setMemoryViewMode] = useState<ViewMode>('hex');


  return (
    <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">Memory Viewer</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2 pt-0 flex flex-col min-h-0">
        <Tabs defaultValue="stack" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-card border w-full grid grid-cols-4">
            <TabsTrigger value="stack" className="flex-1">Stack</TabsTrigger>
            <TabsTrigger value="data" className="flex-1">.data</TabsTrigger>
            <TabsTrigger value="memory" className="flex-1">Memory</TabsTrigger>
            <TabsTrigger value="matrix" className="flex-1">Matrix</TabsTrigger>
          </TabsList>
          <div className="flex-1 mt-2 min-h-0">
            <ScrollArea className="h-full">
                <div className="p-2">
                    <TabsContent value="stack" className="m-0">
                        <ViewModeToggle viewMode={stackViewMode} setViewMode={setStackViewMode} />
                        <MemoryView memory={memory} startAddress={stackTop} numRows={32} ebp={registers.EBP} esp={registers.ESP} stackView={true} viewMode={stackViewMode} />
                    </TabsContent>
                    <TabsContent value="data" className="m-0">
                        <ViewModeToggle viewMode={dataViewMode} setViewMode={setDataViewMode} />
                        <MemoryView memory={memory} startAddress={0} numRows={32} ebp={-1} esp={-1} viewMode={dataViewMode} />
                    </TabsContent>
                    <TabsContent value="memory" className="m-0">
                        <ViewModeToggle viewMode={memoryViewMode} setViewMode={setMemoryViewMode} />
                        <MemoryView memory={memory} startAddress={CODE_START_ADDRESS} numRows={32} ebp={-1} esp={-1} viewMode={memoryViewMode} />
                    </TabsContent>
                    <TabsContent value="matrix" className="m-0">
                        <MemoryMatrixView memory={memory} />
                    </TabsContent>
                </div>
            </ScrollArea>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MemoryDisplay;
