#!/usr/bin/env python3
"""Control del `pre-commit` de THYROX — el invocador que le faltaba al gate.

Qué haría fallar a este control (sub-patrón D): que el hook exista, sea
ejecutable y **no rechace** un commit con un banco de evidencia en el árbol del
proveedor. Ése es el estado en que estuvo el árbol diecisiete horas: el gate
escrito, registrado, discriminando, y ningún hook que lo corriera — once bancos
después. Ver L-028.

El repo de prueba es sintético y tiene la FORMA de THYROX (el marcador
`src/paths/reach.py` y el gate real copiado), no un incumplidor fabricado a
medida del patrón: el hook resuelve sus gates desde la raíz de git, así que
medirlo sobre un árbol con esa forma es medir lo que corre de verdad.
"""
import os
import pathlib
import shutil
import subprocess
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
THYROX = HERE.parent.parent
HOOK = THYROX / '.githooks' / 'pre-commit'
GATE = THYROX / 'src' / 'verify' / 'check_provider_evidence.py'


def git(repo: pathlib.Path, *args: str) -> subprocess.CompletedProcess:
    env = {**os.environ, 'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@t',
           'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@t'}
    return subprocess.run(['git', '-C', str(repo), *args],
                          capture_output=True, text=True, env=env)


class PreCommitHook(unittest.TestCase):
    def setUp(self):
        self.repo = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.repo, ignore_errors=True)
        # La forma de THYROX: el marcador y el gate real, no una imitacion.
        (self.repo / 'src').mkdir()
        # El `reach.py` REAL, no un marcador vacio: el gate importa de el, y un
        # stub convierte el caso en un ImportError que no mide nada.
        shutil.copytree(THYROX / 'src' / 'paths', self.repo / 'src' / 'paths')
        shutil.copytree(THYROX / 'src' / 'workbench', self.repo / 'src' / 'workbench')
        (self.repo / 'src' / 'verify').mkdir()
        shutil.copy(GATE, self.repo / 'src' / 'verify' / GATE.name)
        (self.repo / '.githooks').mkdir()
        shutil.copy(HOOK, self.repo / '.githooks' / 'pre-commit')
        os.chmod(self.repo / '.githooks' / 'pre-commit', 0o755)
        git(self.repo, 'init', '-q')
        git(self.repo, 'config', 'core.hooksPath', '.githooks')
        git(self.repo, 'add', '-A')
        self.assertEqual(git(self.repo, 'commit', '-q', '-m', 'seed').returncode, 0)

    def test_sin_bancos_el_commit_pasa(self):
        """El positivo: sin bancos propios, el hook no estorba."""
        (self.repo / 'archivo.txt').write_text('algo\n')
        git(self.repo, 'add', 'archivo.txt')
        result = git(self.repo, 'commit', '-q', '-m', 'cambio normal')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_un_banco_en_el_proveedor_rechaza_el_commit(self):
        """El negativo: con un banco propio, el commit no entra."""
        banco = self.repo / '.claude' / 'eventos' / 'un-banco-20260907T000000'
        banco.mkdir(parents=True)
        (banco / 'evidencia.md').write_text('lo que sea\n')
        (self.repo / 'archivo.txt').write_text('algo\n')
        git(self.repo, 'add', 'archivo.txt')
        antes = git(self.repo, 'rev-parse', 'HEAD').stdout.strip()
        result = git(self.repo, 'commit', '-q', '-m', 'deberia rechazarse')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('el commit se detiene', result.stderr)
        self.assertEqual(git(self.repo, 'rev-parse', 'HEAD').stdout.strip(), antes,
                         'HEAD avanzo: el hook no detuvo el commit')

    def test_sin_gates_rehusa_en_vez_de_omitir(self):
        """Un exit 0 con los gates inalcanzables seria un verde falso."""
        shutil.rmtree(self.repo / 'src' / 'verify')
        (self.repo / 'archivo.txt').write_text('algo\n')
        git(self.repo, 'add', 'archivo.txt')
        result = git(self.repo, 'commit', '-q', '-m', 'sin gates')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('verde falso', result.stderr)

    def test_un_gate_que_revienta_no_publica_la_receta_del_banco(self):
        """Reventar no es dictaminar: el remedio del banco seria un mensaje falso.

        Es el sub-patron D en dos capas. El hook colapsaba los tres desenlaces
        en `|| CODIGO=1`; y aun separandolos, una excepcion no capturada sale
        con 1 de Python, indistinguible de «hay bancos». Por eso el arreglo
        vive en el GATE: un fallo inesperado sale por 2. Sin eso, un
        `ImportError` publicaba la receta de mover un banco — un hallazgo
        falso, no un error.

        Ciega a: un gate cuyo ARCHIVO se sustituye por basura — muere antes de
        llegar a su propio guard y sale con el 1 de Python. Ese caso el hook no
        lo puede separar de un hallazgo, y no se finge que si.
        """
        # La mutacion es REALISTA: un fallo DENTRO de `main`, que es donde
        # revienta un gate de verdad. Sustituir el archivo entero por basura
        # mataria al proceso antes de su propio guard, y eso el hook no lo
        # puede distinguir de un hallazgo — declarado abajo como ceguera.
        gate = self.repo / 'src' / 'verify' / GATE.name
        source = gate.read_text()
        marker = 'def main('
        head, _, tail = source.partition(marker)
        body = tail.split('\n', 1)
        gate.write_text(head + marker + body[0] + '\n    raise RuntimeError("revento")\n' + body[1])
        (self.repo / 'archivo.txt').write_text('algo\n')
        git(self.repo, 'add', 'archivo.txt')
        result = git(self.repo, 'commit', '-q', '-m', 'gate roto')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('NO PUDO MEDIR', result.stderr)
        self.assertNotIn('Muevelo al arbol del consumidor', result.stderr)

    def test_el_clon_real_lo_tiene_activado(self):
        """`core.hooksPath` no se versiona: se comprueba que este clon lo fijo."""
        configured = git(THYROX, 'config', 'core.hooksPath').stdout.strip()
        self.assertEqual(configured, '.githooks',
                         'core.hooksPath sin fijar: corre `bash scripts/install-hooks.sh`')
        self.assertTrue(os.access(HOOK, os.X_OK), f'{HOOK} sin permiso de ejecucion')


if __name__ == '__main__':
    unittest.main()
