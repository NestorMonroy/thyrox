#!/bin/sh
# Verify de P0 (contract.md §8). Corre en la unidad: no ve Podman ni el host,
# así que no mide las compuertas; comprueba que el preflight del host las midió
# (outputs/P0-admission.json), que las cuatro pasaron, que la medición es
# reciente, y vuelve a medir el libre del sistema de archivos contra lo
# requerido + margen de ese informe. Sale 0 sólo si todo se cumple.
set -eu
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json, shutil, sys
from datetime import datetime, timezone
MAX_AGE_SECONDS = 1800
try:
    report = json.load(open("outputs/P0-admission.json"))
except (OSError, ValueError) as error:
    sys.exit(f"P0: sin informe de preflight legible ({error})")
gates = report.get("gates", {})
names = ("durable_corpus_accepted", "local_reclaim_completed", "disk_admission", "ownership_available")
failed = [name for name in names if not gates.get(name, {}).get("passed")]
if failed:
    sys.exit(f"P0: compuertas sin PASS: {', '.join(failed)}")
age = (datetime.now(timezone.utc) - datetime.strptime(report["measuredAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)).total_seconds()
if age > MAX_AGE_SECONDS:
    sys.exit(f"P0: preflight de hace {int(age)} s; se exige uno de menos de {MAX_AGE_SECONDS} s")
disk = gates["disk_admission"]
free = shutil.disk_usage(".").free
if free < disk["requiredBytes"] + disk["safetyMarginBytes"]:
    sys.exit(f"P0: libre ahora {free} < requerido {disk['requiredBytes']} + margen {disk['safetyMarginBytes']}")
print("P0 PASS")
PY
