#!/usr/bin/env python3
"""Gate #11 — convenciones de autoría y de tabla en los artefactos RST.

Origen: dos correcciones del ejecutor en la sesión 2026-08-07, ambas sobre el
mismo archivo recién escrito y ambas detectadas **por él, no por un gate**:

1. ``:autor: claude`` donde el canon es ``Equipo Kaupamex``.
2. tablas escritas en forma **simple** (``====  ====``) donde el repo usa
   ``.. list-table::`` en 2199 archivos contra 8.

Es la forma que ``formas-probadas.rst`` §6 ya tiene medida: la prosa de la
convención existía en ``auto-audit-before-writing.md`` y en ``metadata-standards.md``,
y no previno ninguna de las dos. Sólo un gate en el flujo lo hace.

Qué mide
--------

**Autoría.** ``:autor:`` cuyo valor no esté en el canon. El canon NO es un
valor único: ``metadata-standards.md`` admite el autor humano, y hay
traducciones con autoría de tercero. Lo que el gate persigue es el **nombre
del agente** escrito como autor — ``claude`` y sus variantes — que es el
defecto real y es el que reincide.

**Tablas.** Tabla *simple* (fila de ``=``) y tabla *grid* (``+---+``) fuera de
bloques literales. La *list-table* es la forma del repo por 2199 a 15.

Métrica: líneas de artefacto RST bajo ``source/``.
Ciega a: una list-table mal formada (columnas que no cuadran) — eso lo ve el
build, no este gate; y una tabla simple **correcta** que alguien escriba a
propósito: el gate no distingue intención, por eso es WARN y no FAIL.

Alcance prospectivo
-------------------

Al escribirse, el conteo heredado era de 1072 ``:autor: claude`` en 1068
archivos — deuda de meses, no de este pase. El gate arranca en modo
**surfacing** por el mismo criterio con que arrancaron DEC-AM-01 y el gate #9:
marcar rojo el día 1 por deuda ajena es lo que vuelve a un gate ruido que se
ignora. ``--nuevos`` acota a lo que el árbol de trabajo toca, que es donde el
gate sí puede exigir hoy.

Uso
---

    python3 .claude/scripts/gates/check_rst_convenciones.py            # reporte
    python3 .claude/scripts/gates/check_rst_convenciones.py --quiet    # sólo el conteo
    python3 .claude/scripts/gates/check_rst_convenciones.py --nuevos   # sólo archivos modificados vs HEAD
    python3 .claude/scripts/gates/check_rst_convenciones.py --strict   # exit 1 si hay incumplidores
    python3 .claude/scripts/gates/check_rst_convenciones.py A.rst dir/ # sólo esas rutas

Acotar por ruta (#482)
----------------------

Hasta 2026-08-18 el guion leía **sólo banderas**: un argumento posicional se
descartaba en silencio y el barrido recorría los 4019 ``.rst`` del árbol. Quien
quisiera medir el archivo que acababa de escribir recibía el veredicto del
repo entero, con la deuda heredada de meses mezclada dentro. Los positionales
ahora acotan el alcance, y una ruta inexistente o que no sea ``.rst`` **aborta**
en vez de reducir el alcance sin decirlo.
"""
import pathlib
import re
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "paths"))
import reach  # noqa: E402

#: `parents[3] / 'source'` daba `/home/user/source`, que no existe. Medido con
#: el control de anulación: el gate NO rehusaba — publicaba
#: `OK — autoría canónica y tablas en list-table (alcance medido: 0 archivos)`.
#: Un verde sobre cero archivos, con su denominador declarado y nadie leyéndolo.
RAIZ = reach.consumer_root() / 'source'

#: Valor que el agente NUNCA debe escribir como autor. El canon positivo es
#: ``Equipo Kaupamex``; el resto de valores humanos o de tercero son legítimos
#: y no se persiguen (ver "Qué mide").
AUTOR_AGENTE = re.compile(
    r'^\s*:autor:\s*(claude|Claude|claude-[\w.-]+|asistente|AI|IA)\s*$'
)
AUTOR_CUALQUIERA = re.compile(r'^\s*:autor:\s*(.+?)\s*$')

#: Tabla simple: dos o más columnas de ``=`` separadas por espacios.
TABLA_SIMPLE = re.compile(r'^\s*=+(?:\s+=+)+\s*$')
#: Tabla grid: la línea de borde ``+---+---+``.
TABLA_GRID = re.compile(r'^\s*\+(?:-+\+)+\s*$')

DIRECTIVA_LITERAL = re.compile(
    r'^(\s*)\.\.\s+(?:code-block|code|literalinclude|highlight|raw)::'
)


def sin_bloques_literales(texto):
    """Devuelve las líneas con los bloques literales sustituidos por vacío.

    Conserva la numeración: cada línea suprimida se reemplaza por ``''``, no se
    borra. Así el número de línea que reporta el gate sigue siendo el del
    archivo. Mismo criterio que ``check_rst_referencias.py`` (tarea #173):
    ``parsed-literal`` NO se salta, es el único donde Sphinx interpreta roles.
    """
    lineas = texto.splitlines()
    salida = []
    dentro = False
    sangria_bloque = 0
    for linea in lineas:
        if dentro:
            if linea.strip() == '':
                salida.append('')
                continue
            sangria = len(linea) - len(linea.lstrip())
            if sangria > sangria_bloque:
                salida.append('')
                continue
            dentro = False
        m = DIRECTIVA_LITERAL.match(linea)
        if m:
            dentro = True
            sangria_bloque = len(m.group(1))
            salida.append('')
            continue
        if linea.rstrip().endswith('::') and linea.strip() != '::':
            # bloque literal por doble dos-puntos
            dentro = True
            sangria_bloque = len(linea) - len(linea.lstrip())
            salida.append(linea)
            continue
        salida.append(linea)
    return salida


def archivos_modificados():
    """Los ``.rst`` bajo ``source/`` que difieren de HEAD (staged o no)."""
    repo = RAIZ.parent
    try:
        out = subprocess.run(
            ['git', '-C', str(repo), 'status', '--porcelain', '--', 'source'],
            capture_output=True, text=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    rutas = []
    for linea in out.splitlines():
        ruta = linea[3:].strip().strip('"')
        if ' -> ' in ruta:
            ruta = ruta.split(' -> ', 1)[1]
        if ruta.endswith('.rst'):
            p = repo / ruta
            if p.exists():
                rutas.append(p)
    return rutas


def rutas_pedidas(argv):
    """Expande los argumentos posicionales a una lista de ``.rst`` existentes.

    Un directorio se expande recursivamente; un ``.rst`` entra tal cual.
    Una ruta inexistente, o un archivo que no es ``.rst``, **aborta** en vez de
    ignorarse: un gate que recorta su alcance en silencio publica un cero que
    no distingue "limpio" de "no medido" — el defecto que #211 ya corrigió en
    los tres guiones con fallback silencioso.
    """
    encontrados = []
    for arg in argv:
        p = pathlib.Path(arg)
        if not p.exists():
            raise SystemExit(f'check-rst-convenciones: no existe: {arg}')
        if p.is_dir():
            hallados = sorted(p.rglob('*.rst'))
            if not hallados:
                raise SystemExit(
                    f'check-rst-convenciones: sin .rst bajo el directorio: {arg}')
            encontrados.extend(hallados)
        elif p.suffix == '.rst':
            encontrados.append(p.resolve())
        else:
            raise SystemExit(f'check-rst-convenciones: no es un .rst: {arg}')
    return sorted(set(encontrados))


def main():
    quiet = '--quiet' in sys.argv
    strict = '--strict' in sys.argv
    solo_nuevos = '--nuevos' in sys.argv
    posicionales = [a for a in sys.argv[1:] if not a.startswith('-')]

    if posicionales and solo_nuevos:
        raise SystemExit(
            'check-rst-convenciones: --nuevos y las rutas explícitas son '
            'excluyentes; elige una de las dos formas de acotar')

    if posicionales:
        objetivo = rutas_pedidas(posicionales)
        etiqueta_alcance = 'archivos .rst pedidos por ruta'
    elif solo_nuevos:
        objetivo = archivos_modificados()
        if objetivo is None:
            print('check-rst-convenciones: git no disponible; --nuevos no aplica')
            return 0
        etiqueta_alcance = 'archivos modificados vs HEAD'
    else:
        objetivo = sorted(RAIZ.rglob('*.rst'))
        etiqueta_alcance = 'archivos .rst bajo source/'

    fallos_autor = []
    fallos_tabla = []
    con_autor = 0

    for ruta in objetivo:
        try:
            texto = ruta.read_text(encoding='utf-8')
        except (OSError, UnicodeDecodeError):
            continue
        try:
            rel = ruta.relative_to(RAIZ.parent)
        except ValueError:
            rel = ruta

        for n, linea in enumerate(texto.splitlines(), 1):
            if AUTOR_CUALQUIERA.match(linea):
                con_autor += 1
            if AUTOR_AGENTE.match(linea):
                fallos_autor.append((rel, n, linea.strip()))

        for n, linea in enumerate(sin_bloques_literales(texto), 1):
            if TABLA_SIMPLE.match(linea) or TABLA_GRID.match(linea):
                fallos_tabla.append((rel, n, linea.strip()[:40]))

    # Una tabla simple ocupa 3 líneas de borde; una grid, N+1. Se reporta por
    # archivo, no por línea: el conteo de líneas exageraría el tamaño del hueco.
    archivos_tabla = sorted({f[0] for f in fallos_tabla})
    archivos_autor = sorted({f[0] for f in fallos_autor})
    total = len(archivos_autor) + len(archivos_tabla)

    if quiet:
        print(total)
        return 1 if (strict and total) else 0

    den = (f'(alcance medido: {len(objetivo)} {etiqueta_alcance}; '
           f'{con_autor} declaraciones :autor:; '
           f'bloques literales excluidos del check de tabla)')

    if not total:
        print(f'check-rst-convenciones: OK — autoría canónica y tablas en list-table')
        print(f'  {den}')
        return 0

    print(f'check-rst-convenciones: {total} archivo(s) incumplidor(es)')
    print(f'  {den}')

    if archivos_autor:
        print(f'\n:autor: con el nombre del agente — {len(archivos_autor)} archivo(s), '
              f'{len(fallos_autor)} línea(s). El canon es "Equipo Kaupamex":')
        for rel, n, linea in fallos_autor[:20]:
            print(f'  {rel}:{n}  {linea}')
        if len(fallos_autor) > 20:
            print(f'  … y {len(fallos_autor) - 20} más')

    if archivos_tabla:
        print(f'\nTabla simple o grid en vez de .. list-table:: — '
              f'{len(archivos_tabla)} archivo(s):')
        for rel in archivos_tabla[:20]:
            lineas = [str(f[1]) for f in fallos_tabla if f[0] == rel]
            print(f'  {rel}  (líneas {", ".join(lineas[:6])})')
        if len(archivos_tabla) > 20:
            print(f'  … y {len(archivos_tabla) - 20} más')

    return 1 if strict else 0


if __name__ == '__main__':
    sys.exit(main())
