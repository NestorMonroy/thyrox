"""P0 del lote A1–A7: cuatro compuertas deterministas que deben pasar antes de A1.

Las compuertas leen evidencia ya escrita y miden el estado vivo; no reparan,
no borran y no lanzan nada. Si una falla, el ítem P0 sale distinto de 0, el
controlador lo deja en hard_block y ningún A<n> arranca (todos dependen de P0).

  1. durable_corpus_accepted  — PostgreSQL + pgvector aceptado por T009
  2. local_reclaim_completed  — T006 borró sólo lo probado y T007 re-verificó
  3. disk_admission           — libre observado >= requerido + margen
  4. ownership_available      — la sesión propietaria declara y tiene libres
                                 el catálogo y el store de cualificaciones

Uso: p0_preconditions.py <banco A> <banco reclaim> [--report ruta.json]
Sale 0 sólo si las cuatro pasan; 1 si alguna falla; 2 si no pudo medir.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

DURABLE_ITEMS = ("T001", "T002", "T003", "T004", "T004a", "T004b", "T004c", "T004d", "T004e", "T008", "T009")
RECLAIM_ITEMS = ("T006", "T007")
PROOF_FIELDS = ("document_present", "content_hash_match", "chunks_persisted", "embeddings_present",
                "retrieval_ok", "retrieval_ok_with_source_absent")
POST_RECLAIM_FIELDS = ("postgresReady", "vectorExtension", "schemaPresent", "countsMatch", "retrievalPass")
OWNERSHIP_FIELDS = ("sessionId", "clone", "ownsArtifactSha256", "ownsVolume", "catalogPath",
                    "qualificationStorePath", "declaredAt")


class Unmeasurable(Exception):
    """La compuerta no pudo medir: no es un FAIL ni un PASS."""


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def item_states(reclaim_bank: Path) -> dict[str, str]:
    """El último estado asentado de cada ítem en el registro del controlador."""
    log = reclaim_bank / "outputs" / "continuation.jsonl"
    if not log.is_file():
        raise Unmeasurable(f"falta {log}")
    states: dict[str, str] = {}
    for row in read_jsonl(log):
        if row.get("kind") in ("accepted", "blocked", "hard_block", "dependency_blocked", "commit-failed"):
            states[row.get("item", "")] = row["kind"]
    return states


def rerun_verify(reclaim_bank: Path, item: str) -> bool:
    """Vuelve a correr el verify declarado del ítem: un `accepted` viejo no basta."""
    plan = {row["id"]: row for row in read_jsonl(reclaim_bank / "plan.jsonl")}
    if item not in plan:
        raise Unmeasurable(f"{item} no está en el plan de reclaim")
    result = subprocess.run(["bash", "-c", plan[item]["verify"]], cwd=reclaim_bank,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return result.returncode == 0


def deletion_proofs(reclaim_bank: Path) -> dict[str, dict]:
    path = reclaim_bank / "outputs" / "T009-deletion-proofs.jsonl"
    if not path.is_file():
        return {}
    return {row["source_path"]: row for row in read_jsonl(path) if "source_path" in row}


def proof_holds(row: dict) -> bool:
    """safe_to_delete sólo vale si cada eslabón del invariante de T009 consta como verdadero."""
    return bool(row.get("safe_to_delete")) and all(row.get(field) is True for field in PROOF_FIELDS)


def check_durable_corpus(reclaim_bank: Path) -> dict:
    states = item_states(reclaim_bank)
    missing = [item for item in DURABLE_ITEMS if states.get(item) != "accepted"]
    stale = [item for item in DURABLE_ITEMS if item not in missing and not rerun_verify(reclaim_bank, item)]
    proofs = deletion_proofs(reclaim_bank)
    broken = sorted(path for path, row in proofs.items() if row.get("safe_to_delete") and not proof_holds(row))
    passed = not missing and not stale and bool(proofs) and not broken
    return {"passed": passed, "notAccepted": missing, "verifyNoLongerPasses": stale,
            "deletionProofRows": len(proofs), "safeWithoutFullProof": broken}


def check_local_reclaim(reclaim_bank: Path) -> dict:
    states = item_states(reclaim_bank)
    missing = [item for item in RECLAIM_ITEMS if states.get(item) != "accepted"]
    stale = [item for item in RECLAIM_ITEMS if item not in missing and not rerun_verify(reclaim_bank, item)]
    reclaim_path = reclaim_bank / "outputs" / "T006-reclaim.json"
    post_path = reclaim_bank / "outputs" / "T007-verify.json"
    if not reclaim_path.is_file() or not post_path.is_file():
        return {"passed": False, "notAccepted": missing, "verifyNoLongerPasses": stale,
                "reason": "falta T006-reclaim.json o T007-verify.json"}
    reclaim = json.loads(reclaim_path.read_text())
    post = json.loads(post_path.read_text())
    proofs = deletion_proofs(reclaim_bank)
    entries = reclaim.get("deleted", [])
    unproven = sorted(entry.get("path", "?") for entry in entries
                      if not proof_holds(proofs.get(entry.get("path", ""), {}))
                      or not entry.get("replacedBy") or not isinstance(entry.get("bytes"), int))
    before, after = reclaim.get("freeBytesBefore"), reclaim.get("freeBytesAfter")
    observed = reclaim.get("reclaimedBytesObserved")
    arithmetic = all(isinstance(value, int) for value in (before, after, observed)) and observed == after - before
    post_ok = all(post.get(field) is True for field in POST_RECLAIM_FIELDS)
    passed = not missing and not stale and bool(entries) and not unproven and arithmetic and post_ok
    return {"passed": passed, "notAccepted": missing, "verifyNoLongerPasses": stale,
            "deletedEntries": len(entries), "deletedWithoutProof": unproven,
            "freeBytesBefore": before, "freeBytesAfter": after, "reclaimedBytesObserved": observed,
            "reclaimArithmeticHolds": arithmetic, "postReclaimChecks": {f: post.get(f) for f in POST_RECLAIM_FIELDS}}


def tree_bytes(path: Path) -> int:
    total = 0
    for root, _dirs, files in os.walk(path):
        for name in files:
            try:
                total += os.lstat(os.path.join(root, name)).st_size
            except OSError:
                pass
    return total


def tracked_tree_bytes(repo: Path) -> int:
    listing = subprocess.run(["git", "-C", str(repo), "ls-tree", "-r", "-l", "HEAD"],
                             capture_output=True, text=True, check=True).stdout
    return sum(int(line.split()[3]) for line in listing.splitlines() if line.split()[3].isdigit())


def attempt_count(bank: Path) -> int:
    log = bank / "outputs" / "continuation.jsonl"
    return sum(1 for row in read_jsonl(log) if row.get("kind") == "attempt") if log.is_file() else 0


def evidence_bytes_per_attempt(repo: Path, bank: Path) -> int:
    attempts = attempt_count(bank)
    if attempts == 0:
        raise Unmeasurable(f"{bank} no tiene intentos de los que medir evidencia por intento")
    jobs = repo / ".claude" / "jobs"
    job_bytes = sum(tree_bytes(path) for path in jobs.glob("cont-*") if path.is_dir()) if jobs.is_dir() else 0
    job_count = sum(1 for path in jobs.glob("cont-*") if path.is_dir()) if jobs.is_dir() else 0
    # Los trabajos cont-* de todos los bancos se reparten por igual: se usa el promedio por trabajo
    # multiplicado por los trabajos que un intento abre (intento + verify), más las salidas del banco.
    per_job = job_bytes // job_count if job_count else 0
    return 2 * per_job + tree_bytes(bank / "outputs") // attempts


def image_present(tag: str, repo: Path) -> bool:
    observed = subprocess.run(["bash", str(repo / "bin" / "podman-execution-execute"), "observe", "images"],
                              capture_output=True, text=True)
    if observed.returncode != 0:
        raise Unmeasurable("no se pudieron observar las imágenes")
    return any(tag in name for image in json.loads(observed.stdout) for name in image.get("tags") or [])


def check_disk_admission(bank: Path, repo: Path, ownership: dict | None) -> dict:
    spec = json.loads((bank / "p0" / "disk-requirements.json").read_text())
    worktrees = len(spec["worktreeItems"])
    components: dict[str, int] = {
        "worktrees": worktrees * tracked_tree_bytes(repo),
        "worktreeDependencies": worktrees * tree_bytes(repo / spec["dependencyTree"]),
        "attemptEvidence": (len(spec["worktreeItems"]) + 1) * spec["attemptsCeilingPerItem"]
        * evidence_bytes_per_attempt(repo, repo / spec["evidenceSampleBank"]),
        "qualificationOutputs": len(spec["capabilitiesToQualify"])
        * tree_bytes(repo / spec["qualificationSampleBank"] / "outputs"),
        "batchWorkbenchOutputs": tree_bytes(bank / "outputs"),
    }
    store_bytes = 0
    if ownership:
        for key in spec["storeFiles"]:
            path = Path(ownership[key])
            store_bytes += path.stat().st_size if path.is_file() else 0
    components["catalogAndStoreWrites"] = spec["storeGrowthFactor"] * store_bytes
    refusals = []
    if not image_present(spec["requiredImageTag"], repo):
        refusals.append(f"ninguna imagen lleva {spec['requiredImageTag']}: un pull de tamaño desconocido no se admite")
    if ownership is None:
        refusals.append("sin declaración de propiedad no se puede comprobar que el artefacto ya está presente")
    required = sum(components.values())
    margin = max(spec["safetyMarginFloorBytes"], int(required * spec["safetyMarginFraction"]))
    available = min(shutil.disk_usage(repo / p).free for p in spec["filesystemPaths"])
    passed = not refusals and available >= required + margin
    return {"passed": passed, "availableBytes": available, "requiredBytes": required,
            "safetyMarginBytes": margin, "components": components, "refusals": refusals}


def live_writers(paths: list[str], repo: Path) -> bool:
    result = subprocess.run(["bash", str(repo / "bin" / "writer_inspector"), *paths],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return result.returncode != 0


def catalog_declares(catalog: Path, sha256: str) -> bool:
    text = catalog.read_text()
    return sha256 in text


def check_ownership(bank: Path, repo: Path) -> tuple[dict, dict | None]:
    path = bank / "p0" / "ownership.json"
    if not path.is_file():
        return {"passed": False, "reason": "falta p0/ownership.json: la sesión propietaria no ha declarado"}, None
    ownership = json.loads(path.read_text())
    absent = [field for field in OWNERSHIP_FIELDS if not ownership.get(field) or str(ownership[field]).startswith("<")]
    if absent:
        return {"passed": False, "reason": "campos sin declarar", "fields": absent}, None
    problems = []
    if Path(ownership["clone"]).resolve() != repo.resolve():
        problems.append("el lote no corre en el clon propietario")
    stores = [ownership["catalogPath"], ownership["qualificationStorePath"]]
    for store in stores:
        if not Path(store).is_file():
            problems.append(f"no existe {store}")
    if not problems and live_writers(stores, repo):
        problems.append("hay un escritor vivo sobre el catálogo o el store de cualificaciones")
    if not problems and not catalog_declares(Path(ownership["catalogPath"]), ownership["ownsArtifactSha256"]):
        problems.append("el catálogo no declara el blob propietario")
    return {"passed": not problems, "problems": problems, "sessionId": ownership["sessionId"]}, ownership


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bank", type=Path)
    parser.add_argument("reclaim_bank", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    repo = Path(subprocess.run(["git", "-C", str(args.bank), "rev-parse", "--show-toplevel"],
                               capture_output=True, text=True, check=True).stdout.strip())
    try:
        ownership_gate, ownership = check_ownership(args.bank, repo)
        gates = {
            "durable_corpus_accepted": check_durable_corpus(args.reclaim_bank),
            "local_reclaim_completed": check_local_reclaim(args.reclaim_bank),
            "disk_admission": check_disk_admission(args.bank, repo, ownership),
            "ownership_available": ownership_gate,
        }
    except Unmeasurable as error:
        print(f"P0: no se pudo medir — {error}", file=sys.stderr)
        return 2
    report = {"measuredAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
              "passed": all(gate["passed"] for gate in gates.values()), "gates": gates}
    text = json.dumps(report, indent=2, ensure_ascii=False)
    if args.report:
        args.report.write_text(text + "\n")
    for name, gate in gates.items():
        print(f"P0 {name}: {'PASS' if gate['passed'] else 'FAIL'}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
