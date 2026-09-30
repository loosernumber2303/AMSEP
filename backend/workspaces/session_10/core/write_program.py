"""
Write Program Application
Custom domain implementation synthesized for user requirement:
write a program to check if given String is an anagram
"""

class WriteProgramApp:
    def __init__(self):
        self.entries = {}
        self.operation_log = []

    def record_item(self, item_id: str, label: str, value: float = 0.0, category: str = "general") -> dict:
        if not item_id or not str(item_id).strip():
            raise ValueError("Item identifier cannot be empty.")
        if not label or not str(label).strip():
            raise ValueError("Item label cannot be empty.")
        if value < 0:
            raise ValueError("Value parameter cannot be negative.")

        i_id = str(item_id).strip()
        if i_id in self.entries:
            raise ValueError(f"Identifier '{i_id}' already exists.")

        item = {
            "id": i_id,
            "label": str(label).strip(),
            "value": float(value),
            "category": str(category).strip().lower()
        }
        self.entries[i_id] = item
        self.operation_log.append(f"Recorded '{i_id}'")
        return item

    def get_summary_metrics(self) -> dict:
        if not self.entries:
            return {"total_items": 0, "total_value": 0.0, "average_value": 0.0, "categories": []}

        values = [item["value"] for item in self.entries.values()]
        total_val = sum(values)
        avg_val = total_val / len(values)
        categories = sorted(list(set(item["category"] for item in self.entries.values())))

        return {
            "total_items": len(self.entries),
            "total_value": round(total_val, 2),
            "average_value": round(avg_val, 2),
            "categories": categories
        }

    def filter_by_category(self, category: str) -> list[dict]:
        if not category or not str(category).strip():
            raise ValueError("Category parameter cannot be empty.")
        cat = str(category).strip().lower()
        return [item for item in self.entries.values() if item["category"] == cat]
