
"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';

interface CallStackProps {
  callStack: string[];
}

const CallStack: FC<CallStackProps> = ({ callStack }) => {
  return (
    <Card className="h-full border-0 rounded-none shadow-none flex flex-col min-h-[150px]">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">Call Stack</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full w-full">
            <div className="p-4 pt-0 font-code text-sm">
            {callStack.length === 0 ? (
                <p className="text-muted-foreground">Call stack is empty.</p>
            ) : (
                callStack.map((line, index) => (
                    <p key={index}>{line}</p>
                ))
            )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CallStack;
