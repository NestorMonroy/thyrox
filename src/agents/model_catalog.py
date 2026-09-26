#!/usr/bin/env python3
"""
model_catalog.py — el catálogo de modelos del paquete, leído desde Python.

La única fuente de precios, tiers, ventanas y esfuerzo es
``src/packages/agent/models.jsonl``, que ``bin/extract_model_registry.py``
deriva del ejecutable vendorizado (``_references/claude-code-bin/<build>/``) y cuya
suite exige igualdad byte a byte con una extracción fresca. Este módulo lo lee;
no lo copia. Es el gemelo en Python de ``src/models.ts`` — misma función de
coste de cuatro términos (la ``eke`` del ejecutable): entrada, escritura de
caché por TTL, lectura de caché y salida.

Por qué existe: ``equiv_cost`` (hook ``save-agent-result.mjs``,
``measure_subagent_usage.py``) pondera con pesos fijos —in 1×, cc 1.25×,
cr 0.1×, out 5×— que son los cocientes del tier 3/15 aplicados a **todo**
modelo. En ``tier_10_50_cache_read_0_25`` (Fable 5.1, Mythos 5.1) la caché
leída vale 0.025× de la entrada, no 0.1×: el peso fijo la sobrevalora 4×.
``equiv_cost`` sigue sirviendo como medida relativa entre agentes del mismo
modelo; el USD sale de aquí.

Uso:
  python3 model_catalog.py costo <model> [--input N] [--cache-creation N]
                                 [--cache-read N] [--output N] [--ttl 5m|1h]
  python3 model_catalog.py por-modelo [--ttl 5m|1h] [--store RUTA]
  python3 model_catalog.py ficha <model>

Sin el catálogo rehúsa con exit 2 y **no emite cifra**: un 0 ahí sería un
verde falso (sub-patrón D de metrica-decide-la-conclusion.md).
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import sqlite3
import sys
from pathlib import Path

from paths.reach import env_value, thyrox_root  # noqa: E402

# El catalogo es PRODUCTO de thyrox: se resuelve con su localizador, que
# sobrevive a la copia. Antes salia de `parents[3]`, que describia el arbol
# anterior —el guion vivia en `<clon>/.claude/scripts/agents/`— y tras la
# mudanza resolvia `/home/user`, que no es raiz de nada (tarea #173).
RAIZ = thyrox_root()
# La variable se lee por el ACCESOR, no por `os.environ` a secas: el accesor
# consulta el proceso y despues el `.env` del consumidor. Leer el entorno
# directamente acierta en toda variable exportada y falla en el unico caso que
# distingue —la declarada en el archivo—, que es como un consumidor la fija de
# forma estable.
CATALOG_PATH = Path(
    env_value("THYROX_MODEL_CATALOG")
    or env_value("KAUPAMEX_MODEL_CATALOG")
    or RAIZ / "src" / "packages" / "agent" / "models.jsonl")

# El store es PARAMETRO del consumidor: vive en el clon que despacha, no aqui.
# Sin declararlo no hay ruta que suponer — `None` es el veredicto, no un
# default inventado que apuntaria a un archivo que no existe.
_STORE_ENV = env_value("THYROX_AGENT_STORE") or env_value("KAUPAMEX_AGENT_STORE")
STORE_PATH = Path(_STORE_ENV) if _STORE_ENV else None
TTLS = ("5m", "1h")
EFFORT_LEVELS = ("low", "medium", "high", "xhigh", "max")


def read_catalog_lines(lines) -> dict:
    """Reconstruye el catálogo de nueve claves desde los registros etiquetados.

    El archivo es **JSON Lines**: una `meta`, un `tier` por tier y un `model`
    por registro. Cada línea se clasifica por su `kind` —lo que DICE— y no por
    su posición: una cabecera por número de línea repetiría el defecto de
    :ref:`h-thyrox-37` un nivel más abajo.

    Es el gemelo de `readCatalog` en `src/packages/agent/models.ts`, y la
    propiedad que ninguno de los dos puede romper es la misma: el diccionario
    resultante es igual al que producía `json.load` del documento único.

    Rehúsa con `ValueError` si falta la `meta`: un catálogo sin ella se leería
    como «no hay modelos» en vez de «no pude leer el archivo».
    """
    meta = None
    tiers: dict = {}
    models: list = []
    for line in lines:
        if not line.strip():
            continue
        record = json.loads(line)
        kind = record.pop("kind", None)
        if kind == "meta":
            meta = record
        elif kind == "tier":
            tiers[record["name"]] = record["pricing"]
        elif kind == "model":
            models.append(record)
        else:
            raise ValueError(f"registro con kind desconocido: {kind!r}")
    if meta is None:
        raise ValueError("ningún registro declara kind \"meta\"")
    return {**meta, "pricing_tiers": tiers, "models": models}


def try_catalog(path: Path = CATALOG_PATH) -> tuple[dict | None, str | None]:
    """Carga el catálogo; devuelve (catálogo, None) o (None, motivo). No sale."""
    try:
        with open(path, encoding="utf-8") as fh:
            data = read_catalog_lines(fh)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        return None, (f"no se puede leer el catálogo de modelos en {path}: {exc}. "
                      "Regenéralo con `python3 src/packages/agent/bin/extract_model_registry.py "
                      "_references/claude-code-bin/<build>/claude_strings.txt --stdout > "
                      "src/packages/agent/models.jsonl`")
    if "models" not in data or "pricing_tiers" not in data:
        return None, f"{path} no tiene la forma esperada (faltan `models` o `pricing_tiers`)"
    return data, None


def require_catalog(path: Path = CATALOG_PATH) -> dict:
    """Carga el catálogo o rehúsa con exit 2, sin publicar ningún número."""
    data, motivo = try_catalog(path)
    if data is None:
        print(f"ERROR — {motivo}. NO se emite un coste: un 0 aquí sería un verde falso.",
              file=sys.stderr)
        raise SystemExit(2)
    return data


def models_by_id(catalog: dict) -> dict[str, dict]:
    return {m["id"]: m for m in catalog["models"]}


def pricing_of(catalog: dict, model_id: str) -> dict:
    model = models_by_id(catalog).get(model_id)
    if model is None:
        raise KeyError(f"{model_id}: no está en el catálogo "
                       f"({len(catalog['models'])} modelos de {catalog.get('fuente', '?')})")
    tier = model.get("pricing_tier")
    pricing = catalog["pricing_tiers"].get(tier) if tier else None
    if not pricing:
        raise KeyError(f"{model_id}: sin tier de precio en el catálogo")
    return pricing


def usage_cost_usd(catalog: dict, model_id: str, usage: dict, ttl: str = "1h") -> float:
    """Los cuatro términos de ``eke``: entrada, escritura por TTL, lectura, salida."""
    if ttl not in TTLS:
        raise ValueError(f"ttl debe ser uno de {TTLS}, no {ttl!r}")
    p = pricing_of(catalog, model_id)
    write = p["cache_write_1h"] if ttl == "1h" else p["cache_write_5m"]
    return (
        usage.get("input_tokens", 0) * p["input"]
        + usage.get("cache_creation_tokens", 0) * write
        + usage.get("cache_read_tokens", 0) * p["cache_read"]
        + usage.get("output_tokens", 0) * p["output"]
    ) / 1e6


def usage_from_result(usage: dict) -> dict:
    """El ``usage`` de una salida de ``claude -p`` con las claves del store, y
    el reparto de la escritura de caché por TTL cuando la salida lo trae."""
    split = usage.get("cache_creation") or {}
    return {"input_tokens": usage.get("input_tokens", 0),
            "cache_creation_tokens": usage.get("cache_creation_input_tokens", 0),
            "cache_creation_5m": split.get("ephemeral_5m_input_tokens", 0),
            "cache_creation_1h": split.get("ephemeral_1h_input_tokens", 0),
            "cache_read_tokens": usage.get("cache_read_input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0)}


def usage_equivalent_tokens(catalog: dict, model_id: str, usage: dict, *, basis: str | None = None,
                            unit: str | None = None, cache_ttl: str = "1h") -> float:
    """Gemelo de ``usageEquivalentTokens`` (``src/packages/agent/models.ts``):
    el costo en TOKENS equivalentes, con los cocientes del tier. Cada componente
    pesa su precio y el total se divide por la vara, que es el precio de la
    entrada del propio tier. ``basis`` toma los precios de otro modelo; ``unit``
    conserva los propios y cambia sólo la vara; pedir los dos no tiene
    respuesta única. Un modelo que el catálogo no conoce rehúsa (``KeyError``):
    no se pondera con el tier de otro."""
    if basis is not None and unit is not None:
        raise ValueError("basis y unit son dos varas distintas: pedir las dos a la vez no tiene respuesta única")
    if cache_ttl not in TTLS:
        raise ValueError(f"ttl debe ser uno de {TTLS}, no {cache_ttl!r}")
    price = pricing_of(catalog, basis or model_id)
    yardstick = price["input"] if unit is None else pricing_of(catalog, unit)["input"]
    write = price["cache_write_1h"] if cache_ttl == "1h" else price["cache_write_5m"]
    return (usage.get("input_tokens", 0) * price["input"] + usage.get("cache_creation_tokens", 0) * write
            + usage.get("cache_read_tokens", 0) * price["cache_read"]
            + usage.get("output_tokens", 0) * price["output"]) / yardstick


def equivalent_tokens(catalog: dict, model_id: str, usage: dict) -> float:
    """Los tokens equivalentes de un uso que trae la escritura de caché
    repartida por TTL (``cache_creation_5m``/``_1h``): el gemelo aplicado a
    cada parte, porque la fórmula es lineal. Sin reparto, toda la escritura va
    a 5m, como hacía el store. En el tier 3/15 da la fórmula que el store usaba
    (in 1×, escritura 1.25×/2×, lectura 0.1×, salida 5×); en Fable 5.1 la
    lectura pesa 0.025× y en Opus 5.5, 0.05×."""
    write_5m = usage.get("cache_creation_5m", 0)
    write_1h = usage.get("cache_creation_1h", 0)
    if not write_5m and not write_1h:
        write_5m = usage.get("cache_creation_tokens", 0)
    rest = {**usage, "cache_creation_tokens": 0}
    return (usage_equivalent_tokens(catalog, model_id, rest)
            + usage_equivalent_tokens(catalog, model_id, {"cache_creation_tokens": write_5m}, cache_ttl="5m")
            + usage_equivalent_tokens(catalog, model_id, {"cache_creation_tokens": write_1h}, cache_ttl="1h"))


#: La base que se declara cuando el modelo no está en el catálogo: los
#: cocientes del tier 3/15 aplicados a todo modelo, que el store usaba.
FIXED_BASIS = "fija-3-15"
FIXED_WRITE_RATIO = {"5m": 1.25, "1h": 2.0}


def fixed_equivalent_tokens(usage: dict) -> float:
    """La fórmula de pesos fijos (in 1×, lectura 0.1×, salida 5×), con la
    escritura de caché ponderada por su reparto de TTL medido; sin reparto,
    a 1.25×."""
    write_5m = usage.get("cache_creation_5m", 0)
    write_1h = usage.get("cache_creation_1h", 0)
    measured = write_5m + write_1h
    ratio = ((write_5m * FIXED_WRITE_RATIO["5m"] + write_1h * FIXED_WRITE_RATIO["1h"]) / measured
             if measured else FIXED_WRITE_RATIO["5m"])
    return (usage.get("input_tokens", 0) + ratio * usage.get("cache_creation_tokens", 0)
            + 0.1 * usage.get("cache_read_tokens", 0) + 5 * usage.get("output_tokens", 0))


def equivalent_tokens_with_basis(catalog: dict | None, model_id: str | None, usage: dict) -> tuple[float, str]:
    """Los tokens equivalentes y la base con que se ponderaron: el tier del
    modelo si el catálogo lo conoce; si no, la fórmula fija, declarada como
    ``FIXED_BASIS`` para que dos bases no se sumen en silencio."""
    tier = models_by_id(catalog).get(model_id, {}).get("pricing_tier") if catalog and model_id else None
    if not tier:
        return fixed_equivalent_tokens(usage), FIXED_BASIS
    return equivalent_tokens(catalog, model_id, usage), tier


def effort_cost_index(catalog: dict, model_id: str, level: str) -> float | None:
    """El índice relativo (``high`` = 1) que el registro declara; None si no lo declara."""
    model = models_by_id(catalog).get(model_id) or {}
    index = model.get("effort_cost_index") or {}
    return index.get(level)


def resolve_alias(catalog: dict, alias_or_id: str, provider: str = "first_party") -> str:
    """Resuelve un alias del bloque ``aliases`` del ejecutable; un id se devuelve tal cual."""
    aliases = catalog.get("aliases") or {}
    entry = aliases.get(alias_or_id)
    if entry is None:
        return alias_or_id
    per_provider = entry.get("per_provider") or {}
    return per_provider.get(provider) or entry.get("default") or alias_or_id


def model_of_transcript(path: Path) -> str | None:
    """El primer ``message.model`` con prefijo ``claude-`` del transcript JSONL."""
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                if '"model"' not in line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                model = (obj.get("message") or {}).get("model")
                if isinstance(model, str) and model.startswith("claude-"):
                    return model
    except OSError:
        return None
    return None


def _cmd_costo(catalog: dict, args: argparse.Namespace) -> int:
    usage = {
        "input_tokens": args.input,
        "cache_creation_tokens": args.cache_creation,
        "cache_read_tokens": args.cache_read,
        "output_tokens": args.output,
    }
    model = resolve_alias(catalog, args.model)
    try:
        usd = usage_cost_usd(catalog, model, usage, args.ttl)
    except KeyError as exc:
        print(f"ERROR — {exc}", file=sys.stderr)
        return 2
    p = pricing_of(catalog, model)
    print(f"modelo:        {model}" + (f"  (alias {args.model})" if model != args.model else ""))
    print(f"tier:          {models_by_id(catalog)[model].get('pricing_tier')}  "
          f"(in {p['input']} · out {p['output']} · cr {p['cache_read']} · "
          f"w5m {p['cache_write_5m']} · w1h {p['cache_write_1h']} $/Mtok)")
    print(f"ttl:           {args.ttl}")
    print(f"usd:           {usd:.4f}")
    return 0


def _cmd_ficha(catalog: dict, args: argparse.Namespace) -> int:
    model = models_by_id(catalog).get(resolve_alias(catalog, args.model))
    if model is None:
        print(f"ERROR — {args.model}: no está en el catálogo", file=sys.stderr)
        return 2
    print(json.dumps(model, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


def _cmd_por_modelo(catalog: dict, args: argparse.Namespace) -> int:
    """Consumo por turno por modelo del store, y su USD al precio de cada tier."""
    store = Path(args.store)
    if not store.exists():
        print(f"ERROR — no existe el store {store}", file=sys.stderr)
        return 2
    con = sqlite3.connect(store)
    rows = list(con.execute(
        "SELECT model, COUNT(*), SUM(turns), SUM(cache_read_tokens), "
        "SUM(cache_creation_tokens), SUM(output_tokens), SUM(input_tokens) "
        "FROM agent_sessions WHERE usage_source = 'transcript' AND turns > 0 "
        "AND model LIKE 'claude-%' GROUP BY model ORDER BY 2 DESC"))
    universo = con.execute("SELECT COUNT(*) FROM agent_sessions").fetchone()[0]
    medidos = con.execute(
        "SELECT COUNT(*) FROM agent_sessions WHERE usage_source = 'transcript' AND turns > 0"
    ).fetchone()[0]
    ref = args.referencia
    print(f"{'modelo':<20} {'agentes':>7} {'turnos':>7} {'cr/turno':>10} {'cc/turno':>9} "
          f"{'out/turno':>9} {'usd/turno@' + args.ttl:>14} {'mismo consumo@' + ref:>22}")
    for model, n, turns, cr, cc, out, inp in rows:
        per = {
            "cache_read_tokens": cr / turns, "cache_creation_tokens": cc / turns,
            "output_tokens": out / turns, "input_tokens": (inp or 0) / turns,
        }
        try:
            usd = usage_cost_usd(catalog, model, per, args.ttl)
            usd_ref = usage_cost_usd(catalog, ref, per, args.ttl)
            usd_s, ref_s = f"{usd:.4f}", f"{usd_ref:.4f}"
        except KeyError:
            usd_s, ref_s = "sin tier", "—"
        print(f"{model:<20} {n:>7} {turns:>7} {per['cache_read_tokens']:>10.0f} "
              f"{per['cache_creation_tokens']:>9.0f} {per['output_tokens']:>9.0f} "
              f"{usd_s:>14} {ref_s:>22}")
    print(f"(alcance medido: {medidos} filas con usage_source='transcript' y turns>0, "
          f"de {universo} en agent_sessions; agregado = suma de columnas / suma de turnos, "
          f"no promedio de promedios; catálogo {catalog.get('fuente', '?')})")
    return 0



# ---------------------------------------------------------------------------
# La sesión principal (el orquestador) no pasa por SubagentStop y nunca es fila
# del store (H-DOCS-1010). Su transcript sí declara `message.usage` por turno,
# con `cache_creation.ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens`
# — el TTL REAL de cada escritura, que el store no registra. Aquí se lee y se
# valora con el catálogo, por modelo, y se estima lo que costaría cambiar de
# modelo ahora: el cliente avisa («This conversation is cached for the current
# model. Switching … means the full history gets re-read») porque la caché es
# por modelo — el contexto entero vuelve a escribirse al precio del destino.
# ---------------------------------------------------------------------------

def session_transcript_default() -> Path | None:
    """Ruta del transcript de la sesión principal, si el entorno la declara.

    DELEGA en ``session.transcripts``. Hasta el 2026-09-23 componía el hogar
    por su cuenta y desempataba por ORDEN DE RUTA (``sorted(...)[-1]``),
    mientras ``session_restart`` desempataba por TAMAÑO. Sobre la sesión viva
    daban archivos distintos: éste leía 5 581 100 bytes de los 45 277 263 que
    la sesión había escrito, y agregaba tokens y caché sobre ese 12% sin
    denominador que lo delatara. Un desempate, declarado una vez.
    """
    from session.transcripts import (  # noqa: PLC0415
        session_id_declared, transcript_for,
    )

    return transcript_for(session_id_declared())


def session_usage_by_model(path: Path) -> dict:
    """Agrega `message.usage` por modelo, deduplicando por `message.id`.

    Devuelve {modelo: {turns, input, cache_creation, w5m, w1h, cache_read,
    output, last_context}}. `last_context` es el tamaño del contexto del ÚLTIMO
    turno (entrada + caché escrita + caché leída): lo que un cambio de modelo
    volvería a escribir.
    """
    agg: dict = {}
    seen: set = set()
    with open(path, encoding="utf-8", errors="ignore") as fh:
        for line in fh:
            try:
                d = json.loads(line)
            except ValueError:
                continue
            msg = d.get("message")
            if not isinstance(msg, dict):
                continue
            model, usage = msg.get("model"), msg.get("usage")
            if not (isinstance(model, str) and model.startswith("claude-") and isinstance(usage, dict)):
                continue
            mid = msg.get("id")
            if mid in seen:
                continue
            if mid:
                seen.add(mid)
            a = agg.setdefault(model, {"turns": 0, "input": 0, "cache_creation": 0, "w5m": 0,
                                       "w1h": 0, "cache_read": 0, "output": 0, "last_context": 0})
            inp = usage.get("input_tokens", 0) or 0
            cc_tot = usage.get("cache_creation_input_tokens", 0) or 0
            cr = usage.get("cache_read_input_tokens", 0) or 0
            a["turns"] += 1
            a["input"] += inp
            a["cache_creation"] += cc_tot
            a["cache_read"] += cr
            a["output"] += usage.get("output_tokens", 0) or 0
            cc = usage.get("cache_creation") or {}
            a["w5m"] += cc.get("ephemeral_5m_input_tokens", 0) or 0
            a["w1h"] += cc.get("ephemeral_1h_input_tokens", 0) or 0
            a["last_context"] = inp + cc_tot + cr
    return agg


def session_cost_usd(catalog: dict, model_id: str, a: dict) -> tuple[float, bool]:
    """USD del agregado de un modelo, con el TTL real de cada escritura.

    Si el transcript no desglosa `cache_creation` por TTL, la escritura entera
    se valora a 5 m y el segundo valor devuelto lo declara (False).
    """
    p = pricing_of(catalog, model_id)
    split_known = (a["w5m"] + a["w1h"]) > 0
    w5m = a["w5m"] if split_known else a["cache_creation"]
    w1h = a["w1h"] if split_known else 0
    usd = (a["input"] * p["input"] + w5m * p["cache_write_5m"] + w1h * p["cache_write_1h"]
           + a["cache_read"] * p["cache_read"] + a["output"] * p["output"]) / 1e6
    return usd, split_known


def _cmd_sesion(catalog: dict, args) -> int:
    path = Path(args.transcript) if args.transcript else session_transcript_default()
    if path is None or not path.exists():
        print("ERROR — no hay transcript: pásalo con --transcript o exporta CLAUDE_CODE_SESSION_ID.",
              file=sys.stderr)
        return 2
    agg = session_usage_by_model(path)
    if not agg:
        print(f"ERROR — {path} no declara ningún message.usage con model claude-*.", file=sys.stderr)
        return 2
    print(f"transcript: {path}")
    print(f"{'modelo':<20} {'turnos':>6} {'entrada':>10} {'esc.5m':>12} {'esc.1h':>12} "
          f"{'lectura':>14} {'salida':>9} {'USD':>10}")
    total, undeclared, last_model = 0.0, [], None
    for model_id, a in agg.items():
        try:
            usd, split_known = session_cost_usd(catalog, model_id, a)
        except KeyError:
            print(f"{model_id:<20} {a['turns']:>6}  — fuera del catálogo, sin valorar")
            continue
        if not split_known:
            undeclared.append(model_id)
        total += usd
        last_model = model_id
        print(f"{model_id:<20} {a['turns']:>6} {a['input']:>10,} {a['w5m']:>12,} {a['w1h']:>12,} "
              f"{a['cache_read']:>14,} {a['output']:>9,} {usd:>10.4f}")
    print(f"{'total':<20} {'':>6} {'':>10} {'':>12} {'':>12} {'':>14} {'':>9} {total:>10.4f}")
    if args.cambiar_a and last_model:
        ctx = agg[last_model]["last_context"]
        try:
            pr = pricing_of(catalog, args.cambiar_a)
        except KeyError:
            print(f"cambio a {args.cambiar_a}: fuera del catálogo, sin valorar")
        else:
            leer = ctx * pricing_of(catalog, last_model)["cache_read"] / 1e6
            print(f"cambiar de {last_model} a {args.cambiar_a} ahora: el contexto del último turno "
                  f"({ctx:,} tokens) se reescribe — {ctx * pr['cache_write_5m'] / 1e6:.4f} USD a 5 m · "
                  f"{ctx * pr['cache_write_1h'] / 1e6:.4f} USD a 1 h, contra {leer:.4f} USD de "
                  f"leerlo cacheado en {last_model}")
    declared = "TTL real por escritura (cache_creation.ephemeral_5m/1h)"
    if undeclared:
        declared += f"; sin desglose en {', '.join(undeclared)} → escritura valorada a 5 m"
    print(f"(alcance medido: {sum(a['turns'] for a in agg.values())} turnos con usage en "
          f"{len(agg)} modelos; {declared}; precio de lista, sin el ×1.1 por inference_geo)")
    return 0

def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("costo", help="USD de un consumo con el tier del modelo")
    c.add_argument("model")
    c.add_argument("--input", type=int, default=0)
    c.add_argument("--cache-creation", type=int, default=0)
    c.add_argument("--cache-read", type=int, default=0)
    c.add_argument("--output", type=int, default=0)
    c.add_argument("--ttl", choices=TTLS, default="1h")
    f = sub.add_parser("ficha", help="el registro completo de un modelo")
    f.add_argument("model")
    m = sub.add_parser("por-modelo", help="consumo por turno y USD por modelo, del store")
    m.add_argument("--ttl", choices=TTLS, default="1h")
    m.add_argument("--store", default=str(STORE_PATH) if STORE_PATH else None,
                   required=STORE_PATH is None,
                   help="ruta del store del consumidor; sin THYROX_AGENT_STORE es obligatorio")
    m.add_argument("--referencia", default="claude-fable-5-1",
                   help="modelo cuyo precio se aplica al mismo consumo, para comparar")
    se = sub.add_parser("sesion", help="USD de la sesión principal, por modelo, desde su transcript")
    se.add_argument("--transcript", default=None,
                    help="JSONL de la sesión; por defecto el de CLAUDE_CODE_SESSION_ID")
    se.add_argument("--cambiar-a", default=None,
                    help="modelo destino: cuánto costaría reescribir el contexto actual ahí")
    args = parser.parse_args(argv[1:])
    catalog = require_catalog()
    return {"costo": _cmd_costo, "ficha": _cmd_ficha, "por-modelo": _cmd_por_modelo,
            "sesion": _cmd_sesion}[args.cmd](catalog, args)


if __name__ == "__main__":
    # `| head` cierra la tubería antes del pie: que no lo reporte como traza.
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    sys.exit(main(sys.argv))
