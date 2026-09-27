#!/usr/bin/env python3
"""Control del idioma de los identificadores en TypeScript.

El gate medía sólo `.py`: los identificadores de `src/packages/**.ts` —la
mayor parte del código del proveedor— no tenían instrumento. El recorrido
del AST de TypeScript lo hace `src/verify/ts_declared_identifiers.ts` con el
compilador del propio árbol; el léxico es el mismo del gate, sin copia.

Qué haría fallar a este control:
- que un nombre declarado en español (función, parámetro, clase, variable,
  interfaz, miembro de enum, propiedad) no se reportara;
- que se reportara lo que no es un nombre declarado: un comentario, una
  cadena, o el uso de un nombre ajeno importado;
- que un identificador congelado en el baseline se volviera a reportar;
- que un `.ts` que no se pudo recorrer se contara como medido.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
GATE = Path(os.environ.get('IDENTIFIER_GATE_MODULE') or ROOT / 'src' / 'verify' / 'check_identifier_language.py')

ok = fails = 0


def check(label, expected, obtained):
    global ok, fails
    if expected == obtained:
        ok += 1
        print(f'  ok    {label}')
    else:
        fails += 1
        print(f'  FALLO {label}: esperaba {expected!r}, obtuve {obtained!r}')


def run(root: Path, *paths: str) -> tuple[int, str]:
    env = {k: v for k, v in os.environ.items() if k not in ('IDENTIFIER_LANGUAGE_ROOTS', 'THYROX_ENV_FILE')}
    env['IDENTIFIER_LANGUAGE_BASELINE'] = str(root / 'baseline.txt')
    env['PYTHONPATH'] = str(ROOT / 'src')
    env.setdefault('THYROX_TS_IDENTIFIER_EXTRACTOR', str(ROOT / 'src' / 'verify' / 'ts_declared_identifiers.ts'))
    done = subprocess.run([sys.executable, str(GATE), *paths], cwd=root, env=env,
                          capture_output=True, text=True, timeout=120)
    return done.returncode, done.stdout + done.stderr


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / 'baseline.txt').write_text('')
    (root / 'pago.ts').write_text('\n'.join([
        "import { esperarTrabajo } from './ajeno'",
        '// verificar el pago antes de cerrar',
        'export function verificarPago(montoTotal: number): string {',
        "  const label = 'nombreCliente'",
        '  return label + esperarTrabajo()',
        '}',
        'export class Tablero {}',
        'export interface Receipt { campoNuevo: string }',
        'export enum State { Activo }',
        'export const summary = { hallazgo: 1 }',
        'export function verify(amount: number): number { return amount }',
        'export class ConflictResolver { userInvocable = true; closeParen = 0 }',
        'export function fisherYatesShuffle(scaleCoord: number, sendToUdsSocket: boolean) {}',
        '',
    ]))
    code, out = run(root, 'pago.ts')
    check('un .ts con nombres en español sale 1', 1, code)
    for name in ('verificarPago', 'montoTotal', 'Tablero', 'campoNuevo', 'Activo', 'hallazgo'):
        check(f'reporta {name}', True, f'  {name}   →' in out)
    check('la línea es la de la declaración', True, 'pago.ts:3  verificarPago' in out)
    check('no reporta un comentario', False, '  verificar   →' in out)
    check('no reporta una cadena', False, 'nombreCliente' in out)
    check('no reporta el uso de un nombre importado', False, 'esperarTrabajo' in out)
    check('no reporta los nombres en inglés', False, '  verify   →' in out or '  amount   →' in out)
    # Palabras inglesas de programación que el corpus español también atestigua.
    for name in ('ConflictResolver', 'userInvocable', 'closeParen',
                 'fisherYatesShuffle', 'scaleCoord', 'sendToUdsSocket'):
        check(f'no reporta {name}, que es inglés', False, f'  {name}   →' in out)

    (root / 'baseline.txt').write_text('\n'.join(
        f'pago.ts::{n}' for n in ('verificarPago', 'montoTotal', 'Tablero', 'campoNuevo', 'Activo', 'hallazgo')) + '\n')
    code, out = run(root, 'pago.ts')
    check('congelados en el baseline, sale 0', 0, code)
    check('y cuenta el .ts como medido', True, '(1 archivos medidos' in out)

    (root / 'roto.ts').write_text('export function (\n')
    code, out = run(root, 'roto.ts')
    check('un .ts que no se pudo recorrer no se cuenta como medido', True, '(0 archivos medidos' in out)

    # THYROX_TS_IDENTIFIER_EXTRACTOR: sin recorrido no hay medición, y no se publica un cero.
    saved = os.environ.get('THYROX_TS_IDENTIFIER_EXTRACTOR')
    os.environ['THYROX_TS_IDENTIFIER_EXTRACTOR'] = str(root / 'no-such-extractor.ts')
    try:
        code, out = run(root, 'pago.ts')
    finally:
        if saved is None:
            os.environ.pop('THYROX_TS_IDENTIFIER_EXTRACTOR')
        else:
            os.environ['THYROX_TS_IDENTIFIER_EXTRACTOR'] = saved
    check('sin el recorrido de TypeScript rehúsa con exit 2', 2, code)
    check('y no publica un conteo', False, 'archivos medidos' in out)

print(f'test_identifier_language_typescript: {ok + fails} aserciones — {ok} ok, {fails} falla(s)')
sys.exit(1 if fails else 0)
