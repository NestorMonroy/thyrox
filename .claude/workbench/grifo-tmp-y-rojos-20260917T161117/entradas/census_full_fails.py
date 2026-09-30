#!/usr/bin/env python3
"""Que son las 239 citas capturadas ENTERAS que no resuelven en ninguna raiz.

El censo de cubos las destapo como el cubo dominante (40.7 %), no la lista
cerrada. Sobre ellas S2 SI emite veredicto — «premisa envejecida»— asi que la
pregunta no es de ceguera sino de si el veredicto es correcto.

Metrica: las citas del cubo `full_fails`, agrupadas por su primer segmento y
por el prefijo declarado que las precede.
Ciega a: si la ficha hablaba del pasado a proposito (una cita historica es
correcta y no resuelve), que es juicio de contenido y no de forma.
"""
import collections
import glob
import json
import os
import re
import sys

LOCATOR = os.environ.get('THYROX_LOCATOR', 'src/paths/reach.py')


def thyrox_root():
    """Raiz por ascenso hasta el localizador."""
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

ANY_PATH = re.compile(
    r'([\w.-]+(?:/[\w.-]+)+'
    r'\.(?:py|sh|rst|js|jsx|ts|tsx|mjs|sql|conf|json|md|txt|xml|yml|yaml|csv))')
DECLARED_PREFIX = re.compile(r'([\w.-]+):\s*$')


def active_session():
    root = os.path.expanduser('~/.claude/tasks')
    dirs = [d for d in (os.path.join(root, n) for n in os.listdir(root))
            if os.path.isdir(d)]
    return max(dirs, key=lambda d: len(glob.glob(os.path.join(d, '*.json'))))


def main():
    fails = []
    for f in glob.glob(os.path.join(active_session(), '*.json')):
        try:
            task = json.load(open(f, encoding='utf-8'))
        except (OSError, ValueError):
            continue
        text = subject.task_text(task)
        captured = {m.group(1) for m in subject.FILE_PATH.finditer(text)}
        for m in ANY_PATH.finditer(text):
            cited = m.group(1)
            if cited not in captured or subject.resolve_path(cited):
                continue
            before = text[max(0, m.start() - 40):m.start()]
            pm = DECLARED_PREFIX.search(before)
            fails.append((pm.group(1) if pm else '', cited))

    print(f"full_fails: {len(fails)}")
    print("\n=== por primer segmento")
    for seg, n in collections.Counter(
            c.split('/')[0] for _, c in fails).most_common(12):
        print(f"   {seg:<16} {n:>4}")
    print("\n=== por prefijo declarado")
    for pre, n in collections.Counter(
            p or '(sin prefijo)' for p, _ in fails).most_common(12):
        print(f"   {pre:<22} {n:>4}")
    print("\n=== muestra SIN prefijo (las que S2 juzga sin saber de que arbol son)")
    for pre, cited in [x for x in fails if not x[0]][:14]:
        print(f"   {cited}")


if __name__ == '__main__':
    main()
