"""Reparte las secciones del snapshot congelado en sus fuentes de dominio, sin editarlas.

Lee snapshots/report-20261003T232604Z-pre-structured-audit.md y copia cada
sección «## …» textual al archivo de dominio que le corresponde, bajo una
cabecera que nombra el snapshot y su sha256. No resume ni reescribe: mover el
texto es lo que garantiza que ninguna observación ni conclusión cambie.
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

BENCH = Path(__file__).resolve().parents[1]
SNAPSHOT = BENCH / "snapshots/report-20261003T232604Z-pre-structured-audit.md"

# prefijo del título «## …» → archivo destino
ROUTES = [
    ("Capability matrix — estado al cierre", "decisions/closing-capability-matrix.md"),
    ("Capability matrix", "decisions/initial-capability-matrix.md"),
    ("Authority map", "decisions/initial-plan.md"),
    ("Duplicate implementations", "decisions/initial-plan.md"),
    ("Disconnected implementations (actual)", "decisions/final-dag.md"),
    ("Disconnected implementations", "decisions/initial-plan.md"),
    ("Bootstrap exceptions", "decisions/initial-plan.md"),
    ("Critical blockers", "decisions/initial-plan.md"),
    ("Non-critical gaps", "decisions/initial-plan.md"),
    ("Reusable mechanisms", "decisions/initial-plan.md"),
    ("Dependency graph", "decisions/initial-plan.md"),
    ("Identity migration audit", "evidence/snapshot-sections/identity-migration.md"),
    ("Transformers / ML runtime", "evidence/snapshot-sections/transformers-ml.md"),
    ("F6 — repo-code-change", "evidence/snapshot-sections/self-implementation.md"),
    ("Local autonomous implementation experiment", "evidence/snapshot-sections/self-implementation.md"),
    ("Resource ceiling", "evidence/snapshot-sections/resource-admission.md"),
    ("Authority duplication (actual)", "decisions/final-dag.md"),
    ("Final dependency graph", "decisions/final-dag.md"),
]


def sections(text: str) -> list[tuple[str, str]]:
    parts = text.split("\n## ")
    head, rest = parts[0], parts[1:]
    return [("(cabecera)", head)] + [(p.split("\n", 1)[0], "## " + p) for p in rest]


def main() -> int:
    text = SNAPSHOT.read_text(encoding="utf-8")
    digest = hashlib.sha256(text.encode()).hexdigest()
    routed: dict[str, list[str]] = {}
    unrouted = []
    for title, body in sections(text):
        target = next((dest for prefix, dest in ROUTES if title.startswith(prefix)), None)
        if title == "(cabecera)":
            target = "decisions/initial-plan.md"
        if target is None:
            unrouted.append(title)
            continue
        routed.setdefault(target, []).append(body.rstrip("\n").rstrip("-").rstrip())
    for target, bodies in routed.items():
        banner = f"<!-- extraído textual de {SNAPSHOT.name} (sha256 {digest}); no editar: la fuente es el snapshot -->\n\n"
        (BENCH / target).write_text(banner + "\n\n".join(bodies) + "\n", encoding="utf-8")
    print({"targets": sorted(routed), "unrouted": unrouted})
    return 1 if unrouted else 0


if __name__ == "__main__":
    sys.exit(main())
