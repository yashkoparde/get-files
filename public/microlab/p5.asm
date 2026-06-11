; ALP to count the number of ones and zeros in two consecutive memory locations. 
        AREA    BITCOUNT, CODE, READONLY
        ENTRY

        MOV     R7, #2              ; Counter for 2 numbers
        LDR     R6, =LOOKUP         ; Load starting address of lookup table

        MOV     R2, #0              ; Count of 1s
        MOV     R3, #0              ; Count of 0s

LOOP    MOV     R1, #32             ; 32 bits per number

        LDR     R0, [R6]            ; Load number into R0

NEXTBIT MOVS    R0, R0, ROR #1      ; Rotate right, bit0 -> Carry

        BCS     ONES                ; If Carry = 1

ZEROS   ADD     R3, R3, #1          ; Increment zero count
        B       REPEAT

ONES    ADD     R2, R2, #1          ; Increment one count

REPEAT  SUBS    R1, R1, #1          ; Decrement bit counter
        BNE     NEXTBIT

        ADD     R6, R6, #4          ; Point to next number

        SUBS    R7, R7, #1          ; Decrement number counter
        BNE     LOOP

STOP    B       STOP

LOOKUP  DCD     0x5, 0x7

        END
