"""T005b: inventario de corpus de los cinco árboles de §22.1 (sólo medir).

Recorre `.claude/workbench`, `.claude/build-logs`, `.claude/cache`,
`.claude/logs` y `.thyrox`, y clasifica cada elemento en una sola clase de
§22.2. No borra, no ingiere, no escribe fuera de su archivo de salida.

- Un secreto se clasifica por NOMBRE antes de leer nada; si el nombre no lo
  delata, el texto se examina en memoria con el detector del controlador
  (`exposed_secret_names`), y de un secreto nunca sale texto ni hash.
- Un worktree retenido de la continuación es una copia de git HEAD: su parte
  versionada sin cambios es UN elemento (`duplicate`, dueño git); cada archivo
  cambiado o nuevo es su propio elemento (`execution_state`).
- `safe_to_delete` dice si el contenido es reconstruible o redundante. No
  autoriza nada: `deletion_requires` nombra quién puede borrarlo (T009 para lo
  sustituido por PostgreSQL; autorización aparte para todo lo demás).

Uso: t005b_inventory.py <salida.json>
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path("/home/user/thyrox")
sys.path[:0] = [str(ROOT / "src"), str(ROOT / "src" / "session")]
from task_continuation import declared_secret_names, exposed_secret_names  # noqa: E402

TREES = (".claude/workbench", ".claude/build-logs", ".claude/cache", ".claude/logs", ".thyrox")
WORKTREE_PARENT = ".thyrox/runtime/continuation/worktrees"
CHUNK_CHARACTERS = 2000  # MAX_CHUNK_CHARACTERS, semantic-search/rstDocument.ts:18
SECRET_NAME = re.compile(r"(^\.env|secret|credential|token|password|id_ed25519|id_rsa|\.pem$|\.key$|\.p12$)", re.I)
BINARY_SUFFIXES = {".sqlite3", ".sqlite", ".db", ".png", ".jpg", ".jpeg", ".gif", ".gz", ".tgz", ".zip", ".bin",
                   ".gguf", ".safetensors", ".pyc", ".so", ".tar", ".zst", ".xz", ".pdf", ".woff", ".woff2"}
SEMANTIC_SUFFIXES = {".md", ".rst", ".txt"}
EXECUTION_NAMES = {"pid", "salida.log.time", "lock", ".lock"}
EXECUTION_DIRS = (".thyrox/runtime/launchers/", ".thyrox/runtime/pool/", ".thyrox/runtime/jobs/",
                  ".thyrox/runtime/containment/", ".thyrox/runtime/snapshots/", ".thyrox/runtime/quarantine/",
                  ".thyrox/runtime/artifact-verify/", ".thyrox/runtime/continuation-frontier-e2e/")
# Ownership vivo declarado (§23.2): el WIP de P2d de TASK-THYROX-0743.
LIVE_OWNERS = {".claude/workbench/managed-podman-execution-boundary-20261001T164746/": "TASK-THYROX-0743 P2d WIP"}


def git_lines(*args: str, cwd: Path = ROOT) -> list[str]:
    return subprocess.run(["git", "-C", str(cwd), *args], capture_output=True, text=True, check=True).stdout.splitlines()


def tracked_paths() -> set[str]:
    return set(git_lines("ls-files", "--", *TREES))


def modified_paths() -> set[str]:
    return {line[3:] for line in git_lines("status", "--porcelain", "--untracked-files=no", "--", *TREES)}


def worktree_roots() -> list[Path]:
    parent = ROOT / WORKTREE_PARENT
    return sorted(path for path in parent.glob("*/*") if (path / ".git").exists()) if parent.is_dir() else []


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def live_owner_of(relative: str) -> str | None:
    return next((owner for prefix, owner in LIVE_OWNERS.items() if relative.startswith(prefix)), None)


def row(path: str, size: int, content_class: str, semantic: bool, owner: str, digest: str | None,
        safe: bool, reason: str, requires: str | None, live_owner: str | None = None) -> dict:
    entry = {"path": path, "bytes": size, "content_class": content_class, "semantic_value": semantic,
             "canonical_owner": owner, "ingested": False, "document_id": None, "content_hash": digest,
             "safe_to_delete": safe, "reason": reason, "deletion_requires": requires}
    if live_owner:
        entry["live_owner"] = live_owner
    return entry


def classify_file(path: Path, relative: str, tracked: set[str], modified: set[str], names: tuple[str, ...],
                  seen: dict[str, str]) -> dict:
    size = path.lstat().st_size
    owner = "git" if relative in tracked else relative.split("/")[1] if relative.startswith(".claude/") else "runtime"
    live = live_owner_of(relative) if relative in modified else None
    if SECRET_NAME.search(path.name):
        return row(relative, size, "secret_sensitive", False, owner, None, False,
                   "nombre declara credencial; no se lee", None)
    if path.is_symlink():
        return row(relative, size, "execution_state", False, owner, None, False, "enlace simbólico; no se sigue", None)
    with path.open("rb") as handle:
        head = handle.read(8192)
    binary = b"\0" in head or path.suffix in BINARY_SUFFIXES
    text = None if binary else path.read_bytes().decode("utf-8", errors="replace")
    if text is not None and exposed_secret_names(text, names):
        return row(relative, size, "secret_sensitive", False, owner, None, False,
                   "contiene una asignación con valor de un secreto declarado; ni texto ni hash salen", None)
    digest = sha256_of(path)
    if live:
        return row(relative, size, "execution_state", False, owner, digest, False,
                   f"cambio sin commitear con ownership vivo ({live})", None, live)
    if digest in seen and size > 0:
        return row(relative, size, "duplicate", False, f"duplicate-of:{seen[digest]}", digest, False,
                   "mismo contenido que otra fila; se conserva mientras la original no esté preservada", None)
    seen.setdefault(digest, relative)
    if binary:
        return row(relative, size, "binary_non_indexable", False, owner, digest, False,
                   "binario o formato no indexable", None)
    if path.name in EXECUTION_NAMES or path.suffix in (".time", ".lock") or relative.startswith(EXECUTION_DIRS):
        return row(relative, size, "execution_state", False, owner, digest, False,
                   "estado de ejecución del runtime", None)
    if relative.startswith(".claude/cache/"):
        return row(relative, size, "reconstructible_cache", False, owner, digest, relative not in tracked,
                   "caché regenerable" + ("" if relative not in tracked else "; versionada, la conserva git"),
                   "separate_authorization" if relative not in tracked else None)
    if path.suffix in SEMANTIC_SUFFIXES:
        return row(relative, size, "semantic_content", True, owner, digest, False,
                   "texto con valor semántico; pendiente de ingesta", None)
    return row(relative, size, "durable_evidence", True, owner, digest, False,
               "evidencia de ejecución en texto; se conserva", None)


def worktree_rows(root: Path, names: tuple[str, ...], seen: dict[str, str]) -> list[dict]:
    relative_root = str(root.relative_to(ROOT))
    head = git_lines("rev-parse", "HEAD", cwd=root)[0]
    changed = [line[3:] for line in git_lines("status", "--porcelain", "--untracked-files=all", cwd=root)]
    rows = []
    changed_bytes = 0
    for name in changed:
        path = root / name
        if path.is_file():
            entry = classify_file(path, f"{relative_root}/{name}", set(), set(), names, seen)
            entry.update({"content_class": entry["content_class"] if entry["content_class"] == "secret_sensitive"
                          else "execution_state", "safe_to_delete": False,
                          "reason": "cambio del intento retenido por hard_block; evidencia del fallo, no está en git"})
            changed_bytes += entry["bytes"]
            rows.append(entry)
    total = sum(p.lstat().st_size for p in root.rglob("*") if p.is_file() and ".git" not in p.parts)
    rows.append(row(relative_root, total - changed_bytes, "duplicate", False, f"git:{head}", None, True,
                    f"checkout de git HEAD {head} sin cambios; reconstruible con git worktree",
                    "separate_authorization"))
    return rows


def main(output: Path) -> int:
    names = declared_secret_names()
    tracked, modified = tracked_paths(), modified_paths()
    seen: dict[str, str] = {}
    roots = worktree_roots()
    rows: list[dict] = []
    for root in roots:
        rows.extend(worktree_rows(root, names, seen))
    for tree in TREES:
        for path in sorted((ROOT / tree).rglob("*")):
            if not (path.is_file() or path.is_symlink()) or any(root in path.parents for root in roots):
                continue
            rows.append(classify_file(path, str(path.relative_to(ROOT)), tracked, modified, names, seen))
    totals = {"total_bytes_scanned": sum(r["bytes"] for r in rows)}
    for name, content_class in (("semantic_bytes", "semantic_content"), ("durable_evidence_bytes", "durable_evidence"),
                                ("reconstructible_bytes", "reconstructible_cache"),
                                ("excluded_secret_bytes", "secret_sensitive"),
                                ("excluded_binary_bytes", "binary_non_indexable"), ("duplicate_bytes", "duplicate")):
        totals[name] = sum(r["bytes"] for r in rows if r["content_class"] == content_class)
    indexable = [r for r in rows if r["semantic_value"]]
    totals["estimated_documents"] = len(indexable)
    totals["estimated_chunks"] = sum(max(1, math.ceil(r["bytes"] / CHUNK_CHARACTERS)) for r in indexable)
    totals["rows_by_class"] = {c: sum(1 for r in rows if r["content_class"] == c)
                               for c in sorted({r["content_class"] for r in rows})}
    inventory = {"trees": list(TREES), "chunkCharacters": CHUNK_CHARACTERS, "totals": totals,
                 "A": [r for r in rows if not r["safe_to_delete"]], "B": [r for r in rows if r["safe_to_delete"]]}
    output.write_text(json.dumps(inventory, ensure_ascii=False) + "\n")
    print(json.dumps(totals))
    return 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1])))
