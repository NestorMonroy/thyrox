"""Pruebas de ``check_execution_authorization``: materializar una unidad por la
primitiva SIN ``ExecutionAuthorization`` es la segunda ruta.

RED es la forma real que tenían el daemon y el laboratorio de cuantización en
``HEAD`` antes de migrar; GREEN, la misma llamada por ``runExecution``.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GATE = ROOT / "src" / "verify" / "check_execution_authorization.py"
OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def tree(files: dict[str, str]) -> Path:
    base = Path(tempfile.mkdtemp(prefix="execution-authorization-"))
    (base / "src").mkdir()
    for relative, text in files.items():
        path = base / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    return base


def gate(base: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(GATE), "--root", str(base), "--strict"], capture_output=True, text=True)


print("== RED: la forma de HEAD ==")
daemon = tree({"src/packages/daemon/src/podman/podmanWorkerManager.ts": "      await materializeContainer(podman, spec)\n"})
ran = gate(daemon)
check("el daemon materializando con un spec falla", 1, ran.returncode)
check("y nombra la línea", True, "podmanWorkerManager.ts:1" in ran.stdout)
lab = tree({"src/packages/local-models/quantizationLab.ts": "const output = await runJobWithOutput(this.podman, this.specOf(step))\n"})
check("el laboratorio corriendo un spec falla", 1, gate(lab).returncode)

print("== GREEN: la misma ejecución autorizada ==")
authorized = tree({"src/packages/local-models/quantizationLab.ts": "const output = await runExecution(this.podman, this.authorizationOf(step))\n"})
check("runExecution(autorización) pasa", 0, gate(authorized).returncode)

print("== lo que no cuenta ==")
quiet = tree({"src/packages/podman-execution/executionAuthorization.ts": "return materializeContainer(podman, spec)\n",
              "src/packages/daemon/src/__tests__/m.test.ts": "await materializeContainer(fake, spec)\n",
              "src/packages/daemon/src/doc.ts": "// materializeContainer(podman, spec) era la ruta vieja\n"})
check("el dueño, las pruebas y los comentarios no cuentan", 0, gate(quiet).returncode)

print(f"\n{OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
