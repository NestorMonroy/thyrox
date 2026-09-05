#!/usr/bin/env python3
"""
test_unwrap_rst — pruebas de la normalización de párrafos RST.

Origen: directiva del ejecutor 2026-08-11 — *"esta prueba y código, ¿está
documentada y guardada en docs?"*. La verificación existía pero corría como
heredoc y moría con el shell: una comprobación que no se puede re-ejecutar no
es evidencia en la siguiente sesión (``react-verification-gate.md``).

**Cada caso de constructo es un defecto medido, no un caso hipotético.** La
primera versión de ``unwrap_rst.py`` reimplementaba la gramática RST con regex
propias y corrompía cuatro constructos; la versión vigente importa la tabla de
``docutils.parsers.rst.states.Body``. Estas pruebas fijan esa diferencia para
que una regresión la reviva en vez de esconderla.

Casos de constructo — lo que NO se debe tocar:

1. **tabla grid** — ``+---+---+`` sobrevivía por casualidad, no por diseño.
2. **lista de opciones** — ``-v`` / ``--long`` se unían como si fueran prosa.
3. **bloque doctest** — ``>>>`` se unían entre sí.
4. **enumeradores** — ``(1)``, ``a.``, ``iv.``: sólo se reconocía ``1.``.
5. **viñeta unicode** — ``•``/``‣``/``⁃`` no se reconocían como viñeta.
6. **contenido de directiva** — un ``code-block`` nunca se une.
7. **lista de campos** — el bloque ``.. meta::`` queda intacto.
8. **bloque literal** — lo que sigue a ``::`` queda intacto.

Casos de prosa — lo que SÍ se une:

9.  **párrafo envuelto** queda en una línea.
10. **cuerpo de un ítem de lista** queda en una línea.
11. **título** conserva su subrayado en la línea siguiente.

Casos sobre el corpus real (los que dan confianza de verdad):

12. **preservación del parseo** — el conteo de errores de docutils es idéntico
    antes y después en cada archivo de hallazgos del repo.
13. **idempotencia** — aplicar dos veces da lo mismo que aplicar una.

Ejecución::

   cd /home/user/kaupamex-docs
   .venv/bin/python -m unittest discover -s scripts -p 'test_unwrap_rst.py'
"""
import glob
import io
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from docutils.core import publish_doctree                    # noqa: E402
from unwrap_rst import unwrap                                # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def parse_errors(text):
    """Errores y fallos severos que docutils reporta sobre este texto."""
    buffer = io.StringIO()
    try:
        publish_doctree(text, settings_overrides={
            'report_level': 2, 'halt_level': 5, 'warning_stream': buffer,
            'file_insertion_enabled': False})
    except Exception as exc:                                 # pragma: no cover
        return f'EXC {exc}'
    report = buffer.getvalue()
    return report.count('ERROR') + report.count('SEVERE')


class ConstructosIntactos(unittest.TestCase):
    """Los constructos con estructura propia nunca se unen."""

    def assert_unchanged(self, text):
        self.assertEqual(unwrap(text), text)

    def test_grid_table(self):
        self.assert_unchanged('+------+------+\n| a    | b    |\n+------+------+')

    def test_option_list(self):
        self.assert_unchanged('-v  modo detallado\n--long  otra opción')

    def test_doctest_block(self):
        self.assert_unchanged('>>> foo()\n>>> bar()')

    def test_enumerators(self):
        self.assert_unchanged('(1) primer ítem\n(2) segundo ítem')
        self.assert_unchanged('a. letra\niv. romano')

    def test_unicode_bullets(self):
        self.assert_unchanged('• viñeta\n‣ otra\n⁃ tercera')

    def test_directive_content(self):
        self.assert_unchanged(
            '.. code-block:: python\n\n   x = 1\n   y = 2')

    def test_field_list(self):
        self.assert_unchanged('.. meta::\n   :clave: valor\n   :otra: cosa')

    def test_literal_block(self):
        self.assert_unchanged('Cierre::\n\n   no tocar\n   esta parte')


class ProsaUnida(unittest.TestCase):
    """La prosa —y sólo la prosa— queda en una línea."""

    def test_wrapped_paragraph(self):
        self.assertEqual(
            unwrap('Un párrafo envuelto\nen tres líneas que\ndebe quedar en una.'),
            'Un párrafo envuelto en tres líneas que debe quedar en una.')

    def test_list_item_body(self):
        self.assertEqual(
            unwrap('- un ítem cuyo cuerpo\n  viene envuelto en dos líneas'),
            '- un ítem cuyo cuerpo viene envuelto en dos líneas')

    def test_title_keeps_its_underline(self):
        self.assert_title = 'Título\n======\n\nPrimer párrafo.'
        self.assertEqual(unwrap(self.assert_title), self.assert_title)

    def test_paragraph_before_title_is_not_swallowed(self):
        original = 'Cierre del párrafo.\n\nSiguiente título\n=================='
        self.assertEqual(unwrap(original), original)

    def test_role_at_paragraph_start_is_prose(self):
        # ``:ref:`x``` es un rol en línea (prosa), no una lista de campos. Se
        # distinguen por el acento grave pegado a los dos puntos de cierre.
        self.assertEqual(
            unwrap(':ref:`h-api-1` abre el párrafo\ny sigue en la segunda línea.'),
            ':ref:`h-api-1` abre el párrafo y sigue en la segunda línea.')


class CorpusReal(unittest.TestCase):
    """La transformación preserva el documento en los archivos del repo."""

    @classmethod
    def setUpClass(cls):
        cls.paths = sorted(glob.glob(os.path.join(
            REPO, 'source/gestion/pm/*/iniciativas/*/hallazgos/*.rst')))

    def test_hay_corpus_que_medir(self):
        # Un universo vacío no prueba nada: la suite saldría verde sin medir.
        self.assertGreater(len(self.paths), 20,
                           'el corpus de hallazgos no se encontró')

    def test_preserva_el_parseo_y_es_idempotente(self):
        divergentes, no_idempotentes = [], []
        for path in self.paths:
            with open(path, encoding='utf-8') as handle:
                original = handle.read()
            rewritten = unwrap(original)
            if parse_errors(original) != parse_errors(rewritten):
                divergentes.append(path)
            if unwrap(rewritten) != rewritten:
                no_idempotentes.append(path)
        self.assertEqual(divergentes, [], 'cambia los errores de parseo')
        self.assertEqual(no_idempotentes, [], 'no es idempotente')


if __name__ == '__main__':
    unittest.main(verbosity=2)
