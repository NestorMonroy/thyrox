#!/usr/bin/env python3
"""El contenedor OLE2 / Compound File Binary — lo que envuelve a un ``.xls``.

Vive aparte de BIFF por la misma razon por la que ``ooxml.py`` vive aparte de
SpreadsheetML: **el contenedor no es el vocabulario**. Un ``.doc``, un
``.msg`` y un ``.xls`` comparten este formato y no comparten ni un registro.

Por que existe, y por que NO compite con el convertidor
=======================================================

.. important::

   **Corregido 2026-09-21 por el ejecutor**, y la correccion es de medicion.
   Aqui decia *"274.6 MB para leer un archivo de 16 384 bytes"* y ese
   cociente usa el **denominador equivocado**: instalar es un costo **fijo y
   de una vez**, y leer es una operacion que se repite. Dividir un costo fijo
   entre una sola instancia infla el resultado tanto como se quiera — con
   diez archivos son 27 MB cada uno y con cien, 2.7 MB.

   La frase medida sigue siendo cierta —52 paquetes, 83 850 078 B de
   descarga, 281 189 KB instalados— y **la conclusion que sugeria no se
   seguia de ella**. Es el sub-patron de
   `metrica-decide-la-conclusion.md` cometido con el propio argumento de
   diseno como sujeto.

   *Metrica:* ``Size`` e ``Installed-Size`` que ``apt`` declara.
   *Ciega a:* cuantos archivos llegaran — que es justo lo que decide si el
   costo fijo se amortiza, y no se puede saber de antemano.

**Las dos vias conviven, y cada una hace algo que la otra no.**

======================  =====================  ==========================
Eje                     este modulo            el convertidor
======================  =====================  ==========================
dependencia             **ninguna**            52 paquetes
funciona en un clon     **si, siempre**        solo si se instalo
BIFF8                   **si**                 si
BIFF5 / Excel 5-95      no: **rehusa**         **si**
``.ods``                no                     **si**
formulas evaluadas      no: valor cacheado     **si**
formatos y fechas       no                     **si**
archivo cifrado         no                     segun el caso
======================  =====================  ==========================

Asi que este modulo es el **piso** —lo que siempre esta— y el convertidor es
el **ensanche** para lo que el piso declara que no hace. Tenerlo instalado da
ademas una **segunda via independiente** con la que contrastar, que es el
mismo criterio con que este arbol cruzo un ``.docx`` contra su ``.pdf``.

Quien quiera el ensanche lo pide::

    THYROX_INSTALL_LIBREOFFICE=1 thyrox_toolchain_require_spreadsheet --calculado

La trampa: hay DOS tablas de asignacion, no una
===============================================

Un flujo mas corto que el **corte de mini-stream** (4096 bytes por defecto)
no vive en la FAT: vive en la **mini-FAT**, troceado en mini-sectores de 64
bytes dentro de un flujo contenedor que cuelga del ``Root Entry``.

Y el defecto es **silencioso**: el numero de sector es valido en las dos
tablas, asi que leer un flujo chico por la FAT no lanza ninguna excepcion —
devuelve el contenido de otro sitio. Medido en el archivo real que origina
este modulo, **dos de sus tres flujos** viven en la mini-FAT::

    Workbook                    11 633 B   -> FAT
    SummaryInformation             484 B   -> mini-FAT
    DocumentSummaryInformation     196 B   -> mini-FAT

Lo que NO hace, declarado
=========================

- **No descifra.** Un CFB con contrasena trae sus flujos cifrados y aqui
  salen como bytes sin sentido.
- **No sigue la DIFAT extendida.** La cabecera lleva los primeros 109
  sectores de FAT; un archivo que necesite mas —a partir de unos 8.5 MB con
  sectores de 512— continua la lista en sectores aparte, y eso **se rehusa
  nombrandolo** en vez de leerse a medias. El archivo real declara 0.
- **No lee el arbol rojo-negro del directorio.** Recorre las entradas en
  orden, que basta para localizar un flujo por nombre y es lo que todos los
  lectores hacen en la practica; no reconstruye la jerarquia de storages.
"""
from __future__ import annotations

import pathlib
import struct
from dataclasses import dataclass

#: La firma de un CFB. Es lo que decide, no el sufijo del nombre.
SIGNATURE = bytes.fromhex("D0CF11E0A1B11AE1")

#: Marcas de la tabla de asignacion.
FREE, END_OF_CHAIN, FAT_SECTOR, DIFAT_SECTOR = (
    0xFFFFFFFF, 0xFFFFFFFE, 0xFFFFFFFD, 0xFFFFFFFC)

#: Cuantos sectores de FAT caben en la cabecera. Mas alla hay DIFAT, que este
#: modulo rehusa en vez de leer a medias.
DIFAT_IN_HEADER = 109

HEADER_SIZE = 512
DIR_ENTRY_SIZE = 128

#: Tipos de entrada de directorio.
TYPE_STREAM, TYPE_ROOT = 2, 5

#: Cuantas iteraciones admite una cadena antes de declararla circular. Un CFB
#: corrupto puede encadenar un sector consigo mismo, y sin cota el lector no
#: falla: gira.
MAX_CHAIN = 1 << 20


class NotCompoundFile(ValueError):
    """No es un archivo compuesto. No es «venia vacio»."""


@dataclass
class Entry:
    """Una entrada del directorio."""
    name: str
    kind: int
    start: int
    size: int


class CompoundFile:
    """Un CFB abierto en memoria.

    Se carga entero a proposito: estos archivos son de decenas de KB —el real
    son 16 384 bytes— y un lector por sectores sobre disco anadiria estado
    para un ahorro que no existe.
    """

    def __init__(self, data: bytes):
        if len(data) < HEADER_SIZE or not data.startswith(SIGNATURE):
            raise NotCompoundFile(
                "no lleva la firma de un archivo compuesto (%d bytes)"
                % len(data))
        self._data = data
        shift, mini_shift = struct.unpack_from("<HH", data, 30)
        self.sector_size = 1 << shift
        self.mini_sector_size = 1 << mini_shift
        (n_fat, dir_start, _, self.mini_cutoff,
         mini_start, n_mini, difat_start, n_difat) = struct.unpack_from(
            "<iiiiiiii", data, 44)

        if n_difat > 0 or difat_start not in (-2, END_OF_CHAIN):
            raise NotCompoundFile(
                "usa DIFAT extendida (%d sectores): no soportado. "
                "Se rehusa en vez de leer el archivo a medias." % n_difat)

        self._fat = self._load_fat(n_fat)
        self._minifat = self._load_minifat(mini_start, n_mini)
        self._dir, self._root = self._load_directory(dir_start)
        self._ministream = (
            self._read_fat_chain(self._root.start, self._root.size)
            if self._root is not None and self._root.size else b"")

    # -- sectores ---------------------------------------------------------

    def _sector(self, n: int) -> bytes:
        ini = HEADER_SIZE + n * self.sector_size
        chunk = self._data[ini:ini + self.sector_size]
        if len(chunk) < self.sector_size:
            raise NotCompoundFile("sector %d fuera del archivo" % n)
        return chunk

    def _chain(self, table: list[int], first: int) -> list[int]:
        output, actual, seen = [], first, set()
        while 0 <= actual < len(table) and len(output) < MAX_CHAIN:
            if actual in seen:
                raise NotCompoundFile("cadena circular en el sector %d" % actual)
            seen.add(actual)
            output.append(actual)
            actual = table[actual]
            if actual in (END_OF_CHAIN, FREE) or actual >= len(table):
                break
        return output

    def _load_fat(self, n_fat: int) -> list[int]:
        how_many_ones = min(n_fat, DIFAT_IN_HEADER)
        sectors = [struct.unpack_from("<I", self._data, 76 + i * 4)[0]
                    for i in range(how_many_ones)]
        fat: list[int] = []
        per_sector = self.sector_size // 4
        for s in sectors:
            if s in (FREE, END_OF_CHAIN):
                continue
            fat += list(struct.unpack_from("<%dI" % per_sector,
                                           self._sector(s), 0))
        return fat

    def _load_minifat(self, first: int, how_many_ones: int) -> list[int]:
        if how_many_ones <= 0 or first in (FREE, END_OF_CHAIN, -2):
            return []
        per_sector = self.sector_size // 4
        output: list[int] = []
        for s in self._chain(self._fat, first):
            output += list(struct.unpack_from("<%dI" % per_sector,
                                              self._sector(s), 0))
        return output

    # -- lectura de flujos -------------------------------------------------

    def _read_fat_chain(self, first: int, tam: int) -> bytes:
        raw = b"".join(self._sector(s) for s in self._chain(self._fat, first))
        return raw[:tam]

    def _read_mini_chain(self, first: int, tam: int) -> bytes:
        mini = self.mini_sector_size
        chunks = []
        for s in self._chain(self._minifat, first):
            chunks.append(self._ministream[s * mini:(s + 1) * mini])
        return b"".join(chunks)[:tam]

    # -- directorio --------------------------------------------------------

    def _load_directory(self, first: int):
        raw = b"".join(self._sector(s) for s in self._chain(self._fat, first))
        entries: dict[str, Entry] = {}
        raiz = None
        for i in range(0, len(raw), DIR_ENTRY_SIZE):
            e = raw[i:i + DIR_ENTRY_SIZE]
            if len(e) < DIR_ENTRY_SIZE:
                break
            length = struct.unpack_from("<H", e, 64)[0]
            if length == 0:
                continue
            name_text = e[:max(0, length - 2)].decode("utf-16-le", "replace")
            kind_value = e[66]
            start_offset = struct.unpack_from("<I", e, 116)[0]
            tam = struct.unpack_from("<I", e, 120)[0]
            entrada = Entry(name_text, kind_value, start_offset, tam)
            if kind_value == TYPE_ROOT:
                raiz = entrada
            elif kind_value == TYPE_STREAM:
                entries[name_text] = entrada
        return entries, raiz

    # -- superficie publica ------------------------------------------------

    def names(self) -> list[str]:
        return list(self._dir)

    def stream(self, name_text: str) -> bytes:
        """El contenido de un flujo, por la tabla que le corresponde.

        **Cual de las dos tablas lo decide el TAMANO**, no el nombre ni el
        orden: por debajo del corte se lee por la mini-FAT. Leerlo por la FAT
        devuelve bytes validos de otro sitio, sin error.
        """
        if name_text not in self._dir:
            raise KeyError("el archivo no tiene un flujo llamado %r. Tiene: %s"
                           % (name_text, ", ".join(self._dir) or "(ninguno)"))
        e = self._dir[name_text]
        if e.size < self.mini_cutoff:
            return self._read_mini_chain(e.start, e.size)
        return self._read_fat_chain(e.start, e.size)


def open_compound(origen) -> CompoundFile:
    """Abre un CFB desde una ruta, o REHUSA nombrando por que."""
    origen = pathlib.Path(origen)
    try:
        data_bytes = origen.read_bytes()
    except OSError as err:
        raise NotCompoundFile("no se puede leer %s (%s)" % (origen, err)) from err
    return CompoundFile(data_bytes)
