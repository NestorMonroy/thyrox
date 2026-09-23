#!/usr/bin/env python3
"""Vuelca un ``.xlsx`` a texto delimitado, hoja por hoja.

Un ``.xlsx`` es un ZIP de XML, igual que el ``.pptx`` que ``extract_pptx.py``
ya lee en este arbol. Por eso **no anade ninguna dependencia**: lo abre
``zipfile`` y lo recorre ``xml.etree``, los dos de la biblioteca estandar.

Medido antes de escribirlo, que es lo que vuelve la carencia un hecho:
``openpyxl``, ``pandas``, ``xlrd`` y ``odfpy`` los cuatro ausentes, y ningun
``bin/`` que lea una hoja de calculo.

Por que la biblioteca estandar y no una dependencia
===================================================

=====================  ==============  ================================
Eje                    aqui            la alternativa
=====================  ==============  ================================
descarga               **0 B**         268 969 B (``openpyxl`` + ``et-xmlfile``)
paquetes               **0**           2, o 54 si se usa LibreOffice
precedente en el arbol **si**          no
=====================  ==============  ================================

**Corregido 2026-09-21.** Aqui decia *"LibreOffice ya esta instalado —215 154
KB en 54 paquetes— y convierte .xlsx a CSV sin instalar nada"*. Las dos
mitades eran falsas, y por la misma razon: se midio el **nombre** y se
concluyo sobre la **capacidad**.

- ``command -v libreoffice`` resuelve, y es un enlace a un envoltorio de
  6656 bytes. El filtro de Calc (``libscfiltlo.so``) **no existe**.
- La cifra contaba los paquetes que el patron ``libreoffice*`` **casa** en la
  base de dpkg, no los que estan en estado ``installed``. Medido: **54
  nombres conocidos, 0 instalados**.
- Y convertir de verdad falla: ``soffice --convert-to csv`` sobre el ``.xlsx``
  real sale **0** y no produce ni un archivo; con el perfil explicito imprime
  ``Error: source file could not be loaded`` **y sigue saliendo 0**.

La cifra no se sustituye por otra: **se retira y se nombra el comando**, que
es lo que `calibration-verified-numbers.md` exige para una propiedad de un
artefacto vivo. Quien quiera el estado de hoy lo mide::

    bash src/verify/check-toolchain-ready.sh          # la sonda, por conducta
    dpkg-query -W -f='${Package} ${Status}\n' 'libreoffice*' | gawk '$3=="installed"'

El eje de conversion vive en ``thyrox_toolchain_require_spreadsheet
--calculado``, que lo mide **convirtiendo una hoja y mirando el archivo que
salio** — nunca el codigo de salida, por lo de arriba.

**Lo que la biblioteca SI compraria** es lo que este modulo no hace: formulas
evaluadas, formatos de celda, fechas seriales convertidas y hojas protegidas.
Si alguna vez hace falta un valor calculado que el archivo no guarde, este
modulo no alcanza — y eso es una frontera, no un defecto.

**El `.xls` heredado NO es esa frontera**, aunque lo parezca: no es OOXML
—es un contenedor OLE2 con registros BIFF— y por eso vive en
``xls_to_text.py``, tambien sin dependencia. Un archivo con sufijo ``.xls``
que llegue aqui se rechaza por sus bytes, no por su nombre, y ese es el
modulo al que hay que ir.

Las cuatro trampas del formato
==============================

Ninguna es la del ``.pptx``, asi que el precedente da la forma y no el
contenido:

1. **Una celda ``t="s"`` guarda un INDICE**, no el texto: el texto vive en
   ``xl/sharedStrings.xml``. Es la mas traicionera porque el volcado mal
   hecho sale **lleno de enteros plausibles** que se leen como datos y son
   punteros. Nada en la salida lo delata.
2. **Una fila OMITE sus celdas vacias.** La posicion sale del atributo ``r``
   de la celda (``B7``), no de su orden. Leer en orden corre la tabla a la
   izquierda y deja cada dato bajo el encabezado equivocado — y los cuadros
   del INEGI llevan columnas vacias de separacion, asi que el defecto es
   seguro, no hipotetico.
3. **El nombre visible de la hoja vive en ``xl/workbook.xml``** y llega a su
   archivo por el ``.rels``. Es la misma indireccion que ``extract_pptx``
   documenta para las notas de una diapositiva.
4. **``t="inlineStr"``** guarda el texto dentro de la celda, en ``<is><t>``,
   sin pasar por la tabla compartida.

Lo que NO hace, declarado
=========================

- **No interpreta el contenido.** Vuelca entero y quien lea decide que es
  relevante: comprimir aqui seria elegir que NO se analiza.
- **No evalua formulas.** Devuelve el ultimo valor que el archivo guardo
  (``<v>``); si el archivo no lo guardo, la celda sale vacia.
- **No convierte fechas seriales.** Un 45678 es un 45678: sin leer
  ``styles.xml`` no se sabe si es un numero o un dia.

Uso
---

    bash bin/xlsx_to_text ENTRADA [SALIDA]
    bash bin/xlsx_to_text ENTRADA --sheet "Cuadro 1"
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

from corpus import ooxml

#: Espacio de nombres de SpreadsheetML — donde viven filas, celdas y la tabla
#: de cadenas compartidas.
SML = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

#: Espacio de nombres de las relaciones, que es OTRO y por eso el `r:id` de
#: una hoja no se lee con el de arriba.
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

WORKBOOK = "xl/workbook.xml"
WORKBOOK_RELS = "xl/_rels/workbook.xml.rels"
SHARED_STRINGS = "xl/sharedStrings.xml"

CELL_REF = re.compile(r"^([A-Z]+)")

#: Con que se reemplaza un separador que aparezca DENTRO de una celda. Un TSV
#: cuyo delimitador este en el dato es un TSV roto, y el cuadro se lee con una
#: columna de mas sin que nada avise.
TAB_REPLACEMENT = " "


#: El rechazo lo declara la capa de paquete. Se conserva el nombre local
#: —y como ALIAS, no como clase aparte— porque `NotAWorkbook` es lo que este
#: modulo prometio a sus llamadores; una segunda clase obligaria a capturar
#: dos cosas para el mismo fenomeno.
NotAWorkbook = ooxml.NotOoxml


def column_index(ref: str) -> int:
    """La columna de una referencia de celda, base 0. ``AA3`` es la 26.

    Es base 26 **biyectiva** —no hay digito cero—, asi que `A`..`Z` valen 1..26
    y `AA` vale 27. Una conversion que solo mire la ultima letra manda la
    columna 27 a la 1 y pisa el dato que ya estaba ahi.
    """
    letters = CELL_REF.match(ref.upper())
    if not letters:
        raise ValueError("referencia de celda sin columna: %r" % ref)
    n = 0
    for c in letters.group(1):
        n = n * 26 + (ord(c) - ord("A") + 1)
    return n - 1


def _open(origen) -> zipfile.ZipFile:
    """Abre el libro por la capa compartida, que ya rehusa y nombra."""
    return ooxml.open_package(origen, require=WORKBOOK)


def shared_strings(file_path: zipfile.ZipFile) -> list[str]:
    """La tabla de cadenas. Vacia si el libro no la trae — es legitimo."""
    if SHARED_STRINGS not in file_path.namelist():
        return []
    raiz = ET.fromstring(file_path.read(SHARED_STRINGS))
    # Una entrada puede venir partida en varios `<r>` cuando cambia el
    # formato a media frase; se juntan sus `<t>` o la frase sale troceada.
    return ["".join(t.text or "" for t in si.iter(SML + "t"))
            for si in raiz.iter(SML + "si")]


def sheets(origen) -> list[tuple[str, str]]:
    """Las hojas como ``(nombre visible, ruta dentro del paquete)``.

    El nombre sale de ``workbook.xml`` y la ruta del ``.rels``: el nombre del
    archivo interno (``sheet1.xml``) no es el nombre de la hoja, ni su orden
    tiene por que coincidir.
    """
    file_path = _open(origen)
    targets = ooxml.relationships(file_path, WORKBOOK)
    sheets = []
    raiz = ET.fromstring(file_path.read(WORKBOOK))
    for sheet_name_value in raiz.iter(SML + "sheet"):
        path = targets.get(sheet_name_value.get(REL + "id"))
        if path is None:
            continue
        sheets.append((sheet_name_value.get("name", ""), path))
    return sheets


def _cell_text(cell, table: list[str]) -> str:
    kind = cell.get("t")
    if kind == "s":                       # trampa 1: es un INDICE
        v = cell.find(SML + "v")
        if v is None or not (v.text or "").strip():
            return ""
        try:
            return table[int(v.text)]
        except (ValueError, IndexError):
            return ""
    if kind == "inlineStr":               # trampa 4: el texto va dentro
        return "".join(t.text or "" for t in cell.iter(SML + "t"))
    if kind == "str":                     # resultado de formula, ya texto
        v = cell.find(SML + "v")
        return (v.text or "") if v is not None else ""
    v = cell.find(SML + "v")
    return (v.text or "") if v is not None else ""


def rows(origen, sheet: str | None = None) -> list[list[str]]:
    """Las filas de una hoja, con sus huecos conservados.

    ``sheet`` es el nombre visible; si se omite, la primera hoja del libro.
    """
    file_path = _open(origen)
    sheet_list = sheets(origen)
    if not sheet_list:
        raise NotAWorkbook("el libro no declara ninguna hoja")
    path = next((r for n, r in sheet_list if n == sheet), None) if sheet else sheet_list[0][1]
    if path is None:
        raise KeyError("el libro no tiene una hoja llamada %r" % sheet)

    raiz = ET.fromstring(file_path.read(path))
    table = shared_strings(file_path)
    per_row: dict[int, list[str]] = {}
    for row in raiz.iter(SML + "row"):
        # Trampa 2, eje de las filas: una fila omitida no desplaza al resto.
        try:
            index = int(row.get("r", "0")) - 1
        except ValueError:
            continue
        cells: list[str] = []
        for cell in row.iter(SML + "c"):
            ref = cell.get("r")
            # Trampa 2, eje de las columnas: la posicion es del atributo `r`.
            col = column_index(ref) if ref else len(cells)
            while len(cells) < col:
                cells.append("")
            text = _cell_text(cell, table).strip()
            if len(cells) == col:
                cells.append(text)
            else:
                cells[col] = text
        per_row[index] = cells
    if not per_row:
        return []
    return [per_row.get(i, []) for i in range(max(per_row) + 1)]


def to_tsv(row_list: list[list[str]]) -> str:
    return "\n".join(
        "\t".join(c.replace("\t", TAB_REPLACEMENT).replace("\n", " ")
                  for c in row)
        for row in row_list)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("entrada", help="el .xlsx de origen")
    parser.add_argument("salida", nargs="?", help="el .tsv de destino")
    parser.add_argument("--sheet", help="el nombre visible de una hoja")
    args = parser.parse_args(argv)

    origen = pathlib.Path(args.entrada)
    if not origen.is_file():
        print("xlsx_to_text: no existe o no es un archivo: %s" % origen,
              file=sys.stderr)
        print("              NO se emite conteo.", file=sys.stderr)
        return 2
    try:
        sheet_list = sheets(origen)
    except NotAWorkbook as err:
        print("xlsx_to_text: %s" % err, file=sys.stderr)
        print("              El sufijo del nombre NO decide.", file=sys.stderr)
        return 2

    parts, total = [], 0
    for name_text, _ in sheet_list:
        if args.sheet and name_text != args.sheet:
            continue
        row_list = rows(origen, name_text)
        total += len(row_list)
        parts.append("### %s\n%s" % (name_text, to_tsv(row_list)))
    if args.sheet and not parts:
        print("xlsx_to_text: el libro no tiene una hoja %r. Tiene: %s"
              % (args.sheet, ", ".join(n for n, _ in sheet_list)), file=sys.stderr)
        return 2

    text = "\n\n".join(parts)
    if args.salida:
        pathlib.Path(args.salida).write_text(text, encoding="utf-8")
        print("escrito: %s" % args.salida)
    else:
        print(text)
    print("hojas: %d · filas: %d" % (len(parts), total), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
