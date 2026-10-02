"""Reparte el material viejo del scratchpad de la sesion entre los cuatro hogares de .claude/.

Un archivo cuyo contenido ya es un blob de thyrox o de ai-course-notes no se
copia: se anota en el index.tsv de su destino con el repositorio y el blob, y
se recupera con git cat-file -p. Lo demas se copia conservando su ruta
relativa. Al final verifica que cada archivo quedo copiado o indexado.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

SCRATCH = Path("/scratch")
THYROX = Path("/home/user/thyrox")
REPOS = {"thyrox": THYROX, "ai-course-notes": Path("/home/user/ai-course-notes")}
INSTALL_LOGS = {"bun.log", "gawk.log", "uv.log", "uvlock.log", "uvsync.log", "venv.log",
                "apt-update.log", "apt-hunspell.log", "texlive.log"}
LATEX_BYPRODUCTS = {".aux", ".out", ".toc", ".log"}
REFERENCE_ROOTS = ("rla/", "skills/", "zh-equiv/", "siteq/root/")
REFERENCE_FILES = {"iate.json", "fundeu.html"}
PROBE_SUFFIXES = {".sh", ".py", ".tex", ".tsv"}


def destination(rel: str, homes: dict[str, Path]) -> Path:
    name = Path(rel).name
    if rel in INSTALL_LOGS:
        return homes["build-logs"] / rel
    if name.startswith("lecture02-notes") and Path(rel).suffix in LATEX_BYPRODUCTS:
        return homes["logs"] / rel
    if rel in REFERENCE_FILES or rel.startswith(REFERENCE_ROOTS):
        return homes["cache"] / rel
    kind = "probes" if Path(rel).suffix in PROBE_SUFFIXES or "annul" in name else "outputs"
    return homes["workbench"] / kind / rel


def blob_owner(path: Path) -> tuple[str, str]:
    for repo_name, repo in REPOS.items():
        blob = subprocess.run(["git", "-C", str(repo), "hash-object", "--no-filters", str(path)],
                              check=True, capture_output=True, text=True).stdout.strip()
        known = subprocess.run(["git", "-C", str(repo), "cat-file", "-e", blob],
                               capture_output=True)
        if known.returncode == 0:
            return repo_name, blob
    return "", ""


def main(argv: list[str]) -> int:
    homes = {k: THYROX / v for k, v in zip(("workbench", "build-logs", "cache", "logs"), argv[1:5])}
    files = sorted(p for p in SCRATCH.rglob("*") if p.is_file())
    indexes: dict[Path, list[str]] = {}
    copied = indexed = copied_bytes = indexed_bytes = 0
    for path in files:
        rel = str(path.relative_to(SCRATCH))
        target = destination(rel, homes)
        home = next(h for h in homes.values() if target.is_relative_to(h))
        size = path.stat().st_size
        repo_name, blob = blob_owner(path)
        if repo_name:
            indexes.setdefault(home, []).append(f"{rel}\t{repo_name}\t{blob}\t{size}")
            indexed, indexed_bytes = indexed + 1, indexed_bytes + size
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
            copied, copied_bytes = copied + 1, copied_bytes + size
    for home, rows in indexes.items():
        home.mkdir(parents=True, exist_ok=True)
        (home / "index.tsv").write_text("ruta\trepositorio\tblob\tbytes\n" + "\n".join(rows) + "\n",
                                        encoding="utf-8")
    if copied + indexed != len(files):
        print(f"descuadre: {copied}+{indexed} != {len(files)}", file=sys.stderr)
        return 1
    print(f"archivos={len(files)} copiados={copied} ({copied_bytes} B) "
          f"indexados={indexed} ({indexed_bytes} B)")
    for home in homes.values():
        if home.exists():
            n = sum(1 for p in home.rglob("*") if p.is_file())
            print(f"{home.relative_to(THYROX)}\t{n} archivos")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
