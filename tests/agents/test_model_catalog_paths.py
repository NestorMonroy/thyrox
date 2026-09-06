#!/usr/bin/env python3
"""Control de la resolucion de rutas de ``agents.model_catalog`` (tarea #173).

Mitad ROJA escrita antes del mecanismo.

Que estaba mal
--------------

La aritmetica ``parents[3]`` describia el arbol ANTERIOR, cuando el guion vivia
en ``<clon>/.claude/scripts/agents/``. Tras la mudanza a thyrox el mismo
``parents[3]`` resuelve ``/home/user``, que no es raiz de nada, y el guion
rehusa con un mensaje que ademas manda regenerar el catalogo en el hogar
anterior. El defecto no es de mensaje: es que la ruta se DERIVABA de la
profundidad del archivo, y la profundidad cambio.

La distincion que el arreglo respeta
-------------------------------------

- El **catalogo de modelos** es PRODUCTO de thyrox: se resuelve con su
  localizador, que sobrevive a la copia.
- El **store de agentes** es PARAMETRO del consumidor: vive en el clon que
  despacha, no en thyrox. Por eso NO tiene default derivable de aqui, y sin
  declararlo la ruta es ``None`` — no una suposicion.
"""
from __future__ import annotations

import importlib
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "src"))

VARIABLES = ("THYROX_MODEL_CATALOG", "KAUPAMEX_MODEL_CATALOG", "THYROX_AGENT_STORE")


class ResolucionDeRutas(unittest.TestCase):
    """El catalogo se resuelve dentro de thyrox; el store se declara."""

    def _fresh(self, **env):
        import os

        for name in VARIABLES:
            os.environ.pop(name, None)
        for name, value in env.items():
            os.environ[name] = value
        self.addCleanup(lambda: [__import__("os").environ.pop(n, None) for n in VARIABLES])
        sys.modules.pop("agents.model_catalog", None)
        return importlib.import_module("agents.model_catalog")

    def test_the_catalog_resolves_inside_thyrox(self):
        mc = self._fresh()
        self.assertEqual(
            mc.CATALOG_PATH,
            RAIZ / "src" / "packages" / "agent" / "models.json",
        )

    def test_the_resolved_catalog_exists_and_loads(self):
        mc = self._fresh()
        catalog, reason = mc.try_catalog()
        self.assertIsNone(reason, reason)
        self.assertGreater(len(catalog["models"]), 0)

    def test_the_variable_overrides_the_resolution(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            otro = Path(tmp) / "otro.json"
            otro.write_text("{}")
            mc = self._fresh(THYROX_MODEL_CATALOG=str(otro))
            self.assertEqual(mc.CATALOG_PATH, otro)

    def test_the_previous_variable_keeps_working(self):
        """El nombre anterior no se rompe: un consumidor puede tenerlo declarado."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            previo = Path(tmp) / "previo.json"
            previo.write_text("{}")
            mc = self._fresh(KAUPAMEX_MODEL_CATALOG=str(previo))
            self.assertEqual(mc.CATALOG_PATH, previo)

    def test_the_store_has_no_thyrox_default(self):
        """Sin declararlo no hay ruta que suponer: es parametro del consumidor."""
        mc = self._fresh()
        self.assertIsNone(mc.STORE_PATH)

    def test_the_variable_declares_the_store(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            db = Path(tmp) / "s.sqlite3"
            db.write_text("")
            mc = self._fresh(THYROX_AGENT_STORE=str(db))
            self.assertEqual(mc.STORE_PATH, db)

    def test_no_resolved_path_reaches_outside_thyrox(self):
        """Control de anulacion: restaurar ``parents[3]`` hace caer este caso."""
        mc = self._fresh()
        self.assertIn(RAIZ, mc.CATALOG_PATH.parents)


class ElAccesorDeConfiguracion(unittest.TestCase):
    """La variable se lee por el accesor, no por ``os.environ`` a secas.

    El patron es el de la referencia de litellm —``get_secret("WORKER_CONFIG")``,
    ``get_secret_str("CONFIG_FILE_PATH")``—: un accesor unico que consulta el
    proceso Y el archivo de configuracion. Leer ``os.environ`` directamente pasa
    todos los casos de variable exportada y falla el unico que distingue: el
    consumidor que la declara en su ``.env``.
    """

    def test_the_env_file_declares_the_catalog(self):
        import os
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            otro = base / "desde-env.json"
            otro.write_text("{}")
            (base / ".env").write_text(f"THYROX_MODEL_CATALOG={otro}\n")
            for name in (*VARIABLES, "THYROX_ENV_FILE"):
                os.environ.pop(name, None)
            os.environ["THYROX_ENV_FILE"] = str(base / ".env")
            self.addCleanup(lambda: os.environ.pop("THYROX_ENV_FILE", None))
            sys.modules.pop("agents.model_catalog", None)
            mc = importlib.import_module("agents.model_catalog")
            self.assertEqual(mc.CATALOG_PATH, otro)

    def test_the_process_wins_over_the_env_file(self):
        """Quien exporta para UNA invocacion esta corrigiendo a proposito."""
        import os
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            del_archivo = base / "archivo.json"
            del_proceso = base / "proceso.json"
            for ruta in (del_archivo, del_proceso):
                ruta.write_text("{}")
            (base / ".env").write_text(f"THYROX_MODEL_CATALOG={del_archivo}\n")
            for name in (*VARIABLES, "THYROX_ENV_FILE"):
                os.environ.pop(name, None)
            os.environ["THYROX_ENV_FILE"] = str(base / ".env")
            os.environ["THYROX_MODEL_CATALOG"] = str(del_proceso)
            self.addCleanup(lambda: [os.environ.pop(n, None)
                                     for n in ("THYROX_ENV_FILE", "THYROX_MODEL_CATALOG")])
            sys.modules.pop("agents.model_catalog", None)
            mc = importlib.import_module("agents.model_catalog")
            self.assertEqual(mc.CATALOG_PATH, del_proceso)


if __name__ == "__main__":
    unittest.main(verbosity=2)
