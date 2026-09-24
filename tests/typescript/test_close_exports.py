#!/usr/bin/env python3
"""Contrato del cierre de la superficie de un paquete: del comodín a claves explícitas.

El defecto, medido (``.claude/workbench/frontera-publica-de-paquetes-*``): los
42 paquetes declaran ``exports``, pero 28 incluyen ``./*`` / ``./*.js``, que
publican el árbol entero. De 7 754 importaciones por nombre fuera de los tests,
3 544 (46 %) sólo entran por ese comodín. Con él, ninguna ruta interna nueva
necesita tocar el manifiesto: la frontera existe en el archivo y no en el
resolutor.

El cierre sustituye cada subruta CONSUMIDA en el patrón del propio comodín —el
algoritmo de resolución de Node, así que el archivo resuelto no cambia— y
retira el comodín. Desde ahí, una ruta interna nueva la rechaza el resolutor, y
ampliar la superficie es un diff visible del ``package.json``.

Ciego a: si la superficie que queda es la CORRECTA. Enumera lo que se consume
hoy; acotarla hacia ``.`` es otra decisión, por paquete.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "src"))

from typescript import close_exports as ce  # noqa: E402

ok_count = 0
fail_count = 0


def check(name, cond, detail=""):
    global ok_count, fail_count
    if cond:
        ok_count += 1
        print(f"ok   {name}")
    else:
        fail_count += 1
        print(f"FAIL {name} {detail}")


WILDCARD = {
    ".": {"types": "./dist/index.d.ts", "default": "./src/index.ts"},
    "./*": {"types": "./dist/*.d.ts", "default": "./src/*.ts"},
    "./*.js": {"types": "./dist/*.d.ts", "default": "./src/*.ts"},
}


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def make_tree(base: Path) -> Path:
    """Dos paquetes: ``@t/lib`` con comodín y ``@t/app`` que lo consume."""
    root = base / "packages"
    lib = root / "lib"
    write(lib / "package.json", json.dumps({"name": "@t/lib", "exports": WILDCARD}, indent=2) + "\n")
    for rel in ("index.ts", "foo/bar.ts", "baz.ts", "unused.ts", "mocked.ts", "lazy.ts", "reexp.ts"):
        write(lib / "src" / rel, "export const x = 1\n")
    closed = root / "closed"
    write(closed / "package.json", json.dumps(
        {"name": "@t/closed", "exports": {".": "./src/index.ts", "./a.js": "./src/a.ts"}}, indent=2) + "\n")
    write(closed / "src" / "a.ts", "export const a = 1\n")
    app = root / "app"
    write(app / "package.json", json.dumps({"name": "@t/app", "exports": {".": "./src/index.ts"}}, indent=2) + "\n")
    write(app / "src" / "index.ts", "\n".join([
        "import { x } from '@t/lib'",
        "import { x as y } from '@t/lib/foo/bar.js'",
        "import { x as z } from '@t/lib/baz'",
        "import { x as g } from '@t/lib/ghost.js'",
        "export { x as r } from '@t/lib/reexp.js'",
        "const m = await import('@t/lib/lazy.js')",
        "import { a } from '@t/closed/a.js'",
        "",
    ]))
    write(base / "tests" / "app.test.ts", "mock.module('@t/lib/mocked.js', () => ({}))\n")
    return root


with tempfile.TemporaryDirectory() as tmp:
    base = Path(tmp)
    root = make_tree(base)
    scan = [root, base / "tests"]

    consumed = ce.consumed_subpaths(scan, {"@t/lib", "@t/closed", "@t/app"})
    check("cuenta import estático, import() dinámico, export…from y mock.module",
          consumed.get("@t/lib") == {"./foo/bar.js", "./baz", "./ghost.js", "./reexp.js", "./lazy.js", "./mocked.js"},
          repr(consumed.get("@t/lib")))

    plan = ce.plan_package(root / "lib", consumed.get("@t/lib", set()))
    exports = plan.exports
    check("./*.js gana a ./* para una subruta .js (precedencia de Node)",
          exports.get("./foo/bar.js") == {"types": "./dist/foo/bar.d.ts", "default": "./src/foo/bar.ts"},
          repr(exports.get("./foo/bar.js")))
    check("subruta sin extensión resuelve por ./*",
          exports.get("./baz") == {"types": "./dist/baz.d.ts", "default": "./src/baz.ts"}, repr(exports.get("./baz")))
    check("el comodín se retira", not any("*" in k for k in exports), repr(list(exports)))
    check("la puerta '.' se conserva", exports.get(".") == WILDCARD["."])
    check("una subruta no consumida no se publica", "./unused.js" not in exports and "./unused" not in exports)
    check("un destino inexistente no se publica y se reporta",
          "./ghost.js" not in exports and "./ghost.js" in plan.missing, repr(plan.missing))
    check("mock.module de un test también es consumo", "./mocked.js" in exports)

    plan_closed = ce.plan_package(root / "closed", consumed.get("@t/closed", set()))
    check("un paquete sin comodín no cambia", plan_closed.changed is False and plan_closed.exports == {".": "./src/index.ts", "./a.js": "./src/a.ts"})

    cmd = [sys.executable, str(ROOT / "src/typescript/close_exports.py"), str(root), "--scan", str(root), str(base / "tests")]
    before = subprocess.run(cmd + ["--check"], capture_output=True, text=True)
    check("--check con comodín vivo sale 1", before.returncode == 1, before.stdout + before.stderr)
    dry = subprocess.run(cmd, capture_output=True, text=True)
    check("sin --write no escribe", "./*" in json.loads((root / "lib/package.json").read_text())["exports"], dry.stdout)
    wrote = subprocess.run(cmd + ["--write"], capture_output=True, text=True)
    check("--write sale 0", wrote.returncode == 0, wrote.stdout + wrote.stderr)
    after = subprocess.run(cmd + ["--check"], capture_output=True, text=True)
    check("--check tras cerrar sale 0", after.returncode == 0, after.stdout + after.stderr)
    empty = subprocess.run([sys.executable, str(ROOT / "src/typescript/close_exports.py"), str(base / "no-existe"), "--check"],
                           capture_output=True, text=True)
    check("una raíz sin paquetes rehúsa con 2, sin cifra", empty.returncode == 2 and "0 " not in empty.stdout, empty.stdout + empty.stderr)

print(f"\n{ok_count} ok, {fail_count} fail")
sys.exit(1 if fail_count else 0)
