#!/usr/bin/env python3
"""Un paquete se entra por su ``exports``, nunca por el ``src/`` del vecino.

El mecanismo que de verdad controla el acoplamiento entre paquetes hermanos no
es que cada dominio tenga su propio ``package.json``: es la regla de
encapsulación —**nadie importa el ``src/`` ajeno, sólo la superficie
declarada**—. Medido en la referencia (``ccb``) y registrado en
``kaupamex-docs: …/analisis-reparto-de-paquetes-en-ccnmt.rst``.

Declarar ``exports`` y no aplicarlo es peor que no declararlo: describe una
frontera que ningún import respeta y ningún error señala, así que quien lea el
manifiesto concluirá que el acoplamiento está gobernado. Ése es el defecto que
:ref:`h-docs-1075` mide — 7 cruces por ruta relativa, 0 imports por nombre de
paquete, y el nombre ni siquiera resolvería.

Las tres clases, y por qué se separan
--------------------------------------

Un especificador relativo cae en una de tres, y **colapsarlas obliga a decidir
dos cosas distintas a la vez**:

``interno``
    Se queda dentro del propio paquete. Es la conducta normal.

``cruza-paquete``
    Aterriza dentro de OTRO paquete de la misma raíz, saltándose su ``exports``.
    Es el defecto que este gate existe para ver.

``sale-de-la-raiz``
    Aterriza fuera de la raíz de paquetes, en un directorio que **no declara
    superficie**. No es el mismo defecto: no hay frontera que saltarse, y su
    veredicto —¿ese directorio se vuelve paquete, o se acepta como raíz
    compartida?— es una decisión de alcance, no un check.

Lo que este gate NO decide
---------------------------

**Si el ``exports`` declarado es el correcto.** Mide que nadie lo rodee, no que
la superficie esté bien elegida. Un paquete que exporte su árbol entero pasa
este gate y no ha encapsulado nada.

**Si el nombre resuelve.** Un import por nombre se clasifica ``no-relativo`` y
sale del alcance aunque el módulo no exista: eso lo dice el empaquetador, no un
patrón sintáctico.

*Métrica:* especificadores de import —estáticos y dinámicos— en los archivos de
código de cada paquete de la raíz, resueltos contra el **directorio** del
archivo que los escribe y comparados con el paquete al que pertenece.
*Ciega a:* un especificador compuesto en tiempo de ejecución
(``import(base + name)``), uno dentro de un comentario de bloque ``/* … */`` —el
de línea sí se descarta—, y una ruta **absoluta** que aterrice en otro paquete.
Y ciega al sentido inverso: mide quién entra, no quién es entrado.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from dataclasses import dataclass, field

#: Extensiones que se miden. Un manifiesto o un `.json` no declara imports.
CODE_SUFFIXES: tuple[str, ...] = (".ts", ".tsx", ".mts", ".js", ".mjs", ".jsx")

#: Directorios que no se recorren: no son fuente del paquete.
SKIP_DIRS: frozenset[str] = frozenset({"node_modules", ".git", "dist", "build", "__pycache__"})

#: El manifiesto que declara a un directorio como paquete.
MANIFEST = "package.json"

#: ``from '…'`` (comillas simples o dobles) y ``import('…')`` dinámico.
SPECIFIER = re.compile(r"""(?:from|import)\s*\(?\s*['"]([^'"]+)['"]""")

#: Comentario de línea — se descarta antes de buscar especificadores.
LINE_COMMENT = re.compile(r"^\s*//")


class PackageRootError(RuntimeError):
    """La raíz que se pidió medir no contiene ningún paquete."""


@dataclass(frozen=True)
class Crossing:
    """Un especificador que sale del paquete que lo escribe."""

    path: pathlib.Path
    line: int
    specifier: str
    origin: str
    #: El paquete de destino, o ``None`` cuando sale de la raíz.
    target: str | None


@dataclass
class Report:
    """El resultado de un barrido, con su denominador."""

    crossings: list[Crossing] = field(default_factory=list)
    escapes: list[Crossing] = field(default_factory=list)
    files_measured: int = 0
    specifiers_seen: int = 0
    packages: tuple[str, ...] = ()


def packages(root: pathlib.Path) -> dict[str, pathlib.Path]:
    """Los paquetes de la raíz: cada hijo directo que declara su manifiesto.

    Rehúsa si no hay ninguno — un cero ahí no distinguiría «esta raíz no tiene
    cruces» de «esta raíz no es una raíz de paquetes».
    """
    root = pathlib.Path(root).resolve()
    found = {
        child.name: child
        for child in sorted(root.iterdir())
        if child.is_dir() and (child / MANIFEST).is_file()
    } if root.is_dir() else {}
    if not found:
        raise PackageRootError(
            f"{root} no contiene ningún paquete (ningún hijo con {MANIFEST}). "
            "NO se emite un conteo: un 0 aquí sería un verde falso."
        )
    return found


def exports_of(package_dir: pathlib.Path) -> dict[str, str]:
    """La superficie declarada por el manifiesto, o vacía si no declara."""
    try:
        manifest = json.loads((package_dir / MANIFEST).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    declared = manifest.get("exports")
    return declared if isinstance(declared, dict) else {}


def package_of(path: pathlib.Path, root: pathlib.Path) -> str | None:
    """A qué paquete pertenece un archivo — por quién lo contiene, no por altura.

    Devuelve ``None`` cuando el archivo cae fuera de la raíz de paquetes.
    """
    root = pathlib.Path(root).resolve()
    try:
        relative = pathlib.Path(path).resolve().relative_to(root)
    except ValueError:
        return None
    if not relative.parts:
        return None
    name = relative.parts[0]
    return name if (root / name / MANIFEST).is_file() else None


def specifiers(text: str) -> list[tuple[int, str]]:
    """Los especificadores del archivo, con su número de línea.

    El comentario de línea se descarta: un import comentado no acopla nada, y
    contarlo inflaría el denominador con algo que el empaquetador nunca ve.
    """
    found: list[tuple[int, str]] = []
    for number, line in enumerate(text.splitlines(), start=1):
        if LINE_COMMENT.match(line):
            continue
        found.extend((number, match.group(1)) for match in SPECIFIER.finditer(line))
    return found


def classify(path: pathlib.Path, specifier: str, root: pathlib.Path) -> str:
    """``interno`` · ``cruza-paquete`` · ``sale-de-la-raiz`` · ``no-relativo``.

    El especificador se resuelve contra el **directorio** del archivo que lo
    escribe: la misma cadena cruza o no según desde dónde se escriba, así que
    compararla como texto mediría el significante y concluiría sobre el destino.
    """
    if not specifier.startswith("."):
        return "no-relativo"
    root = pathlib.Path(root).resolve()
    path = pathlib.Path(path).resolve()
    origin = package_of(path, root)
    target = package_of((path.parent / specifier).resolve(), root)
    if target is None:
        return "sale-de-la-raiz"
    return "interno" if target == origin else "cruza-paquete"


def code_files(package_dir: pathlib.Path) -> list[pathlib.Path]:
    """Los archivos de código del paquete, sin bajar a los directorios saltados."""
    found: list[pathlib.Path] = []
    for child in sorted(package_dir.rglob("*")):
        if not child.is_file() or child.suffix not in CODE_SUFFIXES:
            continue
        if SKIP_DIRS.intersection(child.relative_to(package_dir).parts):
            continue
        found.append(child)
    return found


def scan(root: pathlib.Path) -> Report:
    """Barre la raíz y reparte cada especificador relativo en su clase."""
    root = pathlib.Path(root).resolve()
    found = packages(root)
    report = Report(packages=tuple(found))
    for name, package_dir in found.items():
        for path in code_files(package_dir):
            report.files_measured += 1
            text = path.read_text(encoding="utf-8", errors="replace")
            for line, specifier in specifiers(text):
                report.specifiers_seen += 1
                verdict = classify(path, specifier, root)
                if verdict not in ("cruza-paquete", "sale-de-la-raiz"):
                    continue
                target = package_of((path.parent / specifier).resolve(), root)
                crossing = Crossing(path, line, specifier, name, target)
                bucket = report.crossings if verdict == "cruza-paquete" else report.escapes
                bucket.append(crossing)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("root", help="la raíz de paquetes a medir")
    parser.add_argument("--quiet", action="store_true", help="sólo el conteo")
    parser.add_argument("--strict", action="store_true", help="exit 1 si hay cruces")
    parser.add_argument(
        "--escapes",
        action="store_true",
        help="listar también las salidas de la raíz (clase distinta; ver #134)",
    )
    args = parser.parse_args(argv)

    try:
        report = scan(pathlib.Path(args.root))
    except PackageRootError as error:
        print(f"ERROR — {error}", file=sys.stderr)
        return 2

    if not args.quiet:
        for crossing in report.crossings:
            print(
                f"  {crossing.path}:{crossing.line} — {crossing.origin} entra a "
                f"{crossing.target} por '{crossing.specifier}'"
            )
        if args.escapes:
            for escape in report.escapes:
                print(
                    f"  [sale-de-la-raiz] {escape.path}:{escape.line} — "
                    f"'{escape.specifier}'"
                )

    print(
        f"check-package-boundary: {len(report.crossings)} cruce(s) de paquete "
        f"por ruta relativa (alcance medido: {report.specifiers_seen} "
        f"especificador(es) en {report.files_measured} archivo(s) de "
        f"{len(report.packages)} paquete(s); {len(report.escapes)} salida(s) "
        f"de la raíz, otra clase)"
    )
    return 1 if (args.strict and report.crossings) else 0


if __name__ == "__main__":
    sys.exit(main())
