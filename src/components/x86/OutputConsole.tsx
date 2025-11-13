"use client";

import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';

interface OutputConsoleProps {
  output: string[];
}

const OutputConsole: FC<OutputConsoleProps> = ({ output }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
    }
  }, [output]);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Console Output</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[100px] w-full" ref={scrollAreaRef}>
            <div className="p-4 pt-0 font-code text-sm">
            {output.length === 0 ? (
                <p className="text-muted-foreground">Program output will appear here.</p>
            ) : (
                output.map((line, index) => (
                <p key={index} className="whitespace-pre-wrap">{`> ${line}`}</p>
                ))
            )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default OutputConsole;
