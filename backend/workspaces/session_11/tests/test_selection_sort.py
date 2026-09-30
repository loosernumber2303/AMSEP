import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
from core.selection_sort import SelectionSortApp

def test_selection_sort_standard_unsorted():
    unsorted = [64, 25, 12, 22, 11]
    expected = [11, 12, 22, 25, 64]
    assert SelectionSortApp.sort(unsorted) == expected
    assert SelectionSortApp.selection_sort(unsorted) == expected

def test_selection_sort_duplicates_and_negatives():
    arr = [3, -1, 3, 0, -5, 2]
    expected = [-5, -1, 0, 2, 3, 3]
    assert SelectionSortApp.sort(arr) == expected

def test_selection_sort_already_sorted_and_reverse():
    assert SelectionSortApp.sort([1, 2, 3, 4, 5]) == [1, 2, 3, 4, 5]
    assert SelectionSortApp.sort([5, 4, 3, 2, 1]) == [1, 2, 3, 4, 5]

def test_selection_sort_single_and_empty():
    assert SelectionSortApp.sort([]) == []
    assert SelectionSortApp.sort([42]) == [42]

def test_selection_sort_invalid_types():
    with pytest.raises(TypeError):
        SelectionSortApp.sort("not a list")
    with pytest.raises(TypeError):
        SelectionSortApp.sort([1, "two", 3])
    with pytest.raises(TypeError):
        SelectionSortApp.sort(None)
