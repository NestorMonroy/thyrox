#!/usr/bin/env python3
"""Control del idioma de los identificadores declarados en shell.

El gate medía `.py` y `.ts`; un `.sh` no lo medía nadie. La extracción la
hace `src/verify/shell_declared_identifiers.py` y el léxico es el del gate,
sin copia.

Qué haría fallar a este control:
- que una forma de declaración (asignación, `local`, `export`, `readonly`,
  `declare`/`typeset`, función, `for`, `read`) no se extrajera;
- que se extrajera lo que no declara nada: un comentario, una cadena, el
  cuerpo de un heredoc o un argumento `clave=valor` de otro comando;
- que la línea reportada no fuera la de la declaración;
- que el gate no midiera un `.sh`, o un archivo sin extensión con shebang de
  shell bajo sus raíces;
- que el pre-commit no le pasara los `.sh` staged, o que el baseline del
  árbol dejara fuera una deuda de shell o perdiera una de Python o TypeScript.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src'))
from verify import shell_declared_identifiers as shell  # noqa: E402

GATE = ROOT / 'src' / 'verify' / 'check_identifier_language.py'
BASELINE = ROOT / '.claude' / 'baselines' / 'identifier_language_baseline.txt'
PRE_COMMIT = ROOT / '.githooks' / 'pre-commit'
HEADLESS_POOL = 'src/session/headless-pool.sh'
HEADLESS_POOL_TEST = 'tests/session/test-headless-pool.sh'

passed = failed = 0


def check(label, expected, obtained):
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f'  ok    {label}')
    else:
        failed += 1
        print(f'  FALLO {label}: esperaba {expected!r}, obtuve {obtained!r}')


def names(text):
    return [name for name, _ in shell.shell_declared_identifiers(text)]


def run_gate(cwd: Path, baseline: Path, *paths: str, roots: str | None = None) -> tuple[int, str]:
    env = {k: v for k, v in os.environ.items()
           if k not in ('IDENTIFIER_LANGUAGE_ROOTS', 'THYROX_ENV_FILE')}
    env['IDENTIFIER_LANGUAGE_BASELINE'] = str(baseline)
    env['THYROX_ENV_FILE'] = str(cwd / '.env.absent')
    env['PYTHONPATH'] = str(ROOT / 'src')
    if roots is not None:
        env['IDENTIFIER_LANGUAGE_ROOTS'] = roots
    done = subprocess.run([sys.executable, str(GATE), *paths], cwd=cwd, env=env,
                          capture_output=True, text=True, timeout=300)
    return done.returncode, done.stdout + done.stderr


def test_assignment_forms():
    print('=== formas de declaración ===')
    source = '\n'.join([
        'SALIDA=1',
        'local raiz=/x otro',
        'export ESPERADO="a b"',
        'readonly FALLOS=0',
        'declare -A mapa=()',
        'typeset -ri cuenta',
        'veredicto_de() {',
        'function afirmar {',
        'for elemento in a b; do',
        'while read -r primero segundo; do :; done',
        'read -a lista -p pregunta respuesta',
        'LC_ALL=C prefijo=1 sort',
        'true && tras_and=1; tras_punto=2',
        'if x; then tras_then=1; fi',
        'arr+=(nuevo)',
        'indice[3]=valor',
    ])
    got = names(source)
    for expected in ('SALIDA', 'raiz', 'otro', 'ESPERADO', 'FALLOS', 'mapa', 'cuenta',
                     'veredicto_de', 'afirmar', 'elemento', 'primero', 'segundo',
                     'lista', 'respuesta', 'LC_ALL', 'prefijo', 'tras_and', 'tras_punto',
                     'tras_then', 'arr', 'indice'):
        check(f'extrae {expected}', True, expected in got)
    check('no extrae el argumento de -p', False, 'pregunta' in got)
    check('no extrae el comando tras las asignaciones', False, 'sort' in got)


def test_not_declarations():
    print('=== lo que NO declara nada ===')
    source = '\n'.join([
        '# comentario=1 y resultado',
        'echo "cadena=1" \'otra=2\'  # cola=3',
        'make valor=1',
        'echo fin  # ; tras_comentario=1',
        'echo ${#lista} $((a+2))',
        'cat > out <<\'EOF\'',
        'cuerpo=1',
        'read -r del_heredoc',
        'EOF',
        'tras_heredoc=1',
        'printf "%s\\n" "multilinea',
        'dentro=1"',
        'fin=1',
    ])
    got = shell.shell_declared_identifiers(source)
    listed = [name for name, _ in got]
    for absent in ('comentario', 'resultado', 'cadena', 'otra', 'cola', 'valor', 'tras_comentario',
                   'cuerpo', 'del_heredoc', 'dentro'):
        check(f'no extrae {absent}', False, absent in listed)
    check('la línea tras el heredoc es la suya', ('tras_heredoc', 10) in got, True)
    check('la línea tras una cadena multilínea es la suya', ('fin', 13) in got, True)


def test_heredoc_marker_in_comment():
    print('=== un <<MARCA en un comentario no abre heredoc ===')
    source = '\n'.join([
        "# se escribe con un heredoc `<<'EOF'`, que no interpreta",
        '    # <<< item-root',
        'despues=1',
    ])
    check('extrae lo que sigue al comentario', [('despues', 3)],
          shell.shell_declared_identifiers(source))


def test_shell_script_detection():
    print('=== qué archivo es shell ===')
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        cases = {
            'a.sh': ('echo', True),
            'wrapper': ('#!/usr/bin/env bash\necho', True),
            'plain': ('#!/bin/sh\necho', True),
            'tool': ('#!/usr/bin/env python3\n', False),
            'notes': ('texto', False),
        }
        for name, (text, expected) in cases.items():
            (base / name).write_text(text)
            check(f'{name} es shell: {expected}', expected, shell.is_shell_script(base / name))


def test_gate_on_real_cases():
    print('=== el gate sobre casos reales del árbol ===')
    with tempfile.TemporaryDirectory() as tmp:
        empty = Path(tmp) / 'baseline.txt'
        empty.write_text('')
        code, out = run_gate(ROOT, empty, HEADLESS_POOL_TEST, HEADLESS_POOL)
        check('con baseline vacío sale 1', 1, code)
        check('reporta SALIDA de test-headless-pool.sh', True, '  SALIDA   →' in out)
        check('reporta rehusa de headless-pool.sh', True, '  rehusa   →' in out)
        declaration_line = next(number for number, line in enumerate((ROOT / HEADLESS_POOL).read_text().splitlines(), 1)
                                if line.startswith('rehusa()'))
        check('en la línea de su declaración', True, f'{HEADLESS_POOL}:{declaration_line}  rehusa' in out)
        check('mide los dos .sh', True, 'Medido: 2 archivos' in out)


def test_gate_roots_and_baseline():
    print('=== raíces, shebang y baseline ===')
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        (base / 'src').mkdir()
        (base / 'src' / 'job.sh').write_text('RAIZ=1\n# fallos=2\n')
        (base / 'src' / 'wrapper').write_text('#!/usr/bin/env bash\nesperado=1\n')
        (base / 'src' / 'clean.py').write_text('value = 1\n')
        baseline = base / 'baseline.txt'
        baseline.write_text('')
        code, out = run_gate(base, baseline, roots='src')
        check('recorriendo raíces sale 1', 1, code)
        check('reporta el .sh', True, 'src/job.sh:1  RAIZ' in out)
        check('reporta el archivo con shebang bash', True, 'src/wrapper:2  esperado' in out)
        check('no reporta el comentario', False, 'fallos' in out)
        baseline.write_text('src/job.sh::RAIZ\nsrc/wrapper::esperado\n')
        code, out = run_gate(base, baseline, roots='src')
        check('congelados en el baseline, sale 0', 0, code)
        check('y cuenta los tres archivos', True, '(3 archivos medidos' in out)


def test_pre_commit_passes_shell():
    print('=== el pre-commit pasa los .sh staged ===')
    text = PRE_COMMIT.read_text()
    block = text[text.index('IDENTIFIERS=()'):text.index('check_identifier_language"')]
    for pattern in ('src/*.sh', 'tests/*.sh', 'bin/*.sh'):
        check(f'el bloque del gate incluye {pattern}', True, pattern in block)


def test_repository_baseline():
    print('=== el baseline del árbol ===')
    current = set(BASELINE.read_text().splitlines())
    head = subprocess.run(['git', 'show', f'HEAD:{BASELINE.relative_to(ROOT)}'], cwd=ROOT,
                          capture_output=True, text=True, check=True).stdout.splitlines()
    lost = [line for line in head if line not in current]
    check('no pierde ninguna entrada previa', [], lost)
    check('congela SALIDA', True, f'{HEADLESS_POOL_TEST}::SALIDA' in current)
    check('congela rehusa', True, f'{HEADLESS_POOL}::rehusa' in current)
    shell_files = subprocess.run(['git', 'ls-files', '--', 'src/*.sh', 'tests/*.sh'], cwd=ROOT,
                                 capture_output=True, text=True, check=True).stdout.split()
    code, out = run_gate(ROOT, BASELINE, *shell_files)
    check('los .sh del árbol no tienen deuda fuera del baseline', 0, code)


def main():
    test_assignment_forms()
    test_not_declarations()
    test_heredoc_marker_in_comment()
    test_shell_script_detection()
    test_gate_on_real_cases()
    test_gate_roots_and_baseline()
    test_pre_commit_passes_shell()
    test_repository_baseline()
    print(f'test_identifier_language_shell: {passed + failed} aserciones — '
          f'{passed} ok, {failed} falla(s)')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
