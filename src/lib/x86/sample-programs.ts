
import type { ProgramFile } from './types';

export const samplePrograms: ProgramFile[] = [
  {
    name: "hello.asm",
    code: `section .data
    msg db 'Hello, World!', 0xa ; The message and newline
    len equ $ - msg         ; The length of the message

section .text
    global _start

_start:
    ; write the message to stdout
    mov edx, len    ; message length
    mov ecx, msg    ; message to write
    mov ebx, 1      ; file descriptor (stdout)
    mov eax, 4      ; system call number (sys_write)
    int 0x80        ; call kernel

    ; exit
    mov ebx, 0      ; exit code 0
    mov eax, 1      ; system call number (sys_exit)
    int 0x80        ; call kernel
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
  cmp ecx, 0
  jnz loop_start   ; Jump if not zero
  
exit:
  mov ebx, eax    ; Exit with the final value of EAX (5)
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
  mov eax, 5      ; Calculate factorial of 5
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
  jle end_factorial ; If n <= 1, result is 1

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
  },
  {
    name: "fibonacci.asm",
    code: `; Iterative Fibonacci sequence
section .text
  global _start

_start:
    mov ecx, 10      ; We want to compute the 10th Fibonacci number
    call fib
    
    ; exit with the result
    mov ebx, eax
    mov eax, 1
    int 0x80

fib:
    cmp ecx, 1
    jle fib_end

    mov eax, 0      ; F(0)
    mov edx, 1      ; F(1)

fib_loop:
    add eax, edx
    xchg eax, edx
    dec ecx
    cmp ecx, 1
    jg fib_loop

fib_end:
    mov edx, eax
    ret
`
  },
  {
    name: "stack_test.asm",
    code: `section .data
    ; Define some data if needed, not directly used in this stack example

section .text
    global _start

_start:
    ; Push values onto the stack
    mov eax, 10      ; Load value 10 into EAX
    push eax         ; Push EAX (10) onto the stack

    mov ebx, 20      ; Load value 20 into EBX
    push ebx         ; Push EBX (20) onto the stack

    mov ecx, 30      ; Load value 30 into ECX
    push ecx         ; Push ECX (30) onto the stack

    ; Pop values from the stack (LIFO - Last In, First Out)
    pop edx          ; Pop the top value (30) into EDX
    pop esi          ; Pop the next value (20) into ESI
    pop edi          ; Pop the last value (10) into EDI

    ; Exit the program
    mov eax, 1       ; System call for exit
    xor ebx, ebx     ; Exit code 0
    int 0x80         ; Invoke kernel
`
  }
];

    
