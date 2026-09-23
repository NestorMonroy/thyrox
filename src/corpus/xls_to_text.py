#!/usr/bin/env python3
"""Vuelca un ``.xls`` heredado (BIFF8) a texto delimitado.

Cuarto lector del corpus. El contenedor lo abre ``cfb.py``; aqui vive el
**vocabulario**, que es otra cosa: BIFF es un flujo de registros binarios, no
un arbol de XML como sus tres hermanos.

Por que existe — la cuenta, corregida, esta en ``cfb.py``
=========================================================

Este modulo es el **piso**: lee BIFF8 sin instalar nada, asi que un clon
recien bajado abre un ``.xls`` sin mas. El convertidor —LibreOffice Calc, 52
paquetes— es el **ensanche**: cubre BIFF5, ``.ods``, formulas evaluadas y
formatos, que son las cuatro cosas que la seccion «Lo que NO hace» de abajo
declara. No compiten.

La primera version de este docstring justificaba el modulo con un cociente
—*"274.6 MB para leer 16 KB"*— que usa el denominador equivocado: instalar es
un costo **fijo**, leer se repite. La correccion completa esta en ``cfb.py``.

Las cinco trampas, y cuales ejercita el archivo real
====================================================

Medido sobre la consulta del Banco de Informacion Economica del INEGI que
origina este modulo::

    LABELSST 175 · ROW 91 · NUMBER 82 · XF 33 · FORMAT 8 · BOUNDSHEET 1
    SST: 3410 B, 175 totales / 94 unicas, seguida de EXTSST (no CONTINUE)
    primeras 40 cadenas: 40 comprimidas, 0 en UTF-16

=== ============================== ================== ==========================
#   Trampa                         ¿En este archivo?  Que pasa si se ignora
=== ============================== ================== ==========================
1   ``LABELSST`` es un **indice**  **si**, 175 veces  salen enteros donde van
    a la tabla de cadenas                             palabras
2   la cadena es **comprimida o    solo comprimidas   mojibake, o NULs
    UTF-16** segun una bandera                        intercalados
3   la SST se parte en             **no**             la tabla se trunca y todo
    ``CONTINUE``                                      indice alto falla
4   ``RK`` empaqueta el numero     **no**             un 30.2 se publica como
    en 30 bits con dos banderas                       3020, sin aviso
5   ``MULRK`` trae **varias**      **no**             N-1 columnas vacias
    celdas en un registro
=== ============================== ================== ==========================

Las tres que este archivo no trae se implementan igual y su fixture es
sintetico: **la siguiente consulta del mismo banco puede traerlas**, y las
tres fallan en silencio. Declarar cual se probo contra que es la mitad que
hace legible el verde.

Lo que NO hace, declarado
=========================

- **Solo BIFF8** (``0x0600``). Un ``.xls`` de Excel 5/95 usa BIFF5 con otra
  codificacion de cadenas; se rehusa nombrando la version.
- **No evalua formulas.** Un ``FORMULA`` trae su valor cacheado y se toma
  ese; si el archivo no lo guardo, la celda sale vacia.
- **No convierte fechas seriales ni aplica formatos.** Un 45678 es un 45678:
  distinguirlo exigiria leer ``XF`` y ``FORMAT``, que es el eje que el
  convertidor pesado si cubre.
- **No descifra** ni lee hojas protegidas.

Uso
---

    bash bin/xls_to_text ENTRADA [SALIDA]
"""
from __future__ import annotations

import argparse
import pathlib
import struct
import sys

from corpus import cfb

#: El flujo que lleva el libro. Excel 5 lo llamaba `Book`.
WORKBOOK_STREAMS = ("Workbook", "Book")

#: Version de BIFF que este modulo entiende.
BIFF8 = 0x0600

BOF, EOF = 0x0809, 0x000A
SST, CONTINUE, EXTSST = 0x00FC, 0x003C, 0x00FF
LABELSST, LABEL, RK, MULRK, NUMBER = 0x00FD, 0x0204, 0x027E, 0x00BD, 0x0203
BLANK, MULBLANK, FORMULA, ROW = 0x0201, 0x00BE, 0x0006, 0x0208

#: Con que se reemplaza un separador que aparezca DENTRO de una celda.
TAB_REPLACEMENT = " "

#: Marcas con que una hoja de estadistica oficial encabeza lo que NO es dato:
#: la metodologia, el cambio de instrumento, la fuente. Se usan para AVISAR,
#: no para filtrar — el volcado sale entero.
NOTE_MARKERS = ("nota", "notas y llamadas", "fuente:", "llamada",
                "advertencia", "metodolog")


class NotAWorkbook(ValueError):
    """No es un libro BIFF. No es «el libro venia vacio»."""


def records(stream: bytes):
    """Los registros del flujo, como ``(codigo, carga)``.

    Un ``CONTINUE`` se devuelve tal cual: **quien lo consume decide si
    pertenece al registro anterior**, porque la respuesta depende del
    registro y no del flujo.
    """
    p, total = 0, len(stream)
    while p + 4 <= total:
        op, ln = struct.unpack_from("<HH", stream, p)
        p += 4
        yield op, stream[p:p + ln]
        p += ln


def _unpack_strings(body: bytes, how_many: int, extra: list[bytes]) -> list[str]:
    """La tabla de cadenas, siguiendo sus continuaciones.

    Dos cosas la hacen fragil y las dos estan medidas en el docstring del
    modulo: la **bandera** de compresion por cadena, y que una cadena puede
    quedar **partida** entre un registro y su ``CONTINUE`` — y la
    continuacion **repite el byte de banderas**, asi que la segunda mitad
    puede venir con otra codificacion que la primera.
    """
    chunks = [body] + extra
    gathered: list[str] = []
    ti, p = 0, 8                      # tras `total` y `unicas`
    data = chunks[0]

    def advance():
        nonlocal ti, p, data
        ti += 1
        if ti >= len(chunks):
            return False
        data, p = chunks[ti], 0
        return True

    while len(gathered) < how_many:
        while p + 3 > len(data):
            if not advance():
                return gathered
        cch, flags = struct.unpack_from("<HB", data, p)
        p += 3
        rich = flags & 0x08
        far = flags & 0x04
        n_ric = n_lej = 0
        if rich:
            n_ric = struct.unpack_from("<H", data, p)[0]; p += 2
        if far:
            n_lej = struct.unpack_from("<i", data, p)[0]; p += 4

        pieces, missing, width = [], cch, 2 if flags & 0x01 else 1
        while missing:
            present = (len(data) - p) // width
            take = min(missing, present)
            raw = data[p:p + take * width]
            pieces.append(raw.decode("utf-16-le" if width == 2 else "latin-1",
                                       "replace"))
            p += take * width
            missing -= take
            if missing:
                if not advance():
                    break
                # La continuacion REPITE la bandera; puede cambiar de ancho.
                width = 2 if data[0] & 0x01 else 1
                p = 1
        gathered.append("".join(pieces))
        # Los extras de formato van DESPUES del texto y hay que saltarlos, o
        # la cadena siguiente arranca desalineada y la tabla entera se
        # corrompe desde ahi.
        p += n_ric * 4 + n_lej
    return gathered


def _rk(v: int) -> float:
    """Un numero RK: 30 bits utiles y dos banderas.

    - bit 0: el valor va **dividido entre 100**.
    - bit 1: los 30 bits son un **entero con signo**; si no, son los 30 bits
      altos de un ``double`` IEEE y los 34 bajos son cero.
    """
    if v & 0x02:
        n = v >> 2
        if n & 0x20000000:
            n -= 0x40000000
        x = float(n)
    else:
        x = struct.unpack("<d", struct.pack("<Q", (v & 0xFFFFFFFC) << 32))[0]
    return x / 100.0 if v & 0x01 else x


def _num(x: float) -> str:
    """Un numero como texto, sin cola de ceros ni notacion cientifica."""
    if x == int(x) and abs(x) < 1e15:
        return str(int(x))
    return repr(round(x, 10))


def rows_from_stream(stream: bytes) -> list[list[str]]:
    """Las filas de la PRIMERA hoja del flujo, con sus huecos conservados."""
    all = list(records(stream))
    if not all or all[0][0] != BOF:
        raise NotAWorkbook("el flujo no empieza con un BOF: no es BIFF")
    version = struct.unpack_from("<H", all[0][1], 0)[0] if len(all[0][1]) >= 2 else 0
    if version != BIFF8:
        raise NotAWorkbook(
            "es BIFF version 0x%04X y este lector solo entiende BIFF8 (0x%04X)"
            % (version, BIFF8))

    # La SST vive en los globales y las celdas en la hoja, asi que se recorre
    # una vez para la tabla y otra para las celdas.
    table: list[str] = []
    for i, (op, load) in enumerate(all):
        if op != SST:
            continue
        how_many = struct.unpack_from("<i", load, 4)[0]
        extra = []
        for op2, load2 in all[i + 1:]:
            if op2 != CONTINUE:
                break
            extra.append(load2)
        table = _unpack_strings(load, how_many, extra)
        break

    per_row: dict[int, list[str]] = {}

    def put(row: int, col: int, text: str):
        cells = per_row.setdefault(row, [])
        while len(cells) <= col:
            cells.append("")
        cells[col] = text

    in_sheet = False
    for op, load in all[1:]:
        if op == BOF:
            in_sheet = True
            continue
        if op == EOF and in_sheet:
            if per_row:
                break
            continue
        if not in_sheet or len(load) < 4:
            continue
        row, col = struct.unpack_from("<HH", load, 0)
        if op == LABELSST:
            idx = struct.unpack_from("<i", load, 6)[0]
            put(row, col, table[idx] if 0 <= idx < len(table) else "")
        elif op == NUMBER:
            put(row, col, _num(struct.unpack_from("<d", load, 6)[0]))
        elif op == RK:
            put(row, col, _num(_rk(struct.unpack_from("<I", load, 6)[0])))
        elif op == MULRK:
            last_one = struct.unpack_from("<H", load, len(load) - 2)[0]
            for k in range(last_one - col + 1):
                v = struct.unpack_from("<I", load, 4 + k * 6 + 2)[0]
                put(row, col + k, _num(_rk(v)))
        elif op == LABEL:
            cch = struct.unpack_from("<H", load, 6)[0]
            flags = load[8]
            raw = load[9:9 + cch * (2 if flags & 0x01 else 1)]
            put(row, col, raw.decode(
                "utf-16-le" if flags & 0x01 else "latin-1", "replace"))
        elif op == FORMULA:
            # El valor cacheado: si los bytes 12-13 son 0xFFFF no es numero.
            if len(load) >= 14 and struct.unpack_from("<H", load, 12)[0] != 0xFFFF:
                put(row, col, _num(struct.unpack_from("<d", load, 6)[0]))

    if not per_row:
        return []
    return [per_row.get(i, []) for i in range(max(per_row) + 1)]


def rows(origen) -> list[list[str]]:
    """Las filas del libro que vive dentro del archivo compuesto."""
    try:
        document = cfb.open_compound(origen)
    except cfb.NotCompoundFile as err:
        raise NotAWorkbook(str(err)) from err
    for name_text in WORKBOOK_STREAMS:
        if name_text in document.names():
            return rows_from_stream(document.stream(name_text))
    raise NotAWorkbook(
        "el archivo compuesto no trae un flujo Workbook. Trae: %s"
        % ", ".join(repr(n) for n in document.names()))


def note_rows(row_list: list[list[str]]) -> list[int]:
    """Los indices de las filas que encabezan una NOTA, no un dato.

    Existe por un episodio propio: la serie de informalidad se agrego con un
    filtro por patron de periodo, y con eso se salto la seccion «Notas y
    Llamadas» — que era donde el archivo declaraba que sus 82 trimestres
    vienen de **cuatro instrumentos distintos**. El volcado estaba completo;
    la lectura fue selectiva.

    Un filtro que selecciona las filas «de datos» descarta, por construccion,
    las filas que dicen **como hay que leer los datos**. Este detector no
    filtra nada: sirve para que la herramienta lo **avise**.

    *Metrica:* filas cuya primera celda no vacia empieza con una de
    ``NOTE_MARKERS``.
    *Ciega a:* una nota que no se encabece —un parrafo suelto en medio de la
    tabla— y a una que use un rotulo que no este en la lista. Es una cota
    inferior: si avisa, hay notas; si calla, no prueba que no las haya.
    """
    gathered = []
    for i, row in enumerate(row_list):
        first_one = next((c.strip() for c in row if c.strip()), "")
        under = first_one.lower()
        if any(under.startswith(m) for m in NOTE_MARKERS):
            gathered.append(i)
    return gathered


def to_tsv(row_list: list[list[str]]) -> str:
    return "\n".join(
        "\t".join(c.replace("\t", TAB_REPLACEMENT).replace("\n", " ")
                  for c in row)
        for row in row_list)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("entrada", help="el .xls de origen")
    parser.add_argument("gathered", nargs="?", help="el .tsv de destino")
    args = parser.parse_args(argv)

    origen = pathlib.Path(args.entrada)
    if not origen.is_file():
        print("xls_to_text: no existe o no es un archivo: %s" % origen,
              file=sys.stderr)
        print("             NO se emite conteo.", file=sys.stderr)
        return 2
    try:
        row_list = rows(origen)
    except NotAWorkbook as err:
        print("xls_to_text: %s" % err, file=sys.stderr)
        print("             El sufijo del nombre NO decide.", file=sys.stderr)
        return 2

    text = to_tsv(row_list)
    if args.gathered:
        pathlib.Path(args.gathered).write_text(text, encoding="utf-8")
        print("escrito: %s" % args.gathered)
    else:
        print(text)
    print("filas: %d" % len(row_list), file=sys.stderr)

    notes = note_rows(row_list)
    if notes:
        print("", file=sys.stderr)
        print("AVISO: el archivo declara %d fila(s) de notas, y NO son dato."
              % len(notes), file=sys.stderr)
        print("       Leelas antes de agregar la serie: ahi es donde una hoja"
              " oficial", file=sys.stderr)
        print("       avisa de un cambio de instrumento, de base o de"
              " cobertura.", file=sys.stderr)
        for i in notes[:3]:
            first_one = next((c for c in row_list[i] if c.strip()), "")
            print("       fila %d: %s" % (i + 1, first_one[:90]), file=sys.stderr)
        if len(notes) > 3:
            print("       (%d mas)" % (len(notes) - 3), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
