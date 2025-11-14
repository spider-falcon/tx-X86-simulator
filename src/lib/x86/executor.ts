
import type { Registers, Flags, Memory, Instruction } from './types';
import { formatHex } from './utils';
import { pushStack, popStack, readMemory, writeMemory } from './memoryManager';
import { updateFlags } from './registerManager';

function getOperandValue(operand: string, registers: Registers, memory: Memory, labels: Map<string, number>): number {
    if (!operand) return 0;
    
    // Memory operands like [eax], [eax+4], [my_var]
    if (operand.startsWith('[') && operand.endsWith(']')) {
        const addressExpression = operand.slice(1, -1);
        // Simple expression parsing for things like 'eax+4'
        const parts = addressExpression.split('+');
        let address = 0;
        for (const part of parts) {
            address += getOperandValue(part.trim(), registers, memory, labels);
        }
        return readMemory(address, 4, memory);
    }

    // Register operands
    if (registers[operand.toUpperCase()] !== undefined) {
        return registers[operand.toUpperCase()];
    }

    // Label operand (returns address)
    if (labels.has(operand)) {
        return labels.get(operand)!;
    }

    // Immediate values (decimal, hex)
    if (operand.toLowerCase().startsWith('0x')) {
        return parseInt(operand, 16);
    }
    const value = parseInt(operand, 10);
    if (!isNaN(value)) {
        return value;
    }
    
    throw new Error(`Invalid operand: ${operand}`);
}


function setOperandValue(operand: string, value: number, registers: Registers, memory: Memory, labels: Map<string, number>): boolean {
    if (operand.startsWith('[') && operand.endsWith(']')) {
        const addressExpression = operand.slice(1, -1);
        const parts = addressExpression.split('+');
        let address = 0;
        for (const part of parts) {
            address += getOperandValue(part.trim(), registers, memory, labels);
        }
        writeMemory(address, value, 4, memory);
        return true; // Memory was mutated
    } else if (registers[operand.toUpperCase()] !== undefined) {
        registers[operand.toUpperCase()] = value;
    }
    return false; // Memory was not mutated
}


export function step(
  instruction: Instruction,
  registers: Registers,
  flags: Flags,
  memory: Memory,
  labels: Map<string, number>,
  stopRunner: () => void
): {
  registers: Registers,
  flags: Flags,
  memory: Memory,
  memoryMutated: boolean,
  historyLog: string,
  output: string | null,
  callStackUpdate: string[]
} {
  const newRegisters = { ...registers };
  const newFlags = { ...flags };
  const newMemory = memory; // Work on the same memory array
  let memoryMutated = false;
  let callStackUpdate: string[] = [];

  let historyLog = `${formatHex(registers.EIP, 8)}: ${instruction.operation} ${instruction.operands.join(', ')}`;
  let output: string | null = null;

  const op1 = instruction.operands[0];
  const op2 = instruction.operands[1];

  let val1: number, val2: number;
  let result: number;
  let jump = false;

  try {
    switch (instruction.operation.toLowerCase()) {
      case 'mov':
        val2 = getOperandValue(op2, newRegisters, newMemory, labels);
        if (setOperandValue(op1, val2, newRegisters, newMemory, labels)) {
          memoryMutated = true;
        }
        break;
      case 'add':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        val2 = getOperandValue(op2, newRegisters, newMemory, labels);
        result = (val1 + val2) | 0; // Ensure 32-bit integer
        if(setOperandValue(op1, result, newRegisters, newMemory, labels)) {
            memoryMutated = true;
        }
        updateFlags(result, val1, val2, newFlags, 'add');
        break;
      case 'sub':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          val2 = getOperandValue(op2, newRegisters, newMemory, labels);
          result = (val1 - val2) | 0;
          if(setOperandValue(op1, result, newRegisters, newMemory, labels)) {
              memoryMutated = true;
          }
          updateFlags(result, val1, val2, newFlags, 'sub');
          break;
      case 'xor':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          val2 = getOperandValue(op2, newRegisters, newMemory, labels);
          result = (val1 ^ val2) | 0;
          if(setOperandValue(op1, result, newRegisters, newMemory, labels)) {
              memoryMutated = true;
          }
          updateFlags(result, val1, val2, newFlags, 'xor');
          break;
      case 'inc':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        result = (val1 + 1) | 0;
        if(setOperandValue(op1, result, newRegisters, newMemory, labels)) {
            memoryMutated = true;
        }
        updateFlags(result, val1, 1, newFlags, 'add');
        break;
      case 'dec':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        result = (val1 - 1) | 0;
        if(setOperandValue(op1, result, newRegisters, newMemory, labels)) {
            memoryMutated = true;
        }
        updateFlags(result, val1, 1, newFlags, 'sub');
        break;
      case 'push':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        pushStack(val1, newRegisters, newMemory);
        memoryMutated = true;
        break;
      case 'pop':
        val1 = popStack(newRegisters, newMemory);
        if(setOperandValue(op1, val1, newRegisters, newMemory, labels)) {
            memoryMutated = true;
        }
        memoryMutated = true;
        break;
      case 'call':
          pushStack(newRegisters.EIP + 1, newRegisters, newMemory);
          memoryMutated = true;
          const targetAddress = labels.get(op1);
          if (targetAddress !== undefined) {
              newRegisters.EIP = targetAddress;
              jump = true;
              callStackUpdate = [`call ${op1}`];
          } else {
              historyLog += " (Error: Label not found)";
          }
          break;
      case 'ret':
          newRegisters.EIP = popStack(newRegisters, newMemory);
          memoryMutated = true;
          jump = true;
          callStackUpdate = ['ret'];
          break;
      case 'cmp':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          val2 = getOperandValue(op2, newRegisters, newMemory, labels);
          result = (val1 - val2) | 0;
          updateFlags(result, val1, val2, newFlags, 'sub');
          break;
      case 'jmp':
          const jmpTarget = labels.get(op1);
          if (jmpTarget !== undefined) {
              newRegisters.EIP = jmpTarget;
              jump = true;
          }
          break;
      case 'je':
      case 'jz':
          if (newFlags.ZF) {
              const target = labels.get(op1);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jne':
      case 'jnz':
          if (!newFlags.ZF) {
              const target = labels.get(op1);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jg':
      case 'jnle':
          if (!newFlags.ZF && newFlags.SF === newFlags.OF) {
              const target = labels.get(op1);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jge':
      case 'jnl':
          if (newFlags.SF === newFlags.OF) {
              const target = labels.get(op1);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jl':
      case 'jnge':
          if (newFlags.SF !== newFlags.OF) {
              const target = labels.get(op1);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jle':
      case 'jng':
          if (newFlags.ZF || (newFlags.SF !== newFlags.OF)) {
              const target = labels.get(op1);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'mul':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          const eax = newRegisters.EAX;
          const fullResult = BigInt(eax) * BigInt(val1);
          const low = Number(fullResult & BigInt(0xFFFFFFFF));
          const high = Number(fullResult >> BigInt(32));

          newRegisters.EAX = low;
          newRegisters.EDX = high;

          newFlags.OF = high !== 0;
          newFlags.CF = high !== 0;
          break;
      case 'int':
          const interruptNum = getOperandValue(op1, newRegisters, newMemory, labels);
          if (interruptNum === 0x80) { // Linux syscall
              if (newRegisters.EAX === 1) { // sys_exit
                  output = `Program exited with code ${newRegisters.EBX}.`;
                  stopRunner();
              } else if (newRegisters.EAX === 4) { // sys_write
                  const address = newRegisters.ECX;
                  const length = newRegisters.EDX;
                  let str = '';
                  for (let i = 0; i < length; i++) {
                      const charCode = readMemory(address + i, 1, newMemory);
                      if (charCode === 0) break; // Null terminator
                      str += String.fromCharCode(charCode);
                  }
                  output = str;
              }
          } else {
              output = `Interrupt ${formatHex(interruptNum)} called.`;
          }
          break;
      case 'nop':
          break; // No operation
      default:
          historyLog += ` (Error: Unknown instruction '${instruction.operation}')`;
          break;
    }
  } catch (e: any) {
    historyLog += ` (Error: ${e.message})`;
    stopRunner();
  }
  
  if(!jump) {
    newRegisters.EIP += 1;
  }

  return { registers: newRegisters, flags: newFlags, memory: newMemory, memoryMutated, historyLog, output, callStackUpdate };
}
