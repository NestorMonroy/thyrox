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
    paths = {dotted for _, dotted in gate.manifest_keys(data)}
    check('la clave anidada entra al universo', f'{outer}.{inner}' in paths, True)
    hits = [dotted for key, dotted in gate.manifest_keys(data)
            if gate.spanish_words_in(key)]
    check('y se marca como espanol', f'{outer}.{inner}' in hits, True)

print('=== Caso 3: el filtro descarta lo que no puede ser un nombre ===')
# `anulacion-a.txt` sale del corpus real: es un nombre de ARCHIVO usado como
# clave. Medirlo haria que el veredicto hablara de otra poblacion.
# El sujeto va como TEXTO JSON y no como literal de dict: el gate de
# identificadores YA ve una clave de dict (:ref:`h-docs-1253`), asi que un
# control cuyo sujeto es una clave espanola se marcaria a si mismo. Mismo
# idioma que `DICT_SOURCE` en `test_identifier_language.py`.
SAMPLE_JSON = ('{"anulacion-a.txt": 1, "nombre_del_archivo": 2, '
               '"question": 3, "mailboxHelpers (formatTeammateMessages)": 4}')
seen = {key for key, _ in gate.manifest_keys(json.loads(SAMPLE_JSON))}
check('NO ve el nombre de archivo', 'anulacion-a.txt' in seen, False)
check('NO ve la frase con parentesis',
      'mailboxHelpers (formatTeammateMessages)' in seen, False)
check('SI ve la clave espanola', 'nombre_del_archivo' in seen, True)
check('SI ve la clave inglesa (no filtra por idioma aqui)',
      'question' in seen, True)

print('=== Caso 4: las cinco claves obligatorias son inglesas ===')
from workbench.manifest import REQUIRED_KEYS  # noqa: E402
dirty = [k for k in REQUIRED_KEYS if gate.spanish_words_in(k)]
check('ninguna de las obligatorias cae', dirty, [])

print('=== Caso 5: el gate mide manifiestos de verdad (control positivo) ===')
# Un descuento demasiado ancho tambien daria cero incumplidores. Sin este caso,
# «0» no distingue «no hay deuda» de «no mire nada» — sub-patron D.
try:
    consumer = clone_root('docs')
except Exception:
    consumer = None
if consumer is None:
    print('  OMITIDO — el consumidor docs no es alcanzable')
else:
    # CRUDO, sin el baseline del consumidor: si el control leyera el baseline
    # pasaria a rojo en cuanto el consumidor congela su deuda — mediria su
    # parametro, no el mecanismo. Ocurrio al congelar las 100 claves de docs.
    raw, total = gate.scan(consumer, frozen=set())
    check('el universo no esta vacio', total > 0, True)
    check('y encuentra las claves espanolas del banco', len(raw) > 0, True)
    # Y con el baseline puesto, la deuda congelada NO bloquea: los dos lados
    # del mismo mecanismo, medidos por separado.
    frozen_hits, _ = gate.scan(consumer)
    check('lo congelado no vuelve a reportarse', len(frozen_hits) < len(raw), True)

#: El manifiesto sintetico de los casos 6 y 8: las cinco claves obligatorias en
#: ingles y UNA espanola, que es el sujeto. Va como TEXTO por la misma razon que
#: `SAMPLE_JSON` — un literal de dict aqui haria que el control se marcara a si
#: mismo ante el gate de identificadores.
SYNTHETIC_MANIFEST = ('{"question": "x", "instrument": "y", "metric": "z", '
                      '"blind_to": "w", "destination": "v", "tarea": "espanol"}')
SYNTHETIC_ENTRY = 'sonda-20260101T000000/manifest.json::tarea'


def plant_bank(tmp):
    """Siembra el banco sintetico y devuelve (raiz, archivo de baseline, env)."""
    tree = Path(tmp)
    bank = tree / '.claude' / 'workbench' / 'sonda-20260101T000000'
    bank.mkdir(parents=True)
    (bank / 'manifest.json').write_text(SYNTHETIC_MANIFEST)
    frozen_file = tree / 'baseline.txt'
    env = dict(os.environ, MANIFEST_LANGUAGE_BASELINE=str(frozen_file),
               THYROX_WORKBENCH_DIR=str(bank.parent))
    return tree, frozen_file, env


print('=== Caso 6: una entrada del baseline no bloquea; una nueva si ===')
with tempfile.TemporaryDirectory() as tmp:
    tree, frozen_file, env = plant_bank(tmp)

    frozen_file.write_text('')
    done = subprocess.run([sys.executable, str(GATE), '--strict', str(tree)],
                          capture_output=True, text=True, env=env)
    check('sin baseline la clave nueva bloquea', done.returncode, 1)
    check('y la nombra', 'tarea' in done.stdout + done.stderr, True)

    frozen_file.write_text(SYNTHETIC_ENTRY + '\n')
    done = subprocess.run([sys.executable, str(GATE), '--strict', str(tree)],
                          capture_output=True, text=True, env=env)
    check('congelada, no bloquea', done.returncode, 0)

print('=== Caso 7: sin lexico REHUSA — no publica un cero ===')
BLIND = tempfile.mkdtemp()
Path(BLIND, 'spacy_lookups_data').mkdir()
Path(BLIND, 'spacy_lookups_data', '__init__.py').write_text('')
done = subprocess.run([sys.executable, str(GATE), str(ROOT)],
                      capture_output=True, text=True,
                      env=dict(os.environ, PYTHONPATH=BLIND))
output = done.stdout + done.stderr
check('rehusa con 2', done.returncode, 2)
check('NO publica un conteo de manifiestos', 'manifiesto(s) medido' in output, False)

print('=== Caso 8 (EL DISCRIMINANTE DEL CONGELADO): re-congelar no destruye ===')
# Congelar dos veces sobre el mismo arbol tiene que dar el mismo conteo. Si el
# modo de congelado comparte el escaneo con el de verificacion, la segunda
# pasada no ve ofensores —ya estan congelados— y escribe CERO lineas: la deuda
# desaparece del baseline y reaparece como NUEVA en el siguiente `--strict`.
# El caso 6 no lo ejercita: congela una sola vez.
with tempfile.TemporaryDirectory() as tmp:
    tree, frozen_file, env = plant_bank(tmp)

    def freeze():
        subprocess.run([sys.executable, str(GATE), '--write-baseline', str(tree)],
                       capture_output=True, text=True, env=env)
        return [n for n in frozen_file.read_text().splitlines()
                if n.strip() and not n.startswith('#')]

    first = freeze()
    check('la primera congela la deuda', first, [SYNTHETIC_ENTRY])
    check('la segunda NO la destruye', freeze(), first)

    done = subprocess.run([sys.executable, str(GATE), '--strict', str(tree)],
                          capture_output=True, text=True, env=env)
    check('y tras re-congelar sigue sin bloquear', done.returncode, 0)

print()
print(f'{ok} ok, {failures} fallos (alcance medido: {ok + failures} aserciones '
      f'sobre {GATE})')
raise SystemExit(1 if failures else 0)
