#!/usr/bin/env python3
"""Suite de ``verify/bootstrap.py`` — bootstrap CI (TASK-THYROX-0043).

Origen: de ``probabilityForComputerScientists`` (chapters/part4/
bootstrapping, contenido real verificado, no *stub*), NO de
``ai-course-notes``. Sirve directamente al sub-patrón D-bis de
``metrica-decide-la-conclusion.md`` — el episodio real que lo origina: una
comparación de cinco modos de despacho publicó un **4.07×** de mejora que,
medido con una línea base honesta, era en realidad **2.1×-2.7×**.

Lo que la suite mide:

1. Sobre dos muestras con una diferencia de medias MUCHO mayor que su
   dispersión interna, el intervalo de confianza de la diferencia NO cruza
   cero -> ``significant=True``. Caso (a) del caso de aceptación de
   TASK-THYROX-0043.
2. Sobre dos muestras con diferencia de medias del mismo orden que su
   dispersión interna, el IC SÍ cruza cero -> ``significant=False``.
   Caso (b).
3. Con N=1 en cualquiera de las dos muestras -> ``ValueError`` (idioma de
   tres estados: rehúsa, no publica un resultado con una sola observación
   — mismo criterio que ``job_runs.duration_distribution`` sobre población
   vacía).
4. Determinismo: mismo ``seed`` -> mismo resultado exacto (sin esto, la
   suite no sería reproducible).
5. ANULACIÓN — ``n_resamples=1`` retira la mitad de juicio del remuestreo
   (con un único remuestreo, el "intervalo" degenera a un punto:
   ``ci_low == ci_high``). Verificado de forma directa antes de escribir
   esta aserción (no asumido): sobre el caso (b) -- que NO tiene diferencia
   real -- con 8 semillas distintas, el veredicto fue ``significant=True``
   en las 8, porque una diferencia de medias de valor continuo casi nunca
   cae exactamente en cero. No es que el veredicto "varíe de forma
   inestable"; es que se vuelve una máquina de falsos positivos
   sistemática, sin importar la semilla.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from verify import bootstrap  # noqa: E402

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


print("=== 1. CASO (a): diferencia real ===")
tight_high = [100.0, 102.0, 98.0, 101.0, 99.0, 100.5, 99.5]
tight_low = [50.0, 52.0, 48.0, 51.0, 49.0, 50.5, 49.5]
result_to = bootstrap.bootstrap_difference(tight_high, tight_low, n_resamples=2000, seed=7)
check("diferencia real -> significant=True", True, result_to["significant"])
check("el IC no cruza cero", True, result_to["ci_low"] > 0 or result_to["ci_high"] < 0)

print("=== 2. CASO (b): ruido, sin diferencia real ===")
noisy_to = [10.0, 50.0, 5.0, 45.0, 20.0, 35.0, 15.0]
noisy_b = [15.0, 40.0, 8.0, 35.0, 22.0, 30.0, 18.0]
result_b = bootstrap.bootstrap_difference(noisy_to, noisy_b, n_resamples=2000, seed=7)
check("diferencia del orden del ruido -> significant=False", False, result_b["significant"])
check("el IC SÍ cruza cero", True, result_b["ci_low"] <= 0 <= result_b["ci_high"])

print("=== 3. N=1 rehúsa ===")
try:
    bootstrap.bootstrap_difference([1.0], [1.0, 2.0], n_resamples=100, seed=1)
    check("N=1 en una muestra -> ValueError", True, False)
except ValueError:
    check("N=1 en una muestra -> ValueError", True, True)

print("=== 4. determinismo — mismo seed, mismo resultado exacto ===")
r1 = bootstrap.bootstrap_difference(tight_high, tight_low, n_resamples=500, seed=42)
r2 = bootstrap.bootstrap_difference(tight_high, tight_low, n_resamples=500, seed=42)
check("dos corridas con el mismo seed dan el mismo IC exacto",
      (r1["ci_low"], r1["ci_high"]), (r2["ci_low"], r2["ci_high"]))

print("=== 5. ANULACIÓN — n_resamples=1 vuelve el veredicto un falso positivo sistemático ===")
verdicts_n1 = {
    bootstrap.bootstrap_difference(noisy_to, noisy_b, n_resamples=1, seed=seed)["significant"]
    for seed in range(8)
}
check(
    "con n_resamples=1, el caso (b) SIN diferencia real da significant=True "
    "en las 8 semillas -- el 'intervalo' de un solo punto casi nunca cae en "
    "cero, así que deja de discriminar y siempre marca 'real'",
    {True}, verdicts_n1,
)

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
