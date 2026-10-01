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
import re
import pathlib
import sqlite3
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
THYROX = HERE.parent.parent
HOOK = THYROX / '.githooks' / 'pre-commit'
GATE = THYROX / 'src' / 'verify' / 'check_provider_evidence.py'
# Los dos gates de paquete que TASK-DOCS-0530 cablea al hook. Viajan al repo
# sintetico porque el hook REHUSA por su ausencia — es su contrato, no un
# descuido. Sin copiarlos, esta suite entera se pondria roja por el arreglo.
PACKAGE_GATES = ('check-agent-artifacts.sh', 'check-cli-typecheck.sh')
# Los gates que el hook invoca se DERIVAN del propio hook, no se enumeran a
# mano. La tupla escrita a mano derivo tres veces —`check-cross-model-read.sh`,
# `check_bench_untracked.py` y `check_cache_layout.py` entraron al hook sin
# entrar al fixture— y cada vez el commit semilla moria en setUp: todos los
# casos rojos por deriva del fixture, no por el contrato que dicen medir.
HOOK_GATES_NAMED = tuple(sorted(set(re.findall(r'\$GATES/([\w.-]+)', HOOK.read_text()))))


def with_sibling_imports(gates: tuple[str, ...]) -> tuple[str, ...]:
    """Los gates y, transitivamente, los módulos hermanos que importan.

    El hook nombra `checkEnvPrefix.ts`, que importa `./renameEnvPrefix.ts`, y
    `check_identifier_language.py`, que lanza `ts_declared_identifiers.ts`:
    copiar sólo lo nombrado dejaba el gate sin su módulo («Cannot find
    module»). Se deriva del texto de cada gate, igual que la lista de gates se
    deriva del hook.
    """
    found: list[str] = []
    pending = list(gates)
    while pending:
        name = pending.pop()
        if name in found:
            continue
        found.append(name)
        if name.endswith(('.ts', '.py')):
            text = (THYROX / 'src' / 'verify' / name).read_text()
            pending.extend(sibling for sibling in re.findall(r'([\w.-]+\.ts)\b', text)
                           if (THYROX / 'src' / 'verify' / sibling).is_file())
    return tuple(sorted(found))


def freeze_whole_tree_baselines(repo: pathlib.Path) -> None:
    """Deja listos los gates que miden el árbol ENTERO: sus raíces y su línea base.

    `check_product_word` y `checkEnvPrefix` no miden lo que se commitea sino
    todo `src/`, y la línea base del proveedor describe el árbol del
    proveedor: en un árbol parcial sobran entradas y faltan pruebas. Estas
    suites no miden esos gates, así que el fixture hace lo que haría un
    consumidor al adoptarlos: congelar su deuda de partida con el propio gate.
    """
    # `check_md_relative_links` rehúsa sin sus dos raíces: el árbol las tiene.
    for home in ('skills', 'rules'):
        (repo / '.claude' / home).mkdir(parents=True, exist_ok=True)
        (repo / '.claude' / home / '.keep').write_text('')
    # El recorrido de los .ts carga `typescript`: se enlaza el del proveedor.
    (repo / 'node_modules').symlink_to(THYROX / 'node_modules', target_is_directory=True)
    with (repo / '.gitignore').open('a') as ignore:
        ignore.write('node_modules\n')
    (repo / IDENTIFIER_BASELINE).parent.mkdir(parents=True, exist_ok=True)
    (repo / IDENTIFIER_BASELINE).write_text('')
    verify = repo / 'src' / 'verify'
    for command in (
        [sys.executable, str(verify / 'check_product_word.py'), '--repo', str(repo), '--write-baseline'],
        ['bun', str(verify / 'checkEnvPrefix.ts'), '--root', str(repo), '--write-baseline'],
    ):
        frozen = subprocess.run(command, capture_output=True, text=True)
        if frozen.returncode != 0:
            raise RuntimeError(f'{command[1]}: {frozen.stdout}{frozen.stderr}')


HOOK_GATES = with_sibling_imports(HOOK_GATES_NAMED)


IDENTIFIER_BASELINE = pathlib.Path('.claude') / 'baselines' / 'identifier_language_baseline.txt'


def git(repo: pathlib.Path, *args: str) -> subprocess.CompletedProcess:
    # Los verificadores de lint son del proveedor (`check_lint_zero.py`): el
    # repo sintético no tiene `.venv`, y sin esta variable el gate rehusaba
    # con exit 2 en el commit semilla y los doce casos caían en setUp.
    env = {**os.environ, 'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@t',
           'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@t',
           'THYROX_LINT_BIN_DIR': str(THYROX / '.venv' / 'bin'),
           # El repo sintético no hereda deuda de idioma: su línea base, vacía y declarada.
           'IDENTIFIER_LANGUAGE_BASELINE': str(repo / IDENTIFIER_BASELINE)}
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
        # `check_cache_layout.py` resuelve su hogar con `cache.paths`.
        shutil.copytree(THYROX / 'src' / 'cache', self.repo / 'src' / 'cache')
        (self.repo / 'src' / 'verify').mkdir()
        shutil.copy(GATE, self.repo / 'src' / 'verify' / GATE.name)
        for gate in HOOK_GATES:
            shutil.copy(THYROX / 'src' / 'verify' / gate,
                        self.repo / 'src' / 'verify' / gate)
        (self.repo / '.githooks').mkdir()
        shutil.copy(HOOK, self.repo / '.githooks' / 'pre-commit')
        os.chmod(self.repo / '.githooks' / 'pre-commit', 0o755)
        git(self.repo, 'init', '-q')
        git(self.repo, 'config', 'core.hooksPath', '.githooks')
        git(self.repo, 'add', '-A')
        # Los gates de árbol entero miden lo versionado: se congela tras el add.
        freeze_whole_tree_baselines(self.repo)
        git(self.repo, 'add', '-A')
        # La semilla monta el fixture y no es lo que se prueba: sin
        # `--no-verify` le pasaban todos los gates del hook, y el lint medía la
        # copia parcial de `src/` (`declarations.py` importa `rules`, que no
        # viaja). Los casos commitean después, con el hook activo.
        seed = git(self.repo, 'commit', '-q', '--no-verify', '-m', 'seed')
        self.assertEqual(seed.returncode, 0, seed.stdout + seed.stderr)

    def test_identity_that_differs_from_the_declared_one_blocks(self):
        """El fixture commitea como `t <t@t>`; el `.env` declara otra identidad."""
        (self.repo / '.env').write_text(
            'THYROX_COMMIT_AUTHOR=Declared Author <author@example.com>\n'
            'THYROX_COMMIT_COMMITTER=Declared Committer <committer@example.com>\n')
        (self.repo / 'nota.txt').write_text('x\n')
        git(self.repo, 'add', 'nota.txt')
        result = git(self.repo, 'commit', '-q', '-m', 'identidad ajena')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('difiere de la identidad declarada', result.stderr)

    def test_undeclared_identity_warns_without_blocking(self):
        """Sin declaracion no hay veredicto: se avisa SIN MEDIR y no se bloquea."""
        (self.repo / 'nota.txt').write_text('x\n')
        git(self.repo, 'add', 'nota.txt')
        result = git(self.repo, 'commit', '-q', '-m', 'sin declarar')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('SIN MEDIR', result.stderr)

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

    def test_a_relative_import_into_a_sibling_package_blocks(self):
        """Un paquete se entra por su `exports`, no por el `src/` del vecino.

        `package_boundary.py` existía con su suite y nadie lo corría: ningún
        flujo lo invocaba. Que lo haría fallar: que el hook no lo llame, o que
        lo llame sin `--strict` y el cruce pase con exit 0.
        """
        for name in ('a', 'b'):
            pkg = self.repo / 'src' / 'pk' / name
            pkg.mkdir(parents=True)
            (pkg / 'package.json').write_text(
                '{"name": "@p/%s", "exports": {".": "./index.ts"}}\n' % name)
        (self.repo / 'src' / 'pk' / 'a' / 'index.ts').write_text('export const a = 1\n')
        (self.repo / 'src' / 'pk' / 'b' / 'index.ts').write_text(
            "import { a } from '../a/index.ts'\nexport const b = a\n")
        git(self.repo, 'add', 'src/pk')
        result = git(self.repo, 'commit', '-q', '-m', 'cruce relativo')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('../a/index.ts', result.stdout + result.stderr)

    def test_a_named_import_between_packages_passes(self):
        """El control: el mismo acoplamiento por el nombre del paquete no es cruce."""
        for name in ('a', 'b'):
            pkg = self.repo / 'src' / 'pk' / name
            pkg.mkdir(parents=True)
            (pkg / 'package.json').write_text(
                '{"name": "@p/%s", "exports": {".": "./index.ts"}}\n' % name)
        (self.repo / 'src' / 'pk' / 'a' / 'index.ts').write_text('export const a = 1\n')
        (self.repo / 'src' / 'pk' / 'b' / 'index.ts').write_text(
            "import { a } from '@p/a'\nexport const b = a\n")
        git(self.repo, 'add', 'src/pk')
        result = git(self.repo, 'commit', '-q', '-m', 'por nombre')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_el_clon_real_lo_tiene_activado(self):
        """`core.hooksPath` no se versiona: se comprueba que este clon lo fijo."""
        configured = git(THYROX, 'config', 'core.hooksPath').stdout.strip()
        # Relativa (`.githooks`, la que escribe install-hooks.sh) o absoluta al
        # mismo directorio: las dos activan el hook. Se compara el directorio
        # resuelto, no la grafía.
        self.assertTrue(configured, 'core.hooksPath sin fijar: corre `bash scripts/install-hooks.sh`')
        self.assertEqual((THYROX / configured).resolve(), HOOK.parent.resolve(),
                         'core.hooksPath no apunta al .githooks de este clon')
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
        for package in ('paths', 'workbench', 'task', 'cache'):
            shutil.copytree(THYROX / 'src' / package, self.repo / 'src' / package,
                            ignore=shutil.ignore_patterns('__pycache__'))
        (self.repo / 'src' / 'verify').mkdir()
        shutil.copy(GATE, self.repo / 'src' / 'verify' / GATE.name)
        for gate in HOOK_GATES:
            shutil.copy(THYROX / 'src' / 'verify' / gate,
                        self.repo / 'src' / 'verify' / gate)
        (self.repo / '.githooks').mkdir()
        shutil.copy(HOOK, self.repo / '.githooks' / 'pre-commit')
        os.chmod(self.repo / '.githooks' / 'pre-commit', 0o755)

        # El board: una tarjeta con el sujeto y la descripcion CORREGIDA.
        self.board_root = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.board_root, ignore_errors=True)
        card = self.board_root / self.SESSION
        card.mkdir()
        (card / '7.json').write_text(json.dumps(
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
        # Los gates de árbol entero miden lo versionado: se congela tras el add.
        freeze_whole_tree_baselines(self.repo)
        git(self.repo, 'add', '-A')
        # La semilla monta el fixture y no es lo que se prueba: sin
        # `--no-verify` le pasaban todos los gates del hook, y el lint medía la
        # copia parcial de `src/` (`declarations.py` importa `rules`, que no
        # viaja). Los casos commitean después, con el hook activo.
        seed = git(self.repo, 'commit', '-q', '--no-verify', '-m', 'seed')
        self.assertEqual(seed.returncode, 0, seed.stdout + seed.stderr)

    def _row_of_commit(self, ref='HEAD'):
        """La fila tal como quedo DENTRO del commit, no en el disco."""
        blob = subprocess.run(
            ['git', '-C', str(self.repo), 'show', f'{ref}:{self.STORE_REL}'],
            capture_output=True)
        copy = pathlib.Path(tempfile.mkdtemp()) / 'store.sqlite3'
        copy.write_bytes(blob.stdout)
        conn = sqlite3.connect(copy)
        try:
            return conn.execute(
                'SELECT status, description FROM tasks WHERE citation_id=?',
                ('TASK-DOCS-7777',)).fetchone()
        finally:
            conn.close()

    def _commit_with_the_store(self, message):
        # Se toca el store para que entre al commit por su propio cambio, que
        # es como llega de verdad: el turno escribe telemetria y lo commitea.
        conn = sqlite3.connect(self.repo / self.STORE_REL)
        conn.execute("INSERT INTO tasks (task_id, subject, session_id)"
                     " VALUES ('99','otra cosa',?)", (self.SESSION,))
        conn.commit(); conn.close()
        git(self.repo, 'add', self.STORE_REL)
        env = {**os.environ, 'THYROX_BOARD_ROOT': str(self.board_root)}
        return subprocess.run(
            ['git', '-C', str(self.repo), 'commit', '-q', '-m', message],
            capture_output=True, text=True,
            env={**env, 'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@t',
                 'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@t'})

    def test_the_store_arrives_reconciled_to_commit(self):
        self.assertEqual(self._row_of_commit(), ('pending', 'la vieja'),
                         'precondicion: el seed lleva la fila vieja')
        output = self._commit_with_the_store('telemetria del turno')
        self.assertEqual(output.returncode, 0, output.stdout + output.stderr)
        self.assertEqual(
            self._row_of_commit(), ('completed', 'la corregida'),
            'el commit lleva la fila ya convergida — el hook reconcilio Y '
            're-preparo; sin el re-add, el disco converge y el commit no')

    def test_without_the_store_in_the_commit_not_se_reconciles(self):
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
        output = subprocess.run(
            ['git', '-C', str(self.repo), 'commit', '-q', '-m', 'sin store'],
            capture_output=True, text=True, env=env)
        self.assertEqual(output.returncode, 0, output.stdout + output.stderr)
        self.assertEqual(self._row_of_commit(), ('pending', 'la vieja'),
                         'la fila sigue vieja: no se reconcilio nada')


if __name__ == '__main__':
    unittest.main()
