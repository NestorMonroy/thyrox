#!/usr/bin/env python3
"""render_finding.py — el ``.rst`` de un hallazgo, renderizado desde su fila.

Un hallazgo del consumidor tiene dos caras (``.claude/CLAUDE.md``, paso 5):
la fila de ``findings_history`` y el ``.rst``. La fila ya tiene identificador,
capa, iniciativa, severidad, resumen, contenido y fuente; el ``.rst`` se
escribía a mano repitiendo la misma plantilla en heredocs (H-THYROX-202..207).
Este módulo lo compone desde la fila, así que un lote de hallazgos se
renderiza con ``run-task-pool`` —un ``rst`` por trabajo, en paralelo— y
``index`` queda como único escritor del ``index.rst`` de la iniciativa.

Subcomandos:

- ``rst <ID> [--resolved-in repo@hash] [--body archivo] [--output ruta]``:
  escribe el archivo con la plantilla B de
  ``hallazgos-documentacion-obligatoria.md``. Rehúsa (exit 1) si ya existe:
  un hallazgo publicado es evidencia fechada, no se regenera encima.
- ``index <ID>``: añade la fila de la tabla y la entrada del toctree, una
  sola vez.

Un identificador que el store no tiene sale 2 sin escribir nada.

*Métrica:* la fila del store y, en ``index``, el ``:estado:`` del ``.rst``.
*Ciega a:* si el cuerpo contradice la fila: el cuerpo lo aporta quien
escribe, y este módulo lo copia tal cual.
"""
from __future__ import annotations

import argparse
import re
import sqlite3
import sys
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from agents import agent_store
from hallazgo import hallazgo_ids

AUTHOR = 'Equipo Kaupamex'


@dataclass(frozen=True)
class FindingRow:
    finding_id: str
    submodule: str
    initiative: str
    severity: str | None
    summary: str
    content: str
    source_ref: str | None

    @property
    def label(self) -> str:
        return self.finding_id.lower()


def slug_of(summary: str) -> str:
    """El resumen en kebab-case ASCII: sin acentos, sin signos."""
    plain = unicodedata.normalize('NFKD', summary).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', plain.lower()).strip('-')


def read_row(claude_dir: str | None, finding_id: str) -> FindingRow | None:
    args = argparse.Namespace(claude_dir=claude_dir, repo=None)
    db = agent_store.resolve_store_dir(args) / agent_store.DB_FILENAME
    if not db.is_file():
        return None
    with sqlite3.connect(f'file:{db}?mode=ro', uri=True) as conn:
        found = conn.execute(
            'SELECT finding_id, submodule, initiative, severity, summary, content, source_ref '
            'FROM findings_history WHERE finding_id = ?', (finding_id,)).fetchone()
    return FindingRow(*found) if found else None


def findings_dir(root: Path, row: FindingRow) -> Path:
    return root / row.submodule / 'iniciativas' / row.initiative / 'hallazgos'


def file_name(row: FindingRow) -> str:
    return f'hallazgo-{row.finding_id}-{slug_of(row.summary)}.rst'


def utc_now() -> str:
    return datetime.now(UTC).strftime('%Y-%m-%dT%H:%M:%S')


def render(row: FindingRow, resolved_in: str | None, body: str, created_at: str) -> str:
    title = f'{row.finding_id} — {row.summary}'
    state = 'resuelto' if resolved_in else 'documentado'
    state_line = f'RESUELTO en ``{resolved_in}``' if resolved_in else 'DOCUMENTADO (sin fix inmediato)'
    lines = [
        '.. meta::',
        f'   :fecha_creacion: {created_at}',
        f'   :autor: {AUTHOR}',
        f'   :estado: {state}',
        f'   :submodulo: {row.submodule}',
        f'   :iniciativa: {row.initiative}',
        '',
        f'.. _{row.label}:',
        '',
        title,
        '=' * len(title),
        '',
        f'- **Severidad:** {row.severity or "SIN DECLARAR"}',
        f'- **Fecha:** {created_at}',
    ]
    if row.source_ref:
        lines.append(f'- **Archivo:** ``{row.submodule}: {row.source_ref}``')
    lines += [f'- **Descripcion:** {row.content}', f'- **Estado:** {state_line}', '']
    text = '\n'.join(lines)
    if body:
        text += '\n' + body.rstrip('\n') + '\n'
    return text


def default_root() -> Path:
    return hallazgo_ids.docs_root() / 'gestion' / 'pm'


def _row_or_refuse(args: argparse.Namespace) -> FindingRow | None:
    row = read_row(args.claude_dir, args.finding_id)
    if row is None:
        print(f'render_finding: {args.finding_id} no está en el store; nada escrito.', file=sys.stderr)
    return row


def cmd_rst(args: argparse.Namespace) -> int:
    row = _row_or_refuse(args)
    if row is None:
        return 2
    root = Path(args.root) if args.root else default_root()
    target = Path(args.output) if args.output else findings_dir(root, row) / file_name(row)
    if target.exists():
        print(f'render_finding: {target} ya existe; no se regenera encima.', file=sys.stderr)
        return 1
    body = Path(args.body).read_text(encoding='utf-8') if args.body else ''
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(render(row, args.resolved_in, body, utc_now()), encoding='utf-8')
    print(target)
    return 0


_STATE = re.compile(r'^\s*:estado:\s*(\S+)', re.MULTILINE)


def insert_into_index(index: str, row: FindingRow, entry: str, state: str) -> str:
    """La fila tras la última de la tabla y la entrada tras la última del toctree."""
    lines = index.split('\n')
    if f':ref:`{row.label}`' not in index:
        last_row_end = None
        for i, line in enumerate(lines):
            # Una fila empieza con `* -`; sus celdas siguen, contiguas, con `-`.
            starts_row = line.startswith('   * - ')
            continues_row = last_row_end == i - 1 and line.startswith('     - ')
            if starts_row or continues_row:
                last_row_end = i
        if last_row_end is None:
            raise ValueError('el índice no tiene list-table')
        new_row = [f'   * - :ref:`{row.label}`', f'     - {row.severity or "SIN DECLARAR"}', f'     - {state}']
        lines[last_row_end + 1:last_row_end + 1] = new_row
    if f'hallazgo-{row.finding_id}-' not in '\n'.join(lines):
        start = next((i for i, line in enumerate(lines) if line.startswith('.. toctree::')), None)
        if start is None:
            raise ValueError('el índice no tiene toctree')
        last_entry = start
        for i in range(start + 1, len(lines)):
            line = lines[i]
            if line.startswith('   ') and not line.startswith('   :') and line.strip():
                last_entry = i
            elif line.strip() and not line.startswith('   '):
                break
        lines.insert(last_entry + 1, f'   {entry}')
    return '\n'.join(lines)


def cmd_index(args: argparse.Namespace) -> int:
    row = _row_or_refuse(args)
    if row is None:
        return 2
    root = Path(args.root) if args.root else default_root()
    folder = findings_dir(root, row)
    index_path = folder / 'index.rst'
    if not index_path.is_file():
        print(f'render_finding: {index_path} no existe.', file=sys.stderr)
        return 2
    existing = sorted(folder.glob(f'hallazgo-{row.finding_id}-*.rst'))
    target = existing[0] if existing else folder / file_name(row)
    found = _STATE.search(target.read_text(encoding='utf-8')) if target.is_file() else None
    state = 'RESUELTO' if found and found.group(1).lower() == 'resuelto' else 'DOCUMENTADO'
    try:
        updated = insert_into_index(index_path.read_text(encoding='utf-8'), row, target.stem, state)
    except ValueError as error:
        print(f'render_finding: {index_path}: {error}', file=sys.stderr)
        return 2
    index_path.write_text(updated, encoding='utf-8')
    print(index_path)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='El .rst de un hallazgo, desde su fila del store.')
    sub = parser.add_subparsers(dest='command', required=True)
    for name, func, help_text in (
            ('rst', cmd_rst, 'escribe el .rst del hallazgo'),
            ('index', cmd_index, 'añade su fila y su entrada al index.rst')):
        command = sub.add_parser(name, help=help_text)
        command.add_argument('finding_id', help='p. ej. H-THYROX-208')
        command.add_argument('--claude-dir', help='el store a leer (default: el del proveedor)')
        command.add_argument('--root', help='la raíz pm/ del consumidor (default: la de kaupamex-docs)')
        command.set_defaults(func=func)
        if name == 'rst':
            command.add_argument('--resolved-in', help='repo@hash del commit que lo resuelve')
            command.add_argument('--body', help='archivo .rst con el cuerpo, que se copia tal cual')
            command.add_argument('--output', help='otra ruta en vez de la derivada')
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
