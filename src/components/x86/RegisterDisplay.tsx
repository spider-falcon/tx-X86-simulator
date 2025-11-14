
"use client";

import type { FC } from 'react';
import { useState } from 'react';
import type { Registers, Flags } from '@/lib/x86/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FlagsDisplay from './FlagsDisplay';
import { formatHex } from '@/lib/x86/utils';
import { GENERAL_PURPOSE_REGISTERS, POINTER_REGISTERS } from '@/lib/x86/constants';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '@/components/ui/button';

interface RegisterDisplayProps {
  registers: Registers;
  flags: Flags;
}

type ViewMode = 'hex' | 'bin' | 'dec';

const formatRegisterValue = (value: number, mode: ViewMode) => {
    switch (mode) {
        case 'hex':
            return formatHex(value);
        case 'bin':
            return value.toString(2).padStart(32, '0');
        case 'dec':
            return value.toString();
        default:
            return formatHex(value);
    }
}

const ViewModeToggle: FC<{ viewMode: ViewMode, setViewMode: (mode: ViewMode) => void }> = ({ viewMode, setViewMode }) => (
    <div className="absolute top-2 right-2 flex gap-1">
        {(['hex', 'bin', 'dec'] as ViewMode[]).map(mode => (
            <Button
                key={mode}
                variant={viewMode === mode ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setViewMode(mode)}
            >
                {mode.toUpperCase()}
            </Button>
        ))}
    </div>
);


const RegisterItem: FC<{ name: string; value: number, viewMode: ViewMode }> = ({ name, value, viewMode }) => (
  <div className="flex justify-between items-baseline p-1.5 rounded-md hover:bg-muted/50">
    <span className="text-muted-foreground text-xs">{name}</span>
    <span className="font-mono text-sm break-all">{formatRegisterValue(value, viewMode)}</span>
  </div>
);

const RegisterDisplay: FC<RegisterDisplayProps> = ({ registers, flags }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('hex');

  return (
    <Card>
      <CardHeader className="relative py-3 px-4">
        <CardTitle className="text-base">CPU Registers</CardTitle>
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[220px] -mx-4 px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                <div>
                {GENERAL_PURPOSE_REGISTERS.map(reg => (
                    <RegisterItem key={reg} name={reg} value={registers[reg]} viewMode={viewMode} />
                ))}
                </div>
                <div>
                {POINTER_REGISTERS.map(reg => (
                    <RegisterItem key={reg} name={reg} value={registers[reg]} viewMode={viewMode} />
                ))}
                </div>
            </div>
        </ScrollArea>
        <div className="mt-2">
            <FlagsDisplay flags={flags} />
        </div>
      </CardContent>
    </Card>
  );
};

export default RegisterDisplay;
