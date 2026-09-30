#!/usr/bin/env python3
"""Contrato del eje de idioma de las CLAVES DE MANIFIESTO.

``identificadores-en-ingles.md`` enumera «claves de manifiesto —una clave es un
atributo—», y hasta hoy ningun gate media un ``manifest.json``: el eje de
identificadores recorre AST de Python (:ref:`h-docs-1253`) y un JSON no pasa
por ahi. La regla nombraba una superficie que ningun instrumento alcanzaba.

**Por que un eje aparte y no dentro de ``checkWorkbench``.** El docstring de
``src/workbench/manifest.py`` prohibe un segundo verificador de *«que hace
conforme a un run»*, y esa prohibicion sigue en pie: el idioma de una clave es
una pregunta **ortogonal** a la conformidad del banco, igual que el separador
de un nombre de archivo es ortogonal a su idioma. El gate de nombres ya modela
la forma —N ejes, un lexico— y este es su tercer hermano.

Los controles positivos son manifiestos **REALES** del corpus, no fabricados:
quien escribe el patron no puede validarlo con su propio encuadre
(``hallazgo-abierto-genera-sucesor.md``). Si el sujeto no es alcanzable, el
control se OMITE diciendolo — no pasa en verde.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
GATE = ROOT / 'src' / 'verify' / 'check_manifest_language.py'

sys.path.insert(0, str(ROOT / 'src'))
sys.path.insert(0, str(GATE.parent))

from paths.reach import root as clone_root  # noqa: E402

#: Clave espanola ANIDADA en un manifiesto cuyo primer nivel es todo ingles.
#: Sin recursion el gate da 0 sobre este archivo — es lo que hace real la
#: asercion de recursion en vez de decorativa.
NESTED_SUBJECT = ('api', 'analogue-in-the-client-20260830T192922',
                  'corrected_premise', 'afirmado_antes')

ok = failures = 0


def check(label, got, want):
    global ok, failures
    if got == want:
        ok += 1
        print(f'  ok    {label}')
    else:
        failures += 1
        print(f'  FALLO {label}: esperaba {want!r}, obtuve {got!r}')


def find_manifest(repo, bank_dir_name):
    """El manifiesto real del corpus, o None si no es alcanzable."""
    try:
        home = clone_root(repo)
    except Exception:
        return None
    for candidate in home.rglob('manifest.json'):
        if candidate.parent.name == bank_dir_name:
            return candidate
    return None


import check_manifest_language as gate  # noqa: E402

print('=== Caso 1: el corpus esta, o el gate no puede medir ===')
check('el lexico carga', gate.corpus_available(), True)

print('=== Caso 2: la clave anidada se ve (EL QUE EXIGE RECURSION) ===')
repo, bank, outer, inner = NESTED_SUBJECT
subject = find_manifest(repo, bank)
if subject is None:
    print(f'  OMITIDO — el sujeto no es alcanzable: {repo}:{bank}/manifest.json')
else:
    data = json.loads(subject.read_text())
    rutas = {ruta for _, ruta in gate.manifest_keys(data)}
    check('la clave anidada entra al universo', f'{outer}.{inner}' in rutas, True)
    hits = [ruta for clave, ruta in gate.manifest_keys(data)
            if gate.spanish_words_in(clave)]
    check('y se marca como espanol', f'{outer}.{inner}' in hits, True)

print('=== Caso 3: el filtro descarta lo que no puede ser un nombre ===')
# `anulacion-a.txt` sale del corpus real: es un nombre de ARCHIVO usado como
# clave. Medirlo haria que el veredicto hablara de otra poblacion.
DATOS = {'anulacion-a.txt': 1, 'nombre_del_archivo': 2, 'question': 3,
         'mailboxHelpers (formatTeammateMessages)': 4}
vistas = {clave for clave, _ in gate.manifest_keys(DATOS)}
check('NO ve el nombre de archivo', 'anulacion-a.txt' in vistas, False)
check('NO ve la frase con parentesis',
      'mailboxHelpers (formatTeammateMessages)' in vistas, False)
check('SI ve la clave espanola', 'nombre_del_archivo' in vistas, True)
check('SI ve la clave inglesa (no filtra por idioma aqui)',
      'question' in vistas, True)

print('=== Caso 4: las cinco claves obligatorias son inglesas ===')
from workbench.manifest import REQUIRED_KEYS  # noqa: E402
sucias = [k for k in REQUIRED_KEYS if gate.spanish_words_in(k)]
check('ninguna de las obligatorias cae', sucias, [])

print('=== Caso 5: el gate mide manifiestos de verdad (control positivo) ===')
# Un descuento demasiado ancho tambien daria cero incumplidores. Sin este caso,
# «0» no distingue «no hay deuda» de «no mire nada» — sub-patron D.
try:
    consumidor = clone_root('docs')
except Exception:
    consumidor = None
if consumidor is None:
    print('  OMITIDO — el consumidor docs no es alcanzable')
else:
    # CRUDO, sin el baseline del consumidor: si el control leyera el baseline
    # pasaria a rojo en cuanto el consumidor congela su deuda — mediria su
    # parametro, no el mecanismo. Ocurrio al congelar las 100 claves de docs.
    crudos, total = gate.scan(consumidor, frozen=set())
    check('el universo no esta vacio', total > 0, True)
    check('y encuentra las claves espanolas del banco', len(crudos) > 0, True)
    # Y con el baseline puesto, la deuda congelada NO bloquea: los dos lados
    # del mismo mecanismo, medidos por separado.
    congelados, _ = gate.scan(consumidor)
    check('lo congelado no vuelve a reportarse', len(congelados) < len(crudos), True)

print('=== Caso 6: una entrada del baseline no bloquea; una nueva si ===')
with tempfile.TemporaryDirectory() as tmp:
    arbol = Path(tmp)
    banco = arbol / '.claude' / 'workbench' / 'sonda-20260101T000000'
    banco.mkdir(parents=True)
    (banco / 'manifest.json').write_text(json.dumps(
        {'question': 'x', 'instrument': 'y', 'metric': 'z',
         'blind_to': 'w', 'destination': 'v', 'tarea': 'espanol'}))
    linea = 'sonda-20260101T000000/manifest.json::tarea'
    baseline = arbol / 'baseline.txt'

    baseline.write_text('')
    env = dict(os.environ, MANIFEST_LANGUAGE_BASELINE=str(baseline),
               THYROX_WORKBENCH_DIR=str(arbol / '.claude' / 'workbench'))
    done = subprocess.run([sys.executable, str(GATE), '--strict', str(arbol)],
                          capture_output=True, text=True, env=env)
    check('sin baseline la clave nueva bloquea', done.returncode, 1)
    check('y la nombra', 'tarea' in done.stdout + done.stderr, True)

    baseline.write_text(linea + '\n')
    done = subprocess.run([sys.executable, str(GATE), '--strict', str(arbol)],
                          capture_output=True, text=True, env=env)
    check('congelada, no bloquea', done.returncode, 0)

print('=== Caso 7: sin lexico REHUSA — no publica un cero ===')
BLIND = tempfile.mkdtemp()
Path(BLIND, 'spacy_lookups_data').mkdir()
Path(BLIND, 'spacy_lookups_data', '__init__.py').write_text('')
done = subprocess.run([sys.executable, str(GATE), str(ROOT)],
                      capture_output=True, text=True,
                      env=dict(os.environ, PYTHONPATH=BLIND))
salida = done.stdout + done.stderr
check('rehusa con 2', done.returncode, 2)
check('NO publica un conteo de manifiestos', 'manifiesto(s) medido' in salida, False)

print()
print(f'{ok} ok, {failures} fallos (alcance medido: {ok + failures} aserciones '
      f'sobre {GATE})')
raise SystemExit(1 if failures else 0)
