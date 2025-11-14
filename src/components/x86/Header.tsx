"use client";
import type { FC } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Cpu, Timer, Palette } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from './ThemeProvider';
import { themes } from '@/lib/themes';
import { Button } from '../ui/button';

interface HeaderProps {
  cycles: number;
  executionTime: number;
}

const Header: FC<HeaderProps> = ({ cycles, executionTime }) => {
  const { setTheme } = useTheme();

  return (
    <Card className="w-full rounded-none border-x-0 border-t-0">
      <CardContent className="p-3 sm:p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold font-headline text-primary">
            X86 Simulator
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-sm">
          <div className="hidden sm:flex items-center gap-2" title="Execution Cycles">
            <Cpu className="w-5 h-5 text-primary" />
            <span className="font-mono">{cycles.toLocaleString()}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2" title="Execution Time">
            <Timer className="w-5 h-5 text-primary" />
            <span className="font-mono">{(executionTime / 1000).toFixed(2)}s</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Palette className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {themes.map((theme) => (
                <DropdownMenuItem key={theme.name} onClick={() => setTheme(theme.name)}>
                  {theme.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <SidebarTrigger className="flex"/>
        </div>
      </CardContent>
    </Card>
  );
};

export default Header;
