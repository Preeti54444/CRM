"""Wrapper to run the actual server located in `public/simple_server.py`.
This allows the existing `start-crm.bat` to run `python simple_server.py` from
the `frontend` directory as intended.
"""
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "public" / "simple_server.py"

if __name__ == "__main__":
    if not TARGET.exists():
        raise SystemExit(f"Missing target server script: {TARGET}")
    runpy.run_path(str(TARGET), run_name="__main__")
