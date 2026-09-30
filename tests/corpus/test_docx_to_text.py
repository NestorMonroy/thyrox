#!/usr/bin/env python3
"""Un `.docx` no se lee juntando sus `w:t`. Cuatro razones, medidas.

Origen: el ejecutor entrega `enoe2026_08.docx` del INEGI. Medido antes de
escribir una linea: `python-docx`, `odfpy` y `mammoth` los tres AUSENTES, y
ningun `bin/` que lea un documento.

Y medido SOBRE EL ARCHIVO REAL, que es lo que vuelve cada trampa un defecto
seguro y no una hipotesis::

    w:p 1851 · w:r 5082 · w:t 5015 · w:tbl 8 · w:tr 201 · w:tc 1675 · w:tab 1575

Los 1575 tabuladores son el dato que decide: **no son texto, son elementos**,
asi que un lector que solo tome `w:t` pega las palabras entre si 1575 veces
en este unico documento.
"""

import pathlib
import subprocess
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from corpus import docx_to_text  # noqa: E402
from paths import reach  # noqa: E402

W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
PKG = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"'


def build(path, body):
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("_rels/.rels", f'<Relationships {PKG}/>')
        z.writestr("word/document.xml",
                   f'<?xml version="1.0"?><w:document {W}><w:body>{body}'
                   f'</w:body></w:document>')


def p(*runs):
    return "<w:p>" + "".join(runs) + "</w:p>"


def r(text):
    return f"<w:r><w:t>{text}</w:t></w:r>"


class TestParagraph(unittest.TestCase):
    def test_1_the_RUNS_of_a_paragraph_are_joined(self):
        """El formato parte una frase en varios `w:r` cuando cambia la
        negrita. Leerlos sueltos devuelve la frase troceada."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, p(r("Poblacion "), r("economicamente"), r(" activa")))
            self.assertEqual(docx_to_text.blocks(f),
                             ["Poblacion economicamente activa"])

    def test_2_the_TAB_is_an_element_and_does_not_vanish(self):
        """CONTROL POSITIVO de la trampa que el archivo real trae 1575 veces.
        Sin el, `Indicador` y `61676698` salen pegados en una sola palabra y
        el numero deja de ser greppeable."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, p("<w:r><w:t>Indicador</w:t><w:tab/>"
                       "<w:t>61676698</w:t></w:r>"))
            output = docx_to_text.blocks(f)[0]
            self.assertNotIn("Indicador61676698", output)
            self.assertIn("61676698", output)

    def test_3_the_line_BREAK_separates(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, p("<w:r><w:t>arriba</w:t><w:br/><w:t>abajo</w:t></w:r>"))
            self.assertNotIn("arribaabajo", docx_to_text.blocks(f)[0])

    def test_4_DELETED_text_does_not_come_back(self):
        """`w:delText` es texto que alguien ELIMINO con control de cambios.
        Sigue en el XML dentro de un `w:r`, asi que un lector que tome todo
        publica como vigente lo que se retiro. Este archivo no trae ninguno
        —medido: 0— y la guarda existe igual, porque el siguiente si puede.
        """
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, p(r("vigente "),
                       "<w:r><w:delText>retirado</w:delText></w:r>"))
            self.assertEqual(docx_to_text.blocks(f), ["vigente"])

    def test_5_the_field_CODE_is_not_text(self):
        """`w:instrText` lleva la instruccion del campo —`PAGE`, `TOC \\o`—,
        no su resultado. Volcarla mete sintaxis de Word en la prosa."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, p(r("Pagina "),
                       "<w:r><w:instrText>PAGE \\* MERGEFORMAT</w:instrText></w:r>"))
            self.assertNotIn("MERGEFORMAT", docx_to_text.blocks(f)[0])

    def test_6_an_EMPTY_paragraph_does_not_dirty_the_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, p(r("uno")) + "<w:p/>" + p(r("dos")))
            self.assertEqual(docx_to_text.blocks(f), ["uno", "dos"])


class TestTable(unittest.TestCase):
    """Trampa mayor: 8 tablas con 1675 celdas en el archivo real."""

    def _grid_xml(self):
        cell = lambda t: f"<w:tc>{p(r(t))}</w:tc>"
        row = lambda *c: "<w:tr>" + "".join(cell(x) for x in c) + "</w:tr>"
        return ("<w:tbl>" + row("Indicador", "2025", "2026")
                + row("PEA", "61064", "61676") + "</w:tbl>")

    def test_7_the_table_keeps_its_ROWS_and_COLUMNS(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, self._grid_xml())
            blocks = docx_to_text.blocks(f)
            self.assertEqual(blocks, ["Indicador\t2025\t2026", "PEA\t61064\t61676"])

    def test_8_NULLIFICATION_walking_the_paragraphs_FLATTENS_the_table(self):
        """Control de anulacion. `root.iter(w:p)` devuelve tambien los
        parrafos de dentro de las celdas, asi que la tabla sale como seis
        lineas sueltas: el 61676 deja de tener fila y columna, y ya no se
        sabe de que indicador es. Con 1675 celdas en el archivo real, es la
        diferencia entre un cuadro y una lista de numeros huerfanos."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, self._grid_xml())
            self.assertNotEqual(
                docx_to_text.blocks(f),
                ["Indicador", "2025", "2026", "PEA", "61064", "61676"])

    def test_9_the_document_ORDER_is_respected(self):
        """Un parrafo antes y otro despues de la tabla. Recorrer primero
        todos los parrafos y luego todas las tablas los reordena, y el
        encabezado del cuadro acaba lejos del cuadro."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, p(r("antes")) + self._grid_xml() + p(r("despues")))
            blocks = docx_to_text.blocks(f)
            self.assertEqual(blocks[0], "antes")
            self.assertEqual(blocks[-1], "despues")

    def test_10_a_TAB_inside_a_CELL_does_not_split_the_column(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            cell = ("<w:tc><w:p><w:r><w:t>a</w:t><w:tab/><w:t>b</w:t>"
                     "</w:r></w:p></w:tc>")
            build(f, f"<w:tbl><w:tr>{cell}<w:tc>{p(r('z'))}</w:tc></w:tr></w:tbl>")
            self.assertEqual(docx_to_text.blocks(f), ["a b\tz"])


class TestVerdict(unittest.TestCase):
    def test_11_a_ZIP_that_is_not_a_document_REFUSES(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            with zipfile.ZipFile(f, "w") as z:
                z.writestr("_rels/.rels", f'<Relationships {PKG}/>')
            with self.assertRaises(Exception) as box:
                docx_to_text.blocks(f)
            self.assertIn("word/document.xml", str(box.exception))


class TestLineSurface(unittest.TestCase):
    def _run(self, *args):
        """Se invoca por `bin/`, no por la ruta al fuente.

        No es una comodidad: este modulo importa a su hermano `ooxml`, y una
        invocacion por ruta al `.py` pone `src/corpus/` en el camino de
        busqueda y no `src/`, asi que muere con `ModuleNotFoundError`. El
        arbol ya lo declara —`trabajo-en-segundo-plano.md`: el envoltorio
        resuelve la raiz y exporta `PYTHONPATH`, «que es justo lo que una
        invocacion por ruta no hace»—. Probar por la ruta al fuente seria
        medir una via que nadie usa.
        """
        wrapper = (reach.thyrox_root()
                      / "bin" / "docx_to_text")
        return subprocess.run(["bash", str(wrapper), *args],
                              capture_output=True, text=True)

    def test_12_dumps_to_stdout_and_publishes_its_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, p(r("una linea")))
            r_ = self._run(str(f))
            self.assertEqual(r_.returncode, 0, r_.stderr)
            self.assertIn("una linea", r_.stdout)
            self.assertIn("bloques", r_.stderr)

    def test_13_a_missing_origin_exits_2_and_emits_NO_count(self):
        r_ = self._run("/no/existe/x.docx")
        self.assertEqual(r_.returncode, 2)
        self.assertNotRegex(r_.stdout, r"\b0\b")


if __name__ == "__main__":
    unittest.main(verbosity=2)
