#!/usr/bin/env python3
"""
save-agent-report.py — SubagentStop hook: persiste el reporte final de cada subagente.

Regla `.claude/rules/agent-reports.md` ("el productor persiste, no el padre"):
el padre solo ve el resumen; el análisis completo se pierde si no se guarda al
terminar el subagente. Lee el evento por stdin (last_assistant_message o el
transcript) y apende —con procedencia + timestamp ISO— al registro del WP activo.

Append-only, en `.thyrox/` (sin prompts de permiso). Fail-open: nunca rompe la sesión.
"""
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def repo_root() -> Path:
    try:
        out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True, timeout=5)
        if out.returncode == 0:
            return Path(out.stdout.strip())
    except Exception:
        pass
    return Path.cwd()


def active_wp(root: Path):
    base = root / ".thyrox" / "context" / "work"
    if not base.is_dir():
        return None
    dirs = sorted((d for d in base.iterdir() if d.is_dir()),
                  key=lambda d: d.stat().st_mtime, reverse=True)
    return dirs[0] if dirs else None


def last_assistant_from_transcript(path: str) -> str:
    try:
        p = Path(path)
        if not p.exists():
            return ""
        last = ""
        for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            if rec.get("type") != "assistant" and (rec.get("message") or {}).get("role") != "assistant":
                continue
            content = (rec.get("message", rec)).get("content", "")
            if isinstance(content, list):
                text = "\n".join(c.get("text", "") for c in content
                                 if isinstance(c, dict) and c.get("type") == "text")
            else:
                text = str(content)
            if text.strip():
                last = text
        return last
    except Exception:
        return ""


def main() -> int:
    try:
        raw = sys.stdin.read()
        event = json.loads(raw) if raw.strip() else {}
    except Exception:
        event = {}
    try:
        root = repo_root()
        agent = (event.get("agent_type") or event.get("subagent_type")
                 or event.get("agentType") or "subagent")
        report = (event.get("last_assistant_message") or event.get("lastAssistantMessage") or "")
        if not report:
            report = last_assistant_from_transcript(
                event.get("agent_transcript_path") or event.get("transcript_path") or "")
        report = (report or "").strip()
        if not report:
            return 0
        wp = active_wp(root)
        dest = (wp / "reports" / "registro-de-agentes.md") if wp \
            else (root / ".thyrox" / "context" / "agent-reports.md")
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            dest.write_text(
                "# Registro de reportes de agentes\n\n"
                "Log append-only de los reportes finales de subagentes "
                "(regla `.claude/rules/agent-reports.md`).\n",
                encoding="utf-8")
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with dest.open("a", encoding="utf-8") as f:
            f.write(f"\n\n---\n\n## {agent} · {ts}\n\n"
                    f"> Registro automático (SubagentStop). El productor persiste, no el padre.\n\n"
                    f"{report}\n")
    except Exception:
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
