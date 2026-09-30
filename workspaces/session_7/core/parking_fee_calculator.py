"""
Parking Fee Calculator
Vehicle parking fee calculations based on vehicle type tier and duration.
"""
import math

class ParkingFeeCalculator:
    RATES = {
        "motorcycle": {"base_fee": 2.0, "hourly_rate": 1.50},
        "car": {"base_fee": 5.0, "hourly_rate": 3.00},
        "truck": {"base_fee": 10.0, "hourly_rate": 6.00},
        "bus": {"base_fee": 12.0, "hourly_rate": 8.00}
    }

    @classmethod
    def calculate_fee(cls, vehicle_type: str, duration_hours: float) -> dict:
        if not vehicle_type or not str(vehicle_type).strip():
            raise ValueError("Vehicle type cannot be empty.")
        v_type = str(vehicle_type).strip().lower()
        if v_type not in cls.RATES:
            raise ValueError(f"Unsupported vehicle type '{vehicle_type}'. Supported: {list(cls.RATES.keys())}")
        if duration_hours < 0:
            raise ValueError("Parking duration cannot be negative.")
        if duration_hours > 720:  # Max 30 days
            raise ValueError("Parking duration exceeds maximum limit of 720 hours.")

        rate = cls.RATES[v_type]
        # Any fraction of an hour is billed as a full hour
        billable_hours = math.ceil(duration_hours) if duration_hours > 0 else 0
        total_fee = rate["base_fee"] + (billable_hours * rate["hourly_rate"])

        return {
            "vehicle_type": v_type,
            "duration_hours": duration_hours,
            "billable_hours": billable_hours,
            "base_fee": rate["base_fee"],
            "hourly_rate": rate["hourly_rate"],
            "total_fee": round(total_fee, 2)
        }
