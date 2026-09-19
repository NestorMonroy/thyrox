#!/usr/bin/env python3
"""Contrato del emisor de declaraciones de hermano.

El defecto que cierra, medido y no supuesto. Un typecheck del paquete `cli`
publica 2821 errores y **76 % de ellos viven en paquetes hermanos**: el
consumidor recompila la fuente de veinte hermanos porque el `exports` de cada
uno resuelve a `./src/index.ts`. Dos sondas lo fijaron
(`.claude/workbench/emitir-declaraciones-de-hermano-*`):

1. dos hermanos con el MISMO defecto, uno exponiendo `.ts` y otro `.d.ts`:
   `skipLibCheck` salta el segundo y NO el primero — un solo error publicado
   de los dos igual de rotos;
2. `tsc --emitDeclarationOnly` sobre fuente rota **emite igual** (exit 2 con
   el archivo escrito) y **conserva las firmas**, no degrada a `any`.

Las dos mitades de (2) apuntan en direcciones opuestas y por eso el mecanismo
tiene la forma que tiene: conservar las firmas es lo que deja al consumidor
midiendo SU uso de verdad; emitir pese al error es lo que convertiria un
guion descuidado en una lavanderia — consumidor verde, hermano igual de roto.
De ahi que el veredicto sea de TRES estados y nombre el conteo.

Ciego a: si la declaracion emitida describe el COMPORTAMIENTO del modulo.
Describe lo que el compilador infirio de una fuente que no compila, que es
otra cosa; quien lo confunda comete el sub-patron C con este mecanismo como
sujeto. Y ciego al coste de recompilar los 42, que no se midio.
"""
import json
import os
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


def make_package(root, name, main_dir):
    """Un paquete sintetico con su manifiesto y una fuente con UN defecto.

    `main_dir` vacio pone la entrada en la raiz del paquete — los dos repartos
    que el arbol real tiene (32 en `src`, 10 en raiz).
    """
    pkg = root / name
    src = pkg / main_dir if main_dir else pkg
    src.mkdir(parents=True, exist_ok=True)
    entry = f"./{main_dir}/index.ts" if main_dir else "./index.ts"
    prefix = f"./{main_dir}" if main_dir else "."
    # Los subpaths NO son adorno: medido sobre el arbol real, los consumidores
    # de `storage` lo importan 240 veces por subpath (`/file.js`,
    # `/sessionStorage.js`, …) y CERO por la raiz. Un paquete sintetico sin
    # ellos no puede fallar por la causa que importa — y no fallo.
    (pkg / "package.json").write_text(json.dumps({
        "name": f"@probe/{name}", "version": "1.0.0", "private": True,
        "main": entry, "types": entry,
        "exports": {
            ".": entry,
            "./helper.js": f"{prefix}/helper.ts",
            "./*.js": f"{prefix}/*.ts",
        },
    }) + "\n")
    (src / "index.ts").write_text(
        "export const broken: string = 1\n"
        "export function add(a: number, b: number): number { return a + b }\n"
    )
    (src / "helper.ts").write_text("export const helps = (n: number) => n + 1\n")
    return pkg


def make_escaping_package(root, name, main_dir="src"):
    """Un paquete cuyo codigo importa FUERA de su propio directorio.

    Es el control que el fixture original no podia dar: sin una arista que
    escape, la asercion «no derrama fuera de dist/» pasa por construccion.
    En el arbol real 7 de 42 paquetes tienen esta forma — importan el
    `src/paths`, `src/task` o `src/store` del proveedor, o la fuente interna
    de un hermano.

    El derrame NO lo causa el `include`: tsc sigue los imports al programa
    pase lo que pase, y la ruta de salida es `outDir + relativa-a-rootDir`.
    Un import que sube por encima de `rootDir` produce una relativa con `..`,
    asi que su `.d.ts` aterriza FUERA de `dist/`, junto a la fuente ajena.
    """
    shared = root / "shared.ts"
    shared.write_text("export const shared = (n: number) => n + 1\n", encoding="utf8")
    pkg = root / name
    src = pkg / main_dir if main_dir else pkg
    src.mkdir(parents=True, exist_ok=True)
    (pkg / "package.json").write_text(json.dumps({
        "name": name, "version": "0.1.0", "private": True,
        "main": f"./{main_dir}/index.ts" if main_dir else "./index.ts",
        "exports": {".": f"./{main_dir}/index.ts" if main_dir else "./index.ts"},
    }) + "\n", encoding="utf8")
    (src / "index.ts").write_text(
        "import { shared } from '../../shared.ts'\n"
        "export const use = (n: number): number => shared(n)\n")
    return pkg


def main():
    from typescript import emit_declarations as mod

    # Caso 1 — las piezas existen.
    missing = [n for n in ("emit_package", "declaration_entry", "repoint_manifest")
               if not hasattr(mod, n)]
    check("las tres piezas existen en el modulo", [], missing)
    if missing:
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)

        # Caso 2 — la entrada de declaracion se DERIVA del main, no se fija.
        # 32 paquetes del arbol real entran por `src` y 10 por la raiz: una
        # constante `src` codificada dejaria a los 10 emitiendo al sitio
        # equivocado, y el consumidor no veria diferencia — pasaria en verde.
        check("deriva la entrada cuando main entra por src/",
              "./dist/index.d.ts", mod.declaration_entry("./src/index.ts"))
        check("y cuando main entra por la raiz del paquete",
              "./dist/index.d.ts", mod.declaration_entry("./index.ts"))

        # Caso 3 — emite, y emite PESE al error de tipo.
        pkg = make_package(root, "con-src", "src")
        result = mod.emit_package(pkg)
        check("emitio la declaracion pese al error de tipo",
              True, (pkg / "dist" / "index.d.ts").is_file())

        # Caso 4 — EL QUE DISCRIMINA. El veredicto NOMBRA cuantos errores
        # atraveso. Un mecanismo que solo dijera «emitio» publicaria lo mismo
        # sobre fuente sana y sobre fuente rota: el sub-patron D con este
        # mecanismo como sujeto, y la lavanderia que la sonda 2 anticipo.
        check("el veredicto declara que hubo errores", True, result.errors > 0)
        check("y no los confunde con un fallo de emision", True, result.emitted)

        # Caso 5 — la declaracion CONSERVA la firma. Si degradara a `any`, el
        # consumidor dejaria de medir su propio uso y el cambio compraria
        # silencio en vez de atribucion.
        emitted = (pkg / "dist" / "index.d.ts").read_text()
        check("conserva la firma de la funcion exportada",
              True, "add(a: number, b: number): number" in emitted)

        # Caso 6 — NO escribe fuera de dist/. El primer intento real filtro dos
        # `.d.ts` dentro de `bin/` del paquete por una violacion de rootDir:
        # la emision se derrama al arbol de fuente y ensucia el repositorio.
        strays = [p for p in pkg.rglob("*.d.ts") if "dist" not in p.parts]
        check("no derrama declaraciones fuera de dist/", [], strays)

        # Caso 7 — el paquete que entra por la RAIZ tambien emite a dist/.
        raiz = make_package(root, "sin-src", "")
        mod.emit_package(raiz)
        check("el paquete con entrada en la raiz emite igual",
              True, (raiz / "dist" / "index.d.ts").is_file())

        # Caso 8 — repointing: el `exports` gana sobre el `types` de raiz bajo
        # `moduleResolution: bundler`, asi que reescribir solo la clave de
        # raiz dejaria el cambio INERTE. Medido: los 42 declaran su exports
        # como CADENA, sin condiciones.
        mod.repoint_manifest(pkg)
        manifest = json.loads((pkg / "package.json").read_text())
        entry = manifest["exports"]["."]
        check("el exports pasa a condiciones, no sigue siendo cadena",
              True, isinstance(entry, dict))
        check("y su condicion types apunta a la declaracion",
              "./dist/index.d.ts", entry.get("types"))
        check("mientras default conserva la fuente, que es el respaldo",
              "./src/index.ts", entry.get("default"))
        check("el types de raiz tambien, para el resolutor que no lee exports",
              "./dist/index.d.ts", manifest.get("types"))

        # Caso 8-bis — EL QUE DE VERDAD DISCRIMINA. Repuntar SOLO la raiz deja
        # el cambio inerte: los consumidores entran por subpath. Medido sobre
        # `storage`, la primera version de este mecanismo repunto la raiz, el
        # typecheck del consumidor dio 2821/103 IDENTICO al de antes, y la
        # anulacion lo destapo. Sin este caso el test lo habria aprobado.
        subpath = manifest["exports"]["./helper.js"]
        check("el subpath literal tambien pasa a condiciones",
              True, isinstance(subpath, dict))
        check("y su types apunta a la declaracion del subpath",
              "./dist/helper.d.ts", subpath.get("types") if isinstance(subpath, dict) else None)

        # Caso 8-ter — el COMODIN. `"./*.js": "./src/*.ts"` es la entrada que
        # cubre los 240 imports reales; dejarla en fuente hace inertes las
        # otras dos por si sola.
        wildcard = manifest["exports"]["./*.js"]
        check("el comodin conserva su sustitucion en la declaracion",
              "./dist/*.d.ts", wildcard.get("types") if isinstance(wildcard, dict) else None)

        # Caso 9 — idempotente: repuntar dos veces no anida ni pierde el
        # respaldo a la fuente.
        mod.repoint_manifest(pkg)
        again = json.loads((pkg / "package.json").read_text())["exports"]["."]
        check("repuntar dos veces no cambia el resultado", entry, again)


    # --- el escape de rootDir: refusa en vez de derramar -------------------
    #
    # Caso que DISCRIMINA. El fixture original nunca sale de su directorio,
    # asi que su asercion «no derrama» no podia fallar — sub-patron D con
    # este propio control como sujeto, la segunda vez en este mecanismo.
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        pkg = make_escaping_package(root, "escapa")
        result = mod.emit_package(pkg)
        check("un import que escapa NO EMITE", False, result.emitted)
        check("y su veredicto nombra el escape", True,
              "escapa" in result.verdict() and "rootDir" in result.verdict())
        check("nombra el archivo que se escapa", True, "shared.ts" in result.output)
        derrame = [str(f.relative_to(root)) for f in root.rglob("*.d.ts")
                   if "dist" not in f.parts]
        check("y NO deja una declaracion fuera de dist/", [], derrame)

    # --- el gate por paquete: mide sin mutar -------------------------------
    #
    # `EmitResult.errors` ya ES el conteo por paquete; lo que faltaba era una
    # superficie que lo publique SIN emitir ni tocar el manifiesto. Sin ella,
    # repuntar los 42 saca los errores del gate del consumidor y no los deja
    # en ningun sitio — que es lavanderia, no arreglo.
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        pkg = make_package(root, "medido", "src")
        antes = (pkg / "package.json").read_text(encoding="utf8")
        result = mod.check_package(pkg)
        check("check_package cuenta el error del paquete", True, result.errors > 0)
        check("NO escribe dist/", False, (pkg / "dist").exists())
        check("NO toca el manifiesto", antes,
              (pkg / "package.json").read_text(encoding="utf8"))
        sobrantes = [f.name for f in pkg.glob("tsconfig*.json")]
        check("retira su proyecto temporal", [], sobrantes)

    print(f"\ntest_emit_declarations: {ok_count} ok, {fail_count} falla")
    return 1 if fail_count else 0


if __name__ == "__main__":
    sys.exit(main())
