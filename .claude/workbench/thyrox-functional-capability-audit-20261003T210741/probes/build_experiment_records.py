"""Genera los registros inmutables de cada corrida real de la auditoría.

Cada experimento enlaza su trabajo (.claude/jobs/<run>), su registro en
.thyrox/models/qualifications.json (por measuredAt) y, en las corridas de flujo,
la salida del pool en outputs/. Escribe experiment.json, runtime-profile.json,
verdict.json y evidence.json, y los deja de sólo lectura. No sobrescribe un
experimento existente: un resultado cerrado es inmutable.

Métrica: los campos que el registro y los archivos del pool declaran.
Ciega a: lo que no quedó en disco (la corrida sin registro se marca así).
"""
from __future__ import annotations

import json
import os
import stat
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BENCH = Path(__file__).resolve().parents[1]
QUALIFICATIONS = ROOT / ".thyrox/models/qualifications.json"

QWEN3 = "thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e"
CODER = "thyrox-qwen--qwen2.5-coder-7b-instruct-gguf:q4_k_m-hf-13fb94bfda8c"
QWEN25 = "thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95"
REPO_SUITE = "src/packages/local-models/suites/repo-code-change-1/suite.json"

# id · modelo · suite · trabajo · measuredAt (None = no se escribió) · salida del pool · observaciones (hechos)
EXPERIMENTS = [
    ("tool-calling-qwen3-4b-8k-r1", QWEN3, "tool-calling@1", "qualify-protocol-8k-0931-20261003T213601", "2026-10-03T21:39:48.777Z", None, []),
    ("mecanica-qwen3-4b-8k-r1", QWEN3, "batch-worker-mecanica@1", "qualify-mecanica-8k-0931-20261003T213959", "2026-10-03T21:40:23.054Z", None, []),
    ("repo-code-change-qwen3-4b-8k-nobudget-r0", QWEN3, "repo-code-change@1", "qualify-workflow-8k-0931-20261003T214232", None, "outputs/workflow-qualify-8k",
     ["primer turno de 26085 tokens de prompt contra n_ctx 8192 (exceed_context_size_error)",
      "la suspensión no se escribió: sin tokens generados no había velocidad positiva (corregido después)"]),
    ("repo-code-change-qwen3-4b-8k-b2048-t600", QWEN3, "repo-code-change@1", "qualify-workflow-8k-b2048-20261003T215316", "2026-10-03T22:03:58.408Z", "outputs/workflow-qualify-8k-b2048",
     ["el pool mató el caso a los 600 s (su --timeout por defecto) antes del primer evento", "veredicto no-local: sin línea served-by"]),
    ("repo-code-change-qwen3-4b-r1", QWEN3, "repo-code-change@1", "qualify-workflow-8k-t5400-20261003T220454", "2026-10-03T22:18:59.247Z", "outputs/workflow-qualify-8k-b2048-t5400",
     ["Edit reemplazó sólo la línea raise con un def anidado que duplica slugify",
      "escribió \\u0000 sin escapar para JSON: slug.py quedó binario",
      "editó el archivo de pruebas", "repitió un Edit sin cambio 3 veces y la misma prueba 5",
      "su última llamada salió como texto", "el proceso del vigilante de este ítem se retiró a mano (H-THYROX-467)"]),
    ("tool-calling-qwen25-coder-7b-8k-r1", CODER, "tool-calling@1", "qualify-coder7b-protocol-8k-20261003T223606", "2026-10-03T22:37:58.826Z", None,
     ["4 de 6 casos: llamadas emitidas como texto (<tools>, JSON cercado, <response>)"]),
    ("tool-calling-qwen25-7b-instruct-8k-r1", QWEN25, "tool-calling@1", "qualify-q25-7b-protocol-8k-20261003T224613", "2026-10-03T22:47:52.400Z", None, []),
    ("mecanica-qwen25-7b-instruct-8k-r1", QWEN25, "batch-worker-mecanica@1", "qualify-q25-7b-mecanica-8k-20261003T224821", "2026-10-03T22:49:11.815Z", None, []),
    ("repo-code-change-qwen25-7b-instruct-r1", QWEN25, "repo-code-change@1", "qualify-q25-7b-workflow-8k-20261003T224932", "2026-10-03T22:58:06.362Z", "outputs/workflow-q25-7b-8k",
     ["leyó src/packages/local-models/textkit/slug.py: la ruta del ítem sin suites/repo-code-change-1/",
      "listó el directorio correcto, probó otra ruta errónea y terminó con prosa a los 4 turnos", "sin cambios"]),
    ("repo-code-change-qwen25-7b-instruct-r2", QWEN25, "repo-code-change@1", "qualify-q25-7b-workflow-8k-n2-20261003T225920", "2026-10-03T23:11:11.720Z", "outputs/workflow-q25-7b-8k-n2",
     ["leyó la ruta correcta y apuntó a reutilizar slugify",
      "old_string escapado como regex (NotImplementedError\\\\() no casó en dos Edit",
      "editó la firma y dejó un error de sintaxis", "nunca corrió las pruebas", "su última llamada salió como texto"]),
]


def qualification_at(measured_at: str | None) -> dict | None:
    if measured_at is None:
        return None
    records = json.loads(QUALIFICATIONS.read_text())["qualifications"]
    return next((r for r in records if r["measuredAt"] == measured_at), None)


def pool_files(pool_out: str | None) -> dict:
    if pool_out is None:
        return {}
    pool = BENCH / pool_out / "title-slug" / "pool"
    files = {name: str((pool / name).relative_to(BENCH)) for name in
             ("1.stream.jsonl", "1.live.jsonl", "1.err", "1.patch", "1.verify.log", "1.verdict", "1.watchdog")
             if (pool / name).exists()}
    policy = BENCH / pool_out / "title-slug" / "policy.json"
    if policy.exists():
        files["policy.json"] = str(policy.relative_to(BENCH))
    verdict = (pool / "1.verdict").read_text().strip() if (pool / "1.verdict").exists() else None
    return {"files": files, "pool_verdict": verdict}


def write_frozen(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n")
    path.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)


def main() -> int:
    created = []
    for exp_id, model, suite, job, measured_at, pool_out, observations in EXPERIMENTS:
        directory = BENCH / "experiments" / exp_id
        if directory.exists():
            continue
        directory.mkdir(parents=True)
        record = qualification_at(measured_at)
        pool = pool_files(pool_out)
        job_dir = ROOT / ".claude/jobs" / job
        write_frozen(directory / "experiment.json", {
            "experiment_id": exp_id, "model": model, "suite": suite,
            "suite_definition": REPO_SUITE if suite == "repo-code-change@1" else f"src/packages/local-models/suites/{'tool-calling-1.json' if suite == 'tool-calling@1' else 'batch-worker-mecanica-1.json'}",
            "job": f".claude/jobs/{job}", "job_log": f".claude/jobs/{job}/outputs/salida.log" if (job_dir / "outputs/salida.log").exists() else None,
            "measured_at": measured_at, "qualification_recorded": record is not None,
        })
        write_frozen(directory / "runtime-profile.json", {
            "contextTokens": record["contextTokens"] if record else 8192,
            "measurementCondition": record["measurementCondition"] if record else "isolated",
            "reasoningEffort": record.get("reasoningEffort") if record else "none",
            "runtimeProfile": record.get("runtimeProfile") if record else None,
            "note": None if record else "sin registro: el perfil es el de la invocación (8K, sin presupuesto de sistema)",
        })
        write_frozen(directory / "evidence.json", {"pool": pool.get("files", {}), "prompt": "src/packages/local-models/suites/repo-code-change-1/prompt.md" if pool_out else None})
        write_frozen(directory / "verdict.json", {
            "passed": record["passed"] if record else False,
            "casesPassed": record["casesPassed"] if record else 0,
            "casesTotal": record["casesTotal"] if record else 1,
            "tokensPerSecond": record["tokensPerSecond"] if record else None,
            "pool_verdict": pool.get("pool_verdict"),
            "observations": observations,
        })
        created.append(exp_id)
    print(json.dumps({"created": created}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
