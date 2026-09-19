#!/usr/bin/env python3
"""Emitir la declaracion de un paquete hermano, para que su consumidor no
recompile su fuente.

El fenomeno, medido
--------------------

Un typecheck del paquete `cli` publica 2821 errores y **76 % de ellos no son
suyos**: viven en veinte paquetes hermanos. La causa no es el protocolo
`workspace:*` —que es lo que materializa los 37 enlaces de `node_modules`, y
sin el no resolveria nada: los 42 manifiestos declaran `private: true`— sino
lo que cada hermano expone en su `exports`. Los 42 resuelven a `./src/index.ts`
o `./index.ts`, o sea a **fuente**, asi que el compilador del consumidor la
compila entera bajo SUS opciones.

`skipLibCheck: true` no lo evita, y ahi esta la asimetria que el mecanismo
explota: salta los `.d.ts` y no salta los `.ts`. Medido con dos hermanos
sinteticos que llevan el MISMO defecto —uno exponiendo fuente, otro
declaracion—: se publica **un** error de los dos.

Lo que este modulo NO hace, declarado
--------------------------------------

**No arregla ningun error.** Los mueve a donde son atribuibles: cada paquete
responde por su propia compilacion, y el consumidor mide su propio codigo. Sin
un gate por paquete que los siga viendo, esto seria una lavanderia — verde en
el consumidor con el hermano igual de roto. Por eso el veredicto tiene TRES
estados y **nombra el conteo** en vez de tragarse el codigo de salida:

    OK                    emitio y no habia errores
    emitio pese a N       emitio, y N errores siguen vivos en ese paquete
    no emitio             tsc no llego a escribir — ahi si no hay veredicto

**Tampoco fija las opciones del compilador leyendo un `tsconfig.json` del
paquete**: solo 10 de los 42 tienen uno. Las sintetiza, que es la unica forma
que cubre a los 42 por igual.

La declaracion emitida conserva las firmas —`add(a: number, b: number):
number`, no `any`—, asi que el consumidor sigue midiendo su propio uso. Lo que
NO conserva es el comportamiento: describe lo que el compilador infirio de una
fuente que no compila. Confundir las dos cosas es el sub-patron C.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

#: El directorio de salida, relativo a la raiz del paquete. No se versiona: un
#: clon fresco sin el cae al `default` del exports, que sigue siendo la fuente
#: — o sea, la conducta de hoy. Medido con una sonda: sin `dist/`, el
#: compilador resuelve por `default` y publica el mismo error que hoy, no un
#: «cannot find module». Por eso la construccion es una precondicion
#: declarada y no un requisito para que el arbol funcione.
OUTPUT_DIR = "dist"

#: Las opciones con que se emite. Son las de la raiz del arbol, no las del
#: paquete: 32 de los 42 no declaran ninguna, y dejar que cada uno eligiera
#: las suyas haria que la declaracion de un hermano dependiera de su propio
#: rigor en vez del comun.
COMPILER_OPTIONS = {
    "declaration": True,
    "emitDeclarationOnly": True,
    "noEmit": False,
    "skipLibCheck": True,
    "strict": True,
    "module": "esnext",
    "target": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": True,
    "jsx": "react-jsx",
    "types": ["bun"],
    # El hermano se resuelve por `node_modules/@thyrox/<x>`, que es un enlace
    # al paquete. Sin esta bandera tsc sigue el enlace hasta su ruta REAL,
    # dentro del arbol, y trata sus modulos como archivos del PROYECTO: quedan
    # fuera del `rootDir` y su declaracion aterriza junto a la fuente ajena.
    # Con ella el hermano es una DEPENDENCIA — no se emite, no derrama.
    #
    # Medido sobre `storage`: 1863 escapes sin la bandera, 0 con ella. Y NO
    # silencia el escape real: un import relativo que sube por encima del
    # paquete no pasa por ningun enlace, asi que se sigue viendo. Eso es lo
    # que la hace un discriminador y no un silenciador — el control de
    # `make_escaping_package` lo mide, y sigue en rojo si se retira la guarda.
    "preserveSymlinks": True,
    # `noUnusedLocals` y sus hermanos NO viajan: son higiene de fuente y no
    # cambian ni un byte de la declaracion emitida. Incluirlos solo inflaria
    # el conteo que el veredicto publica con errores que no son del contrato.
}

#: El nombre del proyecto sintetico que se escribe y se retira. Lleva el
#: sufijo `.declarations` para no colisionar con el `tsconfig.json` que 10 de
#: los 42 si tienen — sobreescribirlo seria destruir la configuracion del
#: paquete para construir su declaracion, que es justo lo contrario.
PROJECT_FILE = "tsconfig.declarations.json"

_ERROR_LINE = re.compile(r"error TS[0-9]+")


@dataclass
class EmitResult:
    """El veredicto de tres estados, con su conteo."""

    package: str
    emitted: bool
    errors: int
    output: str
    #: Los archivos del programa que quedan FUERA del `rootDir` del paquete.
    #: No es un detalle del error: es el unico estado en que emitir ensucia el
    #: arbol, porque la ruta de salida es `outDir + relativa-a-rootDir` y una
    #: relativa con `..` aterriza fuera de `dist/`.
    escaping: tuple = ()

    def verdict(self) -> str:
        if self.escaping:
            return (f"{self.package}: NO EMITIO — {len(self.escaping)} import(s) "
                    f"salen de su rootDir: {', '.join(self.escaping)}")
        if not self.emitted:
            return f"{self.package}: NO EMITIO — no hay veredicto sobre su declaracion"
        if self.errors == 0:
            return f"{self.package}: OK"
        return f"{self.package}: emitio pese a {self.errors} errores"


def entry_directory(main_entry: str) -> str:
    """El directorio desde el que el paquete entra, derivado de su `main`.

    Se deriva y no se fija porque el arbol tiene los dos repartos: 32 paquetes
    entran por `src/` y 10 por su raiz. Una constante `src` mandaria a esos 10
    a emitir al sitio equivocado, y el consumidor no notaria la diferencia
    —seguiria compilando su fuente— asi que el defecto pasaria en verde.
    """
    return os.path.dirname((main_entry or "./index.ts").lstrip("./")) or ""


def declaration_entry(main_entry: str) -> str:
    """La ruta de la declaracion que corresponde a un `main` dado."""
    stem = os.path.splitext(os.path.basename(main_entry or "index.ts"))[0]
    return f"./{OUTPUT_DIR}/{stem}.d.ts"


def _read_manifest(package_dir: Path) -> dict:
    return json.loads((package_dir / "package.json").read_text(encoding="utf8"))


#: El proyecto sintetico del gate. Nombre distinto del de emision para que un
#: `--check` y una emision concurrentes no se pisen el archivo.
CHECK_FILE = "tsconfig.check.json"


def _write_project(package_dir: Path, filename: str, options: dict, include: list) -> Path:
    project = package_dir / filename
    project.write_text(json.dumps({"compilerOptions": options, "include": include},
                                  indent=2) + "\n", encoding="utf8")
    return project


def _project_shape(package_dir: Path):
    """El `rootDir` y el `include` que le corresponden a un paquete.

    Se extrae de `emit_package` porque el gate necesita EXACTAMENTE el mismo
    programa: si el gate compusiera su propio alcance, mediria otro sujeto y
    su conteo no seria el del paquete que se emite.
    """
    manifest = _read_manifest(package_dir)
    source_dir = entry_directory(manifest.get("main") or manifest.get("types") or "")
    root_dir = source_dir or "."
    include = [f"{source_dir}/**/*" if source_dir else "*.ts"]
    return root_dir, include


def escaping_files(package_dir: Path) -> tuple:
    """Los archivos del programa que quedan FUERA del `rootDir` del paquete.

    Se mide ANTES de emitir, con `--listFilesOnly`, y no leyendo el TS6059 de
    la salida: para cuando ese error se imprime la declaracion ya esta escrita
    junto a la fuente ajena, y limpiarla despues es tratar el sintoma.

    El `include` NO evita el derrame, y ese fue el defecto medido: tsc sigue
    los imports al programa pase lo que pase. Lo que el `include` acota es de
    donde ARRANCA el programa, no hasta donde llega.

    Se descartan los `.d.ts` y todo lo de `node_modules`: son las dependencias
    y los tipos ambientales, que el programa carga por diseño y para los que
    tsc no emite nada.
    """
    package_dir = Path(package_dir)
    root_dir, include = _project_shape(package_dir)
    options = dict(COMPILER_OPTIONS)
    options["noEmit"] = True
    options.pop("declaration", None)
    options.pop("emitDeclarationOnly", None)
    project = _write_project(package_dir, CHECK_FILE, options, include)
    try:
        completed = subprocess.run(
            ["bunx", "tsc", "--listFilesOnly", "-p", CHECK_FILE],
            cwd=package_dir, capture_output=True, text=True, timeout=900)
    except (OSError, subprocess.TimeoutExpired):
        return ()
    finally:
        project.unlink(missing_ok=True)

    anchor = (package_dir / root_dir).resolve()
    escaping = []
    for line in (completed.stdout or "").splitlines():
        path = line.strip()
        if not path or path.endswith(".d.ts") or "node_modules" in path:
            continue
        # `--listFilesOnly` escribe sus DIAGNOSTICOS en el mismo stdout que la
        # lista, asi que una linea no es un archivo por estar ahi. Medido: con
        # `types: ["bun"]` sin resolver, el TS2688 y sus dos lineas de contexto
        # se colaban como tres rutas inventadas, y el paquete limpio quedaba
        # rehusado por «tres imports que escapan» que no existen. El
        # discriminador es el disco: un archivo del programa existe.
        candidate = Path(path)
        if not candidate.is_absolute() or not candidate.is_file():
            continue
        resolved = candidate.resolve()
        if anchor not in resolved.parents and resolved != anchor:
            escaping.append(os.path.relpath(str(resolved), str(package_dir)))
    return tuple(sorted(set(escaping)))


def check_package(package_dir: Path) -> EmitResult:
    """Cuenta los errores de UN paquete sin emitir ni tocar su manifiesto.

    Es el gate que hace que repuntar los 42 no sea lavanderia: sin el, sacar
    los errores del hermano del typecheck del consumidor los deja sin dueño.
    `EmitResult.errors` ya era el conteo por paquete; lo que faltaba era una
    superficie que lo publique.

    NO muta (ERR-066): `noEmit`, sin `outDir`, sin reescribir `package.json`,
    y su proyecto temporal se retira en `finally`.
    """
    package_dir = Path(package_dir)
    _, include = _project_shape(package_dir)
    options = dict(COMPILER_OPTIONS)
    options["noEmit"] = True
    options.pop("declaration", None)
    options.pop("emitDeclarationOnly", None)
    project = _write_project(package_dir, CHECK_FILE, options, include)
    try:
        completed = subprocess.run(
            ["bunx", "tsc", "-p", CHECK_FILE],
            cwd=package_dir, capture_output=True, text=True, timeout=900)
        output = (completed.stdout or "") + (completed.stderr or "")
    except (OSError, subprocess.TimeoutExpired) as exc:
        return EmitResult(package_dir.name, False, 0, f"{type(exc).__name__}: {exc}")
    finally:
        project.unlink(missing_ok=True)
    return EmitResult(package_dir.name, True, len(_ERROR_LINE.findall(output)), output)


def emit_package(package_dir: Path) -> EmitResult:
    """Emite la declaracion de un paquete y devuelve su veredicto.

    El `include` se ancla al MISMO directorio que el `rootDir`. Sin ese
    anclaje, un archivo del paquete que quede fuera de `rootDir` dispara
    TS6059 y su `.d.ts` se escribe **junto a la fuente**: el primer intento
    real derramo dos declaraciones dentro de `bin/` y ensucio el repositorio.
    """
    package_dir = Path(package_dir)
    root_dir, include = _project_shape(package_dir)

    # Preflight: un import que sale del `rootDir` derrama su `.d.ts` FUERA de
    # `dist/`, junto a la fuente ajena. Se rehusa ANTES de escribir nada —
    # leer el TS6059 despues seria tratar el sintoma con el archivo ya puesto.
    escaping = escaping_files(package_dir)
    if escaping:
        detalle = "\n".join(f"  escapa del rootDir: {f}" for f in escaping)
        return EmitResult(package_dir.name, False, 0, detalle, escaping)

    options = dict(COMPILER_OPTIONS)
    options["rootDir"] = root_dir
    options["outDir"] = OUTPUT_DIR
    project = _write_project(package_dir, PROJECT_FILE, options, include)
    try:
        completed = subprocess.run(
            ["bunx", "tsc", "-p", PROJECT_FILE],
            cwd=package_dir, capture_output=True, text=True, timeout=900)
        output = (completed.stdout or "") + (completed.stderr or "")
    except (OSError, subprocess.TimeoutExpired) as exc:
        return EmitResult(package_dir.name, False, 0, f"{type(exc).__name__}: {exc}")
    finally:
        project.unlink(missing_ok=True)

    emitted = (package_dir / OUTPUT_DIR).is_dir() and any(
        (package_dir / OUTPUT_DIR).rglob("*.d.ts"))
    return EmitResult(package_dir.name, emitted, len(_ERROR_LINE.findall(output)), output)


def _declaration_for(source_entry: str) -> str:
    """La declaracion que corresponde a una entrada de fuente cualquiera.

    Conserva el comodin: `./src/*.ts` da `./dist/*.d.ts`, no `./dist/.d.ts`.
    Esa sustitucion es lo que hace que UNA entrada cubra los 240 imports por
    subpath que los consumidores de `storage` emiten.
    """
    stem = source_entry.rsplit("/", 1)[-1]
    stem = stem[: -len(".ts")] if stem.endswith(".ts") else os.path.splitext(stem)[0]
    directory = source_entry.rsplit("/", 1)[0] if "/" in source_entry else "."
    depth = directory.strip("./")
    prefix = f"./{OUTPUT_DIR}" if not depth or depth == "." else f"./{OUTPUT_DIR}"
    return f"{prefix}/{stem}.d.ts"


def repoint_manifest(package_dir: Path) -> bool:
    """Apunta CADA entrada de `exports` a su declaracion, conservando la fuente.

    Tres cosas que la primera version hizo mal, y las tres las destapo la
    anulacion en vez de una relectura:

    1. **El `exports` gana sobre el `types` de raiz** bajo `moduleResolution:
       bundler`, asi que reescribir solo la clave de raiz deja el cambio
       inerte.
    2. **Los consumidores no entran por la raiz.** Medido sobre `storage`:
       240 imports por subpath (`/file.js`, `/sessionStorage.js`, …) y CERO
       por `.`. Repuntar solo `exports['.']` no movio ni un error del
       typecheck del consumidor — 2821/103 antes y despues, identico.
    3. **El comodin es la entrada que carga el peso.** `"./*.js":
       "./src/*.ts"` cubre por si sola la mayoria de esos 240; su
       sustitucion tiene que sobrevivir al repunte.

    `default` conserva la fuente en todas: es lo que hace que un clon sin
    `dist/` construido compile como hoy en vez de romperse.
    """
    package_dir = Path(package_dir)
    manifest_path = package_dir / "package.json"
    manifest = _read_manifest(package_dir)
    exports = manifest.get("exports")
    if not isinstance(exports, dict):
        exports = {".": exports or manifest.get("main") or "./index.ts"}

    repointed = {}
    for subpath, entry in exports.items():
        source_entry = entry.get("default") if isinstance(entry, dict) else entry
        if not isinstance(source_entry, str):
            repointed[subpath] = entry
            continue
        repointed[subpath] = {"types": _declaration_for(source_entry),
                              "default": source_entry}
    manifest["exports"] = repointed

    root = repointed.get(".")
    if isinstance(root, dict):
        manifest["types"] = root["types"]
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
    return True


def _packages(root: Path):
    for pattern in ("src/packages/*/package.json", "src/packages/@ant/*/package.json"):
        for manifest in sorted(root.glob(pattern)):
            yield manifest.parent


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if "-h" in argv or "--help" in argv:
        print(__doc__.strip())
        print("\nUso:  emit_declarations [--repoint] [--all] [paquete ...]")
        print("  Sin paquetes exige --all: emitir los 42 recompila el arbol entero")
        print("  y tarda, asi que no puede ser lo que pasa por teclear el nombre")
        print("  del guion sin argumentos.")
        return 0
    desconocidas = [a for a in argv if a.startswith("-") and a not in ("--repoint", "--all")]
    if desconocidas:
        print(f"emit_declarations: bandera no reconocida: {' '.join(desconocidas)}",
              file=sys.stderr)
        print("  NO se emite nada: una bandera mal escrita no debe caer al caso",
              file=sys.stderr)
        print("  por defecto, que recompila el arbol entero.", file=sys.stderr)
        return 2
    if not shutil.which("bunx"):
        print("emit_declarations: falta `bunx` — no se puede emitir.", file=sys.stderr)
        print("  NO se emite un conteo: un cero aqui seria un verde falso.",
              file=sys.stderr)
        return 2

    root = Path(os.environ.get("THYROX_ROOT", Path(__file__).resolve().parents[2]))
    repoint = "--repoint" in argv
    wanted = [a for a in argv if not a.startswith("-")]
    if not wanted and "--all" not in argv:
        print("emit_declarations: nombra el paquete, o pide --all explicitamente.",
              file=sys.stderr)
        print("  Emitir los 42 recompila el arbol entero; que eso sea el caso por",
              file=sys.stderr)
        print("  defecto convierte un tecleo en un trabajo de varios minutos.",
              file=sys.stderr)
        return 2
    targets = [p for p in _packages(root) if not wanted or p.name in wanted]
    if not targets:
        print(f"emit_declarations: ningun paquete coincide con {wanted}", file=sys.stderr)
        return 2

    total_errors = 0
    for package_dir in targets:
        result = emit_package(package_dir)
        total_errors += result.errors
        print(result.verdict())
        if repoint and result.emitted:
            repoint_manifest(package_dir)

    print(f"\nemit_declarations: {len(targets)} paquete(s) medido(s), "
          f"{total_errors} error(es) que siguen vivos en su propio paquete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
