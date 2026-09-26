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

print("== 7. equivalent_tokens_with_basis: el valor y la base con que se ponderó ==")
split = {**flat, "cache_creation_5m": 40, "cache_creation_1h": 60}
check("modelo del catálogo: los cocientes de su tier, y el tier como base",
      (mc.equivalent_tokens(CATALOG, "m-10-50-cr", split), "tier_10_50_cache_read_0_25"),
      mc.equivalent_tokens_with_basis(CATALOG, "m-10-50-cr", split))
check("fuera del catálogo: la fórmula fija con la escritura repartida por TTL, declarada",
      (10 + (40 * 1.25 + 60 * 2.0) / 100 * 100 + 1000 * 0.1 + 20 * 5, mc.FIXED_BASIS),
      mc.equivalent_tokens_with_basis(CATALOG, "claude-desconocido", split))
check("sin reparto de TTL la escritura fija pesa 1.25×",
      (10 + 100 * 1.25 + 1000 * 0.1 + 20 * 5, mc.FIXED_BASIS),
      mc.equivalent_tokens_with_basis(CATALOG, "claude-desconocido", flat))
check("sin catálogo ni modelo: la fórmula fija, declarada",
      (10 + 100 * 1.25 + 1000 * 0.1 + 20 * 5, mc.FIXED_BASIS),
      mc.equivalent_tokens_with_basis(None, None, flat))

print("== 8. choose_cache_ttl: gemelo de chooseCacheTtl (provider/src/cost/policy.ts) ==")
TTL_CATALOG = {"pricing_tiers": {"tier_2_10": {"input": 2, "output": 10, "cache_write_5m": 2.5, "cache_write_1h": 4,
                                       "cache_read": 0.2}},
               "models": [{"id": "m-2-10", "pricing_tier": "tier_2_10"}]}
check("umbral de caducidades: (1h − 5m) / 5m, del precio del tier", 0.6,
      round(mc.ttl_break_even_expiries(TTL_CATALOG, "m-2-10"), 6))
check("turnos seguidos (hueco ≤ 5 min): 5m", "5m", mc.choose_cache_ttl(TTL_CATALOG, "m-2-10", 4.91)[0])
check("un hueco entre 5 y 60 min: 1h", "1h", mc.choose_cache_ttl(TTL_CATALOG, "m-2-10", 10)[0])
check("un hueco de más de una hora: 5m, ninguna caché sobrevive", "5m",
      mc.choose_cache_ttl(TTL_CATALOG, "m-2-10", 90)[0])
check("el porqué se publica junto a la decisión", True, bool(mc.choose_cache_ttl(TTL_CATALOG, "m-2-10", 1)[1]))

print(f"\n{OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
