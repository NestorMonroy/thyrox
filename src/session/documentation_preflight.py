#!/usr/bin/env python3
"""Preflight de una sesión que va a producir documentación durable.

Separa dos preguntas que se confundían: ``dónde escribir`` y ``qué objeto se
quiere conservar``. También rehúsa buscar antecedentes si el consumidor docs
no está materializado; un directorio vacío no es evidencia de ausencia.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path


KINDS = {
    "evidence": ".claude/workbench/<slug>-<ISO>/",
    "finding": "source/gestion/pm/<submodule>/iniciativas/<initiative>/hallazgos/",
    "lesson": "source/gestion/pm/<submodule>/lecciones-aprendidas/",
    "initiative": "source/gestion/pm/<submodule>/iniciativas/<initiative>/",
    "decision": "decisiones-<initiative>.rst o el ADR del producto",
    "progress": "source/gestion/pm/<submodule>/iniciativas/<initiative>/progreso-<initiative>.rst",
}


class PreflightError(RuntimeError):
    """El sujeto documental no puede medirse con seguridad."""


@dataclass(frozen=True)
class Candidate:
    path: Path
    matches: int


def normalized_tokens(topic: str) -> tuple[str, ...]:
    """Palabras significativas del tema, sin depender de acentos o mayúsculas."""
    plain = unicodedata.normalize("NFKD", topic).encode("ascii", "ignore").decode()
    return tuple(dict.fromkeys(re.findall(r"[a-z0-9_]{3,}", plain.lower())))


def assert_checkout(root: Path, label: str) -> str:
    """Devuelve HEAD sólo si ``root`` es la raíz de un checkout real."""
    if not root.is_dir():
        raise PreflightError(f"{label}: no existe {root}")
    result = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "--show-toplevel", "HEAD"],
        capture_output=True, text=True, check=False,
    )
    lines = result.stdout.splitlines()
    if result.returncode or len(lines) != 2 or Path(lines[0]).resolve() != root.resolve():
        raise PreflightError(
            f"{label}: {root} no es la raíz materializada de su checkout; "
            "ejecuta git submodule update --init antes de afirmar ausencias")
    return lines[1]


def find_candidates(docs_root: Path, topic: str) -> list[Candidate]:
    """Busca antecedentes por contenido en las raíces PM de docs y thyrox."""
    tokens = normalized_tokens(topic)
    if not tokens:
        raise PreflightError("topic: no contiene términos buscables")
    base = docs_root / "source" / "gestion" / "pm"
    candidates: list[Candidate] = []
    minimum_distinct = max(1, (len(tokens) + 1) // 2)
    for area in ("thyrox", "docs"):
        area_root = base / area
        if not area_root.is_dir():
            continue
        for path in area_root.rglob("*.rst"):
            text = unicodedata.normalize("NFKD", path.read_text(errors="replace"))
            text = text.encode("ascii", "ignore").decode().lower()
            present = [token for token in tokens if token in text]
            count = sum(text.count(token) for token in present)
            if len(present) >= minimum_distinct:
                candidates.append(Candidate(path.relative_to(docs_root), count))
    return sorted(candidates, key=lambda item: (-item.matches, str(item.path)))


def destination(kind: str, submodule: str, initiative: str | None) -> str:
    template = KINDS[kind].replace("<submodule>", submodule)
    if "<initiative>" in template:
        if not initiative:
            raise PreflightError(f"kind={kind} requiere --initiative")
        template = template.replace("<initiative>", initiative)
    return template


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Decide qué registrar, busca antecedentes y publica el hogar correcto.")
    parser.add_argument("--docs-root", type=Path, required=True)
    parser.add_argument("--provider-root", type=Path, required=True)
    parser.add_argument("--topic", required=True)
    parser.add_argument("--kind", choices=sorted(KINDS), required=True)
    parser.add_argument("--submodule", required=True)
    parser.add_argument("--initiative")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args(argv)

    try:
        docs_head = assert_checkout(args.docs_root, "docs")
        provider_head = assert_checkout(args.provider_root, "provider")
        target = destination(args.kind, args.submodule, args.initiative)
        candidates = find_candidates(args.docs_root, args.topic)
    except PreflightError as error:
        print(f"documentation-preflight: REHUSA — {error}", file=sys.stderr)
        return 2

    print(f"objeto={args.kind}")
    print(f"destino={target}")
    print(f"docs_head={docs_head}")
    print(f"provider_head={provider_head}")
    print(f"antecedentes={len(candidates)}")
    for candidate in candidates[: max(args.limit, 0)]:
        print(f"  {candidate.matches:4d}  {candidate.path}")
    if candidates:
        print("decision=revisar antecedentes antes de crear otro documento")
    else:
        print("decision=sin candidatos en el alcance medido; no equivale a ausencia global")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
