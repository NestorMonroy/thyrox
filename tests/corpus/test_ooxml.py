#!/usr/bin/env python3
"""La capa de PAQUETE que los tres lectores OOXML comparten.

Se factoriza al llegar el tercero —`.pptx`, `.xlsx` y ahora `.docx`—, no
antes: dos copias son una coincidencia y tres son un mecanismo. Lo que
comparten NO es el contenido —DrawingML, SpreadsheetML y WordprocessingML
son vocabularios distintos— sino el **contenedor**: un ZIP con sus
relaciones y su rechazo.
"""

import pathlib
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from corpus import ooxml  # noqa: E402

PKG = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"'
OD = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


class TestOpening(unittest.TestCase):
    def test_1_what_is_not_a_ZIP_REFUSES(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            f.write_bytes(b"no soy un zip")
            with self.assertRaises(ooxml.NotOoxml):
                ooxml.open_package(f)

    def test_2_a_ZIP_WITHOUT_a_package_manifest_REFUSES(self):
        """El objeto EXISTE y es un zip valido, asi que el rechazo lo produce
        la comprobacion y no la ausencia del archivo."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            with zipfile.ZipFile(f, "w") as z:
                z.writestr("hola.txt", "no soy un paquete")
            with self.assertRaises(ooxml.NotOoxml):
                ooxml.open_package(f)

    def test_3_a_valid_package_opens(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            with zipfile.ZipFile(f, "w") as z:
                z.writestr("_rels/.rels", f'<Relationships {PKG}/>')
            with ooxml.open_package(f) as package:
                self.assertIn("_rels/.rels", package.namelist())

    def test_4_a_SPECIFIC_part_can_be_required(self):
        """Cada formato tiene su parte obligatoria —`word/document.xml`,
        `xl/workbook.xml`— y el rechazo la NOMBRA: mandar a mirar «el
        paquete» no es un remedio."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            with zipfile.ZipFile(f, "w") as z:
                z.writestr("_rels/.rels", f'<Relationships {PKG}/>')
            with self.assertRaises(ooxml.NotOoxml) as box:
                ooxml.open_package(f, require="word/document.xml")
            self.assertIn("word/document.xml", str(box.exception))


class TestRelations(unittest.TestCase):
    def _paquete(self, path, target):
        with zipfile.ZipFile(path, "w") as z:
            z.writestr("_rels/.rels", f'<Relationships {PKG}/>')
            z.writestr("word/_rels/document.xml.rels",
                       f'<Relationships {PKG}><Relationship Id="rId7"'
                       f' Type="{OD}/hyperlink" Target="{target}"/></Relationships>')
        return ooxml.open_package(path)

    def test_5_a_RELATIVE_Target_resolves_against_its_part(self):
        """`Target="header1.xml"` dentro de `word/_rels/` es
        `word/header1.xml`, no `header1.xml`. Resolverlo contra la raiz
        busca una parte que no existe."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            with self._paquete(f, "header1.xml") as p:
                rels = ooxml.relationships(p, "word/document.xml")
            self.assertEqual(rels["rId7"], "word/header1.xml")

    def test_6_an_ABSOLUTE_Target_gets_no_prefix_appended(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            with self._paquete(f, "/word/media/x.png") as p:
                rels = ooxml.relationships(p, "word/document.xml")
            self.assertEqual(rels["rId7"], "word/media/x.png")

    def test_7_a_part_WITHOUT_rels_yields_an_empty_map_and_does_not_blow_up(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            with zipfile.ZipFile(f, "w") as z:
                z.writestr("_rels/.rels", f'<Relationships {PKG}/>')
            with ooxml.open_package(f) as p:
                self.assertEqual(ooxml.relationships(p, "word/document.xml"), {})


if __name__ == "__main__":
    unittest.main(verbosity=2)
