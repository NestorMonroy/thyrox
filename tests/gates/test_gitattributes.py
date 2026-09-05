#!/usr/bin/env python3
"""Prueba de ``gates.gitattributes`` — el contrato de texto de los clones.

Es la mitad ROJA escrita ANTES del módulo (TDD). El import falla mientras
``src/gates/gitattributes.py`` no exista, y ese fallo es el resultado que se
persiste.

Qué cubre cada bloque, y por qué — cada uno nace de un defecto MEDIDO en el
original de ``kaupamex-docs``, no de una preferencia:

1. **El comentario en línea NO declara nada.** git parsea el ``#`` como nombre
   de atributo y descarta la línea entera; una directiva con comentario al
   final queda inerte y en silencio. La primera versión del gate original
   exigía justo esa sintaxis — es decir, exigía lo que git rechaza.
2. **La adscripción del comentario se corta con una línea en blanco.** Sin ese
   corte, un comentario suelto al principio del archivo declararía todo lo que
   viniera después.
3. **El duplicado se ve.** Las directivas se devuelven como lista y no como
   conjunto: un conjunto borraría el defecto antes de que nadie lo mire.
4. **El repo ausente NO es un aprobado.** Su veredicto es propio, se nombra, y
   no entra al denominador — un cero sobre cero repos y uno sobre cinco
   publican la misma cifra sin decir lo mismo.
5. **El control puede fallar.** Cada bloque de veredicto trae su gemelo con la
   causa RETIRADA, y exige que el veredicto CAMBIE. Un verde que no cambia al
   quitarle la causa no mide la causa (sub-patrón D de
   ``metrica-decide-la-conclusion.md``).

Uso:  python3 tests/gates/test_gitattributes.py
"""

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
THYROX_ROOT = HERE.parents[2]
sys.path.insert(0, str(THYROX_ROOT / "src"))

from gates import gitattributes  # noqa: E402  (la ruta se compone arriba, a propósito)

PASS = 0
FAIL = 0


def check(label: str, expected, actual) -> None:
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  ok    {label}")
    else:
        FAIL += 1
        print(f"  FALLA {label}\n          esperado: {expected!r}\n          real:     {actual!r}")


def write_tree(root: pathlib.Path, files: dict[str, str | None]) -> None:
    """Siembra clones sintéticos. ``None`` crea el clon sin ``.gitattributes``."""
    for repo, content in files.items():
        clone = root / f"kaupamex-{repo}"
        clone.mkdir(parents=True, exist_ok=True)
        if content is not None:
            (clone / ".gitattributes").write_text(content, encoding="utf-8")


CONTRACT = "\n".join(gitattributes.CANONICAL_DIRECTIVES) + "\n"


# ── 1. El lector de directivas ────────────────────────────────────────────
print("\n== read_directives ==")

with tempfile.TemporaryDirectory() as tmp:
    path = pathlib.Path(tmp) / ".gitattributes"

    path.write_text("* text=auto\n", encoding="utf-8")
    check("una directiva sin comentario no está declarada",
          [("* text=auto", False)], gitattributes.read_directives(path))

    path.write_text("# porque X\n*.bin binary\n", encoding="utf-8")
    check("el comentario en su PROPIA línea la declara",
          [("*.bin binary", True)], gitattributes.read_directives(path))

    path.write_text("# porque X\n\n*.bin binary\n", encoding="utf-8")
    check("una línea en blanco corta la adscripción",
          [("*.bin binary", False)], gitattributes.read_directives(path))

    path.write_text("*.bin binary # porque X\n", encoding="utf-8")
    check("el comentario en LÍNEA no declara — git descarta la línea entera",
          [("*.bin binary # porque X", False)], gitattributes.read_directives(path))

    path.write_text("* text=auto\n* text=auto\n", encoding="utf-8")
    check("el duplicado se conserva: es lista, no conjunto",
          [("* text=auto", False), ("* text=auto", False)],
          gitattributes.read_directives(path))


# ── 2. El veredicto por repo ──────────────────────────────────────────────
print("\n== review ==")

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    write_tree(root, {
        "api": CONTRACT,
        "db": None,
        "docs": "* text=auto\n",
        "ui": CONTRACT + "# el binario del store no se intercala en un merge\n*.sqlite3 binary\n",
        "server": CONTRACT + "*.sqlite3 binary\n",
    })

    check("el contrato completo da ok",
          "ok", gitattributes.review("api", root)[0])
    check("sin .gitattributes da ausente_archivo",
          "ausente_archivo", gitattributes.review("db", root)[0])
    check("con dos directivas de menos da divergente",
          "divergente", gitattributes.review("docs", root)[0])
    check("y el detalle NOMBRA las que faltan",
          True, "faltan" in gitattributes.review("docs", root)[1])
    check("una extra CON comentario que la declare sigue siendo ok",
          "ok", gitattributes.review("ui", root)[0])
    check("una extra SIN comentario es divergente",
          "divergente", gitattributes.review("server", root)[0])

    # El clon que no está en el árbol: veredicto propio, no aprobado.
    check("un clon ausente da ausente_repo",
          "ausente_repo", gitattributes.review("api", root / "no-existe")[0])


# ── 3. Los controles que DISCRIMINAN ──────────────────────────────────────
# Cada uno retira la causa y exige que el veredicto CAMBIE. Sin ellos, un
# «ok» no distingue «el contrato está» de «el gate no mira».
print("\n== controles de anulación ==")

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)

    write_tree(root, {"api": CONTRACT})
    con_contrato = gitattributes.review("api", root)[0]
    write_tree(root, {"api": "* text=auto\n"})
    sin_contrato = gitattributes.review("api", root)[0]
    check("retirar dos directivas cambia el veredicto",
          ("ok", "divergente"), (con_contrato, sin_contrato))

    write_tree(root, {"db": CONTRACT + "# declarada\n*.bin binary\n"})
    con_comentario = gitattributes.review("db", root)[0]
    write_tree(root, {"db": CONTRACT + "*.bin binary\n"})
    sin_comentario = gitattributes.review("db", root)[0]
    check("retirar el comentario que declara la extra cambia el veredicto",
          ("ok", "divergente"), (con_comentario, sin_comentario))

    write_tree(root, {"ui": CONTRACT})
    sin_duplicar = gitattributes.review("ui", root)[0]
    write_tree(root, {"ui": CONTRACT + "* text=auto\n"})
    duplicada = gitattributes.review("ui", root)[0]
    check("duplicar una directiva canónica cambia el veredicto",
          ("ok", "divergente"), (sin_duplicar, duplicada))


# ── 4. El CLI: conteo con denominador, y el ausente nombrado ──────────────
print("\n== main ==")

MODULE = THYROX_ROOT / "src" / "gates" / "gitattributes.py"


def run(root: pathlib.Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(MODULE), "--tree-root", str(root), *args],
        capture_output=True, text=True,
    )


with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    write_tree(root, {r: CONTRACT for r in ("api", "db", "docs", "server", "ui")})

    ok = run(root)
    check("los cinco en contrato salen 0", 0, ok.returncode)
    check("y el conteo publica su DENOMINADOR",
          True, "alcance medido: 5 de 5" in ok.stdout)

    write_tree(root, {"docs": "* text=auto\n"})
    roto = run(root, "--strict")
    check("--strict con una divergencia sale 1", 1, roto.returncode)
    check("y sin --strict sigue saliendo 0", 0, run(root).returncode)
    check("el conteo nombra la divergencia",
          True, "1 divergencia(s)" in roto.stdout)

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    write_tree(root, {r: CONTRACT for r in ("api", "docs")})

    parcial = run(root)
    check("con dos clones el denominador NO miente",
          True, "alcance medido: 2 de 5" in parcial.stdout)
    check("y los tres ausentes se NOMBRAN",
          True, "no medidos:" in parcial.stdout)
    check("un clon ausente no cuenta como divergencia",
          True, "0 divergencia(s)" in parcial.stdout)

print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
sys.exit(1 if FAIL else 0)
