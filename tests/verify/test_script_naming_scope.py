#!/usr/bin/env python3
"""El gate mide un arbol y consulta el descuento sin decirle cual.

`is_measurement_artifact` resuelve el hogar del banco de evidencia por la raiz
que se le pasa. Los tres sitios que lo llaman en `check_script_naming.py` lo
llamaban SIN raiz, asi que desde el proveedor —o desde cualquier cwd que no
fuera el arbol medido— el descuento resolvia el hogar equivocado y devolvia
False para el banco entero del consumidor.

Coste medido antes de cerrarlo: de los 245 archivos congelados en el baseline
de identificadores de `kaupamex-docs`, **241 son `.claude/eventos/**`** — el
corpus de bancos de evidencia. Renombrar un identificador dentro de un banco
reescribe evidencia fechada; el defecto no era la deuda, era la POBLACION.

El caso que DISCRIMINA es el 2: sin la raiz el descuento no ve el banco, y el
gate mide como producto lo que es evidencia de un episodio.
"""
from __future__ import annotations

import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / 'src'))

from paths.reach import root as clone_root  # noqa: E402
from workbench.paths import is_measurement_artifact  # noqa: E402

sys.path.insert(0, str(ROOT / 'src' / 'verify'))
import check_script_naming as gate  # noqa: E402

#: Un consumidor REAL con banco declarado, no uno fabricado: quien fabrica el
#: sujeto hereda su propio encuadre y el control confirma lo que ya creia.
#:
#: La ruta NO se teclea: la resuelve el mecanismo de alcance del propio arbol.
#: Un literal aqui acoplaria un test del PROVEEDOR a la ubicacion de un
#: consumidor concreto, que es lo que DEC-04 separa.
CONSUMER = clone_root('docs')
BANK_FILE = (CONSUMER / '.claude' / 'eventos'
             / 'acl-como-puerta-20260827T194322' / 'sondas'
             / 'mapear_csv_de_la_referencia.py')

if not BANK_FILE.is_file():
    print(f'OMITIDO — el sujeto no es alcanzable: {BANK_FILE}\n'
          '  El control mide el descuento del banco de un consumidor real; sin\n'
          '  ese consumidor no hay poblacion, y un verde aqui seria un verde\n'
          '  que no discrimina.')
    raise SystemExit(0)

passed = failed = 0


def check(label, got, want):
    global passed, failed
    if got == want:
        print(f'  OK   {label}'); passed += 1
    else:
        print(f'  FAIL {label}: {got!r} != {want!r}'); failed += 1


print('=== Caso 1: el sujeto existe y esta bajo el banco declarado ===')
check('el archivo del banco existe', BANK_FILE.is_file(), True)

print('=== Caso 2 (EL QUE DISCRIMINA): el descuento necesita la raiz medida ===')
check('con la raiz, el banco se descuenta',
      is_measurement_artifact(BANK_FILE, CONSUMER), True)

print('=== Caso 3: los tres recorridos del gate pasan la raiz ===')
# Se mide la CONDUCTA, no el literal: se recorre el arbol del consumidor y se
# comprueba que ningun archivo del banco entra en el total medido. Un grep del
# argumento mediria el significante; esto mide si el gate ve o no ve el banco.
naming_offenders, naming_total = gate.scan_idioma(CONSUMER)
separator_offenders, separator_total = gate.scan(CONSUMER)
identifier_offenders, identifier_total = gate.scan_identifiers(CONSUMER)

for label, offenders in (('idioma', naming_offenders),
                         ('separador', [(str(p), None) for p in separator_offenders]),
                         ('identificadores', identifier_offenders)):
    from_bank = sorted({str(x[0]) for x in offenders
                        if '.claude/eventos/' in str(x[0])})
    if from_bank:
        print(f'       {len(from_bank)} archivo(s) del banco, p.ej. {from_bank[0]}')
    check(f'el eje de {label} no reporta el banco', len(from_bank), 0)

print('=== Caso 4: el descuento no apaga el eje — sigue midiendo producto ===')
# Si el arreglo se implementara como «descontar de mas», los tres totales
# caerian a cero y el gate quedaria muerto sin que nada lo dijera.
check('el eje de idioma sigue midiendo archivos', naming_total > 0, True)
check('el eje de separador sigue midiendo archivos', separator_total > 0, True)
check('el eje de identificadores sigue midiendo archivos', identifier_total > 0, True)

print()
print(f'{passed} ok, {failed} fallos (alcance medido: {passed + failed} aserciones '
      f'sobre {gate.__file__})')
raise SystemExit(1 if failed else 0)
