"""El literal de objeto `{…}` que encierra un texto dado en un chunk (balance de llaves, saltando cadenas)."""
import sys
text = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
at = text.index(sys.argv[2])
depth, i = 0, at
while i > 0:
    i -= 1
    c = text[i]
    if c == "}":
        depth += 1
    elif c == "{":
        if depth == 0:
            break
        depth -= 1
start, depth, j, quote = i, 0, i, None
while j < len(text):
    c = text[j]
    if quote:
        if c == "\\":
            j += 1
        elif c == quote:
            quote = None
    elif c in "\"'`":
        quote = c
    elif c == "{":
        depth += 1
    elif c == "}":
        depth -= 1
        if depth == 0:
            break
    j += 1
print(text[max(0, start - 40):j + 60])
