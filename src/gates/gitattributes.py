#!/usr/bin/env python3
"""Los clones declaran el mismo contrato de texto en su ``.gitattributes``.

``.gitattributes`` decide **por archivo** si git normaliza finales de línea y
si trata el contenido como texto o como binario. Cuando un repo no lo declara,
la decisión la toma ``core.autocrlf`` de ``.git/config``, que **no se versiona**
— así que el mismo archivo puede normalizarse en un clon y no en el de al lado,
y la diferencia sale como un diff entero sin cambios reales.

Las tres directivas del contrato:

``* text=auto``
    git husmea el contenido y normaliza a LF en el índice lo que sea texto. Lo
    que husmea como binario queda intacto — y en un merge avisa
    ``Cannot merge binary files`` y deja conflicto en vez de intercalar líneas.

``*.sh text eol=lf`` · ``*.py text eol=lf``
    ``eol=lf`` fuerza LF **también en el working tree**, no sólo en el índice.
    Un script con CRLF no arranca: el kernel lee ``#!/bin/bash\\r`` como parte
    del intérprete.

Procedencia
-----------
Adaptación de ``kaupamex-docs: .claude/scripts/gates/check_gitattributes.py``,
portado a THYROX en P5 del orden de mudanza. El mecanismo es el mismo; lo que
cambia es que las raíces llegan por ``paths.reach`` en vez de derivarse aquí, y
que los identificadores van en inglés (la convención de este repo).

Uso::

    python3 src/gates/gitattributes.py            # reporte
    python3 src/gates/gitattributes.py --quiet    # sólo el conteo
    python3 src/gates/gitattributes.py --strict   # exit 1 si diverge

El alcance se imprime junto al conteo: un «0 divergencias» sobre cero repos
medidos y uno sobre cinco publican la misma cifra y no dicen lo mismo.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from paths import reach  # noqa: E402  (la ruta se compone arriba, a propósito)

#: El contrato. Es una especificación de mecanismo, no un registro del
#: proyecto: cambia cuando cambia lo que git debe hacer con los archivos, no
#: cuando el árbol crece.
CANONICAL_DIRECTIVES: tuple[str, ...] = (
    "* text=auto",
    "*.sh text eol=lf",
    "*.py text eol=lf",
)


def read_directives(path: Path) -> list[tuple[str, bool]]:
    """Líneas efectivas de un ``.gitattributes``, como ``(directiva, declarada)``.

    ``declarada`` es True si la línea viene **precedida** por una de comentario.
    Una directiva **fuera del contrato común** sólo se admite así: el comentario
    es donde su autor dice por qué ese repo necesita algo que los otros no. Sin
    esa exigencia el gate tendría que llevar por dentro una lista de excepciones
    por repo — un registro del proyecto dentro de un mecanismo.

    **El comentario va en su PROPIA línea, no al final de la directiva.** git
    no admite comentarios en línea: parsea el ``#`` como un nombre de atributo
    y **descarta la línea entera**. Medido sobre el ``.gitattributes`` de
    ``kaupamex-docs``::

        $ git check-attr merge -- .claude/agent-results/agent_store.sqlite3
        # is not a valid attribute name: .gitattributes:11
        .claude/agent-results/agent_store.sqlite3: merge: unspecified

    La primera versión del gate original exigía el comentario al final, es
    decir, exigía una sintaxis que git rechaza: habría dado por «declarada» una
    línea inerte. Lo destapó el aviso del propio git al commitear, no una
    relectura.

    Devuelve una lista, no un conjunto — el duplicado es uno de los defectos
    que el gate busca, y un conjunto lo borraría antes de verlo.
    """
    effective: list[tuple[str, bool]] = []
    preceded = False
    for line in path.read_text(encoding="utf-8").splitlines():
        clean = line.strip()
        if not clean:
            preceded = False            # una línea en blanco corta la adscripción
            continue
        if clean.startswith("#"):
            preceded = True
            continue
        if "#" in clean:
            # No se normaliza en silencio: la línea es inválida para git y el
            # gate tiene que decirlo, no arreglarla por dentro.
            effective.append((clean, False))
        else:
            effective.append((clean, preceded))
        preceded = False
    return effective


def repo_root(repo: str, tree_root: Path | None = None) -> Path:
    """La raíz de un clon: el árbol declarado, o el mecanismo de alcance.

    ``tree_root`` es el primer eslabón de la cadena porque es lo más
    específico: quien lo pasa está apuntando el gate a un árbol concreto —una
    suite, otro checkout— y una derivación no puede anular un dato escrito a
    propósito.
    """
    if tree_root is not None:
        return Path(tree_root) / reach.clone_name(repo)
    return reach.root(repo)


def review(repo: str, tree_root: Path | None = None) -> tuple[str, str]:
    """Veredicto de un repo: ``(state, detail)``.

    ``state`` es ``ausente_repo`` | ``ausente_archivo`` | ``divergente`` | ``ok``.
    """
    root = repo_root(repo, tree_root)
    if not root.is_dir():
        parent = tree_root if tree_root is not None else reach.tree_root()
        return "ausente_repo", f"{root} no existe — clones hermanos esperados bajo {parent}"

    path = root / ".gitattributes"
    if not path.is_file():
        return "ausente_archivo", "sin .gitattributes en la raíz"

    read = read_directives(path)
    present = [d for d, _ in read]

    missing = [d for d in CANONICAL_DIRECTIVES if d not in present]
    undeclared_extras = sorted({d for d, declared in read
                                if d not in CANONICAL_DIRECTIVES
                                and not declared and "#" not in d})
    declared_extras = sorted({d for d, declared in read
                              if d not in CANONICAL_DIRECTIVES and declared})
    repeated = sorted({d for d in present if present.count(d) > 1})
    # git no admite comentario en línea: parsea el `#` como nombre de atributo
    # y descarta la línea entera. La directiva queda inerte y en silencio.
    inline = sorted({d for d in present if "#" in d})

    parts = []
    if inline:
        parts.append("comentario en línea — git descarta la línea entera: "
                     + ", ".join(repr(d) for d in inline))
    if missing:
        parts.append("faltan: " + ", ".join(repr(d) for d in missing))
    if undeclared_extras:
        parts.append("fuera del contrato y sin comentario que lo declare: "
                     + ", ".join(repr(d) for d in undeclared_extras))
    if repeated:
        parts.append("duplicadas: " + ", ".join(repr(d) for d in repeated))

    if parts:
        return "divergente", " · ".join(parts)

    detail = "las tres directivas, sin duplicados"
    if declared_extras:
        detail += f" · {len(declared_extras)} extra(s) declarada(s)"
    return "ok", detail


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--quiet", action="store_true", help="sólo el conteo")
    parser.add_argument("--strict", action="store_true", help="exit 1 si hay divergencias")
    parser.add_argument("--tree-root", default=None,
                        help="árbol de clones a medir; sin él lo resuelve paths.reach")
    args = parser.parse_args(argv)

    tree_root = Path(args.tree_root) if args.tree_root else None
    verdicts = [(repo, *review(repo, tree_root)) for repo in reach.REACH_ROOTS]

    present = [v for v in verdicts if v[1] != "ausente_repo"]
    problems = [v for v in verdicts if v[1] in ("ausente_archivo", "divergente")]
    absent = [v for v in verdicts if v[1] == "ausente_repo"]

    if not args.quiet:
        for repo, state, detail in verdicts:
            mark = {"ok": "OK  ", "ausente_repo": "n/a ",
                    "ausente_archivo": "FAIL", "divergente": "FAIL"}[state]
            print(f"{mark} {reach.clone_name(repo):<17} {detail}")
        print()

    print(f"check_gitattributes: {len(problems)} divergencia(s) "
          f"(alcance medido: {len(present)} de {len(reach.REACH_ROOTS)} repos presentes)")

    # Un repo fuera de la sesión NO es un aprobado: se nombra, para que el
    # conteo no se lea como cobertura completa.
    if absent:
        print("  no medidos: " + ", ".join(reach.clone_name(v[0]) for v in absent))

    if args.strict and problems:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
