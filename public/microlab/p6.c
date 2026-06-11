//C program using KEIL to sort the numbers in ascending/descending order using bubble sort.
#include <lpc214x.h>

int main(void)
{
    volatile int i, j, temp;
    int arr[] = {4, 1, 3, 5, 2};    // Array to be sorted

    /* Bubble Sort */
    for (i = 1; i < 5; i++)
    {
        for (j = 0; j < 5 - i; j++)
        {
            if (arr[j] > arr[j + 1])   // Compare adjacent elements
            {
                temp = arr[j];         // Swap if out of order
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }

    while (1);     // Infinite loop

    return 0;
}
