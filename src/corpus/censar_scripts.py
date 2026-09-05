#!/usr/bin/env python3
"""Censa el fondo de guiones del repositorio y genera su instrumento de descripción.

Dos raíces conviven en este árbol y su frontera se declara en el catálogo que
este guion emite:

    scripts/          herramientas del PRODUCTO que el repo publica (Sphinx,
                      PlantUML, arranque del clon). Siguen teniendo sentido en
                      un clon donde nadie ejecuta un agente.
    .claude/scripts/  herramientas del AGENTE (gates de sesión, telemetría del
                      store, esperas). Sólo tienen sentido dentro de una sesión
                      o de un githook que la sesión instaló.

La clase funcional de cada guion NO se declara a mano: se DERIVA de quién lo
cita, para que el catálogo no pueda mentir sobre un consumidor que ya no existe.

Uso
---
    python3 .claude/scripts/corpus/censar_scripts.py             # regenera el catálogo
    python3 .claude/scripts/corpus/censar_scripts.py --verificar # exit 1 si difiere
    python3 .claude/scripts/corpus/censar_scripts.py --huerfanos # gate: sin citantes
    python3 .claude/scripts/corpus/censar_scripts.py --huerfanos --strict
    python3 .claude/scripts/corpus/censar_scripts.py --write-baseline
"""
import argparse
import collections
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
CATALOGUE = ROOT / 'source/normativa/estandares/catalogo-de-scripts.rst'
BASELINE = ROOT / '.claude/scripts/corpus/scripts_huerfanos_baseline.txt'
SOURCE_ROOTS = ('.claude/scripts', 'scripts')
SUFFIXES = ('.py', '.sh')
# Carpetas que NO son fondo de guiones aunque vivan bajo una raíz: las suites
# tienen su propio runner (`tests/run-all.sh`), `docs/` es material de apoyo
# y `__pycache__` es bytecode. Se declaran en la «Ciega a» del catálogo.
EXCLUDED_DIRS = frozenset({'tests', 'docs', '__pycache__'})

# Familia del archivo que cita — el orden importa: el primer predicado gana.
FAMILIES = (
    ('hook',     lambda p: p.startswith('.claude/hooks/')),
    ('githook',  lambda p: p.startswith('.githooks/')),
    ('settings', lambda p: p.startswith('.claude/settings')),
    ('test',     lambda p: '/tests/' in p or '/test-' in p or '/test_' in p),
    ('script',   lambda p: p.startswith(SOURCE_ROOTS)),
    ('regla',    lambda p: p.startswith('.claude/rules/') or p.endswith('CLAUDE.md')),
    ('skill',    lambda p: p.startswith(('.claude/skills/', '.claude/agents/'))),
    ('comando',  lambda p: p.startswith('.claude/commands/')),
    ('docs',     lambda p: p.startswith('source/')),
)

# Clase funcional, derivada de las familias que lo citan. El primero que aplica gana.
CLASSES = (
    ('huerfano',        lambda f, n: not f),
    ('gate-bloqueante', lambda f, n: 'githook' in f),
    ('soporte-de-hook', lambda f, n: 'hook' in f or 'settings' in f),
    ('gate-de-reporte', lambda f, n: n.startswith(('check_', 'check-'))),
    ('invocado-por-skill', lambda f, n: 'skill' in f or 'comando' in f),
    ('libreria-interna', lambda f, n: 'script' in f),
    ('solo-cubierto-por-test', lambda f, n: f <= {'test'}),
    ('citado-solo-en-prosa', lambda f, n: True),
)


def family_of(path):
    for name, predicate in FAMILIES:
        if predicate(path):
            return name
    return 'otro'


def citing_files(basename, own_path):
    """Archivos versionados que mencionan el basename, excluyendo la autocita."""
    done = subprocess.run(['git', 'grep', '-l', '-F', basename],
                          cwd=ROOT, capture_output=True, text=True)
    return [line for line in done.stdout.splitlines() if line and line != own_path]


def survey():
    rows = []
    for root in SOURCE_ROOTS:
        # Recursivo: desde d566c180 el fondo se agrupa por clase en subcarpetas
        # (gates/ session/ agents/ task/ corpus/ graph/). Un glob a profundidad 1
        # publicaba 21 guiones donde el árbol tiene más de cien (H-DOCS-1020).
        for path in sorted((ROOT / root).rglob('*')):
            if not path.is_file() or path.suffix not in SUFFIXES:
                continue
            relative = path.relative_to(ROOT).as_posix()
            if EXCLUDED_DIRS & set(relative.split('/')[:-1]):
                continue
            citers = citing_files(path.name, relative)
            families = collections.Counter(family_of(c) for c in citers)
            keys = set(families)
            functional = next(name for name, pred in CLASSES if pred(keys, path.name))
            rows.append({
                'path': relative,
                'root': root,
                'lines': sum(1 for _ in path.open(errors='ignore')),
                'citers': len(citers),
                'families': dict(families),
                'class': functional,
            })
    return rows


def render(rows):
    by_class = collections.Counter(r['class'] for r in rows)
    by_root = collections.Counter(r['root'] for r in rows)
    out = []
    a = out.append
    a('.. meta::')
    a('   :artefacto: CATALOGO-SCRIPTS')
    a('   :tipo: catalogo')
    a('   :dominio: normativa')
    a('   :subdominio: estandares')
    a('   :estado: aprobado')
    a('   :version: 1.0.0')
    a('   :autor: Equipo Kaupamex')
    a('   :clasificacion: Interno')
    a('   :submodulo: docs')
    a('')
    a('.. _catalogo-de-scripts:')
    a('')
    a('Catálogo de guiones — el fondo de mecanismo y su frontera')
    a('===========================================================')
    a('')
    a('Documento **generado**. No se edita a mano: lo produce')
    a('``.claude/scripts/corpus/censar_scripts.py``, y ``--verificar`` falla si el archivo')
    a('en disco difiere de lo que el árbol de hoy produciría.')
    a('')
    a('La frontera entre las dos raíces')
    a('----------------------------------')
    a('')
    a('El discriminador es una pregunta, no una lista:')
    a('**¿este guion sigue teniendo sentido en un clon donde nadie ejecuta un')
    a('agente?**')
    a('')
    a('.. list-table::')
    a('   :header-rows: 1')
    a('')
    a('   * - Raíz')
    a('     - Qué aloja')
    a('     - Vive mientras')
    a('   * - ``scripts/``')
    a('     - herramientas del **producto** que este repositorio publica: build')
    a('       de Sphinx, prerenderizado de PlantUML, arranque del clon,')
    a('       verificaciones que un humano corre a mano')
    a('     - exista el repositorio')
    a('   * - ``.claude/scripts/``')
    a('     - herramientas del **agente**: gates de sesión, telemetría del store')
    a('       de subagentes, esperas de trabajo, censos que alimentan artefactos')
    a('     - exista el agente que las invoca')
    a('')
    a('Un guion que un tercero correría desde una terminal para construir o')
    a('verificar el producto va en ``scripts/``. Uno que sólo tiene receptor')
    a('dentro de una sesión —o dentro de un githook que la sesión instaló— va en')
    a('``.claude/scripts/``.')
    a('')
    a('La clase funcional se DERIVA, no se declara')
    a('---------------------------------------------')
    a('')
    a('Ninguna fila de este catálogo la escribe una persona: la clase de cada')
    a('guion sale de **quién lo cita** en el árbol versionado. Un guion cuyo')
    a('último consumidor desaparece cae solo a ``huerfano`` en la siguiente')
    a('generación, sin que nadie tenga que acordarse de reclasificarlo.')
    a('')
    a('.. list-table::')
    a('   :header-rows: 1')
    a('')
    a('   * - Clase')
    a('     - Se deriva de')
    a('     - N')
    for name, _ in CLASSES:
        if by_class.get(name):
            derived = {
                'huerfano': 'ningún archivo lo cita',
                'gate-bloqueante': 'lo cita un ``.githooks/``',
                'soporte-de-hook': 'lo cita un ``.claude/hooks/`` o el ``settings``',
                'gate-de-reporte': 'su nombre empieza en ``check_``/``check-``',
                'invocado-por-skill': 'lo cita un skill, agente o comando',
                'libreria-interna': 'lo cita otro guion de las dos raíces',
                'solo-cubierto-por-test': 'sólo lo cita su propio test',
                'citado-solo-en-prosa': 'sólo lo cita documentación',
            }[name]
            a(f'   * - ``{name}``')
            a(f'     - {derived}')
            a(f'     - {by_class[name]}')
    a('')
    a('El fondo, guion por guion')
    a('---------------------------')
    a('')
    a('.. list-table::')
    a('   :header-rows: 1')
    a('')
    a('   * - Guion')
    a('     - Clase')
    a('     - Líneas')
    a('     - Citantes')
    for row in sorted(rows, key=lambda r: (r['root'], r['path'])):
        a(f"   * - ``{row['path']}``")
        a(f"     - {row['class']}")
        a(f"     - {row['lines']}")
        a(f"     - {row['citers']}")
    a('')
    a('Métrica y ceguera')
    a('-------------------')
    a('')
    a(f"*Métrica:* archivos ``.py``/``.sh`` bajo {' y '.join(f'``{r}/``' for r in SOURCE_ROOTS)}, "
      f"recorridos de forma recursiva —{by_root.get(SOURCE_ROOTS[0], 0)} y "
      f"{by_root.get(SOURCE_ROOTS[1], 0)}, {len(rows)} en total—, "
      'con sus citantes contados como archivos versionados que mencionan el')
    a('nombre del guion, descontando la autocita.')
    a('')
    a('*Ciega a:* (1) una invocación construida por concatenación de variables —')
    a('el nombre nunca aparece literal y el guion se lee como huérfano; (2) las')
    a(f"carpetas excluidas por declaración —{', '.join(f'``{d}/``' for d in sorted(EXCLUDED_DIRS))}—, "
      'cuya cobertura no se mide aquí (las suites')
    a('tienen su propio runner); (3) la distinción entre un citante que lo **ejecuta** y')
    a('uno que sólo lo **nombra** en prosa — por eso ``citado-solo-en-prosa`` es')
    a('una clase y no un veredicto de muerte.')
    return '\n'.join(out) + '\n'


def read_baseline():
    if not BASELINE.exists():
        return set()
    return {l.strip() for l in BASELINE.read_text().splitlines()
            if l.strip() and not l.startswith('#')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verificar', action='store_true',
                        help='exit 1 si el catálogo en disco no es el que el árbol produce')
    parser.add_argument('--huerfanos', action='store_true',
                        help='gate: guiones sin ningún citante')
    parser.add_argument('--strict', action='store_true',
                        help='con --huerfanos: exit 1 si hay uno fuera del baseline')
    parser.add_argument('--write-baseline', action='store_true')
    args = parser.parse_args()

    rows = survey()

    if args.huerfanos or args.write_baseline:
        orphans = sorted(r['path'] for r in rows if r['class'] == 'huerfano')
        if args.write_baseline:
            BASELINE.write_text(
                '# Guiones sin ningún citante, congelados al cerrar #912.\n'
                '# Uno listado no bloquea; uno NUEVO sí. Se paga al tocarlo.\n'
                + '\n'.join(orphans) + '\n')
            print(f'baseline escrito: {len(orphans)} huérfano(s)')
            return 0
        baseline = read_baseline()
        fresh = [o for o in orphans if o not in baseline]
        print(f'censar-scripts: {len(fresh)} huérfano(s) nuevo(s) '
              f'(alcance medido: {len(rows)} guiones; {len(orphans)} huérfanos en total; '
              f'{len(baseline)} en baseline)')
        for o in fresh:
            print(f'     {o} — ningún archivo del árbol lo cita')
        return 1 if (fresh and args.strict) else 0

    rendered = render(rows)
    if args.verificar:
        current = CATALOGUE.read_text() if CATALOGUE.exists() else ''
        if current == rendered:
            print(f'censar-scripts: el catálogo reproduce '
                  f'(alcance medido: {len(rows)} guiones)')
            return 0
        print('censar-scripts: el catálogo NO reproduce — regenéralo sin --verificar',
              file=sys.stderr)
        return 1
    CATALOGUE.parent.mkdir(parents=True, exist_ok=True)
    CATALOGUE.write_text(rendered)
    print(f'censar-scripts: catálogo escrito en {CATALOGUE.relative_to(ROOT)} '
          f'(alcance medido: {len(rows)} guiones)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
