import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
from core.write_program import WriteProgramApp

def test_record_item_and_summary():
    app = WriteProgramApp()
    app.record_item("ITM01", "Primary Resource", 50.0, "resource")
    app.record_item("ITM02", "Secondary Resource", 150.0, "resource")

    metrics = app.get_summary_metrics()
    assert metrics["total_items"] == 2
    assert metrics["total_value"] == 200.0
    assert metrics["average_value"] == 100.0
    assert "resource" in metrics["categories"]

def test_filter_by_category():
    app = WriteProgramApp()
    app.record_item("A1", "Item A", 10.0, "tools")
    app.record_item("B1", "Item B", 20.0, "equipment")

    tools = app.filter_by_category("tools")
    assert len(tools) == 1
    assert tools[0]["id"] == "A1"

def test_validation_errors():
    app = WriteProgramApp()
    with pytest.raises(ValueError):
        app.record_item("", "Label", 10.0)
    with pytest.raises(ValueError):
        app.record_item("VALID", "", 10.0)
    with pytest.raises(ValueError):
        app.record_item("VALID", "Label", -10.0)
    with pytest.raises(ValueError):
        app.filter_by_category("")
