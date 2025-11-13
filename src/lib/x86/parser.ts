import type { Instruction } from './types';

// Dummy parser
export function parseCode(code: string): Instruction[] {
  return code
    .split('\n')
    .map((line, index) => {
      const cleanedLine = line.replace(/;.*/, '').trim(); // Remove comments and trim
      if (!cleanedLine) {
        return null;
      }
      const parts = cleanedLine.split(/\s+/);
      const operation = parts[0];
      const operands = parts.slice(1).join('').split(',');
      
      return { line: index + 1, operation, operands };
    })
    .filter((instr): instr is Instruction => instr !== null);
}
