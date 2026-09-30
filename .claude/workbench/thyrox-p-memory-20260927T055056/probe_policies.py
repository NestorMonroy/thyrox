"""¿Qué política de historial predice mejor el pico de la SIGUIENTE ejecución?

Porte paramétrico de `pool-history-policy-20260927T053651/probe_policies.py`:
aquella leía el lazo tsc (`claude -p`, 5 ejecuciones medidas); ésta lee las
ejecuciones de `bin/pool-calibrate` (`thyrox -p` contra el proxy local), un
`run-N/` por ejecución con un `.time` de GNU Time por ítem.

    uv run --frozen python probe_policies.py <dir-de-salida-de-pool-calibrate>

Para cada ejecución i se predice su pico con lo que había ANTES de i, y se
cuenta cuántas veces la predicción queda POR DEBAJO del pico real —la
admisión reserva menos de lo que el ítem usa— y el sobrecoste medio cuando
cubre. El percentil es de rango cercano, el mismo de `pool_history`.

Métrica: RSS pico por ítem (GNU Time) de `thyrox -p` contra respuestas mínimas.
Ciega a: respuestas y herramientas reales; y a la varianza entre máquinas.
"""
import math, re, statistics, sys
from pathlib import Path

MEASURE = re.compile(r"^(\d+)\s+([\d.]+)")
root = Path(sys.argv[1])
runs = []
for out in sorted((p for p in root.glob('run-*') if p.is_dir()), key=lambda p: int(p.name.split('-')[1])):
    kbs = []
    for t in out.glob('*.time'):
        for line in reversed(t.read_text(errors='replace').splitlines()):
            m = MEASURE.match(line)
            if m:
                kbs.append(int(m.group(1)))
                break
    if kbs:
        runs.append((out.name, kbs))

if len(runs) < 3:
    print(f"ERROR — {len(runs)} ejecuciones con medida en {root}: no hay con qué comparar", file=sys.stderr)
    raise SystemExit(2)

def nearest_rank(values, fraction):
    ordered = sorted(values)
    return ordered[max(math.ceil(fraction * len(ordered)), 1) - 1]

print(f"ejecuciones con medida: {len(runs)} · ítems: {sum(len(k) for _, k in runs)}")
peaks = [max(k) for _, k in runs]
print("pico por ejecución (MB): " + " ".join(f"{p/1024:.0f}" for p in peaks))
print(f"  min {min(peaks)/1024:.0f} · mediana {statistics.median(peaks)/1024:.0f} · max {max(peaks)/1024:.0f}")
spread = [max(k) / statistics.median(k) for _, k in runs if len(k) >= 3]
print(f"dentro de una ejecución, pico / mediana de sus ítems: mediana {statistics.median(spread):.2f} · max {max(spread):.2f} (n={len(spread)})")

def evaluate(name, predict, start):
    under, ratios = 0, []
    for i in range(start, len(runs)):
        guess, actual = predict(i), peaks[i]
        if guess < actual:
            under += 1
        else:
            ratios.append(guess / actual)
    n = len(runs) - start
    cover = f"{statistics.mean(ratios):.2f}x" if ratios else "-"
    print(f"{name:10} predicciones {n:2d} · por debajo del real {under:2d} ({100*under/n:4.1f} %) · "
          f"sobrecoste medio cuando cubre {cover}")

START = 1
evaluate('last', lambda i: peaks[i-1], START)
evaluate('max_3', lambda i: max(peaks[max(0, i-3):i]), START)
evaluate('max_5', lambda i: max(peaks[max(0, i-5):i]), START)
evaluate('max_all', lambda i: max(peaks[:i]), START)
evaluate('p90_items', lambda i: nearest_rank([x for _, k in runs[:i] for x in k], 0.9), START)
# Lo que el pool aplica: el pico de la última × margen 2.
evaluate('last_x2', lambda i: 2 * peaks[i-1], START)
