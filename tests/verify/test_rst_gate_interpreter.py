#!/usr/bin/env python3
"""El gate de RST mide con el interprete del CONSUMIDOR, no con el que lo lanzo.

Es la mitad ROJA, escrita ANTES de corregir el guard. El defecto esta MEDIDO
(:ref:`h-thyrox-133`): `_reexec_en_venv()` decide si re-lanzarse preguntando
«¿se importa Sphinx aqui?», y esa pregunta NO es la que importa. El venv del
PROVEEDOR trae Sphinx 9.0.4, asi que el guard devuelve temprano y nunca
re-lanza; entonces `Sphinx()` carga el `conf.py` del CONSUMIDOR, que declara
`sphinx_design`, y muere con `ExtensionError`.

La consecuencia es un veredicto de dos estados donde hacen falta tres: el
gate sale **1** —que su propio contrato reserva para «encontre un defecto de
sintaxis»— con stdout vacio. Quien lee el codigo de salida no puede separar
«la prosa esta rota» de «no pude medir».

Medido en los tres interpretes del arbol, por conducta:

| interprete            | `import sphinx` | guard        | resultado real |
|-----------------------|-----------------|--------------|----------------|
| `python3` del sistema | falla           | re-lanza     | mide, exit 0   |
| `.venv` del PROVEEDOR | **acierta**     | vuelve       | ExtensionError, exit 1 |
| `.venv` del CONSUMIDOR| acierta         | vuelve       | mide, exit 0   |

El verde del pre-commit es un accidente de camino: el python del sistema no
trae Sphinx. La via `bin/check_rst_sintaxis`, que fija el interprete del
proveedor, reproduce el fallo siempre.

Que cubre cada bloque:

1. **El interprete del proveedor NO publica un conteo** — si no puede cargar
   el `conf.py` del consumidor, rehusa con exit 2 y lo dice.
2. **El control PUEDE fallar**: el mismo gate por la via del pre-commit SI
   publica su conteo. Sin ese gemelo, el bloque 1 pasaria con un gate que
   rehusara siempre (sub-patron D).
3. **El discriminador es `sys.prefix`, no la ruta real del ejecutable** — los
   tres interpretes comparten `realpath` (`/usr/bin/python3.11`), asi que
   compararla da «son el mismo» para los tres.
"""
from __future__ import annotations

import os
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'src'))

from paths import reach  # noqa: E402

#: Unica aritmetica admitida (tarea #228): alimenta el `sys.path.insert`.
THYROX_ROOT = reach.thyrox_root()
GATE = THYROX_ROOT / 'src' / 'verify' / 'check_rst_sintaxis.py'
CONSUMER = reach.root('docs')
PROVIDER_PYTHON = THYROX_ROOT / '.venv' / 'bin' / 'python'
CONSUMER_PYTHON = CONSUMER / '.venv' / 'bin' / 'python'

#: Sujeto REAL del repo, no uno fabricado: el control positivo tiene que ser
#: prosa que el consumidor ya versiona (`hallazgo-abierto-genera-sucesor.md`).
SUBJECT = (
    'source/gestion/pm/thyrox/iniciativas/completar-packages-desde-la-referencia'
    '/hallazgos/hallazgo-H-THYROX-131-la-sonda-publico-25-bajo-una-cabecera-roja.rst'
)
COUNT_LINE = 'check-rst-sintaxis:'


def _run(interpreter: pathlib.Path | str) -> subprocess.CompletedProcess[str]:
    """Corre el gate con un interprete dado, con el cwd en el CONSUMIDOR."""
    env = dict(os.environ)
    env['PYTHONPATH'] = str(THYROX_ROOT / 'src')
    env.pop('_CHECK_RST_REEXEC', None)
    return subprocess.run(
        [str(interpreter), str(GATE), SUBJECT],
        cwd=str(CONSUMER), env=env, capture_output=True, text=True, check=False,
    )


def test_el_sujeto_y_los_interpretes_existen():
    """Precondicion: sin ellos los otros bloques medirian otra cosa."""
    assert GATE.is_file(), GATE
    assert (CONSUMER / SUBJECT).is_file(), CONSUMER / SUBJECT
    assert PROVIDER_PYTHON.is_file(), PROVIDER_PYTHON
    assert CONSUMER_PYTHON.is_file(), CONSUMER_PYTHON


def test_el_venv_del_proveedor_no_publica_un_conteo_que_no_midio():
    """Bloque 1 — el defecto medido.

    Hoy sale 1 con un traceback de `ExtensionError` y stdout vacio. Un 1 es
    «encontre un defecto»; lo que paso es «no pude medir», que es exit 2.
    """
    r = _run(PROVIDER_PYTHON)
    assert r.returncode != 1, (
        'colapsa «no pude medir» con «encontre un defecto de sintaxis»: '
        f'exit={r.returncode} stdout={r.stdout!r}')
    if COUNT_LINE in r.stdout:
        return                                   # midio: re-lanzo al consumidor
    assert r.returncode == 2, (
        f'sin conteo y sin exit 2: exit={r.returncode}')
    assert 'interprete' in r.stderr or 'intérprete' in r.stderr, (
        f'rehusa sin nombrar el interprete: {r.stderr[-400:]!r}')


def test_la_via_del_pre_commit_SI_publica_su_conteo():
    """Bloque 2 — el gemelo que hace del bloque 1 un control y no un adorno.

    Si el arreglo hiciera rehusar a todo el mundo, el bloque 1 pasaria igual
    y el gate dejaria de medir sin que nadie lo notara.
    """
    r = _run(sys.executable if 'venv' not in sys.prefix else '/usr/bin/python3')
    assert COUNT_LINE in r.stdout, (
        f'la via que hoy mide dejo de medir: exit={r.returncode} '
        f'stdout={r.stdout!r} stderr={r.stderr[-400:]!r}')
    assert r.returncode in (0, 1), f'exit inesperado: {r.returncode}'


def test_la_ruta_real_del_ejecutable_NO_discrimina():
    """Bloque 3 — por que el discriminador es `sys.prefix`.

    Medido: los tres interpretes del arbol resuelven al mismo binario real.
    Comparar `os.path.realpath(sys.executable)` daria «son el mismo» para los
    tres, y el guard no re-lanzaria nunca.
    """
    reales = set()
    prefijos = set()
    for p in ('/usr/bin/python3', PROVIDER_PYTHON, CONSUMER_PYTHON):
        out = subprocess.run(
            [str(p), '-c',
             'import os,sys,pathlib;'
             'print(os.path.realpath(sys.executable));'
             'print(pathlib.Path(sys.prefix).resolve())'],
            capture_output=True, text=True, check=False).stdout.splitlines()
        reales.add(out[0])
        prefijos.add(out[1])
    assert len(reales) == 1, f'la premisa del bloque cambio: {reales}'
    assert len(prefijos) == 3, f'sys.prefix dejo de discriminar: {prefijos}'


def _run_suite() -> int:
    fallos = 0
    casos = [(n, f) for n, f in sorted(globals().items())
             if n.startswith('test_') and callable(f)]
    for nombre, caso in casos:
        try:
            caso()
            print(f'  ok    {nombre}')
        except Exception as e:                          # noqa: BLE001
            fallos += 1
            print(f'  FALLA {nombre}: {type(e).__name__}: {e}')
    print(f'{len(casos) - fallos}/{len(casos)} aserciones verdes')
    return 1 if fallos else 0


if __name__ == '__main__':
    raise SystemExit(_run_suite())
