import type { ProgramFile } from './types';

export const samplePrograms: ProgramFile[] = [
  {
    name: "hello.asm",
    code: `; Simple program to add two numbers
section .text
  global _start

_start:
  mov eax, 10      ; Load 10 into EAX
  mov ebx, 20      ; Load 20 into EBX
  add eax, ebx     ; Add EBX to EAX
  
  nop              ; No operation
  
  ; Simulate an exit syscall
  mov eax, 1       ; Syscall number for exit
  mov ebx, 0       ; Exit code 0
  int 0x80         ; Trigger interrupt
`
  },
  {
    name: "loop.asm",
    code: `; A simple loop that counts down
section .text
  global _start

_start:
  mov ecx, 5       ; Initialize loop counter
  xor eax, eax     ; Clear EAX register

loop_start:
  inc eax          ; Increment EAX
  dec ecx          ; Decrement loop counter
  jnz loop_start   ; Jump if not zero
  
exit:
  mov eax, 1
  int 0x80
`
  }
];
