"""
Selection Sort Application
Implementation of Selection Sort algorithm for numeric arrays.
"""

class SelectionSortApp:
    @staticmethod
    def sort(arr: list) -> list:
        """
        Sorts a list of numbers in ascending order using the Selection Sort algorithm.
        Traverses the list, finds the minimum element in the unsorted portion, and swaps it with the current index.
        """
        if not isinstance(arr, list):
            raise TypeError("Input array must be a list.")
        for x in arr:
            if not isinstance(x, (int, float)):
                raise TypeError("All array elements must be integers or floats.")

        result = list(arr)
        n = len(result)
        for i in range(n):
            min_idx = i
            for j in range(i + 1, n):
                if result[j] < result[min_idx]:
                    min_idx = j
            if min_idx != i:
                result[i], result[min_idx] = result[min_idx], result[i]
        return result

    @classmethod
    def selection_sort(cls, arr: list) -> list:
        return cls.sort(arr)
