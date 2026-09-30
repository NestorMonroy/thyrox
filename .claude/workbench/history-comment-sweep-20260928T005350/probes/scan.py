"""Cuenta, por archivo versionado, las líneas de comentario que el detector
de historial marcaría (``src/hooks/detect_history_comment.py``)."""
import importlib.util
import pathlib
import subprocess
import sys

root = pathlib.Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
spec = importlib.util.spec_from_file_location("dhc", root / "src/hooks/detect_history_comment.py")
dhc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dhc)
paths = subprocess.check_output(["git", "ls-files", "--", *(sys.argv[1:] or ["src", "tests", "bin"])], text=True, cwd=root).split()
for rel in paths:
    path = root / rel
    try:
        text = path.read_text()
    except (UnicodeDecodeError, IsADirectoryError, FileNotFoundError):
        continue
    if dhc.language_of(rel, text) is None:
        continue
    hits = [c for c in dhc.comment_lines(rel, text) if dhc._carries_history(c)]
    if hits:
        print(f"{len(hits)}\t{rel}")
