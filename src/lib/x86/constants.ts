import type { Registers, Flags } from './types';

export const GENERAL_PURPOSE_REGISTERS = ['EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI'];
export const POINTER_REGISTERS = ['EBP', 'ESP', 'EIP'];
export const FLAGS = ['CF', 'PF', 'AF', 'ZF', 'SF', 'TF', 'IF', 'DF', 'OF'];

export const INITIAL_REGISTERS: Registers = {
  EAX: 0x00000000,
  EBX: 0x00000000,
  ECX: 0x00000000,
  EDX: 0x00000000,
  ESI: 0x00000000,
  EDI: 0x00000000,
  EBP: 0x0010fffe,
  ESP: 0x0010fffe,
  EIP: 0x00400000,
};

export const INITIAL_FLAGS: Flags = {
  CF: false, PF: false, AF: false, ZF: true, SF: false,
  TF: false, IF: false, DF: false, OF: false,
};

export const MEMORY_SIZE = 1024 * 1024; // 1MB
export const STACK_ADDRESS_START = 0x0010fffe;
export const STACK_SIZE = 1024 * 4; // 4KB
export const CODE_START_ADDRESS = 0x00400000;
