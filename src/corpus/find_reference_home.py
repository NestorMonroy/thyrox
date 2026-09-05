#!/usr/bin/env python3
"""¿Dónde vive en la referencia lo que aquí se llama de otra forma?

El nombre del directorio es una **llave débil**: un addon nuestro puede portar
un mecanismo de la referencia con otro nombre —`authz_*` contra `auth_*`— y una
comparación por nombre lo declara ausente. Este guion busca por **contenido**,
sobre todos los directorios del repo de referencia y no sobre una sola raíz.

Cuatro llaves, de más fuerte a más débil. Se prueban en ese orden y el guion
declara con cuál acertó, porque no valen lo mismo:

0. **La procedencia declarada** — el docstring que nombra el addon de la
   referencia que adapta. Es la más barata y la más fuerte cuando existe,
   porque la escribió quien portó; el proyecto ya la exige como convención.
1. **`_name` del modelo** — exacta. Si el literal aparece en la referencia, ése
   es el hogar, se llame como se llame el directorio.
2. **Nombre de archivo** — fuerte: la referencia nombra el archivo por su
   modelo (`res_bank.py` declara `res.bank`).
3. **Conjunto de campos** — la que sirve cuando las dos anteriores fallan.
   Mide *containment*: qué fracción de nuestros campos aparece en el candidato.
   Un solapamiento bajo es evidencia de que **no** es contraparte, que es un
   resultado tan útil como el positivo.
4. **Símbolos declarados** — la que sirve cuando el addon **particiona** un
   addon de la referencia en vez de espejarlo. Un addon que parte `base` nombra
   sus archivos con vocabulario propio (`main.py`, `serializers.py`), así que
   las llaves 2 y 3 fallan por construcción; lo que sí conserva son los
   **métodos**. Rankea los archivos de la referencia por cuántos de nuestros
   símbolos declaran.

*Métrica:* coincidencia literal de `_name`, de nombre de archivo, de nombres de
campo y de nombres de símbolo declarado, sobre el índice de git de la
referencia.
*Ciega a:* un porte que renombró **todos** sus campos, su archivo y sus
métodos. Para ése no hay llave sintáctica y el veredicto sale de leerlo, no de
medirlo — declararlo DESCONOCIDO es la conducta correcta, no forzar una llave.

Uso
---
    find_reference_home.py --ours <ruta-addon> --reference <repo>
    find_reference_home.py --ours addons/base_bank --reference /home/user/odoo-tools
    find_reference_home.py --ours addons/authz --reference /home/user/odoo-tools \\
        --symbols --root 19.x/odoo-19.0
"""

import argparse
import ast
import collections
import pathlib
import re
import subprocess
import sys

MODEL_NAME = re.compile(r"^\s*_name\s*=\s*['\"]([^'\"]+)['\"]", re.M)
FIELD = re.compile(r"^\s{4}(\w+)\s*=\s*(?:models|fields)\.", re.M)
# La procedencia declarada admite varias formas — se miden todas, no la canónica
# sola: 70 de 78 addons citan su origen y sólo 12 usan la cabecera formal.
PROVENANCE = re.compile(
    r"(?:Adaptaci\S*n (?:fiel )?de Odoo|adaptado VERBATIM de Odoo|"
    r"equivalente del addon|~?base_\w+ Odoo|Odoo\s+``?)\s*([a-z_][a-z0-9_]*)",
    re.I,
)


def run(repo, *args):
    """`git` sobre el repo de referencia. Sólo lectura: nunca materializa nada."""
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        text=True,
        timeout=180,
    )
    return result.stdout.splitlines()


def signature(addon):
    """Las cuatro primeras llaves: procedencia, modelos, archivos y campos."""
    claimed, models, files, fields = set(), set(), set(), set()
    for path in pathlib.Path(addon).rglob("*.py"):
        if "migrations" in path.parts or path.name == "__init__.py":
            continue
        text = path.read_text(errors="ignore")
        claimed.update(PROVENANCE.findall(text))
        models.update(MODEL_NAME.findall(text))
        files.add(path.name)
        fields.update(FIELD.findall(text))
    return claimed, models, files, fields


def declared_symbols(addon):
    """Los métodos que el addon declara, por AST — no por expresión regular.

    Se excluyen los `__dunder__` porque los declara cualquier clase de Python y
    no discriminan nada. El resto del filtrado NO se hace con una lista escrita
    a mano: la ubicuidad se **mide** contra la referencia (ver `rank_by_symbol`),
    que es autocalibrante y no envejece.
    """
    found = set()
    for path in pathlib.Path(addon).rglob("*.py"):
        if "migrations" in path.parts:
            continue
        try:
            tree = ast.parse(path.read_text(errors="ignore"))
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if not node.name.startswith("__"):
                    found.add(node.name)
    return found


def rank_by_symbol(repo, rev, symbols, root=None, ubiquity=40):
    """Rankea archivos de la referencia por símbolos NUESTROS que declaran.

    Un solo recorrido sobre el índice: la alternación va en un `git grep -E`, no
    en un grep por símbolo. Devuelve `(ranking, ubicuos, medidos)`.

    `ubiquity` es el corte de discriminación: un símbolo declarado en más de N
    archivos de la referencia (`save`, `name`, `create`) no señala ningún hogar
    — se retira del ranking y se reporta aparte. El corte se mide, no se supone:
    por eso el guion imprime cuáles retiró.
    """
    if not symbols:
        return [], [], 0
    # `git grep -E` es POSIX ERE: no admite `\s` ni `(?:...)`. Escribirlos ahí
    # no da error — da CERO aciertos, que es peor: un instrumento mudo se lee
    # como un árbol sin contraparte. Por eso van dos patrones distintos, el
    # POSIX para git y el de Python para extraer el nombre del acierto.
    alternation = "|".join(sorted(symbols))
    posix = (
        r"^[[:space:]]*(async[[:space:]]+)?def[[:space:]]+"
        f"({alternation})"
        r"[[:space:]]*\("
    )
    extract = re.compile(r"^\s*(?:async\s+)?def\s+(\w+)\s*\(")
    scope = [f"{root}/*.py"] if root else ["*.py"]
    lines = run(repo, "grep", "-n", "-E", posix, rev, "--", *scope)

    by_symbol = collections.defaultdict(set)   # símbolo -> archivos que lo declaran
    declares = collections.defaultdict(set)    # archivo  -> símbolos que declara
    for line in lines:
        # forma: <rev>:<ruta>:<lineno>:<contenido>
        parts = line.split(":", 3)
        if len(parts) < 4:
            continue
        path, body = parts[1], parts[3]
        match = extract.match(body)
        # El acierto de git puede traer un símbolo que NO es nuestro cuando la
        # alternación toca un prefijo; se descarta contra el conjunto medido.
        if not match or match.group(1) not in symbols:
            continue
        by_symbol[match.group(1)].add(path)
        declares[path].add(match.group(1))

    ubiquitous = {s for s, paths in by_symbol.items() if len(paths) > ubiquity}
    ranking = []
    for path, syms in declares.items():
        useful = syms - ubiquitous
        if useful:
            ranking.append((len(useful), path, sorted(useful)))
    ranking.sort(reverse=True)
    return ranking, sorted(ubiquitous), len(symbols)


def roots_of(paths):
    """Agrupa rutas de la referencia por su primer par de segmentos.

    Un repo de referencia con varias versiones dentro exige declarar de cuál
    salió cada hallazgo: mezclarlas es el defecto que la regla del eje de
    versión ya registra.
    """
    grouped = {}
    for path in paths:
        parts = path.split("/")
        root = "/".join(parts[:2]) if len(parts) > 2 else path
        grouped.setdefault(root, []).append(path)
    return grouped


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--ours", required=True, help="ruta a nuestro addon")
    parser.add_argument("--reference", required=True, help="repo de referencia")
    parser.add_argument("--rev", default="HEAD", help="revisión a consultar")
    parser.add_argument("--top", type=int, default=6, help="rutas a listar por llave")
    parser.add_argument(
        "--symbols",
        action="store_true",
        help="correr la llave 4 (símbolos); cuesta un recorrido del índice",
    )
    parser.add_argument(
        "--root",
        help="acota la llave 4 a una raíz (p. ej. 19.x/odoo-19.0) — sin ella "
        "mide TODAS las raíces del repo y mezcla versiones",
    )
    parser.add_argument(
        "--ubiquity",
        type=int,
        default=40,
        help="símbolo declarado en más de N archivos = no discrimina (default 40)",
    )
    args = parser.parse_args(argv)

    addon = pathlib.Path(args.ours)
    if not addon.is_dir():
        print(f"no es un directorio: {addon}", file=sys.stderr)
        return 1

    claimed, models, files, fields = signature(addon)
    print(
        f"{addon.name}: {len(claimed)} procedencias · {len(models)} _name · "
        f"{len(files)} archivos · {len(fields)} campos"
    )

    print("\nllave 0 — procedencia declarada en el docstring:")
    if not claimed:
        print("  ningún archivo nombra el addon de la referencia que adapta")
    for name in sorted(claimed):
        hits = run(args.reference, "ls-files", "--", f"*/{name}/__manifest__.py")
        grouped = roots_of(hits)
        estado = f"existe en {len(grouped)} raíces" if hits else "NO existe como addon"
        print(f"  declara adaptar `{name}`: {estado}")

    print("\nllave 1 — _name del modelo (exacta):")
    if not models:
        print("  el addon no declara ningún _name; la llave no aplica")
    for model in sorted(models):
        hits = run(args.reference, "grep", "-l", f"_name = '{model}'", args.rev, "--", "*.py")
        grouped = roots_of([hit.split(":", 1)[-1] for hit in hits])
        print(f"  {model}: {len(hits)} hits en {len(grouped)} raíces")
        for root, paths in list(grouped.items())[: args.top]:
            print(f"     {root} -> {paths[0].split('/')[-1]}")

    print("\nllave 2 — nombre de archivo:")
    for name in sorted(files):
        hits = run(args.reference, "ls-files", "--", f"*/{name}")
        if hits:
            grouped = roots_of(hits)
            print(f"  {name}: {len(hits)} hits en {len(grouped)} raíces")
        else:
            print(f"  {name}: sin contraparte por nombre")

    print("\nllave 3 — conjunto de campos (containment sobre los candidatos):")
    if not fields:
        print("  el addon no declara campos; la llave no aplica")
    else:
        print(f"  campos nuestros: {', '.join(sorted(fields))}")
        print("  (comparar a mano contra el candidato que las llaves 1-2 propongan;")
        print("   un containment bajo es evidencia de NO contraparte, no de duda)")

    if args.symbols:
        symbols = declared_symbols(addon)
        ranking, ubiquitous, measured = rank_by_symbol(
            args.reference, args.rev, symbols, args.root, args.ubiquity
        )
        alcance = args.root or "TODAS las raíces (mezcla versiones)"
        print(f"\nllave 4 — símbolos declarados · alcance: {alcance}")
        print(f"  símbolos nuestros medidos: {measured}")
        if ubiquitous:
            print(
                f"  retirados por ubicuos (>{args.ubiquity} archivos): "
                f"{', '.join(ubiquitous)}"
            )
        if not ranking:
            print("  ningún archivo de la referencia declara símbolos nuestros")
        for count, path, syms in ranking[: args.top]:
            print(f"  {count:>3} · {path}")
            print(f"        {', '.join(syms)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
