"""T005: une lo medido con las decisiones declaradas y valida las invariantes.

Rehúsa (exit 1) si una decisión marca seguro algo protegido, algo con un
contenedor que lo use, o algo de clase A/B/C/D/H. Emite la tabla
recurso · bytes · clase · motivo · safe_to_delete · expected_reclaim_bytes ·
referencias, y la lista cerrada de candidatos seguros.
Uso: t005_classify.py <outputs> <decisiones.json>
"""
import json
import sys
from pathlib import Path

out, decisions = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text())
observed = json.loads((out / "T005-observed-podman.json").read_text())
measured = json.loads((out / "T005-measured.json").read_text())
links = {line.split("\t")[0]: int(line.split("\t")[1].split("=")[1]) for line in (out / "T005-measured-cache-links.tsv").read_text().splitlines() if "single-link-bytes" in line}
PROTECTED = {"volume:thyrox-postgres-data", "volume:thyrox-quantization-lab-artifacts"}
SAFE_CLASSES = {"E", "F", "G"}
running_images = {c["image"] for c in observed["containers"]}
rows, problems = [], []


def decide(key: str, fallback: str) -> dict:
    return decisions.get(key) or decisions[fallback]


for volume in observed["volumes"]:
    named = not (len(volume["name"]) == 64 and all(c in "0123456789abcdef" for c in volume["name"]))
    key = f"volume:{volume['name']}" if named else "volume:anonymous"
    decision = decide(key, "volume:anonymous")
    bytes_ = measured["volumes"].get(volume["name"])
    rows.append({"resource": f"volume:{volume['name']}", "bytes": bytes_, "class": decision["class"], "reason": decision["reason"],
                 "safe_to_delete": decision["safe"], "expected_reclaim_bytes": bytes_ if decision["safe"] else 0,
                 "references": volume["users"], "mounted_by_running_container": [u for u in volume["users"] if u in observed["running"]],
                 "declared_by_thyrox": bool(volume["labels"].get("thyrox.owner-kind")) or named})
    if decision["safe"] and (volume["users"] or key in PROTECTED):
        problems.append(f"{key}: seguro con usuarios o protegido")
for image in observed["images"]:
    tags = image["tags"]
    names = tags + image["digests"]
    if any(name in running_images or name.split("@")[0] in running_images for name in names) or image["users"]:
        key = "image:in-use"
    elif any("thyrox-task-runner" in name for name in names):
        key = "image:task-runner"
    elif "localhost/thyrox-model-quantizer:dev" in tags:
        key = "image:localhost/thyrox-model-quantizer:dev"
    elif any(f"image:{digest}" in decisions for digest in image["digests"]):
        key = next(f"image:{digest}" for digest in image["digests"] if f"image:{digest}" in decisions)
    else:
        key = "image:intermediate"
    decision = decisions[key]
    rows.append({"resource": f"image:{(tags or image['digests'] or [image['id'][:12]])[0]}", "id": image["id"], "bytes": image["bytes"],
                 "class": decision["class"], "reason": decision["reason"], "safe_to_delete": decision["safe"],
                 "expected_reclaim_bytes": image["bytes"] if decision["safe"] else 0, "references": image["users"]})
    if decision["safe"] and (image["users"] or key == "image:in-use"):
        problems.append(f"{key}: seguro con contenedores que la usan")
for key, decision in decisions.items():
    if key.startswith("path:"):
        path = key[5:]
        bytes_ = measured["repoPaths"].get(path) or measured["hostPaths"].get(path.lstrip("/").replace("/", "_"))
        if path == "/root/.npm/_cacache":
            bytes_ = links.get("/measure/npm-cache")
        if path == "/root/.bun/install/cache":
            bytes_ = links.get("/measure/bun-cache")
        rows.append({"resource": key, "bytes": bytes_, "class": decision["class"], "reason": decision["reason"],
                     "safe_to_delete": decision["safe"], "expected_reclaim_bytes": (bytes_ or 0) if decision["safe"] else 0, "references": []})
for row in rows:
    if row["safe_to_delete"] and row["class"] not in SAFE_CLASSES:
        problems.append(f"{row['resource']}: clase {row['class']} no admite borrado")
    if row["safe_to_delete"] and not row["bytes"]:
        problems.append(f"{row['resource']}: seguro sin bytes medidos")
safe = sorted((r for r in rows if r["safe_to_delete"]), key=lambda r: -r["expected_reclaim_bytes"])
result = {"rows": rows, "safeCandidates": [{"resource": r["resource"], "id": r.get("id"), "expected_reclaim_bytes": r["expected_reclaim_bytes"]} for r in safe],
          "expectedReclaimBytes": sum(r["expected_reclaim_bytes"] for r in safe), "stoppedContainers": len([c for c in observed["containers"] if c["state"] != "running"]),
          "worktrees": len(measured["worktrees"]), "filesystem": measured["filesystem"], "problems": problems, "passed": not problems}
print(json.dumps(result, indent=1, ensure_ascii=False))
sys.exit(0 if not problems else 1)
