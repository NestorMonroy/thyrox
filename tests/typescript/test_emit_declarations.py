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


def write_types_stub(root):
    """El `@types/bun` que `COMPILER_OPTIONS` declara, resoluble desde el fixture.

    Sin el, tsc emite **TS2688** —«Cannot find type definition file for 'bun'»—
    y no publica NINGUN diagnostico semantico del paquete. Medido: el control
    `check_package cuenta el error del paquete` pasaba con `errors == 1`, y ese
    1 era el TS2688, no el `export const broken: string = 1` que el fixture
    escribe para provocarlo. Sub-patron D con esta propia suite de sujeto: el
    verde no distinguia «cuenta el error del paquete» de «cuenta un error de
    configuracion del compilador».

    El stub va en la RAIZ del arbol sintetico porque tsc busca `node_modules/
    @types/<x>` subiendo desde el directorio del proyecto — igual que en el
    arbol real, donde lo resuelve el `node_modules` de la raiz del workspace.

    Es lo mismo que ya habia mordido a `escaping_files`, que leyo las tres
    lineas de ese error como si fueran rutas de archivo.
    """
    stub = root / "node_modules" / "@types" / "bun"
    stub.mkdir(parents=True, exist_ok=True)
    (stub / "package.json").write_text(
        json.dumps({"name": "@types/bun", "version": "1.0.0",
                    "types": "./index.d.ts"}) + "\n", encoding="utf8")
    (stub / "index.d.ts").write_text("export {}\n", encoding="utf8")
    return stub


def make_package(root, name, main_dir):
    """Un paquete sintetico con su manifiesto y una fuente con UN defecto.

    `main_dir` vacio pone la entrada en la raiz del paquete — los dos repartos
    que el arbol real tiene (32 en `src`, 10 en raiz).
    """
    write_types_stub(root)
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
    write_types_stub(root)
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


def make_consumer_with_sibling(root, name, sibling, link="local"):
    """Un consumidor con UN error propio que importa un hermano con DOS.

    `link` elige donde aterriza el enlace del hermano, y no es cosmetico: 26 de
    los 43 paquetes del arbol real llevan `node_modules/@thyrox/` propio y 17
    resuelven por la raiz del workspace. tsc reporta la ruta relativa a su cwd,
    asi que el primer caso sale como `node_modules/@probe/x/src/index.ts` y el
    segundo como `../node_modules/@probe/x/src/index.ts` — con `..` delante.

    Un clasificador por PREFIJO de ruta lee el segundo como propio, y ese es el
    defecto que este fixture existe para poder destapar. El primer reparto que
    se midio sobre `storage` uso ese prefijo; acerto porque storage tiene enlace
    propio, y habria mentido sobre los 17 que no.
    """
    def write_package(directory, pkg_name, body):
        src = directory / "src"
        src.mkdir(parents=True, exist_ok=True)
        (directory / "package.json").write_text(json.dumps({
            "name": pkg_name, "version": "0.1.0", "private": True,
            "main": "./src/index.ts", "types": "./src/index.ts",
            "exports": {".": "./src/index.ts"},
        }) + "\n", encoding="utf8")
        (src / "index.ts").write_text(body, encoding="utf8")

    write_types_stub(root)
    write_package(root / sibling, f"@probe/{sibling}",
                  "export const first: string = 1\n"
                  "export const second: number = 'dos'\n"
                  "export const helps = (n: number): number => n + 1\n")
    consumer = root / name
    write_package(consumer, f"@probe/{name}",
                  f"import {{ helps }} from '@probe/{sibling}'\n"
                  "export const mine: string = 1\n"
                  "export const use = (n: number): number => helps(n)\n")

    enlace = (consumer if link == "local" else root) / "node_modules" / "@probe"
    enlace.mkdir(parents=True, exist_ok=True)
    (enlace / sibling).symlink_to(root / sibling, target_is_directory=True)
    return consumer


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
        # `node_modules` queda fuera del barrido: el `@types/bun` del fixture es
        # un `.d.ts` que el propio control escribe, no un derrame de la emision.
        # Contarlo confundiria el instrumento con su sujeto.
        derrame = [str(f.relative_to(root)) for f in root.rglob("*.d.ts")
                   if "dist" not in f.parts and "node_modules" not in f.parts]
        check("y NO deja una declaracion fuera de dist/", [], derrame)

    # --- la declaracion CONSERVA la ruta relativa al rootDir ---------------
    #
    # EL CASO QUE EL BARRIDO DESTAPO, y el que el fixture anterior no podia:
    # sus paquetes sinteticos tienen la entrada en la raiz de `src`, asi que
    # aplanar el directorio da el mismo resultado que conservarlo. Medido sobre
    # el arbol real tras repuntar los 37: `repl` declara `./screens/*.js` ->
    # `./src/screens/*.tsx` y su declaracion aterrizo como `./dist/*.d.ts`,
    # cuando el archivo real esta en `dist/src/screens/`. No resuelve, tsc cae
    # a la condicion `default` —la fuente— y el repunte queda INERTE: el
    # typecheck del consumidor bajo de 2821 a 2656, un 6 %.
    check("con rootDir src, la ruta relativa es el nombre solo",
          "./dist/a.d.ts", mod.declaration_for("./src/a.ts", "src"))
    check("con rootDir de paquete, conserva el directorio",
          "./dist/src/screens/x.d.ts",
          mod.declaration_for("./src/screens/x.tsx", "."))
    check("y conserva el comodin dentro del directorio",
          "./dist/src/screens/*.d.ts",
          mod.declaration_for("./src/screens/*.tsx", "."))

    # --- el manifiesto REPUNTADO no se lee como fuente ---------------------
    #
    # Sin esto, `_project_shape` de un paquete ya repuntado mete `dist/` en su
    # programa: el paquete compilaria sus propias declaraciones y su `rootDir`
    # subiria de `src` a la raiz, moviendo toda su emision. Medido: `storage`
    # daba `src` antes del repunte y `.` despues, sin que su codigo cambiara.
    repuntado = {"types": "./dist/index.d.ts",
                 "exports": {".": {"types": "./dist/index.d.ts",
                                   "default": "./src/index.ts"}}}
    check("los destinos de un manifiesto repuntado son solo la fuente",
          ["./src/index.ts"], mod.export_targets(repuntado))

    # --- el escape DENTRO del paquete se amplia, no se rehusa --------------
    #
    # EL PAR QUE DISCRIMINA. Un escape fuera del paquete produce una ruta de
    # salida con `..` y su `.d.ts` aterriza junto a la fuente ajena: ese es el
    # defecto. Uno que cae dentro del propio paquete no lo produce — subir el
    # `rootDir` a la raiz lo cubre y la emision sigue entera en `dist/`.
    #
    # Medido en el barrido de los 42: de los 6 que rehusaban, 5 escapan a
    # `src/paths`, `src/store`, `src/task`, `src/coordination` o
    # `src/workbench`, y solo `permission` escapaba a su propio
    # `internal/lazySchema.ts`. Tratarlos igual le costaba su declaracion.
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        write_types_stub(root)
        pkg = root / "interno"
        (pkg / "src").mkdir(parents=True)
        (pkg / "internal").mkdir(parents=True)
        (pkg / "package.json").write_text(json.dumps({
            "name": "@probe/interno", "version": "0.1.0", "private": True,
            "main": "./src/index.ts", "types": "./src/index.ts",
            "exports": {".": "./src/index.ts"},
        }) + "\n", encoding="utf8")
        (pkg / "internal" / "helper.ts").write_text(
            "export const helps = (n: number): number => n + 1\n", encoding="utf8")
        (pkg / "src" / "index.ts").write_text(
            "import { helps } from '../internal/helper.ts'\n"
            "export const use = (n: number): number => helps(n)\n", encoding="utf8")
        resultado = mod.emit_package(pkg)
        check("un escape DENTRO del paquete emite igual", True, resultado.emitted)
        fuera = [str(p.relative_to(pkg)) for p in pkg.rglob("*.d.ts")
                 if "dist" not in p.parts and "node_modules" not in p.parts]
        check("y su declaracion no sale de dist/", [], fuera)

    # --- y el repunte apunta a la declaracion que REALMENTE se escribio ----
    #
    # EL DEFECTO QUE ESTE PAR CIERRA. `emit_package` ensancha el `rootDir` a
    # `.` cuando todos los escapes caen dentro del paquete, y tsc escribe en
    # `dist/src/**`. `repoint_manifest` recomputaba la forma por su cuenta,
    # obtenia `src` y escribia `./dist/*.d.ts`: un `types` que apunta al
    # vacio, tsc cae al `default` —que es fuente— y el repunte es INERTE.
    #
    # Medido en el arbol real antes de cerrarlo: `permission` aportaba 68 de
    # los 974 errores del consumidor con su `exports` ya repuntado, porque
    # `dist/src/components/FallbackPermissionRequest.d.ts` existe y
    # `dist/components/FallbackPermissionRequest.d.ts` no.
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        write_types_stub(root)
        pkg = root / "interno"
        (pkg / "src").mkdir(parents=True)
        (pkg / "internal").mkdir(parents=True)
        (pkg / "package.json").write_text(json.dumps({
            "name": "@probe/interno", "version": "0.1.0", "private": True,
            "main": "./src/index.ts", "types": "./src/index.ts",
            "exports": {".": "./src/index.ts"},
        }) + "\n", encoding="utf8")
        (pkg / "internal" / "helper.ts").write_text(
            "export const helps = (n: number): number => n + 1\n", encoding="utf8")
        (pkg / "src" / "index.ts").write_text(
            "import { helps } from '../internal/helper.ts'\n"
            "export const use = (n: number): number => helps(n)\n", encoding="utf8")
        mod.emit_package(pkg)
        mod.repoint_manifest(pkg)
        manifest = json.loads((pkg / "package.json").read_text(encoding="utf8"))
        destinos = [v["types"] for v in manifest["exports"].values()
                    if isinstance(v, dict)]
        ausentes = [d for d in destinos if not (pkg / d.lstrip("./")).exists()]
        check("el repunte tras ensanchar apunta a un archivo que existe",
              [], ausentes)

    # --- el comodin de raiz declara TODO el paquete como superficie --------
    #
    # `config` declara `"./*": "./*.ts"`. Su directorio es `.`, y la rama de
    # colapso lo filtraba con `d != "."`, asi que el comodin no aportaba nada
    # al `include`: quedaba en los directorios NOMBRADOS y `plugin/**` no
    # estaba entre ellos. Cinco archivos de `plugin/` no recibian `.d.ts`.
    #
    # Y la cascada es peor que los cinco: un subpath sin declaracion cae al
    # `default`, que es fuente; un import RELATIVO desde ese `.ts` resuelve
    # `.ts` antes que `.d.ts` y arrastra a sus vecinos. De los 22 archivos de
    # `plugin/` que el consumidor compilaba, 17 SI tenian declaracion.
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        pkg = root / "comodin"
        pkg.mkdir(parents=True)
        (pkg / "package.json").write_text(json.dumps({
            "name": "@probe/comodin", "version": "0.1.0", "private": True,
            "exports": {"./*": "./*.ts"},
        }) + "\n", encoding="utf8")
        check("un comodin de raiz declara el paquete entero",
              (".", ["**/*"]), mod._project_shape(pkg))

    # --- el repunte REHUSA cuando su destino no existe ---------------------
    #
    # El gate que habria atajado los dos defectos de arriba el dia que se
    # introdujeron. Sin el, `repoint_manifest` devuelve True habiendo escrito
    # un `types` al vacio, y el unico sintoma es un conteo del consumidor que
    # no baja lo que deberia — a cuatro pasos de la causa.
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        pkg = root / "sindist"
        (pkg / "src").mkdir(parents=True)
        (pkg / "package.json").write_text(json.dumps({
            "name": "@probe/sindist", "version": "0.1.0", "private": True,
            "exports": {".": "./src/index.ts"},
        }) + "\n", encoding="utf8")
        (pkg / "src" / "index.ts").write_text("export const x = 1\n", encoding="utf8")
        antes = (pkg / "package.json").read_text(encoding="utf8")
        check("sin dist/ el repunte rehusa", False, mod.repoint_manifest(pkg))
        check("y NO toca el manifiesto", antes,
              (pkg / "package.json").read_text(encoding="utf8"))

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


    # --- la atribucion: el conteo del paquete NO es el de su cierre ---------
    #
    # EL CASO QUE DISCRIMINA. Medido sobre el arbol real antes de escribirlo:
    # `check_package(storage)` publica 7062 errores y solo 769 (10.9 %) viven en
    # `src/` del propio paquete; 6293 llegan por `node_modules/@thyrox/*`, con
    # `tool-registry` aportando 5262 el solo. El docstring decia «cuenta los
    # errores de UN paquete» — sub-patron A con este mecanismo de sujeto, y un
    # baseline construido sobre esa cifra congelaria 89 % de errores ajenos.
    #
    # Las DOS formas de enlace se ejercitan porque el clasificador tiene que
    # sobrevivir a las dos: por prefijo de ruta, la del workspace miente.
    for forma in ("local", "root"):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            consumidor = make_consumer_with_sibling(root, "consume", "hermano", forma)
            medido = mod.check_package(consumidor)
            check(f"[{forma}] el propio cuenta SOLO el error del paquete",
                  1, medido.own_errors)
            check(f"[{forma}] y el hermano se le atribuye a el",
                  2, medido.sibling_errors)

    print(f"\ntest_emit_declarations: {ok_count} ok, {fail_count} falla")
    return 1 if fail_count else 0


if __name__ == "__main__":
    sys.exit(main())
