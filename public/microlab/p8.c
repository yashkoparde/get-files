//Case Convertor
#include <lpc214x.h>

int main(void)
{
    volatile int i;

    char tran_arr[20];                 // Array to store translated string
    char arr[] = "MicroController";    // Input string

    for (i = 0; arr[i] != '\0'; i++)
    {
        if (arr[i] >= 'a' && arr[i] <= 'z')
        {
            tran_arr[i] = arr[i] - 32; // Convert lowercase to uppercase
        }
        else if (arr[i] >= 'A' && arr[i] <= 'Z')
        {
            tran_arr[i] = arr[i] + 32; // Convert uppercase to lowercase
        }
    }

    tran_arr[i] = '\0';                // String terminator

    while (1);

    return 0;
}
