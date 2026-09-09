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


if __name__ == "__main__":
    unittest.main()
