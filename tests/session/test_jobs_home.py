#!/usr/bin/env python3
"""El hogar de la familia `jobs` se declara POR CLON, no sólo global.

Qué haría fallar a estos casos (sub-patrón D): retirar de `jobs_dir` la rama
por clon y dejar sólo `THYROX_JOBS_DIR`. Es exactamente la forma que tenía, y
su fallo era silencioso — un run de api aterrizaba en el árbol del PROVEEDOR
sin que nada avisara. Medido antes de cerrarlo: la corrida
`migrate-desde-cero-20260910T073715`, que es evidencia de api, nació en
`thyrox/.claude/jobs/`. Es el mismo defecto que L-028 registró para el banco —
«once bancos aterrizaron en el árbol del proveedor por esa vía»— y que la
familia `THYROX_WORKBENCH_<CLON>` cerró para el banco y no para los trabajos.

No se comprueba «el declarado se respeta»: eso pasaba igual con la versión
anterior. Se comprueban las tres cosas que sólo la familia añade:

1. la clave por clon GANA sobre la global (caso 1);
2. un SEGMENTO relativo compone un hogar bajo el clon, no bajo el CWD (caso 2);
3. la clave de un clon NO se aplica a otro (caso 3) — que es la razón de que la
   global no baste: un solo proceso resuelve varios árboles.

El caso 4 es de la otra mitad del arreglo: `jobs_dir` leía `os.environ`
directamente, así que la declaración del `.env` —la entrada 2 de la DEC-04, y
la única que `write-env.sh` puede escribir— era invisible para esta familia.

Ciega a: si el directorio existe. `jobs_dir` compone una ruta y no toca el
sistema de archivos, igual que `workbench_dir`.
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
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))

from paths import reach  # noqa: E402
from session import job_runs  # noqa: E402


class _Declared:
    """Declara claves durante el bloque y restaura lo que hubiera."""

    def __init__(self, **pares: str) -> None:
        self.pares = pares

    def __enter__(self) -> None:
        self.previos = {k: os.environ.get(k) for k in self.pares}
        os.environ.update(self.pares)

    def __exit__(self, *_exc: object) -> None:
        for clave, previo in self.previos.items():
            if previo is None:
                os.environ.pop(clave, None)
            else:
                os.environ[clave] = previo


def _clon(repo: str) -> Path:
    """La raíz del clon, por la cadena declarada — no por aritmética de ruta."""
    return reach.root(repo)


class NombreDeLaFamilia(unittest.TestCase):
    """La regla de composición es la de sus hermanas, no una propia."""

    def test_compone_el_nombre_por_clon(self) -> None:
        self.assertEqual(job_runs.jobs_home_name("api"), "THYROX_JOBS_API")
        self.assertEqual(job_runs.jobs_home_name("docs"), "THYROX_JOBS_DOCS")

    def test_el_guion_del_clon_pasa_a_guion_bajo(self) -> None:
        self.assertEqual(job_runs.jobs_home_name("mi-clon"), "THYROX_JOBS_MI_CLON")


class HogarPorClon(unittest.TestCase):

    def test_la_clave_por_clon_gana_sobre_la_global(self) -> None:
        """EL QUE DISCRIMINA: sin la rama, gana la global y api cae fuera."""
        api = _clon("api")
        with _Declared(THYROX_JOBS_DIR="/hogar/global",
                       THYROX_JOBS_API=str(api / "scripts" / "evidence")):
            self.assertEqual(job_runs.jobs_dir(start=api),
                             api / "scripts" / "evidence")

    def test_un_segmento_relativo_compone_bajo_el_clon(self) -> None:
        """Sin `resolve_home`, un segmento resolvía contra el CWD."""
        api = _clon("api")
        with _Declared(THYROX_JOBS_API="scripts/evidence"):
            self.assertEqual(job_runs.jobs_dir(start=api),
                             api / "scripts" / "evidence")

    def test_cada_clon_resuelve_su_propio_hogar(self) -> None:
        """La razón de ser de la familia: un proceso resuelve varios árboles.

        Se comparan los DOS hogares entre sí, no uno contra una constante: un
        `assertNotEqual` contra la ruta de api pasaría igual sin la rama —los
        dos caerían al default y ninguno sería esa ruta—, o sea no
        discriminaría el mecanismo de su ausencia.
        """
        api, docs = _clon("api"), _clon("docs")
        with _Declared(THYROX_JOBS_API="scripts/evidence",
                       THYROX_JOBS_DOCS="scripts/evidence"):
            hogar_api = job_runs.jobs_dir(start=api)
            hogar_docs = job_runs.jobs_dir(start=docs)
        self.assertNotEqual(hogar_api, hogar_docs)
        self.assertEqual(hogar_api, api / "scripts" / "evidence")
        self.assertEqual(hogar_docs, docs / "scripts" / "evidence")


class DeclaracionEnElArchivo(unittest.TestCase):
    """Entrada 2 de la DEC-04: la ruta del archivo que declara los valores."""

    def test_lee_la_declaracion_del_env(self) -> None:
        api = _clon("api")
        with tempfile.TemporaryDirectory() as tmp:
            env = Path(tmp) / ".env"
            env.write_text(f"THYROX_JOBS_API={api / 'scripts' / 'evidence'}\n")
            with _Declared(THYROX_ENV_FILE=str(env)):
                os.environ.pop("THYROX_JOBS_API", None)
                self.assertEqual(job_runs.jobs_dir(start=api),
                                 api / "scripts" / "evidence")


class AnclaDelArchivo(unittest.TestCase):
    """El `.env` que gobierna es el del ARBOL donde se corre, no el del modulo.

    `jobs_dir()` sin `start` derivaba el clon del `cwd` y buscaba el `.env`
    desde la ubicacion del modulo — dos anclas distintas para una sola
    resolucion. Consecuencia medida: `bg.sh`, que llama sin `start`, derivaba
    `api` desde el `cwd` y leia el `.env` del PROVEEDOR, donde esa clave no
    esta ni debe estar. La declaracion del consumidor era invisible justo por
    la via por la que se usa.

    Qué haría fallar a este caso: volver a pasar `inicio` (que es `None`) a
    `env_value` en vez del ancla resuelta.
    """

    def test_sin_start_gobierna_el_env_del_cwd(self) -> None:
        api = _clon("api")
        env = api / ".env"
        if not env.is_file():
            self.skipTest(f"{env} no existe: el caso no es observable")
        declarado = None
        for linea in env.read_text().splitlines():
            if linea.startswith("THYROX_JOBS_API="):
                declarado = linea.partition("=")[2].strip()
        if not declarado:
            self.skipTest(f"{env} no declara THYROX_JOBS_API")
        previo = os.getcwd()
        os.chdir(api)
        try:
            os.environ.pop("THYROX_JOBS_API", None)
            self.assertEqual(job_runs.jobs_dir(), Path(declarado))
        finally:
            os.chdir(previo)


if __name__ == "__main__":
    unittest.main(verbosity=2)
