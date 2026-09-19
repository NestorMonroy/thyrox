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
#: Una linea de error de tsc que ademas NOMBRA su archivo. Es un subconjunto
#: estricto de `_ERROR_LINE`: un error de proyecto (TS5083, TS6053) no lleva
#: ruta, asi que no se puede atribuir a ningun paquete y no entra en ningun
#: cubo. La diferencia entre los dos conteos es justo esa poblacion.
_LOCATED_ERROR = re.compile(r"^(?P<file>[^(\n]+)\(\d+,\d+\): error TS[0-9]+", re.M)


#: Errores de CONFIGURACION del compilador: no describen el codigo del paquete
#: sino que el programa no se pudo formar. `TS18003` es «no inputs were found»
#: —el `include` no caso ningun archivo— y `TS2688` es una biblioteca de tipos
#: irresoluble. Los dos dejan el conteo semantico en cero, asi que un paquete
#: que los emita publica «0 errores» sin haber medido nada. Medido: `plan` daba
#: TS18003 por no declarar `main`, y el fixture de la suite daba TS2688 sin su
#: `@types/bun` — los tres controles de `check_package` estaban verdes por ese
#: segundo error, no por el error de tipo que el fixture escribe.
UNMEASURABLE_CODES = ("TS18003", "TS2688")


def unmeasurable_reason(output: str):
    """El codigo de configuracion que impidio medir, o `None` si se midio."""
    for code in UNMEASURABLE_CODES:
        if f"error {code}:" in output:
            return code
    return None


def classify_errors(output: str, package_dir) -> dict:
    """Reparte los errores de tsc en propios, de hermano y escapados.

    El defecto que cierra, medido sobre el arbol real: `check_package(storage)`
    publica **7062** errores y solo **769** (10.9 %) viven en el propio paquete
    — **6293** llegan por `node_modules/@thyrox/*`, con `tool-registry`
    aportando 5262 el solo. Es el mismo defecto estructural que el gate del
    consumidor tiene un nivel mas arriba, y publicarlo bajo el rotulo «los
    errores del paquete» es el sub-patron A de
    `metrica-decide-la-conclusion.md` con este mecanismo de sujeto.

    El discriminador es la RESOLUCION de la ruta, no su prefijo. tsc la reporta
    relativa a su cwd, y el arbol tiene los dos repartos: 26 paquetes llevan
    `node_modules/@thyrox/` propio —cuya ruta sale como `node_modules/...`— y
    17 resuelven por la raiz del workspace, cuya ruta sale como
    `../node_modules/...`, con `..` delante. Un `startswith("node_modules")`
    acierta en los primeros y lee los segundos como PROPIOS.

    Se normaliza sin `resolve()`: resolver seguiria el enlace del hermano hasta
    su ruta real —`<raiz>/<hermano>/src/...`—, que ya no lleva el segmento
    `node_modules` y volveria indistinguible un hermano enlazado de un import
    que escapa del paquete. El segmento es la evidencia; perderlo es perder el
    cubo.

    El tercer cubo, `escaped`, no es adorno: `check_package` no corre el
    preflight de `escaping_files`, asi que un error en `../../paths/docs.ts`
    —la forma que `agent`, `cli` y `bridge` tienen hoy— no es propio ni de
    hermano. Sin el, se sumaria al que no le toca.
    """
    package_dir = os.path.abspath(str(package_dir))
    cubos = {"own": 0, "sibling": 0, "escaped": 0}
    for match in _LOCATED_ERROR.finditer(output):
        crudo = match.group("file").strip()
        if not os.path.isabs(crudo):
            crudo = os.path.join(package_dir, crudo)
        ruta = os.path.normpath(crudo)
        if "node_modules" in ruta.split(os.sep):
            cubos["sibling"] += 1
        elif ruta.startswith(package_dir + os.sep):
            cubos["own"] += 1
        else:
            cubos["escaped"] += 1
    return cubos


@dataclass
class EmitResult:
    """El veredicto de cuatro estados, con su conteo repartido por dueño."""

    package: str
    emitted: bool
    errors: int
    output: str
    #: Los archivos del programa que quedan FUERA del `rootDir` del paquete.
    #: No es un detalle del error: es el unico estado en que emitir ensucia el
    #: arbol, porque la ruta de salida es `outDir + relativa-a-rootDir` y una
    #: relativa con `..` aterriza fuera de `dist/`.
    escaping: tuple = ()
    #: Los errores repartidos por dueño. `errors` es el TOTAL que tsc reporto;
    #: estos tres son la unica cifra atribuible, y la unica sobre la que un
    #: baseline por paquete significa algo.
    own_errors: int = 0
    sibling_errors: int = 0
    escaped_errors: int = 0
    #: `True` cuando el paquete se MIDIO sin emitir (`noEmit`). Sin este eje el
    #: veredicto publica «emitio pese a N errores» sobre una corrida que no
    #: escribio un byte — el significante de una operacion que no ocurrio.
    checked: bool = False

    @property
    def unmeasurable(self):
        """El codigo de configuracion que impidio medir, o `None`.

        Se deriva de la salida en vez de guardarse: la salida es la evidencia y
        un campo aparte podria quedar desincronizado de ella.
        """
        return unmeasurable_reason(self.output)

    def verdict(self) -> str:
        if self.unmeasurable:
            return (f"{self.package}: SIN MEDIR — {self.unmeasurable}, el programa "
                    f"no se formo. Su conteo no distingue «sin errores» de «sin medir»")
        if self.escaping:
            return (f"{self.package}: NO EMITIO — {len(self.escaping)} import(s) "
                    f"salen de su rootDir: {', '.join(self.escaping)}")
        if self.checked:
            return (f"{self.package}: {self.own_errors} propio(s) "
                    f"· {self.sibling_errors} de hermano "
                    f"· {self.escaped_errors} fuera del paquete "
                    f"(total {self.errors})")
        if not self.emitted:
            return f"{self.package}: NO EMITIO — no hay veredicto sobre su declaracion"
        if self.errors == 0:
            return f"{self.package}: OK"
        return (f"{self.package}: emitio pese a {self.errors} errores "
                f"({self.own_errors} propio(s))")


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


def export_targets(manifest: dict):
    """Cada ruta relativa que el manifiesto declara como destino.

    Recorre `main`, `types` y TODOS los valores de `exports` — cadena llana,
    diccionario de condiciones y subpath con comodin. Es la misma poblacion que
    `repoint_manifest` reescribe, y por eso se deriva aqui en vez de mirar solo
    `main`: hay paquetes cuyo unico destino declarado vive en `exports`.
    """
    destinos = []

    def recolectar(valor):
        if isinstance(valor, str):
            destinos.append(valor)
        elif isinstance(valor, dict):
            # De un manifiesto YA repuntado se toma solo `default`: `types`
            # apunta a `dist/`, y meterlo aqui haria que el paquete compilara
            # sus propias declaraciones y le subiria el `rootDir`. Medido:
            # `storage` daba `src` antes del repunte y `.` despues, sin que su
            # codigo cambiara — la emision entera se habria movido.
            if "default" in valor:
                recolectar(valor["default"])
                return
            for clave, anidado in valor.items():
                if clave == "types":
                    continue
                recolectar(anidado)

    for clave in ("main", "types"):
        recolectar(manifest.get(clave))
    recolectar(manifest.get("exports"))
    # `dist/` es SALIDA por definicion, nunca fuente. La clave `types` de raiz
    # de un manifiesto ya repuntado apunta ahi, y sin este filtro el paquete
    # se compilaria a si mismo: `repoint_manifest` dejaria de ser idempotente
    # porque el `rootDir` que deriva cambiaria en la segunda pasada.
    salida = f"{OUTPUT_DIR}/"
    return [d for d in destinos if not d.lstrip("./").startswith(salida)]


def _project_shape(package_dir: Path):
    """El `rootDir` y el `include` que le corresponden a un paquete.

    Se extrae de `emit_package` porque el gate necesita EXACTAMENTE el mismo
    programa: si el gate compusiera su propio alcance, mediria otro sujeto y
    su conteo no seria el del paquete que se emite.

    El directorio de entrada se deriva de TODO lo que el manifiesto declara, no
    solo de `main`. El defecto que eso cierra esta medido: `plan` no declara
    `main` ni `types` —su superficie entera vive en `exports`, apuntando a
    `./src/*.ts`— asi que la version anterior caia al default `./index.ts`,
    componia `include: ["*.ts"]` sobre una raiz sin `.ts` y tsc rehusaba con
    **TS18003**, «No inputs were found». El paquete se publicaba con 1 error
    total y 0 propios: un veredicto que no distingue «no tiene errores» de «no
    se midio».
    """
    manifest = _read_manifest(package_dir)
    directorios = []
    for destino in export_targets(manifest):
        directorio = entry_directory(destino)
        if directorio and directorio not in directorios:
            directorios.append(directorio)
    # Un comodin ANCLADO EN LA RAIZ del paquete —`"./*": "./*.ts"`— declara
    # como superficie todo el paquete, no un directorio. `entry_directory` le
    # da `""` porque su dirname es vacio, asi que la rama de colapso lo
    # filtraba y el `include` quedaba en los directorios NOMBRADOS.
    #
    # Medido en `config`: sus 7 directorios nombrados no incluyen `plugin/**`
    # —solo `plugin/core/**`— y cinco archivos de `plugin/` se quedaban sin
    # `.d.ts`. El consumidor caia a fuente en esos cinco y arrastraba a sus
    # 17 vecinos por import relativo, que resuelve `.ts` antes que `.d.ts`.
    if any("*" in d and not entry_directory(d) for d in export_targets(manifest)):
        return ".", ["**/*"]
    if not directorios:
        return ".", ["*.ts"]
    # El `rootDir` es el ANCESTRO COMUN de los directorios declarados, no el
    # primero ni la raiz del paquete. `storage` declara `src` y `src/testing`:
    # elegir la raiz subiria el `rootDir` un nivel de mas y desplazaria TODA su
    # emision dentro de `dist/`. `headless-sdk` declara `src` y `testing`, que
    # no se anidan, y ahi el ancestro comun si es el paquete.
    raiz = os.path.commonpath(directorios) if len(directorios) > 1 else directorios[0]
    if raiz in ("", "."):
        # Un directorio ANIDADO en otro ya lo cubre el comodin del ancestro; se
        # descarta para no declarar el mismo archivo dos veces. `repl` declara
        # 58 destinos, 57 de ellos bajo `src`: sin este colapso el `include`
        # lista los 58 y describe el mismo programa con 58 veces mas ruido.
        cubiertos = [d for d in directorios
                     if not any(o != d and (d + os.sep).startswith(o + os.sep)
                                for o in directorios)]
        return ".", [f"{d}/**/*" for d in cubiertos]
    # Un directorio que cae DENTRO de la raiz comun ya lo cubre su comodin; se
    # descarta para no declarar el mismo archivo dos veces.
    return raiz, [f"{raiz}/**/*"]


def escaping_files(package_dir: Path, root_dir=None, include=None) -> tuple:
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
    # `root_dir`/`include` se pueden imponer: el reintento con la raiz del
    # paquete ampliada necesita medir EXACTAMENTE el programa que va a emitir,
    # no el que `_project_shape` deriva del manifiesto.
    if root_dir is None or include is None:
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
    """Mide un paquete sin emitir ni tocar su manifiesto, y REPARTE su conteo.

    Es el gate que hace que repuntar los 42 no sea lavanderia: sin el, sacar
    los errores del hermano del typecheck del consumidor los deja sin dueño.

    Su primera version decia que `EmitResult.errors` «ya era el conteo por
    paquete». Era falso, y medido: sobre `storage` publica **7062** y solo
    **769** son del paquete — el resto llega por `node_modules/@thyrox/*`.
    Un baseline construido sobre esa cifra congelaria 89 % de errores ajenos,
    que es el mismo defecto estructural que este mecanismo existe para cerrar,
    un nivel mas abajo. La cifra atribuible es `own_errors`; `errors` sigue
    siendo el total, con su nombre, para que la diferencia se pueda leer.

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
    cubos = classify_errors(output, package_dir)
    return EmitResult(package_dir.name, False, len(_ERROR_LINE.findall(output)), output,
                      own_errors=cubos["own"], sibling_errors=cubos["sibling"],
                      escaped_errors=cubos["escaped"], checked=True)


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
        # Un escape que cae DENTRO del propio paquete no es el defecto que la
        # rehusa existe para atajar. El defecto es una ruta de salida con `..`,
        # y eso solo pasa cuando el archivo esta fuera del paquete: si esta
        # dentro, subir el `rootDir` a la raiz del paquete lo cubre y la
        # emision sigue aterrizando entera en `dist/`.
        #
        # Medido en el barrido de los 42: de los 6 que rehusaban, 5 escapan a
        # `src/paths`, `src/store`, `src/task`, `src/coordination` o
        # `src/workbench` —fuera del paquete, irreparable por aqui— y solo
        # `permission` escapaba a su propio `internal/lazySchema.ts`, que su
        # `exports` no declara. Rehusarlo era tratar las dos formas como una.
        # `escaping_files` devuelve la ruta RELATIVA al paquete, asi que hay
        # que componerla antes de preguntar si cae dentro. Sin eso el `dentro`
        # sale vacio siempre y el reintento no se toma nunca — el arreglo
        # existiria y no dispararia, que es peor que no tenerlo.
        raiz = os.path.realpath(str(package_dir))
        dentro = [f for f in escaping
                  if os.path.normpath(os.path.join(raiz, f)).startswith(raiz + os.sep)]
        if len(dentro) == len(escaping):
            extra = sorted({f.split(os.sep)[0] for f in dentro
                            if os.sep in f})
            root_dir = "."
            include = sorted(set(include) | {f"{d}/**/*" for d in extra if d != "."})
            escaping = escaping_files(package_dir, root_dir, include)
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
    cubos = classify_errors(output, package_dir)
    return EmitResult(package_dir.name, emitted, len(_ERROR_LINE.findall(output)), output,
                      own_errors=cubos["own"], sibling_errors=cubos["sibling"],
                      escaped_errors=cubos["escaped"])


def declaration_for(source_entry: str, root_dir: str = "") -> str:
    """La declaracion que corresponde a una entrada de fuente, dado el rootDir.

    La ruta de salida de tsc es `outDir + relativa-al-rootDir`, asi que la
    declaracion conserva TODO el camino que sobra despues del `rootDir` — no
    solo el nombre del archivo.

    El defecto que cierra, medido sobre el arbol tras repuntar los 37: la
    version anterior aplanaba el directorio. `repl` declara `./screens/*.js`
    apuntando a `./src/screens/*.tsx`, y su declaracion quedo como
    `./dist/*.d.ts` cuando el archivo real esta en `dist/src/screens/`. Esa
    ruta no resuelve, tsc cae a la condicion `default` —la fuente— y el
    repunte queda **inerte**: el typecheck del consumidor bajo de 2821 a 2656,
    un 6 % en vez del 53 % que la atribucion predecia.

    Lo que el fixture no podia destapar: sus paquetes sinteticos tienen la
    entrada en la raiz de `src`, donde aplanar y conservar dan lo mismo. El
    caso que discrimina necesita un directorio **anidado** bajo el rootDir.

    Conserva el comodin: `./src/screens/*.tsx` da `./dist/src/screens/*.d.ts`.
    Esa sustitucion es lo que hace que UNA entrada cubra los 240 imports por
    subpath que los consumidores de `storage` emiten.
    """
    ruta = source_entry.lstrip("./")
    base = ruta[: -len(".ts")] if ruta.endswith(".ts") else os.path.splitext(ruta)[0]
    raiz = (root_dir or "").strip("./")
    if raiz and raiz != "." and (base + "/").startswith(raiz + "/"):
        base = base[len(raiz) + 1:]
    return f"./{OUTPUT_DIR}/{base}.d.ts"


#: Nombre anterior, conservado porque tres llamadas internas lo usan. El
#: publico es `declaration_for`: el guion bajo decia «detalle interno» sobre
#: una funcion que el contrato del repunte necesita poder medir.
_declaration_for = declaration_for


def _declaration_exists(package_dir: Path, candidate: str,
                        source_entry: str = None) -> bool:
    """Si la declaracion que `candidate` nombra existe de verdad en el disco.

    Un `candidate` con comodin no se puede probar con `exists()`: se expande
    y basta con que la expansion encuentre algo. Cero coincidencias es
    ausencia, igual que un archivo concreto que no esta.
    """
    relativa = candidate.lstrip("./")
    if "*" not in relativa:
        return (package_dir / relativa).exists()
    if source_entry is None:
        return any(package_dir.glob(relativa))
    # UNA coincidencia no basta. Un comodin cubre N archivos, y el defecto que
    # se quiere ver es que ALGUNOS no tengan declaracion: con `any()` el
    # primero que exista tapa a los demas y el veredicto no discrimina — el
    # sub-patron D con este gate como sujeto.
    #
    # Medido en `config`: de los 22 archivos de `plugin/` que el consumidor
    # compilaba, 5 no tenian `.d.ts` y 17 si. Un `any()` publicaba verde.
    fuentes = sorted(package_dir.glob(source_entry.lstrip("./")))
    if not fuentes:
        return any(package_dir.glob(relativa))
    for fuente in fuentes:
        comodin = str(fuente.relative_to(package_dir))
        comodin = os.path.splitext(comodin)[0]
        # El comodin del destino ocupa el mismo sitio que el de la fuente: se
        # sustituye por lo que la fuente puso ahi, no por el nombre entero.
        prefijo, _, sufijo = source_entry.lstrip("./").partition("*")
        sufijo = os.path.splitext(sufijo)[0]
        if not comodin.startswith(prefijo):
            continue
        medio = comodin[len(prefijo):]
        if sufijo and medio.endswith(sufijo):
            medio = medio[: -len(sufijo)] if sufijo else medio
        if not (package_dir / relativa.replace("*", medio, 1)).exists():
            return False
    return True


def resolve_declaration(package_dir: Path, source_entry: str, root_dir: str):
    """La declaracion que de verdad se escribio para una entrada de fuente.

    No se DERIVA de la forma del proyecto: se busca en el disco. La forma
    derivada y la que `emit_package` uso pueden diferir —`emit_package`
    ensancha el `rootDir` a `.` cuando todos los escapes caen dentro del
    paquete— y una segunda derivacion no tiene como saberlo.

    Medido en `permission`: su emision aterrizo en `dist/src/**` tras el
    ensanche, y el repunte derivado escribia `./dist/*.d.ts`. El `types`
    apuntaba al vacio, tsc caia al `default` —que es fuente— y el paquete
    aportaba 68 errores al consumidor con su `exports` ya repuntado.

    Devuelve `None` cuando ninguna candidata existe: eso es una ausencia
    REAL, y quien llama tiene que rehusar en vez de escribir un puntero al
    vacio.
    """
    package_dir = Path(package_dir)
    candidatas = []
    for raiz in (root_dir, "."):
        candidata = declaration_for(source_entry, raiz)
        if candidata not in candidatas:
            candidatas.append(candidata)
    for candidata in candidatas:
        if _declaration_exists(package_dir, candidata, source_entry):
            return candidata
    return None


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
    # El MISMO `rootDir` con que se emitio: la ruta de salida es
    # `outDir + relativa-al-rootDir`, asi que repuntar con otro apunta a un
    # archivo que no existe y el `exports` cae a `default` sin avisar.
    root_dir, _ = _project_shape(package_dir)
    exports = manifest.get("exports")
    if not isinstance(exports, dict):
        exports = {".": exports or manifest.get("main") or "./index.ts"}

    repointed = {}
    ausentes = []
    for subpath, entry in exports.items():
        source_entry = entry.get("default") if isinstance(entry, dict) else entry
        if not isinstance(source_entry, str):
            repointed[subpath] = entry
            continue
        declaracion = resolve_declaration(package_dir, source_entry, root_dir)
        if declaracion is None:
            ausentes.append((subpath, declaration_for(source_entry, root_dir)))
            continue
        repointed[subpath] = {"types": declaracion, "default": source_entry}

    # Un `types` que apunta al vacio no falla: tsc cae al `default`, que es
    # fuente, y el repunte queda INERTE sin emitir un byte. El unico sintoma
    # es un conteo del consumidor que no baja lo que deberia, a cuatro pasos
    # de la causa. Se rehusa entero y se nombra cada destino ausente.
    if ausentes:
        print(f"{package_dir.name}: repunte INERTE — "
              f"{len(ausentes)} destino(s) de types no existen:", file=sys.stderr)
        for subpath, candidata in ausentes:
            print(f"  {subpath} -> {candidata}", file=sys.stderr)
        print("  Corre la emision antes del repunte: "
              "emit_declarations <paquete>", file=sys.stderr)
        return False

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
