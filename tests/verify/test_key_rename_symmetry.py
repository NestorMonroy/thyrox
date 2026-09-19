#!/usr/bin/env python3
"""Suite de ``verify.check_key_rename_symmetry`` — la mitad ROJA, antes del gate.

El defecto que cierra (:ref:`h-thyrox-136`): un renombre por POSICION DE TOKEN
alcanzo la lectura de una clave dentro de una f-string —`r['huerfano']` ->
`r['orphan']`— y no la clave del dict literal, que es un `STRING` fuera de
f-string. El archivo parsea, la poscondicion AST del aplicador pasa, y la rama
muere con `KeyError` **solo al ejecutarse**.

El eje que discrimina NO es «lee una clave que este archivo no declara»: eso es
lo normal —se lee el dict que devuelve otro modulo— y esa primera version
publico 103 sospechosos sobre 103 archivos, todos falsos. El eje es la
**asimetria contra una version anterior**: una clave que cambio como subscript
y no como clave de dict literal, o al reves.

Los cuatro controles, y por que hacen falta los cuatro:

1. **Positivo** — el estado exacto del episodio: la lectura viajo, la clave no.
2. **El gemelo** — el mismo renombre hecho en los DOS lados no dispara. Sin
   este caso, el positivo no separa «vio la asimetria» de «marca todo cambio».
3. **La lectura ajena** — leer una clave que ningun dict local declara es el
   caso corriente y NO dispara. Es el falso positivo que hundio a la primera
   version del instrumento.
4. **Anulacion** — comparando el archivo consigo mismo en vez de con su version
   anterior, el positivo deja de verse: la version anterior es lo que carga el
   peso, no el AST.
"""
from __future__ import annotations

import pathlib
import sys

_HERE = pathlib.Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))

from verify import check_key_rename_symmetry as gate  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLA {label}\n        esperado=[{expected}] obtenido=[{obtained}]")


#: El episodio, reducido a su forma minima. La clave se queda en español y la
#: lectura viaja al ingles — que es lo que el reescritor de f-string produjo.
BEFORE = '''
def census(conn):
    return {"huerfano": count(conn), "total": 1}

def report(r):
    if r["huerfano"]:
        print(f"hay {r['huerfano']}")
'''

AFTER_BROKEN = '''
def census(conn):
    return {"huerfano": count(conn), "total": 1}

def report(r):
    if r["orphan"]:
        print(f"hay {r['orphan']}")
'''

AFTER_COHERENT = '''
def census(conn):
    return {"orphan": count(conn), "total": 1}

def report(r):
    if r["orphan"]:
        print(f"hay {r['orphan']}")
'''

print("== 1. POSITIVO — la lectura viajo y la clave no ==")
found = gate.asymmetries(BEFORE, AFTER_BROKEN)
check("lo ve", True, len(found) > 0)
check("y nombra la clave del episodio", True,
      any("huerfano" in f.key or "orphan" in f.key for f in found))

print()
print("== 2. EL GEMELO — renombrado en los dos lados, no dispara ==")
check("el renombre coherente pasa", [], gate.asymmetries(BEFORE, AFTER_COHERENT))

print()
print("== 3. La lectura AJENA es el caso corriente, y no dispara ==")
# Leer el dict que devuelve otro modulo: ningun dict local declara la clave.
# Es lo que hundio a la primera version del instrumento —103 de 103 falsos.
foreign = 'def f(d):\n    return d["hooks"], d["command"]\n'
check("leer una clave de otro modulo no es asimetria", [],
      gate.asymmetries(foreign, foreign))
grew = 'def f(d):\n    return d["hooks"], d["command"], d["extra"]\n'
check("y añadir otra lectura ajena tampoco", [], gate.asymmetries(foreign, grew))

print()
print("== 3-bis. El renombre CROSS-FILE coherente no dispara ==")
# El productor renombra su clave y el test lo sigue. La clave vive en OTRO
# archivo, asi que aqui solo se ve una lectura nueva — y marcarla fue el falso
# positivo que retiro la tercera regla al estrenar el gate contra el arbol.
consumer_before = 'D = {"otra": 1}\ndef f(r):\n    return r["filas_en_el_origen"], D\n'
consumer_after = 'D = {"otra": 1}\ndef f(r):\n    return r["rows_in_source"], D\n'
check("seguir al productor no es asimetria local", [],
      gate.asymmetries(consumer_before, consumer_after))

print()
print("== 4. ANULACION — sin la version anterior, el positivo no se ve ==")
# Comparar el archivo roto consigo mismo: el AST es el mismo y la asimetria
# desaparece. Lo que carga el peso es la version anterior, no el recorrido.
check("el positivo cae a 0", [], gate.asymmetries(AFTER_BROKEN, AFTER_BROKEN))

print()
print("== 5. Un archivo que no parsea se DECLARA, no se salta en silencio ==")
broken = gate.asymmetries(BEFORE, "def f(:\n")
check("rehusa nombrando el fallo", True,
      bool(broken) and broken[0].kind == gate.Kind.UNPARSEABLE)

print()
print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
