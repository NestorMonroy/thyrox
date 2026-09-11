#!/usr/bin/env python3
"""Contrato del CUARTO criterio: el corpus, que es abierto.

Portado de ``api: scripts/test_identifier_language_corpus.py`` junto con el
mecanismo (DEC-04, actualizar-agentic-ai-thyrox). Único cambio de fondo: el
gate ahora exige un baseline DECLARADO (ver
``test_identifier_language_baseline.py``); las llamadas de este archivo lo
declaran para no depender de una fixture ajena a lo que miden.

Los tres criterios anteriores son cerrados por construccion — siete sufijos,
una lista de particulas y una lista de palabras. Una lista solo atrapa lo que
alguien se acordo de enumerar, asi que la siguiente palabra se cuela: medido,
de seis identificadores espanoles escritos el 2026-09-07 el gate vio **cero**.

El caso que DISCRIMINA es el 2: esas seis palabras no estan en `SPANISH_WORDS`
ni tienen morfologia exclusiva. Un gate con solo los tres criterios cerrados
pasa el caso 1 y falla el 2.
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
GATE = HERE.parent.parent / 'src' / 'verify' / 'check_identifier_language.py'

sys.path.insert(0, str(GATE.parent))

#: Las seis que el gate aprobo teniendolas delante. Ninguna esta en la lista
#: cerrada — se comprueba en el caso 3, que es lo que hace honesto al caso 2.
SPANISH_MISSED = ['bien', 'mal', 'corre', 'falso', 'limpio', 'raiz']

#: Ingles de nuestro propio codigo. Su margen medido va de -6.9 a 1.6; los mas
#: altos son cognados exactos (`final`, `total`), la ceguera ya declarada.
ENGLISH_KEPT = ['root', 'run', 'clean', 'fake', 'passed', 'failed', 'marker',
                'banks', 'found', 'layer', 'check', 'gate', 'store', 'board']

passed = failed = 0


def check(label, got, want):
    global passed, failed
    if got == want:
        print(f'  OK   {label}'); passed += 1
    else:
        print(f'  FAIL {label}: {got!r} != {want!r}'); failed += 1


def run_on(source, extra_env=None, extra_argv=None):
    """Corre el gate sobre un archivo con ese cuerpo. Devuelve (rc, salida).

    Declara un baseline vacío propio: sin él el gate REHÚSA con 2, y eso no es
    lo que este archivo mide (mide el corpus, no la declaración del baseline —
    ese control vive en ``test_identifier_language_baseline.py``).
    """
    with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False) as handle:
        handle.write(source); path = handle.name
    baseline = path + '.baseline'
    Path(baseline).write_text('')
    try:
        env = dict(os.environ, IDENTIFIER_LANGUAGE_BASELINE=baseline)
        env.update(extra_env or {})
        done = subprocess.run([sys.executable, str(GATE), path] + list(extra_argv or ()),
                              capture_output=True, text=True, env=env)
        return done.returncode, done.stdout + done.stderr
    finally:
        Path(path).unlink(missing_ok=True)
        Path(baseline).unlink(missing_ok=True)


import check_identifier_language as gate  # noqa: E402

print('=== Caso 1: el corpus esta, o el gate no puede medir ===')
check('los dos lexicos cargan', gate.corpus_available(), True)

print('=== Caso 2 (EL QUE DISCRIMINA): atrapa espanol fuera de la lista ===')
vistas = [w for w in SPANISH_MISSED if gate.spanish_by_corpus(w)]
check('las seis se ven', sorted(vistas), sorted(SPANISH_MISSED))

print('=== Caso 3: y ninguna de las seis estaba en la lista cerrada ===')
check('la lista no las tenia',
      [w for w in SPANISH_MISSED if w in gate.SPANISH_WORDS], [])

print('=== Caso 4: no marca ingles de nuestro codigo ===')
falsos = [w for w in ENGLISH_KEPT if gate.spanish_by_corpus(w)]
check('cero falsos positivos', falsos, [])

print('=== Caso 5: el veredicto llega al gate entero ===')
rc, salida = run_on('def bien():\n    limpio = 1\n    return limpio\n')
check('rechaza el archivo', rc, 1)
check('nombra la palabra', 'bien' in salida, True)

print('=== Caso 6: un archivo en ingles pasa ===')
rc, _ = run_on('def passed():\n    clean = 1\n    return clean\n')
check('acepta el archivo', rc, 0)

print('=== Caso 7: el vocabulario tecnico no lo marca el corpus ===')
# Las cinco las midio una sonda de conducta: el corpus las atrapa y NINGUNA
# esta en el lexico cerrado ni en las particulas. No son palabras del texto:
# `ir` es el prefijo de namespace de la referencia, `vals` su convencion de
# dict, `iban` un estandar bancario, `q` y `es` nombres de una y dos letras.
for nombre in ('IrActionsBase', 'party_vals', 'iban_check', 'q', 'es_MX'):
    check(f'{nombre} no se marca', gate.spanish_words_in(nombre), [])

# `categ` es la sexta, y su positivo es REAL: la referencia declara
# `root_categ` y `_compute_root_categ` verbatim en test_orm/models/test_orm.py
# (:27 y :50), y `categ_id` sale 685 veces en su arbol. Es su abreviatura de
# *category* — ingles, no español.
#
# Por que la atrapaba el corpus, medido: es=-17.17 (la cola del lexico español;
# `categoria` esta en -11.82, cinco ordenes mas arriba) contra AUSENTE en
# ingles, asi que el margen de 12.83 lo produce la ausencia, no la evidencia.
# Es literalmente la ceguera que `spanish_by_corpus` declara en su docstring:
# «la forma flexionada que ningun corpus tiene, donde la ausencia en ingles la
# empuja por encima del umbral».
check('root_categ no se marca', gate.spanish_words_in('root_categ'), [])
check('_compute_root_categ no se marca',
      gate.spanish_words_in('_compute_root_categ'), [])

print('=== Caso 8: EL DISCRIMINANTE — la exencion no apaga el criterio ===')
# Si la exencion se implementara como «apagar el corpus», este caso pasaria a
# devolver [] y el criterio entero quedaria muerto sin que nada lo dijera.
check('clasificar_los_metodos sigue cayendo',
      'clasificar' in gate.spanish_words_in('clasificar_los_metodos'), True)
check('una particula real sigue cayendo',
      'en' in gate.spanish_words_in('lista_en'), True)
# Y exonerar la ABREVIATURA no exonera la PALABRA: si la exencion se
# implementara como un prefijo (`categ*`) en vez de la forma exacta, este caso
# pasaria a devolver [] y el gate dejaria entrar `categoria` de verdad.
check('categoria (la palabra) sigue cayendo',
      'categoria' in gate.spanish_words_in('categoria_de_producto'), True)

print('=== Caso 9: sin lexico el gate REHUSA — no publica un cero ===')
# Se ciega el corpus SIN desinstalarlo: un paquete sombra con el mismo nombre y
# sin su directorio `data/`, delante en PYTHONPATH. Es la forma medida del
# defecto real — en el entorno `uv` de api el paquete no estaba y el gate,
# en vez de rehusar, degradaba a tres criterios y publicaba OK.
BLIND = tempfile.mkdtemp()
Path(BLIND, 'spacy_lookups_data').mkdir()
Path(BLIND, 'spacy_lookups_data', '__init__.py').write_text('')

rc, output = run_on('def bien():\n    limpio = 1\n    return limpio\n',
                    extra_env={'PYTHONPATH': BLIND})
check('rehusa con 2', rc, 2)
check('nombra el remedio', 'uv sync' in output, True)
check('NO publica un conteo de archivos medidos', 'archivos medidos' in output, False)

# Y el mismo rehuse al congelar: un baseline medido por un instrumento ciego
# congela como «limpio» lo que el gate no supo ver — que es exactamente como
# el baseline de api paso de 1268 a 3561 al volver el corpus.
rc, output = run_on('def bien():\n    return 1\n',
                    extra_env={'PYTHONPATH': BLIND},
                    extra_argv=['--write-baseline'])
check('tampoco congela a ciegas', rc, 2)
check('no dice haber escrito baseline', 'baseline escrita' in output, False)

# Control de que la ceguera es REAL y no que el sombra rompio otra cosa: con
# el mismo archivo y sin cegar, el gate lo rechaza por espanol (1, no 2).
rc, _ = run_on('def bien():\n    limpio = 1\n    return limpio\n')
check('con lexico el veredicto es 1, no 2', rc, 1)

print()
print(f'{passed} ok, {failed} fallos (alcance medido: {passed + failed} aserciones '
      f'sobre {GATE})')
raise SystemExit(1 if failed else 0)
