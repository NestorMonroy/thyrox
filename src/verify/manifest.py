"""Manifiesto de cobertura — el nodo y su presentación, nada más.

TASK-THYROX-0039. Generaliza la mitad de "construir el manifiesto" de
``build_lecture_manifest.py`` (``NestorMonroy/ai-course-notes@717e2df6``,
``tools/scripts/``): ese guion escribe el manifiesto entero (secciones de
archivos, recursos visuales, contrato de generación) además de la tabla
de nodos; este módulo sólo declara el vocabulario compartido (``Node``) y
lo renderiza — deliberadamente sin saber de dónde vino cada nodo ni cómo
se usa después.

Separado de ``coverage.py`` por responsabilidad única (SRP): éste cambia
si cambia CÓMO se presenta un manifiesto (una columna nueva, otro
formato de tabla); ``coverage.py`` cambia si cambia CÓMO se decide que un
nodo está cubierto. Son dos preguntas sin relación causal entre sí — el
mismo defecto que ``ai-course-notes`` evita manteniendo
``build_lecture_manifest.py`` separado de ``check_note_coverage.py`` en
vez de fundirlos, y que este módulo cometía al bundlearlos en un solo
archivo (``coverage_manifest.py``) hasta que se corrigió.
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass


@dataclass
class Node:
    """Un nodo de cobertura — sólo datos, sin lógica propia."""

    node_id: str
    kind: str
    title: str
    source: str
    required: bool = True


def render_manifest(nodes: Sequence[Node]) -> str:
    """La tabla markdown del manifiesto, con el ``|`` de cada título escapado."""
    filas = ["| ID | Type | Required | Source | Title |", "|---|---|---|---|---|"]
    for nodo in nodes:
        titulo = nodo.title.replace("|", "\\|")
        requerido = "yes" if nodo.required else "optional"
        filas.append(f"| {nodo.node_id} | {nodo.kind} | {requerido} | `{nodo.source}` | {titulo} |")
    return "\n".join(filas)
