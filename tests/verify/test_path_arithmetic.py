#!/usr/bin/env python3
"""Pruebas de ``verify.check_path_arithmetic`` — tarea #228.

Es la mitad ROJA escrita ANTES del gate (TDD): mientras
``src/verify/check_path_arithmetic.py`` no exista, la primera aserción falla y
ese fallo es el resultado que se persiste (ver el banco de evidencia).

Qué cubre cada bloque, y por qué existe:

1. **El árbol real, medido contra el baseline declarado.** Los dos únicos
   incumplidores del árbol de hoy son EXACTAMENTE los que
   ``path_arithmetic_baseline.txt`` congela, cada uno con su razón escrita en
   el propio código. Es evidencia real, no fabricada.
2. **El control positivo NO se fabrica.** Es la línea que
   ``tests/verify/test_byte_class_gate.py`` llevaba ANTES del arreglo de esta
   misma tarea — leída con ``git show HEAD~N`` — reproducida en un árbol
   sintético.
3. **El gemelo — el arreglo válido no marca nada.** Misma línea, con el
   ``sys.path.insert`` que la envuelve. Sin este bloque, el bloque 2 no
   probaría que el gate discrimina la FORMA y no el mero literal
   ``parents[`` (sub-patrón D de ``metrica-decide-la-conclusion.md``).
4. **El bootstrap admitido en DOS líneas** — variable, y la inserción en la
   línea siguiente. Es el patrón que la mayoría de los archivos de este
   propio repo usan, y que un gate ingenuo (que sólo mirara el enclosing
   `Call` inmediato) NO reconocería.
5. **La mención en PROSA no cuenta** — ni un docstring ni una cadena de
   prueba que *hable* de ``parents[3]`` es código.
6. **Denominador y rehúse** — publica su alcance medido, y sin ninguna de las
   tres raíces rehúsa con exit 2 sin emitir conteo.
7. **--strict / baseline / --quiet** — el ciclo completo de vida del gate.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402
from verify import check_path_arithmetic as gate  # noqa: E402

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


def run(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "verify.check_path_arithmetic", *args],
        capture_output=True, text=True, cwd=str(reach.thyrox_root() / "src"),
    )


def fake_tree(tmp: Path, relpath: str, body: str) -> Path:
    """Un árbol con un archivo `.py` bajo `tests/`, con el cuerpo dado."""
    target = tmp / "tests" / relpath
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body, encoding="utf-8")
    return tmp


#: La línea REAL que `tests/verify/test_byte_class_gate.py` llevaba antes del
#: arreglo de esta misma tarea (#228) — leída con `git show`, no fabricada.
LINEA_VIEJA_REAL = (
    "import pathlib\n"
    "import sys\n"
    "\n"
    "THYROX = pathlib.Path(__file__).resolve().parents[2]\n"
    "GATE = THYROX / 'src' / 'gates' / 'check_byte_oriented_class.py'\n"
)

#: El mismo archivo, YA arreglado — mismo literal `parents[2]`, ahora
#: alimentando un `sys.path.insert`.
LINEA_ARREGLADA = (
    "import pathlib\n"
    "import sys\n"
    "\n"
    "sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'src'))\n"
)


print("== 1. el árbol real, contra el baseline declarado ==")
found, measured = gate.measure(reach.thyrox_root())
check("midió archivos (un 0 aquí sería un verde ciego)", True, measured > 0)
esperados = {"tests/verify/test_rst_gate_root.py:57",
             "tests/legacy/test_error_catalog.py:49"}
check("son EXACTAMENTE los dos del baseline declarado, ninguno más",
      esperados, set(found))

print("\n2. CONTROL POSITIVO — la línea REAL que el árbol tenía antes de #228")
with tempfile.TemporaryDirectory() as d:
    tmp = fake_tree(Path(d).resolve(), "probe.py", LINEA_VIEJA_REAL)
    hallados, _ = gate.measure(tmp)
    check("marca la aritmética vieja", ["tests/probe.py:4"], hallados)

print("\n3. El GEMELO — la misma línea, ya arreglada, NO se marca")
with tempfile.TemporaryDirectory() as d:
    tmp = fake_tree(Path(d).resolve(), "probe.py", LINEA_ARREGLADA)
    hallados, _ = gate.measure(tmp)
    check("el bootstrap admitido no genera hallazgo", [], hallados)

print("\n4. El bootstrap partido en DOS líneas SÍ se marca")
# No basta con que la aritmética alimente un `sys.path.insert` DOS líneas
# después: el statement que la contiene es un `Assign`, no la llamada — y
# ES el patrón que el barrido de #228 reemplazó en la mayoría de los
# archivos que tocó (test_config_precedence.py, test_rst_gate_root.py, …).
# Admitirlo aquí habría dejado esos sitios sin gate.
with tempfile.TemporaryDirectory() as d:
    tmp = fake_tree(Path(d).resolve(), "probe.py",
                     "import sys\nimport pathlib\n"
                     "RAIZ = pathlib.Path(__file__).resolve().parents[2]\n"
                     "sys.path.insert(0, str(RAIZ / 'src'))\n")
    hallados, _ = gate.measure(tmp)
    check("variable-y-luego-insert SÍ genera hallazgo", ["tests/probe.py:3"], hallados)

print("\n5. La mención en PROSA no es un uso")
with tempfile.TemporaryDirectory() as d:
    tmp = fake_tree(Path(d).resolve(), "probe.py",
                     '"""Este módulo ya NO usa parents[3] para nada."""\n'
                     "import pathlib\n")
    hallados, _ = gate.measure(tmp)
    check("el docstring que lo menciona no cuenta", [], hallados)

print("\n6. Denominador y rehúse")
r = run("--root", str(reach.thyrox_root()))
check("publica su alcance medido", True, "alcance medido" in r.stdout)
check("exit 0 con sólo lo congelado", 0, r.returncode)
with tempfile.TemporaryDirectory() as d:
    r_vacio = run("--root", d)
    check("sin ninguna raíz medible, exit 2", 2, r_vacio.returncode)
    check("y NO emite conteo en stdout", True,
          "incumplidor" not in r_vacio.stdout)

print("\n7. --strict / baseline / --quiet")
with tempfile.TemporaryDirectory() as d:
    tmp = fake_tree(Path(d).resolve(), "probe.py", LINEA_VIEJA_REAL)
    r_sin_strict = run("--root", str(tmp), "--baseline", str(Path(d) / "vacio.txt"))
    check("sin --strict, un incumplidor nuevo NO bloquea", 0, r_sin_strict.returncode)
    check("pero se nombra en la salida", True, "probe.py:4" in r_sin_strict.stdout)

    r_strict = run("--root", str(tmp), "--baseline", str(Path(d) / "vacio.txt"), "--strict")
    check("con --strict, el incumplidor nuevo bloquea", 1, r_strict.returncode)

    baseline = Path(d) / "congelado.txt"
    r_write = run("--root", str(tmp), "--baseline", str(baseline), "--write-baseline")
    check("--write-baseline sale 0", 0, r_write.returncode)
    check("y congela la entrada", True, "tests/probe.py:4" in baseline.read_text())

    r_congelado = run("--root", str(tmp), "--baseline", str(baseline), "--strict")
    check("congelada, la deuda heredada NO bloquea", 0, r_congelado.returncode)

    r_quiet = run("--root", str(tmp), "--baseline", str(Path(d) / "vacio.txt"), "--quiet")
    check("--quiet publica sólo el conteo, pelado", "1", r_quiet.stdout.strip())

print(f"\nresultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
