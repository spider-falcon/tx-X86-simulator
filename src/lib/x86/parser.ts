

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
  const dataSegment = new Uint8Array(1024 * 4); // 4KB for data
  let dataPointer = 0;

  const lines = code.split('\n');
  let currentSection = '.text'; // default section
  const equsToResolve: {label: string, value: string}[] = [];


  lines.forEach((line, index) => {
      const originalLineNumber = index + 1;
      let cleanedLine = line.replace(/;.*/, '').trim(); // Remove comments and trim
      
      if (!cleanedLine) return;

      const sectionMatch = cleanedLine.match(/^section\s+([.a-zA-Z_][a-zA-Z0-9_.]*)/i);
      if (sectionMatch) {
          currentSection = sectionMatch[1].toLowerCase();
          return;
      }
      
      if (currentSection === '.data' || currentSection === '.bss') {
        const parts = cleanedLine.match(/(?:[^\s"']+|"[^"]*'[^']*'|'[^']+'|"[^"]+")+/g) || [];
        if (parts.length < 2) return;

        const label = parts[0].replace(/:$/, '');
        const directive = parts[1].toLowerCase();
        const value = parts.slice(2).join(' ');

        if (directive === 'equ') {
          equsToResolve.push({ label, value });
          return;
        }

        labels.set(label, dataPointer);
        
        if (currentSection === '.data') {
            if (directive === 'db') {
              const stringLiterals = value.match(/'[^']*'|"[^"]*"/g) || [];
              const numericValues = value.replace(/'[^']*'|"[^"]*"/g, '').split(',').filter(v => v.trim());
              
              if (stringLiterals.length > 0) {
                stringLiterals.forEach(s => {
                    const str = s.slice(1, -1);
                    for (let i = 0; i < str.length; i++) {
                        dataSegment[dataPointer++] = str.charCodeAt(i);
                    }
                     // Handle comma separated strings by adding a null terminator if needed
                    if (numericValues.length > 0 || stringLiterals.length > 1) {
                         if (s.endsWith(",")) {
                            dataSegment[dataPointer++] = 0;
                         }
                    }
                });
                // Final null terminator if value doesn't end with comma
                const trimmedValue = value.trim();
                if (!trimmedValue.endsWith(',')) {
                   const lastChar = trimmedValue.charAt(trimmedValue.length - 1);
                   if (lastChar === '0' && (trimmedValue.charAt(trimmedValue.length - 2) === ' ' || trimmedValue.charAt(trimmedValue.length-2) === ',')) {
                     dataSegment[dataPointer++] = 0;
                   }
                }
              }

              if (numericValues.length > 0) {
                numericValues.forEach(v => {
                    const trimmedV = v.trim();
                    if (trimmedV) {
                       const num = parseInt(trimmedV);
                        if (!isNaN(num)) {
                            dataSegment[dataPointer++] = num;
                        }
                    }
                });
              }
            } else if (directive === 'dd') {
                const values = value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                values.forEach(v => {
                    const view = new DataView(dataSegment.buffer);
                    view.setUint32(dataPointer, v, true);
                    dataPointer += 4;
                });
            }
        } else { // .bss section
            if (directive === 'resd') {
                dataPointer += parseInt(value) * 4;
            } else if (directive === 'resb') {
                dataPointer += parseInt(value);
            }
        }
      } else if (currentSection === '.text') {
        // Ignore assembler directives like 'global' or 'extern'
        if (cleanedLine.toLowerCase().startsWith('global') || cleanedLine.toLowerCase().startsWith('extern')) {
            return;
        }

        // Handle labels
        if (cleanedLine.endsWith(':')) {
          const label = cleanedLine.slice(0, -1);
          labels.set(label, CODE_START_ADDRESS + instructions.length);
          cleanedLine = ''; // Line only contained a label
        } else if (cleanedLine.includes(':')) {
          const colonIndex = cleanedLine.indexOf(':');
          const potentialLabel = cleanedLine.substring(0, colonIndex).trim();
          if (!potentialLabel.includes(' ')) { // Basic check if it's a label
            labels.set(potentialLabel, CODE_START_ADDRESS + instructions.length);
            cleanedLine = cleanedLine.substring(colonIndex + 1).trim();
          }
        }

        if (!cleanedLine) {
          return;
        }
        
        const parts = cleanedLine.match(/(?:[^\s"']+|"[^"]*'[^']*'|'[^']+'|"[^"]+")+/g) || [];
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

  // Resolve EQU directives at the end
  equsToResolve.forEach(({label, value}) => {
    // Very specific handler for `len equ $ - msg`
    const match = value.match(/\$\s*-\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (match) {
        const msgLabel = match[1];
        const msgAddress = labels.get(msgLabel);
        if (msgAddress !== undefined) {
          // The '$' refers to the address *at the point where the EQU was defined*.
          // Our simplified parser approximates this by taking the current data pointer,
          // but this might be inaccurate if EQU is not at the end of the data section.
          // For the given examples, it works because `len equ $ - msg` comes right after `msg`.
          const equAddress = labels.get(label);
          if (equAddress !== undefined) {
             labels.set(label, equAddress - msgAddress);
          } else {
              // Fallback for when the label itself wasn't assigned an address (e.g. if it wasn't a data-defining line)
               const dollarValue = dataPointer;
               labels.set(label, dollarValue - msgAddress);
          }
        }
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        labels.set(label, numValue);
      }
    }
  });


  return { instructions, labels, lineMap, dataSegment };
}

    