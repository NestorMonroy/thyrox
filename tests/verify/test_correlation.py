#!/usr/bin/env python3
"""Suite de ``verify/correlation.py`` — correlación de Pearson (TASK-THYROX-0043).

Origen: de ``probabilityForComputerScientists`` (chapters/part3/
correlation, contenido real verificado, no *stub*), NO de
``ai-course-notes``. Responde la otra mitad de la pregunta que
``metrica-decide-la-conclusion.md`` exige antes de afirmar que dos
magnitudes están relacionadas: no "¿A es distinto de B?" (eso lo mide
``bootstrap.py``), sino "¿X y Y se mueven juntos?".

Lo que la suite mide:

1. Caso (c): dos series que se mueven juntas (relación lineal) ->
   correlación cercana a 1.
2. Caso (d): dos series independientes con la misma media/varianza ->
   correlación discriminada de (c).
3. Sobre una serie sin varianza (constante) -> ``ValueError`` (la
   correlación no está definida ahí).
4. Sobre series de longitud distinta -> ``ValueError`` (no hay pares que
   correlacionar).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from verify import correlation  # noqa: E402

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


print("=== 1. CASO (c): series correlacionadas ===")
xs = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0]
ys_correlacionada = [2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0]
r_c = correlation.pearson_correlation(xs, ys_correlacionada)
check("correlación perfecta -> cercana a 1", True, r_c > 0.99)

print("=== 2. CASO (d): series independientes ===")
ys_independiente = [3.0, 1.0, 6.0, 2.0, 7.0, 4.0, 3.0]
r_d = correlation.pearson_correlation(xs, ys_independiente)
check("correlación independiente discriminada de (c)", True, abs(r_d) < abs(r_c) - 0.3)

print("=== 3. serie constante ===")
try:
    correlation.pearson_correlation([5.0, 5.0, 5.0], [1.0, 2.0, 3.0])
    check("serie constante -> ValueError", True, False)
except ValueError:
    check("serie constante -> ValueError", True, True)

print("=== 4. longitudes distintas ===")
try:
    correlation.pearson_correlation([1.0, 2.0], [1.0, 2.0, 3.0])
    check("longitudes distintas -> ValueError", True, False)
except ValueError:
    check("longitudes distintas -> ValueError", True, True)

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
