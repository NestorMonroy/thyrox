"""Renombra un identificador por TOKEN (NAME), por posición: la prosa queda intacta.

Uso: rename_tokens.py <archivo> <viejo> <nuevo>. Exige Python 3.12+
(las f-strings se tokenizan por dentro desde 3.12).
"""
import io
import sys
import tokenize

assert sys.version_info >= (3, 12), "hace falta 3.12+: uv run python"
path, old, new = sys.argv[1:4]
text = open(path, encoding="utf8").read()
lines = text.splitlines(keepends=True)
hits = [t.start for t in tokenize.generate_tokens(io.StringIO(text).readline)
        if t.type == tokenize.NAME and t.string == old]
for row, col in reversed(hits):
    line = lines[row - 1]
    lines[row - 1] = line[:col] + new + line[col + len(old):]
open(path, "w", encoding="utf8").write("".join(lines))
print(f"{path}: {len(hits)} {old} -> {new}")
