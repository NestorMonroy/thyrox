#!/usr/bin/env python3
"""Control de los tokens equivalentes por tier en ``agents.model_catalog``.

El costo que el proyecto cita es el de TOKENS, no el USD de lista
(`calibration-verified-numbers.md`): tokens equivalentes con los cocientes
del tier del modelo. La fórmula que registraba el store —in 1×, escritura
1.25×/2×, lectura 0.1×, salida 5×— son los cocientes del tier 3/15 aplicados
a todo modelo, y en ``tier_10_50_cache_read_0_25`` la lectura vale 0.025×
(el propio docstring del catálogo lo mide: la sobrevalora 4×).

Qué haría fallar a este control:
- en el tier 3/15, cualquier diferencia con la fórmula anterior (el cambio
  sólo puede tocar los tiers donde la fórmula era falsa);
- un peso que no salga del precio del modelo (lectura 0.025× en Fable 5.1);
- un modelo que el catálogo no conoce y que se pondere igual en silencio;
- leer el `usage` de `claude -p` con otras claves que las del store.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from agents import model_catalog as mc  # noqa: E402

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


CATALOG = {
    "fuente": "sintético",
    "models": [{"id": "m-3-15", "pricing_tier": "tier_3_15"},
               {"id": "m-10-50-cr", "pricing_tier": "tier_10_50_cache_read_0_25"}],
    "pricing_tiers": {
        "tier_3_15": {"input": 3, "output": 15, "cache_read": 0.3, "cache_write_5m": 3.75, "cache_write_1h": 6},
        "tier_10_50_cache_read_0_25": {"input": 10, "output": 50, "cache_read": 0.25,
                                       "cache_write_5m": 12.5, "cache_write_1h": 20},
    },
}
USAGE = {"input_tokens": 10, "cache_creation_5m": 40, "cache_creation_1h": 60, "cache_read_tokens": 1000,
         "output_tokens": 20}

print("== 1. tier 3/15: idéntico a la fórmula que el store usaba ==")
legacy = 10 + (40 * 1.25 + 60 * 2.0) + 0.1 * 1000 + 5 * 20
check("mismo valor que in + escritura por TTL + 0.1 lectura + 5 salida", legacy,
      mc.equivalent_tokens(CATALOG, "m-3-15", USAGE))

print("== 2. el peso sale del precio del modelo ==")
expected = 10 + (40 * 1.25 + 60 * 2.0) + 0.025 * 1000 + 5 * 20
check("Fable 5.1: la lectura de caché pesa 0.025×, no 0.1×", expected,
      mc.equivalent_tokens(CATALOG, "m-10-50-cr", USAGE))

print("== 3. sin reparto de TTL, la escritura va al cociente 5m (como el store) ==")
check("cache_creation_tokens sin reparto", 10 + 100 * 1.25,
      mc.equivalent_tokens(CATALOG, "m-3-15", {"input_tokens": 10, "cache_creation_tokens": 100}))

print("== 4. un modelo desconocido rehúsa, no se pondera con otro tier ==")
try:
    mc.equivalent_tokens(CATALOG, "claude-nuevo-9", USAGE)
    refused = False
except KeyError:
    refused = True
check("KeyError", True, refused)

print("== 5. el usage de claude -p se lee con sus claves ==")
result_usage = {"input_tokens": 10, "cache_creation_input_tokens": 100, "cache_read_input_tokens": 1000,
                "output_tokens": 20, "cache_creation": {"ephemeral_5m_input_tokens": 40,
                                                        "ephemeral_1h_input_tokens": 60}}
check("usage_from_result da las claves del store con el reparto de TTL", USAGE | {"cache_creation_tokens": 100},
      mc.usage_from_result(result_usage))

print("== 6. usage_equivalent_tokens es el gemelo de usageEquivalentTokens (agent/models.ts) ==")
flat = {"input_tokens": 10, "cache_creation_tokens": 100, "cache_read_tokens": 1000, "output_tokens": 20}
check("sin opciones: TTL 1h y el propio tier como vara", (10 * 10 + 100 * 20 + 1000 * 0.25 + 20 * 50) / 10,
      mc.usage_equivalent_tokens(CATALOG, "m-10-50-cr", flat))
check("cache_ttl 5m", (10 * 10 + 100 * 12.5 + 1000 * 0.25 + 20 * 50) / 10,
      mc.usage_equivalent_tokens(CATALOG, "m-10-50-cr", flat, cache_ttl="5m"))
check("basis: los precios de otro modelo", (10 * 3 + 100 * 6 + 1000 * 0.3 + 20 * 15) / 3,
      mc.usage_equivalent_tokens(CATALOG, "m-10-50-cr", flat, basis="m-3-15"))
check("unit: los precios propios con la entrada de otro como vara", (10 * 10 + 100 * 20 + 1000 * 0.25 + 20 * 50) / 3,
      mc.usage_equivalent_tokens(CATALOG, "m-10-50-cr", flat, unit="m-3-15"))
try:
    mc.usage_equivalent_tokens(CATALOG, "m-3-15", flat, basis="m-3-15", unit="m-3-15")
    both = False
except ValueError:
    both = True
check("basis y unit a la vez no tienen respuesta única: rehúsa", True, both)
check("equivalent_tokens con todo a 1h es el gemelo con su TTL por defecto",
      mc.usage_equivalent_tokens(CATALOG, "m-10-50-cr", flat),
      mc.equivalent_tokens(CATALOG, "m-10-50-cr", {**flat, "cache_creation_1h": 100}))

print(f"\n{OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
