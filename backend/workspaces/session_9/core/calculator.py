class TemperatureConverter:
    @staticmethod
    def convert_celsius(celsius: float) -> dict[str, float]:
        if celsius < -273.15:
            raise ValueError("Temperature cannot be below absolute zero (-273.15 C).")
        fahrenheit = (celsius * 9/5) + 32
        kelvin = celsius + 273.15
        return {
            "fahrenheit": round(fahrenheit, 2),
            "kelvin": round(kelvin, 2)
        }
