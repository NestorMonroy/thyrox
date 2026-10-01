#!/usr/bin/env python3
"""Control de `src/verify/check_test_home_isolation.py`.

Qué haría fallar a este control:
- no reconocer la asignación en shell (`export THYROX_JOBS_DIR=`) o en Python
  (`os.environ["THYROX_CACHE_DIR"] =`): una suite sin aislar pasaría;
- aceptar como aislada una suite que sólo exporta la global;
- no reconocer el aislador, `THYROX_ENV_FILE` o la exención declarada;
- medir archivos fuera de `tests/`.

Control positivo real del árbol: la versión de `tests/session/test-bg-live-log.sh`
anterior al aislador, que dejó tres ejecuciones en `.claude/jobs/`.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from verify import check_test_home_isolation as gate

ROOT = Path(__file__).resolve().parents[2]
passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name}\n        esperado={expected!r} obtenido={obtained!r}")


assert_equal("shell que sólo exporta la global: sin aislar",
             ["THYROX_JOBS_DIR"], gate.unisolated_keys('export THYROX_JOBS_DIR="$TMP/jobs"\n'))
assert_equal("python que sólo asigna la global: sin aislar",
             ["THYROX_CACHE_DIR"], gate.unisolated_keys('os.environ["THYROX_CACHE_DIR"] = str(d)\n'))
assert_equal("con el aislador: aislada", [],
             gate.unisolated_keys('source src/lib/test_homes.sh\nthyrox_isolate_homes "$TMP"\n'
                                  'export THYROX_JOBS_DIR="$TMP/jobs"\n'))
assert_equal("con THYROX_ENV_FILE declarado: aislada", [],
             gate.unisolated_keys('export THYROX_ENV_FILE="$TMP/e"\nexport THYROX_WORKBENCH_DIR="$TMP/w"\n'))
assert_equal("con la exención declarada: no se marca", [],
             gate.unisolated_keys('# home-isolation-exempt: prueba la precedencia\nTHYROX_JOBS_DIR=x\n'))
assert_equal("una lectura de la clave no es una asignación", [],
             gate.unisolated_keys('echo "$THYROX_JOBS_DIR"\nif [[ -n $THYROX_JOBS_DIR ]]; then :; fi\n'))
assert_equal("sólo se miden archivos de tests/", (True, False, False),
             (gate.is_test_file("tests/session/x.sh"), gate.is_test_file("src/session/x.sh"),
              gate.is_test_file("tests/session/README.md")))

old = subprocess.run(["git", "-C", str(ROOT), "show", "845e3e47f:tests/session/test-bg-live-log.sh"],
                     capture_output=True, text=True).stdout
assert_equal("control positivo real: la suite que filtró a .claude/jobs se marca",
             ["THYROX_JOBS_DIR"], gate.unisolated_keys(old))
current = (ROOT / "tests/session/test-bg-live-log.sh").read_text()
assert_equal("la suite corregida ya no se marca", [], gate.unisolated_keys(current))

print(f"test_check_test_home_isolation: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
