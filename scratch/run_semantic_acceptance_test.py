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
        "id": "A",
        "name": "Selection Sort",
        "req": "Build a selection sort application",
        "expected_code_elements": ["def sort", "min_idx", "result[min_idx]"],
        "forbidden_code_elements": ["record_item", "get_summary_metrics", "filter_by_category"]
    },
    {
        "id": "B",
        "name": "Anagram Checker",
        "req": "Build an anagram checker application",
        "expected_code_elements": ["def is_anagram", "clean1", "sorted"],
        "forbidden_code_elements": ["record_item", "get_summary_metrics", "filter_by_category"]
    },
    {
        "id": "C",
        "name": "Student Attendance",
        "req": "Build a student attendance application",
        "expected_code_elements": ["add_student", "mark_attendance", "calculate_attendance_percentage"],
        "forbidden_code_elements": ["record_item", "get_summary_metrics", "filter_by_category"]
    },
    {
        "id": "D",
        "name": "Library Management",
        "req": "Build a library management application",
        "expected_code_elements": ["add_book", "search_books", "issue_book", "return_book"],
        "forbidden_code_elements": ["record_item", "get_summary_metrics", "filter_by_category"]
    },
    {
        "id": "E",
        "name": "Habit Tracker",
        "req": "Build a habit tracker",
        "expected_code_elements": ["add_habit", "mark_completed", "get_streak"],
        "forbidden_code_elements": ["record_item", "get_summary_metrics", "filter_by_category"]
    }
]

def run_acceptance():
    print("=" * 80)
    print("RUNNING AMASEP SEMANTIC ACCEPTANCE SUITE (5 DIVERSE REQUIREMENTS)")
    print("=" * 80)

    summary_records = []

    for tc in TEST_CASES:
        print(f"\n======================================================================")
        print(f"TEST {tc['id']}: {tc['name']}")
        print(f"Requirement: \"{tc['req']}\"")
        print("======================================================================")

        # 1. Create Session
        resp = client.post("/api/sessions", json={"requirement": tc["req"]})
        assert resp.status_code == 201, f"Create failed: {resp.text}"
        session_id = resp.json()["id"]

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
        print(f"\n[1] PLANNER OUTPUT:")
        print(f"    Project Title: {plan.get('project_title')}")
        print(f"    Functional Requirements:")
        for fr in plan.get("functional_requirements", []):
            print(f"      - {fr}")
        print(f"    Testing Requirements:")
        for tr in plan.get("testing_requirements", []):
            print(f"      - {tr}")

        # 2. Approve Plan -> DEVELOPER_WORKSPACE
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
        assert workspace_ready, f"Workspace not reached. Status: {data.get('status')}"
        
        files = data.get("files", [])
        source_file = next((f for f in files if not f["is_test"]), None)
        test_file = next((f for f in files if f["is_test"]), None)

        print(f"\n[2] GENERATED CODE ({source_file['path']}):")
        source_content = source_file["content"]
        for line in source_content.splitlines():
            if line.strip().startswith("class ") or line.strip().startswith("def "):
                print(f"    {line}")

        # Verify no generic CRUD template elements
        for forb in tc["forbidden_code_elements"]:
            assert forb not in source_content, f"FORBIDDEN generic template element '{forb}' found in {source_file['path']}!"

        # Verify expected domain/algorithm elements
        for exp in tc["expected_code_elements"]:
            assert exp in source_content, f"EXPECTED element '{exp}' NOT found in {source_file['path']}!"

        print(f"\n[3] GENERATED TESTS ({test_file['path']}):")
        test_content = test_file["content"]
        for line in test_content.splitlines():
            if line.strip().startswith("def test_"):
                print(f"    {line}")

        # 3. Run PyTest in Docker Sandbox
        print(f"\n[4] DOCKER SANDBOX TEST RUN:")
        resp_test = client.post(f"/api/sessions/{session_id}/run_session_tests")
        assert resp_test.status_code == 200
        test_res = resp_test.json()
        print(f"    Passed: {test_res.get('passed_tests')}/{test_res.get('total_tests')} assertions (Passed: {test_res.get('passed')})")
        assert test_res.get("passed") is True, f"Docker tests failed: {test_res}"

        # 4. Proceed to Review & Check Requirement Coverage
        print(f"\n[5] AI REVIEW & REQUIREMENT COVERAGE CHECK:")
        resp_rev = client.post(f"/api/sessions/{session_id}/proceed_to_review")
        assert resp_rev.status_code == 200

        review_ready = False
        for _ in range(20):
            time.sleep(1)
            resp = client.get(f"/api/sessions/{session_id}")
            data = resp.json()
            if data["status"] in ("REVIEW_READY", "WAITING_FOR_APPROVAL"):
                review_ready = True
                break
        assert review_ready

        # Check review report stored in audit trail / execution logs
        report_log = next((l["log_text"] for l in reversed(data.get("logs", [])) if "[AI REVIEW REPORT]" in l["log_text"]), None)
        assert report_log, "AI Review Report not found in logs!"
        report_data = json.loads(report_log.replace("[AI REVIEW REPORT] ", ""))
        print(f"    Overall Status: {report_data.get('overall_status')}")
        print(f"    Summary: {report_data.get('summary')}")
        print(f"    Issues: {report_data.get('issues')}")
        assert report_data.get("overall_status") == "PASSED", f"Review did not pass: {report_data}"

        # 5. Full Phase 2B Human-in-the-Loop Release
        client.post(f"/api/sessions/{session_id}/approve_review")
        client.post(f"/api/sessions/{session_id}/complete_validation", json={
            "checklist": {"logic_verified": True, "tests_passed": True, "sandbox_confirmed": True},
            "notes": "Verified semantic requirements."
        })
        resp_final = client.post(f"/api/sessions/{session_id}/final_approval", json={"notes": "Final release approved."})
        assert resp_final.json()["status"] == "COMPLETED"
        print(f"    Final Human Release Status: {resp_final.json()['status']}")

        summary_records.append({
            "id": tc["id"],
            "name": tc["name"],
            "req": tc["req"],
            "title": plan.get("project_title"),
            "file": source_file["path"],
            "test_summary": f"{test_res.get('passed_tests')}/{test_res.get('total_tests')} assertions",
            "review_status": report_data.get("overall_status"),
            "final_status": resp_final.json()["status"]
        })

    print("\n" + "=" * 80)
    print("ALL 5 SEMANTIC ACCEPTANCE TESTS PASSED WITH 100% COVERAGE & NO GENERIC TEMPLATES!")
    print("=" * 80)
    for r in summary_records:
        print(f"[{r['id']}] {r['name']}: {r['title']} | File: {r['file']} | Tests: {r['test_summary']} | Review: {r['review_status']} | Final: {r['final_status']}")

if __name__ == "__main__":
    run_acceptance()
