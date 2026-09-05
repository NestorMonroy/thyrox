#!/usr/bin/env python3
"""La línea de tiempo de un subagente: sus llamadas únicas y sus huecos.

El instrumento que faltaba para responder «¿el agente sigue vivo?» con una
medición en vez de una impresión. `reconciliar-agentes.sh` clasifica el estado
de un agente **en curso** por la mtime de su `.output`; esto lee el transcript
**terminado** y publica dos cosas que aquél no puede dar:

1. **Las llamadas únicas**, deduplicadas por `tool_use.id`. Un transcript repite
   el mismo bloque en cada mensaje de la cadena, así que contar bloques infla la
   cifra — el mismo dedup que `costo-agente.sh` aplica al gasto.
2. **La distribución de huecos** entre eventos consecutivos. Un hueco suelto no
   dice nada; lo que informa es qué fracción del reloj de pared vive en huecos
   largos. Medido sobre el agente del léxico cerrado: la mediana es 0.0 s y aun
   así **ocho** huecos de 73–116 s se comen el 51 % del reloj.

Ese segundo eje es el que convierte «61 s sin escribir» —que se reportó como un
momento benigno— en «la mitad del reloj», que es otra conclusión. El defecto no
era la cifra: era publicar una muestra donde hacía falta una distribución.

*Métrica:* eventos con `timestamp` del JSONL del subagente; llamadas
deduplicadas por `tool_use.id`; huecos entre eventos consecutivos ordenados.
*Ciega a:* qué hacía el agente DENTRO de un hueco — un hueco largo puede ser
razonamiento, espera de una herramienta lenta, o un cuelgue, y el transcript no
los distingue. Y ciega al trabajo que el agente dejó en disco sin anunciar: mide
lo que el agente dijo, no lo que quedó (para eso está el delta de `git diff`).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import sys

#: Dónde el harness deja el transcript de cada subagente de esta sesión.
ROSTER = pathlib.Path('/root/.claude/projects/-home-user')

#: Por encima de esto un hueco deja de ser cadencia y pasa a ser espera. No es
#: un umbral del dominio: es el corte con que se reportó el episodio, y se
#: expone como bandera justamente para que nadie lo tome por ley.
DEFAULT_GAP = 40.0


def transcript_for(agent_id: str) -> pathlib.Path:
    """El JSONL del agente, buscado por id bajo el roster de la sesión."""
    if '/' in agent_id:
        return pathlib.Path(agent_id)
    hits = sorted(ROSTER.glob(f'*/subagents/agent-{agent_id}.jsonl'))
    if not hits:
        print(f'ERROR — no se encontró transcript para «{agent_id}» bajo {ROSTER}.\n'
              '  NO se emite conteo: un 0 aquí sería un verde falso — no '
              'distinguiría «no hizo nada» de «no pude medir».', file=sys.stderr)
        raise SystemExit(2)
    return hits[0]


def read_events(path: pathlib.Path) -> tuple[list[dt.datetime], list[tuple[dt.datetime, str, str]]]:
    """`(timestamps, llamadas)` — las llamadas deduplicadas por `tool_use.id`."""
    stamps: list[dt.datetime] = []
    calls: list[tuple[dt.datetime, str, str]] = []
    seen: set[str] = set()
    for line in path.read_text(errors='ignore').splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        raw = event.get('timestamp')
        if not raw:
            continue
        when = dt.datetime.fromisoformat(raw.replace('Z', '+00:00'))
        stamps.append(when)
        content = event.get('message', {}).get('content')
        if not isinstance(content, list):
            continue
        for block in content:
            if block.get('type') != 'tool_use':
                continue
            block_id = block.get('id')
            if block_id in seen:
                continue
            seen.add(block_id)
            tool = block.get('name') or '?'
            label = (block.get('input', {}) or {}).get('description') or tool
            calls.append((when, tool, str(label)[:72]))
    stamps.sort()
    calls.sort(key=lambda c: c[0])
    return stamps, calls


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('agent_id', help='id del subagente, o ruta a su JSONL')
    parser.add_argument('--gap', type=float, default=DEFAULT_GAP,
                        help=f'segundos a partir de los cuales un hueco cuenta (default {DEFAULT_GAP:.0f})')
    parser.add_argument('--solo-huecos', action='store_true',
                        help='omite el listado de llamadas')
    args = parser.parse_args()

    path = transcript_for(args.agent_id)
    stamps, calls = read_events(path)
    if len(stamps) < 2:
        print(f'ERROR — {path} trae {len(stamps)} evento(s) con timestamp; no hay '
              'línea de tiempo que medir.', file=sys.stderr)
        return 2

    span = (stamps[-1] - stamps[0]).total_seconds()
    gaps = [(stamps[i + 1] - stamps[i]).total_seconds() for i in range(len(stamps) - 1)]
    long_gaps = sorted((g for g in gaps if g > args.gap), reverse=True)

    print(f'transcript:  {path}')
    print(f'reloj:       {stamps[0]:%H:%M:%S} -> {stamps[-1]:%H:%M:%S}  '
          f'= {span:.0f} s ({span / 60:.1f} min)')
    print(f'eventos:     {len(stamps)}   llamadas únicas: {len(calls)}')
    print(f'huecos >{args.gap:.0f}s: {len(long_gaps)}  suma {sum(long_gaps):.0f} s '
          f'({sum(long_gaps) / 60:.1f} min = {100 * sum(long_gaps) / span:.0f} % del reloj)')
    if long_gaps:
        print('             ' + ' '.join(f'{g:.0f}s' for g in long_gaps))
    print(f'mediana del hueco: {sorted(gaps)[len(gaps) // 2]:.1f} s   '
          f'máximo: {max(gaps):.0f} s')

    if not args.solo_huecos:
        print('\nllamadas únicas, con el hueco que las precede:')
        previous = stamps[0]
        for i, (when, tool, label) in enumerate(calls, 1):
            delta = (when - previous).total_seconds()
            mark = ' <<<' if delta > args.gap else ''
            print(f'{i:3}. {when:%H:%M:%S} (+{delta:5.0f}s){mark}  [{tool}] {label}')
            previous = when
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
