#!/usr/bin/env python3
"""Los cuatro cubos de una ruta citada, medidos con el SUJETO, no con una sonda.

`verificar_premisa.py` se importa entero: su `FILE_PATH` esta anclado con `\\b`
y no con `^`, asi que captura SUFIJOS. Un censo por primer segmento mide otro
fenomeno —el sub-patron A— y publica «48.6 % ciegas» cuando el defecto que
importa es otro: una cita de la REFERENCIA cuyo sufijo resuelve contra NUESTRO
arbol, que S2 lee como premisa envejecida de codigo propio.

Los cubos:
  not_captured      la regex no la ve — silencio, sin veredicto
  full_resolves     capturada entera y resuelve — el caso sano
  suffix_resolves   capturada como sufijo y resuelve: puede ser correcto por
                    accidente (thyrox/src/x.py) o FALSO (odoo19c: odoo/... que
                    resuelve contra addons/ de api)
  suffix_fails      capturada como sufijo y no resuelve — S2 emite senal sobre
                    un arbol que no es el citado

Metrica: citas con forma de archivo en las fichas de la sesion activa,
clasificadas por lo que `FILE_PATH` captura y `resolve_path` resuelve.
Ciega a: una cita sin extension declarada, y a si el autor de la ficha queria
hablar de nuestro arbol o del ajeno — eso lo dice el prefijo, que este censo
registra pero no juzga.
"""
import collections
import glob
import json
import os
import re
import sys

LOCATOR = os.environ.get('THYROX_LOCATOR', 'src/paths/reach.py')


def thyrox_root():
    """La raiz por ascenso hasta el localizador, no por conteo de saltos.

    La primera version de este censo contaba cuatro `dirname` y aterrizaba en
    `.claude/`: el mismo defecto que H-THYROX-55, cometido en el guion escrito
    para medir otro. Un banco puede anidarse mas hondo y el numero cambia.
    """
    declared = os.environ.get('THYROX_ROOT')
    if declared:
        return declared
    here = os.path.dirname(os.path.abspath(__file__))
    while here != '/' and not os.path.isfile(os.path.join(here, LOCATOR)):
        here = os.path.dirname(here)
    return here


ROOT = thyrox_root()
sys.path.insert(0, os.path.join(ROOT, 'src', 'verify'))
sys.path.insert(0, ROOT)
import verificar_premisa as subject  # noqa: E402

#: Toda cita con forma de archivo, SIN la lista cerrada: el denominador real.
ANY_PATH = re.compile(
    r'([\w.-]+(?:/[\w.-]+)+'
    r'\.(?:py|sh|rst|js|jsx|ts|tsx|mjs|sql|conf|json|md|txt|xml|yml|yaml|csv))')

#: El prefijo que declara el arbol, tal como el corpus ya lo escribe.
DECLARED_PREFIX = re.compile(r'([\w.-]+):\s*$')


def active_session():
    """La sesion con mas fichas — la misma que el sujeto elige."""
    root = os.path.expanduser('~/.claude/tasks')
    dirs = [os.path.join(root, n) for n in os.listdir(root)]
    dirs = [d for d in dirs if os.path.isdir(d)]
    return max(dirs, key=lambda d: len(glob.glob(os.path.join(d, '*.json'))))


def classify(text):
    """Un cubo por cita, con el prefijo declarado que la precede."""
    captured = {m.group(1) for m in subject.FILE_PATH.finditer(text)}
    rows = []
    for m in ANY_PATH.finditer(text):
        cited = m.group(1)
        before = text[max(0, m.start() - 40):m.start()]
        prefix_match = DECLARED_PREFIX.search(before)
        prefix = prefix_match.group(1) if prefix_match else ''
        inside = next((c for c in captured if cited.endswith(c)), None)
        if inside is None:
            bucket = 'not_captured'
        elif inside == cited:
            bucket = 'full_resolves' if subject.resolve_path(inside) \
                else 'full_fails'
        else:
            bucket = 'suffix_resolves' if subject.resolve_path(inside) \
                else 'suffix_fails'
        rows.append((bucket, prefix, cited, inside))
    return rows


def main():
    session = active_session()
    rows = []
    for f in glob.glob(os.path.join(session, '*.json')):
        try:
            task = json.load(open(f, encoding='utf-8'))
        except (OSError, ValueError):
            continue
        rows += classify(subject.task_text(task))

    buckets = collections.Counter(r[0] for r in rows)
    total = len(rows)
    print(f"sesion: {session}")
    print(f"citas con forma de archivo: {total}")
    for name in ('not_captured', 'full_resolves', 'full_fails',
                 'suffix_resolves', 'suffix_fails'):
        n = buckets[name]
        print(f"  {name:<18} {n:>4}  ({100 * n / total:.1f} %)")

    print("\n=== el cubo que decide: capturada como SUFIJO, con su prefijo")
    for name in ('suffix_resolves', 'suffix_fails'):
        by_prefix = collections.Counter(r[1] or '(sin prefijo)'
                                        for r in rows if r[0] == name)
        print(f"\n{name}:")
        for prefix, n in by_prefix.most_common(12):
            print(f"   {prefix:<22} {n:>4}")

    print("\n=== muestra de FALSOS: cita de referencia que resuelve en NUESTRO arbol")
    shown = 0
    for bucket, prefix, cited, inside in rows:
        if bucket == 'suffix_resolves' and prefix and prefix != '(sin prefijo)':
            print(f"   {prefix}: {cited}")
            print(f"      -> capturado {inside!r} -> {subject.resolve_path(inside)}")
            shown += 1
            if shown >= 6:
                break


if __name__ == '__main__':
    main()
