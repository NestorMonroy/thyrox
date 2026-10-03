"""T003: el corpus de después es el de antes. Falla si falta una instantánea,
si los conteos o la muestra difieren, o si la muestra está vacía.
Uso: compare_snapshots.py <antes.json> <después.json>"""
import json
import sys
from pathlib import Path


def load(path: str):
    text = Path(path).read_text().strip()
    return json.loads(text) if text else None


before, after = load(sys.argv[1]), load(sys.argv[2])
reasons = []
if not before or not after:
    reasons.append("falta una instantánea (la consulta no encontró el corpus)")
else:
    if not before.get("sample"):
        reasons.append("muestra vacía antes")
    if before["counts"] != after["counts"]:
        reasons.append(f"conteos distintos: {before['counts']} → {after['counts']}")
    if before["sample"] != after["sample"]:
        reasons.append("la muestra cambió (ids, hashes o texto)")
print(json.dumps({"passed": not reasons, "reasons": reasons,
                  "sampleSize": len((before or {}).get("sample") or []), "counts": (before or {}).get("counts")}, ensure_ascii=False))
sys.exit(0 if not reasons else 1)
