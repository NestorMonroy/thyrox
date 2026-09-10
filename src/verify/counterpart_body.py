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
import dataclasses
import importlib.util
import pathlib

_spec = importlib.util.spec_from_file_location(
    "verify_reader", pathlib.Path(__file__).resolve().parent / "reader.py")
reader_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(reader_module)
AstReader = reader_module.AstReader
PatternReader = reader_module.PatternReader

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


def classify(body, vocabulary, axis, reader=None):
    """La categoria del cuerpo segun el vocabulario de su lado.

    `reader` contesta «que nombres invoca este cuerpo». Es parametro porque la
    respuesta depende del LENGUAJE, no del eje: el mismo eje se mide igual
    sobre Python, sobre TypeScript o sobre un corpus vendorizado, y lo unico
    que cambia es quien sabe leerlo.
    """
    reader = reader or AstReader()
    first = second = False
    for name in reader.called_names(body):
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


def members_by_name(path, reader):
    """Los simbolos invocables del archivo, por nombre.

    Colapsa por nombre a proposito: la unidad de esta comparacion es el
    **metodo**, y comparar `M.foo` contra `N.foo` de la fuente es lo que el
    nivel quiere. Quien necesite la clase duena consulta `reader.symbols`
    directamente — `Symbol.owner` la lleva cuando el lector puede verla.
    """
    return {s.name: s.body for s in reader.symbols(path)
            if s.kind == 'function'}


def compare(paths, axis, counterpart, reader=None):
    """Los hallazgos del eje y el alcance sobre el que se midieron.

    Los tres parametros son del consumidor, y ninguno se adivina:

    - `axis` — que propiedad se mide y como se nombra cada desacuerdo;
    - `counterpart` — un invocable `ruta -> ruta_en_la_fuente | None`;
    - `reader` — quien sabe leer el LENGUAJE de los dos lados.

    El default de `reader` es Python porque es el lenguaje del propio
    proveedor, no porque sea el unico: `PatternReader` alcanza cualquier arbol
    de texto con su ceguera declarada.
    """
    reader = reader or AstReader()
    paths = list(paths)
    findings, with_counterpart, pairs, indeterminate = [], 0, 0, 0
    for path in paths:
        reference = counterpart(path)
        if reference is None or not pathlib.Path(reference).is_file():
            continue
        with_counterpart += 1
        ours = members_by_name(path, reader)
        theirs = members_by_name(reference, reader)
        for name, node in ours.items():
            if name not in theirs:
                continue
            mine = classify(node, axis.ours, axis, reader)
            yours = classify(theirs[name], axis.reference,
                             axis, reader)
            if ABSENT in (mine, yours):
                continue
            pairs += 1
            verdict = direction(mine, yours, axis)
            if verdict == INDETERMINATE:
                indeterminate += 1
            elif verdict is not None:
                findings.append(Finding(str(path), name, mine, yours, verdict))
    return findings, Scope(len(paths), with_counterpart, pairs, indeterminate)


def tree_files(roots, extensions=('.py',),
               skip=('__pycache__', 'migrations')):
    """Los archivos de las raices dadas que el lector puede leer.

    `extensions` sale del lector que se vaya a usar (`reader.extensions`), no
    de una suposicion del motor: cablear `.py` aqui dejaria el nivel util para
    un solo arbol de los que el proveedor gobierna.

    `skip` es parametro con default por lo mismo: `__pycache__` es del
    lenguaje y `migrations` una convencion de framework que el consumidor
    puede no tener.
    """
    skip, extensions = frozenset(skip), tuple(extensions)
    for root in roots:
        base = pathlib.Path(root)
        if base.is_file():
            yield base
            continue
        for path in sorted(base.rglob('*')):
            if not path.is_file() or path.suffix not in extensions:
                continue
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
