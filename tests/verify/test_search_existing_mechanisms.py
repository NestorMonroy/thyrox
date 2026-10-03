#!/usr/bin/env python3
"""Control de `search_existing_mechanisms.py` (TASK-THYROX-0919).

La consulta responde qué mecanismos declarados existen para un concepto, a
partir de un registro TSV con las columnas
`id concept authority symbol public_entry tests consumers keywords`.
Responde sólo FOUND, RELATED o NONE: la decisión REUSE/EXTEND/MISSING se
toma después, leyendo la autoridad y sus pruebas, y nunca sale de aquí.

Reglas, en orden:
1. coincidencia exacta de `id` o `concept`, sin distinguir mayúsculas → FOUND;
2. todas las palabras de la consulta están en `keywords`, `concept` o `id` → FOUND;
3. alguna palabra coincide con `keywords`, `authority`, `symbol` o
   `public_entry` → RELATED;
4. nada → NONE.

Qué haría fallar a este control: una consulta que confunda FOUND con
RELATED, que imprima RELATED antes que FOUND, que salga 0 sin coincidencias,
que imprima NONE cuando no pudo leer el registro, o que emita una decisión.
"""
import pathlib
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
THYROX = HERE.parent.parent
QUERY = THYROX / 'src' / 'verify' / 'search_existing_mechanisms.py'

HEADER = 'id\tconcept\tauthority\tsymbol\tpublic_entry\ttests\tconsumers\tkeywords'
ROWS = [
    '# registro de prueba: los comentarios se ignoran',
    HEADER,
    'process-ownership\tdrain the processes a pool owns\tsrc/session/process_ownership.py'
    '\tdrain\tprocess_ownership\ttests/session/test_process_ownership.py\tsrc/session/headless-pool.sh'
    '\tprocess drain orphan kill',
    'item-worktree\tisolated git worktree per pool item\tsrc/session/item_worktree.sh'
    '\t-\t-\ttests/session/test-item-worktree.sh\t-\tworktree isolation git item',
    'wait-jobs\twait for background jobs with a barrier\tsrc/session/wait-jobs.sh'
    '\t-\twait-jobs\ttests/session/test-wait-jobs.sh\t-\tbarrier wait background jobs',
]


def run(registry: pathlib.Path, *query: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(QUERY), '--registry', str(registry), *query],
        capture_output=True, text=True, check=False,
    )


class SearchExistingMechanismsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.registry = pathlib.Path(self.tmp.name) / 'mechanisms.tsv'
        self.registry.write_text('\n'.join(ROWS) + '\n', encoding='utf-8')

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def verdicts(self, result: subprocess.CompletedProcess) -> list[str]:
        return [line for line in result.stdout.splitlines() if line.split(' ')[0] in ('FOUND', 'RELATED', 'NONE')]

    def test_exact_id_is_found_with_its_authority(self) -> None:
        result = run(self.registry, 'process-ownership')
        self.assertEqual(result.returncode, 0)
        self.assertEqual(self.verdicts(result), ['FOUND process-ownership'])
        self.assertIn('  authority: src/session/process_ownership.py', result.stdout)
        self.assertIn('  symbol: drain', result.stdout)
        self.assertIn('  entry: process_ownership', result.stdout)
        self.assertIn('  tests: tests/session/test_process_ownership.py', result.stdout)
        self.assertIn('  consumers: src/session/headless-pool.sh', result.stdout)

    def test_exact_concept_ignores_case(self) -> None:
        result = run(self.registry, 'Isolated', 'Git', 'Worktree', 'per', 'pool', 'ITEM')
        self.assertEqual(self.verdicts(result), ['FOUND item-worktree'])

    def test_all_words_in_keywords_is_found(self) -> None:
        result = run(self.registry, 'barrier', 'jobs')
        self.assertEqual(self.verdicts(result), ['FOUND wait-jobs'])

    def test_some_word_in_keywords_or_authority_is_related(self) -> None:
        result = run(self.registry, 'orphan', 'container')
        self.assertEqual(result.returncode, 0)
        self.assertEqual(self.verdicts(result), ['RELATED process-ownership'])

    def test_found_is_printed_before_related(self) -> None:
        result = run(self.registry, 'wait', 'background')
        self.assertEqual(self.verdicts(result)[0], 'FOUND wait-jobs')
        result = run(self.registry, 'worktree', 'drain')
        self.assertEqual(sorted(self.verdicts(result)), ['RELATED item-worktree', 'RELATED process-ownership'])

    def test_nothing_matching_is_none_with_exit_one(self) -> None:
        result = run(self.registry, 'quantum', 'teleport')
        self.assertEqual(result.returncode, 1)
        self.assertEqual(self.verdicts(result), ['NONE'])

    def test_unreadable_registry_exits_two_without_none(self) -> None:
        result = run(pathlib.Path(self.tmp.name) / 'absent.tsv', 'drain')
        self.assertEqual(result.returncode, 2)
        self.assertNotIn('NONE', result.stdout)
        self.assertNotEqual(result.stderr.strip(), '')

    def test_output_never_carries_a_decision(self) -> None:
        for query in (['process-ownership'], ['orphan'], ['quantum']):
            result = run(self.registry, *query)
            for word in ('REUSE', 'EXTEND', 'MISSING'):
                self.assertNotIn(word, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
