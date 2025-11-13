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
  },
  {
    name: "factorial.asm",
    code: `; Recursive factorial calculation
section .text
  global _start

_start:
  mov eax, 4      ; Calculate factorial of 4
  push eax
  call factorial
  add esp, 4      ; Clean up stack after call

  ; The result is in EAX
  mov ebx, eax    ; Exit code is the result
  mov eax, 1
  int 0x80

factorial:
  push ebp        ; Set up stack frame
  mov ebp, esp

  mov eax, [ebp+8] ; Get argument (n)

  cmp eax, 1
  jle end_factorial ; If n <= 1, return 1

  dec eax
  push eax
  call factorial  ; factorial(n-1)
  add esp, 4      ; Clean up stack

  mov ebx, [ebp+8] ; Get n again
  mul ebx         ; EAX = EAX * EBX (n * (n-1)!)

end_factorial:
  mov esp, ebp    ; Tear down stack frame
  pop ebp
  ret
`
  }
];
