#!/usr/bin/env python3
"""El arbol recibe archivos comprimidos y no tenia con que abrirlos.

Origen: directiva del ejecutor 2026-09-21 —*"te voy a pasar .7z de noticias,
para que los analices, considera que el thyrox no tiene las herramientas en
bin tienes que implementarlas"*.

Medido antes de escribir una linea, que es lo que la vuelve una carencia y no
una suposicion::

    for c in 7z 7za 7zr p7zip bsdtar; do command -v "$c"; done   -> los cinco AUSENTES
    python3 -c 'import py7zr'                                    -> ModuleNotFoundError

Lo que esta suite fija es el MECANISMO, no el formato de hoy: un archivo se
abre por lo que **es**, no por como se llama, y ningun miembro escribe fuera
del destino.
"""

import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from corpus import archive_extract  # noqa: E402


def _have_sevenz() -> bool:
    return archive_extract.sevenz_bin() is not None


class TestFormatByContent(unittest.TestCase):
    """El formato se lee de los bytes, no del nombre."""

    def test_1_recognizes_7z_by_its_signature(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "cualquiera.bin"
            f.write_bytes(b"7z\xbc\xaf\x27\x1c" + b"\x00" * 32)
            self.assertEqual(archive_extract.kind(f), "7z")

    def test_2_recognizes_zip_by_its_signature(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "sin-extension"
            f.write_bytes(b"PK\x03\x04" + b"\x00" * 32)
            self.assertEqual(archive_extract.kind(f), "zip")

    def test_3_NULLIFICATION_the_name_LIES_and_the_content_does_not(self):
        """Control de anulacion del eje: si el formato saliera del sufijo,
        este caso daria '7z' y la extraccion fallaria mas tarde, con un error
        del extractor equivocado en vez de un veredicto aqui.

        No es hipotetico: el archivo que origina este trabajo llega con nombre
        generado por el cliente (`62a5cdf5-Noticias_-_7f7a.7z`), y un sufijo
        es lo unico que cualquiera puede escribir sin tocar un byte.
        """
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "noticias.7z"
            f.write_bytes(b"PK\x03\x04" + b"\x00" * 32)
            self.assertEqual(archive_extract.kind(f), "zip")

    def test_4_what_is_not_a_compressed_file_is_DECLARED_None(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "plano.txt"
            f.write_text("una noticia suelta", encoding="utf-8")
            self.assertIsNone(archive_extract.kind(f))


class TestConfinement(unittest.TestCase):
    """Ningun miembro escribe fuera del destino.

    El objeto del caso negativo EXISTE —el destino es un directorio real— asi
    que el rechazo lo produce la guarda y no la ausencia. Es el sub-patron D
    de `metrica-decide-la-conclusion.md` aplicado a esta suite.
    """

    def test_5_an_ordinary_member_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertTrue(archive_extract.is_confined(tmp, "notas/2026/uno.html"))

    def test_6_dot_dot_traversal_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertFalse(archive_extract.is_confined(tmp, "../fuera.txt"))

    def test_7_BURIED_traversal_is_refused(self):
        """El que un `startswith('..')` no ve. Es la forma que sobrevive a la
        comprobacion ingenua y por eso vive en su propio caso."""
        with tempfile.TemporaryDirectory() as tmp:
            self.assertFalse(archive_extract.is_confined(tmp, "notas/../../fuera.txt"))

    def test_8_the_absolute_path_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertFalse(archive_extract.is_confined(tmp, "/etc/passwd"))

    def test_9_the_sibling_with_a_shared_PREFIX_is_refused(self):
        """`/dest` y `/destino-ajeno` comparten prefijo de cadena y no de
        arbol. Una comparacion por `startswith` sobre el texto los confunde;
        la que compara por COMPONENTES, no."""
        with tempfile.TemporaryDirectory() as tmp:
            dest = pathlib.Path(tmp) / "dest"
            dest.mkdir()
            (pathlib.Path(tmp) / "dest-ajeno").mkdir()
            self.assertFalse(archive_extract.is_confined(dest, "../dest-ajeno/x.txt"))


class TestProbeByConduct(unittest.TestCase):
    """El extractor se mide por lo que HACE, no por que el nombre resuelva."""

    def test_10_an_impostor_binary_does_NOT_count_as_an_extractor(self):
        """CONTROL POSITIVO del defecto ya cometido en este arbol: la sonda de
        PDF leia el CODIGO DE SALIDA, y `true` sale 0 ante cualquier argumento
        —asi declaraba presente un extractor inexistente—. Aqui se compara la
        SALIDA contra un marcador que solo 7-Zip imprime.
        """
        with tempfile.TemporaryDirectory() as tmp:
            impostor = pathlib.Path(tmp) / "7z"
            impostor.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
            impostor.chmod(0o755)
            previo = os.environ.get("PATH")
            os.environ["PATH"] = tmp
            try:
                self.assertIsNone(archive_extract.sevenz_bin())
            finally:
                os.environ["PATH"] = previo

    def test_11_without_an_extractor_it_REFUSES_and_returns_no_empty_list(self):
        """Una lista vacia se lee como «el archivo no traia nada». Un cero
        sobre cero no es un cero: se declara SIN EXTRACTOR y se rehusa."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.7z"
            f.write_bytes(b"7z\xbc\xaf\x27\x1c" + b"\x00" * 32)
            previo = os.environ.get("PATH")
            os.environ["PATH"] = tmp
            try:
                with self.assertRaises(archive_extract.ExtractorMissing):
                    archive_extract.members(f)
            finally:
                os.environ["PATH"] = previo


class TestRealWalk(unittest.TestCase):
    """Se abre un archivo de verdad, creado en el caso."""

    def setUp(self):
        if not _have_sevenz():
            self.skipTest("SIN SUJETO: no hay extractor de 7z en este contenedor")

    def _member_path(self, raiz: pathlib.Path) -> pathlib.Path:
        origen = raiz / "origen"
        (origen / "2026").mkdir(parents=True)
        (origen / "2026" / "uno.txt").write_text("primera nota", encoding="utf-8")
        (origen / "dos.txt").write_text("segunda nota", encoding="utf-8")
        target = raiz / "noticias.7z"
        subprocess.run(["7z", "a", str(target), "."], cwd=origen,
                       check=True, capture_output=True)
        return target

    def test_12_members_LISTS_without_extracting(self):
        with tempfile.TemporaryDirectory() as tmp:
            raiz = pathlib.Path(tmp)
            arch = self._member_path(raiz)
            dest = raiz / "dest"
            dest.mkdir()
            names = archive_extract.members(arch)
            self.assertIn("dos.txt", names)
            self.assertIn(os.path.join("2026", "uno.txt"), names)
            self.assertEqual(list(dest.iterdir()), [],
                             "listar escribio en el destino")

    def test_13_extract_delivers_the_files_with_their_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            raiz = pathlib.Path(tmp)
            arch = self._member_path(raiz)
            dest = raiz / "dest"
            extracted = archive_extract.extract(arch, dest)
            self.assertEqual(len(extracted), 2, "saco %s" % (extracted,))
            self.assertEqual((dest / "dos.txt").read_text(encoding="utf-8"),
                             "segunda nota")
            self.assertEqual((dest / "2026" / "uno.txt").read_text(encoding="utf-8"),
                             "primera nota")

    def test_14_the_target_is_created_if_it_does_not_exist(self):
        with tempfile.TemporaryDirectory() as tmp:
            raiz = pathlib.Path(tmp)
            arch = self._member_path(raiz)
            dest = raiz / "no" / "existe" / "aun"
            archive_extract.extract(arch, dest)
            self.assertTrue((dest / "dos.txt").is_file())


class TestZipAndTarWithoutBinary(unittest.TestCase):
    """zip y tar los cubre la biblioteca estandar: no anaden dependencia."""

    def test_15_a_zip_opens_without_an_external_extractor(self):
        import zipfile
        with tempfile.TemporaryDirectory() as tmp:
            raiz = pathlib.Path(tmp)
            arch = raiz / "n.zip"
            with zipfile.ZipFile(arch, "w") as z:
                z.writestr("a/b.txt", "contenido")
            dest = raiz / "dest"
            previo = os.environ.get("PATH")
            os.environ["PATH"] = tmp          # sin 7z en el PATH
            try:
                self.assertEqual(archive_extract.members(arch), ["a/b.txt"])
                archive_extract.extract(arch, dest)
            finally:
                os.environ["PATH"] = previo
            self.assertEqual((dest / "a" / "b.txt").read_text(encoding="utf-8"),
                             "contenido")

    def test_16_a_zip_with_traversal_is_refused_WHOLE(self):
        """CONTROL POSITIVO del confinamiento por la via real, no por la
        funcion suelta: se construye el zip malicioso y se comprueba que NO
        aterriza nada — ni siquiera los miembros sanos que lo acompanan."""
        import zipfile
        with tempfile.TemporaryDirectory() as tmp:
            raiz = pathlib.Path(tmp)
            arch = raiz / "malicioso.zip"
            with zipfile.ZipFile(arch, "w") as z:
                z.writestr("sano.txt", "inocente")
                z.writestr("../escapado.txt", "fuera")
            dest = raiz / "dest"
            with self.assertRaises(archive_extract.UnsafeMember):
                archive_extract.extract(arch, dest)
            self.assertFalse((raiz / "escapado.txt").exists())
            self.assertFalse((dest / "sano.txt").exists(),
                             "escribio antes de comprobar: la guarda llega tarde")


class TestLineSurface(unittest.TestCase):
    def _run(self, *args):
        script = pathlib.Path(__file__).resolve().parents[2] / "src" / "corpus" / "archive_extract.py"
        return subprocess.run([sys.executable, str(script), *args],
                              capture_output=True, text=True)

    def test_17_what_is_not_a_file_exits_2_and_NAMES_it(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "plano.txt"
            f.write_text("no soy un archivo comprimido", encoding="utf-8")
            r = self._run(str(f), "--list")
            self.assertEqual(r.returncode, 2, r.stderr)
            self.assertIn("formato", (r.stderr + r.stdout).lower())

    def test_18_a_missing_origin_exits_2_and_emits_NO_count(self):
        r = self._run("/no/existe/x.7z", "--list")
        self.assertEqual(r.returncode, 2)
        self.assertNotRegex(r.stdout, r"\b0\b",
                            "emitio un cero sobre un archivo que no pudo leer")


if __name__ == "__main__":
    unittest.main(verbosity=2)
