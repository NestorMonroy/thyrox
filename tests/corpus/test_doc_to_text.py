#!/usr/bin/env python3
"""Un `.doc` no es un `.docx` con el nombre viejo, y su texto no es contiguo.

Origen: el ejecutor entrega el ACUERDO de lineamientos del Plan Mexico
(DOF 21-mar-2025). Medido antes de escribir nada: firma
`d0cf11e0a1b11ae1`, o sea **OLE2/CFB**, el mismo contenedor que el `.xls`
legado del INEGI y que `zipfile` no abre. El arbol ya tenia el contenedor
—`cfb.py`— y le faltaba el cuerpo.

Y medido sobre el archivo real::

    flujos: WordDocument 48 195 · 1Table 15 346
    wIdent 0xa5ec · nFib 193 · fWhichTblStm 1
    ccpText 36 806 · ccpHdd 104 · piezas 1 (1 comprimida)
    0x0d 211 · 0x09 130 · 0x0c 4 · 0x03 2 · 0x04 2 · 0x07 0 · 0x13 0

La cifra que decide es **104**: los caracteres que siguen a `ccpText` en el
mismo flujo son el encabezado —«DIARIO OFICIAL», la fecha—, y un lector sin
la cota los pega al final del documento como si fueran su cierre.

NOTA DE HONESTIDAD SOBRE EL ORDEN. Aqui el modulo se escribio **antes** que
esta suite, y no al reves: el formato binario habia que verlo para saber que
probar. Lo que si se hizo en orden es lo que carga el peso —cada guarda se
retiro despues y se comprobo que caen exactamente las aserciones que
dependen de ella—, y esa medicion esta en el banco.
"""

import pathlib
import subprocess
import struct
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from corpus import doc_to_text  # noqa: E402
from test_cfb import build as build_cfb  # noqa: E402

OFF_IDENT, OFF_FLAGS, OFF_CCP_TEXT = 0x0000, 0x000A, 0x004C
OFF_RG_FC_LCB, IDX_FC_CLX = 0x009A, 66
#: El cuerpo empieza aqui en un `.doc` real, y aqui tambien en el sintetico.
TEXT_START = 0x0600


def piece_table(pieces) -> bytes:
    """Un `Pcdt` con las piezas dadas: ``(cp_fin, offset, comprimida)``."""
    cps = [0] + [p[0] for p in pieces]
    body = b"".join(struct.pack("<I", cp) for cp in cps)
    for _, offset, comprimida in pieces:
        fc = (offset * 2) | 0x40000000 if comprimida else offset
        body += struct.pack("<HIH", 0, fc, 0)
    return b"\x02" + struct.pack("<I", len(body)) + body


def build_doc(path, text, *, ccp_text=None, which_table=1,
              comprimida=True, prefix_bytes=b"", ident=0xA5EC):
    """Un `.doc` minimo pero REAL: su CFB, su FIB y su tabla de piezas."""
    raw = (text.encode("cp1252") if comprimida
             else text.encode("utf-16-le"))
    main = bytearray(TEXT_START + len(raw) + 16)
    struct.pack_into("<H", main, OFF_IDENT, ident)
    struct.pack_into("<H", main, OFF_FLAGS,
                     0x0200 if which_table else 0x0000)
    struct.pack_into("<i", main, OFF_CCP_TEXT,
                     len(text) if ccp_text is None else ccp_text)
    main[TEXT_START:TEXT_START + len(raw)] = raw

    clx = prefix_bytes + piece_table([(len(text), TEXT_START, comprimida)])
    table = bytearray(64) + clx
    struct.pack_into("<ii", main, OFF_RG_FC_LCB + IDX_FC_CLX * 4,
                     64, len(clx))
    name_text = "1Table" if which_table else "0Table"
    build_cfb(path, {"WordDocument": bytes(main),
                     name_text: bytes(table)})


class TestTheEncoding(unittest.TestCase):
    def test_1_a_COMPRESSED_piece_is_read_as_cp1252(self):
        """CONTROL POSITIVO: la unica pieza del archivo real lo es. Leerla
        como UTF-16 no falla — devuelve basura legible a medias."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "Plan Mexico", comprimida=True)
            self.assertEqual(doc_to_text.raw_text(f), "Plan Mexico")

    def test_2_and_a_WIDE_piece_is_read_as_UTF_16(self):
        """CONTROL DE ANULACION del anterior: si el lector ignorara el bit
        y decodificara siempre cp1252, el test 1 pasaria igual.

        Esta forma NO se midio en el archivo real —sus piezas son 1 de 1
        comprimida—, asi que la guarda se escribe por el formato y se
        declara sin control positivo de campo."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "Plan Mexico", comprimida=False)
            self.assertEqual(doc_to_text.raw_text(f), "Plan Mexico")

    def test_3_the_ACCENT_survives_cp1252(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "capacitación dual")
            self.assertIn("ó", doc_to_text.raw_text(f))


class TestTheBound(unittest.TestCase):
    def test_4_what_follows_ccpText_is_NOT_the_body(self):
        """CONTROL POSITIVO de la trampa que si muerde: en el archivo real
        son **104 caracteres** de encabezado —«DIARIO OFICIAL» y la fecha—
        que un lector sin cota pega al final como si fueran su cierre."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "cuerpo\rDIARIO OFICIAL", ccp_text=7)
            self.assertNotIn("DIARIO OFICIAL", doc_to_text.raw_text(f))

    def test_5_and_the_whole_body_DOES_come_out(self):
        """CONTROL DE ANULACION: un lector que devolviera la cadena vacia
        pasaria el test 4."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "cuerpo\rDIARIO OFICIAL", ccp_text=7)
            self.assertIn("cuerpo", doc_to_text.raw_text(f))


class TestTheTableStream(unittest.TestCase):
    def test_6_the_bit_decides_BETWEEN_0Table_and_1Table(self):
        """Elegir el otro no da error: da un CLX que no es un CLX."""
        with tempfile.TemporaryDirectory() as tmp:
            for which in (0, 1):
                f = pathlib.Path(tmp) / ("t%d.doc" % which)
                build_doc(f, "contenido", which_table=which)
                self.assertEqual(doc_to_text.raw_text(f), "contenido",
                                 "fallo con %dTable" % which)

    def test_7_a_CLX_with_properties_in_front_does_not_confuse(self):
        """El CLX puede empezar con uno o varios `Prc`. Leer el primero
        como si fuera la tabla interpreta un tamano de propiedades como un
        numero de piezas."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            prc = b"\x01" + struct.pack("<h", 4) + b"\xaa\xbb\xcc\xdd"
            build_doc(f, "contenido", prefix_bytes=prc)
            self.assertEqual(doc_to_text.raw_text(f), "contenido")


class TestTheField(unittest.TestCase):
    def test_8_a_field_CODE_is_not_dumped(self):
        """Hermana de `w:instrText` en el `.docx`: entre 0x13 y 0x14 va la
        instruccion —`PAGE`, `REF`—, no lo que el campo muestra. Medido en
        este archivo: cero. La guarda se queda."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "pagina \x13PAGE \\* MERGEFORMAT\x1412\x15 de 30")
            output = doc_to_text.raw_text(f)
            self.assertNotIn("MERGEFORMAT", output)
            self.assertIn("12", output)
            self.assertIn("de 30", output)


class TestTheBlocks(unittest.TestCase):
    def test_9_the_paragraph_end_SPLITS(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "uno\rdos\rtres")
            self.assertEqual(doc_to_text.blocks(f), ["uno", "dos", "tres"])

    def test_10_the_TAB_survives(self):
        """130 en el archivo real: son las columnas de sus definiciones.
        Un lector que los borre pega `I.` con su definicion."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "I.\tCADERR: Consejo Asesor")
            self.assertEqual(doc_to_text.blocks(f),
                             ["I.\tCADERR: Consejo Asesor"])

    def test_11_a_structure_mark_does_not_become_a_space(self):
        """0x03 y 0x04 marcan encabezado y pie. No son contenido y tampoco
        son un espacio en blanco del texto."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "antes\x03\x04despues")
            self.assertEqual(doc_to_text.blocks(f), ["antesdespues"])


class TestVerdict(unittest.TestCase):
    def test_12_a_CFB_that_is_not_Word_REFUSES_naming_it(self):
        """Un `.xls` es tambien un CFB. Lo que discrimina es la parte."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_cfb(f, {"Workbook": b"\x00" * 64})
            with self.assertRaises(Exception) as box:
                doc_to_text.raw_text(f)
            self.assertIn("WordDocument", str(box.exception))

    def test_13_a_stream_WITHOUT_the_signature_REFUSES(self):
        """El nombre del flujo no basta: la firma 0xa5ec es el veredicto."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "contenido", ident=0x1234)
            with self.assertRaises(Exception) as box:
                doc_to_text.raw_text(f)
            self.assertIn("a5ec", str(box.exception))

    def test_14_what_is_not_a_CFB_REFUSES(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            f.write_bytes(b"PK\x03\x04" + b"\x00" * 200)
            with self.assertRaises(Exception):
                doc_to_text.raw_text(f)


class TestLineSurface(unittest.TestCase):
    def _run(self, *args):
        wrapper = ROOT / "bin" / "doc_to_text"
        return subprocess.run(["bash", str(wrapper), *args],
                              capture_output=True, text=True)

    def test_15_dumps_to_stdout_and_publishes_its_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.doc"
            build_doc(f, "una linea")
            r = self._run(str(f))
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("una linea", r.stdout)
            self.assertIn("parrafos", r.stderr)

    def test_16_a_missing_origin_exits_2_and_emits_NO_count(self):
        r = self._run("/no/existe/x.doc")
        self.assertEqual(r.returncode, 2)
        self.assertNotIn("parrafos", r.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
