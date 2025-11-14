"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, StepForward, RotateCcw, Square } from 'lucide-react';

interface ControlPanelProps {
  onStep: () => void;
  onRun: () => void;
  onReset: () => void;
  isRunning: boolean;
}

const ControlPanel: FC<ControlPanelProps> = ({ onStep, onRun, onReset, isRunning }) => {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">Execution Controls</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Button onClick={onRun} variant="default" className="flex-1 bg-primary hover:bg-primary/90">
          {isRunning ? <Square /> : <Play />}
          {isRunning ? 'Stop' : 'Run'}
        </Button>
        <Button onClick={onStep} variant="outline" className="flex-1" disabled={isRunning}>
          <StepForward />
          Step
        </Button>
        <Button onClick={onReset} variant="destructive" className="flex-1">
          <RotateCcw />
          Reset
        </Button>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;
