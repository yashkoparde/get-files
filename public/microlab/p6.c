#include <lpc214x.h>

int main(void)
{
    volatile int i, j, temp;
    int arr[] = {4, 1, 3, 5, 2};   // Array to be sorted

    // Bubble Sort
    for(i = 1; i < 5; i++)
    {
        for(j = 0; j < 5 - i; j++)
        {
            if(arr[j] > arr[j + 1])
            {
                temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }

    while(1);
}
