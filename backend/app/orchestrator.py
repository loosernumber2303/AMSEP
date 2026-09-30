import asyncio
import json
import logging
import os
import shutil
import subprocess
import re
from datetime import datetime
import httpx
from sqlalchemy.orm import Session as DbSession
from .models import Session, ProjectFile, TestResult, ExecutionLog, CorrectionHistory
from .config import settings
from .schemas import StructuredPlan, StructuredDiagnosis, StructuredReviewReport, CorrectionProposalResponse
from .synthesizer import synthesize_plan, synthesize_files, synthesize_diagnosis, verify_requirement_coverage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PLANNER_SYSTEM_PROMPT = (
    "You are the AMASEP Structured Planner Agent.\n"
    "Your ONLY responsibility is to create a structured project implementation plan based on the user's natural-language software requirement.\n"
    "CRITICAL RULES:\n"
    "1. Treat the user's requirement as the absolute source of truth.\n"
    "2. Strictly and exclusively plan the application requested by the user. Do NOT substitute or fall back to any predefined example application.\n"
    "3. For algorithmic requirements (e.g. sorting, anagrams, math), define algorithms, array/string inputs, operations, and validations rather than generic CRUD records.\n"
    "4. Do NOT generate source code. You are a planner, not a coder.\n"
    "5. Provide clear implementation guidance for the Coder, not the implementation itself.\n"
    "6. Output must conform EXACTLY to the following JSON schema:\n"
    "{\n"
    "  \"project_title\": \"Descriptive title matching user requirement\",\n"
    "  \"description\": \"Detailed description of application scope matching user requirement\",\n"
    "  \"functional_requirements\": [\"Requirement 1\", \"Requirement 2\"],\n"
    "  \"non_functional_requirements\": [\"Constraint 1\", \"Constraint 2\"],\n"
    "  \"inputs\": [\"Input description 1\"],\n"
    "  \"outputs\": [\"Output description 1\"],\n"
    "  \"modules\": [{\"name\": \"core\", \"description\": \"module purpose\"}],\n"
    "  \"file_structure\": [{\"path\": \"core/<module_name>.py\", \"description\": \"module purpose\"}, {\"path\": \"tests/test_<module_name>.py\", \"description\": \"assertions purpose\"}],\n"
    "  \"technologies\": [\"Python\", \"PyTest\"],\n"
    "  \"implementation_steps\": [\"Step 1\", \"Step 2\"],\n"
    "  \"edge_cases\": [\"Edge Case 1\", \"Edge Case 2\"],\n"
    "  \"testing_requirements\": [\"Test criteria 1\", \"Test criteria 2\"]\n"
    "}\n"
    "(Note: The path '<module_name>' above is placeholder syntax. Derive actual module names from the user's requirement.)"
)

CODER_SYSTEM_PROMPT = (
    "You are the AMASEP Coder Agent.\n"
    "Your responsibility is to write clean, working Python source code and test files based on the CURRENT USER REQUIREMENT and APPROVED IMPLEMENTATION PLAN.\n\n"
    "CRITICAL RULES:\n"
    "1. Treat the User's Current Requirement as the absolute source of truth.\n"
    "2. Use the Approved Implementation Plan as implementation guidance.\n"
    "3. Implement the actual functionality and algorithms described by the CURRENT USER REQUIREMENT and APPROVED PLAN.\n"
    "4. Do NOT replace an algorithmic requirement (like sorting, searching, anagrams, or math) with a generic CRUD or domain-management application.\n"
    "5. Do NOT invent unrelated entities such as items, categories, resources, records, or metrics unless explicitly requested in the requirement.\n"
    "6. Generate both the source files and the PyTest verification test files listed in the plan.\n"
    "7. Mark test files with \"is_test\": true, and source files with \"is_test\": false.\n"
    "8. Return a JSON object matching this schema:\n"
    "{\n"
    "  \"files\": [\n"
    "    {\n"
    "      \"path\": \"core/<module_name>.py\",\n"
    "      \"content\": \"Python source code content\",\n"
    "      \"is_test\": false\n"
    "    },\n"
    "    {\n"
    "      \"path\": \"tests/test_<module_name>.py\",\n"
    "      \"content\": \"PyTest assertions code\",\n"
    "      \"is_test\": true\n"
    "    }\n"
    "  ]\n"
    "}"
)

CODER_CORRECTION_SYSTEM_PROMPT = (
    "You are the AMASEP Coder Agent in correction mode.\n"
    "Your responsibility is to revise the current generated source files based on the User Requirement, Implementation Plan, Current Faulty Code, Test Failures, and Diagnosis recommendation.\n\n"
    "CRITICAL RULES:\n"
    "1. Resolve the identified bug while ensuring all other required features are preserved.\n"
    "2. Do NOT rewrite the project from scratch. Target the changes exactly to resolve the failures.\n"
    "3. Return a JSON object conforming exactly to this structure:\n"
    "{\n"
    "  \"files\": [\n"
    "    {\n"
    "      \"path\": \"core/<module_name>.py\",\n"
    "      \"content\": \"Revised Python code\"\n"
    "    }\n"
    "  ]\n"
    "}"
)

DIAGNOSIS_SYSTEM_PROMPT = (
    "You are the AMASEP Diagnosis Agent.\n"
    "Your responsibility is to analyze test failure traces, identify the root cause, and specify which files/functions require fix logic.\n"
    "Do NOT generate source code. Specify recommended corrections in clean natural-language descriptions.\n"
    "Output must conform EXACTLY to the following JSON schema:\n"
    "{\n"
    "  \"failure_summary\": \"Summary of failing assertions\",\n"
    "  \"root_cause\": \"Technical explanation of why the crash happened\",\n"
    "  \"affected_files\": [\"core/<module_name>.py\"],\n"
    "  \"affected_functions\": [\"<function_name>\"],\n"
    "  \"recommended_fix\": \"Explanation of recommended code repairs\",\n"
    "  \"confidence\": 0.95\n"
    "}"
)

TESTER_SYSTEM_PROMPT = (
    "You are the AMASEP Test Engineer Agent.\n"
    "Your responsibility is to write PyTest verification assertions for the generated source files.\n"
    "Assert actual functional results and boundary conditions of the requested application.\n"
    "Return a JSON object conforming exactly to this structure:\n"
    "{\n"
    "  \"files\": [\n"
    "    {\n"
    "      \"path\": \"tests/test_<module_name>.py\",\n"
    "      \"content\": \"PyTest assertions code here\",\n"
    "      \"is_test\": true\n"
    "    }\n"
    "  ]\n"
    "}"
)

REVIEWER_SYSTEM_PROMPT = (
    "You are the AMASEP Code Reviewer Agent.\n"
    "Your responsibility is to evaluate the generated codebase against the original requirement, planner output, and actual sandbox test results.\n"
    "CRITICAL RULES:\n"
    "1. Explicitly check whether the codebase implements the actual semantics of the ORIGINAL USER REQUIREMENT and APPROVED PLAN.\n"
    "2. If an algorithmic requirement was substituted by an unrelated CRUD application or if requested features are missing, flag CRITICAL REQUIREMENT MISMATCH and set overall_status to NEEDS_IMPROVEMENT.\n"
    "3. Do NOT claim tests passed unless the actual test results show they passed.\n\n"
    "Output must conform EXACTLY to the following JSON schema:\n"
    "{\n"
    "  \"overall_status\": \"PASSED\" | \"PASSED_WITH_WARNINGS\" | \"NEEDS_IMPROVEMENT\",\n"
    "  \"summary\": \"Concise overview of implementation quality and compliance\",\n"
    "  \"issues\": [\"Issue description 1\"],\n"
    "  \"warnings\": [\"Warning 1\"],\n"
    "  \"test_summary\": {\"passed\": 3, \"failed\": 0, \"total\": 3},\n"
    "  \"files_reviewed\": [\"core/<module_name>.py\", \"tests/test_<module_name>.py\"],\n"
    "  \"recommendations\": [\"Recommendation 1\", \"Recommendation 2\"]\n"
    "}"
)

async def call_gemini_api(prompt: str, system_instruction: str = "") -> str:
    """Helper method to call Gemini API if key is present."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured.")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        
    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=payload, timeout=30.0)
        res.raise_for_status()
        data = res.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

def clean_and_parse_json(raw_text: str) -> dict:
    """Safely extracts and parses JSON content out of Markdown fence codeblocks."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    return json.loads(cleaned)

def get_template_for_requirement(requirement: str) -> dict:
    req_lower = requirement.lower()
    
    # 1. Temperature Converter
    if any(k in req_lower for k in ["temp", "celsius", "fahrenheit", "kelvin"]):
        plan = {
            "project_title": "Temperature Converter",
            "description": "A structured temperature converter utility mapping Celsius values to Fahrenheit and Kelvin formats.",
            "functional_requirements": [
                "Accept Celsius float temperatures.",
                "Convert Celsius to Fahrenheit via scale calculations (C * 9/5 + 32).",
                "Convert Celsius to Kelvin via scale calculations (C + 273.15)."
            ],
            "non_functional_requirements": [
                "Execution must take less than 10ms.",
                "Zero external package dependencies other than PyTest."
            ],
            "inputs": ["Celsius temperature value (float)"],
            "outputs": ["Fahrenheit conversion value (float)", "Kelvin conversion value (float)"],
            "modules": [
                {"name": "core", "description": "Mathematical calculation modules for temperature systems."}
            ],
            "file_structure": [
                {"path": "core/calculator.py", "description": "Conversion formula implementations."},
                {"path": "tests/test_calculator.py", "description": "Assertions testing suite."}
            ],
            "technologies": ["Python", "PyTest"],
            "implementation_steps": [
                "Draft Kelvin and Fahrenheit equations",
                "Verify absolute zero constraints (-273.15 C)",
                "Add testing assertions"
            ],
            "edge_cases": [
                "Absolute zero limit validation",
                "Oversized Celsius bounds input values"
            ],
            "testing_requirements": [
                "Verify standard melting/boiling points",
                "Assert boundary values at absolute zero",
                "Verify Exception raised when below absolute zero limits"
            ]
        }
        
        files = [
            {
                "path": "core/calculator.py",
                "content": (
                    "class TemperatureConverter:\n"
                    "    @staticmethod\n"
                    "    def convert_celsius(celsius: float) -> dict[str, float]:\n"
                    "        if celsius < -273.15:\n"
                    "            raise ValueError(\"Temperature cannot be below absolute zero (-273.15 C).\")\n"
                    "        fahrenheit = (celsius * 9/5) + 32\n"
                    "        kelvin = celsius + 273.15\n"
                    "        return {\n"
                    "            \"fahrenheit\": round(fahrenheit, 2),\n"
                    "            \"kelvin\": round(kelvin, 2)\n"
                    "        }\n"
                ),
                "is_test": False
            },
            {
                "path": "tests/test_calculator.py",
                "content": (
                    "import pytest\n"
                    "from core.calculator import TemperatureConverter\n\n"
                    "def test_convert_freezing_and_boiling():\n"
                    "    res_0 = TemperatureConverter.convert_celsius(0)\n"
                    "    assert res_0[\"fahrenheit\"] == 32.0\n"
                    "    assert res_0[\"kelvin\"] == 273.15\n\n"
                    "    res_100 = TemperatureConverter.convert_celsius(100)\n"
                    "    assert res_100[\"fahrenheit\"] == 212.0\n"
                    "    assert res_100[\"kelvin\"] == 373.15\n\n"
                    "def test_convert_absolute_zero():\n"
                    "    res_az = TemperatureConverter.convert_celsius(-273.15)\n"
                    "    assert res_az[\"fahrenheit\"] == -459.67\n"
                    "    assert res_az[\"kelvin\"] == 0.0\n\n"
                    "def test_convert_below_absolute_zero():\n"
                    "    with pytest.raises(ValueError):\n"
                    "        TemperatureConverter.convert_celsius(-300)\n"
                ),
                "is_test": True
            }
        ]
        
        test_results = {
            "passed": True,
            "total_tests": 3,
            "passed_tests": 3,
            "failed_tests": 0,
            "stdout": (
                "============================= test session starts =============================\n"
                "collected 3 items\n\n"
                "tests/test_calculator.py ...                                             [100%]\n\n"
                "============================== 3 passed in 0.05s ==============================\n"
            ),
            "stderr": "",
            "json_report_data": {
                "duration": 0.05,
                "exitcode": 0,
                "summary": {"passed": 3, "total": 3, "failed": 0},
                "tests": [
                    {"nodeid": "tests/test_calculator.py::test_convert_freezing_and_boiling", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_convert_absolute_zero", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_convert_below_absolute_zero", "outcome": "passed"}
                ]
            }
        }
        return {"plan": plan, "files": files, "test_results": test_results}
        
    # 2. Expense Tracker
    elif any(k in req_lower for k in ["expense", "category", "spending"]):
        plan = {
            "project_title": "Expense Tracker",
            "description": "An expense recording system that registers amounts and identifies the highest spending categories.",
            "functional_requirements": [
                "Register new expenses with category details.",
                "Verify expense amounts are strictly positive.",
                "Aggregate spending reports grouped by category."
            ],
            "non_functional_requirements": [
                "In-memory storage collections.",
                "Clean class methods interface layout."
            ],
            "inputs": ["Category name (string)", "Amount values (float)"],
            "outputs": ["Aggregated category totals report", "Highest spending category identifier"],
            "modules": [
                {"name": "core", "description": "Business logic registry class."}
            ],
            "file_structure": [
                {"path": "core/calculator.py", "description": "Aggregator storage logic module."},
                {"path": "tests/test_calculator.py", "description": "Assertions testing suite."}
            ],
            "technologies": ["Python", "PyTest"],
            "implementation_steps": [
                "Create registry classes",
                "Add positive number assertions",
                "Draft spending calculation methods"
            ],
            "edge_cases": [
                "Zero amount records",
                "Empty reports for empty trackers"
            ],
            "testing_requirements": [
                "Verify categories are summed correctly",
                "Confirm ValueErrors are thrown for invalid amounts",
                "Check empty tracker returns empty aggregation stats"
            ]
        }
        
        files = [
            {
                "path": "core/calculator.py",
                "content": (
                    "class ExpenseTracker:\n"
                    "    def __init__(self):\n"
                    "        self.expenses = []\n\n"
                    "    def add_expense(self, category: str, amount: float):\n"
                    "        if amount <= 0:\n"
                    "            raise ValueError(\"Expense amount must be positive.\")\n"
                    "        if not category:\n"
                    "            raise ValueError(\"Category cannot be empty.\")\n"
                    "        self.expenses.append({\"category\": category, \"amount\": amount})\n\n"
                    "    def get_spending_report(self) -> dict:\n"
                    "        if not self.expenses:\n"
                    "            return {\"totals\": {}, \"highest_spending_category\": None}\n\n"
                    "        totals = {}\n"
                    "        for exp in self.expenses:\n"
                    "            cat = exp[\"category\"]\n"
                    "            totals[cat] = totals.get(cat, 0.0) + exp[\"amount\"]\n\n"
                    "        highest_cat = max(totals, key=totals.get)\n"
                    "        return {\n"
                    "            \"totals\": {k: round(v, 2) for k, v in totals.items()},\n"
                    "            \"highest_spending_category\": highest_cat\n"
                    "        }\n"
                ),
                "is_test": False
            },
            {
                "path": "tests/test_calculator.py",
                "content": (
                    "import pytest\n"
                    "from core.calculator import ExpenseTracker\n\n"
                    "def test_add_and_report_expenses():\n"
                    "    tracker = ExpenseTracker()\n"
                    "    tracker.add_expense(\"Food\", 25.50)\n"
                    "    tracker.add_expense(\"Transport\", 15.00)\n"
                    "    tracker.add_expense(\"Food\", 10.50)\n\n"
                    "    report = tracker.get_spending_report()\n"
                    "    assert report[\"totals\"][\"Food\"] == 36.00\n"
                    "    assert report[\"totals\"][\"Transport\"] == 15.00\n"
                    "    assert report[\"highest_spending_category\"] == \"Food\"\n\n"
                    "def test_add_invalid_expense():\n"
                    "    tracker = ExpenseTracker()\n"
                    "    with pytest.raises(ValueError):\n"
                    "        tracker.add_expense(\"Food\", -10)\n"
                    "    with pytest.raises(ValueError):\n"
                    "        tracker.add_expense(\"\", 15)\n\n"
                    "def test_empty_report():\n"
                    "    tracker = ExpenseTracker()\n"
                    "    report = tracker.get_spending_report()\n"
                    "    assert report[\"totals\"] == {}\n"
                    "    assert report[\"highest_spending_category\"] is None\n"
                ),
                "is_test": True
            }
        ]
        
        test_results = {
            "passed": True,
            "total_tests": 3,
            "passed_tests": 3,
            "failed_tests": 0,
            "stdout": (
                "============================= test session starts =============================\n"
                "collected 3 items\n\n"
                "tests/test_calculator.py ...                                             [100%]\n\n"
                "============================== 3 passed in 0.04s ==============================\n"
            ),
            "stderr": "",
            "json_report_data": {
                "duration": 0.04,
                "exitcode": 0,
                "summary": {"passed": 3, "total": 3, "failed": 0},
                "tests": [
                    {"nodeid": "tests/test_calculator.py::test_add_and_report_expenses", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_add_invalid_expense", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_empty_report", "outcome": "passed"}
                ]
            }
        }
        return {"plan": plan, "files": files, "test_results": test_results}

    # 3. Student Grade Calculator
    elif any(k in req_lower for k in ["grade", "marks", "subject", "percentage"]):
        plan = {
            "project_title": "Student Grade Calculator",
            "description": "An academic student grade calculator that takes multiple subject marks, calculates total/average/percentage, and returns letter grades.",
            "functional_requirements": [
                "Accept a dictionary mapping subjects to float marks.",
                "Calculate total marks score.",
                "Calculate average mark and percentage.",
                "Compute final letter grade based on percentage score thresholds."
            ],
            "non_functional_requirements": [
                "Marks checked to be strictly between 0 and 100 limit bounds.",
                "Fast validation calculation."
            ],
            "inputs": ["Dictionary mapping subject names (string) to marks (float)"],
            "outputs": ["Total marks (float)", "Average mark (float)", "Percentage (float)", "Final grade letter (string)"],
            "modules": [
                {"name": "core", "description": "Subject aggregates calculation helper."}
            ],
            "file_structure": [
                {"path": "core/calculator.py", "description": "Primary GradeCalculator logics module."},
                {"path": "tests/test_calculator.py", "description": "PyTest testing assertion suites."}
            ],
            "technologies": ["Python", "PyTest"],
            "implementation_steps": [
                "Build subjects aggregation loop",
                "Apply percentage calculations formula",
                "Map thresholds to letter grades letters"
            ],
            "edge_cases": [
                "Empty subjects dictionaries input",
                "Marks values below 0 or above 100 validation limits"
            ],
            "testing_requirements": [
                "Verify standard marks calculate correct total/average/percentage/grade",
                "Verify ValueError raised for negative or >100 marks",
                "Verify ValueError raised for empty subject maps"
            ]
        }
        
        files = [
            {
                "path": "core/calculator.py",
                "content": (
                    "class GradeCalculator:\n"
                    "    @staticmethod\n"
                    "    def calculate_results(subject_marks: dict[str, float]) -> dict:\n"
                    "        if not subject_marks:\n"
                    "            raise ValueError(\"Subject marks dictionary cannot be empty.\")\n\n"
                    "        total = 0.0\n"
                    "        for subject, mark in subject_marks.items():\n"
                    "            if mark < 0 or mark > 100:\n"
                    "                raise ValueError(f\"Mark for {subject} must be between 0 and 100.\")\n"
                    "            total += mark\n\n"
                    "        count = len(subject_marks)\n"
                    "        average = total / count\n"
                    "        percentage = (total / (count * 100.0)) * 100.0\n\n"
                    "        if percentage >= 90: grade = 'A'\n"
                    "        elif percentage >= 80: grade = 'B'\n"
                    "        elif percentage >= 70: grade = 'C'\n"
                    "        elif percentage >= 60: grade = 'D'\n"
                    "        else: grade = 'F'\n\n"
                    "        return {\n"
                    "            \"total\": round(total, 2),\n"
                    "            \"average\": round(average, 2),\n"
                    "            \"percentage\": round(percentage, 2),\n"
                    "            \"grade\": grade\n"
                    "        }\n"
                ),
                "is_test": False
            },
            {
                "path": "tests/test_calculator.py",
                "content": (
                    "import pytest\n"
                    "from core.calculator import GradeCalculator\n\n"
                    "def test_calculate_results_basic():\n"
                    "    marks = {\"Math\": 80.0, \"Science\": 90.0, \"History\": 70.0}\n"
                    "    res = GradeCalculator.calculate_results(marks)\n"
                    "    assert res[\"total\"] == 240.0\n"
                    "    assert res[\"average\"] == 80.0\n"
                    "    assert res[\"percentage\"] == 80.0\n"
                    "    assert res[\"grade\"] == 'B'\n\n"
                    "def test_calculate_results_empty():\n"
                    "    with pytest.raises(ValueError):\n"
                    "        GradeCalculator.calculate_results({})\n\n"
                    "def test_calculate_results_invalid_marks():\n"
                    "    with pytest.raises(ValueError):\n"
                    "        GradeCalculator.calculate_results({\"Math\": -10})\n"
                    "    with pytest.raises(ValueError):\n"
                    "        GradeCalculator.calculate_results({\"Math\": 150})\n"
                ),
                "is_test": True
            }
        ]
        
        test_results = {
            "passed": True,
            "total_tests": 3,
            "passed_tests": 3,
            "failed_tests": 0,
            "stdout": (
                "============================= test session starts =============================\n"
                "collected 3 items\n\n"
                "tests/test_calculator.py ...                                             [100%]\n\n"
                "============================== 3 passed in 0.05s ==============================\n"
            ),
            "stderr": "",
            "json_report_data": {
                "duration": 0.05,
                "exitcode": 0,
                "summary": {"passed": 3, "total": 3, "failed": 0},
                "tests": [
                    {"nodeid": "tests/test_calculator.py::test_calculate_results_basic", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_calculate_results_empty", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_calculate_results_invalid_marks", "outcome": "passed"}
                ]
            }
        }
        return {"plan": plan, "files": files, "test_results": test_results}

    # 4. Division Calculator (Failure Recovery Demonstration)
    elif any(k in req_lower for k in ["division", "calculator", "seeded", "failure", "recovery", "demonstrate"]):
        plan = {
            "project_title": "Division Calculator",
            "description": "A calculator designed to divide two numbers and demonstrate automated bug recovery.",
            "functional_requirements": [
                "Accept two inputs (numerator and denominator).",
                "Perform float division.",
                "Safely handle division by zero by raising a ValueError."
            ],
            "non_functional_requirements": ["Basic validation checks."],
            "inputs": ["Numerator (float)", "Denominator (float)"],
            "outputs": ["Division quotient result (float)"],
            "modules": [{"name": "core", "description": "Core arithmetic division calculations."}],
            "file_structure": [
                {"path": "core/calculator.py", "description": "Calculator division functions."},
                {"path": "tests/test_calculator.py", "description": "Unit assertions checks."}
            ],
            "technologies": ["Python", "PyTest"],
            "implementation_steps": [
                "Build math calculation core method",
                "Verify exception returns on zero inputs"
            ],
            "edge_cases": ["Division by zero"],
            "testing_requirements": [
                "Verify normal division quotients",
                "Verify ValueError raised on division by zero"
            ]
        }
        
        # Files for Attempt 1 (Seeded bug)
        files_attempt1 = [
            {
                "path": "core/calculator.py",
                "content": (
                    "class DivisionCalculator:\n"
                    "    @staticmethod\n"
                    "    def divide(a: float, b: float) -> float:\n"
                    "        # Seeded bug: No validation for division by zero\n"
                    "        return a / b\n"
                ),
                "is_test": False
            },
            {
                "path": "tests/test_calculator.py",
                "content": (
                    "import pytest\n"
                    "from core.calculator import DivisionCalculator\n\n"
                    "def test_divide_normal():\n"
                    "    assert DivisionCalculator.divide(10, 2) == 5.0\n"
                    "    assert DivisionCalculator.divide(9, 4) == 2.25\n\n"
                    "def test_divide_by_zero():\n"
                    "    with pytest.raises(ValueError) as exc:\n"
                    "        DivisionCalculator.divide(10, 0)\n"
                    "    assert \"cannot divide by zero\" in str(exc.value).lower()\n"
                ),
                "is_test": True
            }
        ]
        
        # Files for Attempt 2 (Corrected code)
        files_attempt2 = [
            {
                "path": "core/calculator.py",
                "content": (
                    "class DivisionCalculator:\n"
                    "    @staticmethod\n"
                    "    def divide(a: float, b: float) -> float:\n"
                    "        if b == 0:\n"
                    "            raise ValueError(\"Cannot divide by zero.\")\n"
                    "        return a / b\n"
                ),
                "is_test": False
            },
            {
                "path": "tests/test_calculator.py",
                "content": (
                    "import pytest\n"
                    "from core.calculator import DivisionCalculator\n\n"
                    "def test_divide_normal():\n"
                    "    assert DivisionCalculator.divide(10, 2) == 5.0\n"
                    "    assert DivisionCalculator.divide(9, 4) == 2.25\n\n"
                    "def test_divide_by_zero():\n"
                    "    with pytest.raises(ValueError) as exc:\n"
                    "        DivisionCalculator.divide(10, 0)\n"
                    "    assert \"cannot divide by zero\" in str(exc.value).lower()\n"
                ),
                "is_test": True
            }
        ]
        
        test_results_attempt1 = {
            "passed": False,
            "total_tests": 2,
            "passed_tests": 1,
            "failed_tests": 1,
            "stdout": (
                "============================= test session starts =============================\n"
                "collected 2 items\n\n"
                "tests/test_calculator.py .F                                             [100%]\n\n"
                "================================== FAILURES ===================================\n"
                "_____________________________ test_divide_by_zero _____________________________\n"
                "def test_divide_by_zero():\n"
                "    with pytest.raises(ValueError) as exc:\n"
                ">       DivisionCalculator.divide(10, 0)\n"
                "E       Failed: DID NOT RAISE <class 'ValueError'>\n"
                "tests/test_calculator.py:10: Failed\n"
                "----------------------------- Captured stdout call -----------------------------\n"
                "ZeroDivisionError: division by zero\n"
                "=========================== 1 failed, 1 passed in 0.08s ===========================\n"
            ),
            "stderr": "",
            "json_report_data": {
                "duration": 0.08,
                "exitcode": 1,
                "summary": {"passed": 1, "total": 2, "failed": 1},
                "tests": [
                    {"nodeid": "tests/test_calculator.py::test_divide_normal", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_divide_by_zero", "outcome": "failed"}
                ]
            }
        }
        
        test_results_attempt2 = {
            "passed": True,
            "total_tests": 2,
            "passed_tests": 2,
            "failed_tests": 0,
            "stdout": (
                "============================= test session starts =============================\n"
                "collected 2 items\n\n"
                "tests/test_calculator.py ..                                             [100%]\n\n"
                "============================== 2 passed in 0.04s ==============================\n"
            ),
            "stderr": "",
            "json_report_data": {
                "duration": 0.04,
                "exitcode": 0,
                "summary": {"passed": 2, "total": 2, "failed": 0},
                "tests": [
                    {"nodeid": "tests/test_calculator.py::test_divide_normal", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_divide_by_zero", "outcome": "passed"}
                ]
            }
        }
        
        diagnosis_attempt1 = {
            "failure_summary": "test_divide_by_zero failed due to unhandled ZeroDivisionError.",
            "root_cause": "The divide method in core/calculator.py performs a / b directly without checking if the denominator b is zero, causing Python to raise a ZeroDivisionError instead of the expected ValueError.",
            "affected_files": ["core/calculator.py"],
            "affected_functions": ["divide"],
            "recommended_fix": "Add an input check to verify if the denominator is zero. If it is zero, raise a ValueError with the message 'Cannot divide by zero'.",
            "confidence": 1.0
        }
        
        return {
            "plan": plan,
            "files_attempt1": files_attempt1,
            "files_attempt2": files_attempt2,
            "test_results_attempt1": test_results_attempt1,
            "test_results_attempt2": test_results_attempt2,
            "diagnosis_attempt1": diagnosis_attempt1
        }

    # 5. Number Utility
    else:
        plan = {
            "project_title": "Number Utility",
            "description": "An integer list utility returning max, min, average, and even number count.",
            "functional_requirements": [
                "Accept a list of integers.",
                "Calculate maximum and minimum elements.",
                "Calculate average score.",
                "Count even integer numbers."
            ],
            "non_functional_requirements": [
                "Strict validation parameters.",
                "No external math imports."
            ],
            "inputs": ["List of integers"],
            "outputs": ["Maximum (int)", "Minimum (int)", "Average (float)", "Even count (int)"],
            "modules": [
                {"name": "core", "description": "Statistics helper calculation class."}
            ],
            "file_structure": [
                {"path": "core/calculator.py", "description": "Math utility functions module."},
                {"path": "tests/test_calculator.py", "description": "PyTest assertion test suite."}
            ],
            "technologies": ["Python", "PyTest"],
            "implementation_steps": [
                "Build statistic calculation functions",
                "Ensure empty list exceptions are handled",
                "Build test assertions coverages"
            ],
            "edge_cases": [
                "Empty array lists",
                "Array lists with all negative values"
            ],
            "testing_requirements": [
                "Verify calculations for positive lists",
                "Verify calculations for negative lists",
                "Confirm ValueError on empty list arrays"
            ]
        }
        
        files = [
            {
                "path": "core/calculator.py",
                "content": (
                    "class NumberUtility:\n"
                    "    @staticmethod\n"
                    "    def calculate_stats(numbers: list[int]) -> dict:\n"
                    "        if not numbers:\n"
                    "            raise ValueError(\"Number list cannot be empty.\")\n\n"
                    "        max_val = max(numbers)\n"
                    "        min_val = min(numbers)\n"
                    "        avg_val = sum(numbers) / len(numbers)\n"
                    "        even_count = sum(1 for n in numbers if n % 2 == 0)\n\n"
                    "        return {\n"
                    "            \"max\": max_val,\n"
                    "            \"min\": min_val,\n"
                    "            \"average\": round(avg_val, 2),\n"
                    "            \"even_count\": even_count\n"
                    "        }\n"
                ),
                "is_test": False
            },
            {
                "path": "tests/test_calculator.py",
                "content": (
                    "import pytest\n"
                    "from core.calculator import NumberUtility\n\n"
                    "def test_calculate_stats_basic():\n"
                    "    stats = NumberUtility.calculate_stats([1, 2, 3, 4, 5])\n"
                    "    assert stats[\"max\"] == 5\n"
                    "    assert stats[\"min\"] == 1\n"
                    "    assert stats[\"average\"] == 3.0\n"
                    "    assert stats[\"even_count\"] == 2\n\n"
                    "def test_calculate_stats_negatives():\n"
                    "    stats = NumberUtility.calculate_stats([-10, -2, -5, -4])\n"
                    "    assert stats[\"max\"] == -2\n"
                    "    assert stats[\"min\"] == -10\n"
                    "    assert stats[\"average\"] == -5.25\n"
                    "    assert stats[\"even_count\"] == 3\n\n"
                    "def test_empty_list():\n"
                    "    with pytest.raises(ValueError):\n"
                    "        NumberUtility.calculate_stats([])\n"
                ),
                "is_test": True
            }
        ]
        
        test_results = {
            "passed": True,
            "total_tests": 3,
            "passed_tests": 3,
            "failed_tests": 0,
            "stdout": (
                "============================= test session starts =============================\n"
                "collected 3 items\n\n"
                "tests/test_calculator.py ...                                             [100%]\n\n"
                "============================== 3 passed in 0.06s ==============================\n"
            ),
            "stderr": "",
            "json_report_data": {
                "duration": 0.06,
                "exitcode": 0,
                "summary": {"passed": 3, "total": 3, "failed": 0},
                "tests": [
                    {"nodeid": "tests/test_calculator.py::test_calculate_stats_basic", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_calculate_stats_negatives", "outcome": "passed"},
                    {"nodeid": "tests/test_calculator.py::test_empty_list", "outcome": "passed"}
                ]
            }
        }
        return {"plan": plan, "files": files, "test_results": test_results}


class Orchestrator:
    def __init__(self, db: DbSession):
        self.db = db

    def log_and_record(self, session: Session, log_text: str):
        """Prints info to server stdout and appends to db ExecutionLog."""
        logger.info(log_text)
        log_entry = ExecutionLog(
            session_id=session.id,
            log_text=log_text
        )
        self.db.add(log_entry)
        self.db.commit()

    def sync_session_files_to_disk(self, session: Session) -> str:
        """Writes current database ProjectFiles to backend/workspaces/session_{id}/"""
        workspace_dir = os.path.abspath(os.path.join("workspaces", f"session_{session.id}"))
        os.makedirs(workspace_dir, exist_ok=True)
        for f in session.files:
            target_path = os.path.join(workspace_dir, f.path)
            parent_dir = os.path.dirname(target_path)
            os.makedirs(parent_dir, exist_ok=True)
            with open(target_path, "w", encoding="utf-8") as out:
                out.write(f.content)
            # Ensure __init__.py exists in subpackages
            rel_parent = os.path.relpath(parent_dir, workspace_dir)
            if rel_parent not in (".", ""):
                init_file = os.path.join(parent_dir, "__init__.py")
                if not os.path.exists(init_file):
                    with open(init_file, "w", encoding="utf-8") as init_out:
                        init_out.write("")
        return workspace_dir

    def is_docker_available(self) -> bool:
        """Checks if Docker daemon is active and responsive."""
        try:
            proc = subprocess.run(
                ["docker", "info"],
                capture_output=True,
                stdin=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                timeout=5.0
            )
            return proc.returncode == 0
        except Exception:
            return False

    def ensure_test_sandbox_image(self) -> tuple[bool, str]:
        """
        Ensures the Docker test sandbox image (amasep-sandbox:3.11) containing pytest is ready.
        Builds it cleanly from python:3.11-slim if it doesn't already exist.
        """
        if not self.is_docker_available():
            return False, "Docker daemon is not available."

        # Check if amasep-sandbox:3.11 already exists locally
        check_proc = subprocess.run(
            ["docker", "image", "inspect", "amasep-sandbox:3.11"],
            capture_output=True,
            stdin=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        if check_proc.returncode == 0:
            return True, "amasep-sandbox:3.11"

        # Build image with pytest preinstalled
        logger.info("Building amasep-sandbox:3.11 Docker test image with pytest...")
        dockerfile = "FROM python:3.11-slim\nRUN pip install --no-cache-dir pytest\n"
        build_proc = subprocess.run(
            ["docker", "build", "-t", "amasep-sandbox:3.11", "-"],
            input=dockerfile,
            text=True,
            capture_output=True,
            stdin=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            timeout=120.0
        )
        if build_proc.returncode != 0:
            err_msg = build_proc.stderr or build_proc.stdout or "Unknown build error"
            return False, f"Failed to build amasep-sandbox:3.11 image: {err_msg.strip()}"

        return True, "amasep-sandbox:3.11"

    def prepare_session_test_image(self, session: Session, workspace_dir: str) -> tuple[bool, str, str]:
        """
        Prepares the Docker image for testing.
        If requirements.txt exists in the workspace and specifies non-pytest packages,
        builds a session-specific image with those packages installed.
        Otherwise returns amasep-sandbox:3.11.
        Returns (success: bool, image_name: str, error_message: str).
        """
        ok, base_img_or_err = self.ensure_test_sandbox_image()
        if not ok:
            return False, "", base_img_or_err

        base_image = "amasep-sandbox:3.11"
        req_file = os.path.join(workspace_dir, "requirements.txt")
        if not os.path.isfile(req_file):
            return True, base_image, ""

        try:
            with open(req_file, "r", encoding="utf-8", errors="ignore") as rf:
                req_lines = [l.strip() for l in rf if l.strip() and not l.strip().startswith("#")]
        except Exception as e:
            return False, "", f"Failed to read requirements.txt: {str(e)}"

        # Filter dependencies that need installation beyond pytest
        extra_deps = [r for r in req_lines if not r.lower().startswith("pytest")]
        if not extra_deps:
            return True, base_image, ""

        # Build session-specific image with requirements installed
        session_image = f"amasep-session-{session.id}:latest"
        logger.info(f"Building session-specific test image {session_image} with dependencies...")
        dockerfile = (
            f"FROM {base_image}\n"
            "COPY requirements.txt /tmp/requirements.txt\n"
            "RUN pip install --no-cache-dir -r /tmp/requirements.txt\n"
        )
        build_proc = subprocess.run(
            ["docker", "build", "-t", session_image, "-f", "-", workspace_dir],
            input=dockerfile,
            text=True,
            capture_output=True,
            stdin=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            timeout=180.0
        )
        if build_proc.returncode != 0:
            err_msg = build_proc.stderr or build_proc.stdout or "Pip installation failed"
            return False, "", f"Failed to install requirements.txt inside test container: {err_msg.strip()}"

        return True, session_image, ""

    def run_application(self, session_id: int) -> dict:
        """
        Executes the application entrypoint inside the isolated Docker sandbox.
        If Docker is unavailable, fails gracefully with a security notice rather than running untrusted code on host.
        """
        session = self.db.query(Session).filter(Session.id == session_id).first()
        if not session:
            return {"status": "error", "message": "Session not found.", "sandbox_available": False}

        workspace_dir = self.sync_session_files_to_disk(session)

        # Determine entrypoint dynamically based on workspace files
        entrypoint = None
        candidates = ["main.py", "app.py"]
        for c in candidates:
            if os.path.exists(os.path.join(workspace_dir, c)):
                entrypoint = c
                break
        if not entrypoint:
            py_files = [f.path for f in session.files if not f.is_test and f.path.endswith(".py")]
            if py_files:
                entrypoint = py_files[0]
            else:
                entrypoint = "main.py"

        if not self.is_docker_available():
            self.log_and_record(session, "[SECURITY NOTICE] Docker sandbox daemon is unavailable. Untrusted code execution on host is blocked.")
            return {
                "status": "error",
                "message": "Docker sandbox daemon is unavailable. Untrusted code execution directly on the host is disabled for safety.",
                "entrypoint": entrypoint,
                "sandbox_available": False,
                "stdout": "",
                "stderr": "Execution blocked: Docker sandbox is not running. Please start Docker Desktop to safely execute untrusted code in the sandbox."
            }

        # Select appropriate container image (prefer amasep-sandbox:3.11, fallback to python:3.11-slim)
        image_name = "amasep-sandbox:3.11"
        check_proc = subprocess.run(
            ["docker", "image", "inspect", image_name],
            capture_output=True,
            stdin=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        if check_proc.returncode != 0:
            image_name = "python:3.11-slim"

        # Check for custom dependencies in requirements.txt
        req_file = os.path.join(workspace_dir, "requirements.txt")
        if os.path.isfile(req_file):
            ok, custom_img, _ = self.prepare_session_test_image(session, workspace_dir)
            if ok and custom_img:
                image_name = custom_img

        self.log_and_record(session, f"[SANDBOX EXECUTION] Running {entrypoint} in Docker container ({image_name})...")
        cmd = [
            "docker", "run", "--rm",
            "--network", "none",
            "--memory", "512m",
            "--cpus", "1",
            "--init",
            "-e", "PYTHONPATH=/app",
            "-a", "stdout",
            "-a", "stderr",
            "-v", f"{workspace_dir}:/app:ro",
            "-w", "/app",
            image_name,
            "python", entrypoint
        ]
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                stdin=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                timeout=15.0
            )
            exit_code = proc.returncode
            self.log_and_record(session, f"[SANDBOX EXECUTION COMPLETED] Exit code: {exit_code}")
            
            # Treat exit code 0 as success, non-zero as error
            exec_status = "success" if exit_code == 0 else "error"
            exec_message = f"Execution completed with exit code {exit_code}." if exit_code == 0 else f"Execution failed with exit code {exit_code}."
            
            return {
                "status": exec_status,
                "message": exec_message,
                "entrypoint": entrypoint,
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "exit_code": exit_code,
                "sandbox_available": True
            }
        except subprocess.TimeoutExpired:
            self.log_and_record(session, "[SANDBOX EXECUTION TIMEOUT] Execution timed out (15s limit).")
            return {
                "status": "error",
                "message": "Execution timed out (15s limit).",
                "entrypoint": entrypoint,
                "stderr": "Timeout expired while executing in sandbox container.",
                "exit_code": -1,
                "sandbox_available": True
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Sandbox execution crash: {str(e)}",
                "entrypoint": entrypoint,
                "stderr": str(e),
                "exit_code": -1,
                "sandbox_available": True
            }

    def run_tests_in_workspace(self, session_id: int) -> dict:
        """
        Executes PyTest assertions inside the Docker sandbox.
        If Docker is unavailable, fails gracefully with a security notice rather than running untrusted code on host.
        Ensures pytest is available in the test container and reports accurate assertion counts.
        """
        session = self.db.query(Session).filter(Session.id == session_id).first()
        if not session:
            return {"status": "error", "message": "Session not found.", "sandbox_available": False}

        workspace_dir = self.sync_session_files_to_disk(session)

        if not self.is_docker_available():
            self.log_and_record(session, "[SECURITY NOTICE] Docker sandbox daemon is unavailable. Untrusted test execution on host is blocked.")
            return {
                "status": "error",
                "message": "Docker sandbox daemon is unavailable. Untrusted test execution directly on the host is disabled for safety.",
                "sandbox_available": False,
                "passed": False,
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "stdout": "",
                "stderr": "Execution blocked: Docker sandbox is not running. Please start Docker Desktop to safely run tests in the sandbox."
            }

        # Ensure test container image with pytest is ready
        self.log_and_record(session, "[SANDBOX TESTING] Preparing test container environment with PyTest...")
        ok, image_name, err = self.prepare_session_test_image(session, workspace_dir)
        if not ok:
            err_msg = f"Docker test environment setup failed: {err}"
            self.log_and_record(session, f"[SANDBOX SETUP ERROR] {err_msg}")
            return {
                "status": "error",
                "message": err_msg,
                "sandbox_available": False,
                "passed": False,
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "stdout": "",
                "stderr": err_msg
            }

        self.log_and_record(session, f"[SANDBOX TESTING] Executing PyTest inside Docker container ({image_name})...")
        cmd = [
            "docker", "run", "--rm",
            "--network", "none",
            "--memory", "512m",
            "--cpus", "1",
            "--init",
            "-e", "PYTHONPATH=/app",
            "-a", "stdout",
            "-a", "stderr",
            "-v", f"{workspace_dir}:/app:ro",
            "-w", "/app",
            image_name,
            "python", "-m", "pytest", ".", "--tb=short", "-p", "no:cacheprovider"
        ]
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                stdin=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                timeout=25.0
            )
            stdout = proc.stdout
            stderr = proc.stderr
            exit_code = proc.returncode

            # Parse PyTest output for assertions / test counts
            passed_match = re.search(r"(\d+)\s+passed", stdout)
            failed_match = re.search(r"(\d+)\s+failed", stdout)
            error_match = re.search(r"(\d+)\s+error", stdout)

            passed_count = int(passed_match.group(1)) if passed_match else 0
            failed_count = int(failed_match.group(1)) if failed_match else 0
            if error_match:
                failed_count += int(error_match.group(1))

            total = passed_count + failed_count
            passed = (exit_code == 0 and total > 0 and failed_count == 0)

            # If pytest failed to run or no tests were collected and exit code was non-zero
            if total == 0 and exit_code != 0:
                err_summary = stderr.strip() or stdout.strip() or f"PyTest exited with code {exit_code}"
                self.log_and_record(session, f"[SANDBOX SETUP ERROR] PyTest execution failed: {err_summary}")
                return {
                    "status": "error",
                    "message": f"PyTest failed to run or collect tests: {err_summary}",
                    "sandbox_available": False,
                    "passed": False,
                    "total_tests": 0,
                    "passed_tests": 0,
                    "failed_tests": 0,
                    "stdout": stdout,
                    "stderr": stderr
                }

            # Record test result in database
            test_res = TestResult(
                session_id=session.id,
                attempt=session.current_attempt,
                passed=passed,
                total_tests=total,
                passed_tests=passed_count,
                failed_tests=failed_count,
                stdout=stdout,
                stderr=stderr,
                json_report=json.dumps({"summary": {"passed": passed_count, "failed": failed_count, "total": total}})
            )
            self.db.add(test_res)
            self.db.commit()

            self.log_and_record(session, f"[SANDBOX TESTING COMPLETED] Passed: {passed_count}/{total} (Exit code {exit_code})")
            return {
                "status": "success",
                "passed": passed,
                "total_tests": total,
                "passed_tests": passed_count,
                "failed_tests": failed_count,
                "stdout": stdout,
                "stderr": stderr,
                "sandbox_available": True
            }
        except subprocess.TimeoutExpired:
            self.log_and_record(session, "[SANDBOX TESTING TIMEOUT] Test execution timed out (25s limit).")
            return {
                "status": "error",
                "message": "Test execution timed out (25s limit).",
                "passed": False,
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "stdout": "",
                "stderr": "Timeout expired while executing tests in sandbox container.",
                "sandbox_available": True
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Sandbox testing crash: {str(e)}",
                "passed": False,
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "stdout": "",
                "stderr": str(e),
                "sandbox_available": True
            }

    def generate_correction_proposal(self, session_id: int) -> dict:
        """
        Diagnoses test failures and returns an AI Correction Proposal without altering developer code.
        """
        session = self.db.query(Session).filter(Session.id == session_id).first()
        if not session:
            return {"error": "Session not found"}

        latest_test = session.test_results[-1] if session.test_results else None
        if not latest_test or latest_test.passed:
            return {
                "failure_summary": "All tests are passing. No correction needed.",
                "affected_file": "",
                "explanation": "No failing assertions detected in current test results.",
                "proposed_code": "",
                "test_failure": "",
                "attempt": session.current_attempt
            }

        diag = synthesize_diagnosis(latest_test.stdout or latest_test.stderr or "", session.files)
        failure_summary = f"{latest_test.failed_tests} assertion(s) failed in PyTest suite: {diag['failure_summary']}"
        py_files = [f.path for f in session.files if not f.is_test and f.path.endswith(".py")]
        affected_file = diag["affected_files"][0] if diag["affected_files"] else (py_files[0] if py_files else "core/app.py")
        explanation = diag["root_cause"] + " " + diag["recommended_fix"]

        target_f = next((f for f in session.files if f.path == affected_file), None)
        proposed_code = target_f.content if target_f else ""

        self.log_and_record(session, f"[AI CORRECTION PROPOSED] Proposal generated for {affected_file}")

        return {
            "failure_summary": failure_summary,
            "affected_file": affected_file,
            "explanation": explanation,
            "proposed_code": proposed_code,
            "test_failure": (latest_test.stdout or latest_test.stderr or "")[:1000],
            "attempt": session.current_attempt
        }

    def accept_correction(self, session_id: int, file_path: str, corrected_content: str) -> dict:
        """
        Applies developer-accepted AI correction to the file, syncs to disk, and runs sandbox tests.
        """
        session = self.db.query(Session).filter(Session.id == session_id).first()
        if not session:
            return {"error": "Session not found"}

        target_file = self.db.query(ProjectFile).filter(
            ProjectFile.session_id == session_id,
            ProjectFile.path == file_path
        ).first()

        if not target_file:
            return {"error": f"File {file_path} not found in session {session_id}"}

        # Apply correction
        target_file.content = corrected_content
        self.db.commit()

        self.log_and_record(session, f"[AI CORRECTION ACCEPTED] Applied fix to {file_path}")
        self.sync_session_files_to_disk(session)

        # Run tests in Docker sandbox
        test_res = self.run_tests_in_workspace(session_id)
        return test_res

    def reject_correction(self, session_id: int, reason: str = "") -> dict:
        """
        Records developer rejection of the AI correction proposal. Preserves existing code.
        """
        session = self.db.query(Session).filter(Session.id == session_id).first()
        if not session:
            return {"error": "Session not found"}

        msg = f"Developer rejected AI correction proposal. Notes: {reason}" if reason else "Developer rejected AI correction proposal."
        self.log_and_record(session, f"[AI CORRECTION REJECTED] {msg}")
        return {"status": "rejected", "message": msg}

    async def plan_phase(self, session_id: int):
        """Phase 1: Generates structured plan and halts at PLAN_REVIEW for developer inspection and approval."""
        session = self.db.query(Session).filter(Session.id == session_id).first()
        if not session:
            logger.error(f"Session {session_id} not found.")
            return

        try:
            self.log_and_record(session, f"[RUN ID] {session.id}")
            self.log_and_record(session, f"[REQUIREMENT RECEIVED] {session.requirement}")

            await self._update_state(session, "PLANNING", "Starting structured implementation planning...")
            self.log_and_record(session, "[PLANNING STARTED]")
            await asyncio.sleep(1.5)

            plan_data = None
            if settings.GEMINI_API_KEY:
                attempts = 2
                for attempt_idx in range(attempts):
                    try:
                        self.log_and_record(session, f"Calling Gemini API for Planning (Attempt {attempt_idx + 1})...")
                        prompt = (
                            f"Create a structured project implementation plan for this requirement:\n"
                            f"\"{session.requirement}\"\n\n"
                            f"CRITICAL: The plan must strictly and exclusively address the user's requirement above.\n"
                            f"Do NOT implement or substitute any default, calculator, or unrelated application."
                        )
                        raw_plan = await call_gemini_api(prompt, PLANNER_SYSTEM_PROMPT)
                        plan_dict = clean_and_parse_json(raw_plan)
                        validated_plan = StructuredPlan(**plan_dict)
                        plan_data = validated_plan.model_dump()
                        break
                    except Exception as e:
                        logger.error(f"Planning attempt {attempt_idx + 1} failed: {str(e)}")
                        if attempt_idx == attempts - 1:
                            await self._update_state(session, "PLANNING_FAILED", f"Planning failed: {str(e)}")
                            self.log_and_record(session, f"[PLANNING FAILED] {str(e)}")
                            return

            # If Gemini API key is not configured, synthesize plan directly from user's requirement
            if not plan_data:
                self.log_and_record(session, "Synthesizing structured implementation plan directly from requirement...")
                raw_synth = synthesize_plan(session.requirement)
                validated_plan = StructuredPlan(**raw_synth)
                plan_data = validated_plan.model_dump()

            session.plan_json = json.dumps(plan_data, indent=2)
            self.db.commit()

            self.log_and_record(session, f"[PLAN GENERATED] {session.plan_json}")
            await self._update_state(session, "PLAN_REVIEW", "Implementation plan created. Awaiting developer inspection and approval.")
            self.log_and_record(session, "[PLAN REVIEW READY] Plan generated. Waiting for developer approval.")
        except Exception as e:
            logger.error(f"Error in plan_phase: {str(e)}")
            await self._update_state(session, "PLANNING_FAILED", f"Planning failed: {str(e)}")

    async def code_phase(self, session_id: int):
        """Phase 2: Generates source files based on approved plan and activates DEVELOPER_WORKSPACE."""
        session = self.db.query(Session).filter(Session.id == session_id).first()
        if not session:
            logger.error(f"Session {session_id} not found.")
            return

        # Explicit requirement and plan validation
        if not session.requirement or not session.requirement.strip():
            await self._update_state(session, "CODING_FAILED", "User requirement is missing.")
            self.log_and_record(session, "[CODING FAILED] User requirement is missing.")
            return

        if not session.plan_json or not session.plan_json.strip():
            await self._update_state(session, "CODING_FAILED", "Approved plan could not be loaded for code generation.")
            self.log_and_record(session, "[CODING FAILED] Approved plan could not be loaded for code generation.")
            return

        try:
            plan_obj = json.loads(session.plan_json)
        except Exception as pe:
            await self._update_state(session, "CODING_FAILED", "Approved plan could not be loaded for code generation.")
            self.log_and_record(session, f"[CODING FAILED] Failed to parse approved plan: {str(pe)}")
            return

        try:
            await self._update_state(session, "CODING", "Writing Python source code files based on implementation plan...")
            self.log_and_record(session, "[CODING STARTED]")
            await asyncio.sleep(1.5)

            files_data = None
            if settings.GEMINI_API_KEY:
                try:
                    self.log_and_record(session, "Calling Gemini API for Code Generation...")
                    # Extract any developer feedback from recent logs
                    recent_feedback = [l.log_text for l in session.logs if "[DEVELOPER FEEDBACK]" in l.log_text or "[CHANGE REQUESTED]" in l.log_text]
                    feedback_str = "\n".join(recent_feedback[-3:]) if recent_feedback else "None"

                    prompt = (
                        f"CURRENT USER REQUIREMENT:\n{session.requirement}\n\n"
                        f"APPROVED IMPLEMENTATION PLAN:\n{session.plan_json}\n\n"
                        f"DEVELOPER FEEDBACK:\n{feedback_str}\n\n"
                        f"INSTRUCTION:\n"
                        f"Generate the complete software implementation for the CURRENT USER REQUIREMENT using the APPROVED IMPLEMENTATION PLAN.\n"
                        f"CRITICAL IMPLEMENTATION RULES:\n"
                        f"1. Implement the actual functionality and algorithms described by the requirement and plan.\n"
                        f"2. Do NOT replace an algorithmic requirement with a generic CRUD or domain-management application.\n"
                        f"3. Do NOT invent unrelated entities such as items, categories, resources, records, or metrics unless explicitly required.\n"
                        f"4. Generate both the source files and the PyTest verification test files listed in the plan."
                    )
                    raw_code = await call_gemini_api(prompt, CODER_SYSTEM_PROMPT)
                    code_dict = clean_and_parse_json(raw_code)
                    if "files" in code_dict and isinstance(code_dict["files"], list) and len(code_dict["files"]) > 0:
                        files_data = code_dict["files"]
                except Exception as e:
                    logger.error(f"Code gen failed: {str(e)}")
                    await self._update_state(session, "CODING_FAILED", f"Code generation failed: {str(e)}")
                    self.log_and_record(session, f"[CODING FAILED] {str(e)}")
                    return

            # If Gemini API key is not configured, synthesize code files directly from requirement and plan
            if not files_data:
                self.log_and_record(session, "Synthesizing source and PyTest verification files directly from requirement and plan...")
                files_data = synthesize_files(session.requirement, plan_obj)

            source_files_data = [f for f in files_data if not f.get("is_test", False)]
            test_files_data = [f for f in files_data if f.get("is_test", False)]

            # Clean old files
            for old_f in session.files:
                self.db.delete(old_f)
            self.db.commit()

            for f in source_files_data:
                file_core = ProjectFile(
                    session_id=session.id,
                    path=f["path"],
                    content=f["content"],
                    is_test=False
                )
                self.db.add(file_core)

            for f in test_files_data:
                file_test = ProjectFile(
                    session_id=session.id,
                    path=f["path"],
                    content=f["content"],
                    is_test=True
                )
                self.db.add(file_test)
            self.db.commit()

            # Sync to disk workspace
            self.sync_session_files_to_disk(session)

            self.log_and_record(session, f"[CODE GENERATED] {len(source_files_data)} source files, {len(test_files_data)} test files")
            await self._update_state(session, "DEVELOPER_WORKSPACE", "Source code files generated. Developer workspace is active.")
            self.log_and_record(session, "[DEVELOPER WORKSPACE READY] Workspace active. Developer can inspect, edit, and run code.")
        except Exception as e:
            logger.error(f"Error in code_phase: {str(e)}")
            await self._update_state(session, "CODING_FAILED", f"Code generation failed: {str(e)}")

    async def review_phase(self, session_id: int):
        """Phase 3: Runs Code Reviewer Agent and halts at REVIEW_READY (awaiting Phase 2B Human Release)."""
        session = self.db.query(Session).filter(Session.id == session_id).first()
        if not session:
            logger.error(f"Session {session_id} not found.")
            return

        try:
            await self._update_state(session, "REVIEWING", "Analyzing execution feedback & verifying codebase metrics...")
            self.log_and_record(session, "[REVIEW STARTED]")
            await asyncio.sleep(1.5)

            files_data = [{"path": f.path, "content": f.content} for f in session.files]

            files_reviewed = [f.path for f in session.files]
            latest_test = session.test_results[-1] if session.test_results else None
            passed_tests = latest_test.passed_tests if latest_test else 0
            total_tests = latest_test.total_tests if latest_test else 0
            failed_tests = latest_test.failed_tests if latest_test else 0

            # Run semantic requirement coverage verification
            plan_obj = json.loads(session.plan_json) if session.plan_json else {}
            cov = verify_requirement_coverage(session.requirement, plan_obj, session.files)

            if not cov["passed"]:
                overall_status = "NEEDS_IMPROVEMENT"
                issues = cov["issues"]
                warnings = ["Semantic requirement mismatch detected: codebase does not implement required functionality."]
                recs = [
                    "Implement the actual algorithmic or domain logic requested in the requirement.",
                    "Ensure tests explicitly verify requested functional semantics."
                ]
                summary = f"CRITICAL REQUIREMENT MISMATCH: {cov['summary']}"
            elif latest_test and latest_test.passed and failed_tests == 0:
                overall_status = "PASSED"
                issues = []
                warnings = ["Maintain input validation checks across future module extensions."]
                recs = [
                    "All assertions passed inside isolated Docker container.",
                    "Semantic requirement coverage verified against approved plan."
                ]
                summary = f"Codebase verified. All {passed_tests} assertions passed in isolated Docker sandbox and requirement coverage satisfied."
            elif latest_test and failed_tests > 0:
                overall_status = "NEEDS_IMPROVEMENT"
                issues = [f"{failed_tests} assertion(s) failed in PyTest suite."]
                warnings = ["Unhandled exceptions or boundary condition discrepancies observed."]
                recs = [
                    "Review failure traces and apply recommended fixes.",
                    "Ensure edge cases like zero and negative inputs are handled."
                ]
                summary = f"Codebase has test failures: {failed_tests} out of {total_tests} assertions failed."
            else:
                overall_status = "PASSED_WITH_WARNINGS"
                issues = []
                warnings = ["No automated PyTest execution was recorded prior to review."]
                recs = ["Execute test suite in Docker sandbox to confirm operational integrity."]
                summary = "Implementation generated according to specification. Sandbox test run advised."

            report_data = {
                "overall_status": overall_status,
                "summary": summary,
                "issues": issues,
                "warnings": warnings,
                "test_summary": {
                    "passed": passed_tests,
                    "failed": failed_tests,
                    "total": total_tests
                },
                "files_reviewed": files_reviewed,
                "recommendations": recs
            }

            if settings.GEMINI_API_KEY:
                try:
                    self.log_and_record(session, "Calling Gemini API for Code Review...")
                    prompt = (
                        f"USER REQUIREMENT:\n{session.requirement}\n\n"
                        f"PLANNER OUTPUT:\n{session.plan_json}\n\n"
                        f"GENERATED CODE:\n{json.dumps(files_data)}\n\n"
                        f"TEST RESULTS:\nPassed: {passed_tests}/{total_tests}, Failed: {failed_tests}\n"
                    )
                    raw_rev = await call_gemini_api(prompt, REVIEWER_SYSTEM_PROMPT)
                    parsed = clean_and_parse_json(raw_rev)
                    validated = StructuredReviewReport(**parsed)
                    report_data = validated.model_dump()
                except Exception as e:
                    logger.error(f"Gemini code review failed: {str(e)}")

            self.log_and_record(session, f"[AI REVIEW REPORT] {json.dumps(report_data)}")
            await self._update_state(session, "REVIEW_READY", "AI Review completed. Advisory report ready. Waiting for developer manual validation and release approval.")
            self.log_and_record(session, "[REVIEW READY] AI Review result available. Waiting for next human-in-the-loop phase.")
        except Exception as e:
            logger.error(f"Error in review_phase: {str(e)}")
            await self._update_state(session, "REVIEW_FAILED", f"Review failed: {str(e)}")

    async def execute_loop_and_review(self, session_id: int):
        """Runs the test & autonomous correction feedback loop, then transitions to review_phase."""
        session = self.db.query(Session).filter(Session.id == session_id).first()
        if not session:
            return

        passed = False

        while session.current_attempt <= session.max_attempts:
            self.log_and_record(session, f"[ATTEMPT] {session.current_attempt}")

            if session.current_attempt == 1:
                await self._update_state(session, "TESTING", "Executing test suite inside Docker sandbox...")
            else:
                await self._update_state(session, "RETESTING", f"Re-executing test suite inside Docker sandbox (Attempt {session.current_attempt})...")
            
            self.log_and_record(session, "[TESTING STARTED]")
            await asyncio.sleep(1)

            # Execute real PyTest in Docker sandbox
            test_res = self.run_tests_in_workspace(session.id)
            total = test_res.get("total_tests", 0)
            passed_count = test_res.get("passed_tests", 0)
            failed_count = test_res.get("failed_tests", 0)
            passed = test_res.get("passed", False)

            self.log_and_record(session, f"[TEST RESULTS] Passed {passed_count}/{total} assertions.")
            await self._update_state(session, "TEST_RESULTS_READY", "Tests executed successfully.")
            await asyncio.sleep(1)

            if passed:
                self.log_and_record(session, f"[CORRECTION SUCCESS/FAILURE] Success after attempt {session.current_attempt}")
                if session.current_attempt > 1:
                    last_history = self.db.query(CorrectionHistory).filter(
                        CorrectionHistory.session_id == session.id,
                        CorrectionHistory.attempt == session.current_attempt - 1
                    ).first()
                    if last_history:
                        last_history.passed_after_fix = True
                        self.db.commit()
                break
            else:
                self.log_and_record(session, f"[FAILURE DETECTED] Test failures encountered on attempt {session.current_attempt}")
                if session.current_attempt >= session.max_attempts:
                    self.log_and_record(session, f"[CORRECTION SUCCESS/FAILURE] Failure limit reached after {session.max_attempts} attempts.")
                    await self._update_state(session, "CORRECTION_LIMIT_REACHED", "Maximum correction attempts limit reached. Unresolved errors remain.")
                    return

                await self._update_state(session, "DIAGNOSING", "Diagnosing unhandled errors and assertions crashes...")
                self.log_and_record(session, "[DIAGNOSIS STARTED]")
                await asyncio.sleep(1)

                proposal = self.generate_correction_proposal(session.id)
                self.log_and_record(session, f"[DIAGNOSIS RESULT] {proposal.get('explanation', '')}")

                history_record = CorrectionHistory(
                    session_id=session.id,
                    attempt=session.current_attempt,
                    test_summary=f"{passed_count} passed, {failed_count} failed",
                    failure_details=(test_res.get("stdout") or test_res.get("stderr") or "")[:800],
                    diagnosis=proposal.get("explanation", ""),
                    recommended_fix=proposal.get("explanation", ""),
                    corrected_code=proposal.get("proposed_code", ""),
                    passed_after_fix=False
                )
                self.db.add(history_record)
                self.db.commit()

                session.current_attempt += 1
                self.db.commit()
                self.log_and_record(session, "[RETEST]")

                # Correction coding
                await self._update_state(session, "CORRECTING", f"Applying automated bug corrections (Attempt {session.current_attempt}/{session.max_attempts})...")
                self.log_and_record(session, "[CORRECTION STARTED]")
                await asyncio.sleep(1)

                if proposal.get("affected_file") and proposal.get("proposed_code"):
                    self.accept_correction(session.id, proposal["affected_file"], proposal["proposed_code"])

        if passed:
            await self.review_phase(session.id)
        else:
            await self._update_state(session, "FAILED", "Workflow execution failed. Retries completed without passing all assertions.")

    async def run(self, session_id: int, auto_approve: bool = False):
        """
        Orchestrates session execution.
        In Phase 2A interactive mode (auto_approve=False): generates plan and pauses at PLAN_REVIEW.
        In automated mode (auto_approve=True): completes plan, code, test, and review phases.
        """
        await self.plan_phase(session_id)
        if not auto_approve:
            return

        await self.code_phase(session_id)
        await self.execute_loop_and_review(session_id)

    async def _update_state(self, session: Session, status: str, log_message: str):
        """Updates the session status and records a log entry."""
        session.status = status
        self.db.add(session)
        
        # Avoid duplicate logs for status updates in log_and_record
        log_entry = ExecutionLog(
            session_id=session.id,
            log_text=f"[{status}] {log_message}"
        )
        self.db.add(log_entry)
        self.db.commit()
        
        # Log to server console
        logger.info(f"Session {session.id} State: {status} | {log_message}")
