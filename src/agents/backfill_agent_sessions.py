#!/usr/bin/env python3
# OBSOLETE: 2026-08-28 — mismo insumo que reconciliar_store.py y 0 filas
# SUCESOR: python3 .claude/scripts/agents/reconciliar_store.py
# HALLAZGO: H-DOCS-498
"""backfill_agent_sessions.py — reconstruye ``agent_sessions`` desde los
transcripts ``.jsonl`` reales que el harness ya escribió en
``~/.claude/projects/**/subagents/``.

Por que se deprecia
--------------------
``reconciliar_store.py`` lee **el mismo insumo** —los transcripts bajo
``~/.claude/projects/**/subagents/``— y ya corre en dos disparadores
(``SessionStart`` y ``Stop``). Medido 2026-08-28 con los dos apuntando a la
misma raíz (``HOME=/root``): de los **278** transcripts en disco, los que
este guion insertaría y el reconciliador no había visto son **0**.

Y no es sólo redundante: escribiría **peor**. Su ``INSERT`` no declara
ninguna de las tres columnas de procedencia —``usage_source``,
``outcome_source``, ``retention_level``— que el reconciliador sí escribe, así
que toda fila nacida por esta vía queda con ``usage_source`` en ``NULL``, que
es exactamente lo que ``calibration-verified-numbers.md`` prohíbe: un ``NULL``
indistinguible de «nadie ha pasado todavía». Su criterio de desenlace también
es más pobre — un literal (``"hit your session limit"``) contra la firma
medida del rol del último mensaje que el reconciliador usa.

*Métrica:* ``agent_id`` de los transcripts en disco que no están en
``agent_sessions``.
*Ciega a:* un transcript bajo una raíz distinta de la que el reconciliador
barre; si las dos raíces divergieran, la cifra de 0 dejaría de valer.

Por que existió
----------------
Medido 2026-08-16 (H-DOCS-173): ``agent_sessions`` tenía **0 filas**. Los
hooks ``SubagentStart``/``SubagentStop`` están cableados en
``settings.json`` a ``register_agent_session.py`` pero se creía (H-DOCS-167,
premisa hoy superada por la tarea #587) que no disparaban. El dato real, sin
embargo, SÍ existe: cada subagente deja su transcript completo
(``agent-<id>.jsonl``) + su sidecar (``agent-<id>.meta.json``) en disco,
container-efímero pero presente ahora.

Este guion reusa exactamente la misma extracción de uso que ya está probada
(``_extract_usage`` de ``register_agent_session.py``/``costo-agente.sh``,
H-DOCS-135/136/168) para poblar la tabla retroactivamente, en vez de esperar
a que el gap de los hooks se cierre. Es la misma lógica de
``backfill_findings_history.py`` aplicada a la otra tabla — DEC-07 ya declara
el SQLite como índice reconstruible.

Qué NO hace
-----------
No toca ningún transcript. No inventa ``session_id``/``model`` si el sidecar
no los trae — quedan NULL, igual que haría el hook real. Un transcript
vacío (0 turnos de uso, típico de un agente que murió antes de escribir el
primer bloque ``usage``) se registra igual pero sin columnas de costo —
mismo criterio que ``bash-background-tasks.md`` usa para distinguir
"indecidible" de "sin trabajo".
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

_g = importlib.util.spec_from_file_location(
    "deprecado", Path(__file__).resolve().parents[1] / "deprecated.py")
_dep = importlib.util.module_from_spec(_g)
_g.loader.exec_module(_dep)
_dep.deprecated_guard("backfill_agent_sessions.py")

HERE = Path(__file__).resolve().parent  # .../.claude/scripts/agents
# H-DOCS-494: mismo movimiento (docs@d566c180); aqui lo que dejo de
# resolver fue `HERE.parent / "hooks"`. El guard se ancla a
# `source/gestion/pm`, no a `.claude` — ver el hermano de `corpus/`.
DOCS_ROOT = HERE.parents[2]  # kaupamex-docs/
assert (DOCS_ROOT / "source" / "gestion" / "pm").is_dir(), (
    f"raiz mal anclada: {DOCS_ROOT} — no tiene source/gestion/pm")

_spec_store = importlib.util.spec_from_file_location("agent_store", HERE / "agent_store.py")
agent_store = importlib.util.module_from_spec(_spec_store)
_spec_store.loader.exec_module(agent_store)

_spec_hook = importlib.util.spec_from_file_location(
    "ras", HERE.parents[1] / "hooks" / "register_agent_session.py"
)
ras = importlib.util.module_from_spec(_spec_hook)
_spec_hook.loader.exec_module(ras)

#: firma medida en H-DOCS-171 — el corte por límite de sesión, no un
#: "completed" real. Cualquier otra terminación se registra como completed:
#: no hay forma de distinguir éxito de un corte por maxTurns desde el
#: transcript solo (mismo DESCONOCIDO que register_agent_session.py declara).
_FIRMA_FALLO = "hit your session limit"


def _ultimo_texto(transcript_path: Path) -> str:
    ultimo = ""
    try:
        with open(transcript_path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if obj.get("type") != "assistant":
                    continue
                msg = obj.get("message") or {}
                for bloque in msg.get("content") or []:
                    if isinstance(bloque, dict) and bloque.get("type") == "text":
                        ultimo = bloque.get("text", "") or ultimo
    except Exception:
        return ""
    return ultimo


def _primer_y_ultimo_timestamp(transcript_path: Path) -> tuple[str | None, str | None]:
    primero = ultimo = None
    try:
        with open(transcript_path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                ts = obj.get("timestamp")
                if not ts:
                    continue
                if primero is None:
                    primero = ts
                ultimo = ts
    except Exception:
        pass
    return primero, ultimo


def _sesion_id(transcript_path: Path) -> str | None:
    try:
        with open(transcript_path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                sid = obj.get("sessionId")
                if sid:
                    return sid
    except Exception:
        pass
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--claude-home", default=str(Path.home() / ".claude"),
        help="raiz de ~/.claude/ donde viven projects/**/subagents/ (default: $HOME/.claude)",
    )
    ap.add_argument("--dry-run", action="store_true", help="parsear y listar sin escribir en la DB")
    args = ap.parse_args()

    raiz = Path(args.claude_home) / "projects"
    transcripts = sorted(raiz.glob("**/subagents/agent-*.jsonl"))
    if not transcripts:
        print(f"backfill-agent-sessions: 0 transcripts bajo {raiz}", file=sys.stderr)
        return 1

    store_dir = DOCS_ROOT / ".claude" / "agent-results"
    ts_ahora = agent_store.now_iso()
    procesados = 0
    conn = None if args.dry_run else agent_store.connect(store_dir)
    try:
        for ruta in transcripts:
            agent_id = ruta.name[len("agent-"):-len(".jsonl")]
            meta_path = ruta.with_suffix("").with_suffix(".meta.json")
            meta = {}
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text(encoding="utf-8"))
                except Exception:
                    meta = {}

            uso = ras._extract_usage(str(ruta))
            texto_final = _ultimo_texto(ruta)
            status = "failed" if _FIRMA_FALLO in texto_final.lower() else "completed"
            iniciado, actualizado = _primer_y_ultimo_timestamp(ruta)
            session_id = _sesion_id(ruta) or "desconocida"

            if args.dry_run:
                print(f"{agent_id}  {status:9s}  turns={uso.get('turns', 0):3d}  "
                      f"equiv_cost={uso.get('equiv_cost', 0):>8}  {meta.get('description', '')[:60]}")
                procesados += 1
                continue

            conn.execute(
                """
                INSERT INTO agent_sessions
                    (agent_id, subagent_type, session_id, status,
                     output_key, started_at, updated_at, timeout_at,
                     model, description, turns, input_tokens,
                     cache_creation_tokens, cache_read_tokens,
                     output_tokens, equiv_cost)
                VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(agent_id) DO UPDATE SET
                    subagent_type          = excluded.subagent_type,
                    session_id             = excluded.session_id,
                    status                 = CASE
                                                  WHEN agent_sessions.status IN ('completed', 'failed')
                                                  THEN agent_sessions.status
                                                  ELSE excluded.status
                                              END,
                    started_at             = excluded.started_at,
                    updated_at             = excluded.updated_at,
                    model                  = excluded.model,
                    description            = excluded.description,
                    turns                  = excluded.turns,
                    input_tokens           = excluded.input_tokens,
                    cache_creation_tokens  = excluded.cache_creation_tokens,
                    cache_read_tokens      = excluded.cache_read_tokens,
                    output_tokens          = excluded.output_tokens,
                    equiv_cost             = excluded.equiv_cost
                """,
                (
                    agent_id, meta.get("agentType") or "desconocido", session_id, status,
                    iniciado or ts_ahora, actualizado or ts_ahora,
                    meta.get("model"), meta.get("description"),
                    uso.get("turns"), uso.get("input_tokens"),
                    uso.get("cache_creation_tokens"), uso.get("cache_read_tokens"),
                    uso.get("output_tokens"), uso.get("equiv_cost"),
                ),
            )
            procesados += 1
        if conn is not None:
            conn.commit()
    finally:
        if conn is not None:
            conn.close()

    print(f"backfill-agent-sessions: {procesados}/{len(transcripts)} registrados"
          f"{' (dry-run, sin escribir)' if args.dry_run else ''}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
