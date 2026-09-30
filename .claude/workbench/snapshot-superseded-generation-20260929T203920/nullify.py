"""Control de anulación: la suite con take_snapshot sin rehusar la generación desplazada."""
import functools
import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "src"))
from session import snapshot_store as ss  # noqa: E402

original = ss.take_snapshot
ss.take_snapshot = functools.partial(original, refuse_superseded=False)
runpy.run_path(str(ROOT / "tests/session/test_snapshot_recovery.py"), run_name="__main__")
