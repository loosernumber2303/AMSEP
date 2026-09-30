from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session as DbSession
from typing import List, Optional
import os
import shutil
import json

from .config import settings
from .database import engine, Base, get_db
from .models import Session as DbSessionModel, ProjectFile as DbProjectFile
from .schemas import (
    SessionCreate,
    SessionResponse,
    SessionDetailResponse,
    PlanUpdateRequest,
    FileUpdateRequest,
    DeveloperFeedbackRequest,
    AppExecutionResponse,
    TestExecutionResponse,
    ProjectFileResponse,
    ChangeRequest,
    ValidationCompleteRequest,
    FinalApprovalRequest,
    CorrectionProposalResponse,
    AcceptCorrectionRequest
)
from .orchestrator import Orchestrator
from .analyzer import ProjectAnalyzer

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
        session_type="NEW_PROJECT",
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

@app.post("/api/sessions/analyze", response_model=SessionDetailResponse, status_code=status.HTTP_201_CREATED)
async def analyze_project(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    git_url: Optional[str] = Form(None),
    db: DbSession = Depends(get_db)
):
    # Create new database session record
    requirement_name = f"Analyze project: {file.filename}"
    if git_url:
        requirement_name = f"Analyze project from Git: {git_url}"
        
    db_session = DbSessionModel(
        requirement=requirement_name,
        status="RECEIVED",
        session_type="ANALYZE_PROJECT",
        current_attempt=1,
        max_attempts=3
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    # Setup workspaces dir
    workspaces_dir = os.path.abspath("workspaces")
    os.makedirs(workspaces_dir, exist_ok=True)
    temp_zip_path = os.path.join(workspaces_dir, f"temp_{db_session.id}.zip")

    # Write file content to disk
    with open(temp_zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Trigger analyzer background task
    analyzer = ProjectAnalyzer(db)
    background_tasks.add_task(analyzer.analyze, db_session.id, temp_zip_path)

    return db_session

@app.post("/api/sessions/{session_id}/run_tests")
async def run_project_tests(
    session_id: int,
    db: DbSession = Depends(get_db)
):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )
    
    analyzer = ProjectAnalyzer(db)
    results = await analyzer.execute_tests(db_session.id)
    return results

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

@app.put("/api/sessions/{session_id}/plan", response_model=SessionDetailResponse)
def update_plan(
    session_id: int,
    payload: PlanUpdateRequest,
    db: DbSession = Depends(get_db)
):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )
    db_session.plan_json = payload.plan_json
    orchestrator = Orchestrator(db)
    orchestrator.log_and_record(db_session, "[DEVELOPER PLAN EDIT] Plan was reviewed and modified by developer.")
    db.commit()
    db.refresh(db_session)
    return db_session

@app.post("/api/sessions/{session_id}/approve_plan", response_model=SessionDetailResponse)
async def approve_plan(
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
    
    db_session.status = "PLAN_APPROVED"
    db.commit()
    db.refresh(db_session)
    
    orchestrator = Orchestrator(db)
    orchestrator.log_and_record(db_session, "[PLAN APPROVED] Developer approved implementation plan. Launching code generation...")
    background_tasks.add_task(orchestrator.code_phase, db_session.id)
    return db_session

@app.put("/api/sessions/{session_id}/files/{file_id}", response_model=ProjectFileResponse)
def update_file(
    session_id: int,
    file_id: int,
    payload: FileUpdateRequest,
    db: DbSession = Depends(get_db)
):
    db_file = db.query(DbProjectFile).filter(
        DbProjectFile.id == file_id,
        DbProjectFile.session_id == session_id
    ).first()
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID {file_id} not found in session {session_id}."
        )
    
    db_file.content = payload.content
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    
    orchestrator = Orchestrator(db)
    orchestrator.log_and_record(db_session, f"[DEVELOPER EDIT] Modified {db_file.path}")
    orchestrator.sync_session_files_to_disk(db_session)
    db.commit()
    db.refresh(db_file)
    return db_file

@app.post("/api/sessions/{session_id}/feedback", response_model=SessionDetailResponse)
def submit_feedback(
    session_id: int,
    payload: DeveloperFeedbackRequest,
    db: DbSession = Depends(get_db)
):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )
    
    orchestrator = Orchestrator(db)
    orchestrator.log_and_record(db_session, f"[DEVELOPER FEEDBACK] {payload.feedback}")
    db.commit()
    db.refresh(db_session)
    return db_session

@app.post("/api/sessions/{session_id}/proceed_to_review", response_model=SessionDetailResponse)
def proceed_to_review(
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
    
    orchestrator = Orchestrator(db)
    orchestrator.log_and_record(db_session, "[PROCEED TO REVIEW] Developer requested AI code review.")
    background_tasks.add_task(orchestrator.review_phase, db_session.id)
    return db_session

@app.post("/api/sessions/{session_id}/approve_review", response_model=SessionDetailResponse)
def approve_review(
    session_id: int,
    db: DbSession = Depends(get_db)
):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )

    db_session.status = "MANUAL_VALIDATION"
    orchestrator = Orchestrator(db)
    orchestrator.log_and_record(db_session, "[DEVELOPER REVIEW APPROVAL] Developer approved AI review advisory. Proceeding to Manual Validation.")
    db.commit()
    db.refresh(db_session)
    return db_session

@app.post("/api/sessions/{session_id}/request_changes", response_model=SessionDetailResponse)
def request_changes(
    session_id: int,
    payload: ChangeRequest,
    db: DbSession = Depends(get_db)
):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )

    db_session.status = "DEVELOPER_WORKSPACE"
    orchestrator = Orchestrator(db)
    orchestrator.log_and_record(db_session, f"[CHANGE REQUESTED] Stage: {payload.stage or 'REVIEW'}. Notes: {payload.feedback}")
    db.commit()
    db.refresh(db_session)
    return db_session

@app.post("/api/sessions/{session_id}/return_to_workspace", response_model=SessionDetailResponse)
def return_to_workspace(
    session_id: int,
    db: DbSession = Depends(get_db)
):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )

    db_session.status = "DEVELOPER_WORKSPACE"
    orchestrator = Orchestrator(db)
    orchestrator.log_and_record(db_session, "[RETURN TO WORKSPACE] Returned to developer workspace.")
    db.commit()
    db.refresh(db_session)
    return db_session

@app.post("/api/sessions/{session_id}/complete_validation", response_model=SessionDetailResponse)
def complete_validation(
    session_id: int,
    payload: ValidationCompleteRequest,
    db: DbSession = Depends(get_db)
):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )

    db_session.status = "FINAL_APPROVAL"
    orchestrator = Orchestrator(db)
    val_data = {"checklist": payload.checklist, "notes": payload.notes or ""}
    orchestrator.log_and_record(db_session, f"[MANUAL VALIDATION] {json.dumps(val_data)}")
    db.commit()
    db.refresh(db_session)
    return db_session

@app.post("/api/sessions/{session_id}/final_approval", response_model=SessionDetailResponse)
def final_approval(
    session_id: int,
    payload: FinalApprovalRequest,
    db: DbSession = Depends(get_db)
):
    db_session = db.query(DbSessionModel).filter(DbSessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {session_id} not found."
        )

    # In Phase 2B, this is the SOLE action that transitions a session to COMPLETED
    db_session.status = "COMPLETED"
    orchestrator = Orchestrator(db)
    note_str = f" Notes: {payload.notes}" if payload.notes else ""
    orchestrator.log_and_record(db_session, f"[FINAL APPROVAL COMPLETED] Developer approved and signed off on final release.{note_str}")
    db.commit()
    db.refresh(db_session)
    return db_session

@app.post("/api/sessions/{session_id}/diagnose_failure", response_model=CorrectionProposalResponse)
def diagnose_failure(
    session_id: int,
    db: DbSession = Depends(get_db)
):
    orchestrator = Orchestrator(db)
    return orchestrator.generate_correction_proposal(session_id)

@app.post("/api/sessions/{session_id}/accept_correction")
def accept_correction(
    session_id: int,
    payload: AcceptCorrectionRequest,
    db: DbSession = Depends(get_db)
):
    orchestrator = Orchestrator(db)
    return orchestrator.accept_correction(session_id, payload.file_path, payload.corrected_content)

@app.post("/api/sessions/{session_id}/reject_correction")
def reject_correction(
    session_id: int,
    payload: DeveloperFeedbackRequest,
    db: DbSession = Depends(get_db)
):
    orchestrator = Orchestrator(db)
    return orchestrator.reject_correction(session_id, payload.feedback)

@app.post("/api/sessions/{session_id}/run_app", response_model=AppExecutionResponse)
def run_app(
    session_id: int,
    db: DbSession = Depends(get_db)
):
    orchestrator = Orchestrator(db)
    return orchestrator.run_application(session_id)

@app.post("/api/sessions/{session_id}/run_session_tests", response_model=TestExecutionResponse)
def run_session_tests(
    session_id: int,
    db: DbSession = Depends(get_db)
):
    orchestrator = Orchestrator(db)
    return orchestrator.run_tests_in_workspace(session_id)

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
    
    # Delete old files, test results, logs, and correction history for this session to clean up
    for file in db_session.files:
        db.delete(file)
    for res in db_session.test_results:
        db.delete(res)
    for log in db_session.logs:
        db.delete(log)
    for hist in db_session.correction_history:
        db.delete(hist)
    db.commit()
    db.refresh(db_session)

    # Run orchestrator again depending on session type
    if db_session.session_type == "ANALYZE_PROJECT":
        # Delete extracted files tree
        workspace_dir = os.path.abspath(os.path.join("workspaces", f"session_{db_session.id}"))
        if os.path.exists(workspace_dir):
            shutil.rmtree(workspace_dir)
            
        analyzer = ProjectAnalyzer(db)
        # We would need the zip path. Let's find temp zip
        temp_zip_path = os.path.join(os.path.abspath("workspaces"), f"temp_{db_session.id}.zip")
        background_tasks.add_task(analyzer.analyze, db_session.id, temp_zip_path)
    else:
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
    
    # Clean workspace folder if exists
    workspace_dir = os.path.abspath(os.path.join("workspaces", f"session_{db_session.id}"))
    if os.path.exists(workspace_dir):
        shutil.rmtree(workspace_dir)
    temp_zip_path = os.path.join(os.path.abspath("workspaces"), f"temp_{db_session.id}.zip")
    if os.path.exists(temp_zip_path):
        os.remove(temp_zip_path)

    db.delete(db_session)
    db.commit()
    return None
