#!/usr/bin/env python3
"""Sin repo ni directorio, el store se resuelve al HOGAR — no se rehusa.

MITAD ROJA. `resolve_store_dir` rehusaba cuando no le daban ni `--repo` ni
`--claude-dir`, y la razon estaba bien puesta: *«inventar un destino es peor
que rehusar»*. Pero desde el 2026-09-07 ya no hay nada que inventar — hay UN
hogar declarado, `thyrox/agent-results/`, y derivarlo del localizador no es
inventarlo.

POR QUE IMPORTA, y es lo que este control atrapa: mientras rehusaba, todo
llamador tenia que declarar un destino, y el hook vivo del consumidor declaraba
`--repo docs`. Ese literal es el peldano MAS especifico de la cadena, asi que
gana sobre `storePath()` y sobre `agent_store_path()`: reapuntar los dos NO
alcanzaba al escritor mayoritario. El silo de :ref:`h-docs-1237` sobrevivia al
arreglo que se hizo para cerrarlo.
"""

import argparse
import importlib.util
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "src"))

_spec = importlib.util.spec_from_file_location(
    "agent_store_para_el_control", RAIZ / "src" / "agents" / "agent_store.py")
agent_store = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(agent_store)

from agents import agents_paths  # noqa: E402


def _args(**kw) -> argparse.Namespace:
    base = {"claude_dir": None, "repo": None}
    base.update(kw)
    return argparse.Namespace(**base)


class TestDestinoPorDefecto(unittest.TestCase):
    def test_1_sin_nada_declarado_devuelve_el_hogar_del_proveedor(self):
        """Falla si sigue rehusando. Es el cambio entero: el llamador deja de
        tener que declarar un destino, y por tanto deja de poder declarar el
        equivocado."""
        self.assertEqual(
            agent_store.resolve_store_dir(_args()).resolve(),
            agents_paths.agent_store_path().parent.resolve(),
        )

    def test_2_no_apunta_al_silo(self):
        """Falla si el defecto vuelve por otra via. El nombre del clon esta
        escrito a proposito: es el destino que el hook declaraba."""
        self.assertNotIn("kaupamex-docs", str(agent_store.resolve_store_dir(_args())))

    def test_3_claude_dir_sigue_ganando(self):
        """Falla si el peldano nuevo pisa al mas especifico. Una ruta explicita
        es lo que usa una prueba para no contaminar el store real."""
        d = RAIZ / "agent-results"
        self.assertEqual(
            agent_store.resolve_store_dir(_args(claude_dir=str(d))).resolve(),
            d.resolve(),
        )

    def test_4_un_repo_declarado_a_proposito_sigue_resolviendo(self):
        """Falla si el peldano nuevo retira la capacidad de apuntar a un clon.

        NO se retira: un consumidor puede alojar telemetria propia a proposito,
        y `backfill` la necesita para leer un store heredado. Lo que cambia es
        que ya no es OBLIGATORIO declararlo, no que este prohibido.
        """
        d = agent_store.resolve_store_dir(_args(repo="docs"))
        self.assertTrue(str(d).endswith(".claude/agent-results"), d)
        self.assertIn("docs", str(d))

    def test_5_un_repo_invalido_sigue_rehusando(self):
        """Falla si el peldano nuevo se traga un error del llamador.

        Es el par que hace discriminar al caso 1: «no declarar» pasa a tener
        destino, pero «declarar mal» tiene que seguir siendo un error — si no,
        un typo aterrizaria en el hogar en silencio y el llamador creeria haber
        escrito donde pidio.
        """
        with self.assertRaises(ValueError):
            agent_store.resolve_store_dir(_args(repo="no-existe"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
