import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
from core.parking_fee_calculator import ParkingFeeCalculator

def test_calculate_fee_standard_car():
    res = ParkingFeeCalculator.calculate_fee("car", 2.0)
    # base 5.0 + (2 * 3.0) = 11.0
    assert res["total_fee"] == 11.0
    assert res["billable_hours"] == 2

def test_fractional_hours_billed_up():
    res = ParkingFeeCalculator.calculate_fee("motorcycle", 1.25)
    # ceil(1.25) = 2 hours: base 2.0 + (2 * 1.50) = 5.0
    assert res["total_fee"] == 5.0
    assert res["billable_hours"] == 2

def test_zero_duration():
    res = ParkingFeeCalculator.calculate_fee("car", 0.0)
    assert res["total_fee"] == 5.0

def test_invalid_parameters():
    with pytest.raises(ValueError):
        ParkingFeeCalculator.calculate_fee("", 2.0)
    with pytest.raises(ValueError):
        ParkingFeeCalculator.calculate_fee("airplane", 2.0)
    with pytest.raises(ValueError):
        ParkingFeeCalculator.calculate_fee("car", -3.0)
    with pytest.raises(ValueError):
        ParkingFeeCalculator.calculate_fee("car", 1000.0)
