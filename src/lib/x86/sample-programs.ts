
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
    name: "string_reversal.asm",
    code: `; String Reversal Using Stack
; This program reverses a string by pushing each character onto the stack
; and then popping them back in reverse order

section .data
    original db 'HELLO', 0          ; Original string (null-terminated)
    len equ $ - original - 1        ; Length of string (excluding null terminator)
    
section .bss
    reversed resb 20                ; Buffer for reversed string

section .text
    global _start

_start:
    ; Initialize registers
    mov esi, original               ; ESI points to original string
    mov ecx, len                    ; ECX = string length
    xor ebx, ebx                    ; EBX = counter (0)

push_loop:
    ; Push each character onto the stack
    cmp ebx, ecx                    ; Check if we've pushed all characters
    jge pop_setup                   ; If yes, move to popping
    
    movzx eax, byte [esi + ebx]     ; Load character (zero-extended)
    push eax                        ; Push character onto stack
    
    inc ebx                         ; Increment counter
    jmp push_loop                   ; Continue loop

pop_setup:
    ; Setup for popping characters
    mov edi, reversed               ; EDI points to reversed buffer
    xor ebx, ebx                    ; Reset counter

pop_loop:
    ; Pop each character from the stack
    cmp ebx, ecx                    ; Check if we've popped all characters
    jge done                        ; If yes, we're done
    
    pop eax                         ; Pop character from stack
    mov byte [edi + ebx], al        ; Store character in reversed buffer
    
    inc ebx                         ; Increment counter
    jmp pop_loop                    ; Continue loop

done:
    ; Add null terminator
    mov byte [edi + ebx], 0
    
    ; Exit program
    mov eax, 1                      ; sys_exit
    xor ebx, ebx                    ; exit code 0
    int 0x80`
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
    fact_msg db "Factorial of 5 is "
    fact_msg_len equ $ - fact_msg
    
    newline db 10

section .bss
    result_str resb 10

section .text
    global _start

_start:
    ; --- Factorial calculation (using a loop) ---
    mov eax, 5       ; Number for factorial
    mov ecx, eax     ; Use ECX as counter
    dec ecx
    
factorial_loop:
    mul ecx          ; EDX:EAX = EAX * ECX
    dec ecx
    cmp ecx, 1
    jg factorial_loop

    ; EAX now holds the factorial result (120)
    
    ; --- Print factorial message ---
    mov edx, fact_msg_len
    mov ecx, fact_msg
    mov ebx, 1
    mov eax, 4
    int 0x80
    
    ; --- Convert and print result ---
    mov ebx, eax     ; Save result in EBX
    mov eax, ebx
    mov edi, result_str
    call int_to_str
    
    mov edx, 10 ; The length of the string converted (can be improved)
    mov ecx, result_str
    mov ebx, 1
    mov eax, 4
    int 0x80
    
    ; --- Print newline ---
    mov edx, 1
    mov ecx, newline
    mov ebx, 1
    mov eax, 4
    int 0x80

    ; --- Exit ---
    mov eax, 1
    xor ebx, ebx
    int 0x80

; --- Function to convert integer in EAX to string at EDI ---
; Result is not null-terminated. A fixed length is assumed for printing.
int_to_str:
    mov ecx, 10
    mov esi, 9 ; Index to store last digit
convert_loop:
    xor edx, edx
    div ecx
    add dl, '0'
    mov [result_str + esi], dl
    dec esi
    cmp eax, 0
    jne convert_loop
    ret
`
  }
];

    