"use client";

import type { FC } from 'react';
import { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';

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
        <ScrollArea className="flex-1">
          <div className="flex">
            <div className="w-12 sm:w-16 flex-shrink-0 bg-muted/50 p-2 text-right font-code text-muted-foreground select-none">
              {Array.from({ length: lineCount }, (_, i) => i + 1).map(lineNum => (
                <div key={lineNum} className="relative flex items-center justify-end h-6">
                  <span>{lineNum}</span>
                  <button
                    onClick={() => toggleBreakpoint(lineNum)}
                    className={`ml-2 w-3 h-3 rounded-full transition-colors ${
                      breakpoints.has(lineNum) ? 'bg-red-500' : 'bg-border hover:bg-red-500/50'
                    }`}
                    title={`Toggle breakpoint at line ${lineNum}`}
                  />
                  {currentLine === lineNum && (
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" title="Current instruction"/>
                  )}
                </div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              className="flex-1 h-auto resize-none border-0 rounded-none font-code bg-transparent focus-visible:ring-0 leading-6 p-2 whitespace-pre"
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
