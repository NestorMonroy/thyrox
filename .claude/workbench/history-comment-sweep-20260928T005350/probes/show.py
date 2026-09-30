"""Imprime archivo:línea: texto de cada comentario que el detector marcaría."""
import importlib.util
import pathlib
import re
import subprocess
import sys

root = pathlib.Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
spec = importlib.util.spec_from_file_location("dhc", root / "src/hooks/detect_history_comment.py")
dhc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dhc)
for rel in sys.argv[1:]:
    lines = (root / rel).read_text().splitlines()
    for number, line in enumerate(lines, 1):
        comments = dhc.comment_lines(rel, line) or ([line.strip()] if re.match(r"^\s*(\*|//|#|\"\"\")", line) else [])
        if any(dhc._carries_history(c) for c in comments):
            print(f"{rel}:{number}: {line.strip()}")
