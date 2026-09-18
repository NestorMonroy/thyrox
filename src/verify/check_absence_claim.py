#!/usr/bin/env python3
"""check_absence_claim.py — el comentario que afirma una ausencia, contra el árbol.

El eje NO es el idioma del comentario: es su **verdad**. Un comentario heredado
de la fuente puede estar traducido al español y seguir siendo falso, y
traducirlo preserva la mentira. Es significante contra significado.

El episodio que lo origina es ``H-THYROX-93``: la cabecera de
``cronTasksCore.ts`` declaraba que ``getAgentHostBindings()`` era «inexistente
en este árbol» **cuatro minutos después** de que el símbolo aterrizara — medido
con ``git merge-base --is-ancestor``. Ocho funciones se recortaron citando esa
ausencia, y el sondeo escrito para detectar esas declaraciones buscaba «no
existe en este árbol» cuando la cabecera decía «inexistente»: publicó su
sección vacía con la declaración tres líneas más arriba.

Uso — con el cwd puesto en la raíz del proveedor:

    python3 src/verify/check_absence_claim.py                 # reporte
    python3 src/verify/check_absence_claim.py --quiet         # sólo el conteo
    python3 src/verify/check_absence_claim.py --strict        # exit 1 si hay FALSAS
    python3 src/verify/check_absence_claim.py <archivos>      # sólo ésos

Métrica: líneas de comentario de ``.ts``/``.tsx`` que afirman una ausencia, con
el símbolo que nombran resuelto contra los ``export`` del árbol.
Ciega a: la afirmación que no nombra ningún símbolo entre comillas invertidas
—se declara ``UNDECIDABLE`` en vez de adivinar—; y toda afirmación que no sea
de ausencia (una cifra rancia, una ruta que ya no resuelve) — ésas son otros
ejes, con sus propios gates.

**La cifra de FALSA es una COTA SUPERIOR para triaje, no un veredicto.** La
ventana de contexto atribuye a la afirmación todo identificador entrecomillado
de las líneas de comentario contiguas, y eso incluye lo que la afirmación no
predica: medido al estrenarlo, ``pendingCrossPackageDeps.ts:217`` toma ``ls``
—el nombre de un comando— como símbolo. La ventana es necesaria (sin ella el
control positivo real cae, porque la frase envuelve y el símbolo queda dos
líneas antes de la palabra que afirma) y su precio es esta sobre-atribución.
Quien triaje lee la línea, no el conteo.
"""

import argparse
import enum
import pathlib
import re
import sys
from dataclasses import dataclass, field

# Sólo dispara dentro de una línea de comentario: `//`, `*` de bloque, o `/*`.
COMMENT_LINE = re.compile(r"^\s*(//|\*|/\*)")

# Las formas de afirmar una ausencia que el corpus real usa. La caja de
# «PARCIAL» es deliberada: en minúscula, «porte parcial» es prosa corriente
# sobre otra cosa; la cabecera que originó el episodio escribe «Porte PARCIAL».
ABSENCE_PATTERNS = (
    re.compile(r"inexistentes?\s+en\s+est[ea]\s+[áa]rbol", re.IGNORECASE),
    re.compile(r"no\s+existen?\s+en\s+est[ea]\s+[áa]rbol", re.IGNORECASE),
    re.compile(r"not\s+(available|present)\s+in\s+this\s+tree", re.IGNORECASE),
)

# «PORTE PARCIAL» NO es una afirmación de ausencia: es una declaración de
# ALCANCE. Medido al estrenar el gate: `sessionRestore.ts:6` dice «sólo se
# porta `computeStandaloneAgentContext`», y ese símbolo es justamente el que
# SÍ está — resolverlo daba FALSA sobre una afirmación verdadera. Se detecta
# igual, porque es la familia que el triaje quiere ver, pero su eje lo decide
# `check_porte_completo`, no este gate.
PARTIAL_PORT_PATTERNS = (
    re.compile(r"\bPORTE\s+PARCIAL\b"),
    re.compile(r"\bPorte\s+PARCIAL\b"),
)

# Un símbolo, no una ruta: sin barra, sin dos puntos, sin punto.
SYMBOL_SHAPE = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*(\(\))?$")
BACKTICKED = re.compile(r"`([^`]+)`")

# La afirmación envuelve: el símbolo que nombra puede quedar en una línea
# anterior del mismo bloque de comentario. El control positivo de la suite lo
# exige — en la cabecera real, la línea que dice «inexistente» sólo lleva una
# RUTA entre comillas invertidas, y el símbolo está dos líneas más arriba.
CONTEXT_LINES = 4

# Las formas de declarar un símbolo exportado en TypeScript.
EXPORTED = re.compile(
    r"^\s*export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?"
    r"(?:function|const|let|var|class|type|interface|enum)\s+"
    r"([A-Za-z_$][A-Za-z0-9_$]*)"
)


class ClaimKind(enum.Enum):
    """Dos afirmaciones distintas que la misma familia de prosa mezcla."""

    ABSENCE = "ausencia"            # «X no existe en este árbol» — resoluble
    PARTIAL_PORT = "alcance"        # «PORTE PARCIAL» — declara alcance, no ausencia


class ClaimVerdict(enum.Enum):
    """Los tres desenlaces. ``UNDECIDABLE`` es rehusar, no un cuarto silencio."""

    FALSE = "FALSA"          # el símbolo que nombra SÍ está en el árbol
    UPHELD = "SOSTENIDA"     # no está: la afirmación se sostiene
    UNDECIDABLE = "INDECIDIBLE"  # no nombra ningún símbolo resoluble
    OUT_OF_SCOPE = "OTRO EJE"    # declaración de alcance: la decide otro gate


@dataclass
class AbsenceClaim:
    """Una afirmación de ausencia, con el sitio y los símbolos que nombra."""

    line: int
    text: str
    symbols: list = field(default_factory=list)
    path: str = ""
    kind: "ClaimKind" = None


def _symbols_in(text: str) -> list:
    """Los identificadores entre comillas invertidas, sin rutas ni paréntesis."""
    found = []
    for raw in BACKTICKED.findall(text):
        token = raw.strip()
        if SYMBOL_SHAPE.match(token):
            clean = token[:-2] if token.endswith("()") else token
            if clean not in found:
                found.append(clean)
    return found


def find_absence_claims(text: str, path: str = "") -> list:
    """Las afirmaciones de ausencia del texto, con su ventana de contexto."""
    lines = text.splitlines()
    claims = []
    for index, line in enumerate(lines):
        if not COMMENT_LINE.match(line):
            continue
        if any(pattern.search(line) for pattern in ABSENCE_PATTERNS):
            kind = ClaimKind.ABSENCE
        elif any(pattern.search(line) for pattern in PARTIAL_PORT_PATTERNS):
            kind = ClaimKind.PARTIAL_PORT
        else:
            continue
        # La ventana sube por las líneas de comentario contiguas: la frase
        # envuelve y el símbolo suele quedar antes de la palabra que afirma.
        window = [line]
        back = index - 1
        while back >= 0 and len(window) <= CONTEXT_LINES:
            if not COMMENT_LINE.match(lines[back]):
                break
            window.insert(0, lines[back])
            back -= 1
        claims.append(AbsenceClaim(
            line=index + 1,
            text=line.strip(),
            symbols=_symbols_in("\n".join(window)),
            path=path,
            kind=kind,
        ))
    return claims


def exported_symbols(root) -> set:
    """Todo símbolo que el árbol exporta desde un ``.ts``/``.tsx``."""
    present = set()
    root = pathlib.Path(root)
    for suffix in ("*.ts", "*.tsx"):
        for module in root.rglob(suffix):
            if "node_modules" in module.parts:
                continue
            try:
                for line in module.read_text(errors="ignore").splitlines():
                    match = EXPORTED.match(line)
                    if match:
                        present.add(match.group(1))
            except OSError:
                continue
    return present


def verdict(claim: AbsenceClaim, present: set) -> ClaimVerdict:
    """FALSA si el árbol tiene el símbolo; SOSTENIDA si no; INDECIDIBLE sin símbolo.

    Una declaración de ALCANCE no se resuelve aquí: su eje es el censo de
    símbolos portados, que mide ``check_porte_completo``.
    """
    if claim.kind is ClaimKind.PARTIAL_PORT:
        return ClaimVerdict.OUT_OF_SCOPE
    if not claim.symbols:
        return ClaimVerdict.UNDECIDABLE
    if any(symbol in present for symbol in claim.symbols):
        return ClaimVerdict.FALSE
    return ClaimVerdict.UPHELD


def _modules(root, requested):
    if requested:
        return [pathlib.Path(p) for p in requested]
    root = pathlib.Path(root)
    found = []
    for suffix in ("*.ts", "*.tsx"):
        found.extend(m for m in root.rglob(suffix) if "node_modules" not in m.parts)
    return sorted(found)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("files", nargs="*")
    parser.add_argument("--root", default="src")
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--strict", action="store_true",
                        help="exit 1 si hay alguna afirmación FALSA")
    args = parser.parse_args(argv)

    root = pathlib.Path(args.root)
    if not root.is_dir():
        # Rehusar en vez de publicar un cero: un 0 aquí no distinguiría
        # «no hay afirmaciones» de «no pude medir».
        print(f"check-absence-claim: la raíz «{root}» no existe — no se midió",
              file=sys.stderr)
        return 2

    present = exported_symbols(root)
    modules = _modules(root, args.files)

    tally = {v: 0 for v in ClaimVerdict}
    false_claims = []
    for module in modules:
        try:
            text = module.read_text(errors="ignore")
        except OSError:
            continue
        for claim in find_absence_claims(text, str(module)):
            result = verdict(claim, present)
            tally[result] += 1
            if result is ClaimVerdict.FALSE:
                false_claims.append(claim)

    if not args.quiet:
        for claim in false_claims:
            print(f"  CANDIDATA  {claim.path}:{claim.line}  {claim.text[:92]}")
            print(f"         nombra {claim.symbols} y el árbol los exporta")

    total = sum(tally.values())
    print(
        f"check-absence-claim: {tally[ClaimVerdict.FALSE]} candidata(s) a falsa · "
        f"{tally[ClaimVerdict.UPHELD]} sostenida(s) · "
        f"{tally[ClaimVerdict.UNDECIDABLE]} indecidible(s) · "
        f"{tally[ClaimVerdict.OUT_OF_SCOPE]} declaracion(es) de alcance "
        f"(alcance medido: {total} afirmación(es) en {len(modules)} módulo(s); "
        f"{len(present)} símbolo(s) exportado(s))"
    )
    if args.strict and tally[ClaimVerdict.FALSE]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
