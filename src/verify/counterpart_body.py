#!/usr/bin/env python3
"""Nivel CUERPO: comparar una propiedad del cuerpo contra la de su contraparte.

La verificacion de un porte tiene **cuatro** niveles, no uno, y cada uno
responde una pregunta que los otros no pueden:

===========  ==========================================  ======================
Nivel        Pregunta                                    Instrumento
===========  ==========================================  ======================
presencia    ¿esta el simbolo?                           conjunto de simbolos
cabecera     ¿declara lo que la fuente declara?          atributos de clase
sitio        ¿vive donde la fuente lo declara?           conjunto de archivos
**cuerpo**   **¿como hace lo que hace?**                 este modulo + un eje
===========  ==========================================  ======================

Por el cuarto entro `H-API-1058` en el consumidor, y se descubrio **por
casualidad**: de sus 29 gates, ninguno leia el cuerpo de un metodo. Un metodo
escribia por el enganche del ORM —heredando una guarda— donde la fuente escribe
por SQL crudo, deliberadamente fuera de ese enganche. **Los tres primeros
niveles daban verde**: el simbolo estaba, la cabecera coincidia y el archivo
vivia donde debia.

Que es mecanismo y que es parametro (DEC-04)
--------------------------------------------

Este modulo **no sabe que propiedad se mide ni contra que arbol**. Los dos son
del consumidor:

- **el eje** (`Axis`) declara los dos vocabularios y como se nombra cada
  desacuerdo. El vocabulario es dominio del consumidor — «escribe por el
  enganche» significa una cosa en un ORM y otra en otro;
- **el localizador de contraparte** (`counterpart`) es un invocable que
  traduce una ruta nuestra a su ruta en la fuente. Como se espejan las raices
  es la forma del arbol del consumidor, no del proveedor.

La version del consumidor tenia el localizador **cableado** como constante de
modulo, y con el la ruta de su arbol de referencia. Portarlo asi mudaria el
dominio del producto al proveedor, que es el defecto que la tarea #249 nombra.
`mirrored_counterpart` queda aqui porque «un par de raices espejadas» SI es un
mecanismo; los pares concretos los pasa quien llama.

Fuente del porte: `kaupamex-api: scripts/counterpart_body.py` (322 lineas),
que sigue siendo el consumidor vivo de este nivel.
"""
import ast
import dataclasses
import pathlib

#: Las dos categorias transversales, que ningun eje redefine. `ABSENT` es lo
#: que el eje NO ve en ese cuerpo; `BOTH` es su propia categoria y no se
#: colapsa a ninguna de las dos del eje, porque dice algo distinto.
ABSENT = 'sin senal'
BOTH = 'ambas'

#: El instrumento vio los dos lados y **no puede decidir** con su granularidad.
#: No es un hallazgo —no hay defecto que nombrar— ni un acuerdo. Se cuenta
#: aparte para que el denominador no lo esconda: un par indeterminado contado
#: como acuerdo publica un verde que no discrimina (sub-patron D de
#: `metrica-decide-la-conclusion.md`).
INDETERMINATE = 'indeterminado por granularidad de metodo'


@dataclasses.dataclass(frozen=True)
class Vocabulary:
    """Los nombres de llamada de un lado, en las dos categorias del eje."""

    side: str
    first: frozenset
    second: frozenset


@dataclasses.dataclass(frozen=True)
class Axis:
    """Que propiedad se mide, y como se nombra cada desacuerdo.

    `first_name`/`second_name` son las etiquetas legibles de las dos
    categorias. `directions` mapea `(nuestra, la de la fuente)` al nombre del
    riesgo: sin entrada, el desacuerdo se reporta sin nombrar direccion, que es
    honesto y no inventa una lectura.
    """

    name: str
    ours: Vocabulary
    reference: Vocabulary
    first_name: str
    second_name: str
    directions: dict


def called_names(node):
    """Los nombres invocados en el cuerpo, por atributo o sueltos."""
    for sub in ast.walk(node):
        if not isinstance(sub, ast.Call):
            continue
        if isinstance(sub.func, ast.Attribute):
            yield sub.func.attr
        elif isinstance(sub.func, ast.Name):
            yield sub.func.id


def classify(node, vocabulary, axis):
    """La categoria del cuerpo segun el vocabulario de su lado."""
    first = second = False
    for name in called_names(node):
        if name in vocabulary.first:
            first = True
        elif name in vocabulary.second:
            second = True
    if first and second:
        return BOTH
    if first:
        return axis.first_name
    if second:
        return axis.second_name
    return ABSENT


def direction(ours, theirs, axis):
    """El nombre del desacuerdo, `None` si coinciden, `INDETERMINATE` si el
    instrumento no puede decidir.

    Tres desenlaces, no dos, y el tercero es el que evita un falso positivo:

    - Un lado **sin senal** no se compara: concluir ahi seria hablar de lo que
      el instrumento no ve (`metrica-decide-la-conclusion.md`).
    - Un lado en `BOTH` que **contiene** la categoria del otro es
      **indeterminado**, no un desacuerdo. La unidad de esta comparacion es el
      **metodo**, y un metodo puede escribir por dos mecanismos para dos
      operaciones distintas. Con esa granularidad, que nosotros usemos uno de
      los dos que la fuente usa no es evidencia de divergencia: es la
      resolucion del instrumento.
    - Lo demas es desacuerdo, con el nombre que el eje le de.
    """
    if ABSENT in (ours, theirs) or ours == theirs:
        return None
    if BOTH in (ours, theirs):
        return INDETERMINATE
    return axis.directions.get((ours, theirs), 'categoria distinta')


@dataclasses.dataclass(frozen=True)
class Finding:
    path: str
    symbol: str
    ours: str
    theirs: str
    direction: str

    @property
    def key(self):
        return f'{self.path}::{self.symbol}'


@dataclasses.dataclass(frozen=True)
class Scope:
    """El denominador. Un conteo sin el no es un resultado."""

    files_scanned: int
    files_with_counterpart: int
    pairs_compared: int
    pairs_indeterminate: int = 0


def mirrored_counterpart(path, pairs, tree_root):
    """La ruta espejo en la fuente, o `None` si ninguna raiz la cubre.

    `pairs` es una secuencia de `(prefijo_nuestro, destino_en_la_fuente)`, cada
    uno como tupla de segmentos: `(('src', 'orm'), ('odoo', 'orm'))`. Los pares
    son **parametro** — que raices espeja un arbol es su forma, no la del
    proveedor. Lo que este modulo aporta es la traduccion.

    Un consumidor con casos que esta forma no cubre —un directorio cuya raiz se
    resuelve por nombre en vez de por prefijo— compone su propio invocable y
    delega aqui el tramo regular.
    """
    parts = pathlib.Path(path).parts
    for prefix, destination in pairs:
        prefix, destination = tuple(prefix), tuple(destination)
        if parts[:len(prefix)] == prefix:
            return pathlib.Path(tree_root).joinpath(
                *destination, *parts[len(prefix):])
    return None


@dataclasses.dataclass(frozen=True)
class Declaration:
    """Un simbolo declarado en un archivo, con su duena y su linea.

    `methods_of` devuelve el nodo por nombre y pierde dos cosas que un analisis
    de flujo necesita: la **clase duena** —el contrato puede vivir en una base,
    no en la clase que se lee— y la **funcion de modulo**, que en una raiz de
    utilidades es la forma dominante. Esta estructura las conserva sin cambiar
    el contrato de `methods_of`, que `compare` ya consume.
    """

    name: str
    owner: str            # nombre de la clase, o '' si es de modulo
    lineno: int
    node: object
    bases: tuple = ()     # las bases declaradas: de la clase duena, o suyas
    kind: str = 'function'   # function | class | assign


def parse_file(path):
    """El AST del archivo, o `None` si no se puede leer ni parsear."""
    try:
        return ast.parse(pathlib.Path(path).read_text(errors='ignore'))
    except (SyntaxError, OSError, UnicodeDecodeError):
        return None


def base_names(klass):
    """Los nombres de las bases declaradas, por atributo o sueltos."""
    names = []
    for base in klass.bases:
        if isinstance(base, ast.Name):
            names.append(base.id)
        elif isinstance(base, ast.Attribute):
            names.append(base.attr)
    return tuple(names)


def declarations_of(path, tree=None):
    """Todo simbolo declarado en el archivo: clase, funcion y asignacion.

    Tres diferencias con `methods_of`, y las tres las pide un analisis de
    flujo. No **colapsa por nombre** — dos clases del mismo archivo pueden
    declarar el mismo metodo, y esa coincidencia es lo que la unidad
    *hermanos* mide. Recoge la **funcion de modulo**. Y recoge **clase y
    asignacion**: un informe que solo viera funciones diria «no se declara» de
    una clase que si existe, y ese cero seria falso — el sub-patron D de
    `metrica-decide-la-conclusion.md`.

    La asignacion se recoge solo al nivel del cuerpo —de modulo o de clase—, no
    dentro de una funcion: una variable local no es una declaracion que otro
    archivo pueda consumir.
    """
    tree = tree if tree is not None else parse_file(path)
    if tree is None:
        return []
    found, nested = [], set()
    for klass in ast.walk(tree):
        if not isinstance(klass, ast.ClassDef):
            continue
        bases = base_names(klass)
        found.append(Declaration(
            klass.name, '', klass.lineno, klass, bases, 'class'))
        for member in klass.body:
            if isinstance(member, (ast.FunctionDef, ast.AsyncFunctionDef)):
                found.append(Declaration(
                    member.name, klass.name, member.lineno, member, bases))
                nested.add(id(member))
            elif isinstance(member, ast.Assign):
                for target in member.targets:
                    if isinstance(target, ast.Name):
                        found.append(Declaration(
                            target.id, klass.name, member.lineno, member,
                            bases, 'assign'))
        nested.add(id(klass))
    for node in tree.body:
        if (isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                and id(node) not in nested):
            found.append(Declaration(node.name, '', node.lineno, node))
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    found.append(Declaration(
                        target.id, '', node.lineno, node, (), 'assign'))
    return found


def methods_of(path):
    """Los metodos declarados en clases del archivo, por nombre."""
    tree = parse_file(path)
    if tree is None:
        return {}
    return {member.name: member
            for klass in ast.walk(tree) if isinstance(klass, ast.ClassDef)
            for member in klass.body
            if isinstance(member, (ast.FunctionDef, ast.AsyncFunctionDef))}


def compare(paths, axis, counterpart):
    """Los hallazgos del eje y el alcance sobre el que se midieron.

    `counterpart` es un invocable `ruta -> ruta_en_la_fuente | None`. Es el
    parametro que la version del consumidor tenia cableado; sin el, este modulo
    no puede compararse contra nada y por tanto lo exige — no lo adivina.
    """
    paths = list(paths)
    findings, with_counterpart, pairs, indeterminate = [], 0, 0, 0
    for path in paths:
        reference = counterpart(path)
        if reference is None or not pathlib.Path(reference).is_file():
            continue
        with_counterpart += 1
        ours, theirs = methods_of(path), methods_of(reference)
        for name, node in ours.items():
            if name not in theirs:
                continue
            mine = classify(node, axis.ours, axis)
            yours = classify(theirs[name], axis.reference, axis)
            if ABSENT in (mine, yours):
                continue
            pairs += 1
            verdict = direction(mine, yours, axis)
            if verdict == INDETERMINATE:
                indeterminate += 1
            elif verdict is not None:
                findings.append(Finding(str(path), name, mine, yours, verdict))
    return findings, Scope(len(paths), with_counterpart, pairs, indeterminate)


def tree_files(roots, skip=('__pycache__', 'migrations')):
    """Los `.py` de las raices dadas, saltando los segmentos de `skip`.

    `skip` es parametro con default: `__pycache__` es del lenguaje —lo mismo en
    cualquier arbol— y `migrations` es una convencion de framework que el
    consumidor puede no tener. Codificarla sin salida ataria el proveedor a un
    stack; darle default la deja util sin configurar.
    """
    skip = frozenset(skip)
    for root in roots:
        base = pathlib.Path(root)
        if base.is_file():
            yield base
            continue
        for path in sorted(base.rglob('*.py')):
            if skip & set(path.parts):
                continue
            yield path


def load_baseline(path):
    """La deuda congelada. Una entrada listada no bloquea; una nueva si."""
    baseline = pathlib.Path(path)
    if not baseline.is_file():
        return set()
    return {line.strip() for line in baseline.read_text().splitlines()
            if line.strip() and not line.startswith('#')}


def write_baseline(path, findings, note):
    pathlib.Path(path).write_text(
        f'# {note}\n'
        '# Una entrada listada no bloquea; una nueva si. Se paga al tocar el\n'
        '# archivo, no en un barrido.\n'
        + ''.join(f'{f.key}\n' for f in sorted(findings, key=lambda x: x.key)))
    return len(findings)
