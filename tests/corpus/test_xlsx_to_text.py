#!/usr/bin/env python3
"""Un `.xlsx` es un ZIP de XML, y leerlo mal es facil de cuatro maneras.

Origen: el ejecutor entrega `IOE2026_08.xlsx` del INEGI. Medido antes de
escribir una linea::

    for m in openpyxl pandas xlrd odfpy; do python -c "import $m"; done  -> los cuatro AUSENTES
    ls bin/ | grep -iE 'xls|sheet|excel'                                 -> (ninguno)

El precedente del arbol es `extract_pptx.py`: tambien OOXML, tambien leido
con la biblioteca estandar. Lo que esta suite fija son las CUATRO trampas
del formato de hoja de calculo, que no son las del formato de diapositiva.
"""

import pathlib
import subprocess
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from corpus import xlsx_to_text  # noqa: E402
from paths import reach  # noqa: E402

NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
NSR = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'


def build(path, *, sheet_xml, shared=(), sheet_label="Cuadro 1"):
    """Un `.xlsx` minimo pero REAL: las cinco partes que el formato exige."""
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("_rels/.rels",
                   '<?xml version="1.0"?><Relationships xmlns="http://schemas.'
                   'openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.'
                   'org/officeDocument/2006/relationships/officeDocument"'
                   ' Target="xl/workbook.xml"/></Relationships>')
        z.writestr("xl/workbook.xml",
                   f'<?xml version="1.0"?><workbook {NS} {NSR}><sheets>'
                   f'<sheet name="{sheet_label}" sheetId="1" r:id="rId1"/>'
                   f'</sheets></workbook>')
        z.writestr("xl/_rels/workbook.xml.rels",
                   '<?xml version="1.0"?><Relationships xmlns="http://schemas.'
                   'openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.'
                   'org/officeDocument/2006/relationships/worksheet"'
                   ' Target="worksheets/sheet1.xml"/></Relationships>')
        z.writestr("xl/worksheets/sheet1.xml",
                   f'<?xml version="1.0"?><worksheet {NS}><sheetData>'
                   f'{sheet_xml}</sheetData></worksheet>')
        if shared:
            items = "".join("<si><t>%s</t></si>" % s for s in shared)
            z.writestr("xl/sharedStrings.xml",
                       f'<?xml version="1.0"?><sst {NS} count="{len(shared)}" '
                       f'uniqueCount="{len(shared)}">{items}</sst>')


class TestSharedStrings(unittest.TestCase):
    """Trampa 1 — una celda `t="s"` guarda un INDICE, no el texto."""

    def test_1_a_shared_cell_returns_its_TEXT(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, shared=["Informalidad laboral", "Tasa"],
                  sheet_xml='<row r="1"><c r="A1" t="s"><v>0</v></c>'
                            '<c r="B1" t="s"><v>1</v></c></row>')
            self.assertEqual(xlsx_to_text.rows(f)[0],
                             ["Informalidad laboral", "Tasa"])

    def test_2_NULLIFICATION_reading_the_raw_value_yields_a_NUMBER_where_a_word_belongs(self):
        """Control de anulacion de la trampa 1. Es la mas traicionera del
        formato: el volcado sale **lleno de enteros plausibles** —0, 1, 2—
        que se leen como datos y son punteros. Nada en la salida lo delata.
        """
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, shared=["Informalidad laboral"],
                  sheet_xml='<row r="1"><c r="A1" t="s"><v>0</v></c></row>')
            self.assertNotEqual(xlsx_to_text.rows(f)[0], ["0"])

    def test_3_a_NUMERIC_cell_is_not_resolved_against_the_table(self):
        """La otra mitad, y es la que discrimina: si TODO se resolviera
        contra `sharedStrings`, un 55.1 se convertiria en la cadena que
        ocupe la posicion 55."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, shared=["cero", "uno"],
                  sheet_xml='<row r="1"><c r="A1"><v>55.1</v></c></row>')
            self.assertEqual(xlsx_to_text.rows(f)[0], ["55.1"])

    def test_4_an_INLINE_string_also_comes_out(self):
        """`t="inlineStr"` no usa la tabla: el texto va dentro de la celda."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, sheet_xml='<row r="1"><c r="A1" t="inlineStr">'
                               '<is><t>Nota al pie</t></is></c></row>')
            self.assertEqual(xlsx_to_text.rows(f)[0], ["Nota al pie"])


class TestCellPosition(unittest.TestCase):
    """Trampa 2 — una fila OMITE sus celdas vacias."""

    def test_5_the_gap_is_preserved_as_an_empty_cell(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, shared=["Total", "62.6"],
                  sheet_xml='<row r="1"><c r="A1" t="s"><v>0</v></c>'
                            '<c r="C1" t="s"><v>1</v></c></row>')
            self.assertEqual(xlsx_to_text.rows(f)[0], ["Total", "", "62.6"])

    def test_6_NULLIFICATION_reading_in_ORDER_shifts_the_table_left(self):
        """Control de anulacion de la trampa 2, y el defecto es silencioso:
        la fila sale con menos columnas y el dato queda bajo el encabezado
        equivocado. Un cuadro del INEGI con columnas vacias de separacion
        —que los tiene— se lee entero mal."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, shared=["Total", "62.6"],
                  sheet_xml='<row r="1"><c r="A1" t="s"><v>0</v></c>'
                            '<c r="C1" t="s"><v>1</v></c></row>')
            self.assertNotEqual(xlsx_to_text.rows(f)[0], ["Total", "62.6"])

    def test_7_the_TWO_letter_column_lands_correctly(self):
        """`AA` es la 27, no la 1+1. Una conversion que solo mire la ultima
        letra pone la columna 27 en la 1 y pisa el dato que ya estaba."""
        self.assertEqual(xlsx_to_text.column_index("A1"), 0)
        self.assertEqual(xlsx_to_text.column_index("Z9"), 25)
        self.assertEqual(xlsx_to_text.column_index("AA3"), 26)
        self.assertEqual(xlsx_to_text.column_index("AB100"), 27)

    def test_8_an_OMITTED_row_does_not_shift_the_following_ones(self):
        """Lo mismo que el hueco de columna, en el otro eje."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, shared=["arriba", "abajo"],
                  sheet_xml='<row r="1"><c r="A1" t="s"><v>0</v></c></row>'
                            '<row r="3"><c r="A3" t="s"><v>1</v></c></row>')
            rows = xlsx_to_text.rows(f)
            self.assertEqual(len(rows), 3, "dio %s" % (rows,))
            self.assertEqual(rows[1], [])


class TestSheetName(unittest.TestCase):
    """Trampa 3 — el nombre de la hoja vive en `workbook.xml`, no en el
    nombre del archivo interno, y la correspondencia pasa por el `.rels`.
    Es la misma indireccion que `extract_pptx` ya documenta para sus notas.
    """

    def test_9_the_sheet_comes_out_with_its_VISIBLE_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, sheet_label="Cuadro 4. Informalidad",
                  sheet_xml='<row r="1"><c r="A1"><v>1</v></c></row>')
            self.assertEqual([n for n, _ in xlsx_to_text.sheets(f)],
                             ["Cuadro 4. Informalidad"])

    def test_10_NULLIFICATION_the_inner_FILE_name_is_not_the_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, sheet_label="Cuadro 4. Informalidad",
                  sheet_xml='<row r="1"><c r="A1"><v>1</v></c></row>')
            names = [n for n, _ in xlsx_to_text.sheets(f)]
            self.assertNotIn("sheet1", names)
            self.assertNotIn("sheet1.xml", names)


class TestVerdict(unittest.TestCase):
    """Lo que no es un xlsx se DECLARA; no se devuelve vacio."""

    def test_11_a_zip_that_is_not_a_workbook_REFUSES(self):
        """El objeto EXISTE y es un zip valido, asi que el rechazo lo produce
        la comprobacion de `xl/workbook.xml` y no la ausencia del archivo."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "no-es-libro.xlsx"
            with zipfile.ZipFile(f, "w") as z:
                z.writestr("hola.txt", "no soy un libro")
            with self.assertRaises(xlsx_to_text.NotAWorkbook):
                xlsx_to_text.rows(f)

    def test_12_what_is_not_a_ZIP_REFUSES(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "plano.xlsx"
            f.write_bytes(b"esto no es un zip")
            with self.assertRaises(xlsx_to_text.NotAWorkbook):
                xlsx_to_text.rows(f)


class TestLineSurface(unittest.TestCase):
    def _run(self, *args):
        """Se invoca por `bin/`, no por la ruta al fuente.

        Cambiado al factorizar `ooxml.py`: desde que este modulo importa a un
        hermano, una invocacion por ruta al `.py` pone `src/corpus/` en el
        camino de busqueda y no `src/`, y muere con `ModuleNotFoundError`.
        Lo detecto esta misma suite al correr el retrofit — sus doce casos de
        biblioteca siguieron verdes y cayeron los tres de linea, que es
        exactamente la particion que tenia que caer.

        El arbol ya lo declara (`trabajo-en-segundo-plano.md`): el envoltorio
        resuelve la raiz y exporta `PYTHONPATH`, «que es justo lo que una
        invocacion por ruta no hace».
        """
        wrapper = (reach.thyrox_root()
                      / "bin" / "xlsx_to_text")
        return subprocess.run(["bash", str(wrapper), *args],
                              capture_output=True, text=True)

    def test_13_dumps_TSV_with_the_sheet_name_as_header(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, shared=["Tasa", "55.1"], sheet_label="Cuadro 1",
                  sheet_xml='<row r="1"><c r="A1" t="s"><v>0</v></c>'
                            '<c r="B1" t="s"><v>1</v></c></row>')
            r = self._run(str(f))
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("Cuadro 1", r.stdout)
            self.assertIn("Tasa\t55.1", r.stdout)

    def test_14_a_missing_origin_exits_2_and_emits_NO_count(self):
        r = self._run("/no/existe/x.xlsx")
        self.assertEqual(r.returncode, 2)
        self.assertNotRegex(r.stdout, r"\b0\b")

    def test_15_a_TAB_inside_a_cell_does_not_split_the_column(self):
        """Un TSV cuyo separador aparezca en el dato es un TSV roto, y el
        cuadro se lee con una columna de mas sin que nada avise."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.xlsx"
            build(f, shared=["a\tb"],
                  sheet_xml='<row r="1"><c r="A1" t="s"><v>0</v></c></row>')
            r = self._run(str(f))
            body = [l for l in r.stdout.splitlines() if "a" in l and "b" in l]
            self.assertTrue(body, r.stdout)
            self.assertNotIn("\t", body[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
