#!/usr/bin/env python3
"""Los tres gates que buscan a su dueño como si aún vivieran en el consumidor.

`_owner_path()` hace `SCRIPT_PATH.parents[3].parent / 'thyrox' / …`. Esa
aritmética valía cuando el gate era un stub en `kaupamex-docs/.claude/scripts/
gates/` —parents[3] era el clon, `.parent` el árbol, y `+ thyrox` el hermano—.
Desde `thyrox/src/gates/` da **`/home/thyrox`**, que no existe: el gate busca
a thyrox como hermano de sí mismo.

Medido por el corredor contra el consumidor real: los tres publicaban FALLA
con «el dueño canónico no está», que se lee como violación de la regla y es
una ruta rota.

Qué haría fallar a este control: que el gate volviera a componer la ruta en
vez de resolverla. Se ejercita desde un cwd ajeno, que es como lo invoca el
corredor cuando el árbol medido es el consumidor.
"""
import pathlib
import subprocess
import sys
import tempfile
import unittest

THYROX = pathlib.Path(__file__).resolve().parent.parent.parent
GATES = ('check_script_deprecated.py', 'check_hook_script_token.py', 'check_gitattributes.py')


class OwnerResolutionTest(unittest.TestCase):

    def _run(self, gate, cwd):
        return subprocess.run(
            [sys.executable, str(THYROX / 'src' / 'gates' / gate)],
            cwd=str(cwd), capture_output=True, text=True, timeout=120,
        )

    def test_the_owner_is_found_from_a_foreign_cwd(self):
        """El corredor invoca con cwd = el consumidor, no thyrox."""
        with tempfile.TemporaryDirectory() as tmp:
            for gate in GATES:
                r = self._run(gate, tmp)
                self.assertNotIn('el dueño canónico no está', r.stdout + r.stderr,
                                 f'{gate} no resolvió a su dueño desde {tmp}')

    def test_the_owner_module_is_a_sibling_on_disk(self):
        """La premisa del arreglo, medida: dueño y gate viven juntos."""
        for gate in GATES:
            owner = THYROX / 'src' / 'gates' / gate.replace('check_', '', 1)
            self.assertTrue(owner.is_file(), f'{owner} no está')


if __name__ == '__main__':
    unittest.main(verbosity=2)
