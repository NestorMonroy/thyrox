#!/usr/bin/env python3
"""Pruebas de ``verify.writer_census`` — TASK-THYROX-0103.

Es la mitad ROJA escrita ANTES del instrumento (TDD): mientras
``src/verify/writer_census.py`` no exista, el import falla y ese fallo es el
resultado que se persiste en el banco.

El defecto que cierra (:ref:`h-thyrox-63`): el censo de escritores por
**literal** —verbo SQL adyacente al nombre de la tabla— publicó ``0
escritores`` sobre ``cleared_tool_results``, que tiene 1952 filas. Su escritor
compone el nombre desde una constante del mismo archivo.

Los cuatro controles, y por qué hacen falta los cuatro:

1. **Positivo REAL, no fabricado** — ``clearedResults.ts`` del árbol. El censo
   por literal ve 0 y el que resuelve constantes tiene que ver 1.
2. **El gemelo** — ``documents``, escrita por literal llano. Los dos censos
   tienen que coincidir. Sin este caso, el 1 del positivo no distingue
   «resolvió la constante» de «cuenta de más».
3. **La prosa no es código** — un docstring que MENCIONA ``INSERT INTO
   cleared_tool_results`` no es un escritor.
4. **Anulación** — con la resolución de constantes retirada cae
   EXACTAMENTE el positivo, el gemelo no se mueve y la prosa sigue en 0.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402
from verify import writer_census as census  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")


def tables_of(hits) -> set[str]:
    return {hit.table for hit in hits}


ROOT = reach.thyrox_root()

#: El archivo REAL del árbol cuyo escritor compone el nombre de la tabla.
COMPOSED = ROOT / "src/packages/observability/src/clearedResults.ts"

print("== 1. CONTROL POSITIVO — el escritor real de nombre compuesto ==")
text = COMPOSED.read_text(encoding="utf-8")
with_resolution = census.write_statements(text, "ts", resolve_constants=True)
without = census.write_statements(text, "ts", resolve_constants=False)
check("el censo por LITERAL no lo ve", set(), tables_of(without))
check("el censo que RESUELVE sí lo ve", {"cleared_tool_results"}, tables_of(with_resolution))

print("\n== 2. EL GEMELO — literal llano: los dos censos coinciden ==")
twin = (
    "conn.execute(\"INSERT INTO documents (path, section) VALUES (?, ?)\", fila)\n"
)
check("resolviendo", {"documents"},
      tables_of(census.write_statements(twin, "py", resolve_constants=True)))
check("sin resolver", {"documents"},
      tables_of(census.write_statements(twin, "py", resolve_constants=False)))

print("\n== 3. La PROSA que menciona la sentencia no es un escritor ==")
prose = (
    '"""Este modulo ya NO hace INSERT INTO cleared_tool_results."""\n'
    "# Antes se escribia con UPDATE documents SET x = 1\n"
)
check("ni el docstring ni el comentario cuentan", set(),
      tables_of(census.write_statements(prose, "py", resolve_constants=True)))

print("\n== 4. ANULACIÓN — retirada la resolución, cae exactamente el positivo ==")
check("el positivo cae a 0", 0,
      len(census.write_statements(text, "ts", resolve_constants=False)))
check("el gemelo NO se mueve", {"documents"},
      tables_of(census.write_statements(twin, "py", resolve_constants=False)))
check("la prosa sigue en 0", 0,
      len(census.write_statements(prose, "py", resolve_constants=False)))

print("\n== 5. La constante tiene que vivir en el MISMO archivo ==")
foreign = "db.run(`INSERT INTO ${TABLA_DE_OTRO_MODULO} (a) VALUES (?)`)\n"
check("sin su declaración, no se inventa la tabla", set(),
      tables_of(census.write_statements(foreign, "ts", resolve_constants=True)))
own = "const TABLA = 'mi_tabla'\ndb.run(`INSERT INTO ${TABLA} (a) VALUES (?)`)\n"
check("con su declaración, resuelve", {"mi_tabla"},
      tables_of(census.write_statements(own, "ts", resolve_constants=True)))

print("\n== 6. El censo del árbol: denominador y cubo de tests ==")
production = census.census(ROOT, include_tests=False)
with_tests = census.census(ROOT, include_tests=True)
check("midió archivos (un 0 sería un verde ciego)", True,
      production.measured > 0)
check("ve la tabla de nombre compuesto", True,
      "cleared_tool_results" in production.by_table)
check("los tests se excluyen por defecto y suman al incluirlos", True,
      with_tests.measured > production.measured)

print("\n== 7. La CLI: rehúsa sin poder medir, y no emite conteo ==")


def run(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(ROOT / "bin/writer_census"), *args],
        capture_output=True, text=True, cwd=str(ROOT))


output = run("--root", str(ROOT))
check("publica su alcance medido", True, "alcance medido" in output.stdout)
with tempfile.TemporaryDirectory() as empty:
    refuses = run("--root", empty)
    check("sin nada que medir, exit 2", 2, refuses.returncode)
    check("y NO emite conteo", True, "escritor" not in refuses.stdout)

print(f"\nresultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
