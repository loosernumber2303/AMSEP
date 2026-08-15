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

def test_get_session():
    res_create = client.post("/api/sessions", json={"requirement": "Find primes"})
    sess_id = res_create.json()["id"]
    
    response = client.get(f"/api/sessions/{sess_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sess_id
    assert data["requirement"] == "Find primes"
    
    # 404 test
    res_404 = client.get("/api/sessions/99999")
    assert res_404.status_code == 404
