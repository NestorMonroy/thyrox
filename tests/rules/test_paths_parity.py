#!/usr/bin/env python3
"""Control de paridad entre las dos mitades del hogar de reglas.

Qué haría fallar a este control (sub-patrón D): cambiar `RULES_DIR_VAR` o
`RULES_SEGMENT` en una mitad y no en la otra. Ese par es UNA declaración
partida en dos lenguajes, y su deriva es SILENCIOSA — las dos mitades seguirían
corriendo, cada una resolviendo un hogar distinto, y el emisor escribiría donde
el registro de `declarations.py` no mira.

No se comprueba «las dos constantes existen»: eso pasaría igual con valores
distintos. Se comprueba que sean IGUALES, que es lo que la paridad afirma.

Ciega a: la deriva de `defaultRulesDir`/`default_rules_dir`, cuyo cuerpo no se
compara — sólo sus dos insumos declarados. Un cambio de composición en una sola
mitad no lo ve este control.
"""
from __future__ import annotations

import re
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

from paths import reach  # noqa: E402
from rules import paths as rules  # noqa: E402

THYROX = reach.thyrox_root()
TS = THYROX / "src" / "rules" / "paths.ts"

#: Las constantes que las dos mitades declaran, y su lector en el lado TS.
#: Se leen del FUENTE y no de un `bun -e` a propósito: el control no debe
#: exigir que el otro toolchain esté instalado para poder emitir veredicto.
PATRON = r"export const {name} = '([^']*)'"


def literal_ts(name: str) -> str:
    fuente = TS.read_text(encoding="utf-8")
    hallado = re.search(PATRON.format(name=name), fuente)
    if hallado is None:
        raise AssertionError(
            f"{TS} no declara `export const {name} = '...'`. El control REHÚSA "
            f"en vez de dar por buena la paridad: un veredicto verde aquí no "
            f"distinguiría «coinciden» de «no pude leer una de las dos»."
        )
    return hallado.group(1)


class RulesPathsParity(unittest.TestCase):
    def test_la_variable_de_entorno_es_la_misma(self):
        self.assertEqual(rules.RULES_DIR_VAR, literal_ts("RULES_DIR_VAR"))

    def test_el_segmento_es_el_mismo(self):
        self.assertEqual(rules.RULES_SEGMENT, literal_ts("RULES_SEGMENT"))

    def test_el_segmento_de_estado_no_se_escribe_en_ninguna_mitad(self):
        """DEC-01: el tramo `.claude` lo declara `stateDir`, no esta familia.

        Componerlo a mano en cualquiera de las dos mitades sería la segunda
        fuente de verdad de la partición producto/estado.
        """
        for mitad in (TS, THYROX / "src" / "rules" / "paths.py"):
            cuerpo = "\n".join(
                l for l in mitad.read_text(encoding="utf-8").splitlines()
                if not l.lstrip().startswith(("*", "#", "//"))
            )
            self.assertNotIn("'.claude'", cuerpo, f"{mitad} compone el tramo a mano")
            self.assertNotIn('".claude"', cuerpo, f"{mitad} compone el tramo a mano")

    def test_el_hogar_del_consumidor_cae_dentro_del_consumidor(self):
        """El defecto de #286: resolver el hogar del consumidor DENTRO del proveedor."""
        for repo, root in reach.roots().items():
            with self.subTest(repo=repo):
                self.assertTrue(
                    str(rules.consumer_rules_dir(root)).startswith(str(root)),
                    f"{repo}: el hogar cae fuera de su propia raíz",
                )


if __name__ == "__main__":
    unittest.main()
