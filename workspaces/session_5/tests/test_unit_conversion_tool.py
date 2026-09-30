import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
from core.unit_conversion_tool import UnitConversionToolApp

def test_length_conversions():
    assert UnitConversionToolApp.convert_length(1, "km", "m") == 1000.0
    assert UnitConversionToolApp.convert_length(100, "cm", "m") == 1.0
    assert UnitConversionToolApp.convert_length(1, "foot", "inch") == 12.0
    with pytest.raises(ValueError):
        UnitConversionToolApp.convert_length(-10, "m", "km")
    with pytest.raises(ValueError):
        UnitConversionToolApp.convert_length(5, "miles", "km")

def test_weight_conversions():
    assert UnitConversionToolApp.convert_weight(1000, "g", "kg") == 1.0
    assert UnitConversionToolApp.convert_weight(1, "kg", "g") == 1000.0
    with pytest.raises(ValueError):
        UnitConversionToolApp.convert_weight(-1, "kg", "g")

def test_temperature_conversions():
    assert UnitConversionToolApp.convert_temperature(0, "c", "f") == 32.0
    assert UnitConversionToolApp.convert_temperature(100, "c", "k") == 373.15
    assert UnitConversionToolApp.convert_temperature(212, "f", "c") == 100.0
    with pytest.raises(ValueError):
        UnitConversionToolApp.convert_temperature(-300, "c", "f")
