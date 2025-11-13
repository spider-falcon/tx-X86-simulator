"use client";

import type { FC } from 'react';
import type { Flags } from '@/lib/x86/types';
import { FLAGS } from '@/lib/x86/constants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FlagsDisplayProps {
  flags: Flags;
}

const flagDescriptions: { [key: string]: string } = {
    CF: 'Carry Flag',
    PF: 'Parity Flag',
    AF: 'Adjust Flag',
    ZF: 'Zero Flag',
    SF: 'Sign Flag',
    TF: 'Trap Flag',
    IF: 'Interrupt Enable Flag',
    DF: 'Direction Flag',
    OF: 'Overflow Flag',
};

const FlagsDisplay: FC<FlagsDisplayProps> = ({ flags }) => {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1 p-2 border rounded-lg bg-muted/30">
        {FLAGS.map(flag => (
            <Tooltip key={flag}>
                <TooltipTrigger>
                    <div className={`flex items-center gap-1 border rounded-md px-1.5 py-0.5 text-xs font-mono transition-colors ${
                        flags[flag] ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50'
                    }`}>
                        <span>{flag}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{flagDescriptions[flag]} ({flags[flag] ? '1' : '0'})</p>
                </TooltipContent>
            </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default FlagsDisplay;
