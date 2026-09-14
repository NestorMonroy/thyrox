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
import json
import os
import pathlib
import sqlite3
import shutil
import subprocess
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
THYROX = HERE.parent.parent
HOOK = THYROX / '.githooks' / 'pre-commit'
GATE = THYROX / 'src' / 'verify' / 'check_provider_evidence.py'
# Los dos gates de paquete que TASK-DOCS-0530 cablea al hook. Viajan al repo
# sintetico porque el hook REHUSA por su ausencia — es su contrato, no un
# descuido. Sin copiarlos, esta suite entera se pondria roja por el arreglo.
PACKAGE_GATES = ('check-agent-artifacts.sh', 'check-harness-typecheck.sh')
# El tercero NO esta en el bucle de rehuse del hook —se invoca sin comprobar
# que exista— asi que su ausencia no produce el mensaje de «verde falso»
# sino un `bash: no such file` que pone CODE=1. Viaja al repo sintetico por
# eso: sin el, el commit semilla de ESTA suite fallaba y sus seis casos
# morian en setUp. Medido: 6 de 6 rojos por deriva del fixture, no por el
# contrato que dicen medir.
UNCHECKED_GATES = ('check-cross-model-read.sh',)


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
        for gate in PACKAGE_GATES + UNCHECKED_GATES:
            shutil.copy(THYROX / 'src' / 'verify' / gate,
                        self.repo / 'src' / 'verify' / gate)
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

    def test_un_banco_en_el_proveedor_se_reporta(self):
        """El negativo: con un banco propio, el gate lo NOMBRA en la salida.

        Este caso exigia `returncode == 1` y estaba ROJO desde que el hook dejo
        de invocar el gate con `--strict` (2026-09-09, directiva del ejecutor:
        "ignora la regla, no queremos perder el trabajo"). El contrato del hook
        cambio y su control no: medido con el hook anterior a TASK-DOCS-0530, el
        rojo ya estaba. Reponer `--strict` para que el test pase seria hacer que
        el instrumento gobierne la decision, que es al reves.

        Que lo haria fallar: que el gate no vea el banco. Eso es lo que este
        caso puede medir hoy.

        Ciega a: si el BLOQUEO funciona — el hook reporta y no detiene. Esa
        mitad la miden los tres casos de tests/workbench/test_provider_evidence.py
        que ejercitan `--strict`, y volveria aqui el dia que se reponga.
        """
        banco = self.repo / '.claude' / 'eventos' / 'un-banco-20260907T000000'
        banco.mkdir(parents=True)
        (banco / 'evidencia.md').write_text('lo que sea\n')
        (self.repo / 'archivo.txt').write_text('algo\n')
        git(self.repo, 'add', 'archivo.txt')
        result = git(self.repo, 'commit', '-q', '-m', 'el banco se reporta')
        self.assertIn('un-banco-20260907T000000', result.stdout + result.stderr)
        self.assertIn('banco(s) emitido(s)', result.stdout + result.stderr)

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

    def test_sin_un_gate_de_paquete_rehusa(self):
        """El contrato de rehusar-en-vez-de-omitir alcanza a los dos nuevos.

        Que lo haria fallar: que el hook trate un gate de paquete ausente como
        «no aplica» y salga 0. Ese verde no distingue «la superficie no cambio»
        de «el gate no esta», que es exactamente el mensaje que estos dos
        imprimian en el consumidor y por el que se mudaron aqui.
        """
        (self.repo / 'src' / 'verify' / PACKAGE_GATES[0]).unlink()
        (self.repo / 'archivo.txt').write_text('algo\n')
        git(self.repo, 'add', 'archivo.txt')
        result = git(self.repo, 'commit', '-q', '-m', 'sin gate de paquete')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('verde falso', result.stderr)
        self.assertIn(PACKAGE_GATES[0], result.stderr)

    def test_el_clon_real_lo_tiene_activado(self):
        """`core.hooksPath` no se versiona: se comprueba que este clon lo fijo."""
        configured = git(THYROX, 'config', 'core.hooksPath').stdout.strip()
        self.assertEqual(configured, '.githooks',
                         'core.hooksPath sin fijar: corre `bash scripts/install-hooks.sh`')
        self.assertTrue(os.access(HOOK, os.X_OK), f'{HOOK} sin permiso de ejecucion')


class PreCommitReconcilesBoard(unittest.TestCase):
    """El cableado de #184: el store que va al commit llega reconciliado.

    Qué haría fallar a este control: que el hook commitee el store SIN pasar
    por el reconciliador — que es el estado en que estuvo el arbol desde que
    `reconcile_status` existe. El mecanismo discriminaba y nadie lo corria.

    El caso es de CONDUCTA, no de literal: mide la fila DENTRO del blob
    commiteado, no que el hook mencione el comando. Un hook que reconciliara
    el archivo del disco y no lo re-preparara dejaria la fila vieja en el
    commit, y un `grep` del mensaje no lo veria.
    """

    STORE_REL = 'agent-results/agent_store.sqlite3'
    SESSION = '44444444-4444-4444-4444-444444444444'
    SUBJECT = 'el sujeto es la llave del pareo'

    def setUp(self):
        self.repo = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.repo, ignore_errors=True)
        (self.repo / 'src').mkdir()
        for paquete in ('paths', 'workbench', 'task'):
            shutil.copytree(THYROX / 'src' / paquete, self.repo / 'src' / paquete,
                            ignore=shutil.ignore_patterns('__pycache__'))
        (self.repo / 'src' / 'verify').mkdir()
        shutil.copy(GATE, self.repo / 'src' / 'verify' / GATE.name)
        for gate in PACKAGE_GATES + UNCHECKED_GATES:
            shutil.copy(THYROX / 'src' / 'verify' / gate,
                        self.repo / 'src' / 'verify' / gate)
        (self.repo / '.githooks').mkdir()
        shutil.copy(HOOK, self.repo / '.githooks' / 'pre-commit')
        os.chmod(self.repo / '.githooks' / 'pre-commit', 0o755)

        # El board: una tarjeta con el sujeto y la descripcion CORREGIDA.
        self.board_root = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.board_root, ignore_errors=True)
        tarjeta = self.board_root / self.SESSION
        tarjeta.mkdir()
        (tarjeta / '7.json').write_text(json.dumps(
            {'id': '7', 'subject': self.SUBJECT, 'status': 'completed',
             'description': 'la corregida'}))

        # El store: la misma fila con el estado y la descripcion viejos.
        store = self.repo / 'agent-results'
        store.mkdir()
        conn = sqlite3.connect(store / 'agent_store.sqlite3')
        conn.execute('CREATE TABLE tasks (task_id TEXT, subject TEXT,'
                     ' description TEXT, status TEXT, session_id TEXT,'
                     ' updated_at TEXT, citation_id TEXT)')
        conn.execute('INSERT INTO tasks VALUES (?,?,?,?,?,?,?)',
                     ('7', self.SUBJECT, 'la vieja', 'pending', self.SESSION,
                      '2026-01-01T00:00:00', 'TASK-DOCS-7777'))
        conn.commit(); conn.close()

        git(self.repo, 'init', '-q')
        git(self.repo, 'config', 'core.hooksPath', '.githooks')
        git(self.repo, 'add', '-A')
        self.assertEqual(git(self.repo, 'commit', '-q', '-m', 'seed').returncode, 0)

    def _fila_del_commit(self, ref='HEAD'):
        """La fila tal como quedo DENTRO del commit, no en el disco."""
        blob = subprocess.run(
            ['git', '-C', str(self.repo), 'show', f'{ref}:{self.STORE_REL}'],
            capture_output=True)
        copia = pathlib.Path(tempfile.mkdtemp()) / 'store.sqlite3'
        copia.write_bytes(blob.stdout)
        conn = sqlite3.connect(copia)
        try:
            return conn.execute(
                'SELECT status, description FROM tasks WHERE citation_id=?',
                ('TASK-DOCS-7777',)).fetchone()
        finally:
            conn.close()

    def _commit_con_el_store(self, mensaje):
        # Se toca el store para que entre al commit por su propio cambio, que
        # es como llega de verdad: el turno escribe telemetria y lo commitea.
        conn = sqlite3.connect(self.repo / self.STORE_REL)
        conn.execute("INSERT INTO tasks (task_id, subject, session_id)"
                     " VALUES ('99','otra cosa',?)", (self.SESSION,))
        conn.commit(); conn.close()
        git(self.repo, 'add', self.STORE_REL)
        env = {**os.environ, 'THYROX_BOARD_ROOT': str(self.board_root)}
        return subprocess.run(
            ['git', '-C', str(self.repo), 'commit', '-q', '-m', mensaje],
            capture_output=True, text=True,
            env={**env, 'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@t',
                 'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@t'})

    def test_el_store_llega_reconciliado_al_commit(self):
        self.assertEqual(self._fila_del_commit(), ('pending', 'la vieja'),
                         'precondicion: el seed lleva la fila vieja')
        salida = self._commit_con_el_store('telemetria del turno')
        self.assertEqual(salida.returncode, 0, salida.stdout + salida.stderr)
        self.assertEqual(
            self._fila_del_commit(), ('completed', 'la corregida'),
            'el commit lleva la fila ya convergida — el hook reconcilio Y '
            're-preparo; sin el re-add, el disco converge y el commit no')

    def test_sin_el_store_en_el_commit_no_se_reconcilia(self):
        """El hook no toca el store cuando el commit no lo lleva.

        Reconciliar en TODO commit escribiria telemetria en un pase que no la
        pidio, y el `git add` posterior meteria al commit un archivo que su
        autor no puso. La condicion es el disparador, no una optimizacion.
        """
        (self.repo / 'archivo.txt').write_text('algo\n')
        git(self.repo, 'add', 'archivo.txt')
        env = {**os.environ, 'THYROX_BOARD_ROOT': str(self.board_root),
               'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@t',
               'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@t'}
        salida = subprocess.run(
            ['git', '-C', str(self.repo), 'commit', '-q', '-m', 'sin store'],
            capture_output=True, text=True, env=env)
        self.assertEqual(salida.returncode, 0, salida.stdout + salida.stderr)
        self.assertEqual(self._fila_del_commit(), ('pending', 'la vieja'),
                         'la fila sigue vieja: no se reconcilio nada')


if __name__ == '__main__':
    unittest.main()
