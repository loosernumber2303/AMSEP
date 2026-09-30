"""
Personal Habit Tracker
Habit tracking suite recording daily completions, continuous streaks, and consistency metrics.
"""

class PersonalHabitTracker:
    def __init__(self):
        self.habits = {}

    def add_habit(self, name: str) -> dict:
        if not name or not str(name).strip():
            raise ValueError("Habit name cannot be empty.")
        h_name = str(name).strip()
        if h_name in self.habits:
            raise ValueError(f"Habit '{h_name}' already exists.")

        habit = {
            "name": h_name,
            "completion_days": set(),
            "streak": 0
        }
        self.habits[h_name] = habit
        return {"name": h_name, "total_completions": 0, "streak": 0}

    def mark_completed(self, habit_name: str, day_number: int) -> dict:
        h_name = str(habit_name).strip()
        if h_name not in self.habits:
            raise ValueError(f"Habit '{h_name}' not found.")
        if day_number < 1:
            raise ValueError("Day number must be a positive integer (>= 1).")

        self.habits[h_name]["completion_days"].add(int(day_number))
        streak = self._compute_streak(self.habits[h_name]["completion_days"])
        self.habits[h_name]["streak"] = streak

        return {
            "name": h_name,
            "day": day_number,
            "streak": streak,
            "total_completions": len(self.habits[h_name]["completion_days"])
        }

    def get_streak(self, habit_name: str) -> int:
        h_name = str(habit_name).strip()
        if h_name not in self.habits:
            raise ValueError(f"Habit '{h_name}' not found.")
        return self.habits[h_name]["streak"]

    def _compute_streak(self, days_set: set) -> int:
        if not days_set:
            return 0
        sorted_days = sorted(days_set)
        max_streak = 1
        current = 1
        for i in range(1, len(sorted_days)):
            if sorted_days[i] == sorted_days[i-1] + 1:
                current += 1
                max_streak = max(max_streak, current)
            elif sorted_days[i] > sorted_days[i-1] + 1:
                current = 1
        return max_streak
