import sys
import os
import json
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

TEST_CASES = [
    {
        "name": "Student Attendance Management",
        "req": "Build a student attendance management application where I can add students, mark daily attendance, calculate attendance percentage, and display students below 75% attendance.",
        "forbidden_files": ["core/calculator.py", "tests/test_calculator.py"],
        "expected_module": "student_attendance"
    },
    {
        "name": "Library Management",
        "req": "Create a library management system where I can add books, borrow books, return books, and search books by title.",
        "forbidden_files": ["core/calculator.py", "tests/test_calculator.py"],
        "expected_module": "library"
    },
    {
        "name": "Unit Conversion Tool",
        "req": "Develop a unit conversion tool supporting length, weight, and temperature conversions with validation for negative values.",
        "forbidden_files": ["core/calculator.py", "tests/test_calculator.py"],
        "expected_module": "unit_conversion"
    },
    {
        "name": "Personal Habit Tracker",
        "req": "Build a personal habit tracker where I can create habits, mark daily completion, and track current and longest streaks.",
        "forbidden_files": ["core/calculator.py", "tests/test_calculator.py"],
        "expected_module": "habit"
    },
    {
        "name": "Parking Fee Calculator",
        "req": "Develop a parking fee calculator where fees are calculated based on vehicle type and hours parked with validation for edge cases.",
        "forbidden_files": ["core/calculator.py", "tests/test_calculator.py"],
        "expected_module": "parking_fee"
    }
]

def run_tests():
    print("=" * 70)
    print("STARTING AMASEP GENERALIZATION TEST SUITE (5 NEW REQUIREMENTS)")
    print("=" * 70)
    
    results = []

    for tc in TEST_CASES:
        print(f"\n--- Testing Requirement: {tc['name']} ---")
        print(f"Requirement text: {tc['req']}")

        # 1. Create Session
        resp = client.post("/api/sessions", json={"requirement": tc["req"]})
        assert resp.status_code == 201, f"Create failed: {resp.text}"
        session_id = resp.json()["id"]
        print(f"  [1] Session created with ID: {session_id}")

        # Poll until plan is ready (PLAN_REVIEW)
        plan_ready = False
        for _ in range(20):
            time.sleep(1)
            resp = client.get(f"/api/sessions/{session_id}")
            data = resp.json()
            if data["status"] == "PLAN_REVIEW":
                plan_ready = True
                break
        assert plan_ready, f"Plan review not reached. Status: {data.get('status')}"
        
        plan = json.loads(data["plan_json"])
        print(f"  [2] Plan generated: Title='{plan.get('project_title')}'")
        assert "calculator" not in plan.get("project_title", "").lower() or "parking" in plan.get("project_title", "").lower(), "Plan inappropriately titled Calculator"

        # 2. Approve Plan -> CODING -> DEVELOPER_WORKSPACE
        resp = client.post(f"/api/sessions/{session_id}/approve_plan")
        assert resp.status_code == 200, f"Approve plan failed: {resp.text}"

        workspace_ready = False
        for _ in range(20):
            time.sleep(1)
            resp = client.get(f"/api/sessions/{session_id}")
            data = resp.json()
            if data["status"] == "DEVELOPER_WORKSPACE":
                workspace_ready = True
                break
        assert workspace_ready, f"Developer workspace not reached. Status: {data.get('status')}"
        
        files = data.get("files", [])
        file_paths = [f["path"] for f in files]
        print(f"  [3] Files generated: {file_paths}")

        for forbidden in tc["forbidden_files"]:
            assert forbidden not in file_paths, f"Forbidden legacy file found: {forbidden}"
        assert any(tc["expected_module"] in p for p in file_paths), f"Expected module keyword '{tc['expected_module']}' not in files: {file_paths}"

        # 3. Run Application in Docker Sandbox
        print("  [4] Running Application inside Docker sandbox...")
        resp_app = client.post(f"/api/sessions/{session_id}/run_app")
        assert resp_app.status_code == 200, f"Run app failed: {resp_app.text}"
        app_res = resp_app.json()
        print(f"      App exit code: {app_res.get('exit_code')}, entrypoint: {app_res.get('entrypoint')}")

        # 4. Run Tests in Docker Sandbox
        print("  [5] Running PyTest inside Docker sandbox...")
        resp_test = client.post(f"/api/sessions/{session_id}/run_session_tests")
        assert resp_test.status_code == 200, f"Run tests failed: {resp_test.text}"
        test_res = resp_test.json()
        print(f"      Passed: {test_res.get('passed_tests')}/{test_res.get('total_tests')} assertions (Passed: {test_res.get('passed')})")
        assert test_res.get("passed") is True, f"Docker tests failed: {test_res}"
        assert test_res.get("total_tests", 0) > 0, "No tests collected"

        # 5. Proceed to Review
        print("  [6] Proceeding to AI Review...")
        resp = client.post(f"/api/sessions/{session_id}/proceed_to_review")
        assert resp.status_code == 200, f"Proceed to review failed: {resp.text}"

        review_ready = False
        for _ in range(20):
            time.sleep(1)
            resp = client.get(f"/api/sessions/{session_id}")
            data = resp.json()
            if data["status"] in ("REVIEW_READY", "WAITING_FOR_APPROVAL"):
                review_ready = True
                break
        assert review_ready, f"Review ready not reached. Status: {data.get('status')}"
        print(f"      Review status: {data.get('status')}")

        # 6. Approve Review -> MANUAL_VALIDATION
        print("  [7] Approving AI Review -> Manual Validation...")
        resp = client.post(f"/api/sessions/{session_id}/approve_review")
        assert resp.status_code == 200
        assert resp.json()["status"] == "MANUAL_VALIDATION"

        # 7. Complete Validation -> FINAL_APPROVAL
        print("  [8] Completing Manual Validation -> Final Approval...")
        resp = client.post(f"/api/sessions/{session_id}/complete_validation", json={
            "checklist": {
                "input_validation_confirmed": True,
                "domain_operations_verified": True,
                "docker_execution_passed": True
            },
            "notes": "All checks verified successfully."
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "FINAL_APPROVAL"

        # 8. Final Developer Release Approval -> COMPLETED
        print("  [9] Final Developer Approval & Release...")
        resp = client.post(f"/api/sessions/{session_id}/final_approval", json={"notes": "Release approved."})
        assert resp.status_code == 200, f"Release approve failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "COMPLETED", f"Status should be COMPLETED, got {data.get('status')}"
        print(f"      Final status: {data.get('status')}")

        results.append({
            "name": tc["name"],
            "session_id": session_id,
            "title": plan.get("project_title"),
            "files": file_paths,
            "tests_passed": f"{test_res.get('passed_tests')}/{test_res.get('total_tests')}",
            "status": data["status"]
        })

    print("\n" + "=" * 70)
    print("ALL 5 GENERALIZATION REQUIREMENTS PASSED SUCCESSFULLY!")
    print("=" * 70)
    for r in results:
        print(f"- {r['name']} (ID {r['session_id']}): {r['title']} | Files: {r['files']} | Tests: {r['tests_passed']} | Status: {r['status']}")

if __name__ == "__main__":
    run_tests()
