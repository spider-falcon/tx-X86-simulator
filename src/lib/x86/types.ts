export type Registers = { [key: string]: number };
export type Flags = { [key: string]: boolean };
export type Memory = Uint8Array;

export interface ProgramFile {
  name: string;
  code: string;
}

export interface Instruction {
  line: number;
  operation: string;
  operands: string[];
}
