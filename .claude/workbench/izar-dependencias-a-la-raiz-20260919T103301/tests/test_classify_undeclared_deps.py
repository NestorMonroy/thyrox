"""Suite del clasificador de dependencias sin declarar.

El defecto que la origina: con ``--sin-resolucion`` el clasificador ponia
TODA fila en el cubo ``NO RESUELVE``, porque ``ok`` vale ``None`` y ``None``
es falso::

    ok = resolves_from(...) if measure_resolution else None
    (resolved if ok else unresolved).append(row)

La bandera no omitia el veredicto: lo fabricaba. Un ``NO RESUELVE: 25`` de
esa invocacion significa «25 sin medir», no «25 sin resolver» — el
sub-patron D de `metrica-decide-la-conclusion.md` dentro de la propia sonda.

El control positivo es el arbol de `fixtures/arbol-minimo`, que declara dos
ausentes reales (`ausente` en alfa, `otra-ausente` en beta) y dos que NO
deben contarse: una declarada en el manifiesto propio y una izada a la raiz.
"""

import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
PROBE = HERE.parent / 'probes' / 'classify_undeclared_deps.py'
FIXTURE = HERE / 'fixtures' / 'arbol-minimo'

fallos = 0


def check(condicion, etiqueta):
    global fallos
    if condicion:
        print(f'  ok   {etiqueta}')
    else:
        fallos += 1
        print(f'  FAIL {etiqueta}')


def run(*extra):
    """Corre la sonda contra el arbol de fixture, no contra el arbol real."""
    done = subprocess.run(
        [sys.executable, str(PROBE), *extra],
        capture_output=True, text=True, timeout=120,
        env={'THYROX_ROOT': str(FIXTURE), 'PATH': '/usr/bin:/bin'},
    )
    # La stderr se imprime al fallar: sin esto, un crash de la sonda deja la
    # stdout vacia y las TRES aserciones caen por una causa ajena al defecto
    # — un rojo que no discrimina, que es lo que esta suite existe para medir.
    if done.returncode != 0:
        print(f'  [sonda exit={done.returncode}] {done.stderr.strip()[-400:]}')
    return done.stdout


def main():
    salida = run('--sin-resolucion')

    # 1. El universo se mide igual con y sin la bandera: dos ausentes reales.
    check('SIN DECLARAR (excluidas autorreferencia y raiz): 2' in salida,
          'cuenta 2 sin declarar (la declarada y la izada no cuentan)')

    # 2. Sin medir resolucion, NINGUNA fila se publica como «no resuelve».
    #    Es la mitad roja: hoy publica las dos ahi.
    check('== NO RESUELVE (causa un rojo): 0' in salida,
          'sin --resolucion, NO RESUELVE queda en 0')

    # 3. Las dos van a un cubo propio que declara que no se midio.
    #
    # La aserción exige la fila DEBAJO de su cabecera, no las dos cadenas
    # sueltas en cualquier parte de la salida. La version anterior decia
    # `'SIN MEDIR' in salida and 'ausente' in salida` y SOBREVIVIA a la
    # anulacion del tercer cubo: la cabecera se imprimia igual con un 0, y
    # `ausente` aparecia bajo NO RESUELVE. Pasaba por coincidencia de dos
    # cadenas en partes distintas — un verde que no discriminaba, que es el
    # defecto que esta suite existe para medir, cometido dentro de ella.
    tras_cabecera = salida.split('== SIN MEDIR')[-1] if '== SIN MEDIR' in salida else ''
    check('ausente' in tras_cabecera and 'otra-ausente' in tras_cabecera,
          'las dos filas sin medir se publican BAJO la cabecera SIN MEDIR')

    print(f'\n{3 - fallos} de 3 aserciones en verde')
    return 1 if fallos else 0


if __name__ == '__main__':
    raise SystemExit(main())
