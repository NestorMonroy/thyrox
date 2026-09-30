#!/usr/bin/env python3
"""Quien invoca cada guion de `src/gates/`, antes de moverlo.

Un reparto que rompa el cableado deja gates que nadie corre, que es la deuda
que TASK-THYROX-0245 ya nombra —«1 de N esta cableado y el resto es prosa con
exit 1»— y la forma en que ERR-13 ya nos costo una sesion: un agente murio
dejando dos gates sin correr y nadie lo noto hasta reconciliar.

Se busca el BASENAME y no la ruta: la ruta es justo lo que la mudanza cambia,
asi que un censo por ruta mediria el estado de antes y no el de despues.

Metrica: citas del basename de cada archivo de `src/gates/` en los seis
arboles, clasificadas en ejecutable contra mencion.
Ciega a: una invocacion compuesta en tiempo de ejecucion (`bash "$D/$n"`), que
no lleva el basename literal; un guion alcanzado por glob, que se reporta
aparte; el veredicto de destino, que es juicio de dominio y no medicion.
"""
import re
import subprocess
import sys
from pathlib import Path

THYROX = Path('/home/user/thyrox')
GATES = THYROX / 'src' / 'gates'
ARBOLES = [THYROX] + [Path(f'/home/user/kaupamex-{r}')
                      for r in ('docs', 'api', 'db', 'server', 'ui')]
# Una cita es EJECUTABLE si el basename va precedido de un interprete, o si es
# el valor de la clave `command` de un hook.
EJECUTA = re.compile(
    r'(?:\b(?:bash|sh|python3?|uv run python|source|\.)\s+\S*|"command"\s*:\s*"[^"]*)$')
PROSA = {'.rst', '.md', '.txt'}


def citas(nombre: str) -> list[tuple[str, str, bool]]:
    """Cada linea que nombra el basename, con su arbol y si parece ejecutable."""
    fuera = []
    for arbol in ARBOLES:
        if not arbol.is_dir():
            continue
        r = subprocess.run(
            ['git', 'grep', '-nI', '--fixed-strings', nombre],
            cwd=arbol, capture_output=True, text=True)
        for linea in r.stdout.splitlines():
            try:
                ruta, _, texto = linea.split(':', 2)
            except ValueError:
                continue
            if ruta.startswith('src/gates/') and arbol == THYROX:
                continue                      # el propio directorio no cuenta
            antes = texto[:texto.index(nombre)] if nombre in texto else ''
            ejecutable = bool(EJECUTA.search(antes)) and Path(ruta).suffix not in PROSA
            fuera.append((arbol.name, ruta, ejecutable))
    return fuera


def main() -> int:
    archivos = sorted(f for f in GATES.iterdir()
                      if f.is_file() and f.suffix in ('.py', '.sh', '.txt', '.json', '.tsv'))
    print(f'archivos en src/gates/: {len(archivos)}')
    # Quien recorre el directorio entero por glob, que alcanza a todos a la vez.
    porglob = subprocess.run(
        ['git', 'grep', '-nI', '-e', 'src/gates/', '--', ':!src/gates'],
        cwd=THYROX, capture_output=True, text=True).stdout.splitlines()
    print(f'citas al DIRECTORIO src/gates/ (alcanzan a todos): {len(porglob)}')
    for l in porglob:
        print('   ', l[:150])
    con_ejec, solo_mencion, huerfanos = [], [], []
    for f in archivos:
        c = citas(f.name)
        if any(e for _, _, e in c):
            con_ejec.append((f.name, [(a, r) for a, r, e in c if e]))
        elif c:
            solo_mencion.append((f.name, len(c)))
        else:
            huerfanos.append(f.name)
    print(f'\nCON INVOCADOR EJECUTABLE: {len(con_ejec)}')
    for n, d in con_ejec:
        print(f'  {n}')
        for a, r in sorted(set(d))[:6]:
            print(f'      {a}: {r}')
    print(f'\nSOLO MENCIONADO (prosa, sin invocador): {len(solo_mencion)}')
    for n, k in solo_mencion:
        print(f'  {n}  ({k} citas)')
    print(f'\nSIN NINGUNA CITA: {len(huerfanos)}')
    for n in huerfanos:
        print(f'  {n}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
