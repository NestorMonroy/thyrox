#!/usr/bin/env python3
"""Control del reconciliador de archivos sueltos de ``~/.claude``.

Lo que tiene que poder fallar, y por eso se prueba: la **tercera rama**. Un
parche que arregla lo que encuentre convierte una actualización del cliente en
un archivo mutilado sin aviso; éste rehúsa con código 2. El control de anulación
retira esa rama y comprueba que caen exactamente las aserciones que dependen de
ella — ni una más.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
SCRIPT = ROOT / "src/session/reconcile_user_hooks.py"

ROTO = '''#!/bin/bash
# ... Unverified (missing signature, or committer email is not noreply@anthropic.com)
      while read -r sha ce; do
        if [[ "$ce" != "noreply@anthropic.com" ]] ||
           ! git cat-file commit "$sha" 2>/dev/null | grep -qE '^gpgsig '; then
          unverifiable+="$sha"
        fi
      done
        echo "There are commit(s) that GitHub will show as Unverified (missing signature, or committer email is not noreply@anthropic.com):" >&2
        echo "Please run 'git config user.email noreply@anthropic.com && git config user.name Claude', then 'git commit --amend --no-edit --reset-author' for the tip commit." >&2
'''

DESCONOCIDA = '''#!/bin/bash
# el cliente reescribió esto y ya no se parece a ninguna forma conocida
while read -r sha ce; do
  if verify_somehow "$sha"; then echo gpgsig; fi
done
'''

passed = failed = 0


def check(label: str, condition: bool) -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}")


def run(directory: pathlib.Path, *extra: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--dir", str(directory), *extra],
        capture_output=True, text=True)


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = pathlib.Path(tmp)

        # caso 1 — la forma defectuosa se detecta y se transforma
        d1 = base / "roto"; d1.mkdir()
        target = d1 / "stop-hook-git-check.sh"
        target.write_text(ROTO)
        r = run(d1, "--check")
        check("la forma defectuosa se reporta como pendiente", r.returncode == 1)
        check("y --check NO escribe", target.read_text() == ROTO)
        r = run(d1)
        fixed = target.read_text()
        check("aplicar sale 0", r.returncode == 0)
        check("retira la condición de identidad",
              '"$ce" != "noreply@anthropic.com"' not in fixed)
        check("retira el consejo de poner a Claude como committer",
              "git config user.name Claude" not in fixed)
        check("retira --reset-author", "--reset-author" not in fixed)
        check("conserva la mitad que SÍ mide (la firma)", "gpgsig" in fixed)

        # caso 2 — idempotente: correr sobre lo ya aplicado no cambia nada
        r = run(d1)
        check("segunda pasada sale 0", r.returncode == 0)
        check("y no vuelve a escribir", target.read_text() == fixed)
        check("se reporta como ya aplicado", "ya está" in r.stdout)

        # caso 3 — LA RAMA QUE IMPORTA: forma desconocida, rehúsa sin tocar
        d3 = base / "desconocida"; d3.mkdir()
        otro = d3 / "stop-hook-git-check.sh"
        otro.write_text(DESCONOCIDA)
        r = run(d3)
        check("una forma desconocida rehúsa con código 2", r.returncode == 2)
        check("y NO la toca", otro.read_text() == DESCONOCIDA)
        check("y dice por qué", "DESCONOCIDA" in r.stdout)

        # caso 4 — el archivo ausente no es un defecto ni un verde falso
        d4 = base / "vacia"; d4.mkdir()
        r = run(d4, "--check")
        check("un objetivo ausente sale 0 y se declara", r.returncode == 0)
        check("y lo nombra como AUSENTE", "AUSENTE" in r.stdout)

        # caso 5 — un directorio inexistente rehúsa en vez de publicar un 0
        r = run(base / "no-existe", "--check")
        check("un directorio inexistente rehúsa con 2", r.returncode == 2)
        check("y NO emite conteo", "verde falso" in r.stderr)

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: {SCRIPT.name})")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
