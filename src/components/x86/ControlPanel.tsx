"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, StepForward, RotateCcw, Pause } from 'lucide-react';

interface ControlPanelProps {
  onStep: () => void;
  onRun: () => void;
  onReset: () => void;
  isRunning: boolean;
}

const ControlPanel: FC<ControlPanelProps> = ({ onStep, onRun, onReset, isRunning }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Execution Controls</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Button onClick={onRun} variant="default" className="flex-1 bg-primary hover:bg-primary/90" disabled={isRunning}>
          {isRunning ? <Pause /> : <Play />}
          {isRunning ? 'Running...' : 'Run'}
        </Button>
        <Button onClick={onStep} variant="outline" className="flex-1" disabled={isRunning}>
          <StepForward />
          Step
        </Button>
        <Button onClick={onReset} variant="destructive" className="flex-1" disabled={isRunning}>
          <RotateCcw />
          Reset
        </Button>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;
