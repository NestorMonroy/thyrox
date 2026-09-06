#!/usr/bin/env python3
"""Control de `reach.consumer_root` — la raíz del árbol MEDIDO.

Qué haría fallar a este control (sub-patrón D): que el mecanismo devuelva la
raíz del PROVEEDOR en vez de la del consumidor. Ése es el defecto que lo
origina — siete gates componían su corpus con `parents[N]` del propio archivo,
que valía cuando vivían en `kaupamex-docs/.claude/scripts/gates/` y desde
`thyrox/src/gates/` da `/home/user`. El corredor los publicaba SIN MEDIR
nombrando `/home/user/source`, un directorio que nunca existió.

El consumidor es sintético: el control no depende de qué clones haya en disco.
"""
import os
import pathlib
import sys
import tempfile
import unittest

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parent.parent / 'src'))

from paths import reach  # noqa: E402


class ConsumerRootTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.raiz = pathlib.Path(self.tmp.name).resolve()
        (self.raiz / '.claude').mkdir()
        (self.raiz / 'source' / 'gestion').mkdir(parents=True)
        self.previo = {k: os.environ.get(k)
                       for k in ('THYROX_CONSUMER', 'THYROX_ENV_FILE')}
        for k in self.previo:
            os.environ.pop(k, None)

    def tearDown(self):
        for k, v in self.previo.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        self.tmp.cleanup()

    def test_declarado_gana(self):
        """El argumento explícito precede a todo lo demás."""
        self.assertEqual(reach.consumer_root(declared=str(self.raiz)), self.raiz)

    def test_variable_de_entorno(self):
        os.environ['THYROX_CONSUMER'] = str(self.raiz)
        self.assertEqual(reach.consumer_root(), self.raiz)

    def test_asciende_al_marcador_desde_un_subdirectorio(self):
        """Un gate invocado desde dentro del consumidor sigue midiéndolo.

        Sin el ascenso, el respaldo sería el cwd literal y el corpus se
        buscaría bajo `source/gestion/`, no bajo la raíz.
        """
        hondo = self.raiz / 'source' / 'gestion'
        self.assertEqual(reach.consumer_root(start=hondo), self.raiz)

    def test_sin_marcador_devuelve_el_punto_de_partida(self):
        """Sin `.claude` en ningún ancestro no se inventa una raíz."""
        with tempfile.TemporaryDirectory() as huerfano:
            suelto = pathlib.Path(huerfano).resolve()
            self.assertEqual(reach.consumer_root(start=suelto), suelto)


if __name__ == '__main__':
    unittest.main(verbosity=2)
