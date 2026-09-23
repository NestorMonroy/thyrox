#!/usr/bin/env python3
"""El hogar del indice se ancla en el CONSUMIDOR y su declarado se RESUELVE.

Mitad ROJA de TASK-THYROX-0055, escrita ANTES del arreglo. Porta a la familia
``cache`` las dos correcciones que ``workbench`` ya cerro (#284/#286), medidas
aqui por conducta antes de tocar el modulo::

    DEFECTO 1 — el ancla del default
      cache_dir    : /home/user/kaupamex-docs/source/gestion/.claude/cache
      workbench_dir: /home/user/kaupamex-docs/.claude/workbench

    DEFECTO 2 — un valor relativo declarado (THYROX_CACHE_DIR=banco)
      /home/user/thyrox          cache=banco  wb=banco
      /home/user/kaupamex-docs   cache=banco  wb=/home/user/kaupamex-docs/banco
      /home/user/kaupamex-db     cache=banco  wb=/home/user/kaupamex-db/banco

Que haria FALLAR a cada caso (sub-patron D de
``metrica-decide-la-conclusion.md``) — cada uno declara su anulacion:

1. poblacion: sin dos clones observables, «un hogar POR CLON» no se puede
   afirmar; este caso lo mide en vez de suponerlo.
2. el segmento relativo por clave de familia: retirar ``resolve_home`` y
   devolver ``Path(declarado)`` — la forma que el modulo tenia.
3. el segmento relativo por clave POR CLON: resolver solo la de familia; ahi
   la misma cadena diria dos cosas segun por que puerta entrara.
4. la absoluta SI colisiona: es el control que impide sobre-afirmar «nunca
   colisiona». Cae si alguien compusiera tambien las absolutas.
5. el default anclado en el consumidor: componer sobre el ancla que el llamador
   trajo — el defecto home-by-cwd de #284/#286, que es el DEFECTO 1 de arriba.
6. el default del PROVEEDOR: heredarlo del ancla. ``consumer_root`` rehusa ahi
   —thyrox tambien lleva ``.claude/``— y esta familia NO puede rehusar (su
   docstring lo declara: un indice es material reconstruible). Se ancla en
   ``thyrox_root()``, que es una decision explicita, no el cwd.
7. la relativa sin raiz resoluble se devuelve CRUDA: es el control de anulacion
   del caso 2 — sin el, el caso 2 pasaria igual con un mecanismo que compusiera
   SIEMPRE contra algo que el modulo eligiera por su cuenta.
8. el fallback se anota: un default silencioso no se distingue de una
   declaracion. Cae si ``record_fallback`` no se invoca.
9. las tres familias componen igual: si una deriva, el consumidor tiene que
   recordar cual de sus claves admite un segmento y cual no.

Ciega a: el contenido del indice — esta suite mide DONDE vive, no que guarda;
eso lo ata ``tests/cache/test_work_cache.py``. Y ciega a los clones que
declaran su clave POR CLON: sobre ellos la de familia no es observable, y
``_without_per_clone_key`` los excluye del universo en vez de contarlos como
fallos (medido: ``api`` declara ``THYROX_CACHE_API``).
"""
from __future__ import annotations

from contextlib import ExitStack

import os
import sys
import unittest
from pathlib import Path

_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))

from cache import paths as cache  # noqa: E402
from paths import declarations, reach  # noqa: E402
from workbench import paths as workbench  # noqa: E402
from testing.clone_tree import synthetic_clone_tree  # noqa: E402


# La suite compone un hogar por clon y necesita dos clones distintos. De los
# consumidores solo `docs` es obligatorio, asi que los clones salen de un
# arbol sintetico y no del roster del host (H-THYROX-155).
_TREE = ExitStack()


def setUpModule() -> None:
    _TREE.enter_context(synthetic_clone_tree(("api", "docs")))


def tearDownModule() -> None:
    _TREE.close()


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


class _Absent:
    """Retira una clave durante el bloque y restaura lo que hubiera."""

    def __init__(self, key: str) -> None:
        self.key = key

    def __enter__(self) -> None:
        self.previous = os.environ.pop(self.key, None)

    def __exit__(self, *_exc: object) -> None:
        if self.previous is not None:
            os.environ[self.key] = self.previous


def _without_per_clone_key() -> dict[str, Path]:
    """Los clones sobre los que la clave de FAMILIA es observable.

    Un clon que declara su clave por clon no responde a la de familia — la
    precedencia es lo especifico sobre lo derivado, y esta bien que sea asi.
    Medirla sobre el seria medir el fenomeno equivocado.
    """
    return {repo: Path(root) for repo, root in reach.roots().items()
            if not reach.env_value(cache.cache_home_name(repo), root)}


class CacheHomeResolution(unittest.TestCase):
    def test_the_measurable_population_supports_the_claim(self):
        """Sin al menos dos clones, «un hogar POR CLON» no se puede observar."""
        self.assertGreaterEqual(len(_without_per_clone_key()), 2)

    def test_a_relative_segment_composes_one_home_per_clone(self):
        roots = _without_per_clone_key()
        with _Declared(cache.CACHE_DIR_VAR, "indice-relativo"):
            homes = {repo: cache.cache_dir(root) for repo, root in roots.items()}
        self.assertEqual(
            len(set(homes.values())), len(roots),
            f"la clave de familia colapso los hogares: {homes}",
        )
        for repo, root in roots.items():
            self.assertEqual(homes[repo], root / "indice-relativo")

    def test_the_per_clone_key_also_resolves(self):
        roots = _without_per_clone_key()
        target = "db" if "db" in roots else sorted(roots)[0]
        with _Declared(cache.cache_home_name(target), "indice-del-clon"):
            home = cache.cache_dir(roots[target])
        self.assertEqual(home, roots[target] / "indice-del-clon")

    def test_an_absolute_DOES_collide_and_that_is_correct(self):
        """Quien escribe una absoluta nombra un sitio, no un patron."""
        with _Declared(cache.CACHE_DIR_VAR, "/srv/indice-de-uno"):
            homes = {repo: cache.cache_dir(root)
                     for repo, root in _without_per_clone_key().items()}
        self.assertEqual(set(homes.values()), {Path("/srv/indice-de-uno")})

    def test_the_composed_default_anchors_at_the_consumer_root(self):
        """DEFECTO 1: hoy compone sobre el ancla que el llamador trajo."""
        roots = _without_per_clone_key()
        target = "docs" if "docs" in roots else sorted(roots)[0]
        deep = roots[target] / "source" / "gestion"
        with _Absent(cache.CACHE_DIR_VAR), _Absent(reach.CONSUMER_ROOT_VAR):
            home = cache.cache_dir(deep)
        self.assertEqual(
            home,
            roots[target] / workbench.state_dir(deep) / cache.CACHE_DIR_DEFAULT,
            "el default heredo el ancla honda en vez de la raiz del consumidor",
        )

    def test_the_provider_default_is_decided_not_inherited(self):
        """Ahi ``consumer_root`` rehusa y esta familia no puede rehusar."""
        inside_provider = reach.thyrox_root() / "src" / "paths"
        with _Absent(cache.CACHE_DIR_VAR), _Absent(reach.CONSUMER_ROOT_VAR):
            home = cache.cache_dir(inside_provider)
        self.assertEqual(
            home,
            reach.thyrox_root() / workbench.state_dir(inside_provider)
            / cache.CACHE_DIR_DEFAULT,
        )

    def test_without_a_resolvable_root_the_relative_is_returned_raw(self):
        """CONTROL DE ANULACION del caso 2.

        Sin el, aquel pasaria igual con un mecanismo que compusiera SIEMPRE
        contra un arbol que este modulo eligiera por su cuenta.
        """
        inside_provider = reach.thyrox_root() / "src" / "paths"
        with _Absent(reach.CONSUMER_ROOT_VAR), \
             _Declared(cache.CACHE_DIR_VAR, "indice-relativo"):
            self.assertEqual(cache.cache_dir(inside_provider),
                             Path("indice-relativo"))

    def test_the_default_is_recorded_not_silent(self):
        roots = _without_per_clone_key()
        target = sorted(roots)[0]
        with _Absent(cache.CACHE_DIR_VAR), _Absent(reach.CONSUMER_ROOT_VAR):
            cache.cache_dir(roots[target])
        declared = {f.key for f in declarations.fallbacks()}
        self.assertIn(cache.CACHE_DIR_VAR, declared)

    def test_the_three_families_compose_the_same_segment_alike(self):
        """`rules` y `workbench` ya lo hacian y `cache` no — la asimetria.

        La poblacion NO es la de ``_without_per_clone_key``, que sale de la
        familia ``cache`` sola: cada familia tiene sus propias declaraciones
        por clon, y sobre un clon que declare la de OTRA familia esta
        comparacion mide la precedencia, no la composicion. Fue el primer
        veredicto rojo de este caso — medido: ``docs`` declara su clave por
        clon de ``workbench`` y devolvia su hogar declarado, no el segmento.
        """
        from rules import paths as rules  # noqa: PLC0415

        roots = {
            repo: root for repo, root in _without_per_clone_key().items()
            if not reach.env_value(workbench.workbench_home_name(repo), root)
            and not reach.env_value(rules.rules_home_name(repo), root)
        }
        self.assertGreaterEqual(
            len(roots), 2,
            "sin dos clones observables en las TRES familias, la simetria "
            "no se puede afirmar",
        )
        with _Declared(rules.RULES_DIR_VAR, "mismo-segmento"), \
             _Declared(workbench.WORKBENCH_DIR_VAR, "mismo-segmento"), \
             _Declared(cache.CACHE_DIR_VAR, "mismo-segmento"):
            for repo, root in roots.items():
                with self.subTest(repo=repo):
                    self.assertEqual(cache.cache_dir(root),
                                     rules.consumer_rules_dir(root))
                    self.assertEqual(cache.cache_dir(root),
                                     workbench.workbench_dir(root))


if __name__ == "__main__":
    unittest.main()
