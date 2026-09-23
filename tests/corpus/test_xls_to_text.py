#!/usr/bin/env python3
"""BIFF8 — el vocabulario de un `.xls`, dentro del contenedor CFB.

Medido sobre el archivo real (consulta del BIE del INEGI, 16 384 B) antes de
escribir una linea::

    LABELSST 175 · ROW 91 · NUMBER 82 · XF 33 · FORMAT 8 · BOUNDSHEET 1
    SST: 3410 B, 175 totales / 94 unicas, seguida de EXTSST (no CONTINUE)
    primeras 40 cadenas: 40 comprimidas, 0 en UTF-16

Asi que de las cinco trampas del formato, **este archivo ejercita dos**
—LABELSST contra la SST, y cadenas comprimidas— y las otras tres no. Se
implementan igual, con fixture sintetico, y **se declara cual fue cual**: la
siguiente consulta del mismo banco puede traer RK, y un lector que no lo
entienda publica numeros divididos por cien sin avisar.
"""

import pathlib
import struct
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from corpus import xls_to_text as xls  # noqa: E402


def rec(op, payload=b""):
    return struct.pack("<HH", op, len(payload)) + payload


def sst(chains, *, unicode=False, partir=None):
    """Una SST. `partir` mete un CONTINUE tras esa cantidad de cadenas."""
    def one(s):
        if unicode:
            return struct.pack("<HB", len(s), 0x01) + s.encode("utf-16-le")
        return struct.pack("<HB", len(s), 0x00) + s.encode("latin-1")
    body = struct.pack("<ii", len(chains), len(chains))
    if partir is None:
        return rec(0x00FC, body + b"".join(one(s) for s in chains))
    first = body + b"".join(one(s) for s in chains[:partir])
    rest = b"".join(one(s) for s in chains[partir:])
    return rec(0x00FC, first) + rec(0x003C, rest)


def workbook(body, globals=b""):
    """Un flujo Workbook minimo.

    La SST va DENTRO de la seccion de globales, entre su BOF y su EOF — no
    antes del primer BOF. Ponerla fuera produce un flujo que ningun lector
    de BIFF acepta, y la primera version de esta suite lo hacia: el modulo
    rehuso con «el flujo no empieza con un BOF», que es exactamente lo que
    tenia que hacer.
    """
    header = rec(0x0809, struct.pack("<HH", 0x0600, 0x0005))
    return (header + globals + rec(0x000A)
            + rec(0x0809, struct.pack("<HH", 0x0600, 0x0010)) + body
            + rec(0x000A))


class TestSharedStrings(unittest.TestCase):
    """Trampa 1 — LABELSST guarda un INDICE. 175 veces en el archivo real."""

    def test_1_a_LABELSST_returns_its_TEXT(self):
        body = (rec(0x00FD, struct.pack("<HHHi", 0, 0, 0, 1))
                  + rec(0x00FD, struct.pack("<HHHi", 0, 1, 0, 0)))
        rows = xls.rows_from_stream(workbook(body, sst(["Periodo", "Tasa"])))
        self.assertEqual(rows[0], ["Tasa", "Periodo"])

    def test_2_NULLIFICATION_reading_the_raw_index_yields_a_NUMBER(self):
        """La trampa es traicionera por lo mismo que en el `.xlsx`: el
        volcado sale lleno de enteros pequenos que se leen como datos."""
        rows = xls.rows_from_stream(workbook(
            rec(0x00FD, struct.pack("<HHHi", 0, 0, 0, 0)), sst(["Informalidad"])))
        self.assertEqual(rows[0], ["Informalidad"])

    def test_3_a_UTF_16_string_comes_out_right(self):
        """Trampa 2: el byte de banderas decide si son 1 o 2 bytes por
        caracter. Leer todas igual da mojibake o NULs intercalados. El
        archivo real no trae ninguna —medido: 0 de 40— y la guarda existe."""
        rows = xls.rows_from_stream(workbook(
            rec(0x00FD, struct.pack("<HHHi", 0, 0, 0, 0)),
            sst(["Año"], unicode=True)))
        self.assertEqual(rows[0], ["Año"])

    def test_4_an_SST_split_across_CONTINUE_is_not_truncated(self):
        """Trampa 3: una tabla larga se parte. El archivo real NO la parte
        —su SST va seguida de EXTSST— pero una consulta mas grande si."""
        chains = ["c%02d" % i for i in range(10)]
        body = rec(0x00FD, struct.pack("<HHHi", 0, 0, 0, 9))
        rows = xls.rows_from_stream(workbook(body, sst(chains, partir=4)))
        self.assertEqual(rows[0], ["c09"])


class TestNumbers(unittest.TestCase):
    def test_5_a_NUMBER_is_a_double(self):
        body = rec(0x0203, struct.pack("<HHHd", 0, 0, 0, 30.2))
        self.assertEqual(xls.rows_from_stream(workbook(body))[0], ["30.2"])

    def test_6_an_integer_RK_decodes(self):
        """Trampa 4: RK empaqueta un numero en 30 bits con DOS banderas."""
        v = (42 << 2) | 0x02
        body = rec(0x027E, struct.pack("<HHHi", 0, 0, 0, v))
        self.assertEqual(xls.rows_from_stream(workbook(body))[0], ["42"])

    def test_7_an_RK_with_the_HUNDREDTHS_flag_is_divided_by_100(self):
        """El bit 0 dice «esto va dividido entre cien». Ignorarlo publica
        3020 donde el dato es 30.2 — y nada en la salida lo delata."""
        v = (3020 << 2) | 0x02 | 0x01
        body = rec(0x027E, struct.pack("<HHHi", 0, 0, 0, v))
        self.assertEqual(xls.rows_from_stream(workbook(body))[0], ["30.2"])

    def test_8_a_NEGATIVE_RK_does_not_come_out_positive(self):
        """30 bits en complemento a dos. Un desplazamiento sin signo
        convierte -5 en mil millones."""
        v = ((-5 << 2) & 0xFFFFFFFF) | 0x02
        body = rec(0x027E, struct.pack("<HHHI", 0, 0, 0, v))
        self.assertEqual(xls.rows_from_stream(workbook(body))[0], ["-5"])

    def test_9_a_MULRK_carries_SEVERAL_cells(self):
        """Trampa 5: un solo registro con N celdas contiguas. Tratarlo como
        una deja N-1 columnas vacias."""
        body = rec(0x00BD, struct.pack("<HH", 0, 0)
                     + struct.pack("<Hi", 0, (1 << 2) | 0x02)
                     + struct.pack("<Hi", 0, (2 << 2) | 0x02)
                     + struct.pack("<Hi", 0, (3 << 2) | 0x02)
                     + struct.pack("<H", 2))
        self.assertEqual(xls.rows_from_stream(workbook(body))[0], ["1", "2", "3"])


class TestPosition(unittest.TestCase):
    def test_10_the_column_GAP_is_preserved(self):
        body = (rec(0x0203, struct.pack("<HHHd", 0, 0, 0, 1.0))
                  + rec(0x0203, struct.pack("<HHHd", 0, 2, 0, 3.0)))
        self.assertEqual(xls.rows_from_stream(workbook(body))[0], ["1", "", "3"])

    def test_11_an_omitted_ROW_does_not_shift_the_following_ones(self):
        body = (rec(0x0203, struct.pack("<HHHd", 0, 0, 0, 1.0))
                  + rec(0x0203, struct.pack("<HHHd", 2, 0, 0, 3.0)))
        rows = xls.rows_from_stream(workbook(body))
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[1], [])


class TestVerdict(unittest.TestCase):
    def test_12_a_stream_WITHOUT_BOF_REFUSES(self):
        with self.assertRaises(xls.NotAWorkbook):
            xls.rows_from_stream(b"\x00" * 40)

    def test_13_a_CFB_that_is_not_a_workbook_REFUSES_naming_the_stream(self):
        import tempfile
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
        from test_cfb import build  # noqa: E402
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xls"
            build(f, {"Otro": bytes(range(256)) * 20})
            with self.assertRaises(xls.NotAWorkbook) as box:
                xls.rows(f)
            self.assertIn("Workbook", str(box.exception))


class TestNotesWarning(unittest.TestCase):
    """El detector que existe por un episodio propio: se agrego una serie
    saltandose la seccion de notas del archivo, que era donde decia que sus
    82 trimestres vienen de cuatro instrumentos distintos."""

    def test_14_a_NOTE_row_is_detected(self):
        rows = [["2026/01", "29.65"],
                 ["Notas y Llamadas:", ""],
                 ["Para la ENOEN del tercer trimestre de 2020...", ""]]
        self.assertEqual(xls.note_rows(rows), [1])

    def test_15_the_SOURCE_line_also_counts(self):
        self.assertEqual(xls.note_rows([["Fuente:", "INEGI"]]), [0])

    def test_16_a_DATA_row_is_not_confused_with_a_note(self):
        """El control que discrimina: sin el, un detector que devolviera
        todas las filas pasaria los dos casos de arriba y no mediria nada."""
        rows = [["2026/02", "30.18"], ["00 Estados Unidos Mexicanos", "55.1"]]
        self.assertEqual(xls.note_rows(rows), [])

    def test_17_the_dump_is_NOT_filtered(self):
        """El detector avisa; no quita. Un volcado sin sus notas es
        exactamente el defecto que esto existe para atajar."""
        body = rec(0x00FD, struct.pack("<HHHi", 0, 0, 0, 0))
        rows = xls.rows_from_stream(workbook(body, sst(["Fuente:"])))
        self.assertEqual(rows[0], ["Fuente:"])
        self.assertEqual(xls.note_rows(rows), [0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
