import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
from core.student_attendance_management import StudentAttendanceManagementApp

def test_add_student():
    mgr = StudentAttendanceManagementApp()
    s = mgr.add_student("S101", "Alice Smith")
    assert s["id"] == "S101"
    assert s["name"] == "Alice Smith"
    with pytest.raises(ValueError):
        mgr.add_student("", "Invalid ID")
    with pytest.raises(ValueError):
        mgr.add_student("S101", "Duplicate Alice")

def test_mark_attendance_and_calculate_percentage():
    mgr = StudentAttendanceManagementApp()
    mgr.add_student("S101", "Alice")
    # Mark 3 present, 1 absent = 75%
    mgr.mark_attendance("S101", True)
    mgr.mark_attendance("S101", True)
    mgr.mark_attendance("S101", False)
    mgr.mark_attendance("S101", True)
    assert mgr.calculate_attendance_percentage("S101") == 75.0

def test_students_below_75_percent_threshold():
    mgr = StudentAttendanceManagementApp()
    mgr.add_student("S1", "High Attendance")
    mgr.add_student("S2", "Low Attendance")

    # S1 has 100%
    mgr.mark_attendance("S1", True)
    # S2 has 50%
    mgr.mark_attendance("S2", True)
    mgr.mark_attendance("S2", False)

    low = mgr.get_students_below_threshold(75.0)
    assert len(low) == 1
    assert low[0]["id"] == "S2"
    assert low[0]["attendance_percentage"] == 50.0

def test_boundary_and_error_cases():
    mgr = StudentAttendanceManagementApp()
    with pytest.raises(ValueError):
        mgr.mark_attendance("UNKNOWN", True)
    with pytest.raises(ValueError):
        mgr.calculate_attendance_percentage("UNKNOWN")
    with pytest.raises(ValueError):
        mgr.get_students_below_threshold(-5.0)
