"""Pruebas de ``agents.register_session`` — el registro de una sesión de subagente.

Porta el mecanismo de ``kaupamex-docs: .claude/hooks/register_agent_session.py``.
Lo que viaja es el mecanismo —normalizar el modelo, leer el uso del transcript,
componer la invocación del store—; lo que se INYECTA es el destino, que es
parámetro del consumidor (DEC-04): thyrox no sabe ni debe saber a qué store
escribe un kaupamex-*.

El defecto que la parametrización cierra: el original resolvía el destino
adentro (``["--repo", "docs"]`` fijo), así que el mecanismo cargaba el nombre
de UN consumidor. Un segundo consumidor no podía usarlo sin editarlo.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from agents import register_session  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


print("== A. El destino es PARÁMETRO, no una constante del mecanismo ==")
check("un repo nombrado se compone como --repo",
      ["--repo", "api"], register_session.destination_args(repo="api"))
check("un directorio explícito gana sobre el repo",
      ["--claude-dir", "/tmp/x"],
      register_session.destination_args(repo="docs", claude_dir="/tmp/x"))
check("sin ninguno, rehúsa en vez de inventar un default",
      True, register_session.destination_args() is None)

print("== B. La normalización del modelo viaja intacta ==")
check("un identificador completo se conserva",
      "claude-opus-5", register_session.normalize_model("claude-opus-5"))
check("un alias NO es un identificador", None,
      register_session.normalize_model("opus"))
check("y el alias se normaliza por su propia vía",
      "opus", register_session.normalize_model_alias("opus"))

print("== C. La invocación del store se COMPONE, no se ejecuta ==")
# Componer y ejecutar son dos cosas: separarlas es lo que permite medir la
# forma del comando sin escribir en ningún store.
cmd = register_session.build_command(
    mode="start",
    payload={"agent_id": "a1", "agent_type": "general-purpose",
             "session_id": "s1"},
    store_path=Path("/x/agent_store.py"),
    destination=["--repo", "docs"],
)
check("nombra el subcomando del store", True, "registrar-sesion" in cmd)
check("lleva el destino inyectado", True, "--repo" in cmd and "docs" in cmd)
check("y el agent-id del payload", True, "a1" in cmd)

check("sin agent_id NO compone comando", None,
      register_session.build_command(
          mode="start", payload={}, store_path=Path("/x"),
          destination=["--repo", "docs"]))

print("== D. La procedencia del tipo se distingue de su valor ==")
# H-DOCS-481: `desconocido` colapsa dos hechos con veredictos distintos.
check("con valor, la procedencia es el payload", "payload",
      register_session.type_source({"agent_type": "general-purpose"}))
check("con la clave vacía, el vacío viene del origen", "vacio_en_origen",
      register_session.type_source({"agent_type": ""}))
check("sin la clave, está ausente", "ausente",
      register_session.type_source({}))

print("== E. equiv_cost con los cocientes del tier del modelo (catálogo 2.1.282) ==")
import json as _json  # noqa: E402
import tempfile as _tempfile  # noqa: E402


def _usage_of(model: str) -> dict:
    with _tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "agent-x.jsonl"
        path.write_text(_json.dumps({"type": "assistant", "message": {
            "id": "m1", "model": model, "role": "assistant", "content": [{"type": "text", "text": "x"}],
            "usage": {"input_tokens": 10, "cache_creation_input_tokens": 100, "cache_read_input_tokens": 1000,
                      "output_tokens": 20}}}) + chr(10))
        return register_session._extract_usage(str(path))


opus = _usage_of("claude-opus-5-5")
check("Opus 5.5: la lectura de caché pesa 0.05× (10 + 125 + 50 + 100)", 285, opus["equiv_cost"])
check("y el perfil declara el tier con que se ponderó", "tier_4_20_cache_read_0_20",
      opus["perfil"].get("equiv_basis"))
sonnet = _usage_of("claude-sonnet-5")
check("Sonnet 5 (tier 2/10): mismos cocientes que la fórmula fija (10 + 125 + 100 + 100)", 335,
      sonnet["equiv_cost"])
unknown = _usage_of("claude-nuevo-9")
check("fuera del catálogo: la fórmula fija, declarada como tal", (335, "fija-3-15"),
      (unknown["equiv_cost"], unknown["perfil"].get("equiv_basis")))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
