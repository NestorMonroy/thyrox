"""Suite del detector de reemplazo literal hecho con regex o con Python.

El defecto
----------
Un texto FIJO se reemplazaba con ``perl -i``, ``sed -i`` o un heredoc de
Python. Los dos primeros leen el texto como regex —hay que escapar ``$``,
``{`` y ``.``— y, con comillas anidadas, el comando se rompe antes de
ejecutarse (2026-09-25, ``wait-jobs.sh``). ``bin/replace_literal`` hace lo
mismo con ``index()`` y ``ENVIRON``, sin escapar nada.

Las dos mitades de juicio, cada una con su anulación
----------------------------------------------------
- **Edición en el sitio**: un ``perl -pe`` que filtra a stdout no reescribe
  un archivo; sólo ``-i``, ``sed -i`` o ``write_text`` lo hacen.
- **Intención literal**: un patrón con construcciones de regex de verdad
  (clases, grupos, cuantificadores, alternancia, anclas, ``\\d``) calla —ahí
  la regex es la herramienta correcta—; uno sin ellas, o con sus
  metacaracteres ESCAPADOS, pide un texto fijo.

Los positivos son comandos reales de esta sesión, no fabricados.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_literal_replacement.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLA {label} — esperado {expected!r}, obtenido {obtained!r}")
        FAILED += 1


def warns(command: str) -> bool:
    return bool(gate.detect({"tool_name": "Bash", "tool_input": {"command": command}}))


# Positivos reales de la sesión.
PERL_BRACES = ("perl -0 -i -pe 's{LEDGER=\"\\$\\{THYROX_JOBS_DIR:-\\$\\{KX_TRABAJOS_DIR:-"
               "\\$_ROOT/\\.claude/jobs-ledger/\\$_SESSION\\}\\}\"}{LEDGER=x}' src/session/wait-jobs.sh")
PYTHON_HEREDOC = ("python3 - <<'PY'\nfrom pathlib import Path\np = Path(\"src/verify/pool_pipeline.py\")\n"
                  "t = p.read_text()\nt = t.replace(old, new, 1)\np.write_text(t)\nPY")
check("perl -i con s{…}{…} y metacaracteres escapados avisa", True, warns(PERL_BRACES))
check("un heredoc de Python con .replace y write_text avisa", True, warns(PYTHON_HEREDOC))
check("sed -i con un punto escapado avisa", True, warns("sed -i 's/foo\\.bar/baz/' f.txt"))
check("perl -i con un literal sin metacaracteres avisa", True, warns("perl -i -pe 's/viejo/nuevo/g' f.txt"))

# Mitad 1 — edición en el sitio.
check("perl -pe a stdout no reescribe un archivo: calla", False, warns("perl -pe 's/viejo/nuevo/g' f.txt"))
check("un heredoc de Python sin write_text calla", False,
      warns("python3 - <<'PY'\nprint('a'.replace('a', 'b'))\nPY"))

# Mitad 2 — intención literal.
check("sed -i con una clase de caracteres calla", False, warns("sed -i 's/[0-9]\\+/N/' f.txt"))
check("perl -i con un grupo y cuantificador calla", False, warns("perl -i -pe 's/(\\d+)px/$1em/g' f.css"))
check("perl -i anclado a la línea calla", False,
      warns("perl -i.bak -pe 's/^    if excluded:$/    if False and excluded:/' x.py"))

# Fuera de familia.
check("un re.sub de Python no es .replace: calla", False,
      warns("python3 - <<'PY'\nimport re, pathlib\np=pathlib.Path('x')\np.write_text(re.sub('a','b',p.read_text()))\nPY"))
check("bin/replace_literal no se avisa a sí mismo", False,
      warns("OLD='a' NEW='b' bash bin/replace_literal f.txt"))
check("otro programa calla", False, warns("ls -la"))
check("el aviso nombra la herramienta", True,
      "bin/replace_literal" in (gate.detect({"tool_input": {"command": PERL_BRACES}}) or ""))

print(f"test_detect_literal_replacement: {OK + FAILED} aserciones — {OK} ok, {FAILED} falla(s)")
sys.exit(1 if FAILED else 0)
