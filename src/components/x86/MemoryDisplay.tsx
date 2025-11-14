
"use client";

import type { FC } from 'react';
import { useState } from 'react';
import type { Memory, Registers } from '@/lib/x86/types';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatHex } from '@/lib/x86/utils';
import { CODE_START_ADDRESS } from '@/lib/x86/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { useX86Simulator } from '@/hooks/useX86Simulator';


type ViewMode = 'hex' | 'bin' | 'txt';

interface SimulatorProps {
    simulator: ReturnType<typeof useX86Simulator>;
}

const ViewModeToggle: FC<{ viewMode: ViewMode, setViewMode: (mode: ViewMode) => void }> = ({ viewMode, setViewMode }) => (
    <div className="flex gap-1 mb-2">
        {(['hex', 'bin', 'txt'] as ViewMode[]).map(mode => (
            <Button
                key={mode}
                variant={viewMode === mode ? 'secondary' : 'outline'}
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

const MemoryRow: FC<{ address: number, bytes: number[], viewMode: ViewMode, esp?: number, ebp?: number }> = ({ address, bytes, viewMode, esp, ebp }) => {
    const bytesPerRow = viewMode === 'bin' ? 4 : 8;

    const espInRow = esp !== undefined && esp >= address && esp < address + bytesPerRow;
    const ebpInRow = ebp !== undefined && ebp >= address && ebp < address + bytesPerRow;

    const getHighlightClass = () => {
        if (espInRow && ebpInRow && esp === ebp) return 'bg-accent/60';
        if (espInRow) return 'bg-primary/30';
        if (ebpInRow) return 'bg-secondary/50';
        return '';
    };

    return (
        <div className={cn('flex items-center gap-2 p-1 rounded font-mono text-sm', getHighlightClass())}>
            <div className="text-muted-foreground w-20 flex-shrink-0 relative text-xs">
                {formatHex(address)}:
                {ebpInRow && <span className={cn("absolute text-secondary-foreground font-bold", espInRow ? 'right-full mr-1' : 'right-full mr-1')} title={`EBP: ${formatHex(ebp!)}`}>EBP →</span>}
                {espInRow && <span className="absolute right-full mr-1 text-primary font-bold" title={`ESP: ${formatHex(esp!)}`}>ESP →</span>}
            </div>
            <div className={`flex-1 grid gap-1 ${viewMode === 'bin' ? 'grid-cols-4' : 'grid-cols-8'}`}>
                {bytes.map((byte, j) => (
                    <MemoryByte key={j} viewMode={viewMode} byte={byte} />
                ))}
            </div>
             {viewMode !== 'bin' && (
                <div className="text-muted-foreground/80 w-16 text-xs font-mono">
                    {bytes.map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('')}
                </div>
            )}
        </div>
    );
};


const MemoryView: FC<{ memory: Memory, startAddress: number, numRows: number, ebp: number, esp: number, viewMode: ViewMode, stackView?: boolean }> = ({ memory, startAddress, numRows, ebp, esp, viewMode, stackView = false }) => {
    const rows = [];
    const bytesPerRow = viewMode === 'bin' ? 4 : 8;

    // For stack view, we want to show addresses decreasing
    // Let's center the view around the stack pointer a bit
    const effectiveStartAddress = stackView ? Math.min(memory.length - bytesPerRow, startAddress + (numRows/2 * bytesPerRow)) : startAddress;

    for (let i = 0; i < numRows; i++) {
        const rowAddress = stackView ? effectiveStartAddress - i * bytesPerRow : effectiveStartAddress + i * bytesPerRow;
        
        if (rowAddress < 0 || rowAddress >= memory.length) continue;
        
        const endAddress = Math.min(rowAddress + bytesPerRow, memory.length);
        const bytesSlice = memory.slice(rowAddress, endAddress);
        const bytes = Array.from(bytesSlice);
        
        // Pad if we're at the end of memory
        while (bytes.length < bytesPerRow) {
            bytes.push(0);
        }

        rows.push(
            <MemoryRow 
                key={rowAddress}
                address={rowAddress}
                bytes={bytes}
                viewMode={viewMode}
                esp={stackView ? esp : undefined}
                ebp={stackView ? ebp : undefined}
            />
        );
    }
    return <>{rows}</>;
};

const MemoryMatrixView: FC<{ memory: Memory }> = ({ memory }) => {
    const matrixSize = 32; // 32x32 grid
    
    const getByteColor = (byte: number) => {
        if (byte === 0) return 'bg-muted/20';
        const intensity = byte / 255;
        // hsl(hue, saturation, lightness)
        // Using hue to differentiate: 240 (blue) for low values, 0 (red) for high values
        const hue = 240 - (intensity * 240);
        return `hsl(${hue}, 80%, ${70 - (intensity * 40)}%)`;
    }

    return (
        <TooltipProvider>
            <div className="grid grid-cols-32 gap-px p-2 bg-border rounded-lg max-w-[520px] mx-auto">
                {Array.from({ length: matrixSize * matrixSize }).map((_, index) => {
                    const byte = memory[index] || 0;
                    return (
                        <Tooltip key={index} delayDuration={50}>
                            <TooltipTrigger asChild>
                                <div style={{ backgroundColor: getByteColor(byte) }} className="w-full aspect-square rounded-sm" />
                            </TooltipTrigger>
                            <TooltipContent className="font-mono p-1 px-2 text-xs">
                                <p>Addr: {formatHex(index)}</p>
                                <p>Val: {formatHex(byte, 2)} ({byte})</p>
                            </TooltipContent>
                        </Tooltip>
                    )
                })}
            </div>
        </TooltipProvider>
    )
}

const MemoryDisplay: FC<SimulatorProps> = ({ simulator }) => {
  const { memory, registers } = simulator;
  const stackTop = registers.ESP;
  const [stackViewMode, setStackViewMode] = useState<ViewMode>('hex');
  const [dataViewMode, setDataViewMode] = useState<ViewMode>('hex');
  const [textViewMode, setTextViewMode] = useState<ViewMode>('hex');

  return (
    <Card className="h-full border-0 rounded-none shadow-none flex-1 flex flex-col min-h-0 overflow-hidden">
      <CardContent className="h-full flex-1 p-2 flex flex-col min-h-0">
        <Tabs defaultValue="stack" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-card border w-full grid grid-cols-4">
            <TabsTrigger value="stack" className="flex-1">Stack</TabsTrigger>
            <TabsTrigger value="data" className="flex-1">.data</TabsTrigger>
            <TabsTrigger value="text" className="flex-1">.text</TabsTrigger>
            <TabsTrigger value="matrix" className="flex-1">Matrix</TabsTrigger>
          </TabsList>
          <div className="flex-1 mt-2 min-h-0">
            <ScrollArea className="h-full">
                <div className="p-2 bg-muted/20 rounded-md">
                    <TabsContent value="stack" className="m-0">
                        <ViewModeToggle viewMode={stackViewMode} setViewMode={setStackViewMode} />
                        <MemoryView memory={memory} startAddress={stackTop} numRows={64} ebp={registers.EBP} esp={registers.ESP} stackView={true} viewMode={stackViewMode} />
                    </TabsContent>
                    <TabsContent value="data" className="m-0">
                        <ViewModeToggle viewMode={dataViewMode} setViewMode={setDataViewMode} />
                        <MemoryView memory={memory} startAddress={0} numRows={64} ebp={-1} esp={-1} viewMode={dataViewMode} />
                    </TabsContent>
                    <TabsContent value="text" className="m-0">
                        <ViewModeToggle viewMode={textViewMode} setViewMode={setTextViewMode} />
                        <MemoryView memory={memory} startAddress={CODE_START_ADDRESS} numRows={64} ebp={-1} esp={-1} viewMode={textViewMode} />
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
