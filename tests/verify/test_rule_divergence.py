#!/usr/bin/env python3
"""Control de `check_rule_divergence` — que el veredicto lo decida el criterio.

Que haria fallar a este control (sub-patron D): que el clasificador reparta los
tres cubos por algo que no es el criterio declarado. Se mide por ANULACION, no
por camino feliz: se retira el detector de cheat-sheet y tienen que caer
EXACTAMENTE las copias que lo declaran — ni una mas, ni una menos.

Un caso que solo comprobara «hay tres cubos» pasaria igual con el criterio y sin
el: no discriminaria.
"""
import sys
import unittest
from pathlib import Path

# Bootstrap canónico (`paths.reach.BOOTSTRAP`): ascenso con detección hasta
# el marcador, NO `parents[N]`. Un offset acierta a UNA profundidad y falla en
# silencio al mover el archivo; el ascenso sobrevive el cambio de anidamiento.
# Es el único punto donde `paths.reach` todavía no se puede importar — de ahí
# en adelante la raíz sale de `reach.thyrox_root()`, no de más aritmética.
_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))
sys.path.insert(0, str(_RAIZ / "src" / "verify"))
import check_rule_divergence as gate  # noqa: E402


def survey():
    roots = dict(gate.reach.roots())
    roots["thyrox"] = gate.reach.thyrox_root()
    return gate.survey(roots)


class RuleDivergence(unittest.TestCase):
    def setUp(self):
        self.shared, self.measured = survey()
        if not self.shared:
            self.skipTest("sin nombres compartidos que medir")

    def test_el_universo_tiene_denominador(self):
        """Un conteo sin denominador no es un resultado."""
        self.assertGreater(self.measured, len(self.shared))

    def test_todo_nombre_compartido_vive_en_dos_arboles_o_mas(self):
        for name, copies in self.shared.items():
            self.assertGreaterEqual(len(copies), 2, name)

    def test_cada_copia_recibe_exactamente_un_veredicto(self):
        for name, copies in self.shared.items():
            verdicts = gate.classify(name, copies)
            self.assertEqual(sorted(repo for repo, _, _ in verdicts),
                             sorted(copies), name)

    def test_anular_el_detector_mueve_solo_a_las_que_lo_declaran(self):
        """La anulacion: sin marcador, caen las cheat-sheet y NADIE mas."""
        antes = {(name, repo): bucket
                 for name, copies in self.shared.items()
                 for repo, bucket, _ in gate.classify(name, copies)}
        declaradas = {clave for clave, bucket in antes.items() if bucket == "cheat-sheet"}
        self.assertTrue(declaradas, "sin cheat-sheets no hay nada que anular")

        original = gate.declares_canon
        gate.declares_canon = lambda path: False
        try:
            despues = {(name, repo): bucket
                       for name, copies in self.shared.items()
                       for repo, bucket, _ in gate.classify(name, copies)}
        finally:
            gate.declares_canon = original

        movidas = {clave for clave in antes if antes[clave] != despues[clave]}
        self.assertEqual(movidas, declaradas,
                         "la anulacion movio copias que no declaraban su canon")

        # Y restaurar tiene que devolver el veredicto: si no, el control mide
        # un estado que ya no existe.
        restaurado = {(name, repo): bucket
                      for name, copies in self.shared.items()
                      for repo, bucket, _ in gate.classify(name, copies)}
        self.assertEqual(restaurado, antes)

    def test_una_subsumida_no_aporta_ninguna_linea_propia(self):
        for name, copies in self.shared.items():
            lines = {repo: gate.content_lines(path) for repo, path in copies.items()}
            for repo, bucket, _ in gate.classify(name, copies):
                if bucket != "subsumida":
                    continue
                self.assertTrue(
                    any(not (lines[repo] - lines[other])
                        for other in copies if other != repo),
                    f"{repo}::{name} clasificada subsumida sin quien la contenga")


if __name__ == "__main__":
    unittest.main()
