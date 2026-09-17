#!/usr/bin/env python3
"""El corredor tiene que separar «rehuso» de «rojo» en sus TRES mitades.

Exit 2 es «rehuso, no emito veredicto» — el contrato que ``check_script_naming``
y varias suites de verify usan cuando falta su sujeto. La mitad de shell de
``tests/run.sh`` ya lo honra con un ``case``; la de Python lo colapsaba con el 1:

    python3 "$suite" || { echo "-- ROJO $suite"; rojos_py=$(( rojos_py + 1 )); }

Con eso el corredor publica «la suite fallo» donde lo cierto es «no habia con
que medir», y ese rojo entra al conteo que decide si la ejecucion entera falla.
Es el sub-patron D de ``metrica-decide-la-conclusion.md`` con el propio corredor
como instrumento: su veredicto no discrimina las dos causas.

El sujeto NO son las suites reales del arbol: son tres suites SINTETICAS con
salida declarada —0, 1 y 2—. Medir esto contra una suite real ataria el control
al estado de ese archivo, que cambia; y una suite real que hoy rehusa puede ser
un rehuse FALSO, en cuyo caso el corredor «arreglado» lo escondería para
siempre. El sintetico separa las dos preguntas.

Uso:  python3 tests/meta/test_runner_exit_two.py
"""

from __future__ import annotations

import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
RUNNER = ROOT / 'tests' / 'run.sh'

SUITES = {
    'test_green.py': 0,
    'test_red.py': 1,
    'test_refuses.py': 2,
}


class RunnerExitTwoTestCase(unittest.TestCase):
    """Corre una COPIA del corredor sobre un arbol sintetico.

    ``run.sh`` hace ``cd "$(dirname "$0")/.."`` y descubre con ``find tests``,
    asi que colocar la copia en ``<tmp>/tests/run.sh`` la ancla al arbol
    sintetico sin tocar el real ni recurrir sobre si misma.
    """

    def setUp(self) -> None:
        self._tree = tempfile.TemporaryDirectory()
        tree = pathlib.Path(self._tree.name)
        (tree / 'tests').mkdir()
        shutil.copy(RUNNER, tree / 'tests' / 'run.sh')
        for name, code in SUITES.items():
            (tree / 'tests' / name).write_text(
                f'import sys\nprint({name!r})\nsys.exit({code})\n', encoding='utf-8')
        self.tree = tree

    def tearDown(self) -> None:
        self._tree.cleanup()

    def _run(self) -> subprocess.CompletedProcess:
        return subprocess.run(
            ['bash', str(self.tree / 'tests' / 'run.sh'), '--python-only'],
            capture_output=True, text=True, timeout=120)

    def test_names_the_refusal_as_unmeasured_not_red(self) -> None:
        proc = self._run()
        self.assertIn('SIN MEDIR (exit 2) tests/test_refuses.py', proc.stdout)
        self.assertNotIn('ROJO tests/test_refuses.py', proc.stdout)

    def test_still_names_the_real_red(self) -> None:
        proc = self._run()
        self.assertIn('ROJO tests/test_red.py', proc.stdout)

    def test_counts_one_red_and_one_unmeasured(self) -> None:
        proc = self._run()
        self.assertIn('Python: 3 suite(s), 1 en rojo, 1 sin medir', proc.stdout)

    def test_the_refusal_alone_does_not_fail_the_run(self) -> None:
        """Sin el rojo real, un rehuse NO puede hacer fallar la ejecucion.

        Es la mitad que carga el peso: si el 2 siguiera sumando a `failures`,
        el conteo de arriba podria estar bien y el veredicto global mal.
        """
        (self.tree / 'tests' / 'test_red.py').unlink()
        proc = self._run()
        self.assertEqual(proc.returncode, 0, proc.stdout)
        self.assertIn('OK:', proc.stdout)


if __name__ == '__main__':
    unittest.main(verbosity=2)
