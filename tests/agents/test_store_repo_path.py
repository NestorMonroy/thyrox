#!/usr/bin/env python3
"""`--repo` acepta la RUTA de un clon, con o sin prefijo (H-THYROX-177).

`--repo` sólo aceptaba un nombre del roster (`docs`) y componía
`<prefijo><repo>`: un consumidor sin prefijo —`ai-course-notes`— no tenía
forma de nombrarse, y el adaptador de ese clon rehusaba los comandos del
store por eso.

Qué haría fallar a estos casos:

1. que `--repo` siguiera validando sólo contra el roster (cae el caso 1);
2. que la ruta se tomara tal cual y no por la raíz de su clon (cae el 2);
3. que una ruta inexistente cayera a un nombre del roster o al hogar (cae el 3);
4. que el nombre del roster dejara de resolverse como antes (cae el 4).
"""

import argparse
import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))

_spec = importlib.util.spec_from_file_location(
    "agent_store_repo_path", _ROOT / "src" / "agents" / "agent_store.py")
assert _spec is not None and _spec.loader is not None
agent_store = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(agent_store)


def _args(repo: str) -> argparse.Namespace:
    return argparse.Namespace(claude_dir=None, repo=repo)


class RepoAsClonePath(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.clone = Path(self._tmp.name) / "ai-course-notes"
        (self.clone / "tools").mkdir(parents=True)
        subprocess.run(["git", "init", "-q", str(self.clone)], check=True)

    def tearDown(self):
        self._tmp.cleanup()

    def test_1_unprefixed_clone_path_resolves_to_its_store(self):
        self.assertEqual(agent_store.resolve_store_dir(_args(str(self.clone))),
                         self.clone.resolve() / ".claude" / "agent-results")

    def test_2_a_path_inside_the_clone_resolves_to_the_clone_root(self):
        self.assertEqual(agent_store.resolve_store_dir(_args(str(self.clone / "tools"))),
                         self.clone.resolve() / ".claude" / "agent-results")

    def test_3_missing_path_is_an_error(self):
        with self.assertRaises((ValueError, FileNotFoundError)):
            agent_store.resolve_store_dir(_args(str(self.clone / "no-existe")))

    def test_4_roster_name_still_resolves_by_name(self):
        repo = next(iter(agent_store.valid_repos()), None)
        if repo is None:
            self.skipTest("sin roster derivable en este árbol")
        expected = agent_store.reach_roots.root(repo) / ".claude" / "agent-results"
        if not expected.parent.parent.is_dir():
            self.skipTest(f"{expected.parent.parent} no existe aquí")
        self.assertEqual(agent_store.resolve_store_dir(_args(repo)), expected)


if __name__ == "__main__":
    os.environ.setdefault("GIT_CONFIG_NOSYSTEM", "1")
    unittest.main()
