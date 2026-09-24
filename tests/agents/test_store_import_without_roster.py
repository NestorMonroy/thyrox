#!/usr/bin/env python3
"""Importar el store no exige que el host tenga un roster de clones.

`agent_store.py` leia `reach_roots.REACH_ROOTS` al IMPORTARSE, y ese atributo
se resuelve derivando los clones hermanos del proveedor: exige al menos dos
con el mismo prefijo. En un host con un solo consumidor, cualquier modulo o
suite que importara el store moria con `ReachRootError` antes de medir nada.
Medido en la primera ejecucion completa de la mitad Python: 11 de las 39
suites rojas por esa causa entraban por esta linea (H-THYROX-155).

El roster solo hace falta cuando se NOMBRA un consumidor (`--repo`). El
store por defecto es el hogar de thyrox y no lo necesita.

Qué haria fallar a este control: volver a leer el roster al importar. Cae el
caso `import`. Los casos `--repo` fijan que el rechazo no se pierde: se
mueve a donde corresponde, y sigue nombrando la variable.
"""
from __future__ import annotations

import os
import pathlib
import subprocess
import sys
import tempfile
from paths import reach  # noqa: E402

THYROX = reach.thyrox_root()
passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def isolated_env(provider: pathlib.Path, **extra: str) -> dict[str, str]:
    """Un proveedor sin hermanos: ningun prefijo tiene mayoria de dos."""
    env = {k: v for k, v in os.environ.items()
           if not k.startswith("THYROX_") and k != "PYTHONPATH"}
    env.update(THYROX_ROOT=str(provider), THYROX_ENV_FILE=os.devnull,
               PYTHONPATH=str(THYROX / "src"), **extra)
    return env


def run_python(code: str, env: dict[str, str]) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, "-c", code], env=env,
                          capture_output=True, text=True)


print("test_store_import_without_roster:")
with tempfile.TemporaryDirectory() as tmp:
    provider = pathlib.Path(tmp) / "provider"
    (provider / "src" / "paths").mkdir(parents=True)
    (provider / "src" / "paths" / "reach.py").write_text("")   # el marcador del ascenso

    imported = run_python("import agents.agent_store", isolated_env(provider))
    assert_equal("importar el store sin roster no falla", 0, imported.returncode)

    parse_repo = ("import argparse, agents.agent_store as s\n"
                  "p = argparse.ArgumentParser(); s.add_target_args(p)\n"
                  "s.resolve_store_dir(p.parse_args(['--repo', 'docs']), create=False)\n")
    refused = run_python(parse_repo, isolated_env(provider))
    assert_equal("--repo sin roster rehusa", True, refused.returncode != 0)
    assert_equal("y el rechazo nombra THYROX_REACH_ROOTS", True,
                 "THYROX_REACH_ROOTS" in refused.stderr)

    declared = run_python(parse_repo.replace("create=False)", "create=False)\nprint('ok')"),
                          isolated_env(provider, THYROX_REACH_ROOTS="docs"))
    assert_equal("con el roster declarado, --repo docs se acepta", False,
                 "repo invalido" in declared.stderr or "invalid choice" in declared.stderr)

print(f"test_store_import_without_roster: {passed + failed} aserciones — "
      f"{passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
