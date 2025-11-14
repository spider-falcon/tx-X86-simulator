

import type { Registers, Flags, Memory, Instruction } from './types';
import { formatHex } from './utils';
import { pushStack, popStack, readMemory, writeMemory } from './memoryManager';
import { updateFlags } from './registerManager';

function getOperandValue(operand: string, registers: Registers, memory: Memory, labels: Map<string, number>): { value: number, size: 1 | 2 | 4 } {
    if (!operand) return { value: 0, size: 4 };

    // Handle size specifiers like dword ptr, byte ptr, etc.
    let size: 1 | 2 | 4 = 4; // Default to dword
    let strippedOperand = operand;
    const sizeMatch = operand.match(/(dword|word|byte) ptr \[(.+)\]/i) || operand.match(/(dword|word|byte) \[(.+)\]/i);

    if (sizeMatch) {
        switch (sizeMatch[1].toLowerCase()) {
            case 'byte': size = 1; break;
            case 'word': size = 2; break;
            case 'dword': size = 4; break;
        }
        strippedOperand = `[${sizeMatch[2]}]`;
    }

    const upperOperand = strippedOperand.toUpperCase();

    // Memory operands like [eax], [eax+4], [my_var]
    if (strippedOperand.startsWith('[') && strippedOperand.endsWith(']')) {
        const addressExpression = strippedOperand.slice(1, -1);
        const parts = addressExpression.split(/[+-]/);
        const operators = addressExpression.match(/[+-]/g) || [];
        
        let address = getOperandValue(parts[0].trim(), registers, memory, labels).value;

        for (let i = 0; i < operators.length; i++) {
            const partValue = getOperandValue(parts[i+1].trim(), registers, memory, labels).value;
            if(operators[i] === '+') {
                address += partValue;
            } else {
                address -= partValue;
            }
        }
        return { value: readMemory(address, size, memory), size };
    }

    // Register operands
    if (registers[upperOperand] !== undefined) {
        return { value: registers[upperOperand], size: 4 };
    }

    // Label operand (returns address for data, jump target for code)
    if (labels.has(strippedOperand)) {
        return { value: labels.get(strippedOperand)!, size: 4 };
    }

    // Immediate values (decimal, hex)
    if (strippedOperand.toLowerCase().startsWith('0x')) {
        return { value: parseInt(strippedOperand, 16), size: 4 };
    }
    if (!isNaN(Number(strippedOperand))) {
        return { value: parseInt(strippedOperand, 10), size: 4 };
    }
    
    throw new Error(`Invalid operand: ${operand}`);
}


function setOperandValue(operand: string, value: number, registers: Registers, memory: Memory, labels: Map<string, number>): void {
    
    let size: 1 | 2 | 4 = 4; // Default to dword
    let strippedOperand = operand;
    const sizeMatch = operand.match(/(dword|word|byte) ptr \[(.+)\]/i) || operand.match(/(dword|word|byte) \[(.+)\]/i);

    if (sizeMatch) {
        switch (sizeMatch[1].toLowerCase()) {
            case 'byte': size = 1; break;
            case 'word': size = 2; break;
            case 'dword': size = 4; break;
        }
        strippedOperand = `[${sizeMatch[2]}]`;
    }
    
    const upperOperand = strippedOperand.toUpperCase();

    if (strippedOperand.startsWith('[') && strippedOperand.endsWith(']')) {
        const addressExpression = strippedOperand.slice(1, -1);
        const parts = addressExpression.split(/[+-]/);
        const operators = addressExpression.match(/[+-]/g) || [];

        let address = getOperandValue(parts[0].trim(), registers, memory, labels).value;
        
        for (let i = 0; i < operators.length; i++) {
            const partValue = getOperandValue(parts[i+1].trim(), registers, memory, labels).value;
            if(operators[i] === '+') {
                address += partValue;
            } else {
                address -= partValue;
            }
        }
        writeMemory(address, value, size, memory);
    } else if (registers[upperOperand] !== undefined) {
        registers[upperOperand] = value;
    } else if (upperOperand === 'AL') {
        registers.EAX = (registers.EAX & 0xFFFFFF00) | (value & 0xFF);
    } else if (upperOperand === 'AH') {
        registers.EAX = (registers.EAX & 0xFFFF00FF) | ((value & 0xFF) << 8);
    } else if (upperOperand === 'AX') {
        registers.EAX = (registers.EAX & 0xFFFF0000) | (value & 0xFFFF);
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
  haltExecution: (reason: string, isError?: boolean) => void
): {
  registers: Registers,
  flags: Flags,
  memory: Memory,
  historyLog: string,
  output: string | null,
  callStackUpdate: string | null
} | null {
  const newRegisters = { ...registers };
  const newFlags = { ...flags };
  const newMemory = memory;
  let callStackUpdate: string | null = null;
  const historyLog = `${formatHex(registers.EIP, 8)}: ${instruction.operation} ${instruction.operands.join(', ')}`;
  
  let output: string | null = null;

  const op1 = instruction.operands[0];
  const op2 = instruction.operands[1];

  let val1: { value: number, size: 1 | 2 | 4 };
  let val2: { value: number, size: 1 | 2 | 4 };
  let result: number;
  let jump = false;

  try {
    switch (instruction.operation.toLowerCase()) {
      case 'mov':
        val2 = getOperandValue(op2, newRegisters, newMemory, labels);
        setOperandValue(op1, val2.value, newRegisters, newMemory, labels);
        break;
      case 'movzx':
        val2 = getOperandValue(op2, newRegisters, newMemory, labels);
        // Value is already zero-extended by getOperandValue reading from memory
        setOperandValue(op1, val2.value, newRegisters, newMemory, labels);
        break;
      case 'xchg':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        val2 = getOperandValue(op2, newRegisters, newMemory, labels);
        setOperandValue(op1, val2.value, newRegisters, newMemory, labels);
        setOperandValue(op2, val1.value, newRegisters, newMemory, labels);
        break;
      case 'add':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        val2 = getOperandValue(op2, newRegisters, newMemory, labels);
        result = (val1.value + val2.value) | 0; // Ensure 32-bit integer
        setOperandValue(op1, result, newRegisters, newMemory, labels);
        updateFlags(result, val1.value, val2.value, newFlags, 'add');
        break;
      case 'sub':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          val2 = getOperandValue(op2, newRegisters, newMemory, labels);
          result = (val1.value - val2.value) | 0;
          setOperandValue(op1, result, newRegisters, newMemory, labels);
          updateFlags(result, val1.value, val2.value, newFlags, 'sub');
          break;
      case 'xor':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          val2 = getOperandValue(op2, newRegisters, newMemory, labels);
          result = (val1.value ^ val2.value) | 0;
          setOperandValue(op1, result, newRegisters, newMemory, labels);
          updateFlags(result, val1.value, val2.value, newFlags, 'xor');
          break;
      case 'inc':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        result = (val1.value + 1) | 0;
        setOperandValue(op1, result, newRegisters, newMemory, labels);
        updateFlags(result, val1.value, 1, newFlags, 'add');
        break;
      case 'dec':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        result = (val1.value - 1) | 0;
        setOperandValue(op1, result, newRegisters, newMemory, labels);
        updateFlags(result, val1.value, 1, newFlags, 'sub');
        break;
      case 'push':
        val1 = getOperandValue(op1, newRegisters, newMemory, labels);
        pushStack(val1.value, newRegisters, newMemory);
        break;
      case 'pop':
        val1 = { value: popStack(newRegisters, newMemory), size: 4};
        setOperandValue(op1, val1.value, newRegisters, newMemory, labels);
        break;
      case 'call':
          pushStack(newRegisters.EIP + 1, newRegisters, newMemory);
          const targetAddress = getOperandValue(op1, newRegisters, newMemory, labels).value;
          if (targetAddress !== undefined) {
              if (targetAddress === 0) {
                 // Trying to call an external function like printf
                 output = `(Note: External call to '${op1}' skipped in simulation.)`;
              } else {
                newRegisters.EIP = targetAddress;
                jump = true;
                callStackUpdate = `call ${op1} -> ${formatHex(targetAddress)}`;
              }
          } else {
              throw new Error(`Label or address for call not found: ${op1}`);
          }
          break;
      case 'ret':
          newRegisters.EIP = popStack(newRegisters, newMemory);
          jump = true;
          callStackUpdate = 'ret';
          break;
      case 'cmp':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          val2 = getOperandValue(op2, newRegisters, newMemory, labels);
          result = (val1.value - val2.value) | 0;
          updateFlags(result, val1.value, val2.value, newFlags, 'sub');
          break;
      case 'jmp':
          const jmpTarget = getOperandValue(op1, newRegisters, newMemory, labels).value;
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
              const target = getOperandValue(op1, newRegisters, newMemory, labels).value;
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jne':
      case 'jnz':
          if (!newFlags.ZF) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels).value;
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jg':
      case 'jnle':
          if (!newFlags.ZF && newFlags.SF === newFlags.OF) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels).value;
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jge':
      case 'jnl':
          if (newFlags.SF === newFlags.OF) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels).value;
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jl':
      case 'jnge':
          if (newFlags.SF !== newFlags.OF) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels).value;
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'jle':
      case 'jng':
          if (newFlags.ZF || (newFlags.SF !== newFlags.OF)) {
              const target = getOperandValue(op1, newRegisters, newMemory, labels).value;
              if (target !== undefined) {
                  newRegisters.EIP = target;
                  jump = true;
              }
          }
          break;
      case 'mul':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          const eax = newRegisters.EAX;
          const fullResult = BigInt(eax) * BigInt(val1.value);
          const low = Number(fullResult & BigInt(0xFFFFFFFF));
          const high = Number(fullResult >> BigInt(32));

          newRegisters.EAX = low;
          newRegisters.EDX = high;

          newFlags.OF = high !== 0;
          newFlags.CF = high !== 0;
          break;
      case 'div':
          val1 = getOperandValue(op1, newRegisters, newMemory, labels);
          if (val1.value === 0) {
              throw new Error("Division by zero");
          }
          const dividend = (BigInt(newRegisters.EDX) << BigInt(32)) | BigInt(newRegisters.EAX);
          const quotient = dividend / BigInt(val1.value);
          const remainder = dividend % BigInt(val1.value);
          
          if (quotient > BigInt(0xFFFFFFFF)) {
              throw new Error("Quotient too large for EAX");
          }

          newRegisters.EAX = Number(quotient);
          newRegisters.EDX = Number(remainder);
          break;
      case 'int':
          const interruptNum = getOperandValue(op1, newRegisters, newMemory, labels).value;
          if (interruptNum === 0x80) { // Linux syscall
              if (newRegisters.EAX === 1) { // sys_exit
                  const exitCode = newRegisters.EBX;
                  haltExecution(`Program exited with code ${exitCode}.`, false);
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
    haltExecution(e.message);
    // We do not advance EIP on an error to allow inspection
    return { registers: newRegisters, flags: newFlags, memory: newMemory, historyLog: `${historyLog} (Error: ${e.message})`, output, callStackUpdate };
  }
  
  if(!jump) {
    newRegisters.EIP += 1;
  }

  return { registers: newRegisters, flags: newFlags, memory: newMemory, historyLog, output, callStackUpdate };
}

    