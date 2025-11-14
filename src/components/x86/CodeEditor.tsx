"use client";

import type { FC } from 'react';
import { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
  breakpoints: Set<number>;
  toggleBreakpoint: (line: number) => void;
  currentLine: number;
}

const CodeEditor: FC<CodeEditorProps> = ({ code, onCodeChange, breakpoints, toggleBreakpoint, currentLine }) => {
  const lineCount = useMemo(() => code.split('\n').length, [code]);

  return (
    <Card className="flex-1 flex flex-col min-h-[300px] overflow-hidden">
      <CardContent className="p-0 flex-1 flex relative">
        <ScrollArea className="flex-1 relative">
          <div className="flex h-full">
             <div className="w-12 sm:w-16 flex-shrink-0 bg-muted/30 p-2 text-right font-code text-muted-foreground select-none">
              {Array.from({ length: lineCount }, (_, i) => i + 1).map(lineNum => (
                <div key={lineNum} className="relative flex items-center justify-end h-6">
                  <span>{lineNum}</span>
                  <button
                    onClick={() => toggleBreakpoint(lineNum)}
                    className={cn(
                      'ml-2 w-3 h-3 rounded-full transition-colors ',
                      breakpoints.has(lineNum) ? 'bg-destructive' : 'bg-border hover:bg-destructive/50'
                    )}
                    title={`Toggle breakpoint at line ${lineNum}`}
                  />
                  {currentLine === lineNum && (
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-primary text-xl" title="Current instruction">
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              className="flex-1 h-auto absolute top-0 left-12 sm:left-16 w-[calc(100%-3rem)] sm:w-[calc(100%-4rem)] resize-none border-0 rounded-none font-code bg-transparent focus-visible:ring-0 leading-6 p-2 whitespace-pre"
              placeholder="Enter your x86 assembly code here..."
              spellCheck="false"
              rows={lineCount}
            />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CodeEditor;
