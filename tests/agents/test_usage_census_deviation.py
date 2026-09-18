#!/usr/bin/env python3
"""El censo publicaba la media por modelo y nada sobre su dispersion.

Mitad ROJA. `censo-medicion` publica «cache_read por turno» como media, y con
esa cifra se decide a que modelo se despacha. Dos modelos con la MISMA media
pueden ser uno predecible y otro erratico, y la media sola no los separa —
``metrica-decide-la-conclusion.md`` aplicado al instrumento que este arbol
mas usa para decidir gasto.

El caso es el control positivo, y esta construido para que la media NO
discrimine: los dos modelos de la sonda tienen exactamente 300 000 de media
por turno, y desviaciones tipicas que difieren en un orden de magnitud.

    estable   [290k, 295k, 300k, 305k, 310k]   media 300k   desv ~ 7.07k
    erratico  [100k, 200k, 300k, 400k, 500k]   media 300k   desv ~ 141.42k

Este es el primer consumidor de `deviation`: hasta ahora el primitivo existia
sin nadie que lo llamara, que es capacidad muerta.

*Metrica:* la tabla que `censo-medicion` imprime para un store de sonda.
*Ciega a:* las filas sin `usage_source='transcript'` y las que no declaran
modelo `claude-*`, que el censo ya excluye por su propio filtro; y a si la
desviacion se calcula sobre la poblacion correcta cuando un modelo tiene una
sola fila, caso que el ultimo caso si ejercita.

CONTROL DE ANULACION: si la columna de desviacion volviera a no publicarse,
caen los casos 2 y 3 —y solo esos—. El caso 1 sobrevive, porque la media
sigue siendo la misma en los dos modelos: sin los otros dos, el verde no
distinguiria «publica la dispersion» de «publica dos medias iguales».
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE / "src"))

spec = importlib.util.spec_from_file_location(
    "agent_store", HERE / "src" / "agents" / "agent_store.py")
store = importlib.util.module_from_spec(spec)
spec.loader.exec_module(store)

OK = FAILED = 0


def check(label, expected, obtained):
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


STEADY = [290_000, 295_000, 300_000, 305_000, 310_000]
ERRATIC = [100_000, 200_000, 300_000, 400_000, 500_000]


def _seed(conn, model, per_turn_values):
    """Una fila por valor, con un turno cada una: el valor ES el de por turno."""
    for index, cache_read in enumerate(per_turn_values):
        conn.execute(
            "INSERT INTO agent_sessions (agent_id, subagent_type, session_id, "
            "status, started_at, updated_at, model, turns, input_tokens, "
            "cache_creation_tokens, cache_read_tokens, output_tokens, "
            "equiv_cost, usage_source) VALUES "
            "(?, 'general-purpose', 's-1', 'completed', '2026-01-01', "
            "'2026-01-01', ?, 1, 0, 0, ?, 0, ?, 'transcript')",
            (f"{model}-{index}", model, cache_read, cache_read // 10))


with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp) / "sonda" / "agent-results"
    conn = store.connect(raiz)
    _seed(conn, "claude-steady-1", STEADY)
    _seed(conn, "claude-erratic-1", ERRATIC)
    conn.commit()
    conn.close()

    salida = io.StringIO()
    with contextlib.redirect_stdout(salida):
        store.main(["censo-medicion", "--claude-dir", str(raiz)])
    texto = salida.getvalue()

    # Se leen las filas de LA TABLA, no el texto entero: «300,000» tambien sale
    # en el agregado de arriba, y contarlo ahi mediria otra cosa.
    _filas = {}
    for _linea in texto.splitlines():
        _piezas = _linea.split()
        # `n=` es el discriminador SEMANTICO: de los bloques que el censo
        # emite con el nombre del modelo al principio, este es el unico que lo
        # imprime. El conteo de campos tambien separa hoy (4 aqui, 5 en USD)
        # pero es accidental: depende de cuantas columnas tenga la otra tabla,
        # no de que midan unidades distintas. Sin `n=`, las filas de USD
        # —que se imprimen DESPUES— pisarian estas en el diccionario.
        if len(_piezas) >= 4 and _piezas[0].startswith("claude-") \
                and _piezas[1].startswith("n="):
            # Se lee por posicion con respaldo: si el bloque publicara menos
            # columnas de las que este control exige, el caso tiene que FALLAR
            # nombrando la columna ausente, no reventar con un IndexError que
            # no dice cual falta.
            def _col(_indice):
                return _piezas[_indice] if _indice < len(_piezas) else "AUSENTE"
            _filas[_piezas[0]] = {
                "n": _col(1),
                "equiv_media": _col(2), "equiv_desv": _col(3),
                "cache_media": _col(4), "cache_desv": _col(5)}

    print("== 1. la media NO discrimina: los dos modelos dan la misma ==")
    check("las dos filas estan en la tabla", 2, len(_filas))
    check("misma media en los dos modelos", True,
          _filas.get("claude-steady-1", {}).get("cache_media")
          == _filas.get("claude-erratic-1", {}).get("cache_media") == "300,000")

    print("== 2. la desviacion tipica SI las distingue ==")
    check("el estable publica su desviacion", "7,071",
          _filas.get("claude-steady-1", {}).get("cache_desv"))
    check("el erratico publica la suya, un orden mayor", "141,421",
          _filas.get("claude-erratic-1", {}).get("cache_desv"))

    print("== 3. la cifra viaja con su denominador ==")
    check("cada modelo declara su n", ["n=5", "n=5"],
          [_filas.get(m, {}).get("n") for m in
           ("claude-erratic-1", "claude-steady-1")])

    print("== 4. la unidad se declara: el bloque es de TOKENS, no de dinero ==")
    _cabecera = [l for l in texto.splitlines() if "por turno, por modelo" in l]
    check("el bloque nombra su unidad", True,
          bool(_cabecera) and "tokens" in _cabecera[0].lower())
    check("y NO mezcla dinero en el mismo bloque", True,
          bool(_cabecera) and "usd" not in _cabecera[0].lower())

    print("== 5. publica equiv_cost, que es la unidad de coste que SE CITA ==")
    # `calibration-verified-numbers.md`: de los tres tipos de costo, `equiv_cost`
    # es el unico que se cita. `cache_read` es un COMPONENTE del consumo —la
    # unidad de capacidad— y el USD es precio de lista. Un bloque que publicara
    # solo `cache_read` mediria el componente y se leeria como el costo.
    check("el estable publica la desviacion de su equiv_cost", "707",
          _filas.get("claude-steady-1", {}).get("equiv_desv"))
    check("el erratico publica la suya, un orden mayor", "14,142",
          _filas.get("claude-erratic-1", {}).get("equiv_desv"))
    check("misma media de equiv_cost: tampoco ahi discrimina", True,
          _filas.get("claude-steady-1", {}).get("equiv_media")
          == _filas.get("claude-erratic-1", {}).get("equiv_media") == "30,000")

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
