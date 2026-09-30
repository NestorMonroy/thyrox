#!/usr/bin/env python3
"""Censa los specifiers `@thyrox/<pkg>/<sub>` que el `exports` del paquete no resuelve.

El defecto que mide: un subpath que el arbol importa y cuyo manifiesto no
declara. Un comodin lleva la extension LITERAL —`"./*.js": "./*.ts"` sustituye
el segmento, nunca el sufijo— asi que un modulo que vive en un subdirectorio
distinto del que el specifier nombra queda fuera de todo comodin.

Metrica: para cada specifier distinto del arbol, se resuelve contra el mapa
`exports` de su paquete y se comprueba que el destino EXISTA en disco.
Ciega a: un specifier compuesto por concatenacion (no es un literal); una
cita en prosa, que se descuenta a proposito por no resolver nada; y a la
semantica condicional de `exports` (`import`/`require`/`default`) — aqui se
toma el valor si es cadena, y la rama `default` si es objeto.
"""
import json
import pathlib
import re
import sys

SPECIFIER = re.compile(r"['\"]@thyrox/([a-z0-9-]+)/([A-Za-z0-9_./-]+)['\"]")


def export_map(manifest: pathlib.Path) -> dict[str, str]:
    """El `exports` del manifiesto, aplanado a cadena -> cadena."""
    raw = json.loads(manifest.read_text()).get("exports", {})
    flat: dict[str, str] = {}
    for key, value in raw.items():
        if isinstance(value, str):
            flat[key] = value
        elif isinstance(value, dict):
            target = value.get("default") or value.get("import") or value.get("require")
            if isinstance(target, str):
                flat[key] = target
    return flat


def resolve(subpath: str, exports: dict[str, str]) -> str | None:
    """Resuelve `./<subpath>` contra el mapa: exacto primero, luego comodin."""
    key = f"./{subpath}"
    if key in exports:
        return exports[key]
    best: tuple[int, int, str] | None = None
    for pattern, target in exports.items():
        if "*" not in pattern:
            continue
        head, _, tail = pattern.partition("*")
        if key.startswith(head) and key.endswith(tail) and len(key) >= len(head) + len(tail):
            middle = key[len(head): len(key) - len(tail) or None]
            # El patron mas especifico gana. La especificidad es el par
            # (base, sufijo), NO solo la base: `"./*"` y `"./*.js"` comparten
            # base `./`, y desempatar por base sola le da la victoria al
            # comodin generico, que entonces le pega `.ts` a un specifier que
            # ya termina en `.js`. Ese era el defecto de la primera version de
            # esta sonda: publicaba 64 sin resolver, y muchos si resuelven.
            rank = (len(head), len(tail))
            if best is None or rank > best[:2]:
                best = (*rank, target.replace("*", middle))
    return best[2] if best else None


def main() -> int:
    root = pathlib.Path.cwd()
    packages = root / "src" / "packages"
    wanted = sys.argv[1] if len(sys.argv) > 1 else None

    seen: dict[tuple[str, str], int] = {}
    for source in list(root.glob("src/**/*.ts")) + list(root.glob("src/**/*.tsx")) \
            + list(root.glob("tests/**/*.ts")):
        if "node_modules" in source.parts:
            continue
        # El literal tiene DOS sentidos y solo uno resuelve: entre COMILLAS es
        # un specifier que el resolver lee; entre acentos graves o desnudo es
        # una cita en prosa, que no resuelve nada y no entra al universo.
        for package, subpath in SPECIFIER.findall(source.read_text(errors="ignore")):
            if wanted and package != wanted:
                continue
            seen[(package, subpath)] = seen.get((package, subpath), 0) + 1

    unresolved: list[tuple[str, str, int, str]] = []
    for (package, subpath), hits in sorted(seen.items()):
        manifest = packages / package / "package.json"
        if not manifest.exists():
            unresolved.append((package, subpath, hits, "el paquete no existe"))
            continue
        target = resolve(subpath, export_map(manifest))
        if target is None:
            unresolved.append((package, subpath, hits, "ninguna entrada lo alcanza"))
        elif not (packages / package / target).exists():
            unresolved.append((package, subpath, hits, f"resuelve a {target}, que no existe"))

    print(f"specifiers distintos medidos: {len(seen)}")
    print(f"sin resolver: {len(unresolved)}")
    for package, subpath, hits, why in unresolved:
        print(f"  @thyrox/{package}/{subpath}  ({hits} import(s)) — {why}")
    return 1 if unresolved else 0


if __name__ == "__main__":
    raise SystemExit(main())
