"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExecutionHistoryProps {
  history: string[];
}

const ExecutionHistory: FC<ExecutionHistoryProps> = ({ history }) => {
  return (
    <Card className="flex-1 flex flex-col min-h-[150px]">
      <CardHeader>
        <CardTitle className="text-base">Execution History</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full w-full">
            <div className="p-4 pt-0 font-code text-sm">
                {history.length === 0 ? (
                    <p className="text-muted-foreground">Run code to see history.</p>
                ) : (
                    history.map((line, index) => (
                    <p key={index} className="whitespace-pre">{line}</p>
                    ))
                )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ExecutionHistory;
