#!/usr/bin/env python3
"""measure_delta — qué símbolos ganó o perdió el disco durante un subagente.

Porte del mecanismo de ``kaupamex-docs: .claude/hooks/medir_delta_subagente.py``.

Complementario al reporte final del agente, no redundante: aquél guarda **lo que
el agente dice**, éste mide **lo que quedó en el disco**. La diferencia importa
porque un agente cortado por ``maxTurns`` deja trabajo y no devuelve mensaje —
medido: 4 tool_uses, 240 708 tokens, salida vacía. Sin este par, ese trabajo es
invisible hasta que alguien lo busque a mano.

Lo que se INYECTA (DEC-04): **qué repos se miden** y **dónde va el log**. El
original componía el log con ``reach.root('docs')``, o sea el nombre de un
consumidor dentro del proveedor; aquí ``resolve_log`` rehúsa sin destino en vez
de fabricar uno.

El contrato de ``symbols`` viaja como está en la fuente —``class:X`` para las
clases, el nombre pelado para funciones y métodos—. Cambiarlo al portar sería
rebautizar el mecanismo, que es la forma de comportamiento del defecto que
``porte-completo-no-parcial.md`` prohíbe.
"""
import ast
import json
import os
import subprocess
import sys
from pathlib import Path


def resolve_log(results_dir) -> Path | None:
    """Dónde se apenda el delta. Es PARÁMETRO del consumidor.

    Devuelve ``None`` sin destino: thyrox no sabe en qué clon vive el log, y
    fabricar ``reach.root('docs')`` metería el nombre de un consumidor dentro
    del proveedor — el mismo defecto que ``register_session`` cerró para el
    store.
    """
    if not results_dir:
        return None
    base = Path(results_dir)
    base.mkdir(parents=True, exist_ok=True)
    return base / 'delta-de-agentes.md'


def diff_symbols(before: set, after: set) -> tuple[set, set]:
    """``(ganados, perdidos)``. Separado del recorrido para poder medirlo solo."""
    return after - before, before - after


def git(repo, *args):
    """Salida de un git en ``repo``; cadena vacía ante cualquier fallo."""
    try:
        r = subprocess.run(('git', '-C', repo) + args, capture_output=True,
                           text=True, timeout=20)
        return r.stdout if r.returncode == 0 else ''
    except Exception:
        return ''


def symbols(texto):
    """Nombres declarados en un fuente Python, por AST.

    Mismo criterio que ``pendientes_cascara.py``: ``class:X`` para las clases,
    el nombre pelado para funciones y métodos. Un archivo que no parsea devuelve
    conjunto vacío — no revienta la medición.
    """
    try:
        arbol = ast.parse(texto)
    except SyntaxError:
        return set()
    fuera = set()
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.ClassDef):
            fuera.add(f'class:{nodo.name}')
        elif isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
            fuera.add(nodo.name)
    return fuera


def estado(repo):
    """HEAD + porcelain de un repo, como par de cadenas."""
    return git(repo, 'rev-parse', 'HEAD').strip(), git(repo, 'status', '--porcelain')


def archivos_python(porcelain):
    """Rutas ``.py`` de una salida ``git status --porcelain``.

    Toma el campo de ruta tras los dos caracteres de estado, y en los renombres
    (``R  viejo -> nuevo``) se queda con el destino.
    """
    rutas = []
    for linea in porcelain.splitlines():
        if len(linea) < 4:
            continue
        ruta = linea[3:].strip()
        if ' -> ' in ruta:
            ruta = ruta.split(' -> ', 1)[1]
        if ruta.endswith('.py'):
            rutas.append(ruta.strip('"'))
    return rutas


def arrancar(payload, repos, results_dir):
    """Fotografía el estado de cada repo al ARRANCAR el subagente.

    ``repos`` y ``results_dir`` son parámetros del consumidor (DEC-04):
    thyrox no sabe qué árbol vigila un kaupamex-* ni dónde guarda su log.
    """
    os.makedirs(results_dir, exist_ok=True)
    base = {r: estado(ruta) for r, ruta in repos.items() if os.path.isdir(ruta)}
    destino = os.path.join(results_dir, f".base-{payload.get('agent_id', 'sin-id')}.json")
    with open(destino, 'w', encoding='utf-8') as fh:
        json.dump(base, fh)


def parar(payload, repos, results_dir):
    """Compara contra la fotografía y apenda el delta al log."""
    log = resolve_log(results_dir)
    if log is None:
        return
    agent_id = payload.get('agent_id', 'sin-id')
    tipo = payload.get('agent_type', '?')
    origen = os.path.join(results_dir, f'.base-{agent_id}.json')
    previo = {}
    if os.path.exists(origen):
        try:
            previo = json.load(open(origen, encoding='utf-8'))
        except Exception:
            previo = {}

    lineas = []
    for repo, ruta in repos.items():
        if not os.path.isdir(ruta):
            continue
        head, porcelain = estado(ruta)
        antes_head, antes_porcelain = previo.get(repo, ('', ''))

        nuevos = set(archivos_python(porcelain)) - set(archivos_python(antes_porcelain))
        commits = ''
        if antes_head and head != antes_head:
            commits = git(ruta, 'log', '--oneline', f'{antes_head}..{head}').strip()

        for archivo in sorted(nuevos):
            absoluto = os.path.join(ruta, archivo)
            try:
                ahora = symbols(open(absoluto, encoding='utf-8', errors='ignore').read())
            except OSError:
                ahora = set()
            antes = symbols(git(ruta, 'show', f'HEAD:{archivo}'))
            mas, menos = sorted(ahora - antes), sorted(antes - ahora)
            if mas or menos:
                detalle = ''
                if mas:
                    detalle += f" +{len(mas)} ({', '.join(mas[:8])}{'…' if len(mas) > 8 else ''})"
                if menos:
                    detalle += f" -{len(menos)} ({', '.join(menos[:8])}{'…' if len(menos) > 8 else ''})"
                lineas.append(f'- `{repo}: {archivo}`{detalle}')
            else:
                lineas.append(f'- `{repo}: {archivo}` — tocado, **0 símbolos** de diferencia')
        if commits:
            for c in commits.splitlines():
                lineas.append(f'- `{repo}` commit: {c}')

    if not lineas:
        lineas = ['- sin cambios en el disco']

    os.makedirs(results_dir, exist_ok=True)
    marca = subprocess.run(['date', '-u', '+%Y-%m-%dT%H:%M:%S'],
                           capture_output=True, text=True).stdout.strip()
    with open(log, 'a', encoding='utf-8') as fh:
        fh.write(f'\n## {marca} · `{tipo}` · `{agent_id}`\n\n')
        fh.write('\n'.join(lineas) + '\n')

    try:
        os.remove(origen)
    except OSError:
        pass


def main(argv=None):
    """Los parámetros llegan por línea de comandos; el consumidor los inyecta.

    ``--repo <nombre>=<ruta>`` (repetible) y ``--results-dir <ruta>``. Sin
    ninguno de los dos, rehúsa: medir un árbol que nadie declaró mediría el
    equivocado, y publicarlo como delta sería peor que no publicar nada.
    """
    argv = list(sys.argv[1:] if argv is None else argv)
    modo = '--start' if '--start' in argv else '--stop'

    repos = {}
    results_dir = None
    i = 0
    while i < len(argv):
        if argv[i] == '--repo' and i + 1 < len(argv) and '=' in argv[i + 1]:
            nombre, ruta = argv[i + 1].split('=', 1)
            repos[nombre] = ruta
            i += 2
        elif argv[i] == '--results-dir' and i + 1 < len(argv):
            results_dir = argv[i + 1]
            i += 2
        else:
            i += 1

    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    if not repos or not results_dir:
        print('measure_delta: faltan parámetros del consumidor '
              '(--repo <n>=<ruta> … --results-dir <ruta>)', file=sys.stderr)
        print('{}')
        return

    try:
        if modo == '--start':
            arrancar(payload, repos, results_dir)
        else:
            parar(payload, repos, results_dir)
    except Exception:
        pass
    print('{}')


if __name__ == '__main__':
    main()
    sys.exit(0)
