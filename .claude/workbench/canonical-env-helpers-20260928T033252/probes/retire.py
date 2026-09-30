"""Retira las copias locales de isEnvTruthy/isBareMode y las enlaza al canónico.

Por archivo: borra la definición (y el JSDoc pegado a ella); si estaba
exportada deja un reexport, si no un import. El import se inserta tras el
último `import` del encabezado. Imprime lo que hizo por archivo.
"""
import re
import sys
from pathlib import Path

CANON = "@thyrox/config/env/utils"
DECL = re.compile(r"^(export\s+)?function\s+(isEnvTruthy|isBareMode)\b", re.M)


def block_end(text: str, start: int) -> int:
    i = text.index("{", text.index(")", start))
    depth = 0
    while True:
        c = text[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1


def doc_start(text: str, start: int) -> int:
    before = text[:start].rstrip(" \t")
    if before.endswith("*/\n"):
        open_ = before.rfind("/**")
        if open_ != -1 and "*/" not in before[open_:-4]:
            return open_
    return start


for name in sys.argv[1:]:
    path = Path(name)
    text = path.read_text()
    imported, reexported = [], []
    while (m := DECL.search(text)):
        s, e = doc_start(text, m.start()), block_end(text, m.start())
        while e < len(text) and text[e] == "\n" and text[e + 1:e + 2] == "\n":
            e += 1
        (reexported if m.group(1) else imported).append(m.group(2))
        text = text[:s] + text[e:].lstrip("\n") if s == 0 else text[:s] + text[e + 1:]
    lines = []
    if imported:
        lines.append(f"import {{ {', '.join(sorted(imported))} }} from '{CANON}'")
    if reexported:
        lines.append(f"export {{ {', '.join(sorted(reexported))} }} from '{CANON}'")
    last = 0
    for im in re.finditer(r"^import\b[\s\S]*?from\s+['\"][^'\"]+['\"]\s*;?\s*$", text, re.M):
        last = im.end()
    insert = ("\n" if last else "") + "\n".join(lines) + ("" if last else "\n")
    text = text[:last] + insert + text[last:]
    path.write_text(text)
    print(f"{name}: import={imported} reexport={reexported}")
