#!/usr/bin/env python3
"""Nivel CABECERA: una clase declara los atributos que su fuente declara.

Segundo de los cuatro niveles de verificacion de porte (ver
`counterpart_body.py` para la tabla completa). Responde **que declara la
clase**, no `si el simbolo esta` ni `donde vive` ni `como hace lo que hace`.

Por que la cabecera importa
---------------------------

Un modelo de la referencia no es solo sus metodos: antes del primer metodo
declara un bloque de atributos de clase que gobiernan como el framework lo
trata —su nombre, de que extiende, en que orden ordena, con que campo se
etiqueta—. Portar los metodos y callar la cabecera produce un puerto que pasa
sus tests y decide distinto.

Y el defecto es **silencioso por construccion**: el nivel de PRESENCIA compara
simbolos ejecutables, asi que un atributo de clase ausente no aparece en
ninguna de sus comparaciones. Origen del nivel en el consumidor: un porte
declaro **2 de 5** atributos en cada una de sus dos clases y su docstring lo
presento como completo.

Que es mecanismo y que es parametro (DEC-04)
--------------------------------------------

Este modulo **no sabe que atributos importan ni como se llaman**. Recibe un
`Header` con:

- `tracked`, el vocabulario de atributos cuya ausencia es un hallazgo. Que
  `_name` o `_order` cuenten es dominio del consumidor;
- `special_calls`, los nombres de llamada que marcan un atributo como de otra
  familia —uno cuyo valor es una construccion del framework y no un dato—,
  porque esa familia suele **reubicarse** en el puerto en vez de desaparecer;
- `selects`, que decide que nombres son candidatos (por defecto, el prefijo de
  guion bajo simple);
- `relocated`, el predicado que responde «este atributo especial vive en otro
  sitio de NUESTRA clase». Donde vive es dominio puro.

Lo que aporta el proveedor es el emparejamiento por contraparte, la separacion
en dos familias de hallazgo y el denominador.

Las dos familias, y por que no se colapsan
------------------------------------------

`tracked` es una ausencia lisa: la fuente lo declara y el puerto no. `special`
admite un tercer desenlace —**reubicado**— que `tracked` no tiene, y por eso
lleva su propio `kind`: contarlos juntos haria que el predicado `relocated`
pareciera aplicable a un atributo al que no aplica.

*Metrica:* atributos que `selects` acepta, declarados en el cuerpo de una clase
de nivel superior con contraparte homonima en los dos arboles.
*Ciega a:* una clase sin contraparte homonima —eso lo mide el nivel de
PRESENCIA—; un atributo declarado con anotacion de tipo, que `AstReader` no
emite; un atributo cuyo nombre cambio en el puerto; y una clase anidada que se
llame igual que una de nivel superior del mismo archivo.

Fuente del porte: `kaupamex-api: scripts/check_model_class_attributes.py`
(429 lineas), de las que la inmensa mayoria es parametro del consumidor — el
vocabulario de 24 atributos de ORM, los nombres de llamada de objeto de tabla,
la lectura de `Meta` y el emparejamiento de addons.
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


def default_selects(name):
    """Candidato por defecto: guion bajo simple, nunca doble.

    El doble es el mangling del lenguaje, no una decision del autor.
    """
    return name.startswith('_') and not name.startswith('__')


@dataclasses.dataclass(frozen=True)
class Header:
    """El contrato de cabecera que el consumidor declara.

    `selects` y `relocated` son invocables; `None` toma el default —candidato
    por prefijo de guion bajo, y ningun atributo especial se da por reubicado.
    """

    name: str
    tracked: frozenset
    special_calls: frozenset = frozenset()
    selects: object = None
    relocated: object = None

    def accepts(self, attribute):
        return (self.selects or default_selects)(attribute)

    def is_relocated(self, attribute, container):
        if self.relocated is None:
            return False
        return bool(self.relocated(attribute, container))


@dataclasses.dataclass(frozen=True)
class Finding:
    """Un atributo que la fuente declara y el puerto no.

    `kind` es `'tracked'` o `'special'`; ver «Las dos familias» del modulo.
    """

    kind: str
    path: str
    container: str
    attribute: str
    lineno: int


@dataclasses.dataclass(frozen=True)
class Scope:
    """El denominador. Sin el, un cero no se puede leer."""

    files_scanned: int
    files_with_counterpart: int
    containers_compared: int
    attributes_compared: int


def top_level_containers(path, reader):
    """`{nombre: Symbol}` de las clases de NIVEL SUPERIOR del archivo.

    Sale de `top_level`, no de `symbols`: aquel recorre el arbol entero y una
    clase anidada —la de configuracion que muchos frameworks piden dentro del
    modelo— entraria como contenedor y emparejaria con la de la fuente.
    """
    return {sym.name: sym for sym in reader.top_level(path)
            if sym.kind == 'class'}


def _first_called(reader, body):
    for called in reader.called_names(body):
        return called
    return ''


def container_attributes(path, container, header, reader):
    """`(tracked, special)` — cada uno `{atributo: linea}` del cuerpo de la clase.

    La familia se decide por el **primer** nombre invocado del valor: si el
    valor ES una llamada, ese primero es su constructor. Un valor que no es
    llamada pero anida una dentro cae en `special` aunque la fuente lo trate
    como dato; declarado, no supuesto.
    """
    tracked, special = {}, {}
    for sym in reader.symbols(path):
        if sym.kind != 'assign' or sym.owner != container:
            continue
        if not header.accepts(sym.name):
            continue
        if _first_called(reader, sym.body) in header.special_calls:
            special[sym.name] = sym.lineno
        elif sym.name in header.tracked:
            tracked[sym.name] = sym.lineno
    return tracked, special


def compare_headers(paths, header, counterpart, reader=None):
    """`(hallazgos, alcance)` — la cabecera de cada clase contra la de su fuente.

    `counterpart` es el localizador: `ruta_nuestra -> ruta_de_la_fuente | None`.
    Es parametro por la misma razon que en el nivel CUERPO — como se empareja
    un arbol con el suyo es dominio del consumidor.
    """
    reader = reader or AstReader()
    findings = []
    scanned = with_counterpart = containers = attributes = 0
    for path in paths:
        scanned += 1
        source = counterpart(path)
        if source is None or not pathlib.Path(source).exists():
            continue
        with_counterpart += 1
        ours = top_level_containers(path, reader)
        theirs = top_level_containers(source, reader)
        for name in sorted(theirs):
            container = ours.get(name)
            if container is None:
                continue
            containers += 1
            ref_tracked, ref_special = container_attributes(
                source, name, header, reader)
            our_tracked, our_special = container_attributes(
                path, name, header, reader)
            attributes += len(ref_tracked) + len(ref_special)
            for attribute, lineno in sorted(ref_tracked.items()):
                if attribute in our_tracked:
                    continue
                findings.append(Finding('tracked', str(path), name,
                                        attribute, lineno))
            for attribute, lineno in sorted(ref_special.items()):
                if attribute in our_special:
                    continue
                if header.is_relocated(attribute, container):
                    continue
                findings.append(Finding('special', str(path), name,
                                        attribute, lineno))
    return findings, Scope(scanned, with_counterpart, containers, attributes)
