#!/usr/bin/env python3
"""Control del gate que rechaza una clase de bytes en herramienta de byte.

Es la mitad ROJA escrita ANTES del gate (TDD): mientras
``src/gates/check_byte_oriented_class.py`` no exista, la primera asercion
falla y ese fallo es el resultado que se persiste.

Que haria fallar a este control (sub-patron D de
``metrica-decide-la-conclusion.md``):

1. Que el gate NO vea el control positivo — que no esta fabricado, es la
   linea viva de ``count-requirements.sh``, medida contando 1 donde hay 2.
2. Que marque un ``.py``: su motor opera sobre CARACTERES y no tiene el
   defecto. Marcarlo seria ruido que entrena a ignorar el gate.
3. Que marque los dos arreglos validos —alternancia y locale declarado—,
   con lo que no habria salida del rojo.
4. Que publique un conteo sin denominador: con el alcance oculto, un
   instrumento ciego y uno correcto publican la misma cifra.
"""
import pathlib
import subprocess
import sys
import tempfile

THYROX = pathlib.Path(__file__).resolve().parents[2]
GATE = THYROX / "src" / "gates" / "check_byte_oriented_class.py"

PASS = FAIL = 0


def check(label, expected, actual):
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  ok   {label}")
    else:
        FAIL += 1
        print(f"  FAIL {label}\n       esperado: {expected!r}\n       obtenido: {actual!r}")


def run(root, *args):
    return subprocess.run(
        [sys.executable, str(GATE), "--root", str(root), *args],
        capture_output=True, text=True,
    )


check("el gate existe", True, GATE.is_file())
if not GATE.is_file():
    print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
    sys.exit(1)

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)

    # 1. Control positivo REAL: la linea viva de count-requirements.sh.
    (root / "count.sh").write_text(
        '#!/usr/bin/env bash\n'
        'N=$(count_state "En an[aá]lisis|In analysis|Under review")\n',
        encoding="utf-8")
    positivo = run(root)
    check("ve el control positivo real del repo",
          True, "count.sh" in positivo.stdout)
    check("y CITA la clase que rechaza", True, "[a" in positivo.stdout)
    check("--strict sale 1 con un incumplidor", 1, run(root, "--strict").returncode)
    check("sin --strict sale 0 (surfacing)", 0, positivo.returncode)

    # 2. Python opera sobre caracteres: NO es defecto.
    (root / "ok.py").write_text(
        "import re\nPAT = re.compile('an[aá]lisis')\n", encoding="utf-8")
    check("NO marca un .py, cuyo motor es de caracter",
          False, "ok.py" in run(root).stdout)

    # 3. Los dos arreglos validos salen del rojo.
    (root / "fixed.sh").write_text(
        '#!/usr/bin/env bash\ngrep -cE "an(a|á)lisis" x\n', encoding="utf-8")
    check("NO marca la alternancia, que es el arreglo",
          False, "fixed.sh" in run(root).stdout)

    (root / "loc.sh").write_text(
        '#!/usr/bin/env bash\nexport LC_ALL=C.UTF-8\ngrep -cE "an[aá]lisis" x\n',
        encoding="utf-8")
    check("NO marca un guion que declara su locale UTF-8",
          False, "loc.sh" in run(root).stdout)

    # 4. El denominador, sin el cual el conteo no es resultado.
    check("publica su DENOMINADOR junto al conteo",
          True, "alcance medido" in run(root).stdout)

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    (root / "limpio.sh").write_text("#!/usr/bin/env bash\necho ok\n", encoding="utf-8")
    limpio = run(root, "--strict")
    check("un arbol limpio sale 0 incluso con --strict", 0, limpio.returncode)
    check("y el denominador NO miente en el arbol limpio",
          True, "alcance medido: 1" in limpio.stdout)

print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
sys.exit(1 if FAIL else 0)
