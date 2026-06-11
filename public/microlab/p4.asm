; ALP to find the largest/smallest number in an array of 32 numbers. 
AREA    LARGE, CODE, READONLY
        ENTRY

        MOV     R5, #5             ; Number of comparisons (length - 1)

        LDR     R1, =ARRAY         ; Load starting address of array
        LDR     R2, [R1], #4       ; Load first element (assume largest)

LOOP    LDR     R4, [R1], #4       ; Load next element

        CMP     R2, R4             ; Compare current largest with new element
        BHI     NEXT               ; If R2 > R4, keep current largest

        MOV     R2, R4             ; Otherwise update largest value

NEXT    SUBS    R5, R5, #1         ; Decrement counter
        BNE     LOOP               ; Repeat until R5 = 0

STOP    B       STOP

ARRAY   DCD     0x23, 0x45, 0xFF, 0x76, 0x12, 0x99

        END
