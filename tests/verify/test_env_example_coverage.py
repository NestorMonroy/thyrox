#!/usr/bin/env python3
"""Control de `check_env_example_coverage.py`.

`.env` no se versiona: puede llevar secretos, como la clave de cifrado del
store de conexiones. `.env.example` es entonces la única declaración que
viaja, y cada clave del `.env` tiene que figurar en él. El gate lo comprueba
sin imprimir nunca un valor.

Qué haría fallar a este control: un gate que diera verde con una clave del
`.env` ausente del ejemplo, que contara como declarada una clave comentada
distinta, o que publicara un valor en su salida.
"""
import pathlib
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
THYROX = HERE.parent.parent
GATE = THYROX / 'src' / 'verify' / 'check_env_example_coverage.py'
SECRET = 'valor-secreto-que-no-se-imprime'


def run(root: pathlib.Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(GATE), '--root', str(root), *args],
                          capture_output=True, text=True, timeout=60)


class CoverageTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        (self.root / '.env.example').write_text(
            '# Comentario libre\nTHYROX_A=/ruta\n# THYROX_B=opcional\nexport THYROX_E=x\n')

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_all_keys_declared_passes(self) -> None:
        (self.root / '.env').write_text(f'THYROX_A={SECRET}\nTHYROX_B=1\nexport THYROX_E=2\n')
        done = run(self.root)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        self.assertIn('0 clave(s) sin declarar', done.stdout)

    def test_undeclared_key_fails_and_is_named(self) -> None:
        (self.root / '.env').write_text(f'THYROX_A=1\nTHYROX_C={SECRET}\n')
        done = run(self.root)
        self.assertEqual(done.returncode, 1)
        self.assertIn('THYROX_C', done.stdout)
        self.assertIn('1 clave(s) sin declarar', done.stdout)

    def test_values_are_never_printed(self) -> None:
        (self.root / '.env').write_text(f'THYROX_C={SECRET}\nTHYROX_A={SECRET}\n')
        done = run(self.root)
        self.assertNotIn(SECRET, done.stdout + done.stderr)

    def test_comment_mentioning_a_key_is_not_a_key_of_env(self) -> None:
        (self.root / '.env').write_text('# THYROX_C=desactivada\nTHYROX_A=1\n')
        self.assertEqual(run(self.root).returncode, 0)

    def test_exported_key_is_a_key(self) -> None:
        (self.root / '.env').write_text('export THYROX_F=1\n')
        done = run(self.root)
        self.assertEqual(done.returncode, 1)
        self.assertIn('THYROX_F', done.stdout)

    def test_local_override_is_covered_too(self) -> None:
        (self.root / '.env').write_text('THYROX_A=1\n')
        (self.root / '.env.local').write_text('THYROX_D=1\n')
        done = run(self.root)
        self.assertEqual(done.returncode, 1)
        self.assertIn('THYROX_D', done.stdout)

    def test_no_env_file_is_measured_and_says_so(self) -> None:
        done = run(self.root)
        self.assertEqual(done.returncode, 0)
        self.assertIn('0 archivo(s)', done.stdout)

    def test_without_example_it_refuses(self) -> None:
        (self.root / '.env.example').unlink()
        (self.root / '.env').write_text('THYROX_A=1\n')
        done = run(self.root)
        self.assertEqual(done.returncode, 2)
        self.assertEqual(done.stdout, '')


class RealTreeTest(unittest.TestCase):
    def test_this_tree_declares_every_key_of_its_env(self) -> None:
        done = run(THYROX)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)


if __name__ == '__main__':
    unittest.main()
