"""Pruebas de ``session.instruction_floor`` — cuánto se carga antes de trabajar.

Los casos que DISCRIMINAN:

- **2** — una regla con ``paths:`` NO entra al piso. Es el eje entero: el piso
  es lo que carga **incondicionalmente**, y una regla condicional sólo pesa en
  las sesiones que tocan su glob. Contarlas juntas publicaría un piso mayor que
  el real y borraría la única señal de avance que hay.
- **3** — ``paths:`` cuenta sólo en el frontmatter, no en el cuerpo. Una regla
  que MENCIONA ``paths:`` en su prosa —como hace ``thyrox-invariants``, que
  explica el campo— sigue cargando siempre.
- **5** — los tokens se publican como ESTIMACIÓN con su divisor nombrado. Los
  bytes se miden; los tokens no, y presentarlos como medidos sería una cifra
  sin verificar.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session import instruction_floor as fl  # noqa: E402

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


def make_clone(tmp: Path, name: str, rules: dict[str, str], claude_md: str = "") -> Path:
    root = tmp / name
    (root / ".claude" / "rules").mkdir(parents=True)
    for filename, body in rules.items():
        (root / ".claude" / "rules" / filename).write_text(body)
    if claude_md:
        (root / "CLAUDE.md").write_text(claude_md)
    return root


with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)

    print("== 1. mide bytes y archivos de las reglas más el CLAUDE.md ==")
    clon = make_clone(raiz, "uno", {"a.md": "x" * 100, "b.md": "y" * 50}, claude_md="z" * 10)
    piso = fl.floor_of(clon)
    check("dos reglas", 2, piso.always_loaded)
    check("bytes = 100 + 50 + 10", 160, piso.bytes)
    check("ninguna condicional", 0, piso.conditional)

    print("== 2. una regla con paths: NO entra al piso ==")
    clon = make_clone(raiz, "dos", {
        "siempre.md": "x" * 100,
        "acotada.md": "---\npaths:\n  - 'src/**'\n---\n" + "y" * 50,
    })
    piso = fl.floor_of(clon)
    check("una siempre-cargada", 1, piso.always_loaded)
    check("una condicional", 1, piso.conditional)
    check("los bytes de la condicional no suman", 100, piso.bytes)

    print("== 3. paths: en el CUERPO no la hace condicional ==")
    clon = make_clone(raiz, "tres", {
        # 16 + 84 = 100 bytes exactos: el conteo del caso 6 no se adivina.
        "explica.md": "paths: en prosa\n" + "x" * 84,
    })
    piso = fl.floor_of(clon)
    check("sigue cargando siempre", 1, piso.always_loaded)
    check("y no cuenta como condicional", 0, piso.conditional)

    print("== 4. un clon sin .claude/rules da un piso vacío, no una excepción ==")
    vacio = raiz / "sin-reglas"
    vacio.mkdir()
    piso = fl.floor_of(vacio)
    check("ceros", (0, 0, 0), (piso.always_loaded, piso.conditional, piso.bytes))

    print("== 5. los tokens son ESTIMACIÓN, con su divisor nombrado ==")
    check("divisor declarado", 4, fl.BYTES_PER_TOKEN)
    check("400 bytes ~ 100 tokens", 100, fl.estimated_tokens(400))

    print("== 6. el barrido suma los clones y conserva el detalle por clon ==")
    encuesta = fl.survey([raiz / "uno", raiz / "dos", raiz / "tres", raiz / "sin-reglas"])
    check("cuatro filas", 4, len(encuesta.floors))
    check("bytes totales 160+100+100", 360, encuesta.bytes)
    check("siempre-cargadas totales", 4, encuesta.always_loaded)
    check("condicionales totales", 1, encuesta.conditional)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
