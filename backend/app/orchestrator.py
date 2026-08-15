import asyncio
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session as DbSession
from .models import Session, ProjectFile, TestResult, ExecutionLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Orchestrator:
    def __init__(self, db: DbSession):
        self.db = db

    async def run(self, session_id: int):
        """
        Orchestrates the lifecycle of a request through mock states.
        Simulates the planning, coding, test generation, running, and analysis phases.
        """
        session = self.db.query(Session).filter(Session.id == session_id).first()
        if not session:
            logger.error(f"Session {session_id} not found in database.")
            return

        try:
            # 1. Start execution -> PLANNING
            await self._update_state(session, "PLANNING", "Starting structured implementation planning...")
            await asyncio.sleep(2)

            # Generate structured plan
            plan = {
                "project_description": f"Automated creation of: {session.requirement}",
                "functional_requirements": [
                    "Implement core business logic matching requirement.",
                    "Verify inputs and handle edge cases safely.",
                    "Produce output format matching request."
                ],
                "modules": [
                    {"name": "core", "description": "Core algorithm and model definitions."},
                    {"name": "tests", "description": "Unit testing suite."}
                ],
                "files_to_create": [
                    {"path": "core/calculator.py", "description": "Primary application module."},
                    {"path": "tests/test_calculator.py", "description": "PyTest test assertions."}
                ],
                "technologies": ["Python", "PyTest"],
                "implementation_steps": [
                    "Draft core logic interface",
                    "Implement methods",
                    "Add basic automated test verification"
                ],
                "expected_functionality": "Calculations evaluate correctly under boundaries.",
                "testing_requirements": "Test normal operation, invalid arguments, and empty collections."
            }
            session.plan_json = json.dumps(plan, indent=2)
            self.db.commit()
            
            await self._update_state(session, "PLAN_READY", "Implementation plan created successfully.")
            await asyncio.sleep(1.5)

            # 2. Transition -> CODING
            await self._update_state(session, "CODING", "Writing Python source code files based on implementation plan...")
            await asyncio.sleep(2)

            # Add source files
            source_content = (
                "class GradeCalculator:\n"
                "    @staticmethod\n"
                "    def calculate_average(grades: list[float]) -> float:\n"
                "        if not grades:\n"
                "            raise ValueError(\"Grade list cannot be empty.\")\n"
                "        return sum(grades) / len(grades)\n\n"
                "    @staticmethod\n"
                "    def get_letter_grade(score: float) -> str:\n"
                "        if score < 0 or score > 100:\n"
                "            raise ValueError(\"Score must be between 0 and 100.\")\n"
                "        if score >= 90: return 'A'\n"
                "        elif score >= 80: return 'B'\n"
                "        elif score >= 70: return 'C'\n"
                "        elif score >= 60: return 'D'\n"
                "        else: return 'F'\n"
            )
            file_core = ProjectFile(
                session_id=session.id,
                path="core/calculator.py",
                content=source_content,
                is_test=False
            )
            self.db.add(file_core)
            self.db.commit()

            await self._update_state(session, "CODE_READY", "Source code files generated successfully.")
            await asyncio.sleep(1.5)

            # 3. Transition -> TEST_GENERATION
            await self._update_state(session, "TEST_GENERATION", "Drafting automated tests using PyTest framework...")
            await asyncio.sleep(2)

            test_content = (
                "import pytest\n"
                "from core.calculator import GradeCalculator\n\n"
                "def test_calculate_average():\n"
                "    assert GradeCalculator.calculate_average([90, 80, 70]) == 80.0\n"
                "    assert GradeCalculator.calculate_average([100]) == 100.0\n\n"
                "def test_calculate_average_empty():\n"
                "    with pytest.raises(ValueError):\n"
                "        GradeCalculator.calculate_average([])\n\n"
                "def test_get_letter_grade():\n"
                "    assert GradeCalculator.get_letter_grade(95) == 'A'\n"
                "    assert GradeCalculator.get_letter_grade(85) == 'B'\n"
                "    assert GradeCalculator.get_letter_grade(55) == 'F'\n\n"
                "def test_get_letter_grade_boundaries():\n"
                "    with pytest.raises(ValueError):\n"
                "        GradeCalculator.get_letter_grade(-10)\n"
            )
            file_test = ProjectFile(
                session_id=session.id,
                path="tests/test_calculator.py",
                content=test_content,
                is_test=True
            )
            self.db.add(file_test)
            self.db.commit()

            # 4. Transition -> TESTING
            await self._update_state(session, "TESTING", "Launching Docker container sandbox and running PyTest...")
            await asyncio.sleep(2.5)

            # Write mock test output
            stdout_mock = (
                "============================= test session starts =============================\n"
                "platform linux -- Python 3.11.2, pytest-7.3.1, pluggy-1.0.0\n"
                "rootdir: /app\n"
                "collected 4 items\n\n"
                "tests/test_calculator.py ....                                            [100%]\n\n"
                "============================== 4 passed in 0.08s ==============================\n"
            )
            json_report_mock = json.dumps({
                "created": datetime.now().isoformat(),
                "duration": 0.08,
                "exitcode": 0,
                "summary": {
                    "passed": 4,
                    "total": 4,
                    "failed": 0
                },
                "tests": [
                    {"nodeid": "tests/test_calculator.py::test_calculate_average", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_calculate_average_empty", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_get_letter_grade", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_get_letter_grade_boundaries", "outcome": "passed"}
                ]
            })

            test_result = TestResult(
                session_id=session.id,
                attempt=session.current_attempt,
                passed=True,
                total_tests=4,
                passed_tests=4,
                failed_tests=0,
                stdout=stdout_mock,
                stderr="",
                json_report=json_report_mock
            )
            self.db.add(test_result)
            self.db.commit()

            await self._update_state(session, "TEST_RESULTS_READY", "Tests executed successfully. 4/4 assertions passed.")
            await asyncio.sleep(1.5)

            # 5. Transition -> ANALYSIS
            await self._update_state(session, "ANALYSIS", "Analyzing execution feedback & verifying codebase metrics...")
            await asyncio.sleep(1.5)

            # 6. Complete -> COMPLETED
            await self._update_state(session, "COMPLETED", "AMASEP run completed successfully! Ready for download.")

        except Exception as e:
            logger.error(f"Error in orchestrator loop: {str(e)}")
            await self._update_state(session, "FAILED", f"Execution failed: {str(e)}")

    async def _update_state(self, session: Session, status: str, log_message: str):
        """Updates the session status and records a log entry."""
        session.status = status
        self.db.add(session)
        
        log_entry = ExecutionLog(
            session_id=session.id,
            log_text=f"[{status}] {log_message}"
        )
        self.db.add(log_entry)
        self.db.commit()
        
        # Log to server console
        logger.info(f"Session {session.id} State: {status} | {log_message}")
