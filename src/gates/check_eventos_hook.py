#!/usr/bin/env python3
"""El nombre del evento con que un hook se declara, contra los que el
ejecutable enumera.

Un nombre mal escrito en `settings.json` no produce error: el hook no
dispara, y el gate que aloja deja de correr sin que nada lo diga. Es el
hermano de la tarea #711 —rutas de hook rotas—, que sí ocurrió: allí el
script no existía; aquí el evento no existe.

La forma se adapta de `hookTypeGuards.test.ts` del corpus `ccb`, cuyo
`isHookEvent` guarda la misma frontera: «aceptar un string desconocido como
HookEvent deja que la configuración derive en silencio».

El universo NO se escribe a mano: se deriva del ejecutable, tomando los
nombres de las secuencias de literales adyacentes que contienen un ancla
—`PreToolUse` o `SubagentStop`—. La semilla son esos dos nombres, no una
lista; comparar contra una lista escrita es el defecto que la tarea #703
registra.

Métrica: nombres de evento en el bloque `hooks` de cada `settings*.json`,
contra los nombres de esas secuencias del binario indicado.
Ciega a: si un nombre de la secuencia es de hook o de otra unión del cliente
— el binario mezcla varias, así que el universo es un SUPERCONJUNTO. El error
cae del lado seguro (nunca bloquea un evento válido) y por eso un typo que
coincida con otra unión pasaría. Y ciega al evento que el binario declare en
una secuencia de un solo elemento.
"""
import json
import os
import re
import subprocess
import sys

REPOS = ['docs', 'api', 'ui', 'db', 'server']
ARBOL = '/home/user'
BASE_REPOS = ARBOL + '/kaupamex-'
# Las dos anclas: nombres cuya condición de evento de hook no está en duda.
ANCLAS = ('PreToolUse', 'SubagentStop')
SECUENCIA = re.compile(r'"[A-Z][A-Za-z]+"(?:,"[A-Z][A-Za-z]+")+')


def universo_del_binario(ruta):
    """Los nombres de las secuencias literales que contienen un ancla."""
    try:
        salida = subprocess.run(
            ['strings', '-n', '4', ruta],
            capture_output=True, text=True, errors='ignore', check=True,
        ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f'ERROR — no se pudo leer {ruta}: {exc}', file=sys.stderr)
        raise SystemExit(2)
    nombres = set()
    for secuencia in SECUENCIA.findall(salida):
        miembros = [m.strip('"') for m in secuencia.split(',')]
        if any(a in miembros for a in ANCLAS):
            nombres.update(miembros)
    return nombres


def version_del_binario(ruta):
    """La build se deriva del contenido, no de `claude --version`."""
    try:
        salida = subprocess.run(
            ['strings', '-n', '4', ruta],
            capture_output=True, text=True, errors='ignore', check=True,
        ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return 'desconocida'
    conteo = {}
    for v in re.findall(r'\b\d+\.\d+\.\d+\b', salida):
        conteo[v] = conteo.get(v, 0) + 1
    return max(conteo, key=conteo.get) if conteo else 'desconocida'


def eventos_declarados(raices):
    """Por raíz: los nombres de evento del bloque `hooks` de sus settings.

    Devuelve también los archivos efectivamente leídos: un conteo de raíces
    PEDIDAS no delata una raíz con hooks que nadie miró, y ése fue el defecto
    (H-DOCS-479).
    """
    declarados = {}
    leidos = []
    for raiz in dict.fromkeys(raices):
        for nombre in ('settings.json', 'settings.local.json'):
            ruta = f'{raiz}/.claude/{nombre}'
            try:
                with open(ruta, encoding='utf-8') as fh:
                    datos = json.load(fh)
            except (FileNotFoundError, json.JSONDecodeError):
                continue
            leidos.append(ruta)
            for evento in (datos.get('hooks') or {}):
                declarados.setdefault(evento, []).append(ruta)
    return declarados, leidos


def main(argv):
    estricto = '--strict' in argv
    quieto = '--quiet' in argv
    binario = None
    raices = []
    for i, arg in enumerate(argv):
        if arg == '--binario' and i + 1 < len(argv):
            binario = argv[i + 1]
        if arg == '--repo' and i + 1 < len(argv):
            raices.append(argv[i + 1])
    if binario is None:
        binario = subprocess.run(['readlink', '-f',
                                  subprocess.run(['which', 'claude'],
                                                 capture_output=True,
                                                 text=True).stdout.strip()],
                                 capture_output=True, text=True).stdout.strip()
    if not raices:
        # Las cinco raíces de repositorio MÁS el árbol de trabajo y HOME.
        #
        # La copia que el cliente ejecuta NO es un settings de repositorio: es
        # `/home/user/.claude/settings.local.json`, que `session/
        # sincronizar_settings_local.py` mantiene contra el repositorio por
        # comparación de tres vías con base. Un nombre de evento mal escrito
        # ahí no dispara aunque el repositorio esté correcto, así que el
        # alcance del gate tiene que incluirla.
        #
        # La primera versión leía sólo las cinco de repositorio y esa copia
        # —10 eventos— quedaba fuera: su verde no distinguía «no hay typos» de
        # «no medí donde están los hooks» (H-DOCS-479).
        raices = [BASE_REPOS + r for r in REPOS]
        raices += [ARBOL, os.path.expanduser('~')]

    universo = universo_del_binario(binario)
    if not universo:
        print('ERROR — no se derivó ningún evento del binario. Sin universo '
              'no hay veredicto: un 0 aquí sería un verde falso, no una '
              'ausencia de typos.', file=sys.stderr)
        return 2

    declarados, leidos = eventos_declarados(raices)
    desconocidos = {e: f for e, f in declarados.items() if e not in universo}
    sin_consumir = sorted(universo - set(declarados))

    if quieto:
        # Sin universo no se llega aquí (return 2 arriba), así que un conteo
        # vacío en el audit significa «no pude medir», no «no hay typos».
        print(len(desconocidos))
        return 1 if (estricto and desconocidos) else 0

    print(f'check-eventos-hook: {len(desconocidos)} evento(s) desconocido(s)')
    print(f'  (universo derivado del binario: {len(universo)} nombre(s), '
          f'build {version_del_binario(binario)}; universo declarado: '
          f'{len(declarados)} en {len(leidos)} de {len(raices)} raíz/raíces)')
    for ruta in leidos:
        print(f'      leído: {ruta}')
    for evento, archivos in sorted(desconocidos.items()):
        print(f'  DESCONOCIDO {evento!r} — {", ".join(archivos)}')
    if sin_consumir:
        print(f'  sin consumir ({len(sin_consumir)}): '
              f'{", ".join(sin_consumir)}')

    return 1 if (estricto and desconocidos) else 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
