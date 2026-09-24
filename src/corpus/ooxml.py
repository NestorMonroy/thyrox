#!/usr/bin/env python3
"""La capa de PAQUETE que comparten los lectores de OOXML de este arbol.

Se factoriza al llegar el **tercer** lector —`extract_pptx`, `xlsx_to_text` y
`docx_to_text`—, no antes: dos copias son una coincidencia y tres son un
mecanismo.

**Lo que comparten NO es el contenido.** DrawingML, SpreadsheetML y
WordprocessingML son vocabularios distintos y cada lector se queda con el
suyo; meter aqui «leer texto» obligaria a los tres a un modelo comun que
ninguno tiene. Lo que comparten es el **contenedor**:

- abrirlo y **rehusar** lo que no es un paquete, nombrando la parte que falta;
- resolver una **relacion** (`.rels`), que es la indireccion que los tres
  necesitan y que los tres resolvian por su cuenta;
- los espacios de nombres del empaquetado, que no son los del contenido.

*Metrica:* llamadas a `zipfile.ZipFile` y parseos de `Relationships` en
`src/corpus/`.
*Ciega a:* un lector que abra el paquete por otra via —no hay ninguno hoy—, y
a las partes cifradas, que este modulo no distingue de las ilegibles.
"""
from __future__ import annotations

import pathlib
import posixpath
import xml.etree.ElementTree as ET
import zipfile

#: El espacio de nombres del EMPAQUETADO. No es el del contenido, y
#: confundirlos es como no encontrar ninguna relacion en un paquete que las
#: tiene todas.
PKG_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"

#: La parte que todo paquete OOXML declara. Su ausencia es el discriminador
#: entre «un ZIP» y «un paquete».
PACKAGE_MANIFEST = "_rels/.rels"


class NotOoxml(ValueError):
    """No es un paquete OOXML. No es «el paquete venia vacio»."""


def open_package(source, *, require: str | None = None) -> zipfile.ZipFile:
    """Abre el paquete, o REHUSA nombrando lo que falta.

    ``require`` es la parte obligatoria del formato concreto
    —``word/document.xml``, ``xl/workbook.xml``—. Se nombra en el rechazo
    porque mandar a mirar «el paquete» no es un remedio.
    """
    source = pathlib.Path(source)
    try:
        file_path = zipfile.ZipFile(source)
    except (zipfile.BadZipFile, OSError) as err:
        raise NotOoxml("no es un ZIP: %s (%s)" % (source, err)) from err
    parts = file_path.namelist()
    if PACKAGE_MANIFEST not in parts:
        file_path.close()
        raise NotOoxml("es un ZIP y no un paquete OOXML: le falta %s"
                       % PACKAGE_MANIFEST)
    if require is not None and require not in parts:
        file_path.close()
        raise NotOoxml("es un paquete OOXML de otro tipo: le falta %s"
                       % require)
    return file_path


def rels_part_of(part: str) -> str:
    """Donde vive el `.rels` de una parte: ``word/_rels/document.xml.rels``."""
    folder, name_text = posixpath.split(part)
    return posixpath.join(folder, "_rels", name_text + ".rels")


def relationships(file_path: zipfile.ZipFile, part: str) -> dict[str, str]:
    """Las relaciones de una parte, como ``{Id: ruta dentro del paquete}``.

    Un ``Target`` es **relativo a la carpeta de la parte que lo declara**, no
    a la raiz del paquete: ``header1.xml`` dentro de ``word/_rels/`` es
    ``word/header1.xml``. Resolverlo contra la raiz busca una parte que no
    existe, y el fallo sale como «no encontre el encabezado» en vez de como
    lo que es.

    Una parte sin `.rels` devuelve un mapa vacio: es legitimo, no un error.
    """
    path = rels_part_of(part)
    if path not in file_path.namelist():
        return {}
    base = posixpath.dirname(part)
    output: dict[str, str] = {}
    for rel in ET.fromstring(file_path.read(path)):
        target = rel.get("Target", "")
        if not target or rel.get("TargetMode") == "External":
            continue
        if target.startswith("/"):
            output[rel.get("Id")] = target[1:]
        else:
            output[rel.get("Id")] = posixpath.normpath(
                posixpath.join(base, target))
    return output
