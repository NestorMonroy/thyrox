"""Verifica las reglas de §22.2 y §23.2 sobre outputs/T005b-corpus-inventory.json.

No confía en el texto del worker: recorre cada fila, recalcula los agregados
desde las filas y rehúsa ante cualquier violación. Exit 0 sólo si todas las
filas cumplen, los agregados coinciden y los cinco árboles aparecen cubiertos.
"""
import json
import sys
from pathlib import Path

CLASSES = {"semantic_content", "durable_evidence", "execution_state", "reconstructible_cache",
           "secret_sensitive", "binary_non_indexable", "duplicate"}
FIELDS = ("path", "bytes", "content_class", "semantic_value", "canonical_owner", "ingested",
          "document_id", "content_hash", "safe_to_delete", "reason")
TREES = (".claude/workbench/", ".claude/build-logs/", ".claude/cache/", ".claude/logs/", ".thyrox/")
# agregado → clase cuyas filas lo componen
AGGREGATES = {"semantic_bytes": "semantic_content", "durable_evidence_bytes": "durable_evidence",
              "reconstructible_bytes": "reconstructible_cache", "excluded_secret_bytes": "secret_sensitive",
              "excluded_binary_bytes": "binary_non_indexable", "duplicate_bytes": "duplicate"}
ESTIMATES = ("estimated_documents", "estimated_chunks")


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
    if row.get("live_owner") and row["safe_to_delete"]:
        found.append("ownership vivo marcado safe_to_delete")
    if row["safe_to_delete"] and row["ingested"] is True and not row["document_id"]:
        found.append("ingested sin document_id")
    if not str(row["reason"]).strip():
        found.append("reason vacío")
    return found


def aggregate_violations(inventory: dict, rows: list[dict]) -> list[tuple[str, str]]:
    totals = inventory.get("totals", {})
    found = []
    expected = {"total_bytes_scanned": sum(int(row.get("bytes", 0)) for row in rows)}
    for name, content_class in AGGREGATES.items():
        expected[name] = sum(int(row.get("bytes", 0)) for row in rows if row.get("content_class") == content_class)
    for name, value in expected.items():
        if name not in totals:
            found.append(("totals", f"falta {name}"))
        elif int(totals[name]) != value:
            found.append(("totals", f"{name} declarado {totals[name]} ≠ recalculado {value}"))
    for name in ESTIMATES:
        if not isinstance(totals.get(name), int) or totals[name] < 0:
            found.append(("totals", f"falta estimación {name}"))
    return found


def main(path: str) -> int:
    inventory = json.loads(Path(path).read_text())
    rows = inventory.get("A", []) + inventory.get("B", [])
    if not rows:
        print("t005b_rules: inventario vacío", file=sys.stderr)
        return 1
    bad = [(row.get("path"), problem) for row in rows for problem in violations(row)]
    bad += aggregate_violations(inventory, rows)
    covered = {tree for tree in TREES for row in rows if tree in str(row.get("path", ""))}
    for tree in sorted(set(TREES) - covered):
        bad.append((tree, "árbol sin ninguna fila"))
    for where, problem in bad[:50]:
        print(f"VIOLACIÓN\t{where}\t{problem}")
    print(f"t005b_rules: {len(rows)} fila(s), {len(bad)} violación(es), árboles cubiertos {len(covered)}/{len(TREES)}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "outputs/T005b-corpus-inventory.json"))
