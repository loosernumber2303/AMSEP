class NumberUtility:
    @staticmethod
    def calculate_stats(numbers: list[int]) -> dict:
        if not numbers:
            raise ValueError("Number list cannot be empty.")

        max_val = max(numbers)
        min_val = min(numbers)
        avg_val = sum(numbers) / len(numbers)
        even_count = sum(1 for n in numbers if n % 2 == 0)

        return {
            "max": max_val,
            "min": min_val,
            "average": round(avg_val, 2),
            "even_count": even_count
        }
