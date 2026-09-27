#!/usr/bin/env python3
"""El ledger de trabajos cae en el CONSUMIDOR desde el que se invoca (H-THYROX-179).

`ledger_root()` componía siempre sobre `thyrox_root()`: `wait-jobs`,
`run-task-pool` y `thyrox-bg register` lanzados desde `ai-course-notes`
escribían en `<thyrox>/.claude/jobs-ledger/`, y el adaptador de ese clon tuvo
que declarar `THYROX_JOBS_LEDGER_DIR` para evitarlo.

Qué haría fallar a estos casos:

1. seguir componiendo sobre el proveedor (cae el 1);
2. tratar como consumidor un directorio fuera de un clon (cae el 2);
3. ignorar la clave declarada (cae el 3).
"""

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402
from session.job_ledger import LEDGER_DIR_VAR, ledger_root  # noqa: E402

KEYS = (LEDGER_DIR_VAR, reach.ENV_FILE_VAR, "THYROX_STATE_DIR")


class LedgerHomeConsumer(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        base = Path(self._tmp.name)
        self.clone = base / "ai-course-notes"
        (self.clone / "tools").mkdir(parents=True)
        subprocess.run(["git", "init", "-q", str(self.clone)], check=True)
        self.outside = base / "fuera"
        self.outside.mkdir()
        self._cwd = Path.cwd()
        self._saved = {k: os.environ.pop(k, None) for k in KEYS}

    def tearDown(self):
        os.chdir(self._cwd)
        for k, v in self._saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        self._tmp.cleanup()

    def test_1_from_a_consumer_the_ledger_lives_in_it(self):
        os.chdir(self.clone / "tools")
        self.assertTrue(ledger_root().is_relative_to(self.clone.resolve()))

    def test_2_outside_a_clone_it_stays_in_the_provider(self):
        os.chdir(self.outside)
        self.assertTrue(ledger_root().is_relative_to(reach.thyrox_root().resolve()))

    def test_3_a_declared_home_still_wins(self):
        os.chdir(self.clone)
        declared = Path(self._tmp.name) / "declarado"
        os.environ[LEDGER_DIR_VAR] = str(declared)
        self.assertEqual(ledger_root(), declared)


if __name__ == "__main__":
    unittest.main()
