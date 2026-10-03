#!/usr/bin/env python3
"""``declared_wiring`` rehúsa, no lanza, cuando el roster de ``reach`` no se
puede derivar (TASK-THYROX-0927).

Qué haría fallar a este control: que un error de ``reach()`` escape de
``declared_wiring`` como algo distinto de ``WiringRefused``. Con el consumidor
explícito, ``reach()`` todavía se llama para componer los ``--repo`` del
cableado; en un clon de thyrox solo —sin ``THYROX_REACH_ROOTS`` ni
``THYROX_CLONE_PREFIX``— lanzaba ``ReachRootError`` o ``KeyError``, y
``bin/session_restart`` moría con un traceback en vez de rehusar con su causa
(episodio del 2026-10-03, al preparar el relevo para cargar claves nuevas).

No depende del entorno: ``reach`` se sustituye por un doble que lanza.

Métrica: tipo de la excepción que sale de ``declared_wiring`` y si nombra la
variable que falta. Ciega a: lo que el relevo hace después de rehusar.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from paths import reach  # noqa: E402
from session import user_wiring as w  # noqa: E402

PASSED = 0
FAILED = 0


def check(label: str, expected, actual) -> None:
    global PASSED, FAILED
    if expected == actual:
        PASSED += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLA {label}: esperado {expected!r}, obtenido {actual!r}")


def refusal_of(failure: Exception, consumer: Path) -> str:
    """El texto del rehúso, o ``ESCAPÓ <tipo>`` si salió otra excepción."""
    original = w.reach

    def failing_reach():
        raise failure

    w.reach = failing_reach
    try:
        w.declared_wiring(reach.thyrox_root(), consumer=consumer)
    except w.WiringRefused as error:
        return str(error)
    except Exception as error:  # noqa: BLE001 — se mide justamente que no escape otra
        return f"ESCAPÓ {type(error).__name__}"
    finally:
        w.reach = original
    return "SIN REHÚSO"


with tempfile.TemporaryDirectory() as sandbox:
    consumer = Path(sandbox)
    roots = refusal_of(reach.ReachRootError("THYROX_REACH_ROOTS no está declarada (simulado)"), consumer)
    check("sin raíces de trabajo, REHUSA (WiringRefused)", False, roots.startswith(("ESCAPÓ", "SIN REHÚSO")))
    check("y el rehúso nombra THYROX_REACH_ROOTS", True, "THYROX_REACH_ROOTS" in roots)
    prefix = refusal_of(KeyError("THYROX_CLONE_PREFIX no está declarada (simulado)"), consumer)
    check("sin prefijo de clon, REHUSA (WiringRefused)", False, prefix.startswith(("ESCAPÓ", "SIN REHÚSO")))
    check("y el rehúso nombra THYROX_CLONE_PREFIX", True, "THYROX_CLONE_PREFIX" in prefix)

print(f"\n{PASSED} ok, {FAILED} fallas (alcance medido: declared_wiring con reach que lanza)")
raise SystemExit(1 if FAILED else 0)
