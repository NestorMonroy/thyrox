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

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
