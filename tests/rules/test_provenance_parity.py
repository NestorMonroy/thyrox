#!/usr/bin/env python3
"""El sello de procedencia: paridad entre mitades, y que el cubo discrimine.

Qué haría fallar a estos casos (sub-patrón D):

- cambiar `EMITTED_MARKER` en una mitad y no en la otra. Es UNA declaración
  partida en dos lenguajes y su deriva es SILENCIOSA: el emisor seguiría
  estampando y el clasificador dejaría de reconocerlo, contando la emisión
  como deriva — justo lo que el cubo existe para impedir;
- que `declares_emitted` devolviera `True` para cualquier copia. Un cubo que
  no discrimina absorbería las 50 divergentes reales y publicaría un verde.

Por eso hay un caso NEGATIVO con una regla real del árbol: si el cubo se
tragara una regla que nadie emitió, el gate dejaría de ver deriva de verdad.

Ciega a: la posición del sello dentro del archivo emitido — eso lo mide
`tests/rules/markdown.test.ts`, que es donde vive el emisor.
"""
from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))

from paths import reach  # noqa: E402
from rules import provenance  # noqa: E402
from verify import check_rule_divergence as gate  # noqa: E402

TS = _RAIZ / "src" / "rules" / "provenance.ts"


def literal_ts(name: str) -> str:
    """El literal declarado en la mitad TypeScript, leído del FUENTE.

    Se lee el fuente y no un `bun -e`: el control no debe exigir que el otro
    toolchain esté instalado para poder emitir veredicto.
    """
    hallado = re.search(rf"export const {name} = '([^']*)'",
                        TS.read_text(encoding="utf-8"))
    if hallado is None:
        raise AssertionError(
            f"{TS} no declara `export const {name} = '...'`. El control REHÚSA "
            f"en vez de dar por buena la paridad: un verde aquí no distinguiría "
            f"«coinciden» de «no pude leer una de las dos»."
        )
    return hallado.group(1)


class ProvenanceParity(unittest.TestCase):
    def test_el_marcador_es_el_mismo_en_las_dos_mitades(self):
        self.assertEqual(provenance.EMITTED_MARKER, literal_ts("EMITTED_MARKER"))

    def test_el_segmento_de_definiciones_es_el_mismo(self):
        self.assertEqual(provenance.DEFINITIONS_SEGMENT,
                         literal_ts("DEFINITIONS_SEGMENT"))

    def test_el_directorio_de_definiciones_existe_en_el_proveedor(self):
        """Un segmento que no apunta a nada sella una procedencia inexistente."""
        self.assertTrue((_RAIZ / provenance.DEFINITIONS_SEGMENT).is_dir())

    def test_la_linea_compuesta_contiene_el_marcador(self):
        """El clasificador busca la subcadena EN MINÚSCULAS."""
        linea = provenance.emitted_marker("regla-de-prueba").lower()
        self.assertIn(provenance.EMITTED_MARKER, linea)

    def test_el_gate_lee_el_marcador_del_modulo_y_no_su_propia_copia(self):
        self.assertEqual(gate.EMITTED_MARKER, provenance.EMITTED_MARKER)


class EmittedBucketDiscriminates(unittest.TestCase):
    """El cubo tiene que separar, no absorber."""

    def test_reconoce_una_cabecera_sellada(self, ):
        destino = Path(_RAIZ / "tests" / "rules" / ".sello-de-prueba.md")
        destino.write_text(
            provenance.emitted_marker("regla-de-prueba") + "\n\nCuerpo.\n",
            encoding="utf-8")
        try:
            self.assertTrue(gate.declares_emitted(destino))
        finally:
            destino.unlink()

    def test_NO_reconoce_una_regla_real_que_nadie_emitio(self):
        """El control negativo, sobre una regla VIVA del árbol.

        Apunta a un archivo que EXISTE: un negativo sobre una ruta inventada
        pasaría por la rama `OSError` y no mediría el predicado.
        """
        candidatas = [root / ".claude" / "rules" / "git-author-identity.md"
                      for root in reach.roots().values()]
        vivas = [p for p in candidatas if p.is_file()]
        self.assertTrue(vivas, "no hay ninguna copia viva contra la que medir")
        for path in vivas:
            with self.subTest(path=str(path)):
                self.assertFalse(gate.declares_emitted(path))

    def test_el_sello_fuera_de_la_ventana_no_cuenta(self):
        """Mencionar el sello en el cuerpo no vuelve emitida a una copia.

        Es la misma acotación que `declares_canon` ya tenía: se mira la
        CABECERA, no el archivo entero.
        """
        destino = Path(_RAIZ / "tests" / "rules" / ".sello-tardio.md")
        relleno = "\n".join(f"linea {i}" for i in range(gate.HEADER_LINES + 3))
        destino.write_text(
            relleno + "\n" + provenance.emitted_marker("regla-de-prueba") + "\n",
            encoding="utf-8")
        try:
            self.assertFalse(gate.declares_emitted(destino))
        finally:
            destino.unlink()


if __name__ == "__main__":
    unittest.main()
