#!/usr/bin/env python3
"""Vuelca el texto de un ``.docx``, conservando sus tablas.

Tercer lector de OOXML del arbol, tras ``extract_pptx`` y ``xlsx_to_text``, y
el que obligo a factorizar el paquete en ``ooxml.py``. **No anade ninguna
dependencia**: lo abre ``zipfile`` y lo recorre ``xml.etree``.

Medido antes de escribirlo: ``python-docx``, ``odfpy`` y ``mammoth`` los tres
ausentes, y ningun ``bin/`` que lea un documento.

Las cuatro trampas, medidas SOBRE EL ARCHIVO REAL
=================================================

No son las del ``.pptx`` ni las del ``.xlsx``. Contadas en el
``word/document.xml`` del boletin de la ENOE que origina este modulo::

    w:p 1851 · w:r 5082 · w:t 5015 · w:tbl 8 · w:tr 201 · w:tc 1675 · w:tab 1575

1. **Un parrafo esta partido en tramos.** 5082 ``w:r`` para 5015 ``w:t``: el
   formato corta una frase cada vez que cambia la negrita. Leer los tramos
   sueltos devuelve la frase troceada.
2. **El tabulador es un ELEMENTO, no texto.** ``<w:tab/>`` aparece **1575
   veces** en este unico documento. Un lector que solo tome ``w:t`` pega las
   palabras entre si 1575 veces, y ``Indicador61676698`` deja de ser
   greppeable. Es la trampa que mas dano hace aqui.
3. **Una tabla no se aplana.** 8 tablas con 1675 celdas. ``iter(w:p)``
   devuelve tambien los parrafos de dentro de las celdas, asi que el cuadro
   sale como una lista de numeros huerfanos: el dato pierde su fila y su
   columna, y ya no se sabe de que indicador es.
4. **El orden del documento importa.** Recorrer primero los parrafos y
   despues las tablas deja el encabezado de un cuadro lejos de su cuadro.

Y dos guardas que este archivo no necesita y el siguiente si:
``w:delText`` es texto **eliminado** con control de cambios —volcarlo
resucita como vigente lo que alguien retiro— y ``w:instrText`` es el **codigo**
de un campo (``PAGE``, ``TOC``), no su resultado. Medido aqui: cero de cada
uno.

Lo que NO hace, declarado
=========================

- **Solo el cuerpo.** Encabezados, pies, notas al pie y notas al final son
  partes aparte del paquete y no se vuelcan. Este documento trae tres
  encabezados y dos partes de notas.
- **No interpreta.** Vuelca entero y quien lea decide que es relevante.
- **De una grafica solo devuelve lo CACHEADO.** Una grafica sin cache no se
  lee aqui: se nombra su libro incrustado y se lee con ``bin/xlsx_to_text``.
- **No dibuja.** Colores, ejes y etiquetas de la grafica no son el dato.

Las graficas, medidas aparte
============================

La cabecera de este modulo declaraba «no lee los graficos» hasta que llego
``EAP_MIPYMES_25.docx`` del INEGI, donde las cifras de equipo de computo,
internet y ventas por internet **por tamano de unidad** viven en graficas y
no en cuadros: volcar el cuerpo las pierde todas. Medido sobre ese archivo::

    graficas 10 · c:ser 24 · c:pt 186 · ptCount declarado 194
    sin ninguna serie en cache: chart3, chart9, chart10 (3 de 10)
    libros incrustados 8 · series filtradas (c15) 0 · multiLvlStrCache 0

1. **186 puntos contra 194 declarados.** En ``chart7`` dos series declaran
   cuatro valores y cachean cero. Ni se inventan ni se callan: se publican
   los dos numeros, ``declared`` y ``cached``.
2. **``c:pt`` lleva ``idx``.** Misma trampa que la celda dispersa del
   ``.xlsx``: un punto ausente corre a los siguientes una posicion y la
   categoria deja de corresponder a su valor.
3. **3 de 10 graficas no cachean y las 3 traen libro.** El dato existe, en
   ``word/embeddings/``. Devolver la lista vacia seria verde sobre cero.
4. **``c:tx`` aparece 5 veces en ``chart5`` para 1 serie.** El titulo de la
   grafica y los de los ejes tambien son ``c:tx``; solo cuenta como hijo
   DIRECTO de ``c:ser``.

Y el orden: con diez graficas, ordenar por nombre pone ``chart10`` entre
``chart1`` y ``chart2``, y la «Grafica 2» del documento deja de ser la
segunda.

*Metrica:* series cacheadas y puntos por serie, con su hueco declarado.
*Ciega a:* lo que una grafica muestra y no cachea, y al libro incrustado,
que se nombra y no se abre.

Uso
---

    bash bin/docx_to_text ENTRADA [SALIDA]
    bash bin/docx_to_text --charts ENTRADA
"""
from __future__ import annotations

import argparse
import dataclasses
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

from corpus import ooxml

#: El espacio de nombres de WordprocessingML.
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

#: El de las graficas. Una grafica vive en OTRA parte del paquete y en otro
#: vocabulario: no hay un solo elemento `w:` dentro de un `chart1.xml`.
C = "{http://schemas.openxmlformats.org/drawingml/2006/chart}"

#: Y el titulo de la grafica esta en un TERCERO. `a:t` es DrawingML, el
#: mismo que usa el `.pptx`: buscarlo bajo `C` no encuentra ningun titulo.
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"

#: El sufijo de las extensiones de Microsoft que cachean las series
#: **filtradas** —`c15:filteredBarSeries`—. Es la hermana de `w:delText`:
#: una serie que alguien quito de la grafica sigue entera en el XML.
FILTERED = "Series"

DOCUMENT = "word/document.xml"

#: Donde viven las partes de grafica dentro del paquete.
CHART_DIR = "word/charts/"

#: Con que se reemplaza un tabulador DENTRO de una celda. Una celda cuyo
#: texto lleve el separador parte la columna y el cuadro se lee con una de
#: mas, sin que nada avise. Es la misma guarda que `xlsx_to_text` ya tiene.
TAB_IN_CELL = " "


def _run_text(run) -> str:
    """El texto de un tramo, con sus elementos no textuales resueltos."""
    pieces: list[str] = []
    for child in run:
        label = child.tag
        if label == W + "t":
            pieces.append(child.text or "")
        elif label == W + "tab":
            pieces.append("\t")
        elif label in (W + "br", W + "cr"):
            pieces.append("\n")
        elif label == W + "noBreakHyphen":
            pieces.append("-")
        # `w:delText` (texto eliminado) y `w:instrText` (codigo de campo) se
        # omiten a proposito: ninguno es contenido vigente.
    return "".join(pieces)


def paragraph_text(paragraph) -> str:
    """Un parrafo entero, juntando sus tramos.

    Se recorre en profundidad para no perder los tramos que viven dentro de
    un ``w:hyperlink`` o de un ``w:ins`` — este documento trae 8 hipervinculos
    y su texto es contenido como cualquier otro.
    """
    return "".join(_run_text(run) for run in paragraph.iter(W + "r"))


def _cell_text(cell) -> str:
    parts = [paragraph_text(p).strip() for p in cell.iter(W + "p")]
    text = " ".join(x for x in parts if x)
    return text.replace("\t", TAB_IN_CELL).replace("\n", " ")


def blocks(source) -> list[str]:
    """El cuerpo como bloques, en ORDEN de documento.

    Un parrafo es un bloque; una fila de tabla es un bloque con sus celdas
    separadas por tabulador. Los bloques vacios se descartan.
    """
    with ooxml.open_package(source, require=DOCUMENT) as file_path:
        root = ET.fromstring(file_path.read(DOCUMENT))
    body = root.find(W + "body")
    if body is None:
        return []

    gathered: list[str] = []
    # Se recorren los HIJOS del cuerpo en orden, no `iter(w:p)`: eso es lo
    # que conserva a la vez el orden (trampa 4) y la tabla (trampa 3).
    for node in body:
        if node.tag == W + "p":
            text = paragraph_text(node).strip()
            if text:
                gathered.append(text)
        elif node.tag == W + "tbl":
            for row in node.findall(W + "tr"):
                cells = [_cell_text(c) for c in row.findall(W + "tc")]
                if any(cells):
                    gathered.append("\t".join(cells))
    return gathered


@dataclasses.dataclass
class Series:
    """Una serie cacheada de una grafica, con su hueco declarado.

    ``declared`` es lo que el ``c:ptCount`` promete y ``cached`` lo que el
    XML trae de verdad. Los dos se publican porque **no coinciden**: en el
    archivo que origina esto son 194 contra 186.
    """

    name: str | None
    categories: list[str | None]
    values: list[float | None]
    declared: int
    cached: int

    @property
    def complete(self) -> bool:
        return self.declared == self.cached


@dataclasses.dataclass
class Chart:
    """Una parte de grafica del paquete.

    ``workbook`` es la ruta del libro incrustado DENTRO del paquete, no un
    archivo del disco. Se nombra y no se abre: leerlo es trabajo de
    ``bin/xlsx_to_text``, que ya existe.
    """

    part: str
    title: str | None
    series: list[Series]
    workbook: str | None


def _chart_parts(file_path) -> list[str]:
    """Las partes de grafica, en orden NUMERICO.

    Ordenar por nombre pone `chart10` entre `chart1` y `chart2`. Con diez
    graficas —las que trae el archivo real— la «Grafica 2» del documento
    deja de ser la segunda de la lista, y una cifra se atribuye al cuadro
    equivocado sin que nada avise.
    """
    parts = [n for n in file_path.namelist()
              if n.startswith(CHART_DIR) and n.endswith(".xml")
              and re.fullmatch(r"chart\d+\.xml", n[len(CHART_DIR):])]

    def key(name_text: str) -> int:
        return int(re.search(r"(\d+)", name_text[len(CHART_DIR):]).group(1))

    return sorted(parts, key=key)


def _cache_points(node):
    """Los puntos de un cache, COLOCADOS POR ``idx``.

    Devuelve ``(lista, declarados, cacheados)``. La lista tiene siempre el
    largo declarado y los huecos son ``None``: anexar en orden de documento
    corre los puntos que siguen a uno ausente y la categoria deja de
    corresponder a su valor.

    Un cache puede ser de cadenas (`c:strCache`) o de numeros
    (`c:numCache`); un eje de anos es el segundo, y mirar solo el primero
    deja la serie sin eje.
    """
    if node is None:
        return [], 0, 0
    cache = None
    for child in node.iter():
        if child.tag in (C + "strCache", C + "numCache"):
            cache = child
            break
    if cache is None:
        return [], 0, 0
    count = cache.find(C + "ptCount")
    declared = int(count.get("val", "0")) if count is not None else 0

    raw_ones: dict[int, str] = {}
    for point in cache.findall(C + "pt"):
        value = point.find(C + "v")
        if value is None:
            continue
        raw_ones[int(point.get("idx", "0"))] = value.text or ""

    length = max(declared, max(raw_ones) + 1 if raw_ones else 0)
    return [raw_ones.get(i) for i in range(length)], declared, len(raw_ones)


def _as_number(text):
    """Un valor de grafica como numero, o ``None``.

    Un `c:v` puede traer `#N/A` o venir vacio: es un HUECO de esa cifra, no
    un fallo del lector, y las demas de la serie siguen siendo buenas.
    """
    if text is None:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _series_name(one_series) -> str | None:
    """El nombre de una serie, buscado SOLO como hijo directo.

    `c:tx` tambien envuelve el titulo de la grafica y los de los ejes: en
    `chart5` del archivo real hay cinco `c:tx` para una sola serie, asi que
    un `iter` le pone a la serie el nombre del eje.
    """
    tx = one_series.find(C + "tx")
    if tx is None:
        return None
    literal = tx.find(C + "v")
    if literal is not None and literal.text:
        return literal.text.strip()
    texts, _, _ = _cache_points(tx)
    for piece in texts:
        if piece:
            return piece.strip()
    return None


def _chart_title(root) -> str | None:
    """El titulo, que vive en el vocabulario de DrawingML y no en el de la
    grafica, y que el formato parte en tramos igual que un parrafo."""
    chart = root.find(C + "chart")
    if chart is None:
        return None
    title_text = chart.find(C + "title")
    if title_text is None:
        return None
    pieces = [t.text or "" for t in title_text.iter(A + "t")]
    if not pieces:
        texts, _, _ = _cache_points(title_text)
        pieces = [t for t in texts if t]
    text = "".join(pieces).strip()
    return text or None


def _visible_series(root) -> list:
    """Las series VIGENTES: las que cuelgan de un tipo de grafica.

    Una serie que alguien quito se queda cacheada dentro de un `c:extLst`,
    bajo `c15:filteredBarSeries` y sus hermanas. Es la misma situacion que
    `w:delText` en el cuerpo: volcarla publica como vigente lo que no se ve
    en el documento. Medido en el archivo real: cero. La guarda se queda.
    """
    gathered = []
    area = root.find(C + "chart")
    area = area.find(C + "plotArea") if area is not None else None
    if area is None:
        return gathered
    for kind in area:
        if not kind.tag.endswith("Chart"):
            continue
        # `findall` y no `iter`: los hijos DIRECTOS del tipo de grafica.
        # Las filtradas cuelgan de un `c:extLst` de ese mismo tipo.
        gathered.extend(kind.findall(C + "ser"))
    return gathered


def _read_series(one_series) -> Series:
    cats, _, _ = _cache_points(one_series.find(C + "cat"))
    raw_ones, declared, cached_points = _cache_points(one_series.find(C + "val"))
    length = max(len(cats), len(raw_ones), declared)
    cats = cats + [None] * (length - len(cats))
    raw_ones = raw_ones + [None] * (length - len(raw_ones))
    return Series(name=_series_name(one_series),
                  categories=cats,
                  values=[_as_number(x) for x in raw_ones],
                  declared=declared,
                  cached=cached_points)


def charts(source) -> list[Chart]:
    """Las graficas del paquete, con lo que cada una CACHEA.

    Una lista vacia es «este documento no trae graficas», que es legitimo
    —el `.docx` del calendario del INEGI trae cero— y no un fallo. Una
    grafica con ``series`` vacia y ``workbook`` puesto es otra cosa: el dato
    existe y esta en el libro incrustado.
    """
    with ooxml.open_package(source, require=DOCUMENT) as file_path:
        gathered: list[Chart] = []
        for part_ref in _chart_parts(file_path):
            root = ET.fromstring(file_path.read(part_ref))
            workbook_ref = None
            for path in ooxml.relationships(file_path, part_ref).values():
                if path.lower().endswith((".xlsx", ".xls")):
                    workbook_ref = path
                    break
            gathered.append(Chart(
                part=part_ref,
                title=_chart_title(root),
                series=[_read_series(s) for s in _visible_series(root)],
                workbook=workbook_ref))
    return gathered


def format_charts(chart_list: list[Chart]) -> list[str]:
    """Las graficas como lineas, con el hueco de cada serie a la vista."""
    lines: list[str] = []
    for i, g in enumerate(chart_list, 1):
        lines.append("== %s%s" % (g.part, " - " + g.title if g.title else ""))
        if not g.series:
            # Verde sobre cero no es verde: una grafica que no cachea nada
            # no se publica como una grafica leida.
            lines.append("   SIN SUJETO: no cachea ninguna serie.")
            if g.workbook:
                lines.append("   el dato esta en el libro incrustado: %s"
                              % g.workbook)
                lines.append("   se lee con: bash bin/xlsx_to_text")
            else:
                lines.append("   y NO trae libro incrustado: aqui no hay "
                              "dato que recuperar.")
            continue
        for s in g.series:
            mark = "" if s.complete else ("  [%d de %d en cache]"
                                           % (s.cached, s.declared))
            lines.append("   serie: %s%s" % (s.name or "(sin nombre)", mark))
            for cat, val in zip(s.categories, s.values):
                lines.append("      %s\t%s" % (
                    cat if cat is not None else "(sin categoria)",
                    "(sin dato)" if val is None else val))
    return lines


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("entrada", help="el .docx de origen")
    parser.add_argument("gathered", nargs="?", help="el .txt de destino")
    parser.add_argument("--charts", action="store_true",
                        help="vuelca las series cacheadas de las graficas "
                             "en vez del cuerpo")
    args = parser.parse_args(argv)

    source = pathlib.Path(args.entrada)
    if not source.is_file():
        print("docx_to_text: no existe o no es un archivo: %s" % source,
              file=sys.stderr)
        print("              NO se emite conteo.", file=sys.stderr)
        return 2
    try:
        chart_list = charts(source) if args.charts else None
        block_list = format_charts(chart_list) if args.charts else blocks(source)
    except ooxml.NotOoxml as err:
        print("docx_to_text: %s" % err, file=sys.stderr)
        print("              El sufijo del nombre NO decide.", file=sys.stderr)
        return 2

    if args.charts and not chart_list:
        # Cero graficas es legitimo —el .docx del calendario del INEGI trae
        # cero— y NO es un volcado bueno de cero lineas.
        print("SIN SUJETO: el paquete no trae ninguna parte de grafica.")
        print("            No se emite conteo de series.", file=sys.stderr)
        return 0

    text = "\n".join(block_list)
    if args.gathered:
        pathlib.Path(args.gathered).write_text(text, encoding="utf-8")
        print("escrito: %s" % args.gathered)
    else:
        print(text)
    if args.charts:
        series = sum(len(g.series) for g in chart_list)
        gap_ones = sum(1 for g in chart_list if not g.series)
        incomplete = sum(1 for g in chart_list for s in g.series
                          if not s.complete)
        print("graficas: %d (%d sin serie en cache) · series: %d "
              "(%d con hueco)" % (len(chart_list), gap_ones, series, incomplete),
              file=sys.stderr)
        return 0
    with_table = sum(1 for b in block_list if "\t" in b)
    print("bloques: %d (%d con columnas)" % (len(block_list), with_table),
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
