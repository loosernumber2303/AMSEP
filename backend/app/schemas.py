from pydantic import BaseModel, ConfigDict
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
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SessionDetailResponse(SessionResponse):
    files: List[ProjectFileResponse] = []
    test_results: List[TestResultResponse] = []
    logs: List[ExecutionLogResponse] = []

    model_config = ConfigDict(from_attributes=True)
