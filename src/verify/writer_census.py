#!/usr/bin/env python3
"""¿Quién ESCRIBE cada tabla del store? — resolviendo el nombre compuesto.

El defecto que cierra (:ref:`h-thyrox-63`)
-------------------------------------------
El censo anterior buscaba el verbo SQL adyacente al **literal** del nombre de
la tabla. Publicó ``0 escritores`` sobre ``cleared_tool_results``, que tiene
1952 filas, porque su escritor **compone** el nombre::

    const CLEARED_TABLE = 'cleared_tool_results'
    db.run(`INSERT INTO ${CLEARED_TABLE} (...) ...`)

Medir el literal y concluir «nadie la escribe» es el sub-patrón C de
``metrica-decide-la-conclusion.md``: se mide el significante y se concluye
sobre el significado. Aquí el nombre se resuelve contra la constante antes de
decidir.

Qué resuelve, y qué NO
-----------------------
**Un solo nivel, dentro del mismo archivo**: ``const X = 'literal'`` en
TypeScript y ``X = "literal"`` a nivel de módulo en Python. Es lo que el árbol
real necesita — medido, la única tabla escrita por nombre compuesto es una— y
lo que se puede resolver sin construir un cargador de módulos.

Queda **ciego**, declarado y no descubierto:

- una constante **importada** de otro archivo;
- un nombre **computado** en tiempo de ejecución (``tabla = prefijo + sufijo``);
- una plantilla de **varias partes** (``${a}_${b}``);
- el nivel de **columna** — este censo responde «¿quién escribe la tabla?», no
  «¿quién escribe esta columna?». Es otro eje, registrado como sucesor.

Métrica: sentencias ``INSERT``/``UPDATE``/``DELETE`` cuyo nombre de tabla es
  un literal, o una interpolación de una constante declarada en el mismo
  archivo, fuera de comentario y de docstring.
Ciega a: las cuatro formas de arriba, y a si la sentencia se EJECUTA alguna
  vez — ver una sentencia en el fuente no prueba que su camino esté vivo.
"""
from __future__ import annotations

import argparse
import ast
import dataclasses
import io
import pathlib
import re
import sys
import tokenize

#: Las raíces donde vive código de producción de este árbol.
SOURCE_ROOTS = ("src", "bin")

#: Un archivo es de prueba si su ruta lleva alguno de estos segmentos. Se
#: excluyen por defecto: un test que declara un esquema lo LEE, no lo escribe
#: en producción, y contarlo infla el censo con escritores que no lo son.
TEST_MARKERS = ("__tests__", "/tests/", ".test.", "_test.", "test_")

#: Extensión -> lenguaje. El resto del árbol no se mide.
LANGUAGES = {".py": "py", ".ts": "ts", ".tsx": "ts", ".js": "ts", ".sh": "sh"}

#: El verbo y su tabla. El nombre puede ser un identificador llano, ir entre
#: comillas, o ser una interpolación `${NOMBRE}` que hay que resolver.
#: Lo que NUNCA es un nombre de tabla justo detras del verbo. `DO UPDATE SET`
#: de un `ON CONFLICT` hacia que el censo publicara una tabla llamada `SET` —
#: el mismo falso positivo que el censo por literal ya tenia.
#: `AFTER UPDATE OF <columna> ON <tabla>` de un trigger tambien pone una
#: palabra que no es tabla justo detras del verbo; la tabla real va tras
#: `ON`, y el cuerpo del trigger la nombra por su cuenta.
NOT_A_TABLE = frozenset({"set", "from", "into", "where", "values", "select",
                         "of", "on", "or", "table"})

#: La frontera de palabra NO es decorativa: sin ella `TaskUpdate to` de un
#: texto en ingles casa como `UPDATE to`, y el `set to in_progress` de la
#: misma frase satisface la estructura. Medido: era el ultimo falso
#: positivo del censo del arbol.
WRITE = re.compile(
    r"""\b(?P<verb>INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE|DELETE\s+FROM)\s+
        (?P<name>["'`]?\$\{\s*(?P<const>\w+)\s*\}|["'`]?(?P<plain>\w+))""",
    re.IGNORECASE | re.VERBOSE,
)

#: `const X = 'literal'` (TS) y `X = "literal"` a nivel de módulo (Python).
CONSTANT = re.compile(
    r"""^\s*(?:(?:export|declare)\s+)?(?:(?:const|let|var)\s+)?(?P<name>[A-Za-z_]\w*)\s*(?::[^=]+)?=\s*
        ['"`](?P<value>\w+)['"`]""",
    re.MULTILINE | re.VERBOSE,
)


#: La ESTRUCTURA que sigue al nombre de la tabla en una sentencia real. Sin
#: ella, `update the roster` de un prompt en ingles se lee como `UPDATE roster`
#: — medido: el censo publicaba tablas llamadas `This`, `Current`, `before` y
#: `a`, todas prosa dentro de una plantilla de texto. La prosa en un COMENTARIO
#: ya la quita `_strip_prose`; esta es la que vive dentro de una cadena, que no
#: se puede blanquear porque ahi mismo vive el SQL de verdad.
STRUCTURE = {
    "INSERT INTO": re.compile(r"\s*(?:\(|VALUES\b|SELECT\b|DEFAULT\b)",
                              re.IGNORECASE),
    "UPDATE": re.compile(r"[^;]{0,200}?\bSET\b", re.IGNORECASE | re.DOTALL),
    "DELETE FROM": re.compile(r"\s*(?:WHERE\b|[;\"'`)]|$)",
                              re.IGNORECASE | re.DOTALL),
}

#: Cuanto texto se mira detras del nombre para hallar esa estructura.
STRUCTURE_WINDOW = 220


def _has_sql_structure(verb: str, tail: str) -> bool:
    """¿Lo que sigue al nombre tiene forma de SQL, o es prosa?"""
    family = "INSERT INTO" if verb.startswith("INSERT") else verb
    patron = STRUCTURE.get(family)
    return bool(patron and patron.match(tail[:STRUCTURE_WINDOW]))


@dataclasses.dataclass(frozen=True)
class Hit:
    """Una sentencia de escritura, con la tabla ya resuelta."""

    table: str
    verb: str
    line: int
    composed: bool


@dataclasses.dataclass
class Census:
    """El censo del árbol: tabla -> sus escritores, más el denominador."""

    by_table: dict[str, list[tuple[str, int, bool]]]
    measured: int


def _blank_span(lines: list[str], start_row: int, start_col: int,
                end_row: int, end_col: int) -> None:
    """Sustituye un tramo por espacios, conservando el numero de linea.

    Borrar las lineas desplazaria todo lo de abajo y el ``lineno`` que se
    publica dejaria de ser el del archivo real.
    """
    for row in range(start_row, end_row + 1):
        if row - 1 >= len(lines):
            break
        line = lines[row - 1]
        since = start_col if row == start_row else 0
        until = end_col if row == end_row else len(line)
        lines[row - 1] = line[:since] + " " * (until - since) + line[until:]


def _strip_prose_python(text: str) -> str:
    """Neutraliza comentarios y docstrings de Python, por tokenize y AST.

    NO se pueden blanquear todas las cadenas: la sentencia SQL vive dentro de
    una. La distincion es estructural —un docstring es un ``Expr(Constant)``
    en primera posicion de modulo, clase o funcion— y por eso la decide el
    AST, no un patron de comillas.
    """
    lines = text.splitlines()
    try:
        for token in tokenize.generate_tokens(io.StringIO(text).readline):
            if token.type == tokenize.COMMENT:
                _blank_span(lines, token.start[0], token.start[1],
                            token.end[0], token.end[1])
    except (tokenize.TokenError, IndentationError, SyntaxError):
        pass
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return "\n".join(lines)
    for node in ast.walk(tree):
        if not isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef,
                                 ast.AsyncFunctionDef)):
            continue
        body = getattr(node, "body", [])
        if not body:
            continue
        first = body[0]
        if (isinstance(first, ast.Expr)
                and isinstance(first.value, ast.Constant)
                and isinstance(first.value.value, str)):
            _blank_span(lines, first.lineno, first.col_offset,
                        first.end_lineno or first.lineno,
                        first.end_col_offset or 0)
    return "\n".join(lines)


#: Comentario de linea y de bloque de TypeScript.
TS_COMMENT = re.compile(r"//[^\n]*|/\*.*?\*/", re.DOTALL)


def _strip_prose(text: str, language: str) -> str:
    """Neutraliza la prosa conservando el numero de linea de lo que queda."""
    if language == "py":
        return _strip_prose_python(text)
    return TS_COMMENT.sub(
        lambda m: re.sub(r"[^\n]", " ", m.group(0)), text)


def write_statements(text: str, language: str, *,
                     resolve_constants: bool = True) -> list[Hit]:
    """Las sentencias de escritura del texto, con su tabla resuelta.

    ``resolve_constants=False`` es el control de anulación: retira la mitad
    que este módulo existe para aportar, y tiene que hacer caer exactamente
    los nombres compuestos — ni uno más.
    """
    body = _strip_prose(text, language)
    constants = (
        {m.group("name"): m.group("value") for m in CONSTANT.finditer(body)}
        if resolve_constants else {}
    )
    hits: list[Hit] = []
    for match in WRITE.finditer(body):
        constant = match.group("const")
        if constant is not None:
            table = constants.get(constant)
            if table is None:
                continue          # sin su declaración no se inventa la tabla
            composed = True
        else:
            table = match.group("plain")
            if table is None or table.lower() in NOT_A_TABLE:
                continue
            composed = False
        verb = re.sub(r"\s+", " ", match.group("verb")).upper()
        if not _has_sql_structure(verb, body[match.end():]):
            continue
        line = body.count("\n", 0, match.start()) + 1
        hits.append(Hit(table=table, verb=verb, line=line, composed=composed))
    return hits


def is_test(path: pathlib.Path) -> bool:
    text = str(path).replace("\\", "/")
    return any(marker in text or path.name.startswith("test_")
               for marker in TEST_MARKERS)


def census(root: pathlib.Path, *, include_tests: bool = False,
           resolve_constants: bool = True) -> Census:
    """Recorre las raíces de código y agrupa los escritores por tabla."""
    by_table: dict[str, list[tuple[str, int, bool]]] = {}
    measured = 0
    for name in SOURCE_ROOTS:
        base = root / name
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*")):
            language = LANGUAGES.get(path.suffix)
            if language is None or not path.is_file():
                continue
            if "node_modules" in path.parts:
                continue
            if not include_tests and is_test(path):
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            measured += 1
            relative = str(path.relative_to(root))
            for hit in write_statements(text, language,
                                        resolve_constants=resolve_constants):
                by_table.setdefault(hit.table, []).append(
                    (relative, hit.line, hit.composed))
    return Census(by_table=by_table, measured=measured)


def store_tables(store: pathlib.Path) -> dict[str, int]:
    """Las tablas reales del store con su conteo de filas."""
    import sqlite3

    conn = sqlite3.connect(f"file:{store}?mode=ro", uri=True)
    shadow = ("_fts_config", "_fts_data", "_fts_docsize", "_fts_idx")
    counts: dict[str, int] = {}
    for (name,) in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
        if any(name.endswith(s) for s in shadow) or name == "sqlite_sequence":
            continue
        counts[name] = conn.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
    return counts


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Censo de escritores por tabla, resolviendo el nombre compuesto.")
    parser.add_argument("--root", default=None, help="raiz del arbol a medir")
    parser.add_argument("--store", default=None,
                        help="store cuyas tablas se contrastan con el censo")
    parser.add_argument("--include-tests", action="store_true",
                        help="incluye los archivos de prueba, en su propio cubo")
    parser.add_argument("--no-resolve", action="store_true",
                        help="control de anulacion: NO resuelve la constante")
    args = parser.parse_args(argv[1:])

    root = pathlib.Path(args.root).resolve() if args.root else None
    if root is None:
        from paths import reach
        root = reach.thyrox_root()

    result = census(root, include_tests=args.include_tests,
                       resolve_constants=not args.no_resolve)
    if result.measured == 0:
        print(f"writer-census REHUSADO — 0 archivos medibles bajo {root}",
              file=sys.stderr)
        print("  No se emite conteo: un 0 aqui no distingue «sin escritores» "
              "de «no pude medir».", file=sys.stderr)
        return 2

    print(f"censo de escritores (alcance medido: {result.measured} archivo(s); "
          f"raices {', '.join(SOURCE_ROOTS)})")
    for table in sorted(result.by_table):
        sites = result.by_table[table]
        composite = sum(1 for _, _, composed in sites if composed)
        mark = f"  [{composite} por nombre compuesto]" if composite else ""
        print(f"  {table:<24} {len(sites)} sentencia(s){mark}")
        for relative, line, composed in sites:
            print(f"      {relative}:{line}{' (compuesto)' if composed else ''}")

    if not args.store:
        return 0

    orphans = {t: n for t, n in store_tables(pathlib.Path(args.store)).items()
                 if n > 0 and t not in result.by_table}
    print(f"\ntablas con filas y SIN escritor: {len(orphans)}")
    for table, rows in sorted(orphans.items()):
        print(f"  {table:<24} {rows} fila(s)")
    return 1 if orphans else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
