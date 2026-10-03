#!/usr/bin/env python3
"""Plan de preservación de las imágenes intermedias, paso puro sobre archivos.

Entradas: la clasificación canónica de T005 (clase, safe_to_delete, uniqueBytes),
el censo experimental (sólo para la imagen final, por la cadena de Parent, que
la observación del dueño todavía no expone) y la procedencia declarada.
No observa Podman, no borra y no publica. Uso:
    preservation_plan.py <T005-classification.json> <census.json> <provenance.json> <salida.json>
"""
import json
import sys

classification_path, census_path, provenance_path, output_path = sys.argv[1:5]
classified = {row["id"]: row for row in json.load(open(classification_path))["rows"] if row["resource"].startswith("image:")}
census = json.load(open(census_path))
provenance = json.load(open(provenance_path))
finals, reused = provenance["finals"], provenance["crossBuildCacheReuse"]


def preservation_requirement(unique_bytes: int, final: dict, short_id: str) -> tuple[str, str]:
    """Clasificación del análisis, no un enum de producto."""
    if unique_bytes > 0:
        return "OCI_PRESERVATION_CANDIDATE", "tiene bytes únicos"
    if short_id in reused:
        return "BUILD_CACHE_CANDIDATE", f"reutilizada entre builds ({reused[short_id]})"
    if final.get("remoteCopy"):
        return "PROVENANCE_ONLY_CANDIDATE", "0 bytes únicos y su imagen final tiene copia remota verificada"
    return "KEEP_LOCAL_UNTIL_FINAL_DURABLE", "0 bytes únicos, pero su imagen final sólo existe en este almacén"


plan = []
for image in census:
    if image["repoTags"]:
        continue
    row = classified[image["imageId"]]
    final = finals.get(image["finalImageId"][:12], {})
    requirement, reason = preservation_requirement(row["uniqueBytes"], final, image["imageId"][:12])
    plan.append({
        "imageId": image["imageId"], "parentId": image["parentId"], "finalImageId": image["finalImageId"],
        "t005Class": row["class"], "safeToDelete": row["safe_to_delete"], "uniqueBytes": row["uniqueBytes"],
        "task": final.get("task"), "build": final.get("build"), "commit": final.get("commit"),
        "containerfile": final.get("containerfile"), "historyLines": image["historyLines"],
        "reproducible": "partial: Containerfile versioned, BASE_IMAGE ubuntu:24.04 is a mutable tag",
        "semanticValue": "provenance and build history", "preservationRequirement": requirement, "reason": reason,
        "gcEligible": False,
    })
json.dump(plan, open(output_path, "w"), indent=1)
counts = {}
for item in plan:
    counts[item["preservationRequirement"]] = counts.get(item["preservationRequirement"], 0) + 1
print(json.dumps({"untagged": len(plan), "byRequirement": counts, "gcEligible": sum(i["gcEligible"] for i in plan)}))
