#!/usr/bin/env python3
"""Una suite que aísla un hogar declarado lo aísla de verdad.

Por qué existe
--------------
Exportar la clave GLOBAL de un hogar (``THYROX_JOBS_DIR``, ``THYROX_WORKBENCH_DIR``,
``THYROX_CACHE_DIR``, ``THYROX_BACKGROUND_LOG_DIR``) no aísla una suite: los
resolvedores dan precedencia a la clave POR CLON (``THYROX_JOBS_THYROX``…), y si
el ``.env`` del árbol la declara, lo que la suite lanza escribe en el hogar real.
La suite sigue en verde porque ninguna aserción mira ese hogar. La forma que sí
aísla es ``src/lib/test_homes.sh::thyrox_isolate_homes``, o declarar
``THYROX_ENV_FILE`` para que ningún ``.env`` del árbol gobierne el proceso.

Cómo mide
---------
Toma los archivos de prueba preparados en el índice (``tests/**``, ``.sh`` y
``.py``), o las rutas dadas, y marca los que asignan una clave global de hogar
sin llamar a ``thyrox_isolate_homes`` ni declarar ``THYROX_ENV_FILE``. Un
archivo que no se toca no se mide: la deuda heredada se paga al tocarlo.

Salidas: 0 ninguna suite sin aislar · 1 hay suites, nombradas con la clave que
exportan.

*Ciega a:* una suite que aísla por otra vía (un ``env -i`` completo, un
contenedor) y a un hogar que la suite compone a mano sin pasar por el
resolvedor; ése no depende de la precedencia.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

GLOBAL_HOME_ASSIGNMENT = re.compile(
    r"""(?:export\s+|\[["']|environ\[["']|\b)(THYROX_(?:JOBS|WORKBENCH|CACHE|BACKGROUND_LOG)_DIR)["']?\]?\s*=""")
#: Formas que aíslan, más la exención declarada: una suite que prueba la propia
#: precedencia de los resolvedores asigna la global a propósito y lo dice.
ISOLATION_MARKERS = ("thyrox_isolate_homes", "THYROX_ENV_FILE", "home-isolation-exempt:")
TEST_SUFFIXES = (".sh", ".py")


def is_test_file(path: str) -> bool:
    return path.startswith("tests/") and path.endswith(TEST_SUFFIXES)


def staged_test_files(repo: Path) -> list[str]:
    out = subprocess.run(["git", "-C", str(repo), "diff", "--cached", "--name-only", "-z", "--diff-filter=ACMRT"],
                         capture_output=True, check=True).stdout
    return [name for name in out.decode().split("\0") if name and is_test_file(name)]


def unisolated_keys(text: str) -> list[str]:
    """Las claves globales de hogar que el texto asigna sin aislar el `.env`."""
    if any(marker in text for marker in ISOLATION_MARKERS):
        return []
    return sorted(set(GLOBAL_HOME_ASSIGNMENT.findall(text)))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("paths", nargs="*", help="archivos a medir en vez de los preparados")
    args = parser.parse_args(argv)
    repo = args.repo.resolve()
    names = args.paths or staged_test_files(repo)
    findings = []
    for name in names:
        path = Path(name) if Path(name).is_absolute() else repo / name
        keys = unisolated_keys(path.read_text(errors="replace"))
        if keys:
            findings.append((name, keys))
    print(f"check_test_home_isolation: {len(findings)} suite(s) sin aislar "
          f"(alcance medido: {len(names)} archivo(s) de prueba)")
    for name, keys in findings:
        print(f"    {name}: exporta {', '.join(keys)} sin thyrox_isolate_homes ni THYROX_ENV_FILE "
              f"— la clave por clon del .env le gana (src/lib/test_homes.sh)")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
