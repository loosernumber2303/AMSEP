from pydantic import BaseModel, ConfigDict, computed_field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ProjectFileBase(BaseModel):
    path: str
    content: str
    is_test: bool = False

class ProjectFileCreate(ProjectFileBase):
    pass

class ProjectFileResponse(ProjectFileBase):
    id: int
    session_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TestResultBase(BaseModel):
    attempt: int
    passed: bool
    total_tests: int
    passed_tests: int
    failed_tests: int
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    json_report: Optional[str] = None

class TestResultCreate(TestResultBase):
    pass

class TestResultResponse(TestResultBase):
    id: int
    session_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExecutionLogBase(BaseModel):
    log_text: str

class ExecutionLogCreate(ExecutionLogBase):
    pass

class ExecutionLogResponse(ExecutionLogBase):
    id: int
    session_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CorrectionHistoryBase(BaseModel):
    attempt: int
    test_summary: str
    failure_details: str
    diagnosis: str
    recommended_fix: str
    corrected_code: str
    passed_after_fix: bool = False

class CorrectionHistoryCreate(CorrectionHistoryBase):
    pass

class CorrectionHistoryResponse(CorrectionHistoryBase):
    id: int
    session_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionBase(BaseModel):
    requirement: str
    max_attempts: int = 3

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    id: int
    status: str
    current_attempt: int
    plan_json: Optional[str] = None
    session_type: Optional[str] = "NEW_PROJECT"
    analysis_report_json: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SessionDetailResponse(SessionResponse):
    files: List[ProjectFileResponse] = []
    test_results: List[TestResultResponse] = []
    logs: List[ExecutionLogResponse] = []
    correction_history: List[CorrectionHistoryResponse] = []
    review_report_json: Optional[str] = None
    validation_checklist_json: Optional[str] = None
    audit_trail: Optional[List[Dict[str, Any]]] = []

    model_config = ConfigDict(from_attributes=True)


# PHASE 2: Structured Planner Output Schema
class StructuredPlan(BaseModel):
    project_title: str
    description: str
    functional_requirements: List[str]
    non_functional_requirements: List[str]
    inputs: List[str]
    outputs: List[str]
    modules: List[Dict[str, str]]
    file_structure: List[Dict[str, str]]
    technologies: List[str]
    implementation_steps: List[str]
    edge_cases: List[str]
    testing_requirements: List[str]

    @computed_field
    @property
    def project_description(self) -> str:
        return self.description

    @computed_field
    @property
    def files_to_create(self) -> List[Dict[str, str]]:
        return self.file_structure


# PHASE 3: Structured Diagnosis Schema
class StructuredDiagnosis(BaseModel):
    failure_summary: str
    root_cause: str
    affected_files: List[str]
    affected_functions: List[str]
    recommended_fix: str
    confidence: float


# PHASE 4: Structured Project Analysis Output Schema
class StructuredProjectReport(BaseModel):
    project_summary: str
    technology_stack: List[str]
    
    architecture: Dict[str, Any] = {
        "description": "",
        "components": [],
        "concerns": []
    }
    
    code_quality: Dict[str, Any] = {
        "strengths": [],
        "issues": []
    }
    
    security: Dict[str, Any] = {
        "detected_issues": [],
        "recommendations": []
    }
    
    performance: Dict[str, Any] = {
        "issues": [],
        "recommendations": []
    }
    
    testing: Dict[str, Any] = {
        "existing_tests": [],
        "missing_coverage": [],
        "recommendations": []
    }
    
    maintainability: Dict[str, Any] = {
        "issues": [],
        "recommendations": []
    }
    
    improvements: List[Dict[str, str]] = []
    
    health_scores: Dict[str, int] = {
        "overall": 80,
        "architecture": 80,
        "code_quality": 80,
        "testing": 80,
        "security": 80,
        "maintainability": 80
    }


# PHASE 2A: Developer Workspace & Control Schemas
class PlanUpdateRequest(BaseModel):
    plan_json: str

class FileUpdateRequest(BaseModel):
    content: str

class DeveloperFeedbackRequest(BaseModel):
    feedback: str

class AppExecutionResponse(BaseModel):
    status: str
    message: Optional[str] = None
    entrypoint: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: Optional[int] = None
    sandbox_available: bool = True

class TestExecutionResponse(BaseModel):
    status: str
    message: Optional[str] = None
    passed: bool = False
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    sandbox_available: bool = True


# PHASE 2B: Human-in-the-Loop Lifecycle Schemas
class ChangeRequest(BaseModel):
    feedback: str
    stage: Optional[str] = "REVIEW"

class ValidationCompleteRequest(BaseModel):
    checklist: Dict[str, bool]
    notes: Optional[str] = ""

class FinalApprovalRequest(BaseModel):
    notes: Optional[str] = ""

class StructuredReviewReport(BaseModel):
    overall_status: str  # "PASSED" | "PASSED_WITH_WARNINGS" | "NEEDS_IMPROVEMENT"
    summary: str
    issues: List[str] = []
    warnings: List[str] = []
    test_summary: Dict[str, int] = {"passed": 0, "failed": 0, "total": 0}
    files_reviewed: List[str] = []
    recommendations: List[str] = []

class CorrectionProposalResponse(BaseModel):
    failure_summary: str
    affected_file: str
    explanation: str
    proposed_code: str
    test_failure: str
    attempt: int = 1

class AcceptCorrectionRequest(BaseModel):
    file_path: str
    corrected_content: str

class AuditTrailItem(BaseModel):
    actor: str
    stage: str
    action: str
    details: str
    timestamp: Optional[str] = None


