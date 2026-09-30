#!/usr/bin/env python3
"""Control de `THYROX_CONSUMER_STRICT` — la conducta nueva es OPT-IN.

Por que una constante y no un cambio de conducta
-------------------------------------------------
Directiva del ejecutor al portar este eje:

   *«thyrox es un agente de IA que no debe cambiar como lo usan; aqui lo
   usamos de cierta forma y otras personas lo pueden usar de otra; creo que
   para eso estan las CONSTANTES»*

Es correcto, y es la doctrina que el propio arbol ya aplica a sus cinco
familias de hogar: **la declaracion manda sobre la derivacion**, y quien no
declara nada se queda con lo que tenia. Un proveedor que endurece una
resolucion sin preguntar rompe a quien la usaba de otro modo, y lo rompe en
silencio — porque el consumidor no escribio nada que revisar.

Asi que las dos clausulas estrictas viven detras de una declaracion, y el
DEFECTO es la conducta de hoy, byte a byte.

Que declara la variable
-----------------------
Sin ella, `consumer_root` hace exactamente lo de siempre: devuelve el valor
declarado tal cual, resuelto contra el directorio actual.

Con ella, dos clausulas:

1. **Rehusa cuando el punto de partida es el PROVEEDOR.** Declarar cual es el
   consumidor no convierte al proveedor en uno: quien mide el proveedor tiene
   que caer a su propio hogar, o leeria el baseline de otro arbol.
2. **Una declaracion RELATIVA se resuelve contra la raiz del contenedor**, no
   contra el cwd. Una ruta relativa resuelta por cwd da una respuesta distinta
   por cada directorio desde el que se invoque.

El caso que mas importa de este archivo es el PRIMERO: el que fija que sin la
declaracion no cambia nada. Si cae, el porte rompio a alguien.
"""
from __future__ import annotations

import os
import pathlib
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "src"))

from paths import reach  # noqa: E402


class ConsumerStrictOptIn(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.container = pathlib.Path(self.tmp.name).resolve()
        self.consumer = self.container / "eane-docs"
        (self.consumer / ".claude").mkdir(parents=True)
        self.provider = self.container / "thyrox"
        (self.provider / ".claude").mkdir(parents=True)
        self.previous = {k: os.environ.get(k) for k in
                         ("THYROX_CONSUMER", "THYROX_ENV_FILE",
                          "THYROX_ROOT", reach.CONSUMER_STRICT_VAR)}
        for k in self.previous:
            os.environ.pop(k, None)
        os.environ["THYROX_ROOT"] = str(self.provider)

    def tearDown(self):
        for k, v in self.previous.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        self.tmp.cleanup()

    # -- El caso central: sin declaracion, nada cambia -----------------------

    def test_without_declaration_behavior_is_unchanged(self):
        """El DEFECTO conserva lo de hoy: devuelve el valor tal cual.

        Anulacion: retirar la comprobacion de la variable y aplicar las
        clausulas siempre. Este caso cae, que es exactamente lo que se quiere
        que pase — es el que protege a quien ya usaba el mecanismo.
        """
        os.environ["THYROX_CONSUMER"] = str(self.consumer)
        self.assertEqual(reach.consumer_root(start=self.provider),
                         self.consumer)

    def test_without_declaration_relative_resolves_against_cwd(self):
        """Segunda mitad del defecto: la relativa sigue saliendo del cwd.

        No se afirma que esa conducta sea buena — se afirma que es la que hay,
        y que este porte no la toca sin permiso.
        """
        os.environ["THYROX_CONSUMER"] = "eane-docs"
        previous = os.getcwd()
        os.chdir(self.container)
        try:
            self.assertEqual(reach.consumer_root(), self.consumer)
        finally:
            os.chdir(previous)

    # -- Con la declaracion: las dos clausulas -------------------------------

    def test_declared_refuses_when_the_start_is_the_provider(self):
        """Clausula 1. Medido el 2026-09-23 sobre un arbol real: al declarar
        la variable sin esta clausula, un gate de idioma paso de 0 a 70
        nombres. Ninguno era nuevo — dejo de leer el baseline del PROVEEDOR y
        lo busco en el consumidor, donde no esta. No fallo: publico 70
        congelados como nuevos, que es peor, porque parece una medicion.
        """
        os.environ["THYROX_CONSUMER"] = str(self.consumer)
        os.environ[reach.CONSUMER_STRICT_VAR] = "1"
        with self.assertRaises(reach.ConsumerUnknownError):
            reach.consumer_root(start=self.provider)

    def test_declared_does_not_refuse_without_a_starting_point(self):
        """La clausula 1 mira `start`, no el cwd: sin punto de partida la
        declaracion manda, que es el uso normal.
        """
        os.environ["THYROX_CONSUMER"] = str(self.consumer)
        os.environ[reach.CONSUMER_STRICT_VAR] = "1"
        self.assertEqual(reach.consumer_root(), self.consumer)

    def test_declared_resolves_relative_against_the_container(self):
        """Clausula 2, y su control de anulacion en el mismo caso: se invoca
        desde el PROVEEDOR, asi que resolver contra el cwd daria
        `<proveedor>/eane-docs` y no el hermano.
        """
        os.environ["THYROX_CONSUMER"] = "eane-docs"
        os.environ[reach.CONSUMER_STRICT_VAR] = "1"
        previous = os.getcwd()
        os.chdir(self.provider)
        try:
            self.assertEqual(reach.consumer_root(), self.consumer)
        finally:
            os.chdir(previous)

    def test_absolute_still_rules_with_or_without_declaration(self):
        """Lo relativo no le quita nada a lo absoluto."""
        os.environ["THYROX_CONSUMER"] = str(self.consumer)
        os.environ[reach.CONSUMER_STRICT_VAR] = "1"
        self.assertEqual(reach.consumer_root(), self.consumer)

    # -- Que cuenta como declarada -------------------------------------------

    def test_values_that_turn_the_clause_off(self):
        """`0`, `false`, `no` y la cadena vacia NO la encienden.

        Se declara para que nadie descubra por accidente que
        `THYROX_CONSUMER_STRICT=0` la enciende — la forma que un `if value:`
        ingenuo produciria.
        """
        os.environ["THYROX_CONSUMER"] = str(self.consumer)
        for disabled in ("0", "false", "FALSE", "no", ""):
            with self.subTest(valor=disabled):
                os.environ[reach.CONSUMER_STRICT_VAR] = disabled
                self.assertEqual(reach.consumer_root(start=self.provider),
                                 self.consumer)

    def test_values_that_turn_it_on(self):
        os.environ["THYROX_CONSUMER"] = str(self.consumer)
        for enabled in ("1", "true", "TRUE", "yes", "si"):
            with self.subTest(valor=enabled):
                os.environ[reach.CONSUMER_STRICT_VAR] = enabled
                with self.assertRaises(reach.ConsumerUnknownError):
                    reach.consumer_root(start=self.provider)


if __name__ == "__main__":
    unittest.main(verbosity=2)
