"""Nombre de la función de nivel superior que contiene un literal en un chunk."""
import re, sys
text = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
at = text.index(sys.argv[2])
starts = [m for m in re.finditer(r"(?:async )?function\*? ?([\w$]+)\(", text[:at])]
print(starts[-1].group(1) if starts else "?")
