"""Gate de calidad graduado, multi-eje — sin glifos decorativos.

TASK-THYROX-0040. Generaliza ``tools/scripts/check_quality.sh``
(``NestorMonroy/ai-course-notes@717e2df6``): la referencia usa tres niveles
de estrella; aquí queda texto plano —``OK``/``FAIL`` por eje, un nombre de
tier por veredicto— por restricción explícita del ejecutor contra emoji e
iconos, y por consistencia con el idioma que
``check/veredicto_de_gate.py`` ya fija en el resto de THYROX.

Este módulo no mide nada por sí mismo — no sabe qué es "prosa por figura" ni
"cajas de resaltado". El llamador mide cada eje contra SU artefacto y entrega
la lista de ``AxisResult``; el módulo sólo decide, dado un conjunto de tiers
ascendentes (cada uno exige que un CONJUNTO nombrado de ejes pase entero),
cuál es el tier más alto alcanzado.
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass


@dataclass
class AxisResult:
    """Un eje medido — sólo datos. ``passed`` lo calcula el llamador."""

    name: str
    measured: float
    threshold: float
    passed: bool
    reason: str = "sin razon declarada"


def failing_axes(results: Sequence[AxisResult]) -> list[AxisResult]:
    """Los ejes reprobados, cada uno con su umbral y su valor medido."""
    return [r for r in results if not r.passed]


def grade(
    results: Sequence[AxisResult], tiers: Sequence[tuple[str, frozenset[str]]],
) -> dict:
    """El tier más alto cuyo conjunto de ejes exigidos pasó ENTERO.

    ``tiers`` va de menor a mayor exigencia: ``(nombre, {ejes})``. Un tier
    sólo se alcanza si TODOS sus ejes nombrados están en ``results`` y
    pasaron — no basta con que la CANTIDAD de ejes en verde coincida.

    Rehúsa sobre ``results`` vacío: no hay con qué graduar.
    """
    if not results:
        raise ValueError(
            "sin ejes que graduar: población vacía. Un tier aquí no "
            "distinguiría «calidad excelente» de «nada que medir».")
    aprobados = {r.name for r in results if r.passed}
    alcanzado = None
    for nombre, ejes_exigidos in tiers:
        if ejes_exigidos <= aprobados:
            alcanzado = nombre
    return {
        "tier": alcanzado,
        "passed_axes": sorted(aprobados),
        "failing": failing_axes(results),
    }


def format_report(results: Sequence[AxisResult]) -> str:
    """Texto plano por eje — ``OK``/``FAIL``, umbral, medido y razón. Sin emoji."""
    lineas = []
    for r in results:
        veredicto = "OK" if r.passed else "FAIL"
        lineas.append(
            f"{veredicto} {r.name}: medido={r.measured} umbral={r.threshold} "
            f"({r.reason})")
    return "\n".join(lineas)
