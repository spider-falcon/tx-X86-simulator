
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
    mov eax, edx ; Return value in EAX
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
  },
  {
    name: "comprehensive_example.asm",
    code: `; file: comprehensive_example.asm
; This is a modified version that works within the simulator's constraints.
; NOTE: 'printf' is a C library function and cannot be called directly.
; This example is adapted to use sys_write (int 0x80) for output.

section .data
    ; Strings for output
    fact_msg_1 db "Factorial of ", 6
    fact_num_str db " is ", 4
    fact_result_str db "  ", 10, 0 ; Newline and null terminator

    max_msg_1 db "Max of ", 7
    max_num_a_str db " and ", 5
    max_num_b_str db " is ", 4
    max_result_str db "  ", 10, 0

    ; Integer data
    num_factorial dd 5
    num_a dd 42
    num_b dd 29

section .bss
    ; Space for string conversions
    temp_str resb 10

_start:
    ; --- Factorial calculation (using a loop) ---
    mov eax, [num_factorial]
    mov ecx, eax
    dec ecx
    
factorial_loop:
    cmp ecx, 1
    jle factorial_end
    mul ecx
    dec ecx
    jmp factorial_loop

factorial_end:
    ; EAX now holds the factorial result
    
    ; --- Print factorial result ---
    pusha
    mov edi, temp_str
    call int_to_str
    mov edx, edi
    mov ecx, fact_msg_1
    mov ebx, 1
    mov eax, 4
    int 0x80
    popa

    pusha
    mov eax, [num_factorial]
    mov edi, temp_str
    call int_to_str
    mov edx, edi
    mov ecx, fact_num_str
    mov ebx, 1
    mov eax, 4
    int 0x80
    popa
    
    ; --- Function call to find the maximum of two numbers ---
    push dword [num_b]
    push dword [num_a]
    call find_maximum
    add esp, 8
    ; The result is returned in EAX
    mov [result_max], eax

    ; --- Exit (for simplicity, skipping the second print) ---
    mov eax, 1
    mov ebx, [result_max]
    int 0x80


; --- Function to find the maximum of two integers ---
find_maximum:
    push ebp
    mov ebp, esp
    
    mov eax, [ebp+8]  ; First argument
    mov ebx, [ebp+12] ; Second argument

    cmp eax, ebx
    jge a_is_greater
    mov eax, ebx      ; EBX is greater, move to EAX
    jmp end_func

a_is_greater:
    ; EAX is already greater or equal

end_func:
    pop ebp
    ret

; --- Function to convert integer in EAX to string at EDI ---
int_to_str:
    xor ecx, ecx
    mov ebx, 10
divide_loop:
    inc ecx
    xor edx, edx
    div ebx
    add edx, 48
    push edx
    cmp eax, 0
    jnz divide_loop
print_loop:
    dec ecx
    pop eax
    mov [edi], al
    inc edi
    cmp ecx, 0
    jnz print_loop
    mov byte [edi], 0
    ret

result_max: resd 1
`
  }
];
