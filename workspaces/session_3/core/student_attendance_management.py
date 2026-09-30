"""
Student Attendance Management Application
Implementation of student attendance management with percentage tracking and threshold alerts.
"""

class StudentAttendanceManagementApp:
    def __init__(self):
        self.students = {}

    def add_student(self, student_id: str, name: str) -> dict:
        if not student_id or not str(student_id).strip():
            raise ValueError("Student ID cannot be empty.")
        if not name or not str(name).strip():
            raise ValueError("Student name cannot be empty.")
        s_id = str(student_id).strip()
        if s_id in self.students:
            raise ValueError(f"Student ID '{s_id}' already exists.")

        record = {
            "id": s_id,
            "name": str(name).strip(),
            "total_days": 0,
            "present_days": 0
        }
        self.students[s_id] = record
        return record

    def mark_attendance(self, student_id: str, present: bool) -> dict:
        s_id = str(student_id).strip()
        if s_id not in self.students:
            raise ValueError(f"Student '{s_id}' not found.")

        self.students[s_id]["total_days"] += 1
        if present:
            self.students[s_id]["present_days"] += 1
        return self.students[s_id]

    def calculate_attendance_percentage(self, student_id: str) -> float:
        s_id = str(student_id).strip()
        if s_id not in self.students:
            raise ValueError(f"Student '{s_id}' not found.")

        record = self.students[s_id]
        if record["total_days"] == 0:
            return 0.0
        pct = (record["present_days"] / record["total_days"]) * 100.0
        return round(pct, 2)

    def get_students_below_threshold(self, threshold: float = 75.0) -> list[dict]:
        if threshold < 0 or threshold > 100:
            raise ValueError("Threshold percentage must be between 0 and 100.")

        low_attendance = []
        for s_id, record in self.students.items():
            pct = self.calculate_attendance_percentage(s_id)
            if pct < threshold:
                low_attendance.append({
                    "id": s_id,
                    "name": record["name"],
                    "attendance_percentage": pct,
                    "present_days": record["present_days"],
                    "total_days": record["total_days"]
                })
        return low_attendance
