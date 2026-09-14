#!/usr/bin/env python3
"""El hogar de los logs de segundo plano se declara POR CLON, no solo global.

Que hace falta para que esto exista
-----------------------------------
`background.log_dir` ya rehusaba sin declaracion —eso estaba bien y no se
toca—, pero leia UNA sola clave global. Es la misma forma que `jobs_dir` tenia
antes de #295 y que `workbench_dir` tenia antes de L-028: **un solo proceso
resuelve varios arboles**, y una variable global no puede decir dos verdades a
la vez. Con solo la global, exportar el hogar de docs para una tanda le daba a
api EL HOGAR DE DOCS, y ninguna linea avisaba.

Que haria fallar a estos casos (sub-patron D): retirar de `log_dir` la rama por
clon. Caen los tres primeros y el cuarto; el de rehuse sobrevive, porque no
depende de la familia — y esa asimetria es la medicion, no un descuido.

Ciega a: si el directorio existe. `log_dir` compone una ruta y no toca el
sistema de archivos, igual que sus dos hermanas.
"""
from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))

from paths import reach  # noqa: E402
from session import background  # noqa: E402


class _Declared:
    """Declara claves durante el bloque y restaura lo que hubiera."""

    def __init__(self, **pairs: str) -> None:
        self.pairs = pairs

    def __enter__(self) -> None:
        self.previous = {k: os.environ.get(k) for k in self.pairs}
        os.environ.update(self.pairs)

    def __exit__(self, *_exc: object) -> None:
        for key, previous in self.previous.items():
            if previous is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = previous


def _clone(repo: str) -> Path:
    """La raiz del clon, por la cadena declarada — no por aritmetica de ruta."""
    return reach.root(repo)


class FamilyName(unittest.TestCase):
    """La regla de composicion es la de sus hermanas, no una propia."""

    def test_composes_the_per_clone_name(self) -> None:
        self.assertEqual(background.log_home_name("api"),
                         "THYROX_BACKGROUND_LOG_API")
        self.assertEqual(background.log_home_name("docs"),
                         "THYROX_BACKGROUND_LOG_DOCS")

    def test_the_clone_hyphen_becomes_underscore(self) -> None:
        self.assertEqual(background.log_home_name("mi-clon"),
                         "THYROX_BACKGROUND_LOG_MI_CLON")


class PerCloneHome(unittest.TestCase):

    def test_the_per_clone_key_wins_over_the_global(self) -> None:
        """EL QUE DISCRIMINA: sin la rama gana la global y api cae fuera."""
        api = _clone("api")
        with _Declared(THYROX_BACKGROUND_LOG_DIR="/hogar/global",
                       THYROX_BACKGROUND_LOG_API=str(api / "build-logs")):
            self.assertEqual(background.log_dir(start=api), api / "build-logs")

    def test_a_relative_segment_composes_under_the_clone(self) -> None:
        """Sin `resolve_home`, un segmento resolvia contra el CWD."""
        api = _clone("api")
        with _Declared(THYROX_BACKGROUND_LOG_API="build-logs"):
            self.assertEqual(background.log_dir(start=api), api / "build-logs")

    def test_each_clone_resolves_its_own_home(self) -> None:
        """La razon de ser de la familia, comparando los DOS entre si.

        Un `assertNotEqual` contra una constante pasaria igual sin la rama —los
        dos rehusarian—, o sea no discriminaria el mecanismo de su ausencia.
        """
        api, docs = _clone("api"), _clone("docs")
        with _Declared(THYROX_BACKGROUND_LOG_API="build-logs",
                       THYROX_BACKGROUND_LOG_DOCS="build-logs"):
            home_api = background.log_dir(start=api)
            home_docs = background.log_dir(start=docs)
        self.assertNotEqual(home_api, home_docs)
        self.assertEqual(home_api, api / "build-logs")
        self.assertEqual(home_docs, docs / "build-logs")


class FileDeclaration(unittest.TestCase):
    """Entrada 2 de la DEC-04: la ruta del archivo que declara los valores."""

    def test_reads_the_declaration_from_the_env_file(self) -> None:
        api = _clone("api")
        with tempfile.TemporaryDirectory() as tmp:
            env = Path(tmp) / ".env"
            env.write_text(f"THYROX_BACKGROUND_LOG_API={api / 'build-logs'}\n")
            with _Declared(THYROX_ENV_FILE=str(env)):
                os.environ.pop("THYROX_BACKGROUND_LOG_API", None)
                self.assertEqual(background.log_dir(start=api),
                                 api / "build-logs")


class StillRefuses(unittest.TestCase):
    """La familia AÑADE una via; no abre un default por la puerta de atras."""

    def test_refuses_when_neither_spelling_is_declared(self) -> None:
        api = _clone("api")
        with tempfile.TemporaryDirectory() as tmp:
            env = Path(tmp) / ".env"          # vacio: ninguna de las dos claves
            env.write_text("")
            with _Declared(THYROX_ENV_FILE=str(env)):
                for key in ("THYROX_BACKGROUND_LOG_DIR",
                            background.log_home_name("api")):
                    os.environ.pop(key, None)
                with self.assertRaises(background.LogHomeError):
                    background.log_dir(start=api)


if __name__ == "__main__":
    unittest.main(verbosity=2)
