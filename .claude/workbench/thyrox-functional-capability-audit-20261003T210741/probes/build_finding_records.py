"""Escribe findings/<id>.md para cada hallazgo de esta auditoría.

Fuente: la fila vigente del agent store (no guarda revisiones: un --force la
sobrescribe, H-THYROX-473), las revisiones recuperadas de los blobs versionados
(evidence/store-revisions/) y el historial de evaluaciones declarado
(findings/assessment-history.json). Cada archivo separa OBSERVATION,
ASSESSMENT HISTORY y CURRENT ASSESSMENT, con un bloque JSON legible por el
ensamblador. Regenerable: no es la fuente de las observaciones, las referencia.
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BENCH = Path(__file__).resolve().parents[1]
STORE = ROOT / "agent-results/agent_store.sqlite3"
FIRST, LAST = 452, 473

# Observaciones estables por hallazgo: hechos medidos, con su evidencia.
OBSERVATIONS = {
    "H-THYROX-470": [
        {"fact": "qwen3-4b bc640142 Q4_K_M: repo-code-change@1 FAIL (rechazado)", "evidence": "experiments/repo-code-change-qwen3-4b-r1"},
        {"fact": "qwen2.5-7b-instruct bb5d59e0 Q4_K_M: repo-code-change@1 FAIL r1 (sin-cambios)", "evidence": "experiments/repo-code-change-qwen25-7b-instruct-r1"},
        {"fact": "qwen2.5-7b-instruct bb5d59e0 Q4_K_M: repo-code-change@1 FAIL r2 (rechazado)", "evidence": "experiments/repo-code-change-qwen25-7b-instruct-r2"},
        {"fact": "qwen2.5-coder-7b 13fb94bf Q4_K_M: tool-calling@1 2/6, no elegible", "evidence": "experiments/tool-calling-qwen25-coder-7b-8k-r1"},
        {"fact": "perfil: local, unidad gestionada, 8K, presupuesto de sistema 2048, prompt limpio, vigilante", "evidence": "experiments/*/runtime-profile.json"},
    ],
}


def current_rows() -> dict[str, dict]:
    c = sqlite3.connect(f"file:{STORE}?mode=ro", uri=True)
    cols = [r[1] for r in c.execute("pragma table_info(findings_history)")]
    rows = {}
    for n in range(FIRST, LAST + 1):
        fid = f"H-THYROX-{n}"
        row = c.execute("select * from findings_history where finding_id=?", (fid,)).fetchone()
        if row:
            rows[fid] = dict(zip(cols, row))
    return rows


def render(fid: str, row: dict, history: list[dict]) -> str:
    record = {
        "finding_id": fid, "created_at": row.get("created_at"), "updated_at": row.get("updated_at"),
        "severity": row.get("severity"), "initiative": row.get("initiative"), "status": row.get("status") or "open",
        "source_ref": row.get("source_ref"),
        "observations": OBSERVATIONS.get(fid, [{"fact": row.get("content"), "evidence": row.get("source_ref")}]),
        "assessment_history": history or [{"timestamp": row.get("created_at"), "previous": None, "new": "registrado", "reason": "versión única en el store", "evidence": [row.get("source_ref")]}],
        "current_assessment": row.get("summary"),
    }
    lines = [f"# {fid}", "", "```json", json.dumps(record, ensure_ascii=False, indent=1), "```", "",
             "## OBSERVATION", ""]
    lines += [f"- {o['fact']} — `{o['evidence']}`" for o in record["observations"]]
    lines += ["", "## ASSESSMENT HISTORY", ""]
    lines += [f"- {h['timestamp']}: {h['previous']} → **{h['new']}** — {h['reason']}" for h in record["assessment_history"]]
    lines += ["", "## CURRENT ASSESSMENT", "", record["current_assessment"] or "", ""]
    return "\n".join(lines)


def main() -> int:
    histories = json.loads((BENCH / "findings/assessment-history.json").read_text())
    written = []
    for fid, row in current_rows().items():
        (BENCH / "findings" / f"{fid}.md").write_text(render(fid, row, histories.get(fid, [])))
        written.append(fid)
    print(json.dumps({"written": written}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
