"""Suite del detector de los momentos en que ``gensub`` o ``-i inplace`` son la forma.

El defecto
----------
gawk trae dos cosas que ningún otro awk tiene: ``gensub``, que devuelve el
texto cambiado y reutiliza los grupos capturados (``\\1``), y ``-i inplace``,
que edita el archivo en su lugar. La regla vivía en prosa
(`operaciones-de-archivo-con-bash.md`) y el ejecutor pidió un script que la
ofrezca en el momento correcto (directiva 2026-09-25).

Medido antes de escribir el detector, en este contenedor:

- ``gsub(/(\\w+) (\\w+)/, "\\\\2 \\\\1")`` sobre «hola mundo» imprime
  ``\\2 \\1`` y sale 0 — un resultado falso y silencioso;
  ``gensub`` con el mismo reemplazo imprime «mundo hola».
- ``mawk -i inplace`` sale 2 con «not an option: -i».

El control que puede fallar
----------------------------
Cada momento tiene su gemelo que no lo es: un ``mv`` que no vuelve sobre la
entrada, un ``sort`` en vez de awk, un ``gensub`` que ya es la forma, un
``&`` que ``gsub`` sí expande, un ``re.sub`` que sólo imprime y uno que cruza
líneas —donde gawk, que lee por línea, no alcanza—.
"""
from __future__ import annotations

import importlib.util
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_gawk_opportunity.py"
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
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def warning(command: str) -> str | None:
    return gate.detect({"tool_name": "Bash", "tool_input": {"command": command}})


def warns(command: str) -> bool:
    return warning(command) is not None


# 1. Reescribir la entrada con un temporal y un mv.
MV_BACK = "gawk -F'\\t' '{print $1}' año.tsv > año.tsv.tmp && mv año.tsv.tmp año.tsv"
MV_ELSEWHERE = "gawk -F'\\t' '{print $1}' año.tsv > señal.tmp && mv señal.tmp columna.tsv"
SORT_MV = "sort año.tsv > año.tsv.tmp && mv año.tsv.tmp año.tsv"
# 2. Grupos capturados en el reemplazo.
GSUB_BACKREF = "gawk '{gsub(/(\\w+) (\\w+)/, \"\\\\2 \\\\1\"); print}' niño.txt"
GENSUB_BACKREF = "gawk '{print gensub(/(\\w+) (\\w+)/, \"\\\\2 \\\\1\", \"g\")}' niño.txt"
GSUB_AMP = "gawk '{gsub(/año/, \"[&]\"); print}' niño.txt"
# 3. Una sustitución por línea escrita en Python.
PY_SUB_WRITE = (
    "python3 - <<'EOF'\nfrom pathlib import Path\nimport re\n"
    "p = Path('señales.tsv')\n"
    "p.write_text(re.sub(r'versión', 'edición', p.read_text()))\nEOF"
)
PY_SUB_PRINT = (
    "python3 - <<'EOF'\nfrom pathlib import Path\nimport re\n"
    "print(re.sub(r'versión', 'edición', Path('señales.tsv').read_text()))\nEOF"
)
PY_DOTALL = (
    "python3 - <<'EOF'\nfrom pathlib import Path\nimport re\n"
    "p = Path('capítulo.tex')\n"
    "p.write_text(re.sub(r'\\\\begin\\{nota\\}.*?\\\\end\\{nota\\}', '', p.read_text(), flags=re.S))\nEOF"
)
# 4. -i inplace sólo existe en gawk.
MAWK_INPLACE = "mawk -i inplace '{print gensub(/viejo/, \"nuevo\", \"g\")}' señal.txt"
GAWK_INPLACE = "gawk -i inplace '{print gensub(/viejo/, \"nuevo\", \"g\")}' señal.txt"

CASES = {
    "mv-vuelta": (MV_BACK, True), "mv-otro": (MV_ELSEWHERE, False), "sort-mv": (SORT_MV, False),
    "gsub-grupo": (GSUB_BACKREF, True), "gensub-grupo": (GENSUB_BACKREF, False), "gsub-amp": (GSUB_AMP, False),
    "py-escribe": (PY_SUB_WRITE, True), "py-imprime": (PY_SUB_PRINT, False), "py-dotall": (PY_DOTALL, False),
    "mawk-inplace": (MAWK_INPLACE, True), "gawk-inplace": (GAWK_INPLACE, False),
}

print("== 1. cada momento avisa y su gemelo calla ==")
for label, (command, expected) in CASES.items():
    check(label, expected, warns(command))

print("== 2. el aviso nombra la forma que corresponde ==")
check("mv-vuelta sugiere -i inplace", True, "-i inplace" in (warning(MV_BACK) or ""))
check("gsub-grupo sugiere gensub", True, "gensub" in (warning(GSUB_BACKREF) or ""))
check("gsub-grupo cita el resultado literal medido", True, "\\2 \\1" in (warning(GSUB_BACKREF) or ""))
check("py-escribe sugiere gawk -i inplace", True, "gawk -i inplace" in (warning(PY_SUB_WRITE) or ""))
check("mawk-inplace nombra gawk", True, "gawk" in (warning(MAWK_INPLACE) or ""))
check("un comando que no es Bash no avisa", None,
      gate.detect({"tool_name": "Read", "tool_input": {"file_path": "año.tsv"}}))


def dropped_under(name: str, replacement) -> list[str]:
    """Los casos cuyo veredicto cambia con ``name`` anulado."""
    original = getattr(gate, name)
    setattr(gate, name, replacement)
    try:
        return sorted(k for k, (c, expected) in CASES.items() if warns(c) != expected)
    finally:
        setattr(gate, name, original)


print("== 3. anulación: cada mitad de juicio hace caer exactamente sus casos ==")
check("sin el ancla de awk cae sólo sort-mv", ["sort-mv"],
      dropped_under("invokes_awk", lambda command: True))
check("sin exigir que el mv vuelva a la entrada cae sólo mv-otro", ["mv-otro"],
      dropped_under("REQUIRE_SAME_FILE", False))
check("sin excluir gensub cae sólo gensub-grupo", ["gensub-grupo"],
      dropped_under("_SUB_CALL", re.compile(r"(?<![.$])g?(?:en)?sub\s*\(")))
check("sin exigir escritura cae sólo py-imprime", ["py-imprime"],
      dropped_under("REQUIRE_WRITE", False))
check("sin el descuento multilínea cae sólo py-dotall", ["py-dotall"],
      dropped_under("SKIP_MULTILINE", False))
check("sin excluir gawk de -i inplace cae sólo gawk-inplace", ["gawk-inplace"],
      dropped_under("_FOREIGN_INPLACE", re.compile(r"(?<![\w-])[gm]?awk\s+-i\s+inplace\b")))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
