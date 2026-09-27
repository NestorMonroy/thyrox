#!/usr/bin/env python3
"""Contrato del build JavaScript de los paquetes @thyrox.

Directiva del ejecutor 2026-09-27: los hermanos se consumen por su build, no
por `workspace:*` apuntando al fuente. Medido antes de escribirlo: el build
de hoy era sólo de tipos —2956 `.d.ts` y 0 `.js` en los 48 `dist/`—, y el
`default` de cada `exports` resolvía al `.ts`.

Tres hechos de Bun 1.3.11 fijan la forma:

1. `bun build` sin `--splitting` empaqueta dentro de cada entrada los módulos
   que importa: dos entradas que comparten un módulo con estado reciben DOS
   copias. Con `--splitting` el compartido va a un chunk único.
2. `bunfig.toml` no tiene clave de condiciones: `Expected conditions to be an
   array of strings` vive junto a `entrypoints`/`fileExtensions`, que es la
   API `Bun.build` (`bun_strings.txt` del banco
   `omniroute-analysis-20260927T160306`). Leer el fuente exige
   `--conditions=@thyrox/source` en cada invocación.
3. Sin condición, Bun resuelve `default`.

Ciego a: si el JS emitido se comporta como el fuente más allá de lo que las
suites de cada paquete ejercitan contra `dist/`.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "src"))

ok_count = 0
fail_count = 0


def check(label, expected, seen):
    global ok_count, fail_count
    if expected == seen:
        ok_count += 1
        print(f"  ok   {label}")
    else:
        fail_count += 1
        print(f"  FALLO {label}\n       esperado: {expected!r}\n       obtenido: {seen!r}")


def write_package(root: Path) -> Path:
    """Un paquete con dos entradas que comparten un módulo con estado."""
    pkg = root / "pkg"
    (pkg / "sub").mkdir(parents=True)
    (pkg / "shared.ts").write_text("export const state = { count: 0 }\n", encoding="utf8")
    (pkg / "index.ts").write_text(
        "import { state } from './shared.ts'\nexport function bump() { state.count++ }\n", encoding="utf8")
    (pkg / "sub" / "reader.tsx").write_text(
        "import { state } from '../shared.ts'\nexport function read() { return state.count }\n", encoding="utf8")
    manifest = {
        "name": "@probe/pkg",
        "version": "0.1.0",
        "private": True,
        "type": "module",
        "main": "./index.ts",
        "exports": {
            ".": {"@thyrox/source": "./index.ts", "types": "./dist/index.d.ts", "default": "./index.ts"},
            "./reader": {"@thyrox/source": "./sub/reader.tsx", "types": "./dist/sub/reader.d.ts",
                         "default": "./sub/reader.tsx"},
        },
    }
    (pkg / "package.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
    return pkg


def main() -> int:
    from typescript import build_javascript as mod
    from typescript import emit_declarations as emit

    print("dist_entry")
    check(".ts a .js bajo dist", "./dist/index.js", mod.dist_entry("./index.ts"))
    check(".tsx anidado", "./dist/sub/reader.js", mod.dist_entry("./sub/reader.tsx"))

    print("source_entries")
    manifest = json.loads(json.dumps({
        "main": "./index.ts",
        "exports": {".": {"@thyrox/source": "./index.ts", "default": "./dist/index.js"},
                    "./a": "./a.ts"},
    }))
    check("toma @thyrox/source y la cadena llana; nunca dist", ["./a.ts", "./index.ts"],
          mod.source_entries(manifest))

    print("expand_entries")
    with tempfile.TemporaryDirectory(prefix="build-js-wild-") as tmp:
        wild = Path(tmp)
        (wild / "dist").mkdir()
        (wild / "dist" / "index.d.ts").write_text("export {}\n", encoding="utf8")
        (wild / "dist" / "old.js").write_text("export {}\n", encoding="utf8")
        (wild / "dist" / "stale.ts").write_text("export {}\n", encoding="utf8")
        (wild / "__tests__").mkdir()
        (wild / "__tests__" / "a.test.ts").write_text("export {}\n", encoding="utf8")
        (wild / "io.ts").write_text("export {}\n", encoding="utf8")
        (wild / "types.d.ts").write_text("export {}\n", encoding="utf8")
        check("un comodín en la raíz no recoge dist/, declaraciones ni pruebas", ["./io.ts"],
              mod.expand_entries(wild, ["./*.ts"]))

    print("build_command")
    cmd = mod.build_command(["./index.ts"])
    check("splitting y dependencias externas", True,
          all(flag in cmd for flag in ("--splitting", "--packages", "external", "--target", "bun")))

    with tempfile.TemporaryDirectory(prefix="build-js-") as tmp:
        pkg = write_package(Path(tmp))

        print("repoint sin build")
        check("sin dist/*.js el repunte rehúsa", False, mod.repoint_default(pkg))

        print("build")
        result = mod.build_package(pkg)
        check("bun build sale 0", 0, result.returncode)
        check("emite las dos entradas", True,
              (pkg / "dist" / "index.js").is_file() and (pkg / "dist" / "sub" / "reader.js").is_file())

        probe = pkg / "probe.mjs"
        probe.write_text(
            "import { bump } from './dist/index.js'\nimport { read } from './dist/sub/reader.js'\n"
            "bump(); bump(); console.log(read())\n", encoding="utf8")
        run = subprocess.run(["bun", str(probe)], capture_output=True, text=True, cwd=pkg)
        check("el estado compartido es UNA instancia", "2", run.stdout.strip())

        print("repoint")
        check("con los .js, repunta", True, mod.repoint_default(pkg))
        written = json.loads((pkg / "package.json").read_text(encoding="utf8"))
        check("default de la raíz a dist", "./dist/index.js", written["exports"]["."]["default"])
        check("default del subpath a dist", "./dist/sub/reader.js", written["exports"]["./reader"]["default"])
        check("conserva la condición de fuente", "./sub/reader.tsx",
              written["exports"]["./reader"]["@thyrox/source"])
        check("main a dist", "./dist/index.js", written["main"])
        before = (pkg / "package.json").read_text(encoding="utf8")
        mod.repoint_default(pkg)
        check("idempotente", before, (pkg / "package.json").read_text(encoding="utf8"))

        print("emit_declarations.repoint_manifest no deshace el repunte JS")
        for rel in ("dist/index.d.ts", "dist/sub/reader.d.ts"):
            (pkg / rel).parent.mkdir(parents=True, exist_ok=True)
            (pkg / rel).write_text("export {}\n", encoding="utf8")
        check("repunta los tipos", True, emit.repoint_manifest(pkg))
        after_types = json.loads((pkg / "package.json").read_text(encoding="utf8"))
        check("default sigue en dist tras repuntar tipos", "./dist/sub/reader.js",
              after_types["exports"]["./reader"]["default"])
        check("la fuente sigue en @thyrox/source", "./sub/reader.tsx",
              after_types["exports"]["./reader"]["@thyrox/source"])

        print("emit_declarations sobre un manifiesto ya repuntado")
        check("export_targets lee la fuente de @thyrox/source", ["./index.ts", "./sub/reader.tsx"],
              sorted(set(emit.export_targets(written))))

    print(f"\n{ok_count} ok, {fail_count} fallo(s)")
    return 1 if fail_count else 0


if __name__ == "__main__":
    sys.exit(main())
