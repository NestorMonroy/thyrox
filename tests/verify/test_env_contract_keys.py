#!/usr/bin/env python3
"""Control de `check_env_contract_keys.py`.

Qué haría fallar a este control (sub-patrón D): que el gate diera verde con una
clave leída y no declarada — que es el estado en que estaba el árbol cuando se
midió (27 leídas, 9 declaradas, 18 sin declarar).

El caso negativo usa una clave REAL del repo, no una fabricada. Fabricar el
incumplidor lo escribe quien escribió el patrón, y hereda su encuadre: pasaría
igual con un gate que sólo supiera ver la forma que su autor imaginó.
"""
import importlib.util
import pathlib
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
THYROX = HERE.parent.parent
GATE = THYROX / 'src' / 'verify' / 'check_env_contract_keys.py'

#: Real, y leída por la vía INDIRECTA (constante → `env_value`), que es la que
#: el instrumento anterior no seguía. Si el gate sólo viera lecturas directas,
#: este caso pasaría en verde y el control no discriminaría.
REAL_KEY = 'THYROX_BOARD_ROOT'


def run(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(GATE), '--root', str(THYROX), *args],
        capture_output=True, text=True,
    )



def load_gate():
    """El gate como módulo, para observar su recorrido sin lanzar un proceso."""
    spec = importlib.util.spec_from_file_location('check_env_contract_keys', GATE)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

class EnvContractKeysGate(unittest.TestCase):
    def test_arbol_real_sin_claves_sin_declarar(self):
        """El positivo: el árbol tal como está pasa en estricto."""
        result = run('--strict')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('sin declarar: 0', result.stdout)

    def test_retirar_una_clave_real_la_delata(self):
        """El negativo: sin `REAL_KEY` declarada, el gate la nombra y rehúsa."""
        source = (THYROX / '.env.example').read_text()
        self.assertIn(f'{REAL_KEY}=', source, f'{REAL_KEY} ya no se declara; elegir otra real')
        mutated = '\n'.join(
            line for line in source.splitlines() if not line.startswith(f'{REAL_KEY}=')
        )
        with tempfile.NamedTemporaryFile('w', suffix='.env.example', delete=False) as handle:
            handle.write(mutated)
            path = handle.name
        result = run('--env-example', path, '--strict')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn(f'SIN DECLARAR  {REAL_KEY}', result.stdout)

    def test_un_prefijo_de_familia_no_es_una_clave(self):
        """`THYROX_WORKBENCH_` compone una familia; nadie exporta ese nombre.

        Sin la exclusion el gate exigia declararlo en `.env.example`, o sea
        documentar una obligacion que no existe. El control mide la ausencia:
        si el prefijo volviera a contar, esta asercion cae.
        """
        result = run()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertNotIn('THYROX_WORKBENCH_ ', result.stdout)
        self.assertNotIn('SIN DECLARAR  THYROX_WORKBENCH_', result.stdout)

    def test_files_measures_only_the_named_files(self):
        """`--files` mide los archivos del commit, no el árbol entero.

        Con un ejemplo sin `REAL_KEY`, nombrar el archivo que la lee la delata;
        nombrar uno que no la lee pasa, aunque el resto del árbol sí la lea.
        """
        source = (THYROX / '.env.example').read_text()
        mutated = '\n'.join(
            line for line in source.splitlines() if not line.startswith(f'{REAL_KEY}=')
        )
        with tempfile.TemporaryDirectory() as tmp:
            example = pathlib.Path(tmp) / '.env.example'
            example.write_text(mutated)
            reader = pathlib.Path(tmp) / 'reader.py'
            reader.write_text(f'import os\nos.environ.get("{REAL_KEY}")\n')
            quiet = pathlib.Path(tmp) / 'quiet.py'
            quiet.write_text('import os\nos.environ.get("HOME")\n')
            named = run('--env-example', str(example), '--strict', '--files', str(reader))
            self.assertEqual(named.returncode, 1, named.stdout + named.stderr)
            self.assertIn(f'SIN DECLARAR  {REAL_KEY}', named.stdout)
            other = run('--env-example', str(example), '--strict', '--files', str(quiet))
            self.assertEqual(other.returncode, 0, other.stdout + other.stderr)
            self.assertIn('sin declarar: 0', other.stdout)

    def test_files_skips_tests_and_unknown_suffixes(self):
        """Un archivo de prueba o de otra extensión no crea obligación."""
        with tempfile.TemporaryDirectory() as tmp:
            test_file = pathlib.Path(tmp) / 'test_reader.py'
            test_file.write_text('import os\nos.environ.get("THYROX_ONLY_IN_A_TEST")\n')
            text_file = pathlib.Path(tmp) / 'notes.txt'
            text_file.write_text('${THYROX_ONLY_IN_TEXT}\n')
            result = run('--strict', '--files', str(test_file), str(text_file))
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_sin_archivo_rehusa_sin_emitir_cifra(self):
        """Un 0 sin archivo no distinguiría «no falta ninguna» de «no pude medir»."""
        result = run('--env-example', '/no/existe/.env.example', '--strict')
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertNotIn('sin declarar:', result.stdout)



class TraversalCost(unittest.TestCase):
    """El recorrido completo no desciende a lo excluido ni analiza lo que no puede leer claves.

    Medido el 2026-09-29: el modo de árbol entero tardaba 48.5 s porque
    `rglob` entraba en `node_modules` y `_references` antes de descartarlos y
    porque cada uno de los 6209 `.py` pasaba por `ast.parse`, aunque la gran
    mayoría no nombra ninguna clave. Las dos pruebas observan el recorrido y el
    análisis, no el resultado: el resultado es el mismo con y sin la mejora.
    """

    def setUp(self):
        self.gate = load_gate()

    def test_walk_does_not_descend_into_skipped_directories(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'src').mkdir()
            (root / 'src' / 'reader.py').write_text('import os\nos.environ.get("THYROX_A")\n')
            deep = root / 'node_modules' / 'pkg' / 'deep'
            deep.mkdir(parents=True)
            (deep / 'reader.py').write_text('import os\nos.environ.get("THYROX_B")\n')
            visited = []
            real_walk = self.gate.os.walk

            def recording_walk(top, *args, **kwargs):
                for entry in real_walk(top, *args, **kwargs):
                    visited.append(entry[0])
                    yield entry

            self.gate.os.walk = recording_walk
            try:
                files = self.gate.tree_files(root)
            finally:
                self.gate.os.walk = real_walk
            self.assertEqual([root / 'src' / 'reader.py'], files)
            self.assertIn(str(root), visited, 'el recorrido tiene que pasar por os.walk para poder podarse')
            self.assertFalse([path for path in visited if 'node_modules' in path], visited)

    def test_pool_worktrees_are_runtime_state_not_the_tree(self):
        # Un worktree de headless-pool vive bajo `.thyrox/` (ignorado por git) y
        # lleva el código a medio escribir de un ítem en curso: medirlo exigía
        # declarar en `.env.example` una clave que el árbol aún no lee.
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'src').mkdir()
            (root / 'src' / 'reader.py').write_text('import os\nos.environ.get("THYROX_A")\n')
            item = root / '.thyrox' / 'pool-worktrees' / 'run' / '1' / 'src'
            item.mkdir(parents=True)
            (item / 'reader.py').write_text('import os\nos.environ.get("THYROX_IN_FLIGHT")\n')
            self.assertEqual([root / 'src' / 'reader.py'], self.gate.tree_files(root))

    def test_only_files_naming_the_prefix_are_parsed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            reader = root / 'reader.py'
            reader.write_text('import os\nos.environ.get("THYROX_A")\n')
            unrelated = root / 'unrelated.py'
            unrelated.write_text('import os\nos.environ.get("HOME")\n')
            parsed = []
            real_parse = self.gate.ast.parse

            def recording_parse(source, *args, **kwargs):
                parsed.append(source)
                return real_parse(source, *args, **kwargs)

            self.gate.ast.parse = recording_parse
            try:
                keys = self.gate.read_keys(root, [reader, unrelated])
            finally:
                self.gate.ast.parse = real_parse
            self.assertEqual({'THYROX_A'}, set(keys))
            self.assertEqual(1, len(parsed), 'sólo el archivo que nombra el prefijo pasa por el parser')

if __name__ == '__main__':
    unittest.main()
