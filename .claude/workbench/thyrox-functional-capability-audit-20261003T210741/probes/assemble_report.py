"""El ensamblador único de la auditoría: genera capabilities/<dominio>.md y outputs/REPORT.md.

REPORT.md es una VISTA CONSOLIDADA DERIVADA, nunca la fuente: se regenera
desde capabilities/assessments.json, findings/*.md, experiments/*/,
decisions/ y evidence/. Ningún otro proceso escribe REPORT.md; cada fase
escribe su propio registro y este guion lo consolida. Registra report.generated
en el manifiesto (append-only).
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path

BENCH = Path(__file__).resolve().parents[1]
JSON_BLOCK = re.compile(r"```json\n(.*?)\n```", re.S)


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def render_capabilities(assessments: dict) -> list[str]:
    written = []
    for domain, items in assessments.items():
        if domain.startswith("_"):
            continue
        lines = [f"# {domain} — capability assessment", "",
                 "Regenerado por `probes/assemble_report.py` desde `capabilities/assessments.json`; "
                 "las transiciones conservan cada cambio de estado con su evidencia.", ""]
        notes = BENCH / "evidence/snapshot-sections" / f"{domain}.md"
        if notes.exists():
            lines += [f"Notas de evidencia textuales: [`evidence/snapshot-sections/{domain}.md`](../evidence/snapshot-sections/{domain}.md)", ""]
        for item in items:
            lines += [f"## {item['capability']}", "", f"**current_state:** {item['current_state']}", ""]
            if item.get("gap"):
                lines += [f"**gap:** {item['gap']}", ""]
            lines += ["| timestamp | previous | new | evidence |", "|---|---|---|---|"]
            lines += [f"| {t['timestamp']} | {t['previous'] or '—'} | {t['new']} | `{t['evidence']}` |" for t in item["transitions"]]
            lines.append("")
        (BENCH / "capabilities" / f"{domain}.md").write_text("\n".join(lines), encoding="utf-8")
        written.append(domain)
    return written


def findings() -> list[dict]:
    records = []
    for path in sorted(BENCH.glob("findings/H-*.md"), key=lambda p: int(p.stem.rsplit("-", 1)[1])):
        match = JSON_BLOCK.search(path.read_text(encoding="utf-8"))
        if match:
            record = json.loads(match.group(1))
            record["_path"] = f"findings/{path.name}"
            records.append(record)
    return records


def experiments() -> list[dict]:
    rows = []
    for directory in sorted(BENCH.glob("experiments/*/")):
        experiment = json.loads((directory / "experiment.json").read_text())
        verdict = json.loads((directory / "verdict.json").read_text())
        rows.append({**experiment, **verdict, "_path": f"experiments/{directory.name}"})
    return rows


def snapshots() -> list[dict]:
    events = [json.loads(line) for line in (BENCH / "manifest.jsonl").read_text().splitlines() if line.strip()]
    return [e for e in events if e.get("event") == "snapshot.created"]


def report(assessments: dict) -> str:
    out = ["# Auditoría funcional de Thyrox — vista consolidada", "",
           f"> **Vista derivada**, generada {now()} por `probes/assemble_report.py`. No es la fuente de verdad:",
           "> cada afirmación apunta a su registro (capability, finding, experiment, decision, evidence).",
           "> La cronología vive en `manifest.jsonl` y en `snapshots/`; no hace falta `git log` para reconstruirla.", "",
           "## Executive summary", "",
           "- La fotografía de medición está cerrada; las conclusiones de dominio están en `capabilities/` y `decisions/`.",
           "- `AUTONOMOUS_LOCAL_SELF_IMPLEMENTATION = NOT_ACCEPTED_YET`: ninguna identidad probada aprobó `repo-code-change@1` ([H-THYROX-470](../findings/H-THYROX-470.md), clasificación provisional MIXED).",
           "- Las mediciones que limitaron esos experimentos no representaban el hardware ([H-THYROX-471](../findings/H-THYROX-471.md)): rama A del DAG.",
           "- `controller.implementation` sigue en `bootstrap-exception`.", "",
           "## Capability matrix (current_state)", "",
           "| dominio | capability | current_state | gap | historia |", "|---|---|---|---|---|"]
    for domain, items in assessments.items():
        if domain.startswith("_"):
            continue
        for item in items:
            out.append(f"| {domain} | {item['capability']} | {item['current_state']} | {item.get('gap', '—')} | [capabilities/{domain}.md](../capabilities/{domain}.md) |")
    out += ["", "## Current findings", "", "| finding | severidad | evaluación vigente | registro |", "|---|---|---|---|"]
    for f in findings():
        out.append(f"| {f['finding_id']} | {f.get('severity') or '—'} | {(f.get('current_assessment') or '').replace('|', '/')} | [{f['_path']}](../{f['_path']}) |")
    out += ["", "## Local model qualification (experimentos inmutables)", "",
            "| experimento | modelo | suite | casos | tok/s | veredicto del pool | registro |", "|---|---|---|---|---|---|---|"]
    for e in experiments():
        tps = f"{e['tokensPerSecond']:.2f}" if isinstance(e.get("tokensPerSecond"), (int, float)) else "—"
        out.append(f"| {e['experiment_id']} | `{e['model']}` | {e['suite']} | {e['casesPassed']}/{e['casesTotal']} | {tps} | {e.get('pool_verdict') or '—'} | [{e['_path']}](../{e['_path']}) |")
    out += ["", "## Identity migration", "", "Inventario: [`outputs/identity-surface-inventory.tsv`](identity-surface-inventory.tsv); análisis textual: [`evidence/snapshot-sections/identity-migration.md`](../evidence/snapshot-sections/identity-migration.md); evaluación: [`capabilities/identity-migration.md`](../capabilities/identity-migration.md).", "",
            "## Transformers / ML", "", "Análisis textual: [`evidence/snapshot-sections/transformers-ml.md`](../evidence/snapshot-sections/transformers-ml.md); evaluación: [`capabilities/transformers-ml.md`](../capabilities/transformers-ml.md).", "",
            "## Authority map, duplication y disconnected", "", "[`decisions/final-dag.md`](../decisions/final-dag.md) (vigente) · [`decisions/initial-plan.md`](../decisions/initial-plan.md) (inicial).", "",
            "## Dependency graph", "", "Vigente en [`decisions/final-dag.md`](../decisions/final-dag.md) («Final dependency graph»).", "",
            "## Recommended next execution", "", "Rama A: A1 admisión de RAM sobre la frontera real de las unidades; A2 materialización sin copia duplicada inexplicada. Después, repetir la línea base de `repo-code-change@1` y los experimentos uno por uno.", "",
            "## Evidence index", "", "| snapshot | commit | sha256 |", "|---|---|---|"]
    for s in snapshots():
        out.append(f"| [`{s['path']}`](../{s['path']}) | {s.get('source_commit', '—')[:12]} | {s['sha256'][:16]}… |")
    out += ["", "Otros: `outputs/` (salidas de sondas, rojos y anulaciones), `evidence/store-revisions/` (versiones del store recuperadas), `evidence/snapshot-sections/`, `decisions/`, `manifest.jsonl`.", ""]
    return "\n".join(out)


def main() -> int:
    assessments = json.loads((BENCH / "capabilities/assessments.json").read_text())
    domains = render_capabilities(assessments)
    text = report(assessments)
    target = BENCH / "outputs/REPORT.md"
    target.write_text(text, encoding="utf-8")
    digest = hashlib.sha256(text.encode()).hexdigest()
    with (BENCH / "manifest.jsonl").open("a", encoding="utf-8") as manifest:
        manifest.write(json.dumps({"kind": "event", "event": "report.generated", "at": now(), "path": "outputs/REPORT.md", "sha256": digest, "assembler": "probes/assemble_report.py"}, ensure_ascii=False) + "\n")
    print(json.dumps({"capabilities": domains, "report_sha256": digest}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
