from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    requirement = Column(Text, nullable=False)
    status = Column(String, default="RECEIVED")  # RECEIVED, PLANNING, PLAN_READY, CODING, CODE_READY, TEST_GENERATION, TESTING, TEST_RESULTS_READY, ANALYSIS, COMPLETED, FAILED
    current_attempt = Column(Integer, default=1)
    max_attempts = Column(Integer, default=3)
    plan_json = Column(Text, nullable=True)  # Structured JSON implementation plan
    session_type = Column(String, default="NEW_PROJECT")  # NEW_PROJECT, ANALYZE_PROJECT
    analysis_report_json = Column(Text, nullable=True)  # Structured JSON analysis report
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    files = relationship("ProjectFile", back_populates="session", cascade="all, delete-orphan")
    test_results = relationship("TestResult", back_populates="session", cascade="all, delete-orphan")
    logs = relationship("ExecutionLog", back_populates="session", cascade="all, delete-orphan")
    correction_history = relationship("CorrectionHistory", back_populates="session", cascade="all, delete-orphan")

    @property
    def review_report_json(self) -> str | None:
        """Extracts the latest structured AI review report JSON from logs if available."""
        if not self.logs:
            return None
        for log in reversed(self.logs):
            if "[AI REVIEW REPORT]" in log.log_text:
                return log.log_text.split("[AI REVIEW REPORT]", 1)[1].strip()
        return None

    @property
    def validation_checklist_json(self) -> str | None:
        """Extracts the latest manual validation checklist JSON from logs if available."""
        if not self.logs:
            return None
        for log in reversed(self.logs):
            if "[MANUAL VALIDATION]" in log.log_text:
                return log.log_text.split("[MANUAL VALIDATION]", 1)[1].strip()
        return None

    @property
    def audit_trail(self) -> list[dict]:
        """Extracts human vs AI collaborative action events from execution logs."""
        events = []
        if not self.logs:
            return events

        for log in self.logs:
            text = log.log_text
            created = log.created_at.isoformat() if log.created_at else None

            if "[DEVELOPER PLAN EDIT]" in text:
                events.append({"actor": "DEVELOPER", "stage": "PLAN", "action": "Plan Modified", "details": text, "timestamp": created})
            elif "[PLAN APPROVED]" in text:
                events.append({"actor": "DEVELOPER", "stage": "PLAN", "action": "Plan Approved", "details": text, "timestamp": created})
            elif "[DEVELOPER EDIT]" in text:
                events.append({"actor": "DEVELOPER", "stage": "CODE", "action": "Code Edited", "details": text, "timestamp": created})
            elif "[DEVELOPER FEEDBACK]" in text:
                events.append({"actor": "DEVELOPER", "stage": "WORKSPACE", "action": "Feedback Submitted", "details": text, "timestamp": created})
            elif "[PROCEED TO REVIEW]" in text:
                events.append({"actor": "DEVELOPER", "stage": "WORKSPACE", "action": "Submitted to Review", "details": text, "timestamp": created})
            elif "[DEVELOPER REVIEW APPROVAL]" in text:
                events.append({"actor": "DEVELOPER", "stage": "REVIEW", "action": "Review Approved", "details": text, "timestamp": created})
            elif "[CHANGE REQUESTED]" in text:
                events.append({"actor": "DEVELOPER", "stage": "HUMAN_CONTROL", "action": "Change Requested", "details": text, "timestamp": created})
            elif "[RETURN TO WORKSPACE]" in text:
                events.append({"actor": "DEVELOPER", "stage": "HUMAN_CONTROL", "action": "Returned to Workspace", "details": text, "timestamp": created})
            elif "[MANUAL VALIDATION]" in text:
                events.append({"actor": "DEVELOPER", "stage": "VALIDATION", "action": "Validation Completed", "details": text, "timestamp": created})
            elif "[FINAL APPROVAL COMPLETED]" in text:
                events.append({"actor": "DEVELOPER", "stage": "APPROVAL", "action": "Final Approval Granted", "details": text, "timestamp": created})
            elif "[AI CORRECTION ACCEPTED]" in text:
                events.append({"actor": "DEVELOPER", "stage": "WORKSPACE", "action": "AI Correction Accepted", "details": text, "timestamp": created})
            elif "[AI CORRECTION REJECTED]" in text:
                events.append({"actor": "DEVELOPER", "stage": "WORKSPACE", "action": "AI Correction Rejected", "details": text, "timestamp": created})
            elif "[PLANNING STARTED]" in text or "[PLAN GENERATED]" in text:
                events.append({"actor": "AI", "stage": "PLAN", "action": "Plan Generated", "details": text, "timestamp": created})
            elif "[CODING STARTED]" in text or "[CODE GENERATED]" in text:
                events.append({"actor": "AI", "stage": "CODE", "action": "Code Generated", "details": text, "timestamp": created})
            elif "[SANDBOX EXECUTION COMPLETED]" in text:
                events.append({"actor": "SANDBOX", "stage": "WORKSPACE", "action": "App Execution in Docker", "details": text, "timestamp": created})
            elif "[SANDBOX TESTING COMPLETED]" in text:
                events.append({"actor": "SANDBOX", "stage": "TEST", "action": "PyTest Run in Docker", "details": text, "timestamp": created})
            elif "[DIAGNOSIS RESULT]" in text or "[AI CORRECTION PROPOSED]" in text:
                events.append({"actor": "AI", "stage": "TEST", "action": "Correction Diagnosis & Proposal", "details": text, "timestamp": created})
            elif "[AI REVIEW REPORT]" in text:
                events.append({"actor": "AI", "stage": "REVIEW", "action": "AI Review Report Generated", "details": text, "timestamp": created})

        return events


class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    path = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_test = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="files")


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    attempt = Column(Integer, default=1)
    passed = Column(Boolean, default=False)
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    failed_tests = Column(Integer, default=0)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    json_report = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="test_results")


class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    log_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="logs")


class CorrectionHistory(Base):
    __tablename__ = "correction_history"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    attempt = Column(Integer, nullable=False)
    test_summary = Column(String, nullable=False)      # e.g., "3 passed, 1 failed"
    failure_details = Column(Text, nullable=False)   # e.g., "ZeroDivisionError in core/calculator.py"
    diagnosis = Column(Text, nullable=False)         # JSON format diagnosis
    recommended_fix = Column(Text, nullable=False)
    corrected_code = Column(Text, nullable=False)    # Brief details or new file diffs
    passed_after_fix = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="correction_history")
