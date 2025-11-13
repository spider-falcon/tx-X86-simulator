import type { Registers, Flags } from './types';

export function updateRegister(register: string, value: number, registers: Registers, flags: Flags) {
  registers[register] = value;
  updateFlags(value, flags);
}

export function updateFlags(result: number, flags: Flags) {
  flags.ZF = result === 0;
  flags.SF = (result & 0x80000000) !== 0;
  // Dummy parity flag calculation
  let temp = result & 0xff;
  let parity = 0;
  for (let i = 0; i < 8; i++) {
    if ((temp >> i) & 1) {
      parity++;
    }
  }
  flags.PF = parity % 2 === 0;
}
