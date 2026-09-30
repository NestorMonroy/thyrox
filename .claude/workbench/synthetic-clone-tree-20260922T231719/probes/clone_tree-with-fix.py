"""Un arbol sintetico de varios clones, para suites que componen rutas por clon.

`paths.reach` deriva el roster de los directorios hermanos del proveedor y
exige que al menos dos compartan prefijo. Una suite que compone la ruta de
`api` o de `docs` con el roster del HOST depende de cuantos clones tenga la
maquina que la corre: con un solo consumidor, `reach_roots` rehusa y la suite
sale en rojo sin haber medido nada (H-THYROX-155).

Esta fixture construye los directorios y deja que la derivacion real corra.
No declara `THYROX_REACH_ROOTS`: declararlo saltaria justo el mecanismo que
esas suites deberian ejercer.
"""
from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

#: Prefijos de variables que gobiernan la resolucion de rutas. Se retiran
#: dentro de la fixture para que ninguna declaracion del host decida por ella.
_GOVERNING_PREFIXES = ("THYROX_", "KAUPAMEX_")


@dataclass(frozen=True)
class CloneTree:
    base: Path
    provider: Path
    clones: tuple[str, ...]


@contextmanager
def synthetic_clone_tree(clones: Sequence[str] = ("api", "db", "docs", "server", "ui"),
                         prefix: str = "kaupamex-") -> Iterator[CloneTree]:
    """Construye `<base>/<prefix><clon>` por clon y un proveedor en `<base>/thyrox`.

    Durante el bloque, `THYROX_ROOT` apunta al proveedor sintetico,
    `THYROX_REACH_ROOT` a la base y `THYROX_ENV_FILE` a `os.devnull`, asi que ni el `.env` del host ni sus
    variables deciden la resolucion. Al salir, el entorno se restaura entero.
    """
    saved = {k: v for k, v in os.environ.items() if k.startswith(_GOVERNING_PREFIXES)}
    with tempfile.TemporaryDirectory(prefix="clone-tree-") as tmp:
        base = Path(tmp)
        for clone in clones:
            (base / f"{prefix}{clone}").mkdir()
        provider = base / "thyrox"
        (provider / "src" / "paths").mkdir(parents=True)
        # El marcador del ascenso: `thyrox_root` reconoce al proveedor por el.
        (provider / "src" / "paths" / "reach.py").write_text("")
        for key in saved:
            del os.environ[key]
        os.environ["THYROX_ROOT"] = str(provider)
        # El padre de los clones se declara aparte: `reach.tree_root` no lo
        # toma de `THYROX_ROOT` sino de `THYROX_REACH_ROOT` o del ascenso
        # desde el archivo del modulo, que esta en el arbol REAL. Se declara la
        # raiz del arbol, no el roster: el roster sigue derivandose.
        os.environ["THYROX_REACH_ROOT"] = str(base)
        os.environ["THYROX_ENV_FILE"] = os.devnull
        try:
            yield CloneTree(base, provider, tuple(clones))
        finally:
            for key in [k for k in os.environ if k.startswith(_GOVERNING_PREFIXES)]:
                del os.environ[key]
            os.environ.update(saved)
