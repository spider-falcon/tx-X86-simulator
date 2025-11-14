

import type { Registers, Flags, Memory, Instruction } from './types';
import { formatHex } from './utils';
import { pushStack, popStack, readMemory, writeMemory } from './memoryManager';
import { updateFlags } from './registerManager';

function getOperandValue(operand: string, registers: Registers, memory: Memory, labels: Map<string, number>): number {
    if (!operand) return 0;
    
    // Handle dword ptr [address] syntax
    const dwordMatch = operand.match(/dword ptr \[(.+)\]/i) || operand.match(/dword \[(.+)\]/i);
    if (dwordMatch) {
        operand = `[${dwordMatch[1]}]`;
    }

    const upperOperand = operand.toUpperCase();

    // Memory operands like [eax], [eax+4], [my_var]
    if (operand.startsWith('[') && operand.endsWith(']')) {
        const addressExpression = operand.slice(1, -1);
        // Simple expression parsing for things like 'eax+4'
        const parts = addressExpression.split(/[+-]/);
        const operators = addressExpression.match(/[+-]/g) || [];
        
        let address = getOperandValue(parts[0].trim(), registers, memory, labels);

        for (let i = 0; i < operators.length; i++) {
            const partValue = getOperandValue(parts[i+1].trim(), registers, memory, labels);
            if(operators[i] === '+') {
                address += partValue;
            } else {
                address -= partValue;
            }
        }
        return readMemory(address, 4, memory);
    }

    // Register operands
    if (registers[upperOperand] !== undefined) {
        return registers[upperOperand];
    }

    // Label operand (returns address for data, jump target for code)
    if (labels.has(operand)) {
        return labels.get(operand)!;
    }

    // Immediate values (decimal, hex)
    if (operand.toLowerCase().startsWith('0x')) {
        return parseInt(operand, 16);
    }
    if (!isNaN(Number(operand))) {
        return parseInt(operand, 10);
    }
    
    throw new Error(`Invalid operand: ${operand}`);
}


function setOperandValue(operand: string, value: number, registers: Registers, memory: Memory, labels: Map<string, number>): void {
    
    const dwordMatch = operand.match(/dword ptr \[(.+)\]/i) || operand.match(/dword \[(.+)\]/i);
    if (dwordMatch) {
        operand = `[${dwordMatch[1]}]`;
    }
    
    const upperOperand = operand.toUpperCase();

    if (operand.startsWith('[') && operand.endsWith(']')) {
        const addressExpression = operand.slice(1, -1);
        const parts = addressExpression.split(/[+-]/);
        const operators = addressExpression.match(/[+-]/g) || [];

        let address = getOperandValue(parts[0].trim(), registers, memory, labels);
        
        for (let i = 0; i < operators.length; i++) {
            const partValue = getOperandValue(parts[i+1].trim(), registers, memory, labels);
            if(operators[i] === '+') {
                address += partValue;
            } else {
                address -= partValue;
            }
        }
        writeMemory(address, value, 4, memory);
    } else if (registers[upperOperand] !== undefined) {
        registers[upperOperand] = value;
    } else {
        throw new Error(`Invalid destination operand: ${operand}`);
    }
}


export function step(
  instruction: Instruction,
  registers: Registers,
  flags: Flags,
  memory: Memory,
  labels: Map<string, number>,
  stopRunner: (reason: string) => void
): {
  registers: Registers,
  flags: Flags,
  memory: Memory,
  historyLog: string,
  output: string | null,
  callStackUpdate: string[]
} | null {
  const newRegisters = { ...registers };
  const newFlags = { ...flags };
  const newMemory = memory;
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
        setOperandValue(op1, val2, newRegisters, newMemory, labels);
        break;
      case 'xchg':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        val2 = getOperandValue(op2, newRegisters, newMemory, labels);
        setOperandValue(op1, val2, newRegisters, newMemory, labels);
        setOperandValue(op2, val1, newRegisters, newMemory, labels);
        break;
      case 'add':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        val2 = getOperandValue(op2, newRegisters, newMemory, labels);
        result = (val1 + val2) | 0; // Ensure 32-bit integer
        setOperandValue(op1, result, newRegisters, newMemory, labels);
        updateFlags(result, val1, val2, newFlags, 'add');
        break;
      case 'sub':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          val2 = getOperandValue(op2, newRegisters, newMemory, labels);
          result = (val1 - val2) | 0;
          setOperandValue(op1, result, newRegisters, newMemory, labels);
          updateFlags(result, val1, val2, newFlags, 'sub');
          break;
      case 'xor':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          val2 = getOperandValue(op2, newRegisters, newMemory, labels);
          result = (val1 ^ val2) | 0;
          setOperandValue(op1, result, newRegisters, newMemory, labels);
          updateFlags(result, val1, val2, newFlags, 'xor');
          break;
      case 'inc':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        result = (val1 + 1) | 0;
        setOperandValue(op1, result, newRegisters, newMemory, labels);
        updateFlags(result, val1, 1, newFlags, 'add');
        break;
      case 'dec':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        result = (val1 - 1) | 0;
        setOperandValue(op1, result, newRegisters, newMemory, labels);
        updateFlags(result, val1, 1, newFlags, 'sub');
        break;
      case 'push':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        pushStack(val1, newRegisters, newMemory);
        break;
      case 'pop':
        val1 = popStack(newRegisters, newMemory);
        setOperandValue(op1, val1, newRegisters, newMemory, labels);
        break;
      case 'call':
          pushStack(newRegisters.EIP + 1, newRegisters, newMemory);
          const targetAddress = getOperandValue(op1, newRegisters, newMemory, labels);
          if (targetAddress !== undefined) {
              if (targetAddress === 0) {
                 // Trying to call an external function like printf
                 output = `(Note: External call to '${op1}' skipped in simulation.)`;
              } else {
                newRegisters.EIP = targetAddress;
                jump = true;
                callStackUpdate = [`call ${op1}`];
              }
          } else {
              throw new Error(`Label or address for call not found: ${op1}`);
          }
          break;
      case 'ret':
          newRegisters.EIP = popStack(newRegisters, newMemory);
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
          const jmpTarget = getOperandValue(op1, newRegisters, newMemory, labels);
          if (jmpTarget !== undefined) {
              newRegisters.EIP = jmpTarget;
              jump = true;
          } else {
              throw new Error(`Label or address for jmp not found: ${op1}`);
          }
          break;
      case 'je':
      case 'jz':
          if (newFlags.ZF) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jne':
      case 'jnz':
          if (!newFlags.ZF) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jg':
      case 'jnle':
          if (!newFlags.ZF && newFlags.SF === newFlags.OF) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jge':
      case 'jnl':
          if (newFlags.SF === newFlags.OF) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jl':
      case 'jnge':
          if (newFlags.SF !== newFlags.OF) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels);
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jle':
      case 'jng':
          if (newFlags.ZF || (newFlags.SF !== newFlags.OF)) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels);
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
                  stopRunner(output);
                  return null;
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
          throw new Error(`Unknown instruction '${instruction.operation}'`);
    }
  } catch (e: any) {
    stopRunner(e.message);
    historyLog += ` (Error: ${e.message})`;
    // We do not advance EIP on an error to allow inspection
    return { registers: newRegisters, flags: newFlags, memory: newMemory, historyLog, output, callStackUpdate };
  }
  
  if(!jump) {
    newRegisters.EIP += 1;
  }

  return { registers: newRegisters, flags: newFlags, memory: newMemory, historyLog, output, callStackUpdate };
}
