# scratchpad-distribute

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0762 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; B=$(python3 -c "import sys; sys.path.insert(0,\"src\"); from datetime import datetime,timezone; from workbench.manifest import run_id_for; print(run_id_for(\"scratchpad-recovery\", datetime(2026,9,25,4,5,tzinfo=timezone.utc)))")
W=.claude/workbench/$B; mkdir -p $W/probes $W/outputs
cat > $W/probes/distribute_scratchpad.py <<"EOF"
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
EOF
python3 $W/probes/distribute_scratchpad.py $W .claude/build-logs/scratchpad-installs-20260925T040500 .claude/cache/scratchpad-references-20260925T040500 .claude/logs/scratchpad-latex-20260925T064300 && rm -rf $W/probes/__pycache__; echo W=$W
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
