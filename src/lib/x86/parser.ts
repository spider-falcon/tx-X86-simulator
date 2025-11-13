import type { Instruction } from './types';
import { CODE_START_ADDRESS } from './constants';
import { writeMemory } from './memoryManager';

function isAlphanumeric(char: string) {
    const code = char.charCodeAt(0);
    return (code > 47 && code < 58) ||  // numeric (0-9)
           (code > 64 && code < 91) ||  // upper alpha (A-Z)
           (code > 96 && code < 123) || // lower alpha (a-z)
           (char === '_');
}

export function parseCode(code: string): {
    instructions: Instruction[],
    labels: Map<string, number>,
    lineMap: Map<number, number>,
    dataSegment: Uint8Array
} {
  const instructions: Instruction[] = [];
  const labels = new Map<string, number>();
  const lineMap = new Map<number, number>();
  const dataSegment = new Uint8Array(1024); // 1KB for data
  let dataPointer = 0;

  const lines = code.split('\n');
  let currentSection = '.text'; // default section

  lines.forEach((line, index) => {
      const originalLineNumber = index + 1;
      let cleanedLine = line.replace(/;.*/, '').trim(); // Remove comments and trim
      
      if (cleanedLine.toLowerCase().startsWith('section')) {
          currentSection = cleanedLine.split(' ')[1] || '.text';
          return;
      }
      
      if (currentSection === '.data') {
        const parts = cleanedLine.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        if (parts.length < 3) return;

        const label = parts[0];
        const directive = parts[1].toLowerCase();
        const value = parts.slice(2).join(' ');

        labels.set(label, dataPointer);

        if (directive === 'db') {
          const stringLiterals = value.match(/'[^']*'|"[^"]*"/g) || [];
          const numericValues = value.replace(/'[^']*'|"[^"]*"/g, '').split(',').filter(v => v.trim());

          stringLiterals.forEach(s => {
              const str = s.slice(1, -1);
              for (let i = 0; i < str.length; i++) {
                  dataSegment[dataPointer++] = str.charCodeAt(i);
              }
          });

          numericValues.forEach(v => {
              const num = parseInt(v.trim());
              if (!isNaN(num)) {
                  dataSegment[dataPointer++] = num;
              }
          });
        } else if(directive === 'equ') {
            const expression = value;
            if(expression.trim() === '$ - msg') { // Very specific EQU handler for our sample
                // We calculate this dynamically now.
                const msgAddress = labels.get('msg');
                if (msgAddress !== undefined) {
                    const len = dataPointer - msgAddress;
                    labels.set(label, len);
                }
            }
        }
      } else if (currentSection === '.text') {
        // Handle labels
        if (cleanedLine.endsWith(':')) {
          const label = cleanedLine.slice(0, -1);
          labels.set(label, CODE_START_ADDRESS + instructions.length);
          cleanedLine = ''; // Line only contained a label
        } else if (cleanedLine.includes(':')) {
          const colonIndex = cleanedLine.indexOf(':');
          // Make sure it's not part of something else
          if (colonIndex > 0 && !isAlphanumeric(cleanedLine[colonIndex -1])) {
            // It's likely not part of a string or something complex, treat as label
          } else {
              const parts = cleanedLine.split(':');
              const label = parts[0].trim();
              if(!labels.has(label)) {
                  labels.set(label, CODE_START_ADDRESS + instructions.length);
              }
              cleanedLine = parts.slice(1).join(':').trim();
          }
        }

        if (!cleanedLine) {
          return;
        }
        
        // Split by space but keep quoted strings together
        const parts = cleanedLine.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        const operation = parts[0];
        const operandsString = parts.slice(1).join(' ');

        // Split operands by comma, but not inside brackets
        const operands = [];
        let tempOperand = '';
        let bracketCount = 0;
        for (const char of operandsString) {
            if (char === '[' ) bracketCount++;
            if (char === ']' ) bracketCount--;
            if (char === ',' && bracketCount === 0) {
                operands.push(tempOperand.trim());
                tempOperand = '';
            } else {
                tempOperand += char;
            }
        }
        if(tempOperand) {
          operands.push(tempOperand.trim());
        }
        
        lineMap.set(CODE_START_ADDRESS + instructions.length, originalLineNumber);
        instructions.push({ line: originalLineNumber, operation, operands: operands.filter(op => op) });
      }
    });

  return { instructions, labels, lineMap, dataSegment };
}
