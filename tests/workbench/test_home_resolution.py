#!/usr/bin/env python3
"""El valor declarado del hogar del banco se RESUELVE, no se devuelve crudo.

Qué haría fallar a estos casos (sub-patrón D): retirar `resolve_home` de
`workbench_dir` y devolver `Path(declarado)`. Es exactamente la forma que
tenía, y su fallo era silencioso — un segmento relativo resolvía contra el
CWD, que es el defecto home-by-cwd de #284/#286 dentro de la familia que
`declarations.py` publica como resuelta.

No se comprueba «el declarado se respeta»: eso pasaba igual con la versión
cruda. Se comprueba que un SEGMENTO relativo componga un hogar DISTINTO por
clon, que es lo único que la resolución añade, y que una ABSOLUTA siga
colisionando, que es lo que impide sobre-afirmar «nunca colisiona».

Ciega a: la mitad TypeScript, cuyo cuerpo no se compara aquí — la ata
`tests/workbench/paths.test.ts`. Y ciega a
los clones que declaran su clave POR CLON: sobre ellos la de familia no es
observable, y `_sin_clave_por_clon` los excluye del universo en vez de
contarlos como fallos.
"""
from __future__ import annotations

import os
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
from workbench import paths as workbench  # noqa: E402


class _Declared:
    """Declara una clave durante el bloque y restaura lo que hubiera."""

    def __init__(self, key: str, value: str) -> None:
        self.key, self.value = key, value

    def __enter__(self) -> None:
        self.previous = os.environ.get(self.key)
        os.environ[self.key] = self.value

    def __exit__(self, *_exc: object) -> None:
        if self.previous is None:
            os.environ.pop(self.key, None)
        else:
            os.environ[self.key] = self.previous


def _sin_clave_por_clon() -> dict[str, Path]:
    """Los clones sobre los que la clave de FAMILIA es observable.

    Un clon que declara su clave por clon no responde a la de familia — la
    precedencia es lo específico sobre lo derivado, y está bien que sea así.
    Medir sobre él la clave de familia sería medir el fenómeno equivocado, y
    fue el primer veredicto rojo de este control: `api` y `docs` declaran la
    suya en su `.env`.
    """
    return {repo: Path(root) for repo, root in reach.roots().items()
            if not reach.env_value(workbench.workbench_home_name(repo), root)}


class _Absent:
    """Retira una clave durante el bloque y restaura lo que hubiera."""

    def __init__(self, key: str) -> None:
        self.key = key

    def __enter__(self) -> None:
        self.previous = os.environ.pop(self.key, None)

    def __exit__(self, *_exc: object) -> None:
        if self.previous is not None:
            os.environ[self.key] = self.previous


class WorkbenchHomeResolution(unittest.TestCase):
    def test_la_poblacion_medible_alcanza_para_la_afirmacion(self):
        """Sin al menos dos clones, «un hogar POR CLON» no se puede observar."""
        self.assertGreaterEqual(len(_sin_clave_por_clon()), 2)

    def test_un_segmento_relativo_compone_un_hogar_por_clon(self):
        roots = _sin_clave_por_clon()
        with _Declared(workbench.WORKBENCH_DIR_VAR, "hogar-relativo"):
            homes = {repo: workbench.workbench_dir(root)
                     for repo, root in roots.items()}
        self.assertEqual(
            len(set(homes.values())), len(roots),
            f"la clave de familia colapsó los hogares: {homes}",
        )
        for repo, root in roots.items():
            self.assertEqual(homes[repo], root / "hogar-relativo")

    def test_una_absoluta_SI_colisiona_y_es_correcto(self):
        """Quien escribe una absoluta nombra un sitio, no un patrón."""
        with _Declared(workbench.WORKBENCH_DIR_VAR, "/srv/banco-de-uno"):
            homes = {repo: workbench.workbench_dir(root)
                     for repo, root in _sin_clave_por_clon().items()}
        self.assertEqual(set(homes.values()), {Path("/srv/banco-de-uno")})

    def test_la_clave_por_clon_tambien_se_resuelve(self):
        """El peldaño más específico no puede quedarse sin la resolución.

        Qué lo haría fallar: resolver sólo la clave de familia. Entonces la
        misma cadena diría dos cosas según por qué puerta entrara.
        """
        roots = _sin_clave_por_clon()
        objetivo = "db" if "db" in roots else sorted(roots)[0]
        with _Declared(workbench.workbench_home_name(objetivo), "banco-del-clon"):
            home = workbench.workbench_dir(roots[objetivo])
        self.assertEqual(home, roots[objetivo] / "banco-del-clon")

    def test_sin_raiz_de_consumidor_resoluble_devuelve_la_cruda(self):
        """El caso que esta suite declaraba ciego hasta el 2026-09-09.

        Partiendo de dentro del PROVEEDOR, ``consumer_root`` rehúsa: thyrox
        también lleva ``.claude/``, así que el ascenso no lo distingue de un
        consumidor. Ahí una relativa no se puede componer, y se devuelve
        CRUDA — el llamador ve la ruta que declaró, en vez de una compuesta
        contra un árbol que este módulo eligió por su cuenta.

        Qué lo haría fallar: retirar el ``except ConsumerUnknownError`` de
        ``workbench_dir``. Entonces esto propaga la excepción en vez de
        resolver, que es lo que la mitad TypeScript hacía.
        """
        dentro_del_proveedor = reach.thyrox_root() / "src" / "paths"
        with _Absent(reach.CONSUMER_ROOT_VAR), \
             _Declared(workbench.WORKBENCH_DIR_VAR, "hogar-relativo"):
            self.assertEqual(workbench.workbench_dir(dentro_del_proveedor),
                             Path("hogar-relativo"))

    def test_con_raiz_resoluble_la_misma_relativa_SI_se_compone(self):
        """CONTROL DE ANULACIÓN del caso anterior.

        Sin él, aquel pasaría igual con un mecanismo que devolviera SIEMPRE el
        valor crudo — el defecto home-by-cwd que #284/#286 cerraron.
        """
        roots = _sin_clave_por_clon()
        objetivo = sorted(roots)[0]
        with _Absent(reach.CONSUMER_ROOT_VAR), \
             _Declared(workbench.WORKBENCH_DIR_VAR, "hogar-relativo"):
            home = workbench.workbench_dir(roots[objetivo])
        self.assertEqual(home, roots[objetivo] / "hogar-relativo")

    def test_las_dos_familias_resuelven_igual(self):
        """`rules` ya lo hacía y `workbench` no — la asimetría que se cerró.

        Se comparan las dos porque son el MISMO mecanismo repetido: si una
        deriva, el consumidor tiene que recordar cuál de sus dos claves admite
        un segmento y cuál no.
        """
        sys.path.insert(0, str(_RAIZ / "src"))
        from rules import paths as rules  # noqa: PLC0415

        roots = _sin_clave_por_clon()
        with _Declared(rules.RULES_DIR_VAR, "mismo-segmento"), \
             _Declared(workbench.WORKBENCH_DIR_VAR, "mismo-segmento"):
            for repo, root in roots.items():
                with self.subTest(repo=repo):
                    self.assertEqual(
                        rules.consumer_rules_dir(root),
                        workbench.workbench_dir(root),
                        "las dos familias componen distinto el mismo segmento",
                    )


if __name__ == "__main__":
    unittest.main()
