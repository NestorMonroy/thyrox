"""Verifica las reglas de §22.2 sobre outputs/T005b-corpus-inventory.json.

No confía en el texto del worker: recorre cada fila y rehúsa ante cualquier
violación. Exit 0 sólo si todas las filas cumplen y los cinco árboles
aparecen cubiertos.
"""
import json
import sys
from pathlib import Path

CLASSES = {"semantic_content", "durable_evidence", "execution_state", "reconstructible_cache",
           "secret_sensitive", "binary_non_indexable", "duplicate"}
FIELDS = ("path", "bytes", "content_class", "semantic_value", "canonical_owner", "ingested",
          "document_id", "content_hash", "safe_to_delete", "reason")
TREES = (".claude/workbench/", ".claude/build-logs/", ".claude/cache/", ".claude/logs/", ".thyrox/")


def violations(row: dict) -> list[str]:
    found = [f"falta {field}" for field in FIELDS if field not in row]
    if found:
        return found
    if row["content_class"] not in CLASSES:
        found.append(f"clase desconocida {row['content_class']!r}")
    if row["semantic_value"] is True and row["ingested"] is not True and row["safe_to_delete"]:
        found.append("semantic_value sin ingerir marcado safe_to_delete")
    if row["content_class"] in ("secret_sensitive", "durable_evidence") and row["safe_to_delete"]:
        found.append(f"{row['content_class']} marcado safe_to_delete")
    if row["safe_to_delete"] and row["ingested"] is True and not row["document_id"]:
        found.append("ingested sin document_id")
    if not str(row["reason"]).strip():
        found.append("reason vacío")
    return found


def main(path: str) -> int:
    inventory = json.loads(Path(path).read_text())
    rows = inventory.get("A", []) + inventory.get("B", [])
    if not rows:
        print("t005b_rules: inventario vacío", file=sys.stderr)
        return 1
    bad = [(row.get("path"), problem) for row in rows for problem in violations(row)]
    covered = {tree for tree in TREES for row in rows if tree in str(row.get("path", ""))}
    for tree in sorted(set(TREES) - covered):
        bad.append((tree, "árbol sin ninguna fila"))
    for where, problem in bad[:50]:
        print(f"VIOLACIÓN\t{where}\t{problem}")
    print(f"t005b_rules: {len(rows)} fila(s), {len(bad)} violación(es), árboles cubiertos {len(covered)}/{len(TREES)}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "outputs/T005b-corpus-inventory.json"))
