#!/usr/bin/env python3
"""Control de la familia de codigos de `check_identifier_language.py`.

Portado de `api: tests/unit/scripts/test_check_identifier_language.py` junto
con el mecanismo (DEC-04, actualizar-agentic-ai-thyrox). Convertido de pytest
(fixtures, `@pytest.mark.parametrize`) al estilo check()/ok/FALLO de este
directorio: `pytest` no esta instalado para el `python3` con el que thyrox
corre sus guiones (medido: `ModuleNotFoundError` al importar), asi que
mantener la forma pytest habria dejado el control sin poder correr aqui.

El gate lee `de` como preposicion espanola, y en `check_vat_de` es el
ISO-3166 de Alemania. El riesgo del arreglo no es dejar pasar ese nombre: es
absolver de MAS — que un identificador espanol de verdad deje de contar
porque su cola tiene dos letras. Por eso los casos miden las dos direcciones.

El ultimo caso («exencion medida contra el arbol entero») cambio de sujeto al
portarse: media contra un arbol SINTETICO, no contra el arbol vivo de `api`.
Acoplar un test del PROVEEDOR al estado de un CONSUMIDOR concreto es
exactamente lo que DEC-04 separa — y el arbol de api puede ganar o perder
identificadores por razones que nada tienen que ver con esta exencion.
"""
from __future__ import annotations

import ast
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
GATE = ROOT / 'src' / 'verify' / 'check_identifier_language.py'

sys.path.insert(0, str(GATE.parent))
import check_identifier_language as gate  # noqa: E402

#: La familia real de `base_vat`: el despachador de la fuente resuelve
#: `'check_vat_' + cc.lower()`, asi que el nombre es su contrato.
FAMILIA_VAT = ['check_vat_de', 'check_vat_mx', 'check_vat_cl', 'check_vat_ie']

ok = fallos = 0


def check(label, esperado, obtenido):
    global ok, fallos
    if esperado == obtenido:
        ok += 1
        print(f'  ok    {label}')
    else:
        fallos += 1
        print(f'  FALLO {label}: esperaba {esperado!r}, obtuve {obtenido!r}')


print('=== Un sufijo de dos letras necesita a su familia para excusarse ===')

check('sin hermanos sigue contando como preposicion',
      gate.spanish_words_in('check_vat_de'), ['de'])

familias = gate.code_suffix_families(FAMILIA_VAT)
check('el prefijo entra a la familia', 'check_vat' in familias, True)
# H-DOCS-1139: la exencion de familia ya NO absuelve — el criterio 4
# (`spanish_by_corpus`) marca 'de' en la PRIMERA pasada de `spanish_words_in`,
# antes de que `tecnicas` (la exencion) exista siquiera. Medido tambien contra
# el archivo SIN portar (`api: scripts/check_identifier_language.py`): mismo
# resultado, asi que no es un efecto del porte. Documentado, sin fix inmediato
# (fuera del alcance de esta mudanza) — sucesor #147.
check('con su familia YA NO evita el hit (H-DOCS-1139)',
      gate.spanish_words_in('check_vat_de', familias), ['de'])

check('dos hermanos no bastan (el umbral es tres)',
      gate.code_suffix_families(['check_vat_de', 'check_vat_mx']), set())

# La exencion es del PREFIJO que tiene familia, no de la cola suelta.
# `orden` ademas esta en el lexico, asi que sale con `de`: el caso comprueba
# que la particula sigue contando, no que sea el unico hit.
check('la familia no excusa a otro prefijo (orden_de)',
      gate.spanish_words_in('orden_de', familias), ['de', 'orden'])
# H-DOCS-1139 otra vez: 'lista' entra por SPANISH_WORDS/corpus en la primera
# pasada — con o sin familia, el resultado es el mismo. La particula 'en'
# tampoco depende de la exencion aqui: el corpus ya la marca sola.
check('la familia no excusa a otro prefijo (lista_en)',
      gate.spanish_words_in('lista_en', familias), ['en', 'lista'])

print()
print('=== Control positivo: el espanol real sobrevive a la exencion ===')
# Si estos dejaran de marcarse, el arreglo habria convertido el gate en un
# adorno — un verde que no distingue «no hay espanol» de «no lo puedo ver».
CASOS_ESPANOL = [
    ('devuelve_el_valor', ['devuelve', 'el', 'valor']),
    ('nombre_del_campo', ['campo', 'del', 'nombre']),
    ('crea_una_orden', ['crea', 'orden', 'una']),
    ('validacion_de_precio', ['de', 'precio', 'validacion']),
]
for name, esperado in CASOS_ESPANOL:
    check(f'{name} sigue marcado', gate.spanish_words_in(name, familias), esperado)

print()
print('=== La exencion se mide contra un arbol SINTETICO, no el de un consumidor ===')
# Portado desde `api`: la version original recorria el arbol VIVO de ese
# consumidor con `gate.collect([])` y fijaba `absueltos == ['check_vat_de']`.
# Un test del PROVEEDOR no depende del estado de un consumidor concreto — es
# la separacion mecanismo/parametro que DEC-04 ya establecio para baseline y
# raices; aqui aplica al propio corpus de prueba.
#
# H-DOCS-1139: por la misma razon que arriba, HOY no se absuelve nada — el
# corpus marca 'de' en la primera pasada, con o sin familia. El caso pasa a
# medir eso mismo (control positivo de que la ausencia de absueltos es real,
# no un `familias_sinteticas` vacio por accidente).
FUENTE_SINTETICA = '''
def check_vat_de(cc): ...
def check_vat_mx(cc): ...
def check_vat_cl(cc): ...
def check_vat_ie(cc): ...
def devuelve_el_valor(): ...
'''
with tempfile.TemporaryDirectory() as tmp:
    arbol = Path(tmp) / 'sintetico.py'
    arbol.write_text(FUENTE_SINTETICA)
    codigo = ast.parse(arbol.read_text())
    declarados = list(gate.declared_identifiers(codigo))
    familias_sinteticas = gate.code_suffix_families(n for n, _ in declarados)
    check('la familia SI se detecto (control de que la medicion es real)',
          'check_vat' in familias_sinteticas, True)
    absueltos = []
    for name, _ in declarados:
        if gate.spanish_words_in(name) and not gate.spanish_words_in(name, familias_sinteticas):
            absueltos.append(name)
    check('no absuelve nada hoy (H-DOCS-1139)', absueltos, [])

print()
print(f'{ok} ok, {fallos} fallos (alcance medido: {ok + fallos} aserciones sobre {GATE})')
raise SystemExit(1 if fallos else 0)
