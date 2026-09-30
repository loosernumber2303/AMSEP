import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
from core.personal_habit_tracker import PersonalHabitTracker

def test_add_habit():
    tracker = PersonalHabitTracker()
    h = tracker.add_habit("Morning Jog")
    assert h["name"] == "Morning Jog"
    with pytest.raises(ValueError):
        tracker.add_habit("")
    with pytest.raises(ValueError):
        tracker.add_habit("Morning Jog")

def test_mark_completion_and_streak():
    tracker = PersonalHabitTracker()
    tracker.add_habit("Reading")
    # Consecutive days 1, 2, 3 -> streak 3
    tracker.mark_completed("Reading", 1)
    tracker.mark_completed("Reading", 2)
    tracker.mark_completed("Reading", 3)
    assert tracker.get_streak("Reading") == 3

    # Skipping day 4 and marking day 5 -> max consecutive streak remains 3
    tracker.mark_completed("Reading", 5)
    assert tracker.get_streak("Reading") == 3

def test_invalid_day_and_missing_habit():
    tracker = PersonalHabitTracker()
    tracker.add_habit("Water")
    with pytest.raises(ValueError):
        tracker.mark_completed("Water", 0)
    with pytest.raises(ValueError):
        tracker.mark_completed("Water", -2)
    with pytest.raises(ValueError):
        tracker.get_streak("UNKNOWN_HABIT")
