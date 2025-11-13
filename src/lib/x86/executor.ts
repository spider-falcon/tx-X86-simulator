import type { Registers, Flags, Memory, Instruction } from './types';
import { formatHex } from './utils';
import { pushStack, popStack, readMemory, writeMemory } from './memoryManager';
import { updateFlags } from './registerManager';

function getOperandValue(operand: string, registers: Registers, memory: Memory): number {
    if (operand.startsWith('[') && operand.endsWith(']')) {
        const address = getOperandValue(operand.slice(1, -1), registers, memory);
        return readMemory(address, 4, memory);
    }
    if (registers[operand] !== undefined) {
        return registers[operand];
    }
    const value = parseInt(operand, 10);
    if (!isNaN(value)) {
        return value;
    }
    const hexValue = parseInt(operand, 16);
    if (!isNaN(hexValue)) {
        return hexValue;
    }
    return 0; // Should handle labels here
}


function setOperandValue(operand: string, value: number, registers: Registers, memory: Memory) {
    if (operand.startsWith('[') && operand.endsWith(']')) {
        const address = getOperandValue(operand.slice(1, -1), registers, memory);
        writeMemory(address, value, 4, memory);
    } else if (registers[operand] !== undefined) {
        registers[operand] = value;
    }
}


export function step(
  instruction: Instruction,
  registers: Registers,
  flags: Flags,
  memory: Memory,
  labels: Map<string, number>
): {
  registers: Registers,
  flags: Flags,
  memory: Memory,
  historyLog: string,
  output: string | null,
  callStack: string[]
} {
  const newRegisters = { ...registers };
  const newFlags = { ...flags };
  const newMemory = memory; // Using the same memory instance for modifications
  let callStackUpdate: string[] = [];

  let historyLog = `${formatHex(registers.EIP, 8)}: ${instruction.operation} ${instruction.operands.join(', ')}`;
  let output = null;

  const op1 = instruction.operands[0];
  const op2 = instruction.operands[1];

  let val1: number, val2: number;
  let result: number;
  let jump = false;

  switch (instruction.operation.toLowerCase()) {
    case 'mov':
      val2 = getOperandValue(op2, newRegisters, newMemory);
      setOperandValue(op1, val2, newRegisters, newMemory);
      break;
    case 'add':
      val1 = getOperandValue(op1, newRegisters, newMemory);
      val2 = getOperandValue(op2, newRegisters, newMemory);
      result = val1 + val2;
      setOperandValue(op1, result, newRegisters, newMemory);
      updateFlags(result, newFlags);
      break;
    case 'xor':
        val1 = getOperandValue(op1, newRegisters, newMemory);
        val2 = getOperandValue(op2, newRegisters, newMemory);
        result = val1 ^ val2;
        setOperandValue(op1, result, newRegisters, newMemory);
        updateFlags(result, newFlags);
        break;
    case 'inc':
      val1 = getOperandValue(op1, newRegisters, newMemory);
      result = val1 + 1;
      setOperandValue(op1, result, newRegisters, newMemory);
      updateFlags(result, newFlags);
      break;
    case 'dec':
      val1 = getOperandValue(op1, newRegisters, newMemory);
      result = val1 - 1;
      setOperandValue(op1, result, newRegisters, newMemory);
      updateFlags(result, newFlags);
      break;
    case 'push':
      val1 = getOperandValue(op1, newRegisters, newMemory);
      pushStack(val1, newRegisters, newMemory);
      break;
    case 'pop':
      val1 = popStack(newRegisters, newMemory);
      setOperandValue(op1, val1, newRegisters, newMemory);
      break;
    case 'call':
        pushStack(newRegisters.EIP + 1, newRegisters, newMemory);
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
        jump = true;
        callStackUpdate = ['ret'];
        break;
    case 'cmp':
        val1 = getOperandValue(op1, newRegisters, newMemory);
        val2 = getOperandValue(op2, newRegisters, newMemory);
        result = val1 - val2;
        updateFlags(result, newFlags);
        newFlags.CF = val1 < val2;
        break;
    case 'jle':
        if (newFlags.ZF || (newFlags.SF !== newFlags.OF)) {
            const targetAddress = labels.get(op1);
            if (targetAddress !== undefined) {
                newRegisters.EIP = targetAddress;
                jump = true;
            }
        }
        break;
    case 'jnz':
        if (!newFlags.ZF) {
            const targetAddress = labels.get(op1);
            if (targetAddress !== undefined) {
                newRegisters.EIP = targetAddress;
                jump = true;
            }
        }
        break;
    case 'mul':
        val1 = getOperandValue(op1, newRegisters, newMemory);
        result = newRegisters.EAX * val1;
        newRegisters.EAX = result & 0xFFFFFFFF;
        newRegisters.EDX = (result / 0x100000000) & 0xFFFFFFFF;
        // Simplified flag update
        newFlags.OF = newRegisters.EDX !== 0;
        newFlags.CF = newRegisters.EDX !== 0;
        break;
    case 'int':
        output = `Interrupt 0x80 called with EAX=${newRegisters.EAX}`;
        break;
    case 'nop':
        break; // No operation
  }
  
  if(!jump) {
    newRegisters.EIP += 1; // Simple increment, not realistic
  }

  return { registers: newRegisters, flags: newFlags, memory: newMemory, historyLog, output, callStack: callStackUpdate };
}
