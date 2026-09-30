import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.database import SessionLocal
from app.models import Session
from app.synthesizer import synthesize_plan, synthesize_files

def inspect_recent_sessions():
    db = SessionLocal()
    print("=== RECENT SESSIONS IN DATABASE ===")
    sessions = db.query(Session).order_by(Session.id.desc()).limit(5).all()
    for s in sessions:
        print(f"Session ID {s.id}: Status={s.status}")
        print(f"  Requirement: {s.requirement}")
        print(f"  Files: {[f.path for f in s.files]}")
    db.close()

def inspect_library_requirement():
    req = "Build a library management application where users can add books, search books by title or author, issue books to students, return books, and display currently issued books."
    print("\n=== STEP 1: PLANNER OUTPUT FOR LIBRARY REQUIREMENT ===")
    plan = synthesize_plan(req)
    print("Plan Title:", plan.get("project_title"))
    print("Functional Requirements:")
    for fr in plan.get("functional_requirements", []):
        print(f"  - {fr}")
    print("Implementation Steps:")
    for step in plan.get("implementation_steps", []):
        print(f"  - {step}")
    print("Testing Requirements:")
    for tr in plan.get("testing_requirements", []):
        print(f"  - {tr}")

    print("\n=== STEP 2: CODER SYNTHESIZED CODE FOR LIBRARY REQUIREMENT ===")
    files = synthesize_files(req, plan)
    for f in files:
        print(f"\n--- FILE: {f['path']} ---")
        lines = f['content'].splitlines()
        for line in lines:
            if line.strip().startswith("def ") or line.strip().startswith("class "):
                print(f"  {line}")

if __name__ == "__main__":
    inspect_recent_sessions()
    inspect_library_requirement()
