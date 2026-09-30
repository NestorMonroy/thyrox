#!/usr/bin/env python3
"""El contenedor OLE2 (Compound File Binary) — lo que envuelve a un `.xls`.

Se separa de BIFF por la misma razon por la que `ooxml.py` se separa de
SpreadsheetML: **el contenedor no es el vocabulario**. Un `.doc` y un `.msg`
viven en el mismo CFB y no comparten ni un registro con una hoja de calculo.

Medido sobre el archivo real que origina este modulo —una consulta del Banco
de Informacion Economica del INEGI, 16 384 bytes—::

    sector 512 · mini-sector 64 · corte de mini-stream 4096
    Workbook                    11 633 B   -> por la FAT
    SummaryInformation             484 B   -> por la MINI-FAT
    DocumentSummaryInformation     196 B   -> por la MINI-FAT

Dos de sus tres flujos viven en la mini-FAT. Un lector que solo siga la FAT
los lee como basura **sin fallar**, porque los numeros de sector son validos
en las dos tablas y apuntan a sitios distintos.
"""

import pathlib
import struct
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from corpus import cfb  # noqa: E402

FREE, END, FAT_SECT = 0xFFFFFFFF, 0xFFFFFFFE, 0xFFFFFFFD


def build(path, streams: dict[str, bytes], *, sector=512, mini=64, cutoff=4096):
    """Escribe un CFB minimo pero REAL, con su FAT y su mini-FAT.

    Es un constructor de prueba, no un escritor general: coloca los sectores
    en orden y encadena. Basta para que el caso que discrimina —un flujo
    grande y uno chico en el mismo archivo— exista de verdad.
    """
    big_ones = {n: d for n, d in streams.items() if len(d) >= cutoff}
    small_ones = {n: d for n, d in streams.items() if len(d) < cutoff}

    sectors: list[bytes] = []

    def write(data: bytes, tam: int) -> tuple[int, list[int]]:
        start = len(sectors)
        used = []
        for i in range(0, max(len(data), 1), tam):
            chunk = data[i:i + tam].ljust(tam, b"\0")
            used.append(len(sectors))
            sectors.append(chunk)
        return start, used

    big_start, big_chain = {}, {}
    for name_text, data in big_ones.items():
        ini, used = write(data, sector)
        big_start[name_text], big_chain[name_text] = ini, used

    # El mini-stream es UN flujo normal que contiene a todos los chicos,
    # troceado en mini-sectores. Vive colgado del Root Entry.
    mini_data, mini_start = b"", {}
    for name_text, data in small_ones.items():
        mini_start[name_text] = len(mini_data) // mini
        mini_data += data.ljust(((len(data) + mini - 1) // mini) * mini, b"\0")
    root_start, root_chain = write(mini_data, sector) if mini_data else (END, [])

    # mini-FAT: una entrada por mini-sector, encadenando cada flujo chico.
    n_mini = len(mini_data) // mini
    minifat = [FREE] * max(n_mini, 1)
    for name_text, data in small_ones.items():
        first = mini_start[name_text]
        how_many_ones = max(1, (len(data) + mini - 1) // mini)
        for k in range(how_many_ones):
            minifat[first + k] = (first + k + 1) if k + 1 < how_many_ones else END
    minifat_ini, minifat_chain = write(
        b"".join(struct.pack("<I", x) for x in minifat), sector)

    entries = [("Root Entry", 5, root_start, len(mini_data))]
    for name_text in big_ones:
        entries.append((name_text, 2, big_start[name_text], len(big_ones[name_text])))
    for name_text in small_ones:
        entries.append((name_text, 2, mini_start[name_text], len(small_ones[name_text])))

    dir_bytes = b""
    for name_text, kind, ini, tam in entries:
        e = bytearray(128)
        cru = name_text.encode("utf-16-le")
        e[0:len(cru)] = cru
        struct.pack_into("<H", e, 64, len(cru) + 2)
        e[66] = kind
        struct.pack_into("<i", e, 68, -1)
        struct.pack_into("<i", e, 72, -1)
        struct.pack_into("<i", e, 76, -1)
        struct.pack_into("<I", e, 116, ini & 0xFFFFFFFF)
        struct.pack_into("<I", e, 120, tam)
        dir_bytes += bytes(e)
    dir_ini, dir_chain = write(dir_bytes, sector)

    total = len(sectors) + 1                      # +1 por el sector de FAT
    fat = [FREE] * (((total + (sector // 4) - 1) // (sector // 4)) * (sector // 4))
    def chain_up(used):
        for k, s in enumerate(used):
            fat[s] = used[k + 1] if k + 1 < len(used) else END
    for name_text in big_ones:
        chain_up(big_chain[name_text])
    if root_chain:
        chain_up(root_chain)
    chain_up(minifat_chain)
    chain_up(dir_chain)
    fat_sect = len(sectors)
    fat[fat_sect] = FAT_SECT
    sectors.append(b"".join(struct.pack("<I", x) for x in fat)[:sector].ljust(sector, b"\0"))

    cab = bytearray(512)
    cab[0:8] = bytes.fromhex("D0CF11E0A1B11AE1")
    struct.pack_into("<HH", cab, 24, 0x3E, 3)
    struct.pack_into("<H", cab, 28, 0xFFFE)
    struct.pack_into("<HH", cab, 30, 9, 6)
    struct.pack_into("<i", cab, 44, 1)
    struct.pack_into("<i", cab, 48, dir_ini)
    struct.pack_into("<i", cab, 56, cutoff)
    struct.pack_into("<i", cab, 60, minifat_ini)
    struct.pack_into("<i", cab, 64, len(minifat_chain))
    struct.pack_into("<i", cab, 68, -2)
    struct.pack_into("<i", cab, 72, 0)
    for i in range(109):
        struct.pack_into("<I", cab, 76 + i * 4,
                         fat_sect if i == 0 else FREE)
    pathlib.Path(path).write_bytes(bytes(cab) + b"".join(sectors))


BIG = bytes(range(256)) * 20          # 5120 B, por encima del corte
SMALL = b"soy chico y vivo en la mini-FAT" * 3


class TestVerdict(unittest.TestCase):
    def test_1_what_lacks_the_signature_REFUSES(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            f.write_bytes(b"PK\x03\x04" + b"\0" * 600)
            with self.assertRaises(cfb.NotCompoundFile):
                cfb.open_compound(f)

    def test_2_a_file_SHORTER_than_its_header_REFUSES(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            f.write_bytes(bytes.fromhex("D0CF11E0A1B11AE1"))
            with self.assertRaises(cfb.NotCompoundFile):
                cfb.open_compound(f)

    def test_3_a_stream_that_does_not_exist_is_NAMED(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            build(f, {"Large": BIG})
            doc = cfb.open_compound(f)
            with self.assertRaises(KeyError) as box:
                doc.stream("Workbook")
            self.assertIn("Workbook", str(box.exception))


class TestBigStream(unittest.TestCase):
    def test_4_a_stream_through_the_FAT_comes_out_whole(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            build(f, {"Large": BIG})
            self.assertEqual(cfb.open_compound(f).stream("Large"), BIG)

    def test_5_the_stream_is_TRIMMED_to_its_declared_size(self):
        """Un flujo ocupa sectores enteros; su ultimo sector viene relleno de
        ceros. Devolver el sector completo mete basura al final, y en un
        formato de registros esa basura se lee como un registro mas."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            data = BIG + b"cola"
            build(f, {"Large": data})
            output = cfb.open_compound(f).stream("Large")
            self.assertEqual(len(output), len(data))
            self.assertFalse(output.endswith(b"\0"))


class TestMiniFat(unittest.TestCase):
    """La trampa: dos de los tres flujos del archivo real viven aqui."""

    def test_6_a_SMALL_stream_comes_through_the_mini_FAT(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            build(f, {"Large": BIG, "Small": SMALL})
            self.assertEqual(cfb.open_compound(f).stream("Small"), SMALL)

    def test_7_NULLIFICATION_reading_a_small_stream_through_the_FAT_yields_GARBAGE(self):
        """Control de anulacion, y el defecto es SILENCIOSO: el numero de
        sector es valido en las dos tablas, asi que no hay excepcion — sale
        el contenido de otro sitio. En el archivo real son 484 y 196 bytes
        de metadatos que se leerian como cualquier otra cosa."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            build(f, {"Large": BIG, "Small": SMALL})
            doc = cfb.open_compound(f)
            self.assertNotEqual(doc._read_fat_chain(doc._dir["Small"].start,
                                                    len(SMALL)), SMALL)

    def test_8_the_two_coexist_in_the_SAME_file(self):
        """Es el caso que discrimina: un lector que solo implemente una de
        las dos tablas pasa con un archivo de un solo tipo de flujo."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            build(f, {"Large": BIG, "Small": SMALL})
            doc = cfb.open_compound(f)
            self.assertEqual(doc.stream("Large"), BIG)
            self.assertEqual(doc.stream("Small"), SMALL)


class TestDirectory(unittest.TestCase):
    def test_9_the_names_are_read_in_UTF_16(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            build(f, {"Año contable": BIG})
            self.assertIn("Año contable", cfb.open_compound(f).names())

    def test_10_the_sector_size_comes_from_the_HEADER(self):
        """Un CFB v4 usa sectores de 4096. Asumir 512 lee el archivo
        desplazado desde el primer sector."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            build(f, {"Large": BIG})
            self.assertEqual(cfb.open_compound(f).sector_size, 512)


if __name__ == "__main__":
    unittest.main(verbosity=2)
