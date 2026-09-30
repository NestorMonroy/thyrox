"""Suite del detector de historial en comentarios de código.

Verifica que avise sobre cada marca de historial en comentarios o docstrings
nuevos de TypeScript, Python y shell, y que calle sobre el código, sobre lo que
ya estaba, sobre lo que no es código y sobre la intención con palabras parecidas.
"""
from __future__ import annotations

import importlib.util
import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach

_MODULE = pathlib.Path(os.environ.get("HISTORY_COMMENT_MODULE")
                       or reach.thyrox_root() / "src/hooks/detect_history_comment.py")
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
assert _spec is not None and _spec.loader is not None
gate = importlib.util.module_from_spec(_spec)
sys.modules["_gate"] = gate
_spec.loader.exec_module(gate)

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLA {label}: esperado {expected!r}, obtenido {obtained!r}")
        FAILED += 1


def warns(payload: dict) -> bool:
    return gate.detect(payload) is not None


def write(path: str, content: str) -> dict:
    return {"tool_name": "Write", "tool_input": {"file_path": path, "content": content}}


def edit(path: str, old: str, new: str) -> dict:
    return {"tool_name": "Edit", "tool_input": {"file_path": path, "old_string": old, "new_string": new}}


def bash(command: str) -> dict:
    return {"tool_name": "Bash", "tool_input": {"command": command}}


print("marcadores de historial en un comentario nuevo")
check("fecha ISO en //", True, warns(write("a.ts", "// Corregido el 2026-09-27: ahora cuenta bien\nconst x = 1\n")))
check("bitácora en #", True, warns(write("a.py", "# Añadido tras el fallo del pool\nx = 1\n")))
check("«antes vivía» en docstring", True, warns(write("a.py", '"""Módulo.\n\nAntes vivía en otro paquete.\n"""\n')))
check("«la versión anterior» en *", True, warns(write("a.ts", "/**\n * La versión anterior contaba mal.\n */\n")))
check("ronda N", True, warns(write("a.sh", "# ronda 6: se añadió el guard\n")))
check("episodio", True, warns(write("a.ts", "// El episodio que lo originó\n")))
check("id de hallazgo", True, warns(write("a.py", "# Ver H-THYROX-26\n")))

check("sólo una fecha", True, warns(write("a.ts", "// Medido el 2026-09-27 sobre 5305 archivos.\n")))
check("docstring de varias líneas cerrado: lo que sigue es código", False, warns(write("a.py", '"""Resumen.\n\nMás.\n"""\nwhen = "2026-09-27"\n')))
check("sin extensión, primera línea que nombra python sin shebang", False, warns(write("NOTES", "# python: Corregido 2026-09-27\n")))

print("la intención con palabras parecidas no avisa")
check("«antes de llamar»", False, warns(write("a.ts", "// Se valida antes de llamar al upstream.\n")))
check("procedencia de un porte", False, warns(write("a.ts", "// Porte de CLIProxyAPI (`selector.go`).\n")))
check("un «ya no» de conducta actual", False, warns(write("a.ts", "// Si la sesión ya no está vigente, se descarta.\n")))

print("el código no es comentario")
check("fecha en una cadena", False, warns(write("a.ts", "const day = '2026-09-27'\n")))
check("fecha tras un # dentro de una cadena de python", False, warns(write("a.py", "url = 'x#2026-09-27'\n")))
check("shebang", False, warns(write("a.sh", "#!/usr/bin/env bash\necho 2026-09-27\n")))
check("docstring cerrado: lo que sigue es código", False, warns(write("a.py", '"""Doc."""\nwhen = "2026-09-27"\n')))

print("sólo archivos de código")
check("un .rst lleva fechas por diseño", False, warns(write("a.rst", "# Corregido 2026-09-27\n")))
check("un .md tampoco", False, warns(write("a.md", "# Añadido 2026-09-27\n")))

print("en Edit, sólo lo que se añade")
old = "// Corregido 2026-09-27\nconst x = 1\n"
check("el historial que ya estaba no avisa", False, warns(edit("a.ts", old, old.replace("1", "2"))))
check("el que se añade sí", True, warns(edit("a.ts", "const x = 1\n", "// Mudado 2026-09-27\nconst x = 1\n")))

print("heredoc de Bash que escribe un archivo de código")
check("cat > a.ts <<EOF", True, warns(bash("cat > src/a.ts <<'EOF'\n// Corregido 2026-09-27\nconst x = 1\nEOF")))
check("heredoc hacia un .md", False, warns(bash("cat > notes.md <<'EOF'\n# Corregido 2026-09-27\nEOF")))
check("heredoc que no escribe archivo", False, warns(bash("python3 - <<'EOF'\n# Corregido 2026-09-27\nprint(1)\nEOF")))
check("la línea de comando no es comentario", False, warns(bash("git commit -m 'Fix 2026-09-27' -- a.ts")))

print("cada lenguaje, con sus formas de comentario")
check("ts: bloque /* */ de una línea", True, warns(write("a.ts", "/* Retirado 2026-09-27 */\nconst x = 1\n")))
check("ts: JSDoc de varias líneas", True, warns(write("a.ts", "/**\n * Resumen.\n *\n * Mudado desde otro paquete.\n */\nexport const x = 1\n")))
check("mts y cts", True, warns(write("a.mts", "// ronda 2\n")) and warns(write("a.cts", "// ronda 2\n")))
check("py: docstring con comillas simples", True, warns(write("a.py", "'''Resumen.\n\nLa redacción anterior contaba mal.\n'''\n")))
check("py: comentario tras un docstring cerrado", True, warns(write("a.py", '"""Resumen."""\n# Añadido en la ronda 3\n')))
check("sh y bash", True, warns(write("a.sh", "# Corregido 2026-09-27\n")) and warns(write("a.bash", "# Corregido 2026-09-27\n")))
check("sin extensión, shebang de bash", True, warns(write("bin/tool", "#!/usr/bin/env bash\n# Corregido 2026-09-27\nexec x\n")))
check("sin extensión, shebang de python", True, warns(write("bin/tool", "#!/usr/bin/env python3\n'''Resumen.\n\nAntes vivía en otro sitio.\n'''\n")))
check("sin extensión y sin shebang: no es código", False, warns(write("NOTES", "# Corregido 2026-09-27\n")))
check("heredoc hacia un script sin extensión", True, warns(bash("cat > bin/tool <<'EOF'\n#!/usr/bin/env bash\n# Mudado 2026-09-27\nEOF")))

print("el aviso nombra la línea")
message = gate.detect(write("a.ts", "// Corregido el 2026-09-27\n")) or ""
check("cita el texto", True, "Corregido el 2026-09-27" in message)

print(f"test_detect_history_comment: {OK + FAILED} aserciones — {OK} ok, {FAILED} falla(s)")
sys.exit(1 if FAILED else 0)
