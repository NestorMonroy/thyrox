#!/usr/bin/env python3
"""`reach.consumer_root()` no devuelve el PROVEEDOR como si fuera consumidor.

MITAD ROJA. `CONSUMER_MARKER` es `.claude`, y thyrox tiene `.claude/`: el
ascenso se detiene en el proveedor y lo devuelve. Con eso `workbench_dir()`
compone `<thyrox>/.claude/workbench`, un hogar que `declarations.py` no lista
entre los suyos — la cascara invisible que ERR-062 dejo abierta.

El guard existe, pero en UN envoltorio: `agents_paths.consumer_root()` lo
comprueba y rehusa. Los demas llamadores de `reach.consumer_root()` —medidos
con grep sobre src/— no pasan por ese envoltorio y reciben la cascara. Una
defensa en el envoltorio no protege a quien llama al mecanismo.

CONTROL DE ANULACION: retirando el guard de `reach.consumer_root` caen los
casos 2 y 3 —y solo esos—. El 1 mide la declaracion explicita, que ningun
ascenso afecta; el 4 mide que un consumidor real sigue resolviendo.
"""
from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "src"))

from paths import reach  # noqa: E402


class TestConsumerRootRefusesProvider(unittest.TestCase):
    def setUp(self):
        self._saved = {k: os.environ.pop(k, None)
                       for k in (reach.CONSUMER_ROOT_VAR, "THYROX_ENV_FILE")}

    def tearDown(self):
        for k, v in self._saved.items():
            if v is not None:
                os.environ[k] = v

    def test_1_lo_declarado_manda(self):
        """Ningun ascenso pisa una declaracion explicita."""
        self.assertEqual(reach.consumer_root(declared="/un/consumidor"),
                         Path("/un/consumidor"))

    def test_2_desde_la_raiz_del_proveedor_rehusa(self):
        """Falla si devuelve la raiz de thyrox. Devolverla es peor que no
        responder: el llamador compone `<thyrox>/.claude/...` y lee su vacio
        como «el consumidor no lo tiene»."""
        with self.assertRaises(reach.ConsumerUnknownError):
            reach.consumer_root(start=reach.thyrox_root())

    def test_3_desde_un_subdirectorio_del_proveedor_tambien_rehusa(self):
        """Falla si el guard solo mira la raiz. El ascenso desde `src/` llega
        igual al proveedor: es el caso real de un gate invocado ahi."""
        with self.assertRaises(reach.ConsumerUnknownError):
            reach.consumer_root(start=reach.thyrox_root() / "src" / "verify")

    def test_4_un_consumidor_real_sigue_resolviendo(self):
        """El par que impide «arreglar» rehusando siempre.

        Sin este caso, un guard que rehusara para todo pasaria los casos 2 y 3
        y romperia el mecanismo entero — el verde no distinguiria «rehusa ante
        el proveedor» de «rehusa ante todo».
        """
        consumidor = reach.root("docs")
        if not (consumidor / reach.CONSUMER_MARKER).is_dir():
            self.skipTest(f"{consumidor} no esta poblado en esta sesion")
        self.assertEqual(reach.consumer_root(start=consumidor).resolve(),
                         consumidor.resolve())


if __name__ == "__main__":
    unittest.main(verbosity=2)
