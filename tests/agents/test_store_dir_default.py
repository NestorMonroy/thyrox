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

LO QUE ESTOS CINCO CASOS NO PODIAN VER (anadido 2026-09-09, TASK-DOCS-0284).
Todos construyen su `Namespace` a mano con `repo=None`, asi que ninguno pasa
por el parser — y el defecto vivia justo ahi: `add_target_args` declaraba
`--repo` con `default="docs"`, de modo que `args.repo` NUNCA era None y el
peldano del HOGAR era inalcanzable para todo llamador real. Los cinco casos
estaban en verde con el defecto vivo: un verde que no distingue «el mecanismo
resuelve al hogar» de «el test no pregunta por el parser». `TestParserDefault`
cierra esa ceguera midiendo el objeto que el parser produce.
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
from paths import reach  # noqa: E402


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


class TestParserDefault(unittest.TestCase):
    """El objeto que el PARSER produce, no uno construido a mano.

    CONTROL DE ANULACION, con mutacion de un eje por vez:

    - revertir solo el default de `--repo` a `"docs"` -> caen los tres casos de
      esta clase, y ninguno de `TestDestinoPorDefecto`;
    - revertir solo el respaldo de `document_root` -> cae `test_4`, y solo el 4.

    Una primera mutacion sustituyo con `sed` todos los `default=None` a esa
    indentacion y toco TRES banderas, entre ellas `--claude-dir`. Bajo esa
    mutacion `test_2` sobrevivio —`Path("docs").resolve()` cae dentro del
    proveedor y no lleva el prefijo del clon— y de ahi salio la conclusion,
    falsa, de que esa asercion no discriminaba. Una mutacion que toca varios
    ejes no dice cual sostiene cada asercion.
    """

    def _sin_banderas(self) -> argparse.Namespace:
        return agent_store.build_parser().parse_args(["init"])

    def test_1_el_default_de_repo_no_nombra_un_consumidor(self):
        self.assertIsNone(getattr(self._sin_banderas(), "repo", "AUSENTE"))

    def test_2_el_destino_sin_banderas_es_el_hogar(self):
        self.assertEqual(
            agent_store.resolve_store_dir(self._sin_banderas()).resolve(),
            agents_paths.agent_store_path().parent.resolve(),
        )

    def test_3_el_destino_sin_banderas_no_cae_en_ningun_clon(self):
        destino = agent_store.resolve_store_dir(self._sin_banderas())
        self.assertFalse(
            [p for p in destino.parts if p.startswith("kaupamex-")], destino)

    def test_4_el_arbol_documental_no_se_rompe_con_repo_ausente(self):
        """El par que impide arreglar un eje rompiendo el otro.

        `document_root` usaba el mismo `--repo` como respaldo, asi que mover su
        default a None lo dejaba sin raiz. El arbol de gestion es de `docs` por
        construccion y el store vive en el proveedor: son dos ejes, y cada uno
        declara su propio default.
        """
        argumentos = argparse.Namespace(
            repo=None, claude_dir=None, repo_docs=None, subtree="source")
        self.assertEqual(agent_store.document_root(argumentos),
                         reach.root(agent_store.DOCS_CONSUMER))


if __name__ == "__main__":
    unittest.main(verbosity=2)
