import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.synthesizer import synthesize_plan, synthesize_files

req = "Build a selection sort application"
plan = synthesize_plan(req)
print("=== PLAN FOR SELECTION SORT ===")
print(json.dumps(plan, indent=2))

files = synthesize_files(req, plan)
print("\n=== FILES FOR SELECTION SORT ===")
for f in files:
    print(f"PATH: {f['path']}")
    print(f['content'])
