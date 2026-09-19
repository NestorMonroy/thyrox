#!/usr/bin/env python3
"""El delimitador devolvia un registro que NO contiene su ancla.

Mitad ROJA. `bloque_balanceado` promete en su docstring «el bloque `abre…cierra`
balanceado que CONTIENE al ancla», y declara que rehusar es lo correcto: «un
recorte al tope se leeria como un catalogo completo y publicaria un conteo
falso». Medido sobre el corpus de 2.1.266, no cumple esa promesa en una forma
concreta.

El retroceso hasta la llave que abre el registro acepta la llave cuyo caracter
previo esta en `=(,[` — la forma de una asignacion, una llamada o un elemento
de lista. `return{…}` no esta en ese conjunto, asi que sigue retrocediendo y
aterriza en el registro ANTERIOR del texto. Y entonces no rehusa: devuelve ese
registro, que es peor que no devolver nada.

Medido con las cuatro anclas de esta sesion: tres devuelven un bloque que
contiene su ancla y una —`input_tokens:n.input_tokens!==null`, dentro de un
`return{…}`— devuelve 1093 bytes del objeto de telemetria vecino.

El arreglo NO es enseñarle la forma `return{`: eso ampliaria la heuristica de
retroceso a una forma mas y dejaria las siguientes igual de mudas. Es la
POSTCONDICION que su propio docstring ya promete — si el bloque delimitado no
contiene el ancla, no es el bloque del ancla, venga de la forma que venga.

*Metrica:* para cada ancla, si `bloque_balanceado` devuelve `None` o un bloque,
y si ese bloque contiene el ancla.
*Ciega a:* si el bloque devuelto es el registro SEMANTICAMENTE correcto cuando
si contiene el ancla — un registro anidado que lo contenga pasaria igual. La
postcondicion acota el falso positivo, no lo cierra.

CONTROL DE ANULACION: retirada la postcondicion, cae el caso 2 —y solo ese—.
Los casos 1 y 3 sobreviven, porque las anclas que ya funcionaban siguen
funcionando: sin el caso 2, el verde no distinguiria «rehusa cuando no es su
registro» de «delimita las tres formas de siempre».
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

def _thyrox_root() -> Path:
    """La raiz por MARCADOR, no por `parents[N]`.

    `parents[N]` cuenta niveles del arbol de ORIGEN: al mover el archivo, el
    indice sigue resolviendo y apunta a otro sitio — falla en silencio. Este
    arbol lo prohibe y lo barrio (`bin/check_path_arithmetic`). El marcador es
    el mismo que `reach.THYROX_MARKER` declara; se repite aqui, y solo aqui,
    porque este es el arranque: no se puede importar `reach` sin localizarlo.
    """
    here = Path(__file__).resolve()
    marker = Path("src") / "paths" / "reach.py"
    for level in (here.parent, *here.parents):
        if (level / marker).is_file():
            return level
    raise RuntimeError(f"no se encontro la raiz de thyrox ascendiendo desde {here}")


HERE = _thyrox_root()

_spec = importlib.util.spec_from_file_location(
    "extract_model_registry",
    HERE / "src" / "packages" / "agent" / "bin" / "extract_model_registry.py")
_extractor = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_extractor)
block_balanced = _extractor.bloque_balanceado

OK = FAILED = 0


def check(label, expected, obtained):
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected!r}] obtenido=[{obtained!r}]")
        FAILED += 1


#: Sonda minima con las DOS formas. El registro de `return{` va SEGUNDO para
#: que el retroceso tenga un registro anterior al que aterrizar: con el primero
#: el fallo no se reproduce, y un caso que no reproduce no mide nada.
PROBE = (
    'var primero={alfa:1,beta:{anidado:2},gamma:"tres"};'
    'function suma(e,n){if(!n)return{...e};'
    'return{izquierda:n.izquierda!==null?n.izquierda:e.izquierda,derecha:0}}'
)

print("== 1. la forma de asignacion: delimita y contiene su ancla ==")
block = block_balanced(PROBE, "beta:{anidado")
check("devuelve un bloque", True, block is not None)
check("y contiene el ancla", True, block is not None and "beta:{anidado" in block)
check("es el registro de la asignacion, no el archivo entero",
      'var primero=' not in (block or ""), True)

print("== 2. la forma `return{`: REHUSA en vez de devolver el vecino ==")
# El ancla vive dentro de un `return{…}`, que el retroceso no reconoce. Antes
# de la postcondicion devolvia `{alfa:1,…}` — el registro anterior del texto.
neighbor = block_balanced(PROBE, "izquierda:n.izquierda!==null")
check("rehusa", None, neighbor)

print("== 3. el ancla ausente sigue rehusando (no se rompio lo que ya iba) ==")
check("ancla inexistente", None, block_balanced(PROBE, "no-esta-en-el-texto"))
check("bloque que no cierra", None, block_balanced("{alfa:1,beta:", "beta:"))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
