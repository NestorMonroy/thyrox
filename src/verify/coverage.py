"""Verificación de cobertura contra un manifiesto — genérica a cualquier fuente.

TASK-THYROX-0039. Generaliza la mitad de "verificar cobertura" de
``check_note_coverage.py`` (``NestorMonroy/ai-course-notes@717e2df6``,
``tools/scripts/``) — hoy repetido a mano en tres reglas de consumidor:
``porte-completo-no-parcial.md`` (censo de atributos de una clase),
``principio-rector-rup-arquitectura.md`` Cláusula 4 (barrido de 8 capas),
``hallazgo-abierto-genera-sucesor.md`` (seguimiento de sucesores). Este
módulo no sabe nada de LaTeX, RST ni Python: recibe una lista de
``manifest.Node`` que el llamador construye desde SU fuente, y responde
una sola pregunta —¿qué nodo requerido no aparece en el artefacto?—
citando el ID, no un porcentaje.

Separado de ``manifest.py`` por responsabilidad única (SRP): ver el
docstring de ``manifest.py`` para la razón completa.
"""
from __future__ import annotations

import pathlib
from collections.abc import Sequence

from verify.manifest import Node


def probe_candidates(node: Node) -> list[str]:
    """Las formas de texto que, si aparecen en el artefacto, cuentan como cobertura.

    Un título que tiene forma de ruta (lleva sufijo de archivo) también se
    busca por su nombre y por su stem — mismo comportamiento que
    ``check_note_coverage.py`` aplica a slides/figuras, generalizado: no se
    nombra ningún ``kind`` concreto, se detecta por la FORMA del título.
    """
    candidatos = [node.title]
    ruta = pathlib.PurePosixPath(node.title)
    if ruta.suffix:
        candidatos += [ruta.name, ruta.stem]
    return candidatos


def find_missing(
    nodes: Sequence[Node], artifact_text: str, *, required_only: bool = True,
) -> list[Node]:
    """Los nodos cuyo texto probe NO aparece en ``artifact_text``, citados por ID.

    ``required_only=True`` (el default) sólo evalúa nodos requeridos — un
    nodo opcional ausente no cuenta como falta. Con ``False`` se evalúan
    todos.
    """
    objetivo = [n for n in nodes if (not required_only) or n.required]
    return [
        nodo for nodo in objetivo
        if not any(candidato and candidato in artifact_text
                   for candidato in probe_candidates(nodo))
    ]


def coverage_report(nodes: Sequence[Node], artifact_text: str) -> dict:
    """El resumen de cobertura — rehúsa sobre un manifiesto vacío.

    Un manifiesto vacío no tiene con qué comparar: un reporte de "0
    faltantes" ahí no distinguiría cobertura completa de nada que medir,
    el mismo criterio que ``job_runs.duration_distribution`` ya aplica a
    una población vacía.
    """
    if not nodes:
        raise ValueError(
            "manifiesto sin nodos: población vacía. Un reporte de 0 "
            "faltantes aquí no distinguiría «cobertura completa» de "
            "«nada que medir».")
    requeridos = [n for n in nodes if n.required]
    faltantes = find_missing(nodes, artifact_text, required_only=True)
    return {
        "total": len(nodes),
        "required": len(requeridos),
        "optional": len(nodes) - len(requeridos),
        "covered": len(requeridos) - len(faltantes),
        "missing": faltantes,
        "missing_ids": [n.node_id for n in faltantes],
    }
