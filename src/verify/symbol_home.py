#!/usr/bin/env python3
"""Nivel SITIO: un simbolo vive del lado del arbol donde la fuente lo declara.

Tercero de los cuatro niveles de verificacion de porte (ver
`counterpart_body.py` para la tabla completa). Responde **donde**, no **si** ni
**como**: un simbolo puede estar presente, con la cabecera exacta y el cuerpo
equivalente, y aun asi vivir en el lado equivocado del arbol.

Por que el lado importa
-----------------------

Un arbol de referencia suele partirse en dos regiones con contratos distintos
—un nucleo y una region de extensiones instalables—. Portar al nucleo algo que
la fuente declara extension no rompe nada al ejecutarse: cambia **quien puede
no tenerlo**, y eso no lo ve ningun test.

Origen del nivel: `H-API-556` en el consumidor, donde un porte aterrizo en el
nucleo cuando la fuente lo declara en un addon instalable. Lo detecto una
persona, no una medicion.

Que es mecanismo y que es parametro (DEC-04)
--------------------------------------------

Este modulo **no sabe como se llaman los lados ni cuales son**. Recibe:

- `side_of`, un invocable `partes_de_ruta -> lado` que clasifica una ruta de
  la FUENTE. Que un directorio llamado `addons` marque region de extension es
  vocabulario del consumidor;
- `own_side_of`, el equivalente para NUESTRO arbol, que devuelve `None` para
  una ruta sin lado que comparar;
- `imposed`, los nombres que el stack impone (una clase que un framework exige
  con ese nombre exacto no expresa ninguna decision de ubicacion);
- `accepted`, el trinquete: ubicaciones ya juzgadas, con su motivo.

Los cuatro son dominio. Lo que aporta el proveedor es el indice, la
comparacion y **los cuatro desenlaces** — que son la parte que se equivoca sin
que nadie lo note.

Los cuatro desenlaces, y por que son cuatro
-------------------------------------------

`fuera de sitio` · `aceptada` · `sin contraparte` · `ambigua`. Colapsar los dos
ultimos en «correcta» publicaria un verde que no discrimina: un simbolo que la
fuente no declara no tiene lado que comparar, y uno que declara en los DOS
lados no se puede desempatar por nombre. Contarlos aparte es lo que deja leer
el denominador.

*Metrica:* nombre de clase de nivel superior, en los dos arboles.
*Ciega a:* el archivo exacto —compara region contra region, no ruta contra
ruta—, un renombre no declarado (sale `sin contraparte`, el lado seguro), y un
simbolo movido a la region correcta pero a la extension equivocada dentro de
ella.

Fuente del porte: `kaupamex-api: scripts/check_symbol_home.py` (249 lineas).
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

#: Segmentos que no se recorren en ninguno de los dos arboles.
DEFAULT_SKIP = ('__pycache__', 'migrations')


@dataclasses.dataclass(frozen=True)
class Placement:
    """Un simbolo nuestro, su lado y el que la fuente le da."""

    name: str
    ours: str
    reference: str
    path: pathlib.Path


@dataclasses.dataclass(frozen=True)
class HomeReport:
    """Los cuatro desenlaces con su denominador al lado."""

    out_of_place: tuple
    accepted: tuple
    ambiguous: tuple
    without_counterpart: int
    total: int

    @property
    def measured(self):
        """Sobre cuantas clases se pudo decidir de verdad."""
        return self.total - self.without_counterpart - len(self.ambiguous)


def index_reference(root, side_of, reader=None, skip=DEFAULT_SKIP,
                    kinds=('class',)):
    """Mapa `nombre -> {lados}` de todo el arbol de la fuente.

    `reader` es parametro por la misma razon que en el nivel CUERPO: la
    pregunta «que declara este archivo» la contesta el LENGUAJE. Y aqui la
    eleccion tiene ademas un eje de coste: un arbol de referencia son decenas
    de miles de archivos, asi que `PatternReader` —expresion regular— suele
    ser el adecuado para el indice aunque el arbol sea Python, mientras que
    `AstReader` se reserva para el arbol propio, que es de otro tamano.

    `kinds` acota que clase de simbolo entra al indice. Su default es `class`
    porque es el que el nivel nacio midiendo, no porque sea el unico posible.
    """
    reader = reader or PatternReader(
        extensions=('.py',), declarations=reader_module.PYTHON_DECLARATIONS)
    skip, kinds = frozenset(skip), frozenset(kinds)
    root = pathlib.Path(root)
    index = {}
    for path in root.rglob('*'):
        if not path.is_file() or path.suffix not in reader.extensions:
            continue
        parts = path.relative_to(root).parts
        if skip & set(parts):
            continue
        side = side_of(parts)
        if side is None:
            continue
        for symbol in reader.top_level(path):
            if symbol.kind in kinds:
                index.setdefault(symbol.name, set()).add(side)
    return index


def own_symbols(root, own_side_of, reader=None, skip=DEFAULT_SKIP,
                kinds=('class',)):
    """Simbolos de NIVEL SUPERIOR de nuestro arbol, con su lado y su archivo.

    El lector decide que cuenta como «nivel superior», y con eso su
    resolucion: `AstReader` distingue una clase anidada —`class Meta` dentro
    de un modelo— de una de modulo, y contar la anidada produciria un
    veredicto sobre la ubicacion de algo que no tiene ubicacion propia.
    `PatternReader` **no** puede hacer esa distincion y lo declara; quien lo
    elige acepta esa ceguera a cambio de alcanzar un arbol que no es Python.
    """
    reader = reader or AstReader()
    skip, kinds = frozenset(skip), frozenset(kinds)
    root = pathlib.Path(root)
    found = []
    for path in sorted(root.rglob('*')):
        if not path.is_file() or path.suffix not in reader.extensions:
            continue
        parts = path.relative_to(root).parts
        if skip & set(parts):
            continue
        side = own_side_of(parts)
        if side is None:
            continue          # sin lado que comparar; no es un fallo
        for symbol in reader.top_level(path):
            if symbol.kind in kinds:
                found.append((symbol.name, side, path))
    return found


def compare_homes(own, index, imposed=frozenset(), accepted=()):
    """Reparte las clases propias en los cuatro desenlaces.

    `accepted` es el trinquete: una entrada ahi es una **decision declarada**,
    no una excepcion de conveniencia. Sin el, la deuda heredada bloquea cada
    commit y el gate se desactiva; con el, una ubicacion NUEVA si bloquea.
    """
    imposed = frozenset(imposed)
    accepted = frozenset(accepted)
    out_of_place, ok_accepted, ambiguous, without = [], [], [], 0
    total = 0
    for name, side, path in own:
        if name in imposed:
            continue
        total += 1
        sides = index.get(name)
        if not sides:
            without += 1
            continue
        if len(sides) > 1:
            ambiguous.append((name, path))
            continue
        (reference_side,) = sides
        if reference_side == side:
            continue
        record = Placement(name, side, reference_side, path)
        (ok_accepted if name in accepted else out_of_place).append(record)
    return HomeReport(tuple(out_of_place), tuple(ok_accepted),
                      tuple(ambiguous), without, total)
