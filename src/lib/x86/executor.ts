import type { Registers, Flags, Memory, Instruction } from './types';
import { formatHex } from './utils';

// Dummy executor
export function step(
  instruction: Instruction,
  registers: Registers,
  flags: Flags,
  memory: Memory
): {
  registers: Registers,
  flags: Flags,
  memory: Memory,
  historyLog: string,
  output: string | null
} {
  const newRegisters = { ...registers };
  const newFlags = { ...flags };
  let historyLog = `${formatHex(registers.EIP, 8)}: ${instruction.operation} ${instruction.operands.join(', ')}`;
  let output = null;

  newRegisters.EIP += 1; // Simple increment, not realistic

  switch (instruction.operation.toLowerCase()) {
    case 'mov':
      newRegisters.EAX = Math.floor(Math.random() * 0xFFFFFFFF);
      break;
    case 'add':
      newRegisters.EBX += newRegisters.EAX;
      break;
    case 'inc':
      newRegisters.ECX += 1;
      newFlags.ZF = newRegisters.ECX === 0;
      newFlags.SF = (newRegisters.ECX & 0x80000000) !== 0;
      break;
    case 'dec':
      newRegisters.ECX -= 1;
      newFlags.ZF = newRegisters.ECX === 0;
      newFlags.SF = (newRegisters.ECX & 0x80000000) !== 0;
      break;
    case 'int':
        output = `Interrupt 0x80 called with EAX=${newRegisters.EAX}`;
        break;
  }
  
  newFlags.PF = (newRegisters.EAX & 0xFF) % 2 === 0;


  return { registers: newRegisters, flags: newFlags, memory, historyLog, output };
}
