#!/usr/bin/env python3
"""El puerto CONDUCIDO de `env_value`: de dónde sale un valor declarado.

`env_value` mezcla dos efectos —el proceso (`os.environ`) y el sistema de
archivos (`.env`)— y los invoca directamente. Sin costura, la única forma de
ejercitarlo es MUTAR estado global del proceso: medido, 9 archivos de test de
este árbol escriben en `os.environ` o en `process.env` para poder medir.

Qué haría fallar a estos casos (sub-patrón D): retirar el parámetro `source`
de `env_value` y volver a leer `os.environ` incondicionalmente. Entonces el
primer caso lee lo que el proceso tenga y el fake no decide nada.

Ciega a: la mitad TypeScript, cuyo puerto ata `tests/paths/reach.test.ts`. Y
ciega a los demás efectos conducidos del módulo —el ascenso por el sistema de
archivos de `consumer_root`, que sigue sin puerto— por decisión de alcance:
este porte declara UN puerto, el que sus consumidores ya usan.
"""
from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))

from paths import reach  # noqa: E402


class _FakeDeclarations:
    """Adaptador de prueba — el `test double` del puerto conducido."""

    def __init__(self, values: dict[str, str]) -> None:
        self.values = values
        self.asked: list[str] = []

    def declared(self, name: str) -> str | None:
        self.asked.append(name)
        return self.values.get(name)


class DeclarationPort(unittest.TestCase):
    def test_el_adaptador_inyectado_decide_el_valor(self):
        fake = _FakeDeclarations({"THYROX_CONSUMER": "/srv/clon"})
        self.assertEqual(
            reach.env_value("THYROX_CONSUMER", source=fake), "/srv/clon")
        self.assertEqual(fake.asked, ["THYROX_CONSUMER"])

    def test_no_toca_el_proceso_cuando_hay_adaptador(self):
        """La costura existe para NO mutar estado global al medir."""
        clave = "THYROX_PUERTO_DE_PRUEBA"
        previo = os.environ.pop(clave, None)
        try:
            os.environ[clave] = "del-proceso"
            fake = _FakeDeclarations({clave: "del-adaptador"})
            self.assertEqual(reach.env_value(clave, source=fake), "del-adaptador")
        finally:
            os.environ.pop(clave, None)
            if previo is not None:
                os.environ[clave] = previo

    def test_ausente_en_el_adaptador_es_None_no_un_respaldo(self):
        """Inyectado un adaptador, ÉL es la fuente — no se cae al proceso.

        Si se cayera, un test no podría medir la ausencia: el proceso real
        decidiría por él, que es el defecto que la costura cierra.
        """
        clave = "THYROX_PUERTO_DE_PRUEBA"
        previo = os.environ.pop(clave, None)
        try:
            os.environ[clave] = "del-proceso"
            self.assertIsNone(
                reach.env_value(clave, source=_FakeDeclarations({})))
        finally:
            os.environ.pop(clave, None)
            if previo is not None:
                os.environ[clave] = previo

    def test_CONTROL_sin_adaptador_la_cadena_de_produccion_sigue_intacta(self):
        """Control de anulación: el puerto NO puede cambiar el comportamiento.

        Sin él, los tres casos de arriba pasarían igual con un `env_value` que
        hubiera dejado de leer el proceso — y eso rompería el mecanismo entero
        sin que ninguna aserción lo viera.
        """
        clave = "THYROX_PUERTO_DE_PRUEBA"
        previo = os.environ.pop(clave, None)
        try:
            os.environ[clave] = "del-proceso"
            self.assertEqual(reach.env_value(clave), "del-proceso")
        finally:
            os.environ.pop(clave, None)
            if previo is not None:
                os.environ[clave] = previo

    def test_el_puerto_esta_DECLARADO_no_solo_implicito(self):
        """El puerto se declara con un nombre, que es la mitad que Ruby no tiene.

        Es la lección literal de la fuente: en un lenguaje dinámico el puerto
        existe igual, pero `los puertos y las interfaces no tienen que
        declararse, lo que hace difícil ver dónde están`. Declararlo con
        `Protocol` lo hace greppeable y verificable por el type checker.
        """
        self.assertTrue(hasattr(reach, "ForReadingDeclarations"))
        self.assertTrue(hasattr(reach.ForReadingDeclarations, "declared"))



class ProviderLayer(unittest.TestCase):
    """La capa del ``.env`` del PROVEEDOR: sólo la familia POR CLON del que pregunta.

    El binario del cliente (2.1.281) combina sus fuentes POR CLAVE, de la más
    general a la más específica —``Object.assign`` del ``env`` de cada una,
    *«Ordered low-to-high priority — later entries override earlier ones»*—:
    una clave que la específica no declara conserva el valor de la general.
    Pero su capa general (``userSettings``) vale para TODOS los proyectos, y el
    ``.env`` del proveedor no: es la configuración de SU proyecto, con sus
    hogares propios (``THYROX_CACHE_DIR``, ``THYROX_WORKBENCH_DIR``) y, además,
    la familia por clon que ``write-env.sh`` escribe PARA cada consumidor
    (``THYROX_WORKBENCH_DOCS``). Sólo esa familia es general para el consumidor.

    La primera versión trató el archivo entero como general y la suite completa
    lo midió: 14 suites nuevas en rojo, porque el ``THYROX_CACHE_DIR`` del
    proveedor aparecía en árboles sintéticos que esperaban el default.

    Qué haría fallar a estos casos: quitar la capa (caen el respaldo y el
    positivo real), ponerla antes del consumidor (cae la precedencia) o
    dejarla responder cualquier clave (cae el hogar propio).
    """

    def setUp(self):
        import tempfile
        self._tmp = tempfile.TemporaryDirectory()
        base = Path(self._tmp.name)
        self.provider = base / "thyrox"
        (self.provider / "src" / "paths").mkdir(parents=True)
        (self.provider / "src" / "paths" / "reach.py").write_text("")
        (self.provider / ".env").write_text(
            "THYROX_CAPA_DOCS=del-proveedor-para-docs\n"
            "THYROX_COMPARTIDA_DOCS=del-proveedor\n"
            "THYROX_CAPA_API=del-proveedor-para-api\n"
            "THYROX_CAPA_DIR=hogar-propio-del-proveedor\n")
        self.consumer = base / "acme-docs"
        self.consumer.mkdir()
        (self.consumer / ".env").write_text("THYROX_COMPARTIDA_DOCS=del-consumidor\n")
        self._keys = ("THYROX_CAPA_DOCS", "THYROX_COMPARTIDA_DOCS", "THYROX_CAPA_API",
                      "THYROX_CAPA_DIR", "THYROX_ENV_FILE")
        self._saved = {k: os.environ.pop(k, None) for k in self._keys}

    def tearDown(self):
        for k, v in self._saved.items():
            if v is not None:
                os.environ[k] = v
        self._tmp.cleanup()

    def chain(self):
        return reach.production_declarations(self.consumer, provider_root=self.provider)

    def test_per_clone_family_falls_back_to_provider(self):
        self.assertEqual(self.chain().declared("THYROX_CAPA_DOCS"), "del-proveedor-para-docs")

    def test_consumer_wins_over_provider(self):
        self.assertEqual(self.chain().declared("THYROX_COMPARTIDA_DOCS"), "del-consumidor")

    def test_process_wins_over_both(self):
        os.environ["THYROX_COMPARTIDA_DOCS"] = "del-proceso"
        self.assertEqual(self.chain().declared("THYROX_COMPARTIDA_DOCS"), "del-proceso")

    def test_provider_own_home_does_not_leak(self):
        """EL QUE DISCRIMINA la regresión medida: 14 suites en rojo."""
        self.assertIsNone(self.chain().declared("THYROX_CAPA_DIR"))

    def test_family_of_another_clone_does_not_leak(self):
        self.assertIsNone(self.chain().declared("THYROX_CAPA_API"))

    def test_without_provider_env_there_is_no_fallback_nor_error(self):
        (self.provider / ".env").unlink()
        self.assertIsNone(self.chain().declared("THYROX_CAPA_DOCS"))

    def test_without_declared_root_provider_is_clone_sibling(self):
        """El proveedor se busca junto al clon que pregunta, no junto al módulo.

        Buscarlo desde ``reach.__file__`` hacía que un árbol sintético leyera el
        ``.env`` del proveedor REAL: ``cache/test_home_resolution`` perdió sus
        dos clones observables porque ``THYROX_WORKBENCH_DOCS`` del host les
        aparecía declarada.
        """
        chain = reach.production_declarations(self.consumer)
        self.assertEqual(chain.declared("THYROX_CAPA_DOCS"), "del-proveedor-para-docs")

    def test_tree_without_sibling_provider_does_not_inherit_host(self):
        import shutil
        shutil.rmtree(self.provider)
        chain = reach.production_declarations(self.consumer)
        self.assertIsNone(chain.declared("THYROX_WORKBENCH_DOCS"))

    def test_declared_env_file_turns_off_provider_layer(self):
        """``THYROX_ENV_FILE`` declara QUÉ archivo gobierna: no se suma otro."""
        os.environ["THYROX_ENV_FILE"] = os.devnull
        self.assertIsNone(self.chain().declared("THYROX_CAPA_DOCS"))

    def test_real_positive_per_clone_family_is_read_from_consumer(self):
        """El episodio: ``THYROX_WORKBENCH_DOCS`` vive en el ``.env`` del
        proveedor y se pedía desde ``kaupamex-docs``."""
        provider_env = _ROOT / ".env"
        declared = reach.read_env_file(provider_env).get("THYROX_WORKBENCH_DOCS") \
            if provider_env.is_file() else None
        docs = next((c for c in (_ROOT.parent / "kaupamex-docs",) if c.is_dir()), None)
        if not declared or docs is None:
            self.skipTest("sin THYROX_WORKBENCH_DOCS declarada o sin clon de docs")
        os.environ.pop("THYROX_WORKBENCH_DOCS", None)
        self.assertEqual(reach.env_value("THYROX_WORKBENCH_DOCS", docs), declared)

if __name__ == "__main__":
    unittest.main()
