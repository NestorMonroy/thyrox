"""T005, mitad medible: bytes de cada candidato, DENTRO de una unidad.

Los volúmenes llegan montados de sólo lectura en /measure/volumes/<nombre>; las
rutas del anfitrión, en /measure/host/<nombre>; el repositorio, en su propia
ruta. No borra ni escribe fuera de su salida. Por cada worktree mide además su
estado de git (cambios sin commitear, commits sin publicar) sin tomar locks.
Uso: inventory_measure.py <repo> <salida.json>
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

repo, output = Path(sys.argv[1]), Path(sys.argv[2])


def du(path: Path) -> int | None:
    ran = subprocess.run(["du", "-sb", str(path)], capture_output=True, text=True, timeout=600)
    return int(ran.stdout.split()[0]) if ran.stdout.strip() else None


def git(tree: Path, *args: str) -> str:
    return subprocess.run(["git", "--no-optional-locks", "-C", str(tree), *args], capture_output=True, text=True).stdout.strip()


def worktree_state(tree: Path) -> dict:
    branch = git(tree, "rev-parse", "--abbrev-ref", "HEAD")
    dirty = git(tree, "status", "--porcelain", "--untracked-files=all")
    upstream = git(tree, "rev-parse", "--abbrev-ref", "@{u}")
    unpublished = git(tree, "log", "--oneline", "@{u}..HEAD") if upstream else git(tree, "log", "--oneline", "--not", "--remotes", "-n", "50")
    head = git(tree, "rev-parse", "HEAD")
    reachable = bool(head) and bool(git(tree, "branch", "-r", "--contains", head))
    return {"branch": branch, "head": head, "dirtyEntries": len(dirty.splitlines()) if dirty else 0,
            "upstream": upstream or None, "unpublishedCommits": len(unpublished.splitlines()) if unpublished else 0,
            "headOnRemote": reachable}


measured = {"filesystem": {}, "volumes": {}, "hostPaths": {}, "repoPaths": {}, "worktrees": {}, "jobs": {}, "runtime": {}, "cache": {}}
usage = shutil.disk_usage(repo)
measured["filesystem"] = {"path": str(repo), "sizeBytes": usage.total, "usedBytes": usage.used, "availBytes": usage.free}
for volume in sorted(Path("/measure/volumes").iterdir()) if Path("/measure/volumes").is_dir() else []:
    measured["volumes"][volume.name] = du(volume)
for host in sorted(Path("/measure/host").iterdir()) if Path("/measure/host").is_dir() else []:
    measured["hostPaths"][host.name] = du(host)
for relative in (".claude/worktrees", ".claude/workbench", ".claude/jobs", ".claude/cache", ".claude/build-logs", ".claude/logs",
                 ".thyrox/runtime", ".thyrox/pool-worktrees", "node_modules", "_references", "_archived", "agent-results", ".git"):
    path = repo / relative
    if path.exists():
        measured["repoPaths"][relative] = du(path)
for kind, relative in (("worktrees", ".claude/worktrees"), ("jobs", ".claude/jobs"), ("runtime", ".thyrox/runtime"), ("cache", ".claude/cache")):
    base = repo / relative
    for entry in sorted(base.iterdir()) if base.is_dir() else []:
        record = {"bytes": du(entry)}
        if kind == "worktrees" and (entry / ".git").exists():
            record.update(worktree_state(entry))
        if kind == "jobs" and (entry / "outputs" / "pid").is_file():
            pid = (entry / "outputs" / "pid").read_text().strip()
            record["pidRecorded"] = pid
        record["tracked"] = bool(git(repo, "ls-files", "--", f"{relative}/{entry.name}")[:1])
        measured[kind][entry.name] = record
output.write_text(json.dumps(measured, indent=1) + "\n")
print(json.dumps({k: (len(v) if isinstance(v, dict) else v) for k, v in measured.items() if k != "filesystem"}))
