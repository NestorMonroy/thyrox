"""Regulariza bancos creados a mano a la convencion de ``bin/manifest scaffold``.

Para cada banco del plan: nombre ``<slug>-<ISO basico>`` derivado con
``run_id_for`` y el instante de su primer commit (conserva la cronologia),
``outputs/`` y ``probes/``, README con las secciones de la plantilla y
``manifest.jsonl`` con la declaracion de las cinco claves. Reescribe las
referencias al nombre viejo en los archivos versionados de ``.claude/``.

Sólo mueve los bancos del repositorio indicado en ``--apply``; las
referencias cruzadas a bancos del otro repositorio se derivan igual.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, "/home/user/thyrox/src")
from workbench.manifest import REQUIRED_KEYS, run_id_for  # noqa: E402

REPOS = {"thyrox": Path("/home/user/thyrox"),
         "ai-course-notes": Path("/home/user/ai-course-notes")}
WORKBENCH = Path(".claude/workbench")
DATE_ONLY = re.compile(r"-\d{8}$")
BASIC_ISO = re.compile(r"-\d{8}T\d{6}Z?$")
LOOSE_KEEP = {"README.md", "manifest.jsonl", "outputs", "probes"}


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], check=True,
                          capture_output=True, text=True).stdout


def grep_files(repo: Path, text: str) -> list[str]:
    # git grep sale 1 cuando no hay coincidencias: eso es una lista vacia, no un fallo.
    found = subprocess.run(["git", "-C", str(repo), "grep", "-l", "-F", text, "--",
                            str(WORKBENCH)], capture_output=True, text=True)
    if found.returncode not in (0, 1):
        raise SystemExit(f"git grep fallo: {found.stderr.strip()}")
    return found.stdout.split()


def first_commit_moment(repo: Path, bench: str) -> datetime:
    stamps = git(repo, "log", "--diff-filter=A", "--format=%cI", "--",
                 str(WORKBENCH / bench)).split()
    if not stamps:
        raise SystemExit(f"{bench}: sin commit que lo añada")
    return datetime.fromisoformat(stamps[-1])


def new_name(repo: Path, old: str) -> str:
    if BASIC_ISO.search(old):
        return old
    if not DATE_ONLY.search(old):
        raise SystemExit(f"{old}: sufijo no reconocido")
    return run_id_for(DATE_ONLY.sub("", old), first_commit_moment(repo, old))


def first_comment(path: Path) -> str:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (UnicodeDecodeError, OSError):
        return ""
    for line in lines[:6]:
        text = line.strip()
        if text.startswith("#!") or not text:
            continue
        for mark in ("#", "//", '"""'):
            if text.startswith(mark):
                return text.lstrip("#/\" ").strip()
        return ""
    return ""


def pieces_table(run: Path) -> list[str]:
    rows = ["| archivo | que hace |", "|---|---|"]
    for path in sorted((run / "probes").rglob("*")):
        if path.is_file():
            what = first_comment(path) or "borrador del cambio, tal como se aplicó"
            rows.append(f"| `{path.relative_to(run)}` | {what.replace('|', '/')} |")
    outputs = sorted(p.name for p in (run / "outputs").glob("*"))
    if outputs:
        rows.append(f"| `outputs/` | {len(outputs)} salidas: rojos, verdes y anulaciones |")
    return rows


def quote(text: str) -> list[str]:
    return [f"> {line}" if line else ">" for line in text.splitlines()]


def rewrite_readme(run: Path, entry: dict, encargo: str) -> None:
    readme = run / "README.md"
    lines = readme.read_text(encoding="utf-8").splitlines()
    title, body = lines[0], lines[1:]
    while body and not body[0].strip():
        body.pop(0)
    premise = entry["premise"] or "Ninguna: el encargo se ejecutó tal como se pidió."
    out = [title, "", "## El encargo", "", "<!-- verbatim, sin parafrasear -->", "",
           *quote(encargo), "", "## La premisa, si se corrigio al primer comando", "",
           premise, "", "## Las piezas", "", *pieces_table(run), "",
           "## Los resultados", "", *body, "",
           f"*Metrica:* {entry['metric']}.", f"*Ciega a:* {entry['blind_to']}.", ""]
    readme.write_text("\n".join(out), encoding="utf-8")


def write_declaration(run: Path, repo_rel: Path, entry: dict) -> None:
    record = {"kind": "declaration", **{k: entry[k] for k in REQUIRED_KEYS if k != "destination"},
              "destination": str(repo_rel / "outputs")}
    missing = [k for k in REQUIRED_KEYS if not record.get(k)]
    if missing:
        raise SystemExit(f"{run.name}: faltan {missing}")
    manifest = run / "manifest.jsonl"
    previous = manifest.read_text(encoding="utf-8") if manifest.exists() else ""
    manifest.write_text(json.dumps(record, ensure_ascii=False) + "\n" + previous,
                        encoding="utf-8")


def regularize(repo: Path, entry: dict, new: str, encargo: str) -> None:
    old_dir, new_dir = repo / WORKBENCH / entry["old"], repo / WORKBENCH / new
    if new != entry["old"]:
        if new_dir.exists():
            raise SystemExit(f"{new}: ya existe")
        git(repo, "mv", str(old_dir), str(new_dir))
    for sub in ("outputs", "probes"):
        (new_dir / sub).mkdir(exist_ok=True)
    for loose in sorted(new_dir.iterdir()):
        if loose.name not in LOOSE_KEEP:
            git(repo, "mv", str(loose), str(new_dir / "probes" / loose.name))
    rewrite_readme(new_dir, entry, encargo)
    write_declaration(new_dir, WORKBENCH / new, entry)
    git(repo, "add", "-N", str(new_dir / "manifest.jsonl"))


def rewrite_references(repo: Path, renames: dict[str, str]) -> list[str]:
    touched = []
    for old, new in renames.items():
        if old == new:
            continue
        pattern = re.compile(re.escape(old) + r"(?!T\d)")
        hits = grep_files(repo, old)
        for name in hits:
            path = repo / name
            if path.suffix == ".jsonl" and "transcript" in name:
                continue
            text = path.read_text(encoding="utf-8")
            updated = pattern.sub(new, text)
            if updated != text:
                path.write_text(updated, encoding="utf-8")
                touched.append(name)
    return sorted(set(touched))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", required=True)
    parser.add_argument("--encargos", required=True)
    parser.add_argument("--apply", required=True, choices=sorted(REPOS))
    args = parser.parse_args()
    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    encargos = json.loads(Path(args.encargos).read_text(encoding="utf-8"))
    renames = {e["old"]: new_name(REPOS[e["repo"]], e["old"]) for e in plan}
    repo = REPOS[args.apply]
    for entry in plan:
        if entry["repo"] == args.apply:
            regularize(repo, entry, renames[entry["old"]], encargos[entry["old"]])
            print(f"{entry['old']} -> {renames[entry['old']]}")
    for name in rewrite_references(repo, renames):
        print(f"referencias: {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
