"use client";

import type { FC } from 'react';
import type { Registers, Flags } from '@/lib/x86/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FlagsDisplay from './FlagsDisplay';
import { formatHex } from '@/lib/x86/utils';
import { GENERAL_PURPOSE_REGISTERS, POINTER_REGISTERS } from '@/lib/x86/constants';
import { ScrollArea } from '../ui/scroll-area';

interface RegisterDisplayProps {
  registers: Registers;
  flags: Flags;
}

const RegisterItem: FC<{ name: string; value: number }> = ({ name, value }) => (
  <div className="flex justify-between items-baseline p-1.5 rounded-md hover:bg-muted/50">
    <span className="text-muted-foreground text-xs">{name}</span>
    <span className="font-mono text-sm">{formatHex(value)}</span>
  </div>
);

const RegisterDisplay: FC<RegisterDisplayProps> = ({ registers, flags }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CPU Registers</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[220px] -mx-4 px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                <div>
                {GENERAL_PURPOSE_REGISTERS.map(reg => (
                    <RegisterItem key={reg} name={reg} value={registers[reg]} />
                ))}
                </div>
                <div>
                {POINTER_REGISTERS.map(reg => (
                    <RegisterItem key={reg} name={reg} value={registers[reg]} />
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
