from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session as DbSession
from typing import List

from .config import settings
from .database import engine, Base, get_db
from .models import Session as DbSessionModel
from .schemas import (
    SessionCreate,
    SessionResponse,
    SessionDetailResponse
)
from .orchestrator import Orchestrator

# Initialize database schemas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AMASEP API",
    description="Backend API for the Autonomous Multi-Agent Software Engineering Platform",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev simplicity, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "AMASEP Backend is running"}

@app.post("/api/sessions", response_model=SessionDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db)
):
    # Create new database session record
    db_session = DbSessionModel(
        requirement=payload.requirement,
        status="RECEIVED",
        current_attempt=1,
        max_attempts=payload.max_attempts
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    # Trigger orchestrator state machine in the background
    orchestrator = Orchestrator(db)
    background_tasks.add_task(orchestrator.run, db_session.id)

    # Return session with details (empty arrays initially)
    return db_session

@app.get("/api/sessions", response_model=List[SessionResponse])
def list_sessions(db: DbSession = Depends(get_db)):
    return db.query(DbSessionModel).order_by(DbSessionModel.created_at.desc()).all()

@app.get("/api/sessions/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: int, db: DbSession = Depends(get_db)):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )
    return db_session

@app.post("/api/sessions/{session_id}/retry", response_model=SessionDetailResponse)
def retry_session(
    session_id: int,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db)
):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )
    
    # Reset stats
    db_session.status = "RECEIVED"
    db_session.current_attempt = 1
    
    # Delete old files, test results, logs for this session to clean up
    for file in db_session.files:
        db.delete(file)
    for res in db_session.test_results:
        db.delete(res)
    for log in db_session.logs:
        db.delete(log)
        
    db.commit()
    db.refresh(db_session)

    # Run orchestrator again
    orchestrator = Orchestrator(db)
    background_tasks.add_task(orchestrator.run, db_session.id)

    return db_session

@app.delete("/api/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, db: DbSession = Depends(get_db)):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )
    db.delete(db_session)
    db.commit()
    return None
