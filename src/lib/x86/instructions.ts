// This file can be expanded to define the properties of each x86 instruction.
// For example: opcodes, cycle counts, argument types, etc.

interface InstructionDefinition {
  opcode: number;
  cycles: number | [number, number];
  args: ('reg' | 'mem' | 'imm')[];
}

export const instructionSet: { [key: string]: InstructionDefinition } = {
  MOV: { opcode: 0x88, cycles: 1, args: ['reg', 'reg'] },
  ADD: { opcode: 0x00, cycles: 1, args: ['reg', 'reg'] },
  INC: { opcode: 0x40, cycles: 1, args: ['reg'] },
  DEC: { opcode: 0x48, cycles: 1, args: ['reg'] },
  JNZ: { opcode: 0x75, cycles: [1, 3], args: ['imm'] },
  INT: { opcode: 0xCD, cycles: 30, args: ['imm'] },
  NOP: { opcode: 0x90, cycles: 1, args: [] },
};
