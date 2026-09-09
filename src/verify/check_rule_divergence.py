#!/usr/bin/env python3
"""Las reglas con el MISMO NOMBRE en varios consumidores: quien manda y quien se quedo atras.

El defecto, medido antes de escribir esto
------------------------------------------

Las reglas de `.claude/rules/` no viven en un sitio: viven en cinco, y ninguna
declara `paths:`, asi que todas cargan en toda sesion. Medido sobre los cinco
clones mas THYROX:

    archivos de regla ............ 117
    nombres distintos ............ 45
    nombres en mas de un repo .... 33   — identicos byte a byte: 3

Treinta de esos treinta y tres DIVERGEN. Un consumidor lee una version y otro
lee otra, y las dos se citan como si fueran la regla. El episodio que le pone
precio es `H-DOCS-97`: el `test-execution-protocol.md` de `ui` era una copia
completa que declaraba MariaDB, los schemas del motor retirado y Node v20 —los
cuatro superados— asi que una sesion con `ui` en alcance cargaba el protocolo
equivocado como autoritativo.

Los tres cubos, que NO son el mismo veredicto
----------------------------------------------

- **cheat-sheet**: la copia declara su canon (`Regla completa:`, `canonico en`).
  Es la forma correcta y no se toca.
- **subsumida**: todo su contenido esta en otra copia. Es la copia stale de
  `H-DOCS-97`, y su arreglo es MECANICO: se reduce a cheat-sheet. Cero decision.
- **divergente**: tiene contenido que la otra no tiene. Ahi hay juicio —cual de
  las dos quedo atras no lo decide el tamaño— y por eso se lista, no se arregla.

La direccion la decide el CONTENIDO, no el repo. Suponer que `docs` es siempre
el canon es falso y esta medido: su `no-lazy-imports.md` sigue citando el arbol
de apps con el nombre del L1 que el barrido del 2026-09-05 retiro, mientras la
copia de `api` ya cita `src/addons/`.

Metrica: lineas no vacias, sin espacio final, como conjunto. `A` subsume a `B`
si ninguna linea de `B` falta en `A`.
Ciega a: la reescritura que dice lo mismo con otras palabras —dos copias que
coinciden en el fondo y no en el texto salen `divergente`—; al orden de las
lineas; y a la copia que declara su canon y ademas se quedo atras, que sale
`cheat-sheet` sin mirarle el contenido.

Salidas: 0 sin divergentes nuevas · 1 con divergentes nuevas · 2 no pudo medir.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from paths import reach  # noqa: E402

BASELINE = HERE / "rule_divergence_baseline.txt"

#: Donde vive una regla en cualquiera de los arboles.
RULES_DIR = Path(".claude") / "rules"

#: Como declara una copia que su canon esta en otro sitio. Se busca en el
#: encabezado: una cita a `H-DOCS-97` en el cuerpo de una regla completa no la
#: convierte en cheat-sheet.
CHEATSHEET_MARKERS = ("regla completa:", "canonico en", "canónico en",
                      "cheat-sheet (canonico", "cheat-sheet (canónico")
HEADER_LINES = 12

#: El sello que el emisor estampa. Se lee de `rules.provenance` en vez de
#: repetirlo aqui: dos literales de la misma cadena en dos modulos son dos
#: fuentes de verdad, y su deriva seria SILENCIOSA — el clasificador dejaria
#: de reconocer lo que el emisor escribe y lo contaria como deriva.
from rules.provenance import EMITTED_MARKER  # noqa: E402  — `sys.path` ya fijado arriba


def rule_files(root: Path) -> dict[str, Path]:
    """Las reglas de un arbol, por nombre de archivo."""
    directory = root / RULES_DIR
    if not directory.is_dir():
        return {}
    return {p.name: p for p in sorted(directory.glob("*.md")) if p.is_file()}


def content_lines(path: Path) -> frozenset[str]:
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return frozenset()
    return frozenset(line.rstrip() for line in raw.splitlines() if line.strip())


def _header_contains(path: Path, markers: tuple[str, ...]) -> bool:
    """Si la cabecera de la copia contiene alguno de los marcadores.

    Se mira SOLO la cabecera: una cita a `H-DOCS-97` en el cuerpo de una regla
    completa no la convierte en cheat-sheet, y un `.md` que hable del sello no
    se vuelve emitido por mencionarlo.
    """
    try:
        with path.open(encoding="utf-8", errors="replace") as handle:
            head = "".join(next(handle, "") for _ in range(HEADER_LINES))
    except OSError:
        return False
    lowered = head.lower()
    return any(marker in lowered for marker in markers)


def declares_canon(path: Path) -> bool:
    return _header_contains(path, CHEATSHEET_MARKERS)


def declares_emitted(path: Path) -> bool:
    """Si la copia lleva el sello del emisor, en la misma ventana de cabecera."""
    return _header_contains(path, (EMITTED_MARKER,))


def classify(name: str, copies: dict[str, Path]) -> list[tuple[str, str, str]]:
    """Un veredicto por copia: (repo, cubo, razon)."""
    lines = {repo: content_lines(path) for repo, path in copies.items()}
    verdicts: list[tuple[str, str, str]] = []
    for repo, path in copies.items():
        # El sello se mira ANTES que nada. Sin este cubo, N consumidores con la
        # misma regla emitida caen en `divergente (0 linea(s))`: dos copias
        # identicas no se subsumen —el filtro `holders` exige que la otra
        # aporte alguna linea propia— y el emisor empeoraria la cifra que
        # existe para justificarlo. Una emitida no es deriva: es la MISMA
        # definicion resuelta con los parametros de cada consumidor.
        if declares_emitted(path):
            verdicts.append((repo, "emitida", "lleva el sello del proveedor"))
            continue
        if declares_canon(path):
            verdicts.append((repo, "cheat-sheet", "declara su canon"))
            continue
        # Quien la subsume: otra copia que contiene TODAS sus lineas y ademas
        # aporta alguna propia. Sin ese «ademas» dos copias identicas se
        # subsumirian mutuamente y las dos se reducirian a cheat-sheet.
        holders = [other for other, olines in lines.items()
                   if other != repo
                   and not (lines[repo] - olines)
                   and (olines - lines[repo])]
        if holders:
            verdicts.append((repo, "subsumida",
                             "su contenido esta entero en " + ", ".join(sorted(holders))))
        elif len(copies) > 1:
            own = min(len(lines[repo] - lines[other])
                      for other in copies if other != repo)
            verdicts.append((repo, "divergente", f"{own} linea(s) que ninguna otra tiene"))
    return verdicts


def read_baseline() -> set[str]:
    if not BASELINE.is_file():
        return set()
    return {line.strip() for line in BASELINE.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")}


def survey(roots: dict[str, Path]) -> tuple[dict[str, dict[str, Path]], int]:
    """Nombres compartidos por mas de un arbol, y el total de reglas medidas."""
    by_name: dict[str, dict[str, Path]] = {}
    measured = 0
    for repo, root in roots.items():
        for name, path in rule_files(root).items():
            by_name.setdefault(name, {})[repo] = path
            measured += 1
    shared = {name: copies for name, copies in by_name.items() if len(copies) > 1}
    return shared, measured


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict", action="store_true",
                        help="exit 1 si hay divergentes fuera del baseline")
    parser.add_argument("--quiet", action="store_true",
                        help="emitir solo el conteo de divergentes nuevas")
    parser.add_argument("--write-baseline", action="store_true",
                        help="congelar las divergentes de hoy")
    parser.add_argument("--bucket", default=None,
                        choices=("cheat-sheet", "subsumida", "divergente", "emitida"),
                        help="listar solo ese cubo")
    args = parser.parse_args(argv)

    try:
        roots = dict(reach.roots())
        roots["thyrox"] = reach.thyrox_root()
    except Exception as exc:                       # noqa: BLE001
        print(f"ERROR — no se pudieron derivar las raices: {exc}", file=sys.stderr)
        print("NO se emite un conteo: este gate mide ENTRE arboles; sin ellos "
              "un 0 seria un verde falso.", file=sys.stderr)
        return 2

    present = {repo: root for repo, root in roots.items() if (root / RULES_DIR).is_dir()}
    if len(present) < 2:
        print(f"ERROR — solo {len(present)} arbol(es) con {RULES_DIR}.", file=sys.stderr)
        print("NO se emite un conteo: comparar exige al menos dos.", file=sys.stderr)
        return 2

    shared, measured = survey(present)
    baseline = read_baseline()
    buckets: dict[str, list[str]] = {"emitida": [], "cheat-sheet": [],
                                     "subsumida": [], "divergente": []}
    for name in sorted(shared):
        for repo, bucket, reason in classify(name, shared[name]):
            buckets[bucket].append(f"{repo}::{name}   ({reason})")

    fresh = [entry for entry in buckets["divergente"]
             if entry.split("   (")[0] not in baseline]

    if args.write_baseline:
        keys = sorted(entry.split("   (")[0] for entry in buckets["divergente"])
        BASELINE.write_text(
            "# Divergencias congeladas — una copia con contenido propio.\n"
            "# Se paga al tocar la regla, no en un barrido.\n"
            + "\n".join(keys) + "\n", encoding="utf-8")
        print(f"baseline escrito: {len(keys)} divergencia(s)")
        return 0

    if args.quiet:
        print(len(fresh))
        return 1 if (args.strict and fresh) else 0

    for bucket in ("subsumida", "divergente", "emitida", "cheat-sheet"):
        if args.bucket and bucket != args.bucket:
            continue
        print(f"== {bucket} ({len(buckets[bucket])}) ==")
        for entry in buckets[bucket]:
            print(f"  {entry}")

    print(f"check-rule-divergence: {len(buckets['subsumida'])} subsumida(s) · "
          f"{len(fresh)} divergente(s) nueva(s) de {len(buckets['divergente'])} · "
          f"{len(buckets['emitida'])} emitida(s) · "
          f"{len(buckets['cheat-sheet'])} cheat-sheet "
          f"(alcance medido: {measured} regla(s) en {len(present)} arbol(es); "
          f"{len(shared)} nombre(s) compartido(s))")
    return 1 if (args.strict and fresh) else 0


if __name__ == "__main__":
    raise SystemExit(main())
