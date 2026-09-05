#!/usr/bin/env python3
"""Agrupa las tareas abiertas de implementación por familia de la referencia.

Separa el trabajo de **implementación** (portar la referencia a `kaupamex-api`)
del de **tooling y gobierno** (gates, barridos, reglas, decisiones), y reparte
el primero por familia de addon.

Existe porque el tablero plano no deja ver en cuántos frentes está abierto el
trabajo a la vez. El corpus `hbooks:` fija por qué eso importa: la partición
existe para **localizar el fallo**, no para ir más rápido
(`hbooks: book1/chapter-07-multi-agent-and-verification.md:146`). Un tablero con
N familias abiertas simultáneamente no es paralelismo — es la sopa espesa que
ese mismo capítulo describe, sólo que repartida.

Este guion es el **mecanismo**; el registro de qué hay y en qué estado vive en
`source/**` (`calibration-verified-numbers.md`). Por eso no imprime conclusiones
ni guarda cuentas: imprime el reparto del momento en que se corre.

Uso:
    python3 .claude/scripts/task/agrupar_tareas_por_familia.py
"""

import collections
import re
import sqlite3
import sys
from pathlib import Path

STORE = Path(__file__).resolve().parents[2] / 'agent-results' / 'agent_store.sqlite3'

# Lo que NO es implementación: se aparta antes de repartir por familia.
DECISION = re.compile(
    r'^\s*(DECISI[OÓ]N|DECISION|DECIDIDO|DECIDIDA|DIFERIDA|Veredicto|VEREDICTO'
    r'|CONDICIONAL|ORDEN DE CAMPA)', re.I)
GATE = re.compile(r'^\s*Gate\b|^\s*Cablear (un |el )?gate|gate de |gate:', re.I)
TOOLING = re.compile(
    r'H-DOCS|H-UI|hook|store|subagente|workflow|skill|CLAUDE\.md|\.claude'
    r'|base.cognitiva|CS ?106|KNN|Tarjan|thyrox|corpus|tablero|transcript'
    r'|telemetr|RST|:doc:|:ref:|Sphinx|docutils|regla', re.I)
SWEEP = re.compile(
    r'^\s*(Barrer|Barrido|Censar|Triar|Triage|Auditar|Medir|Re-medir|Re-auditar'
    r'|Reconciliar|Normalizar|Renumerar|Limpiar|Corregir)', re.I)

# Lo que SÍ es implementación de la referencia.
IMPLEMENTATION = re.compile(
    r'odoo|referencia|H-API|src/|addons/|account|stock|website|sale|hr\b|hr_'
    r'|mail|crm|purchase|mrp|product|uom|utm|portal|authz|orm|ir\.|res\.'
    r'|PostgreSQL|Django|DRF|migrac|modelo|campo|addon|CFDI|l10n|POS'
    r'|point_of_sale|kaupamex-bin|Apache|libharu|bus', re.I)

# El orden importa: la primera familia que matchea se queda la tarea.
FAMILIES = [
    ('Núcleo ORM · base · módulos',
     r'\borm\b|ir\.|res\.|base\b|Ola [1-4]|módulos|modules|scaffold|kaupamex-bin'
     r'|@api\.model|Domain|recordset|_name\b|extend_model|chain_method|NEGATIVE'
     r'|parent_of|Query|SQL\(\)|traducción|translate|jsonb|active\b|create_uid'),
    ('account · contabilidad · CFDI',
     r'account|CFDI|l10n|impuesto|divisa|currency|asset|cheque|check_printing'
     r'|peppol|EDI|analytic|chart'),
    ('stock · inventario', r'stock|picking|quant|warehouse|barcode'),
    ('website · website_sale · portal',
     r'website|portal|carrito|cart|StaticPage|rewrite|attachment'),
    ('hr · satélites hr_*', r'\bhr\b|hr_|employee|resource\.calendar'),
    ('mail · bus · notificaciones',
     r'mail|bus|chatter|buzón|digest|alias|actividad|notify'),
    ('sale · crm · product · uom', r'sale|crm|product|uom|utm'),
    ('Infra · plataforma · campaña',
     r'PostgreSQL|Apache|Gunicorn|debian|empaquet|Capa [0-3]|Familia|authz'
     r'|cohorte|gantt|libharu|profiler|OWL'),
]


def open_tasks(store):
    """Las tareas que siguen abiertas, en el orden en que el store las tiene."""
    conn = sqlite3.connect(store)
    conn.row_factory = sqlite3.Row
    return [dict(row) for row in conn.execute(
        "select task_id, subject, status, citation_id from tasks "
        "where status in ('pending','in_progress')")]


def _identidad(task):
    """``#122 (TASK-DOCS-0390)`` — el ordinal con su cita durable, si la hay.

    El ordinal se reinicia y se reusa por sesion; la cita se ancla al sujeto
    (ERR-024, H-DOCS-1067). Una base sin la columna sigue respondiendo, sin el
    campo — mismo contrato que ``selectCitationId`` del harness.
    """
    cita = task.get('citation_id')
    return f"#{task['task_id']} ({cita})" if cita else f"#{task['task_id']}"


def is_implementation(subject):
    """Aparta decisiones, gates, tooling y barridos; deja el porte."""
    if DECISION.match(subject) or GATE.search(subject):
        return False
    if TOOLING.search(subject) or SWEEP.match(subject):
        return False
    return bool(IMPLEMENTATION.search(subject))


def group_by_family(tasks):
    """Reparte por familia, primera que matchea. Devuelve (grupos, sin_familia)."""
    groups = collections.OrderedDict((name, []) for name, _ in FAMILIES)
    assigned = set()
    for name, pattern in FAMILIES:
        matcher = re.compile(pattern, re.I)
        for task in tasks:
            if task['task_id'] in assigned:
                continue
            if matcher.search(task['subject']):
                groups[name].append(task)
                assigned.add(task['task_id'])
    unassigned = [t for t in tasks if t['task_id'] not in assigned]
    return groups, unassigned


def main():
    if not STORE.exists():
        print(f'no existe el store: {STORE}', file=sys.stderr)
        return 1

    todas = open_tasks(STORE)
    impl = [t for t in todas if is_implementation(t['subject'])]
    groups, unassigned = group_by_family(impl)
    open_families = [n for n, ts in groups.items()
                     if any(t['status'] == 'in_progress' for t in ts)]

    print(f'IMPLEMENTACIÓN odoo-tools → kaupamex-api: {len(impl)} tareas abiertas\n')
    for name, tasks in groups.items():
        if not tasks:
            continue
        ids = ' '.join(
            _identidad(t) + ('*' if t['status'] == 'in_progress' else '')
            for t in sorted(tasks, key=lambda t: int(t['task_id'])))
        print(f'{name}  ({len(tasks)})\n    {ids}\n')
    if unassigned:
        print(f'sin familia ({len(unassigned)}): '
              + ' '.join(_identidad(t) for t in unassigned) + '\n')

    print(f'* = in_progress · familias con frente abierto: {len(open_families)}')
    print(f'  alcance medido: {len(impl)} de {len(todas)} tareas abiertas son '
          f'implementación; el resto es tooling, gates, barridos y decisiones.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
