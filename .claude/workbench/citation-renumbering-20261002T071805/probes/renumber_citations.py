"""Renumera las citas que esta sesión acuñó y que feature/complete-orm-root acuñó para otra cosa.

Conserva los números de esa rama. Cambia sólo:
- las líneas cuyo commit es exclusivo de la rama de trabajo (git blame contra
  ``origin/feature/complete-orm-root..HEAD``) en thyrox, y todas las del consumidor,
  que esa rama no toca;
- las filas del store de esta sesión, con la nota de procedencia en ``metadata_json``.

No toca ``.claude/jobs/`` ni ``outputs/``/``probes/`` de los bancos: son el registro de
lo que se ejecutó con el número de entonces. Los mensajes de commit tampoco cambian;
la tabla de correspondencia queda en el hallazgo que registra este cambio.
"""
from __future__ import annotations

import json
import re
import sqlite3
import subprocess
import sys
from pathlib import Path

SESSION_ID = "81a17524-87b5-5e9d-997b-0732e892d302"
BRANCH = "feature/ai-course-notes-l1"
UPSTREAM = "origin/feature/complete-orm-root"
THYROX = Path("/home/user/thyrox")
CONSUMER = Path("/home/user/ai-course-notes")
STORE = THYROX / "agent-results/agent_store.sqlite3"
RENUMBERING = {f"TASK-THYROX-{old:04d}": f"TASK-THYROX-{old + 15:04d}" for old in range(754, 765)}
RENUMBERING |= {"H-THYROX-311": "H-THYROX-314", "H-THYROX-312": "H-THYROX-315"}
CITATION_TEXT = "|".join(re.escape(old) for old in RENUMBERING)
CITATION = re.compile(f"(?:{CITATION_TEXT})(?!\\d)")
SEARCH_EXCLUSIONS = ("!.git", "!.claude/jobs/**", "!.claude/workbench/*/outputs/**",
                     "!.claude/workbench/*/probes/**", "!*.pdf",
                     "!.claude/workbench/citation-renumbering-*/**")


def run(repo: Path, *args: str) -> str:
    return subprocess.run(args, cwd=repo, check=True, capture_output=True, text=True).stdout


def candidate_files(repo: Path) -> list[str]:
    globs = [arg for exclusion in SEARCH_EXCLUSIONS for arg in ("-g", exclusion)]
    found = subprocess.run(["rg", "-l", "--hidden", *globs, CITATION_TEXT, "."], cwd=repo,
                           capture_output=True, text=True)
    if found.returncode not in (0, 1):
        raise SystemExit(f"rg falló en {repo}: {found.stderr.strip()}")
    return sorted(path.removeprefix("./") for path in found.stdout.split())


def branch_only_commits() -> set[str]:
    return set(run(THYROX, "git", "rev-list", f"{UPSTREAM}..HEAD").split())


def line_commits(repo: Path, path: str) -> list[str]:
    porcelain = run(repo, "git", "blame", "--line-porcelain", "--", path)
    return [line.split()[0] for line in porcelain.splitlines() if re.match(r"^[0-9a-f]{40} ", line)]


def renumber_file(repo: Path, path: str, ours: set[str] | None) -> int:
    lines = (repo / path).read_text(encoding="utf-8").splitlines(keepends=True)
    commits = line_commits(repo, path) if ours is not None else []
    changed = 0
    for index, line in enumerate(lines):
        if not CITATION.search(line):
            continue
        if ours is not None and commits[index] not in ours:
            continue
        lines[index] = CITATION.sub(lambda match: RENUMBERING[match.group(0)], line)
        changed += 1
    if changed:
        (repo / path).write_text("".join(lines), encoding="utf-8")
    return changed


def provenance_note(old: str) -> str:
    return json.dumps({
        "session_note": f"acuñada en la sesión {SESSION_ID}, rama {BRANCH}",
        "renumbered_from": old,
        "renumbered_reason": f"{UPSTREAM.removeprefix('origin/')} acuñó {old} para otra cosa; se conservan sus números",
    }, ensure_ascii=False)


def renumber_store() -> list[str]:
    report = []
    with sqlite3.connect(STORE) as store:
        for old, new in RENUMBERING.items():
            if old.startswith("TASK-"):
                updated = store.execute(
                    "UPDATE tasks SET citation_id = ?, metadata_json = ? WHERE citation_id = ? AND session_id = ?",
                    (new, provenance_note(old), old, SESSION_ID)).rowcount
            else:
                updated = store.execute(
                    "UPDATE findings_history SET finding_id = ?, session_id = ?, metadata_json = ?,"
                    " content = replace(content, ?, ?) WHERE finding_id = ?",
                    (new, SESSION_ID, provenance_note(old), old, new, old)).rowcount
            report.append(f"store {old} -> {new}: {updated} fila(s)")
            if updated != 1:
                raise SystemExit(f"{old}: se esperaba una fila de esta sesión, hubo {updated}")
    return report


def main() -> int:
    ours = branch_only_commits()
    for repo, scope in ((THYROX, ours), (CONSUMER, None)):
        for path in candidate_files(repo):
            changed = renumber_file(repo, path, scope)
            print(f"{repo.name}\t{path}\t{changed} línea(s)")
    for line in renumber_store():
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
