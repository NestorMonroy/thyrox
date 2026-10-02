"""Veredicto de T003 a partir sólo de lo registrado en el banco.

PASS exige, en cada recreación (before→mid, mid→after): contenedor distinto,
mismo volumen (nombre, fecha de creación y punto de montaje), los mismos
conteos y la misma muestra (ids, hashes, md5 del texto), y recuperación PASS.
Uso: t003_verdict.py <outputs>
"""
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
rows = [json.loads(line) for line in (out / "T003-identities.jsonl").read_text().splitlines() if line.strip()]
containers = {r["phase"]: r for r in rows if "containerId" in r}
volumes = {r["phase"]: {k: r[k] for k in ("volume", "createdAt", "mountpoint")} for r in rows if "volume" in r}
snapshots = {p: json.loads((out / f"T003-snapshot-{p}.json").read_text()) for p in ("before", "mid", "after")}
retrieval = {p: json.loads((out / f"T003-retrieval-{p}.json").read_text()) for p in ("mid", "after")}
checks = {}
for previous, phase in (("before", "mid"), ("mid", "after")):
    checks[f"containerChanged_{previous}_{phase}"] = containers[previous]["containerId"] != containers[phase]["containerId"]
    checks[f"volumeSame_{phase}"] = volumes[phase] == volumes["before"]
    checks[f"countsSame_{phase}"] = snapshots[phase]["counts"] == snapshots["before"]["counts"]
    checks[f"sampleSame_{phase}"] = snapshots[phase]["sample"] == snapshots["before"]["sample"]
    checks[f"retrieval_{phase}"] = retrieval[phase]["passed"] is True
checks["sampleNonEmpty"] = bool(snapshots["before"]["sample"])
checks["declaredPortRestored"] = containers["after"]["port"] == containers["before"]["port"]
verdict = {"passed": all(checks.values()), "checks": checks,
           "containers": {p: r["containerId"] for p, r in containers.items()},
           "volume": volumes["before"], "counts": snapshots["before"]["counts"]}
print(json.dumps(verdict, indent=1))
sys.exit(0 if verdict["passed"] else 1)
