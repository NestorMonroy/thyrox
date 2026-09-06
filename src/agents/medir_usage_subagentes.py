#!/usr/bin/env python3
"""medir_usage_subagentes.py — gasto real por subagente, leído de los transcripts.

El CLI escribe un transcript por subagente bajo

    ~/.claude/projects/<proyecto>/<sesion>/subagents/agent-<id>.jsonl

y, para los que corrieron dentro de un ``Workflow``, escribe **además** una
copia bajo ``subagents/workflows/<wf_id>/agent-<id>.jsonl``. Ese duplicado es
lo que permite clasificar el canal sin adivinar: un id que aparece bajo
``workflows/`` corrió en un workflow; el resto son ``Agent`` directos.

CADA mensaje ``assistant`` del transcript trae ``message.usage`` — medido
2026-08-13: 25 832 de 25 832 en el transcript principal, 100 %. El dato
siempre estuvo; lo que faltaba era leerlo (H-DOCS-135).

**Se deduplica por** ``message.id``. Cuando el modelo usa varias herramientas
en un mismo turno, el CLI emite un mensaje ``assistant`` por bloque y **los
tres comparten el mismo id y el mismo** ``usage``. Sumarlos todos cuenta ese
turno tres veces. La doc oficial lo prescribe explícitamente
(``ccdoc: cost-tracking.md`` §*Understand token usage*): *"all messages in
that turn share the same ID, so deduplicate by ID to avoid double-counting"*,
y para el caso raro de ids repetidos con cifras distintas: *"the final message
in a group typically contains the accurate total"* — por eso gana el último.

Medido en esta sesión: 3880 mensajes con ``usage`` sobre **1983 ids únicos**;
7660 duplicados idénticos contra 612 distintos. Sin deduplicar, el gasto por
agente sale **~2× inflado** (H-DOCS-136).

Por qué no se usan las cifras de la UI: la UI reporta un agregado cuya
composición no está documentada, y no coincide con la suma del transcript.
Este guion suma los cuatro componentes reales y los publica por separado,
para que nadie tenga que adivinar qué incluye una cifra:

    input_tokens · cache_creation_input_tokens · cache_read_input_tokens · output_tokens

El agregado comparable es ``equiv-input``, que pondera cada componente por su
precio relativo al input base (cache_read 0.1x, cache_creation 1.25x,
output 5x). Sumar los cuatro en crudo mezcla precios distintos y produce una
cifra que no significa nada — el ``cache_read`` acumulado llega a miles de
millones porque el contexto se relee en cada turno.

Uso:
    python3 .claude/scripts/agents/medir_usage_subagentes.py            # resumen por canal
    python3 .claude/scripts/agents/medir_usage_subagentes.py --por-agente
    python3 .claude/scripts/agents/medir_usage_subagentes.py --json
"""
import argparse
import collections
import glob
import json
import os
import pathlib
import statistics as st
import sys

# Peso relativo al input base. Son los cocientes de UN tier —tier_3_15 del
# catálogo (3 / 15 / w5m 3.75 / cr 0.3)— aplicados a todo modelo, y por eso
# NO son un precio (H-DOCS-1008): en tier_10_50_cache_read_0_25 la caché leída
# vale 0.025x del input, no 0.1x. Se conservan porque `equiv_cost` es una
# columna del store comparable entre filas; el USD lo da model_catalog.py con
# el catálogo vendorizado (.claude/packages/agent/models.json).
PESO = {'input': 1.0, 'cache_creation': 1.25, 'cache_read': 0.1, 'output': 5.0}


def raiz_subagentes() -> pathlib.Path | None:
    """Localiza el directorio subagents/ de la sesión más reciente."""
    proyectos = pathlib.Path.home() / '.claude' / 'projects'
    if not proyectos.is_dir():
        return None
    cands = [p for p in proyectos.glob('*/*/subagents') if p.is_dir()]
    if not cands:
        return None
    return max(cands, key=lambda p: p.stat().st_mtime)


CLAVE = {'input': 'input_tokens',
         'cache_creation': 'cache_creation_input_tokens',
         'cache_read': 'cache_read_input_tokens',
         'output': 'output_tokens'}


def medir(ruta: str) -> dict:
    """Suma los cuatro componentes de usage, deduplicando por ``message.id``.

    Un turno con varias herramientas emite varios mensajes ``assistant`` que
    comparten id y usage; sumarlos todos cuenta el turno N veces. Gana el
    último de cada id, según ``ccdoc: cost-tracking.md``.
    """
    por_id: dict = {}
    modelo: collections.Counter = collections.Counter()
    attr: collections.Counter = collections.Counter()
    try:
        fh = open(ruta, encoding='utf-8', errors='replace')
    except OSError:
        return {k: 0 for k in CLAVE} | {'turnos': 0, 'modelo': '?', 'attr': '?'}
    with fh:
        for linea in fh:
            linea = linea.strip()
            if not linea:
                continue
            try:
                obj = json.loads(linea)
            except ValueError:
                continue
            if obj.get('type') != 'assistant':
                continue
            msg = obj.get('message') or {}
            u = msg.get('usage') or {}
            if not u:
                continue
            por_id[msg.get('id')] = {k: u.get(c, 0) for k, c in CLAVE.items()}
            modelo[msg.get('model') or '?'] += 1
            attr[obj.get('attributionAgent') or '?'] += 1
    acc = {k: sum(v[k] for v in por_id.values()) for k in CLAVE}
    acc['turnos'] = len(por_id)
    # Dimensiones que la referencia sí lleva y nosotros no llevábamos: el
    # acumulador de coste del CLI es **por modelo** (hccw: 16-observability:177)
    # y el propio transcript atribuye cada mensaje a su tipo de agente.
    acc['modelo'] = modelo.most_common(1)[0][0] if modelo else '?'
    acc['attr'] = attr.most_common(1)[0][0] if attr else '?'
    return acc


def equiv(a: dict) -> float:
    """Tokens equivalentes a input base, ponderados por precio relativo."""
    return sum(PESO[k] * a[k] for k in PESO)


def recolectar(raiz: pathlib.Path) -> list[dict]:
    en_wf = {os.path.basename(p)[:-6]
             for p in glob.glob(str(raiz / 'workflows' / 'wf_*' / 'agent-*.jsonl'))}
    filas = []
    for p in sorted(glob.glob(str(raiz / 'agent-*.jsonl'))):
        aid = os.path.basename(p)[:-6]
        a = medir(p)
        if a['turnos'] == 0:          # agente que murió sin emitir un solo turno
            continue
        a['agente'] = aid
        a['canal'] = 'workflow' if aid in en_wf else 'directo'
        a['equiv'] = equiv(a)
        a['equiv_turno'] = a['equiv'] / a['turnos']
        filas.append(a)
    return filas


def resumen(filas: list[dict]) -> dict:
    out = {}
    for canal in ('directo', 'workflow'):
        L = [f for f in filas if f['canal'] == canal]
        if not L:
            continue
        eq = [f['equiv'] for f in L]
        et = [f['equiv_turno'] for f in L]
        tu = [f['turnos'] for f in L]
        out[canal] = {
            'agentes': len(L),
            'equiv_total': sum(eq),
            'equiv_por_agente_media': sum(eq) / len(L),
            'equiv_por_agente_mediana': st.median(eq),
            'equiv_por_turno_media': sum(et) / len(L),
            'equiv_por_turno_mediana': st.median(et),
            'turnos_media': sum(tu) / len(L),
            'turnos_mediana': st.median(tu),
            'output_total': sum(f['output'] for f in L),
        }
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--por-agente', action='store_true', help='una fila por subagente')
    ap.add_argument('--json', action='store_true', help='salida JSON')
    ap.add_argument('--raiz', help='directorio subagents/ explícito')
    args = ap.parse_args()

    raiz = pathlib.Path(args.raiz) if args.raiz else raiz_subagentes()
    if raiz is None or not raiz.is_dir():
        # No se emite un 0: un cero aquí sería un verde falso (H-DOCS-134).
        print('medir-usage-subagentes: ERROR — no se encontró subagents/. '
              'Sin transcripts NO se emite conteo.', file=sys.stderr)
        return 2

    filas = recolectar(raiz)
    if not filas:
        print(f'medir-usage-subagentes: 0 subagentes con usage bajo {raiz}', file=sys.stderr)
        return 2

    res = resumen(filas)
    if args.json:
        print(json.dumps({'raiz': str(raiz), 'resumen': res,
                          'agentes': filas if args.por_agente else []},
                         indent=2, ensure_ascii=False))
        return 0

    print(f'subagents/: {raiz}')
    print(f'(alcance medido: {len(filas)} subagentes con usage)\n')
    for canal, r in res.items():
        print(f'== {canal} ==  n={r["agentes"]}')
        print(f'   equiv-input por agente : media {r["equiv_por_agente_media"]:>12,.0f}'
              f'   mediana {r["equiv_por_agente_mediana"]:>12,.0f}')
        print(f'   equiv-input por TURNO  : media {r["equiv_por_turno_media"]:>12,.0f}'
              f'   mediana {r["equiv_por_turno_mediana"]:>12,.0f}')
        print(f'   turnos por agente      : media {r["turnos_media"]:>12,.1f}'
              f'   mediana {r["turnos_mediana"]:>12,.0f}')
        print(f'   output real            : {r["output_total"]:>12,}\n')

    if len(res) == 2:
        d, w = res['directo'], res['workflow']
        print(f'razón directo/workflow — por agente: '
              f'{d["equiv_por_agente_media"] / w["equiv_por_agente_media"]:.2f}x'
              f'   ·  por turno: '
              f'{d["equiv_por_turno_media"] / w["equiv_por_turno_media"]:.2f}x')
        print('Si la razón por turno es ~1 y la de por agente no, el canal no es la '
              'causa: lo es el número de turnos que corre cada agente.\n')

    # --- Dimensión por modelo -------------------------------------------------
    # La referencia acumula el coste POR MODELO porque los precios difieren
    # (hccw: 16-observability.md:177). Sin esta columna, una razón "por canal"
    # puede estar midiendo la mezcla de modelos de cada canal, no el canal.
    print('== por modelo ==')
    for mo in sorted({f['modelo'] for f in filas}):
        L = [f for f in filas if f['modelo'] == mo]
        print(f'   {mo:<20} n={len(L):>3}   equiv/turno media '
              f'{sum(f["equiv_turno"] for f in L) / len(L):>9,.0f}'
              f'   mediana {st.median([f["equiv_turno"] for f in L]):>9,.0f}')
    print('   AVISO: equiv-input pondera con UNA sola escala de precios; comparar '
          'modelos entre sí\n   con ella mezcla métricas. Sirve para controlar el '
          'confusor, no para tarifar.\n')

    # --- Canal con el modelo CONTROLADO ---------------------------------------
    dom = collections.Counter(f['modelo'] for f in filas).most_common(1)[0][0]
    S = [f for f in filas if f['modelo'] == dom]
    grupos = collections.Counter(f['attr'] for f in S)
    print(f'== canal con modelo controlado ({dom}) ==')
    for a, _ in grupos.most_common(2):
        L = [f for f in S if f['attr'] == a]
        print(f'   {a:<20} n={len(L):>3}   equiv/agente '
              f'{sum(f["equiv"] for f in L) / len(L):>11,.0f}'
              f'   equiv/turno {sum(f["equiv_turno"] for f in L) / len(L):>8,.0f}'
              f'   turnos {sum(f["turnos"] for f in L) / len(L):>6.1f}')

    if args.por_agente:
        print('\n  agente                     canal      turnos    equiv-input')
        for f in sorted(filas, key=lambda x: -x['equiv']):
            print(f'  {f["agente"]:<26} {f["canal"]:<10} {f["turnos"]:>6}  {f["equiv"]:>13,.0f}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
