#!/usr/bin/env python3
"""El script de un hook contra su primer token de ruta.

El control de existencia de un hook avisa de los que apuntan a un script que no
está en disco, y para localizarlo toma **el primer token del comando que sea
una ruta**. Esa premisa vale para la forma dominante —``bash .claude/hooks/x.sh``—
y hay formas donde NO vale. En ellas el aviso no falla: mide otra cosa, o no
mide nada, y su silencio se lee como «el hook está bien».

Este gate mide **la premisa**, no el hook. Clasifica cada comando declarado en
un ``settings*.json`` en una de estas formas:

``simple``
    un solo segmento con ruta, y su primer token de ruta es el script. El
    control de existencia lo ve. Es la forma sana.

``sin_ruta``
    ningún token es una ruta — ``python3 -m paquete``, ``jq …``. El control
    recorre el comando y no encuentra nada que comprobar: pasa en verde sin
    haber mirado un archivo. Es el sub-patrón D en su forma más pura.

``varios_scripts``
    dos o más segmentos con ruta (``a.sh && b.sh``, ``cat x | bash y``). El
    control mide el primero; la ausencia del segundo es invisible.

``ruta_en_cadena``
    hay un ``-c``: la ruta viaja dentro de una cadena que interpreta otro
    proceso. Lo que el control mide no es lo que se ejecuta.

``ruta_tras_opcion``
    el primer token de ruta va precedido de una bandera (``--base X``): es el
    valor de la opción, no el script.

Procedencia
-----------
Adaptación de ``kaupamex-docs: .claude/scripts/gates/check_hook_script_token.py``,
portado a THYROX en P5. Mismo mecanismo; las raíces llegan por ``paths.reach`` y
los identificadores van en inglés.

Uso::

    python3 src/gates/hook_script_token.py            # reporte
    python3 src/gates/hook_script_token.py --quiet    # sólo el conteo
    python3 src/gates/hook_script_token.py --strict   # exit 1 si hay opacos

*Métrica:* la forma sintáctica del comando declarado.
*Ciega a:* si el script existe y hace lo que dice — eso lo mide el control de
existencia, y sólo sobre las formas que este gate declara ``simple``.
"""

import argparse
import json
import shlex
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from paths import reach  # noqa: E402

SETTINGS_NAMES = ("settings.json", "settings.local.json")

SEPARATORS = ("&&", "||", "|", ";")

#: La forma sana es la única que el control de existencia sabe medir.
SOUND_SHAPE = "simple"


def repo_root(repo: str, tree_root: Path | None = None) -> Path:
    """La raíz de un clon: el árbol declarado, o el mecanismo de alcance."""
    if tree_root is not None:
        return Path(tree_root) / reach.clone_name(repo)
    return reach.root(repo)


def segments(tokens: list[str]) -> list[list[str]]:
    """Parte la lista de tokens por los separadores de comando del shell."""
    current: list[str] = []
    out: list[list[str]] = []
    for token in tokens:
        if token in SEPARATORS:
            out.append(current)
            current = []
        else:
            current.append(token)
    out.append(current)
    return [s for s in out if s]


def is_path(token: str) -> bool:
    """Un token cuenta como ruta si lleva separador de directorio."""
    return "/" in token and not token.startswith("-")


def classify(command: str) -> tuple[str, str]:
    """Devuelve ``(shape, detail)`` para un comando de hook."""
    try:
        tokens = shlex.split(command)
    except ValueError as error:
        return "no_parseable", f"shlex no lo separa: {error}"

    if "-c" in tokens:
        return "ruta_en_cadena", "'-c': la ruta viaja dentro de una cadena que interpreta otro proceso"

    with_path = [s for s in segments(tokens) if any(is_path(t) for t in s)]

    if not with_path:
        return "sin_ruta", "ningún token es ruta — el control de existencia no mira ningún archivo"

    if len(with_path) > 1:
        firsts = [next(t for t in s if is_path(t)) for s in with_path]
        return "varios_scripts", (f"{len(with_path)} segmentos con ruta; sólo se mide "
                                  f"{firsts[0]!r}, quedan fuera "
                                  + ", ".join(repr(p) for p in firsts[1:]))

    segment = with_path[0]
    index = next(i for i, t in enumerate(segment) if is_path(t))
    if index > 0 and segment[index - 1].startswith("-"):
        return "ruta_tras_opcion", (f"{segment[index]!r} va tras la bandera "
                                    f"{segment[index - 1]!r}: es su valor, no el script")

    return SOUND_SHAPE, segment[index]


def declared_commands(tree_root: Path | None = None):
    """Todo comando de hook de los ``settings*.json`` de los clones.

    Un ``settings`` ilegible NO se salta en silencio: se emite con ``event``
    en ``None``, porque un archivo que nadie puede parsear es un archivo que
    nadie está midiendo — y ése es el defecto que este gate persigue.
    """
    for repo in reach.REACH_ROOTS:
        for name in SETTINGS_NAMES:
            path = repo_root(repo, tree_root) / ".claude" / name
            if not path.is_file():
                continue
            origin = f"{reach.clone_name(repo)}/{name}"
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except ValueError as error:
                yield origin, None, f"JSON inválido: {error}"
                continue
            for event, matchers in (data.get("hooks") or {}).items():
                for matcher in matchers:
                    for hook in matcher.get("hooks", []):
                        yield origin, event, hook.get("command", "")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--quiet", action="store_true", help="sólo el conteo")
    parser.add_argument("--strict", action="store_true", help="exit 1 si hay formas opacas")
    parser.add_argument("--tree-root", default=None,
                        help="árbol de clones a medir; sin él lo resuelve paths.reach")
    args = parser.parse_args(argv)

    tree_root = Path(args.tree_root) if args.tree_root else None

    total = 0
    opaque = []
    for origin, event, command in declared_commands(tree_root):
        if event is None:
            opaque.append((origin, "-", "no_parseable", command))
            continue
        total += 1
        shape, detail = classify(command)
        if shape != SOUND_SHAPE:
            opaque.append((origin, event, shape, detail))

    if not args.quiet:
        for origin, event, shape, detail in opaque:
            print(f"OPACO {origin} [{event}] {shape}: {detail}")
        if opaque:
            print()

    print(f"check_hook_script_token: {len(opaque)} comando(s) que el control de "
          f"existencia no puede medir (alcance medido: {total} comandos declarados)")

    # Cero comandos medidos NO es un aprobado: el gate no encontró settings.
    if total == 0:
        parent = tree_root if tree_root is not None else reach.tree_root()
        print(f"  ADVERTENCIA: 0 comandos declarados bajo {parent} — "
              f"el conteo de arriba no mide nada")
        return 1 if args.strict else 0

    if args.strict and opaque:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
