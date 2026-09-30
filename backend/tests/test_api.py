import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Adjust sys.path to find the backend app module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import Base, get_db

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the database dependency in FastAPI app
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_temp.db"):
        try:
            os.remove("./test_temp.db")
        except Exception:
            pass

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "AMASEP Backend is running"}

def test_create_session():
    payload = {
        "requirement": "Build a simple calculator",
        "max_attempts": 3
    }
    response = client.post("/api/sessions", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["requirement"] == "Build a simple calculator"
    assert data["status"] == "RECEIVED"
    assert data["session_type"] == "NEW_PROJECT"
    assert data["analysis_report_json"] is None
    assert "id" in data

def test_list_sessions():
    # Insert a session
    client.post("/api/sessions", json={"requirement": "Task 1"})
    client.post("/api/sessions", json={"requirement": "Task 2"})
    
    response = client.get("/api/sessions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["requirement"] == "Task 2"  # Newest first
    assert "session_type" in data[0]

def test_get_session():
    res_create = client.post("/api/sessions", json={"requirement": "Find primes"})
    sess_id = res_create.json()["id"]
    
    response = client.get(f"/api/sessions/{sess_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sess_id
    assert data["requirement"] == "Find primes"
    assert data["session_type"] == "NEW_PROJECT"
    
    # 404 test
    res_404 = client.get("/api/sessions/99999")
    assert res_404.status_code == 404

def test_analyze_project_upload():
    import io, zipfile
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("main.py", "print('hello')\n")
    zip_buffer.seek(0)
    
    response = client.post(
        "/api/sessions/analyze",
        files={"file": ("test_project.zip", zip_buffer, "application/zip")},
        data={"git_url": ""}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["session_type"] == "ANALYZE_PROJECT"
    assert "test_project.zip" in data["requirement"]

def test_phase2b_human_lifecycle():
    # 1. Create a session
    res_create = client.post("/api/sessions", json={"requirement": "Build Temperature Converter"})
    sess_id = res_create.json()["id"]

    # 2. Approve Review -> Transitions to MANUAL_VALIDATION
    res_rev = client.post(f"/api/sessions/{sess_id}/approve_review")
    assert res_rev.status_code == 200
    assert res_rev.json()["status"] == "MANUAL_VALIDATION"

    # 3. Complete Validation -> Transitions to FINAL_APPROVAL
    checklist = {
        "requirements_met": True,
        "edge_cases_handled": True,
        "error_handling_verified": True,
        "code_style_clean": True,
        "tests_cover_paths": True,
        "sandbox_execution_verified": True
    }
    res_val = client.post(
        f"/api/sessions/{sess_id}/complete_validation",
        json={"checklist": checklist, "notes": "All checks passed in sandbox"}
    )
    assert res_val.status_code == 200
    assert res_val.json()["status"] == "FINAL_APPROVAL"

    # 4. Final Approval -> Transitions to COMPLETED
    res_appr = client.post(
        f"/api/sessions/{sess_id}/final_approval",
        json={"notes": "Production release approved."}
    )
    assert res_appr.status_code == 200
    assert res_appr.json()["status"] == "COMPLETED"

    # Verify audit trail and session detail
    res_detail = client.get(f"/api/sessions/{sess_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["status"] == "COMPLETED"
    assert "audit_trail" in detail
    assert len(detail["audit_trail"]) >= 3

def test_phase2b_request_changes_and_return_to_workspace():
    res_create = client.post("/api/sessions", json={"requirement": "Build Expense Tracker"})
    sess_id = res_create.json()["id"]

    # Request changes from review
    res_cr = client.post(
        f"/api/sessions/{sess_id}/request_changes",
        json={"feedback": "Need to handle negative currency amounts", "stage": "REVIEW"}
    )
    assert res_cr.status_code == 200
    assert res_cr.json()["status"] == "DEVELOPER_WORKSPACE"

    # Return to workspace
    res_rw = client.post(f"/api/sessions/{sess_id}/return_to_workspace")
    assert res_rw.status_code == 200
    assert res_rw.json()["status"] == "DEVELOPER_WORKSPACE"

def test_phase2b_correction_proposal():
    res_create = client.post("/api/sessions", json={"requirement": "Divide two numbers"})
    sess_id = res_create.json()["id"]

    # Diagnose failure
    res_diag = client.post(f"/api/sessions/{sess_id}/diagnose_failure")
    assert res_diag.status_code == 200
    diag = res_diag.json()
    assert "failure_summary" in diag
    assert "affected_file" in diag
    assert "explanation" in diag

    # Reject correction
    res_rej = client.post(
        f"/api/sessions/{sess_id}/reject_correction",
        json={"feedback": "I prefer to write my own fix."}
    )
    assert res_rej.status_code == 200
    assert res_rej.json()["status"] == "rejected"

