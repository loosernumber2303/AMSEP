import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.synthesizer import synthesize_plan, synthesize_files

req = "Build a personal inventory application where products can be added, stock quantities updated, low-stock products identified, and products searched."

plan = synthesize_plan(req)
print("=== PLAN FOR INVENTORY ===")
print("Title:", plan.get("project_title"))
for fr in plan.get("functional_requirements", []):
    print("  -", fr)

files = synthesize_files(req, plan)
print("\n=== FILES GENERATED FOR INVENTORY ===")
for f in files:
    print(f"\n--- {f['path']} ---")
    for line in f['content'].splitlines():
        if line.strip().startswith("def ") or line.strip().startswith("class "):
            print(" ", line)
