import pytest
from core.calculator import NumberUtility

def test_calculate_stats_basic():
    stats = NumberUtility.calculate_stats([1, 2, 3, 4, 5])
    assert stats["max"] == 5
    assert stats["min"] == 1
    assert stats["average"] == 3.0
    assert stats["even_count"] == 2

def test_calculate_stats_negatives():
    stats = NumberUtility.calculate_stats([-10, -2, -5, -4])
    assert stats["max"] == -2
    assert stats["min"] == -10
    assert stats["average"] == -5.25
    assert stats["even_count"] == 3

def test_empty_list():
    with pytest.raises(ValueError):
        NumberUtility.calculate_stats([])
