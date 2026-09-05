#!/usr/bin/env python3
"""Prueba de ``check_error_catalog.py`` — el gate del catalogo de errores.

El gate mide que cada ``error-*.rst`` declare un vocabulario **cerrado**
(DEC-ERR-01..04) en vez del texto libre que la referencia externa demuestra
que driftea: medido sobre ``iact-docs@8673e59``, **9** valores de ``type:``
sobre 16 archivos, **7** grafias de ``severity:`` para 4 niveles.

Lo que se cubre, y por que cada bloque existe:

1. **La lectura de la cabecera** — que las cinco claves se recuperen del bloque
   ``.. meta::`` de un archivo REAL del repo, no de uno fabricado.
2. **El corpus real pasa** — los ``error-ERR-0??`` que existen hoy no tienen
   defecto. Por si solo este bloque es un verde que no discrimina: un gate que
   devolviera siempre ``[]`` lo pasaria entero.
3. **El control que puede fallar** — se toma el archivo REAL de ERR-021 y se
   muta **una** clave por vez. Cada mutacion tiene que producir exactamente el
   defecto que la nombra. Si mutar no cambia el veredicto, el bloque 2 no
   estaba midiendo nada (sub-patron D de ``metrica-decide-la-conclusion.md``).
   El positivo NO se fabrica: es un archivo del repo menos una propiedad.
4. **La coherencia id ↔ nombre de archivo** — un ``error-ERR-021-*.rst`` cuya
   etiqueta diga ``_err-022`` es un id que ninguna busqueda cruza.
5. **El alcance vacio no publica cero** — sin ningun ``errores/`` que medir, un
   ``OK: 0 incumplidores`` no distingue «no hay defectos» de «no habia nada que
   mirar». El gate tiene que rehusar.

Uso:  python3 .claude/scripts/tests/test_error_catalog.py
"""

from __future__ import annotations

import importlib.util
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
GATE = ROOT / '.claude' / 'scripts' / 'gates' / 'check_error_catalog.py'
CORPUS = ROOT / 'source/gestion/pm/docs/iniciativas/catalogar-y-registrar-errores/errores'
ANCHOR = CORPUS / 'error-ERR-021-el-camino-barato-no-tenia-registro.rst'

failures: list[str] = []


def assert_that(condition: bool, label: str) -> None:
    if condition:
        print(f'  ok   {label}')
    else:
        print(f'  FALLA {label}')
        failures.append(label)


def load_gate():
    spec = importlib.util.spec_from_file_location('check_error_catalog', GATE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    if not GATE.exists():
        print(f'ERROR — el gate no existe: {GATE}', file=sys.stderr)
        print('NO se emite conteo: un 0 aqui seria un verde falso.', file=sys.stderr)
        return 2
    if not ANCHOR.exists():
        print(f'ERROR — falta el ancla real del control: {ANCHOR}', file=sys.stderr)
        print('NO se emite conteo: sin positivo real no hay prueba.', file=sys.stderr)
        return 2

    gate = load_gate()
    real_text = ANCHOR.read_text(encoding='utf-8')

    print('1. lectura de la cabecera (archivo real del repo)')
    meta = gate.parse_meta(real_text)
    assert_that(meta.get('clase') == 'proceso', 'recupera :clase:')
    assert_that(meta.get('tipo_error') == 'conducta-del-agente', 'recupera :tipo_error:')
    assert_that(meta.get('severidad') == 'ALTA', 'recupera :severidad:')
    assert_that(meta.get('estado') == 'DOCUMENTADO', 'recupera :estado:')
    assert_that('iniciativa' in meta, 'recupera :iniciativa:')

    print('2. el corpus real no tiene defecto')
    real_files = sorted(CORPUS.glob('error-ERR-*.rst'))
    assert_that(len(real_files) >= 3, f'hay corpus que medir ({len(real_files)} archivos)')
    for path in real_files:
        defects = gate.defects_of_file(path, path.read_text(encoding='utf-8'))
        assert_that(defects == [], f'{path.name} sin defecto')

    print('3. el control puede fallar — se muta el archivo REAL, una clave por vez')
    mutations = [
        (':tipo_error: conducta-del-agente', ':tipo_error: violacion-de-proceso',
         'tipo_error', 'tipo fuera del vocabulario cerrado'),
        (':severidad: ALTA', ':severidad: Alta',
         'severidad', 'severidad con grafia libre'),
        (':estado: DOCUMENTADO', ':estado: Detectado',
         'estado', 'estado con grafia libre'),
        (':clase: proceso', ':clase: producto',
         'clase', 'clase producto dentro de errores/'),
    ]
    for old, new, key, label in mutations:
        assert_that(old in real_text, f'la mutacion «{label}» aplica sobre texto real')
        mutated = real_text.replace(old, new, 1)
        defects = gate.defects_of_file(ANCHOR, mutated)
        assert_that(any(key in defect for defect in defects),
                    f'lo detecta y nombra la clave: {label}')

    print('4. coherencia id ↔ nombre de archivo')
    mismatched = real_text.replace('.. _err-021:', '.. _err-022:', 1)
    defects = gate.defects_of_file(ANCHOR, mismatched)
    assert_that(any('etiqueta' in defect for defect in defects),
                'la etiqueta que no coincide con el nombre del archivo')

    print('5. el alcance vacio NO publica cero')
    with tempfile.TemporaryDirectory() as empty:
        proc = subprocess.run(
            [sys.executable, str(GATE), '--root', empty],
            capture_output=True, text=True,
        )
        assert_that(proc.returncode == 2, 'rehusa con exit 2 sobre un arbol sin errores/')
        assert_that('0' not in proc.stdout, 'y no emite ningun conteo por stdout')

    print('6. el gate publica su denominador sobre el corpus real')
    proc = subprocess.run(
        [sys.executable, str(GATE), '--root', str(ROOT)],
        capture_output=True, text=True,
    )
    assert_that(proc.returncode == 0, 'sale 0 sobre el corpus real')
    assert_that('alcance medido' in proc.stdout, 'declara su alcance medido')

    print('7. el error escrito FUERA del hogar se ve')
    with tempfile.TemporaryDirectory() as tmp:
        tree = pathlib.Path(tmp)
        home = tree / 'source/gestion/pm/docs/iniciativas/catalogar-y-registrar-errores/errores'
        home.mkdir(parents=True)
        shutil.copy(ANCHOR, home / ANCHOR.name)
        (home / 'index.rst').write_text(
            f'.. toctree::\n\n   {ANCHOR.stem}\n', encoding='utf-8')
        proc = subprocess.run(
            [sys.executable, str(GATE), '--root', str(tree)],
            capture_output=True, text=True)
        assert_that(proc.returncode == 0 and 'OK: 0' in proc.stdout,
                    'el arbol de control, con el archivo REAL en su hogar, pasa')

        # el mismo archivo real, movido un nivel arriba: fuera de errores/
        extraviado = home.parent / ANCHOR.name
        shutil.move(str(home / ANCHOR.name), str(extraviado))
        (home / 'index.rst').write_text('.. toctree::\n', encoding='utf-8')
        proc = subprocess.run(
            [sys.executable, str(GATE), '--root', str(tree), '--strict'],
            capture_output=True, text=True)
        assert_that(proc.returncode == 1, 'con el archivo fuera del hogar, exit 1')
        assert_that('fuera de errores/' in proc.stdout,
                    'y nombra el motivo: fuera de errores/')

    print('8. el indice que no resuelve contra el hogar se ve')
    with tempfile.TemporaryDirectory() as tmp:
        tree = pathlib.Path(tmp)
        home = tree / 'source/gestion/pm/docs/iniciativas/catalogar-y-registrar-errores/errores'
        home.mkdir(parents=True)
        shutil.copy(ANCHOR, home / ANCHOR.name)

        # (a) archivo presente, sin fila en el indice — la brecha 17-vs-21 de iact-docs
        (home / 'index.rst').write_text('.. toctree::\n', encoding='utf-8')
        proc = subprocess.run(
            [sys.executable, str(GATE), '--root', str(tree), '--strict'],
            capture_output=True, text=True)
        assert_that(proc.returncode == 1, 'archivo sin fila en el indice → exit 1')
        assert_that('sin entrada en index.rst' in proc.stdout,
                    'y nombra el motivo: sin entrada en index.rst')

        # (b) fila en el indice, sin archivo — la otra direccion del mismo desacuerdo
        (home / 'index.rst').write_text(
            f'.. toctree::\n\n   {ANCHOR.stem}\n   error-ERR-999-que-no-existe\n',
            encoding='utf-8')
        proc = subprocess.run(
            [sys.executable, str(GATE), '--root', str(tree), '--strict'],
            capture_output=True, text=True)
        assert_that(proc.returncode == 1, 'fila sin archivo → exit 1')
        assert_that('sin archivo' in proc.stdout, 'y nombra el motivo: sin archivo')

    print()
    if failures:
        print(f'FALLA: {len(failures)} aserción(es) — {", ".join(failures)}')
        return 1
    print('OK: todas las aserciones pasan')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
