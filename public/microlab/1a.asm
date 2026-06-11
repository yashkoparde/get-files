; ALP for data transfer operations
AREA    reg, CODE, READONLY
        ENTRY

        MOV     R0, #0x56          ; Move immediate number to R0
        MOV     R1, #0x89          ; Move immediate number to R1

        LDR     R5, =DATA          ; Load address of DATA into R5

        LDRH    R3, [R5]           ; Load first halfword from DATA into R3
        LDRH    R4, [R5, #2]       ; Load second halfword from DATA into R4

        MRS     R6, CPSR           ; Copy CPSR contents into R6

STOP    B       STOP               ; Infinite loop

DATA    DCW     0x1234, 0x6789     ; Declare two 16-bit numbers

        END
