import type { Instruction } from './types';
import { CODE_START_ADDRESS } from './constants';

export function parseCode(code: string): {
    instructions: Instruction[],
    labels: Map<string, number>,
    lineMap: Map<number, number>
} {
  const instructions: Instruction[] = [];
  const labels = new Map<string, number>();
  const lineMap = new Map<number, number>();

  code
    .split('\n')
    .forEach((line, index) => {
      const originalLineNumber = index + 1;
      let cleanedLine = line.replace(/;.*/, '').trim(); // Remove comments and trim
      
      // Handle labels
      if (cleanedLine.endsWith(':')) {
        const label = cleanedLine.slice(0, -1);
        labels.set(label, CODE_START_ADDRESS + instructions.length);
        cleanedLine = ''; // Line only contained a label
      } else if (cleanedLine.includes(':')) {
        const parts = cleanedLine.split(':');
        const label = parts[0].trim();
        labels.set(label, CODE_START_ADDRESS + instructions.length);
        cleanedLine = parts.slice(1).join(':').trim();
      }

      if (!cleanedLine) {
        return;
      }
      const parts = cleanedLine.split(/\s+/);
      const operation = parts[0];
      const operands = parts.slice(1).join('').split(',').filter(op => op);
      
      lineMap.set(CODE_START_ADDRESS + instructions.length, originalLineNumber);
      instructions.push({ line: originalLineNumber, operation, operands });
    });

  return { instructions, labels, lineMap };
}
