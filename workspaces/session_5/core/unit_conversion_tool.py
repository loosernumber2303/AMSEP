"""
Unit Conversion Tool Application
Multi-domain unit conversion supporting length, weight, and temperature systems.
"""

class UnitConversionToolApp:
    @staticmethod
    def convert_length(value: float, from_unit: str, to_unit: str) -> float:
        if value < 0:
            raise ValueError("Length value cannot be negative.")
        to_m = {"m": 1.0, "km": 1000.0, "cm": 0.01, "mm": 0.001, "inch": 0.0254, "foot": 0.3048, "yard": 0.9144}
        u_from, u_to = from_unit.strip().lower(), to_unit.strip().lower()
        if u_from not in to_m:
            raise ValueError(f"Unsupported source length unit '{from_unit}'.")
        if u_to not in to_m:
            raise ValueError(f"Unsupported target length unit '{to_unit}'.")
        meters = value * to_m[u_from]
        return round(meters / to_m[u_to], 4)

    @staticmethod
    def convert_weight(value: float, from_unit: str, to_unit: str) -> float:
        if value < 0:
            raise ValueError("Weight value cannot be negative.")
        to_kg = {"kg": 1.0, "g": 0.001, "mg": 0.000001, "lb": 0.45359237, "oz": 0.0283495}
        u_from, u_to = from_unit.strip().lower(), to_unit.strip().lower()
        if u_from not in to_kg:
            raise ValueError(f"Unsupported source weight unit '{from_unit}'.")
        if u_to not in to_kg:
            raise ValueError(f"Unsupported target weight unit '{to_unit}'.")
        kg = value * to_kg[u_from]
        return round(kg / to_kg[u_to], 4)

    @staticmethod
    def convert_temperature(value: float, from_unit: str, to_unit: str) -> float:
        u_from, u_to = from_unit.strip().lower(), to_unit.strip().lower()
        if u_from in ("c", "celsius"):
            if value < -273.15: raise ValueError("Temperature below absolute zero (-273.15 C).")
            c = value
        elif u_from in ("f", "fahrenheit"):
            if value < -459.67: raise ValueError("Temperature below absolute zero (-459.67 F).")
            c = (value - 32.0) * 5.0 / 9.0
        elif u_from in ("k", "kelvin"):
            if value < 0.0: raise ValueError("Temperature below absolute zero (0 K).")
            c = value - 273.15
        else:
            raise ValueError(f"Unsupported source temperature unit '{from_unit}'.")

        if u_to in ("c", "celsius"): return round(c, 2)
        elif u_to in ("f", "fahrenheit"): return round((c * 9.0 / 5.0) + 32.0, 2)
        elif u_to in ("k", "kelvin"): return round(c + 273.15, 2)
        else: raise ValueError(f"Unsupported target temperature unit '{to_unit}'.")
