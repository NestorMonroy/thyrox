#!/usr/bin/env python3
"""Nivel PRESENCIA: el simbolo que la fuente declara existe en el puerto.

Primero de los cuatro niveles de verificacion de porte (ver
`counterpart_body.py` para la tabla completa). Responde **si el simbolo esta**,
no `que declara la clase` ni `donde vive` ni `como hace lo que hace`.

La direccion se INVIERTE respecto de los otros tres
--------------------------------------------------

Los niveles de cabecera, sitio y cuerpo recorren NUESTROS archivos y buscan su
contraparte en la fuente. Este recorre **la fuente** y busca la nuestra, y no
es una preferencia: una ausencia solo es visible desde donde la cosa existe.
Un archivo que nunca se porto no aparece en ningun recorrido de nuestro arbol
—no hay nada que recorrer— y su silencio se leeria como conformidad.

Por eso `counterpart` aqui va de `ruta_de_la_fuente` a `ruta_nuestra | None`,
al reves que en los otros modulos. Quien cablee los cuatro niveles con el mismo
localizador obtendra ceros que no significan nada.

Que es mecanismo y que es parametro (DEC-04)
--------------------------------------------

Este modulo **no sabe como se normaliza un nombre, ni donde vive el indice del
arbol, ni que cuenta como equivalencia declarada**. Recibe un `Presence` con
los predicados y las tablas del consumidor, y a cada uno le pasa el nombre
**crudo**: la asimetria entre la llave de nuestro lado y la de la fuente vive
dentro del consumidor, no aqui. Lo que aporta el proveedor es el emparejamiento
por contraparte, los siete veredictos, las dos guardas y el denominador.

La asimetria entre las dos ramas es del mecanismo, no un descuido
-----------------------------------------------------------------

Con archivo pareado se compara todo: clase en otro sitio, miembro ausente,
miembro fuera de su clase y miembro despromovido. **Sin** archivo pareado solo
se comparan los miembros ausentes — no hay archivo nuestro del que leer los
simbolos sueltos, ni equivalencia declarada que absolver, ni sitio con el que
contrastar. Colapsar las dos ramas en una cambiaria el veredicto de cada clase
sin contraparte de archivo.

Las dos guardas de la clase sin contraparte
-------------------------------------------

Una clase **ausente** con lista vacia sigue siendo un hallazgo: la fuente
declara clases de solo campos, y no tener metodo no las vuelve portadas. Solo
se suprime cuando habia miembros y todos quedaron cubiertos. Una clase
**extendida** sin miembros si se suprime: lo instalado ya la cubre entera.

*Metrica:* funciones declaradas en el cuerpo de una clase de nivel superior de
cada archivo de la fuente, contra las de su contraparte.
*Ciega a:* todo lo que no sea una funcion —campos, atributos de clase y
constantes de modulo, que miden los niveles de CABECERA y SITIO—; una clase
anidada homonima de una de nivel superior del mismo archivo, cuyos miembros se
funden; y, con `PatternReader`, TODO miembro, porque ese lector no resuelve la
clase duena y devuelve `owner` vacio.

Fuente del porte: `kaupamex-api: scripts/check_porte_completo.py` (1121
lineas), de las que la inmensa mayoria es parametro del consumidor — el mapa de
alias por nombre de modelo, el archivo de divergencias declaradas, la lectura
de las extensiones instaladas, los baselines y la resolucion de raices.
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


#: Ningun archivo nuestro declara ninguna de las clases del archivo fuente.
FILE_NOT_PORTED = 'file-not-ported'
#: La clase no existe en ningun sitio, ni como extension instalada.
CLASS_ABSENT = 'class-absent'
#: La clase no existe como tal, pero el puerto le instala simbolos encima.
CLASS_EXTENDED = 'class-extended'
#: La clase existe, en un archivo distinto del que le tocaba.
CLASS_OUT_OF_FILE = 'class-out-of-file'
#: Miembros que la fuente declara y el puerto no tiene en ninguna parte.
MEMBERS_ABSENT = 'members-absent'
#: Miembros que existen en NUESTRO archivo pero no en la clase que les toca.
OUT_OF_PLACE = 'out-of-place'
#: Miembros presentes que perdieron su marca de visibilidad al portarse.
DEMOTED = 'demoted'


def _identity(name):
    return name


def _source_identity(member, container, path):
    return member


def _never(*_args):
    return None


def _no_members(*_args):
    return frozenset()


def _not_demoted(*_args):
    return False


@dataclasses.dataclass(frozen=True)
class Presence:
    """Los predicados y las tablas con que el consumidor decide.

    Todos reciben el nombre **crudo**; quien normaliza es el consumidor, que es
    el unico que sabe que su indice del arbol y su indice de extensiones usan
    llaves distintas.

    - `key_container` — la llave con que se emparejan dos clases homonimas.
    - `key_ours` / `key_source` — la llave de un miembro en cada lado. Son dos
      porque el consumidor puede declarar equivalencias que dependen del
      archivo y de la clase de origen, cosa que nuestro lado no tiene.
    - `located(clase)` — los miembros de esa clase en TODO nuestro arbol, o
      `None`. Es lo que distingue «no esta» de «esta en otro archivo».
    - `installed(clase)` — los miembros que el puerto instala sobre una clase
      de ese nombre sin declararla, o `None`.
    - `file_members(ruta_nuestra)` — las **llaves** de todo simbolo del archivo,
      sin importar su clase. Es lo que distingue «ausente» de «fuera de sitio».
    - `absolved(ruta_nuestra)` — las **llaves** que el archivo declara como
      equivalencia y por tanto no son ausencia.
    - `demoted(miembro, clase, miembros_fuente, miembros_nuestros)` — si el
      miembro esta presente pero perdio su marca de visibilidad. El consumidor
      pliega aqui su propio baseline devolviendo `False`.
    """

    key_container: object = _identity
    key_ours: object = _identity
    key_source: object = _source_identity
    located: object = _never
    installed: object = _never
    file_members: object = _no_members
    absolved: object = _no_members
    demoted: object = _not_demoted


@dataclasses.dataclass(frozen=True)
class Finding:
    kind: str
    path: str
    container: str
    members: tuple


@dataclasses.dataclass(frozen=True)
class Scope:
    files_scanned: int
    files_with_counterpart: int
    containers_compared: int
    members_compared: int


def top_level_members(path, reader):
    """`{clase: {miembro}}` de las clases de NIVEL SUPERIOR de un archivo.

    Se toman de `top_level` las clases y de `symbols` sus funciones por
    `owner`, que es como se separa una clase de modulo de una anidada. Una
    clase sin funciones aparece con conjunto vacio: su ausencia sigue siendo un
    hallazgo, asi que no se puede omitir.
    """
    found = {sym.name: set() for sym in reader.top_level(path)
             if sym.kind == 'class'}
    for sym in reader.symbols(path):
        if sym.kind == 'function' and sym.owner in found:
            found[sym.owner].add(sym.name)
    return found


def _class_without_counterpart(presence, path, container, members, absolved):
    """El hallazgo de una clase que no existe aqui, o `None` si esta cubierta."""
    installed = presence.installed(container)
    already = ({presence.key_ours(m) for m in installed}
               if installed is not None else set())
    kind = CLASS_ABSENT if installed is None else CLASS_EXTENDED
    pending = []
    for member in sorted(members):
        key = presence.key_source(member, container, path)
        if key in already or key in absolved:
            continue
        pending.append(member)
    if members and not pending:
        return None
    if not members and kind == CLASS_EXTENDED:
        return None
    return Finding(kind, str(path), container, tuple(pending))


def _without_paired_file(presence, path, source):
    """Rama sin contraparte de archivo: solo la comparacion de ausencia."""
    findings, containers, compared = [], 0, 0
    if source and not any(presence.located(name) is not None
                          or presence.installed(name) is not None
                          for name in source):
        return [Finding(FILE_NOT_PORTED, str(path), '',
                        tuple(sorted(source)))], 0, 0
    for container, members in source.items():
        ours = presence.located(container)
        if ours is None:
            finding = _class_without_counterpart(
                presence, path, container, members, frozenset())
            if finding is not None:
                findings.append(finding)
            continue
        containers += 1
        compared += len(members)
        our_keys = {presence.key_ours(m) for m in ours}
        missing = [m for m in sorted(members)
                   if presence.key_source(m, container, path) not in our_keys]
        if missing:
            findings.append(
                Finding(MEMBERS_ABSENT, str(path), container, tuple(missing)))
    return findings, containers, compared


def _with_paired_file(presence, path, source, our_path, reader):
    """Rama con contraparte: los seis veredictos restantes."""
    findings, containers, compared = [], 0, 0
    in_file = {presence.key_container(name): ms
               for name, ms in top_level_members(our_path, reader).items()}
    from_file = presence.file_members(our_path)
    absolved = presence.absolved(our_path)
    for container, members in source.items():
        ours = in_file.get(presence.key_container(container))
        out_of_file = False
        if ours is None:
            ours = presence.located(container)
            out_of_file = ours is not None
        if ours is None:
            finding = _class_without_counterpart(
                presence, path, container, members, absolved)
            if finding is not None:
                findings.append(finding)
            continue
        if out_of_file:
            findings.append(
                Finding(CLASS_OUT_OF_FILE, str(path), container, ()))
        containers += 1
        compared += len(members)
        our_keys = {presence.key_ours(m) for m in ours}
        missing, out_of_place, demoted = [], [], []
        for member in sorted(members):
            key = presence.key_source(member, container, path)
            if key in our_keys:
                if presence.demoted(member, container, members, ours):
                    demoted.append(member)
                continue
            if key in absolved:
                continue
            (out_of_place if key in from_file else missing).append(member)
        for kind, group in ((MEMBERS_ABSENT, missing),
                            (OUT_OF_PLACE, out_of_place),
                            (DEMOTED, demoted)):
            if group:
                findings.append(
                    Finding(kind, str(path), container, tuple(group)))
    return findings, containers, compared


def compare_presence(source_paths, presence, counterpart, reader=None):
    """`(hallazgos, alcance)` recorriendo LA FUENTE, no nuestro arbol.

    `counterpart` va de una ruta de la fuente a la nuestra, o `None` — al reves
    que en los otros tres niveles, por la razon de la cabecera del modulo.
    """
    reader = reader or AstReader()
    findings, containers, compared = [], 0, 0
    scanned, paired = 0, 0
    for path in source_paths:
        scanned += 1
        source = top_level_members(path, reader)
        our_path = counterpart(path)
        if our_path is None:
            got, klasses, members = _without_paired_file(
                presence, path, source)
        else:
            paired += 1
            got, klasses, members = _with_paired_file(
                presence, path, source, our_path, reader)
        findings.extend(got)
        containers += klasses
        compared += members
    return findings, Scope(scanned, paired, containers, compared)
