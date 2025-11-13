import type { Registers, Memory } from './types';

export function readMemory(address: number, size: 1 | 2 | 4, memory: Memory): number {
  const dataView = new DataView(memory.buffer);
  if (address < 0 || address + size > memory.length) return 0;

  switch (size) {
    case 1: return dataView.getUint8(address);
    case 2: return dataView.getUint16(address, true);
    case 4: return dataView.getUint32(address, true);
    default: return 0;
  }
}

export function writeMemory(address: number, value: number, size: 1 | 2 | 4, memory: Memory) {
  const dataView = new DataView(memory.buffer);
  if (address < 0 || address + size > memory.length) return;

  switch (size) {
    case 1: dataView.setUint8(address, value); break;
    case 2: dataView.setUint16(address, value, true); break;
    case 4: dataView.setUint32(address, value, true); break;
  }
}

export function pushStack(value: number, registers: Registers, memory: Memory) {
    registers.ESP -= 4;
    writeMemory(registers.ESP, value, 4, memory);
}

export function popStack(registers: Registers, memory: Memory): number {
    const value = readMemory(registers.ESP, 4, memory);
    registers.ESP += 4;
    return value;
}
