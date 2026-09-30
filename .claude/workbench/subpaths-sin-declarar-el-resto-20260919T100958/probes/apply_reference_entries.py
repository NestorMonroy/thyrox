#!/usr/bin/env python3
"""Copia al manifiesto de cada paquete la entrada que LA REFERENCIA declara.

No inventa la forma: para cada subpath sin resolver, busca el par clave->destino
en `ccnmt: packages/<x>/package.json` y lo copia verbatim. Un subpath que la
referencia no declare NO se toca — se reporta, porque ahi la forma seria una
decision local y no un porte.

La entrada se inserta ANTES de los comodines: `exports` resuelve lo exacto
primero, pero el orden explicito deja legible que lo especifico precede a lo
generico, y es como la referencia lo escribe.

Metrica: pares (clave, destino) del `exports` de la referencia, copiados.
Ciega a: si el destino que la referencia declara existe en NUESTRO arbol — eso
lo comprueba el censo al re-correr, no este aplicador.
"""
import json
import pathlib
import sys

REFERENCE = pathlib.Path("/home/user/claude-code-nestor-monroy-tools/packages")


def load(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    pending = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    packages = pathlib.Path.cwd() / "src" / "packages"

    applied: list[str] = []
    missing: list[str] = []
    for package, subpaths in sorted(pending.items()):
        ref_manifest = REFERENCE / package / "package.json"
        if not ref_manifest.exists():
            missing.extend(f"@thyrox/{package}/{s} — la referencia no tiene el paquete" for s in subpaths)
            continue
        ref_exports = load(ref_manifest).get("exports", {})
        our_path = packages / package / "package.json"
        ours = load(our_path)
        exports = ours.get("exports", {})

        added: dict[str, str] = {}
        for subpath in subpaths:
            key = f"./{subpath}"
            target = ref_exports.get(key)
            if not isinstance(target, str):
                missing.append(f"@thyrox/{package}/{subpath} — la referencia no declara {key!r}")
                continue
            added[key] = target
            applied.append(f"{package}: {key!r} -> {target!r}")

        if not added:
            continue
        # Lo explicito antes de los comodines, como la referencia lo escribe.
        exact = {k: v for k, v in exports.items() if "*" not in k}
        wild = {k: v for k, v in exports.items() if "*" in k}
        ours["exports"] = {**exact, **added, **wild}
        our_path.write_text(json.dumps(ours, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"entradas copiadas de la referencia: {len(applied)}")
    for line in applied:
        print(f"  {line}")
    print(f"\nsin contraparte en la referencia: {len(missing)}")
    for line in missing:
        print(f"  {line}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
