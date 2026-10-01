"""Costo por ejecución real de un agente de thyrox bajo la tabla de precios del ejecutor.

Fuente de los vectores: `agent_sessions` del store (usage_source = transcript),
tokens medidos por agente. Fuente de los precios: la tabla que el ejecutor pegó
el 2026-10-01 (USD por millón), sin verificar aquí. Qwen no publicó precio de
caché en esa tabla: se calcula sin descuento y el precio de caché de equilibrio
contra DeepSeek, en vez de inventar uno.

Métrica: USD por agente = fallo × precio de entrada + acierto × precio de caché +
salida × precio de salida, con fallo = input + cache_creation y acierto =
cache_read de Anthropic.
Ciega a: que otro proveedor cachee la misma fracción (el prefijo cacheable
depende del cliente y del proveedor), a la longitud de razonamiento de cada
modelo (más salida en uno que en otro para la misma tarea) y al precio
efectivo de un Token Plan, que es una cuota y no un precio por millón.
"""
import json, sqlite3, statistics, sys

STORE = "agent-results/agent_store.sqlite3"
PRICES = {  # entrada, caché, salida — USD/M; None = sin precio de caché publicado
    "qwen3.7-flash (min)": (0.03, None, 0.13),
    "qwen3.5-flash": (0.10, None, 0.40),
    "qwen3.8-flash": (0.15, None, 0.47),
    "deepseek-v4.1-flash off-peak": (0.15, 0.003, 0.60),
    "qwen3.7-flash (max)": (0.20, None, 0.80),
    "deepseek-v4.1-flash peak": (0.30, 0.006, 1.20),
    "deepseek-v4-pro": (0.66, None, 1.98),
    "qwen3.8-max": (2.00, None, 6.00),
}

db = sqlite3.connect(f"file:{STORE}?mode=ro", uri=True)
cols = [r[1] for r in db.execute("pragma table_info(agent_sessions)")]
c_in, c_cw, c_cr, c_out = "input_tokens", "cache_creation_tokens", "cache_read_tokens", "output_tokens"
missing = [c for c in (c_in, c_cw, c_cr, c_out) if c not in cols]
if missing:
    sys.exit(f"price_runs: faltan columnas {missing} en agent_sessions; no se mide")
rows = db.execute(f"select {c_in}, {c_cw}, {c_cr}, {c_out} from agent_sessions where usage_source = 'transcript'").fetchall()
universe = db.execute("select count(*) from agent_sessions").fetchone()[0]
vectors = [(i + cw, cr, o) for i, cw, cr, o in rows if None not in (i, cw, cr, o)]
if not vectors:
    print("price_runs: ningún agente medido; un cero aquí no distingue «barato» de «sin medida»", file=sys.stderr)
    sys.exit(2)
miss, hit, out = (sum(v[k] for v in vectors) for k in range(3))
print(f"columnas: {c_in}, {c_cw}, {c_cr}, {c_out}")
print(f"n = {len(vectors)} agentes medidos de {universe} en el store")
print(f"tokens totales: fallo {miss:,} · acierto de caché {hit:,} · salida {out:,}")
print(f"fracción de caché sobre la entrada: {hit / (miss + hit):.4f} · salida sobre todo: {out / (miss + hit + out):.4f}")
median_vector = tuple(statistics.median(v[k] for v in vectors) for k in range(3))
print(f"agente mediano: fallo {median_vector[0]:,.0f} · acierto {median_vector[1]:,.0f} · salida {median_vector[2]:,.0f}")

def cost(vector, price, cached_price):
    i, c, o = price[0], cached_price, price[2]
    return (vector[0] * i + vector[1] * c + vector[2] * o) / 1e6

print("\nmodelo | caché | USD agente mediano | USD medio por agente | USD de los n agentes")
results = {}
for name, price in PRICES.items():
    cached = price[1] if price[1] is not None else price[0]
    tag = "publicado" if price[1] is not None else "sin descuento"
    per = [cost(v, price, cached) for v in vectors]
    results[name] = sum(per)
    print(f"{name} | {tag} | {cost(median_vector, price, cached):.4f} | {statistics.mean(per):.4f} | {sum(per):.2f}")

ds = results["deepseek-v4.1-flash off-peak"]
q = PRICES["qwen3.8-flash"]
breakeven = (ds * 1e6 - miss * q[0] - out * q[2]) / hit if hit else float("nan")
print(f"\nprecio de caché de qwen3.8-flash que empata con deepseek off-peak: {breakeven:.4f} USD/M "
      f"({breakeven / q[0]:.1%} de su entrada)")
