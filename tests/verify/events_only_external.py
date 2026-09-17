#!/usr/bin/env python3
"""Eventos que SOLO declara el cableado externo al arbol de repos.

Es el sujeto del caso 8 de `test-eventos-hook.sh`, y se deriva en vez de
clavarse: el archivo que lo declara vive FUERA de los cinco clones y cambia sin
que nadie toque la suite. Clavada a `ConfigChange`, la asercion se puso roja el
2026-09-17 sin que el gate cambiara.

Un evento que tambien declara un repo NO sirve de sujeto: con el gate cegado a
la raiz del arbol seguiria sin salir como «sin consumir», asi que la asercion
pasaria con el defecto presente — el sub-patron D.

Metrica: claves de `hooks` del cableado externo menos las de los cinco clones.
Ciega a: un cableado externo en otra ruta que la declarada, y a un evento que
el ejecutable despache y nadie nombre en ningun `settings`.
"""
import json
import os
import pathlib
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))))
from src.paths import reach  # noqa: E402

def external_settings() -> pathlib.Path:
    """El cableado externo, resuelto COMO LO RESUELVE EL GATE.

    `pathlib.Path.home()` da `/root` bajo este harness y el gate lee
    `/home/user/.claude/settings.local.json`: el archivo que el helper media no
    era el que el gate mide, asi que la rama SIN MEDIR pasaba por no encontrar
    nada — verde por la razon equivocada, que es el defecto que este helper
    existe para cerrar. La raiz se pide a `reach`, que es de donde el gate la
    saca.
    """
    declarado = os.environ.get("THYROX_EXTERNAL_SETTINGS")
    if declarado:
        return pathlib.Path(declarado)
    return pathlib.Path(reach.tree_root()) / ".claude" / "settings.local.json"


def declared_events(path: pathlib.Path) -> set[str]:
    """Las claves de `hooks` de un settings, o vacio si no se puede leer."""
    try:
        return set(json.loads(path.read_text(encoding="utf-8")).get("hooks", {}))
    except (OSError, ValueError):
        return set()


def events_only_external() -> list[str]:
    """Los del cableado externo que ningun clon declara tambien."""
    in_repos: set[str] = set()
    for root in reach.roots().values():
        in_repos |= declared_events(
            pathlib.Path(root) / ".claude" / "settings.json")
    return sorted(declared_events(external_settings()) - in_repos)


if __name__ == "__main__":
    print(" ".join(events_only_external()))
