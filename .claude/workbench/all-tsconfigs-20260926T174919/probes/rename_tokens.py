"""Renombra identificadores por TOKEN, no por texto.

Python 3.11 entrega una f-string entera como un solo token STRING, así que
además de los NAME se renombran las palabras dentro de los campos `{…}` de
las f-strings. Se reemplaza por POSICIÓN sobre el texto original (no
`untokenize`, que reformatea el archivo). Cierra con un barrido AST: si queda
un `ast.Name` con el nombre viejo, sale 1.
"""
import ast, io, json, re, sys, tokenize

path, pairs = sys.argv[1], json.loads(sys.argv[2])
src = open(path).read()
lines = src.splitlines(keepends=True)
offsets = [0]
for line in lines:
    offsets.append(offsets[-1] + len(line))

def absolute(row, col):
    return offsets[row - 1] + col

edits = []
for tok in tokenize.generate_tokens(io.StringIO(src).readline):
    if tok.type == tokenize.NAME and tok.string in pairs:
        start = absolute(*tok.start)
        edits.append((start, start + len(tok.string), pairs[tok.string]))
    elif tok.type == tokenize.STRING and re.match(r'(?i)r?f|fr', tok.string):
        start = absolute(*tok.start)
        for field in re.finditer(r'\{[^{}]*\}', tok.string):
            for word in re.finditer(r'\b\w+\b', field.group()):
                if word.group() in pairs:
                    at = start + field.start() + word.start()
                    edits.append((at, at + len(word.group()), pairs[word.group()]))
for begin, end, new in sorted(edits, reverse=True):
    src = src[:begin] + new + src[end:]
open(path, 'w').write(src)
left = sorted({n.id for n in ast.walk(ast.parse(src)) if isinstance(n, ast.Name) and n.id in pairs})
print(f"{path}: {len(edits)} reemplazo(s); quedan {left}")
sys.exit(1 if left else 0)
