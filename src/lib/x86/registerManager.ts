import type { Flags } from './types';

function isParity(value: number): boolean {
    let parity = 0;
    let v = value & 0xff; // Check parity of the least significant byte
    for (let i = 0; i < 8; i++) {
        if ((v >> i) & 1) {
            parity++;
        }
    }
    return parity % 2 === 0;
}

export function updateFlags(result: number, op1: number, op2: number, flags: Flags, operation: 'add' | 'sub' | 'xor' | 'and' | 'or') {
    const result32 = result | 0;

    flags.ZF = result32 === 0;
    flags.SF = (result32 & 0x80000000) !== 0;
    flags.PF = isParity(result32);

    switch (operation) {
        case 'add':
            flags.CF = result < op1; // Carry-out for unsigned addition
            flags.OF = ((op1 ^ result) & (op2 ^ result) & 0x80000000) !== 0; // Overflow for signed addition
            flags.AF = ((op1 ^ op2 ^ result) & 0x10) !== 0;
            break;
        case 'sub':
            flags.CF = op1 < op2; // Borrow for unsigned subtraction
            flags.OF = ((op1 ^ op2) & (op1 ^ result) & 0x80000000) !== 0; // Overflow for signed subtraction
            flags.AF = ((op1 ^ op2 ^ result) & 0x10) !== 0;
            break;
        case 'xor':
        case 'and':
        case 'or':
            flags.CF = false;
            flags.OF = false;
            // AF is undefined for these operations in many processors, clearing is a safe bet
            flags.AF = false; 
            break;
    }
}
