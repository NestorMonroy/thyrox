"""El backfill de hallazgos escribe donde lo desvía ``AGENT_STORE_CLAUDE_DIR``.

Es el tercer paso del hook de cierre de turno (``reconcile-store-on-stop.sh``),
junto a ``drain_spool.py`` y ``reconcile_store.py``, y los otros dos ya
respetan esa variable. ``tests/agents/test-carrete-store.sh`` desvía el hook
con ella y el backfill escribía igual en el store VERSIONADO del proveedor:
la fila de H-THYROX-146 reescrita tras cada suite (H-THYROX-164), localizada
recorriendo las suites una a una con el sha1 del store.

Qué haría fallar a estos casos: que el backfill ignore la variable (cae el
destino desviado y el store real cambia).
"""
from __future__ import annotations

import hashlib
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "src" / "corpus" / "backfill_findings_history.py"
REAL = ROOT / "agent-results" / "agent_store.sqlite3"


def _sha1(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest() if path.is_file() else ""


class BackfillStoreDestination(unittest.TestCase):
    def setUp(self):
        docs = ROOT.parent / "kaupamex-docs" / "source" / "gestion" / "pm"
        if not docs.is_dir():
            self.skipTest("sin el corpus de hallazgos del consumidor")

    def test_agent_store_claude_dir_diverts_the_write(self):
        before = _sha1(REAL)
        with tempfile.TemporaryDirectory() as tmp:
            env = dict(os.environ, AGENT_STORE_CLAUDE_DIR=tmp,
                       PYTHONPATH=str(ROOT / "src"))
            env.pop("THYROX_STORE", None)
            run = subprocess.run([sys.executable, str(SCRIPT)], env=env,
                                 capture_output=True, text=True, timeout=120)
            self.assertEqual(run.returncode, 0, run.stderr[-800:])
            db = Path(tmp) / "agent-results" / "agent_store.sqlite3"
            self.assertTrue(db.is_file(), "el destino desviado no recibió el store")
            rows = sqlite3.connect(db).execute(
                "select count(*) from findings_history").fetchone()[0]
            self.assertGreater(rows, 0)
        self.assertEqual(_sha1(REAL), before, "el store versionado cambió")


if __name__ == "__main__":
    unittest.main()
