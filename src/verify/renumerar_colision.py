#!/usr/bin/env python3
"""Renumera la colisión de etiqueta de un merge, en el árbol de trabajo (#71).

``check_ids_entre_ramas.py`` DETECTA la colisión que git no ve —dos ramas que
declaran ``.. _h-<capa>-NNN:`` en archivos distintos fusionan sin conflicto
textual y rompen el build Sphinx—. Este guion la RESUELVE, mecánicamente: no
hay nada de contenido que decidir, sólo qué lado renumera.

La regla es determinista: renumera el lado ``source`` (la rama que se integra).
El destino conserva su etiqueta y sus refs establecidas; el archivo entrante
toma el primer ID libre de su capa. Es la misma elección que un humano hizo a
mano en la colisión h-docs-1025 (l3 → 1030), ahora sin humano.

Opera sobre el ÁRBOL DE TRABAJO ya fusionado (``git merge --no-commit`` hecho):
los dos archivos de la colisión están presentes en rutas distintas. Reusa
``declaraciones()`` de ``check_ids_entre_ramas`` —no reimplementa el criterio
ruta-no-rama (``calibration-verified-numbers``: sin segunda fuente de verdad)—.

*Métrica:* etiquetas ``h-<capa>-NNN`` presentes en ``source`` y ``target`` en
rutas distintas; el ID libre sale del máximo usado en TODAS las refs remotas.
*Ciega a:* una colisión cuyo archivo declarante no codifique el ID en su nombre
(se renumera la etiqueta y las refs, no se renombra el archivo — se declara en
``renamed:null``); y a un ``:ref:`` cruzado desde el destino a la etiqueta del
origen, imposible por construcción (el destino no conocía esa etiqueta).
"""
import argparse
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_ids_entre_ramas import PATRON_GREP, declaraciones  # noqa: E402

CAPAS = ('api', 'docs', 'ui', 'db', 'server')
RE_LABEL = re.compile(r'\.\. _h-(api|docs|ui|db|server)-(\d+):')


def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True, check=False)


def refs_remotas():
    out = git('for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin').stdout
    return [r for r in out.split() if not r.endswith('/HEAD')]


def id_libre(capa, reservados=frozenset()):
    """Primer ID libre de la capa entre TODAS las refs remotas (mismo criterio
    que ``check_ids_entre_ramas.py --siguiente``), evitando los ya asignados en
    este run —que aún no están en ninguna ref remota— para no re-colisionar."""
    usados = set(reservados)
    patron = re.compile(rf'_h-{capa}-(\d+):')
    for ref in refs_remotas():
        out = git('grep', '-ohE', PATRON_GREP, ref, '--', 'source/').stdout
        usados.update(int(m.group(1)) for m in patron.finditer(out))
    return (max(usados) + 1) if usados else None


def archivos_que_citan(ref, capa, num):
    """Rutas en ``ref`` que mencionan el ID en cualquier forma (h-… o H-…)."""
    out = git('grep', '-liE', rf'\bh-{capa}-{num}\b', ref, '--', 'source/').stdout
    return {ln.split(':', 1)[-1] for ln in out.splitlines() if ln.strip()}


def ajustar_subrayado(path, capa, newnum):
    """Si el encabezado renumerado cambió de longitud, iguala su subrayado.

    RST exige subrayado ≥ longitud del título; 1025→1030 no cambia, 999→1000 sí.
    """
    lineas = path.read_text(encoding='utf-8').splitlines(keepends=True)
    cabecera = re.compile(rf'^H-{capa.upper()}-{newnum}\b')
    for i, ln in enumerate(lineas[:-1]):
        if cabecera.match(ln):
            titulo = ln.rstrip('\n')
            sub = lineas[i + 1].rstrip('\n')
            if sub and len(set(sub)) == 1 and not sub[0].isalnum() and len(sub) != len(titulo):
                lineas[i + 1] = sub[0] * len(titulo) + '\n'
    path.write_text(''.join(lineas), encoding='utf-8')


def main(argv=None):
    from pathlib import Path
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--source', required=True, help='ref del origen que se integra')
    ap.add_argument('--target', required=True, help='ref del destino')
    ap.add_argument('--json', action='store_true', help='emite el resultado como JSON en stdout')
    a = ap.parse_args(argv)

    src = declaraciones(a.source)
    tgt = declaraciones(a.target)
    hecho = []
    reservados = {}  # capa -> {ids asignados en este run}

    for etiqueta, rutas_src in src.items():
        rutas_tgt = tgt.get(etiqueta, set())
        if len(rutas_src | rutas_tgt) <= 1:
            continue  # misma ruta en ambas = historia compartida, no colisión
        src_only = rutas_src - rutas_tgt
        if not src_only:
            continue  # nada exclusivo del origen que renumerar
        m = RE_LABEL.match(etiqueta)
        if not m:
            continue
        capa, oldnum = m.group(1), m.group(2)
        newnum = id_libre(capa, reservados.get(capa, frozenset()))
        if newnum is None:
            print(f'AVISO — sin universo de IDs para capa {capa}; no se renumera '
                  f'{etiqueta}', file=sys.stderr)
            continue
        reservados.setdefault(capa, set()).add(newnum)
        newnum = str(newnum)

        low_old, low_new = f'h-{capa}-{oldnum}', f'h-{capa}-{newnum}'
        up_old, up_new = f'H-{capa.upper()}-{oldnum}', f'H-{capa.upper()}-{newnum}'

        # Archivos a editar: los del ORIGEN que citan el ID y no están en el destino.
        citan_src = archivos_que_citan(a.source, capa, oldnum)
        citan_tgt = archivos_que_citan(a.target, capa, oldnum)
        a_editar = citan_src - citan_tgt

        renamed = None
        # El archivo declarante: renómbralo si su nombre codifica el ID.
        for decl in src_only:
            if up_old in os.path.basename(decl):
                nuevo = decl.replace(up_old, up_new)
                if git('mv', decl, nuevo).returncode == 0:
                    renamed = [decl, nuevo]
                    a_editar = {nuevo if p == decl else p for p in a_editar}

        refs_editadas = []
        for rel in sorted(a_editar):
            p = Path(rel)
            if not p.exists():
                continue
            texto = p.read_text(encoding='utf-8')
            nuevo_txt = texto.replace(low_old, low_new).replace(up_old, up_new)
            if nuevo_txt != texto:
                p.write_text(nuevo_txt, encoding='utf-8')
                refs_editadas.append(rel)
        if renamed:
            ajustar_subrayado(Path(renamed[1]), capa, newnum)

        hecho.append({
            'label': etiqueta,
            'newLabel': f'.. _{low_new}:',
            'renamed': renamed,
            'refsEdited': refs_editadas,
        })

    if a.json:
        print(json.dumps(hecho))
    else:
        for h in hecho:
            print(f"{h['label']} -> {h['newLabel']}  (renamed={h['renamed']}, "
                  f"refs={len(h['refsEdited'])})")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
