"""¿Qué política de historial predice mejor el pico del SIGUIENTE ejecución?

Sujeto: las ejecuciones reales de headless-pool del lazo tsc (claude -p), un
directorio `step-N/outputs` por ejecución, un `.time` de GNU Time por ítem.
Para cada ejecución i se predice su pico con lo que había ANTES de i:
  last      el pico de la ejecución i-1                (lo que hace hoy el pool)
  max_k     el máximo de los picos de las últimas k    (k = 3, 5)
  max_all   el máximo de todos los picos anteriores
  p90_items el percentil 90 de TODOS los ítems anteriores (no de los picos)
Se cuenta cuántas veces la predicción queda POR DEBAJO del pico real — el
fallo que importa: la admisión reserva menos de lo que el ítem usa — y el
sobrecoste medio (predicción / real) cuando no falla.
"""
import re, statistics, sys
from pathlib import Path

MEASURE = re.compile(r"^(\d+)\s+([\d.]+)")
runs = []
for out in sorted(Path('.claude/workbench/tsc-zero-loop').glob('run-*/step-*/outputs'),
                  key=lambda p: (p.parent.parent.name, int(p.parent.name.split('-')[1]))):
    kbs = []
    for t in out.glob('*.time'):
        for line in reversed(t.read_text(errors='replace').splitlines()):
            m = MEASURE.match(line)
            if m:
                kbs.append(int(m.group(1)))
                break
    if kbs:
        runs.append((str(out), kbs))

print(f"ejecuciones con medida: {len(runs)} · ítems: {sum(len(k) for _, k in runs)}")
peaks = [max(k) for _, k in runs]
print(f"pico por ejecución (MB): min {min(peaks)/1024:.0f} · mediana {statistics.median(peaks)/1024:.0f} · max {max(peaks)/1024:.0f}")
spread = [max(k) / statistics.median(k) for _, k in runs if len(k) >= 3]
print(f"dentro de una ejecución, pico / mediana de sus ítems: mediana {statistics.median(spread):.2f} · max {max(spread):.2f} (n={len(spread)})")

def evaluate(name, predict, start):
    under, ratios = 0, []
    for i in range(start, len(runs)):
        guess = predict(i)
        actual = peaks[i]
        if guess < actual:
            under += 1
        else:
            ratios.append(guess / actual)
    n = len(runs) - start
    print(f"{name:10} predicciones {n:2d} · por debajo del real {under:2d} ({100*under/n:4.1f} %) · "
          f"sobrecoste medio cuando cubre {statistics.mean(ratios):.2f}x")

START = 1  # sólo 5 ejecuciones medidas: se compara desde la segunda, y es ilustrativo
evaluate('last', lambda i: peaks[i-1], START)
evaluate("max_3", lambda i: max(peaks[max(0,i-3):i]), START)
evaluate("max_5", lambda i: max(peaks[max(0,i-5):i]), START)
evaluate('max_all', lambda i: max(peaks[:i]), START)
evaluate('p90_items', lambda i: sorted(x for _, k in runs[:i] for x in k)[int(0.9*sum(len(k) for _, k in runs[:i]))-1], START)
