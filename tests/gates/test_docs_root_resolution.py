#!/usr/bin/env python3
"""El gate que ancla su raíz por aritmética y enumera los clones a mano.

``check_binary_literal_citations.py`` hace ``HERE.parents[2]`` y **asegura**
que ahí hay ``source/gestion/pm``. Su propio comentario todavía dice
``.claude/scripts/gates`` — la ruta de antes de la mudanza. Desde
``thyrox/src/gates/`` da ``/home/user``, y el ``assert`` revienta con
Traceback, que el corredor lee como violación de la regla.

Y enumera los cinco clones como literales (``REPOS = ("kaupamex-docs", …)``),
que es lo que #170 nombra: un consumidor que escribe la lista en vez de
pedirla.

Las dos cosas ya las resuelve ``src/paths/reach.py`` con las dos entradas de
entorno. Este control mide que el gate las use.
"""
import pathlib
import subprocess
import sys
import tempfile
import unittest

THYROX = pathlib.Path(__file__).resolve().parent.parent.parent
GATE = THYROX / 'src' / 'gates' / 'check_binary_literal_citations.py'


class DocsRootResolutionTest(unittest.TestCase):

    def test_it_does_not_die_importing_from_a_foreign_cwd(self):
        """El corredor lo invoca con cwd = el consumidor."""
        with tempfile.TemporaryDirectory() as tmp:
            r = subprocess.run([sys.executable, str(GATE), '--help'],
                               cwd=tmp, capture_output=True, text=True, timeout=60)
            self.assertNotIn('Traceback', r.stderr, r.stderr[-600:])

    def test_the_clone_list_is_asked_for_not_written(self):
        """#170 — un consumidor que enumera los cinco literalmente."""
        source = GATE.read_text()
        self.assertNotIn('"kaupamex-docs", "kaupamex-api"', source)
        self.assertNotIn("'kaupamex-docs', 'kaupamex-api'", source)


if __name__ == '__main__':
    unittest.main(verbosity=2)
