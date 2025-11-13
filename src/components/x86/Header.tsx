"use client";
import type { FC } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Cpu, Timer } from 'lucide-react';

interface HeaderProps {
  cycles: number;
  executionTime: number;
}

const Header: FC<HeaderProps> = ({ cycles, executionTime }) => {
  return (
    <Card className="w-full">
      <CardContent className="p-3 sm:p-4 flex items-center justify-between">
        <h1 className="text-lg sm:text-2xl font-bold font-headline text-primary">
          X86 Assembly Simulator
        </h1>
        <div className="flex items-center gap-4 sm:gap-6 text-sm">
          <div className="flex items-center gap-2" title="Execution Cycles">
            <Cpu className="w-5 h-5 text-primary" />
            <span className="font-mono">{cycles.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2" title="Execution Time">
            <Timer className="w-5 h-5 text-primary" />
            <span className="font-mono">{(executionTime / 1000).toFixed(2)}s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Header;
