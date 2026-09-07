#!/usr/bin/env python3
"""Control de `src/packages/agent/bin/recommend.ts` — la puerta al recomendador.

Lo que tiene que poder fallar, y por eso es el caso central: **la rehusa ante
una clase desconocida**. Un CLI que ante un argumento que no entiende devuelve
la recomendación por defecto es peor que no tenerlo: publica una elección que
nadie midió, con la autoridad de una herramienta. El control comprueba que no
sólo sale 2, sino que **no nombra ningún modelo** — porque un exit 2 que aun
así imprime un candidato deja al operador copiándolo.
"""
from __future__ import annotations

import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
CLI = ROOT / "src/packages/agent/bin/recommend.ts"

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def run(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["bun", "run", str(CLI), *args],
                          capture_output=True, text=True,
                          cwd=str(CLI.parent.parent))


def main() -> int:
    KINDS = ("mecanica", "analisis", "adversarial", "frontera")

    # --- las cuatro clases responden, y su respuesta trae lo que decide ----
    for kind in KINDS:
        r = run(kind)
        check(f"«{kind}» sale 0", r.returncode == 0, r.stderr[:120])
        check(f"«{kind}» nombra un modelo del catálogo",
              "claude-" in r.stdout)
        check(f"«{kind}» declara su esfuerzo",
              "esfuerzo" in r.stdout)
        check(f"«{kind}» publica su denominador",
              "excluido(s) con razón" in r.stdout)

    # --- el orden cambia con el contexto: no es una constante disfrazada ---
    chico = run("adversarial", "--context", "20000").stdout
    grande = run("adversarial", "--context", "800000").stdout
    check("el contexto entra en la cifra", chico != grande)

    # --- LA RAMA QUE IMPORTA: clase desconocida, sin recomendación ---------
    r = run("una-clase-que-no-existe")
    check("una clase desconocida rehúsa con 2", r.returncode == 2, str(r.returncode))
    check("y NO nombra ningún modelo (no hay default)",
          "claude-" not in r.stdout, r.stdout[:120])
    check("y dice por qué", "no es una clase" in r.stderr)

    # --- el contexto inválido tampoco cae a un default --------------------
    for malo in ("0", "-5", "no-es-un-numero"):
        r = run("analisis", "--context", malo)
        check(f"--context {malo} rehúsa con 2", r.returncode == 2)
        check(f"--context {malo} no recomienda nada", "claude-" not in r.stdout)

    # --- la salida legible por otro guion ---------------------------------
    r = run("frontera", "--json")
    check("--json sale 0", r.returncode == 0)
    import json
    try:
        d = json.loads(r.stdout)
        check("--json es JSON válido con su modelo y sus excluidos",
              "model" in d and "excluded" in d and "effort" in d)
    except json.JSONDecodeError as error:
        check("--json es JSON válido", False, str(error))

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: {CLI.name})")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
