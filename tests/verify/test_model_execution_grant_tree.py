#!/usr/bin/env python3
"""ADR-007 1.10.0, M8, sobre el árbol real de thyrox (TASK-THYROX-0712).

``local managed model execution ⇒ valid ExecutionGrant ⇒ PodmanExecutionPrimitive``:
ninguna ruta productiva —``thyrox -p``, el pool, el proxy o un consumidor
nuevo— llega a Ollama o llama.cpp locales sin un grant materializado. Esta
prueba es la mitad roja de la tarea: falla mientras exista una ruta
``nombre de modelo → Proxy/pool → Ollama`` y nombra cada punto.

Qué haría fallar a este control: cualquier punto que el gate marque en ``src/``.
"""
from __future__ import annotations

import sys
from pathlib import Path

from verify import check_model_execution_grant as gate

root = Path(__file__).resolve().parents[2]
violations, measured = gate.violations_in(root, gate.load_boundary(gate.BOUNDARY_FILE))
for violation in violations:
    print(f"  FALLA {violation.render()}")
print(f"test_model_execution_grant_tree: {len(violations)} punto(s) de ejecución local sin grant "
      f"(alcance medido: {measured} archivo(s) productivos)")
sys.exit(1 if violations else 0)
