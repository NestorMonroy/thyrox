#!/usr/bin/env python3
"""Vuelca el texto de un ``.doc`` binario de Word — el de antes del ``.docx``.

No es un ``.docx`` con el nombre viejo: es **OLE2/CFB**, el mismo contenedor
que el ``.xls`` legado, y ``zipfile`` no lo abre. El arbol ya tenia el
contenedor —``cfb.py``, escrito para el ``.xls`` del INEGI— y le faltaba el
cuerpo. Este modulo es ese cuerpo, y **no anade ninguna dependencia**.

Medido antes de escribirlo, sobre el ACUERDO de lineamientos del Plan Mexico
(DOF 21-mar-2025, 97 584 bytes)::

    firma d0cf11e0a1b11ae1 · flujos: WordDocument 48 195 · 1Table 15 346
    wIdent 0xa5ec · nFib 193 · fWhichTblStm 1
    ccpText 36 806 · ccpHdd 104 · piezas 1 (1 comprimida)
    0x0d 211 · 0x09 130 · 0x0c 4 · 0x03 2 · 0x04 2 · 0x07 0 · 0x13 0

Las cuatro trampas, y cual es real en este archivo
==================================================

1. **El texto NO es contiguo.** Un ``.doc`` guarda el cuerpo en **piezas**,
   y la tabla de piezas —el ``CLX`` del flujo de tabla— dice donde empieza
   cada una. Leer ``fcMin..fcMac`` de corrido devuelve, en un archivo
   editado, fragmentos borrados y piezas fuera de orden. *Medido aqui:* una
   sola pieza, asi que esta trampa **no muerde en este archivo** — y muerde
   en el siguiente, que es por lo que la tabla se lee igual.
2. **Cada pieza es CP1252 o UTF-16, y lo dice un BIT del desplazamiento.**
   El bit 30 de ``fc``: encendido, la pieza es de un byte por caracter y el
   desplazamiento real es ``(fc & ~0x40000000) / 2``. Leer una comprimida
   como UTF-16 no falla: devuelve basura legible a medias. Es la hermana de
   la cadena comprimida del BIFF8, que ``xls_to_text`` ya trata.
3. **Hay DOS flujos de tabla y uno es el bueno.** ``0Table`` y ``1Table``,
   y lo decide el bit 9 del campo de banderas. Elegir el otro **no da
   error**: da un ``CLX`` que no es un ``CLX``.
4. **El cuerpo termina en ``ccpText``.** Lo que sigue en el mismo flujo son
   notas al pie, encabezados y anotaciones. *Medido aqui:* **104
   caracteres** de encabezado —``DIARIO OFICIAL``, la fecha— que un lector
   sin la cota pega al final del documento como si fueran su cierre.

Y una guarda que este archivo no necesita y el siguiente si: entre ``0x13``
y ``0x14`` va el **codigo** de un campo (``PAGE``, ``REF``), no su
resultado. Es el mismo caso que ``w:instrText`` en el ``.docx``. *Medido
aqui:* cero.

*Metrica:* caracteres del cuerpo principal, hasta ``ccpText``.
*Ciega a:* el formato —negritas, estilos, que fila de que tabla—, a las
notas y encabezados que deliberadamente no vuelca, y a las imagenes.

Uso
---

    bash bin/doc_to_text ENTRADA [SALIDA]
"""
from __future__ import annotations

import argparse
import pathlib
import struct
import sys

from corpus import cfb

#: La firma del flujo principal de un `.doc`. Su ausencia es el
#: discriminador entre «un CFB» y «un documento de Word»: un `.xls` es
#: tambien un CFB y no tiene ninguna de estas partes.
W_IDENT = 0xA5EC

MAIN_STREAM = "WordDocument"

#: Bit 9 del campo de banderas del FIB. Decide `0Table` o `1Table`.
F_WHICH_TBL_STM = 0x0200

#: Donde vive cada cosa en el FIB de Word 97 (nFib 193).
OFF_IDENT = 0x0000
OFF_FLAGS = 0x000A
OFF_CCP_TEXT = 0x004C
#: `rgFcLcb` empieza aqui, y `fcClx`/`lcbClx` son su par 33 — indices 66 y
#: 67. El numero magico se declara porque no se deduce de nada.
OFF_RG_FC_LCB = 0x009A
IDX_FC_CLX = 66

#: Bit 30 del `fc` de una pieza: encendido, la pieza es CP1252.
FC_COMPRESSED = 0x40000000

#: Marcas de campo. Entre el inicio y el separador va el CODIGO.
FIELD_BEGIN, FIELD_SEPARATOR, FIELD_END = "\x13", "\x14", "\x15"

#: Que hacer con cada caracter de control del cuerpo.
CONTROL_MAP = {
    "\r": "\n",      # fin de parrafo
    "\x07": "\n",    # fin de celda o de fila
    "\x0b": "\n",    # salto de linea dentro del parrafo
    "\x0c": "\n",    # salto de pagina
    "\x0e": "\n",    # fin de columna
    "\t": "\t",      # el tabulador SI es contenido: 130 en este archivo
}


class NotWordDocument(ValueError):
    """Es un CFB y no es un documento de Word. No es «venia vacio»."""


def _table_stream_name(flags: int) -> str:
    return "1Table" if flags & F_WHICH_TBL_STM else "0Table"


def _piece_table(table: bytes, fc_clx: int, lcb_clx: int):
    """Las piezas, como ``(cp_inicio, cp_fin, desplazamiento, comprimida)``.

    El ``CLX`` puede empezar con uno o varios ``Prc`` —propiedades— antes
    del ``Pcdt``. Saltarlos no es opcional: leer el primero como si fuera la
    tabla interpreta un tamano de propiedades como un numero de piezas.
    """
    clx = table[fc_clx:fc_clx + lcb_clx]
    i = 0
    while i < len(clx) and clx[i] == 1:
        cb = struct.unpack_from("<h", clx, i + 1)[0]
        i += 3 + cb
    if i >= len(clx) or clx[i] != 2:
        raise NotWordDocument("el CLX no trae tabla de piezas (Pcdt)")
    lcb = struct.unpack_from("<I", clx, i + 1)[0]
    plc = clx[i + 5:i + 5 + lcb]
    n = (len(plc) - 4) // 12
    if n <= 0:
        raise NotWordDocument("la tabla de piezas esta vacia")
    cps = [struct.unpack_from("<I", plc, k * 4)[0] for k in range(n + 1)]
    gathered = []
    for k in range(n):
        fc = struct.unpack_from("<I", plc, (n + 1) * 4 + k * 8 + 2)[0]
        compressed = bool(fc & FC_COMPRESSED)
        # En una pieza comprimida el desplazamiento viene DOBLADO: se apaga
        # el bit y se divide entre dos. Sin eso se lee el doble de lejos.
        offset = (fc & ~FC_COMPRESSED) // 2 if compressed else fc
        gathered.append((cps[k], cps[k + 1], offset, compressed))
    return gathered


def _strip_fields(text: str) -> str:
    """Quita el CODIGO de cada campo y conserva su resultado.

    Entre `0x13` y `0x14` va la instruccion —`PAGE`, `REF`—; entre `0x14` y
    `0x15`, lo que el campo muestra. Volcar la instruccion publica codigo
    como si fuera contenido.
    """
    gathered, in_code = [], False
    for ch in text:
        if ch == FIELD_BEGIN:
            in_code = True
        elif ch == FIELD_SEPARATOR:
            in_code = False
        elif ch == FIELD_END:
            in_code = False
        elif not in_code:
            gathered.append(ch)
    return "".join(gathered)


def raw_text(source) -> str:
    """El cuerpo principal, ya decodificado y acotado a ``ccpText``."""
    container = cfb.open_compound(source)
    names = container.names()
    if MAIN_STREAM not in names:
        raise NotWordDocument(
            "es un CFB de otro tipo: le falta %s" % MAIN_STREAM)
    main_stream = container.stream(MAIN_STREAM)
    if struct.unpack_from("<H", main_stream, OFF_IDENT)[0] != W_IDENT:
        raise NotWordDocument("el flujo %s no lleva la firma 0x%04x"
                              % (MAIN_STREAM, W_IDENT))

    flag_bits = struct.unpack_from("<H", main_stream, OFF_FLAGS)[0]
    table_name = _table_stream_name(flag_bits)
    if table_name not in names:
        raise NotWordDocument("falta el flujo de tabla %s" % table_name)
    table = container.stream(table_name)

    ccp_text = struct.unpack_from("<i", main_stream, OFF_CCP_TEXT)[0]
    fc_clx, lcb_clx = struct.unpack_from(
        "<ii", main_stream, OFF_RG_FC_LCB + IDX_FC_CLX * 4)

    pieces = []
    for cp_ini, cp_end, offset, compressed in _piece_table(
            table, fc_clx, lcb_clx):
        # La cota se aplica por PIEZA, no al final: una pieza puede cruzar
        # el limite del cuerpo y llevarse medio encabezado consigo.
        if cp_ini >= ccp_text:
            continue
        length = min(cp_end, ccp_text) - cp_ini
        if compressed:
            raw = main_stream[offset:offset + length]
            pieces.append(raw.decode("cp1252", errors="replace"))
        else:
            raw = main_stream[offset:offset + length * 2]
            pieces.append(raw.decode("utf-16-le", errors="replace"))
    return _strip_fields("".join(pieces))


def blocks(source) -> list[str]:
    """El cuerpo como parrafos, con sus tabuladores conservados."""
    text = raw_text(source)
    for control, replacement in CONTROL_MAP.items():
        text = text.replace(control, replacement)
    # Lo que quede por debajo de 0x20 y no este en el mapa es marca de
    # estructura, no contenido: se retira y no se convierte en espacio.
    text = "".join(c for c in text if ord(c) >= 0x20 or c in "\n\t")
    return [line.strip() for line in text.split("\n") if line.strip()]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("entrada", help="el .doc de origen")
    parser.add_argument("gathered", nargs="?", help="el .txt de destino")
    args = parser.parse_args(argv)

    source = pathlib.Path(args.entrada)
    if not source.is_file():
        print("doc_to_text: no existe o no es un archivo: %s" % source,
              file=sys.stderr)
        print("             NO se emite conteo.", file=sys.stderr)
        return 2
    try:
        block_list = blocks(source)
    except (NotWordDocument, cfb.NotCompoundFile) as err:
        print("doc_to_text: %s" % err, file=sys.stderr)
        print("             El sufijo del nombre NO decide.", file=sys.stderr)
        return 2

    text = "\n".join(block_list)
    if args.gathered:
        pathlib.Path(args.gathered).write_text(text, encoding="utf-8")
        print("escrito: %s" % args.gathered)
    else:
        print(text)
    with_table = sum(1 for b in block_list if "\t" in b)
    print("parrafos: %d (%d con columnas) · caracteres: %d"
          % (len(block_list), with_table, len(text)), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
