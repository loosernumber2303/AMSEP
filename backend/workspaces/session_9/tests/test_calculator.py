import pytest
from core.calculator import TemperatureConverter

def test_convert_freezing_and_boiling():
    res_0 = TemperatureConverter.convert_celsius(0)
    assert res_0["fahrenheit"] == 32.0
    assert res_0["kelvin"] == 273.15

    res_100 = TemperatureConverter.convert_celsius(100)
    assert res_100["fahrenheit"] == 212.0
    assert res_100["kelvin"] == 373.15

def test_convert_absolute_zero():
    res_az = TemperatureConverter.convert_celsius(-273.15)
    assert res_az["fahrenheit"] == -459.67
    assert res_az["kelvin"] == 0.0

def test_convert_below_absolute_zero():
    with pytest.raises(ValueError):
        TemperatureConverter.convert_celsius(-300)
