#!/usr/bin/env python3
"""El derivador de capa está APAGADO en este árbol, y por eso los ids fallan.

El defecto, medido antes de escribir nada
-----------------------------------------
``derive_submodule`` sale por su primera línea::

    if _CITA_HALLAZGO is None:
        return None, None

``_CITA_HALLAZGO`` es ``None`` porque ``_cargar_senales()`` no encuentra el
archivo que ``THYROX_LAYER_SIGNALS`` debería declarar — y **esa clave no está
en ningún ``.env`` ni en ``.env.example``**. Medido: sus únicas apariciones en
el árbol son el propio módulo y su test unitario.

Consecuencia, sobre las 1565 citas del store:

- **632 (40 %) llevan ``GEN``**, la capa del hueco. El docstring de
  ``UNKNOWN_LAYER`` redefinió ``GEN`` como «el trabajo que CRUZA repos» — y
  con el derivador apagado no cruza nada: es que nadie derivó.
- **``TASK-THYROX-*`` = 0.** ``thyrox`` entró en ``LAYERS`` el 2026-09-07 con
  el cambio de eje (capa del producto → repo), y ninguna cita lo lleva. La
  constante entró; la conducta no.
- **93 sujetos con más de una cita**, 92 de ellos cruzando sesiones. Sin capa
  derivada, el mismo sujeto cae en ``gen`` una vez y en otra capa la otra.

Es el mismo defecto que este árbol ya cerró dos veces hoy en otro sitio: el
mecanismo escrito y probado, y el punto de entrada que no lo llama. Aquí el
«punto de entrada» es la declaración del parámetro.

Y tiene una vuelta incómoda: el módulo se diseñó para **declarar el hueco en
vez de rellenarlo**, que es la conducta correcta. Cumple ese contrato a la
perfección mientras no hace absolutamente nada. Un rehúse honesto que se lee
como «esta tarea no tenía señal» y significa «el derivador está apagado» — el
sub-patrón D aplicado al propio rehúse.

MITAD ROJA: los cinco casos fallan porque ``src/task/layer_signals.tsv`` no
existe y la clave no está declarada.
"""

from __future__ import annotations

import importlib
import os
import pathlib
import sys
import unittest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SENALES = RAIZ / "src" / "task" / "layer_signals.tsv"


def _agent_store(ruta_senales):
    """El modulo recargado con la declaracion apuntando a `ruta_senales`.

    Se recarga a proposito: `_cargar_senales()` corre a nivel de modulo, asi
    que fijar la variable despues del import no cambiaria nada — mediria el
    estado con que se cargo, no el que el caso declara.
    """
    os.environ["THYROX_LAYER_SIGNALS"] = str(ruta_senales)
    for p in ("src/agents", "src/paths"):
        ruta = str(RAIZ / p)
        if ruta not in sys.path:
            sys.path.insert(0, ruta)
    import agent_store
    return importlib.reload(agent_store)


class TestSenalesDeCapa(unittest.TestCase):
    def tearDown(self):
        os.environ.pop("THYROX_LAYER_SIGNALS", None)

    def test_1_el_archivo_existe_y_lo_declara_el_contrato(self):
        """Sin archivo no hay derivador; sin contrato nadie sabe que hace falta."""
        self.assertTrue(SENALES.is_file(), f"falta {SENALES}")
        ejemplo = (RAIZ / ".env.example").read_text(encoding="utf-8")
        self.assertIn("THYROX_LAYER_SIGNALS", ejemplo,
                      "la clave gobierna si el derivador funciona y no esta en el contrato")

    def test_2_declara_las_seis_capas_incluida_thyrox(self):
        """`thyrox` es un repo del arbol y ninguna cita lo lleva. Esa es la
        mitad que el cambio de eje del 2026-09-07 dejo sin hacer."""
        mod = _agent_store(SENALES)
        self.assertEqual(set(mod._SENALES_DE_RUTA),
                         {"api", "db", "docs", "server", "thyrox", "ui"})

    def test_3_deriva_la_capa_de_un_texto_que_la_nombra(self):
        """Seis textos, uno por repo, con la forma real de una tarea del tablero."""
        mod = _agent_store(SENALES)
        casos = [
            ("Portar repl a src/packages/repl del harness", "thyrox"),
            ("Corregir el serializer de src/addons/sale en kaupamex-api", "api"),
            ("Actualizar la iniciativa en source/gestion/pm/docs", "docs"),
            ("Ajustar el vhost de Apache en provisioners/apache", "server"),
            ("Migrar el rol django_user en provisioners/postgresql", "db"),
            ("Arreglar el componente en src/components/Cart.jsx", "ui"),
        ]
        for texto, capa in casos:
            with self.subTest(capa=capa):
                derivada, procedencia = mod.derive_submodule(texto, "", {})
                self.assertEqual(derivada, capa, f"{texto!r} -> {derivada!r}")
                self.assertEqual(procedencia, "ruta")

    def test_4_un_texto_que_cruza_DOS_capas_no_se_inventa_una(self):
        """El control que discrimina: sin el, «acierta» y «siempre devuelve
        algo» darian el mismo veredicto. Dos señales distintas dejan el hueco,
        y ese hueco SI es el «cruza repos» que `GEN` nombra."""
        mod = _agent_store(SENALES)
        cruzado = "Reapuntar src/addons/sale y su interfaz en src/components/Cart.jsx"
        self.assertEqual(mod.derive_submodule(cruzado, "", {}), (None, None))

    def test_5_sin_declaracion_sigue_rehusando_en_vez_de_inventar(self):
        """La conducta vieja se CONSERVA: un consumidor que no declare sus
        capas no recibe una tabla inventada. Lo que cambia es que este arbol
        si declara las suyas, no que el rehuse desaparezca."""
        mod = _agent_store(RAIZ / "no" / "existe.tsv")
        self.assertIsNone(mod._CITA_HALLAZGO)
        self.assertEqual(mod.derive_submodule("src/addons/sale", "", {}), (None, None))


if __name__ == "__main__":
    unittest.main()
