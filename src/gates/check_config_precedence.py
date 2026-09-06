#!/usr/bin/env python3
"""Deriva la precedencia de configuracion recorriendo RAMAS, no lineas.

El defecto que existe
---------------------

Un modulo lee N fuentes de configuracion y luego elige entre ellas con una
cadena ``if``/``elif``. **El orden en que las lee no es el orden en que las
aplica**, y un lector humano —o un porte— copia el primero porque es el que
esta arriba.

Medido en la referencia (`litellm/proxy/proxy_server.py`), que es el control
positivo de la suite y NO un caso fabricado:

    :1080  worker_config    = get_secret("WORKER_CONFIG")        <- se lee 1o
    :1081  env_config_yaml  = get_secret_str("CONFIG_FILE_PATH") <- se lee 2o
    :1084  if   env_config_yaml is not None:                     <- GANA
    :1091  elif worker_config is not None:

La precedencia real es ``CONFIG_FILE_PATH`` -> ``WORKER_CONFIG``: la inversa
de la lectura. Un consumidor que copiara la precedencia del orden de
asignacion la invertiria, y nada en el archivo se lo diria.

Por que el recorrido es por `orelse` y no por numero de linea
-------------------------------------------------------------

En este archivo concreto los dos criterios coinciden —el ``elif`` esta debajo
del ``if``— asi que un instrumento por lineas acertaria por casualidad. Deja
de acertar en cuanto la cadena se escribe anidada, que es la forma que el AST
ve siempre: un ``elif`` **es** un ``If`` dentro del ``orelse`` del anterior.
Recorrer `orelse` mide la estructura; recorrer lineas mide la tipografia.
Es el sub-patron C de `metrica-decide-la-conclusion.md` — el significante
contra el significado.

Que mide
--------

- ``assignment_order``: los nombres asignados desde una llamada de
  configuracion (``get_secret``, ``get_secret_str``, ``os.getenv``,
  ``os.environ.get``, ``environ.get``, ``getenv``), en orden de aparicion.
- ``branch_order``: los mismos nombres, en el orden en que una cadena
  ``if``/``elif`` los prueba, recorriendo ``orelse``.
- ``disagrees``: si los dos ordenes, restringidos a los nombres que aparecen
  en ambos, no coinciden.

Ciego, y se declara
-------------------

- A una precedencia que no pase por una cadena ``if``/``elif``: un
  ``a or b``, un ``dict`` fusionado, o una segunda asignacion que
  sobrescribe. Son otras formas del mismo fenomeno y este instrumento no las
  ve — su cero no es evidencia sobre ellas.
- A un nombre que la rama pruebe indirectamente (``if cfg.get('x')``).
- **A la precedencia expresada como bucle con retorno dentro**
  (``for nivel in ...: if marcador: return nivel``). Es la forma que usa
  nuestro propio ``thyrox_root`` en sus pasos 2 y 3, asi que el auditor ve
  UNO de sus tres pasos. Se declara en vez de fingir cobertura: el control
  lo asevera con la lista exacta que ve, no con un ``> 0`` que pasaria igual.
- A dos ``if`` INDEPENDIENTES, que a proposito no se cuentan como cadena: no
  son precedencia, son dos condiciones que pueden cumplirse a la vez.
- Y no juzga: **discrepar no es un defecto**. Es una trampa para quien lea el
  archivo de arriba abajo, y lo que el gate pide es que este declarada.
"""
import argparse
import ast
import sys
from pathlib import Path

#: Las llamadas que cuentan como «leer una fuente de configuracion».
FUENTES = {'get_secret', 'get_secret_str', 'getenv', 'get'}

#: Directorios que no son sujeto: dependencia, artefacto y evidencia.
SKIP_DIRS = {'.git', 'node_modules', '.venv', 'build', 'dist', '__pycache__',
             '_archived', '_references', 'eventos'}


def _es_lectura_de_config(node: ast.AST) -> bool:
    """Una llamada cuya funcion se llama como una de las fuentes.

    Se compara el ULTIMO segmento (``os.environ.get`` -> ``get``) para no
    depender de como este importado el modulo.
    """
    if not isinstance(node, ast.Call):
        return False
    fn = node.func
    nombre = fn.attr if isinstance(fn, ast.Attribute) else getattr(fn, 'id', None)
    if nombre not in FUENTES:
        return False
    # `get` es demasiado comun: solo cuenta sobre environ.
    if nombre == 'get':
        base = fn.value if isinstance(fn, ast.Attribute) else None
        texto = ast.unparse(base) if base is not None else ''
        return 'environ' in texto
    return True


def assignment_order(source: str) -> list[str]:
    """Los nombres asignados desde una lectura de configuracion, en orden."""
    arbol = ast.parse(source)
    vistos, orden = set(), []
    for node in ast.walk(arbol):
        if not isinstance(node, (ast.Assign, ast.AnnAssign)):
            continue
        if node.value is None or not _es_lectura_de_config(node.value):
            continue
        destinos = node.targets if isinstance(node, ast.Assign) else [node.target]
        for t in destinos:
            if isinstance(t, ast.Name) and t.id not in vistos:
                vistos.add(t.id)
                orden.append(t.id)
    return orden


def _nombres_del_test(test: ast.AST) -> list[str]:
    return [n.id for n in ast.walk(test) if isinstance(n, ast.Name)]


def _cadena(node: ast.If) -> list[ast.If]:
    """La cadena if/elif completa, recorriendo `orelse`.

    Un `elif` es un `If` que es el UNICO elemento del `orelse` del anterior.
    Ese es el criterio estructural; el numero de linea no interviene.
    """
    eslabones = [node]
    actual = node
    while (len(actual.orelse) == 1
           and isinstance(actual.orelse[0], ast.If)):
        actual = actual.orelse[0]
        eslabones.append(actual)
    return eslabones


def _sale(cuerpo: list[ast.stmt]) -> bool:
    """Si el cuerpo de una guarda termina abandonando la funcion."""
    return bool(cuerpo) and isinstance(cuerpo[-1], (ast.Return, ast.Raise))


def _guardas(fn: ast.FunctionDef | ast.AsyncFunctionDef) -> list[ast.If]:
    """La cadena de guardas por RETORNO TEMPRANO del cuerpo de una funcion.

    `thyrox_root` —y la forma idiomatica de Python en general— no escribe la
    precedencia como if/elif sino como una secuencia de ``if X: return X``.
    Estructuralmente es la misma cadena: cada guarda solo se evalua si las
    anteriores no salieron. Un instrumento que solo mirara `orelse` daria 0
    sobre nuestro propio arbol, midiendo una forma que no escribimos.

    Se recorre el CUERPO de la funcion en orden —que es estructura, no
    tipografia: reordenar los enunciados cambia la precedencia de verdad— y
    solo cuentan los `if` sin `orelse` cuyo cuerpo abandona la funcion.
    """
    return [s for s in fn.body
            if isinstance(s, ast.If) and not s.orelse and _sale(s.body)]


def _parametros(fn: ast.FunctionDef | ast.AsyncFunctionDef) -> set[str]:
    """Los nombres que la funcion LIGA ella misma, y que por tanto no son
    la variable de modulo aunque se llamen igual.

    Medido en `litellm`: un helper de redaccion recibe un parametro llamado
    `worker_config` y lo guarda con `if worker_config is None: return None`.
    Es otra ligadura. Contarla publica una precedencia que no existe — y lo
    hizo: la primera version de este auditor invirtio el veredicto sobre el
    control positivo por no mirar el ambito.

    Ciego, y se declara: a un nombre que la funcion asigna en su cuerpo antes
    de probarlo. Los parametros son el caso medido; el otro no se ha visto.
    """
    a = fn.args
    return {arg.arg for arg in
            (*a.posonlyargs, *a.args, *a.kwonlyargs,
             *( [a.vararg] if a.vararg else [] ),
             *( [a.kwarg] if a.kwarg else [] ))}


def branch_order(source: str) -> list[str]:
    """Los nombres de configuracion en el orden en que las ramas los prueban.

    Dos formas, ambas estructurales: la cadena ``if``/``elif`` (por ``orelse``)
    y la cadena de guardas por retorno temprano (por orden de enunciado dentro
    de la funcion). Una sola guarda no es precedencia, igual que un ``if``
    suelto no lo es.
    """
    arbol = ast.parse(source)
    candidatos = set(assignment_order(source))
    orden, vistos = [], set()
    hijos_de_cadena: set[int] = set()
    cadenas: list[list[ast.If]] = []

    for node in ast.walk(arbol):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            propios = _parametros(node)
            guardas = [g for g in _guardas(node)
                       if not (set(_nombres_del_test(g.test)) & propios)]
            if len(guardas) >= 2:
                cadenas.append(guardas)
                for g in guardas:
                    hijos_de_cadena.add(id(g))

    for node in ast.walk(arbol):
        if not isinstance(node, ast.If) or id(node) in hijos_de_cadena:
            continue
        eslabones = _cadena(node)
        if len(eslabones) < 2:
            continue          # un `if` suelto no es precedencia
        for e in eslabones[1:]:
            hijos_de_cadena.add(id(e))
        cadenas.append(eslabones)

    for eslabones in cadenas:
        for e in eslabones:
            for nombre in _nombres_del_test(e.test):
                if nombre in candidatos and nombre not in vistos:
                    vistos.add(nombre)
                    orden.append(nombre)
    return orden


def disagrees(source: str) -> bool:
    """Si el orden de lectura y el de aplicacion no coinciden."""
    rama = branch_order(source)
    if len(rama) < 2:
        return False
    asign = [n for n in assignment_order(source) if n in rama]
    return asign != rama


def scan(root: Path) -> tuple[int, dict[str, tuple[list[str], list[str]]]]:
    medidos, discrepantes = 0, {}
    for path in sorted(root.rglob('*.py')):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if not path.is_file():
            continue
        try:
            fuente = path.read_text(encoding='utf-8', errors='replace')
            arbol_ok = ast.parse(fuente)
        except SyntaxError:
            continue          # no es sujeto: no se puede recorrer su AST
        del arbol_ok
        medidos += 1
        if disagrees(fuente):
            discrepantes[str(path.relative_to(root))] = (
                [n for n in assignment_order(fuente) if n in branch_order(fuente)],
                branch_order(fuente),
            )
    return medidos, discrepantes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default='.', help='raiz a medir')
    parser.add_argument('--archivo', help='auditar UN archivo y publicar su cadena')
    parser.add_argument('--strict', action='store_true',
                        help='exit 1 si hay discrepancias no declaradas')
    parser.add_argument('--quiet', action='store_true',
                        help='emitir solo el conteo, como entero pelado')
    args = parser.parse_args()

    if args.archivo:
        p = Path(args.archivo)
        if not p.is_file():
            print(f'ERROR — no existe: {p}', file=sys.stderr)
            print('NO se emite un conteo: un 0 aqui seria un verde falso.',
                  file=sys.stderr)
            return 2
        fuente = p.read_text(encoding='utf-8', errors='replace')
        print(f'  lectura:    {" -> ".join(assignment_order(fuente)) or "(ninguna)"}')
        print(f'  precedencia: {" -> ".join(branch_order(fuente)) or "(sin cadena)"}')
        print(f'  discrepan:  {"SI" if disagrees(fuente) else "no"}')
        return 0

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f'ERROR — la raiz no existe: {root}', file=sys.stderr)
        print('NO se emite un conteo: un 0 aqui seria un verde falso.',
              file=sys.stderr)
        return 2

    medidos, discrepantes = scan(root)

    if args.quiet:
        print(len(discrepantes))
        return 1 if (args.strict and discrepantes) else 0

    for path, (asign, rama) in sorted(discrepantes.items()):
        print(f'  {path}')
        print(f'     lee     {" -> ".join(asign)}')
        print(f'     aplica  {" -> ".join(rama)}   <- la precedencia real')

    print(f'check-config-precedence: {len(discrepantes)} discrepancia(s) '
          f'(alcance medido: {medidos} archivo(s) .py)')
    return 1 if (args.strict and discrepantes) else 0


if __name__ == '__main__':
    raise SystemExit(main())
