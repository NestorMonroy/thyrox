#!/usr/bin/env python3
"""Frontera de tool-registry medida por SIMBOLO, no por especificador.

El instrumento anterior media si `@thyrox/agent/hooks.js` RESUELVE, y de
ahi concluia que un util estaba libre. Medir el significante (¿resuelve el
modulo?) y concluir sobre el significado (¿existe el simbolo?) es el
sub-patron C, y publico un falso «libre» para TaskCreateTool: ese modulo
resuelve y no exporta `executeTaskCreatedHooks`.

Y hay una segunda ceguera, medida al estrenarlo: publico 12 libres, de
los cuales NUEVE eran stubs de la propia `ccnmt` —«Auto-generated stub —
replace with real implementation», cuerpo vacio— y un decimo no tenia ni
un `.ts`. Un stub resuelve todos sus imports porque no importa nada, asi
que para un instrumento que mide resolucion es «libre» sin tener nada que
portar. Es el sub-patron C dentro del propio medidor: se midio la
resolucion de importaciones y se concluyo sobre la existencia de codigo.
Desde esta version un util sin ningun archivo con cuerpo real se clasifica
`SIN CUERPO`, aparte de libres y bloqueados.

Metrica: por cada directorio de util de la fuente sin contraparte en el
puerto, si tiene cuerpo real; y si lo tiene, sus importaciones locales
(¿existe el archivo?) y sus importaciones de paquete hermano descompuestas
en simbolos (¿existe cada nombre?).
Ciega a: un simbolo que exista con el nombre correcto y otra firma o otra
conducta; a las importaciones que un util haga por `require` dinamico; a
`bun:bundle`, que se trata aparte por tener sustituto declarado; y a un
util cuyo cuerpo exista y sea un placeholder sin el marcador literal —el
discriminador de stub es esa cadena, no un juicio sobre el contenido.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

FUENTE = Path('/home/user/claude-code-nestor-monroy-tools/packages/tool-registry/src')
PUERTO = Path('/home/user/thyrox/src/packages/tool-registry/src')
ALCANCE_FUENTE = '@claude-code-how-works/'
ALCANCE_PUERTO = '@thyrox/'
# Tiene sustituto declarado en internal/pendingCrossPackageDeps.ts.
CON_SUSTITUTO = {'bun:bundle'}
# El literal con que `ccnmt` marca un archivo sin implementar.
MARCA_DE_STUB = 'Auto-generated stub'

IMPORT = re.compile(
    r"import\s+(?P<clausula>(?:type\s+)?\{[^}]*\}|[\w*]+(?:\s*,\s*\{[^}]*\})?)"
    r"\s+from\s+'(?P<origen>[^']+)'",
    re.S,
)


def simbolos(clausula: str) -> list[str]:
    """Los nombres importados; el alias local no cuenta, cuenta el de origen."""
    llaves = re.search(r'\{(.*)\}', clausula, re.S)
    if not llaves:
        return []
    fuera = []
    for pieza in llaves.group(1).split(','):
        pieza = pieza.strip().removeprefix('type ').strip()
        if not pieza:
            continue
        fuera.append(pieza.split(' as ')[0].strip())
    return fuera


def tiene_cuerpo(archivos: list[Path]) -> bool:
    """Si al menos un archivo del util es codigo real y no un stub marcado.

    Un directorio sin ningun `.ts`/`.tsx` tampoco tiene cuerpo: su unico
    contenido es `.js` compilado, que no es la fuente que se porta.
    """
    return any(MARCA_DE_STUB not in f.read_text() for f in archivos)


def existe_local(desde: Path, origen: str) -> bool:
    """Un import relativo se resuelve contra el arbol del PUERTO."""
    rel = (desde.parent / origen).resolve()
    rel = rel.relative_to(FUENTE.parent) if FUENTE in rel.parents else None
    if rel is None:
        return False
    base = PUERTO.parent / rel
    for cand in (base, base.with_suffix('.ts'), base.with_suffix('.tsx'),
                 Path(str(base).removesuffix('.js') + '.ts'),
                 Path(str(base).removesuffix('.js') + '.tsx')):
        if cand.is_file():
            return True
    return False


def sonda_paquete(pedidos: dict[str, list[str]]) -> dict[str, dict[str, bool]]:
    """Carga cada modulo hermano de verdad y pregunta por cada nombre."""
    guion = ['const r = {};']
    for mod, nombres in pedidos.items():
        guion.append(
            f'try {{ const m = await import({json.dumps(mod)});'
            f' r[{json.dumps(mod)}] = Object.fromEntries('
            f'{json.dumps(nombres)}.map(n => [n, n in m])); }}'
            f' catch (e) {{ r[{json.dumps(mod)}] = null; }}'
        )
    guion.append('console.log(JSON.stringify(r));')
    salida = subprocess.run(
        ['bun', '-e', '\n'.join(guion)],
        cwd='/home/user/thyrox/src/packages/tool-registry',
        capture_output=True, text=True,
    )
    linea = [l for l in salida.stdout.splitlines() if l.startswith('{')]
    return json.loads(linea[-1]) if linea else {}


def main() -> int:
    utiles = sorted(
        d for d in (FUENTE / 'tools').iterdir()
        if d.is_dir() and not (PUERTO / 'tools' / d.name).exists()
    )
    por_util: dict[str, dict] = {}
    sin_cuerpo: list[tuple[str, int]] = []
    pedidos: dict[str, list[str]] = {}
    for d in utiles:
        archivos = [f for f in d.rglob('*') if f.suffix in ('.ts', '.tsx')]
        if not tiene_cuerpo(archivos):
            sin_cuerpo.append((d.name, len(archivos)))
            continue
        locales, hermanos, otros = set(), {}, set()
        for f in archivos:
            for m in IMPORT.finditer(f.read_text()):
                origen, clausula = m.group('origen'), m.group('clausula')
                if origen.startswith('.'):
                    if not existe_local(f, origen):
                        locales.add(origen)
                elif origen.startswith(ALCANCE_FUENTE):
                    mod = origen.replace(ALCANCE_FUENTE, ALCANCE_PUERTO)
                    hermanos.setdefault(mod, set()).update(simbolos(clausula))
                elif origen in CON_SUSTITUTO or origen.startswith('zod') or '/' not in origen:
                    pass
                else:
                    otros.add(origen)
        for mod, nombres in hermanos.items():
            pedidos.setdefault(mod, [])
            pedidos[mod] = sorted(set(pedidos[mod]) | nombres)
        por_util[d.name] = {
            'lineas': sum(len(f.read_text().splitlines()) for f in archivos),
            'archivos': len(archivos),
            'locales_ausentes': sorted(locales),
            'hermanos': {m: sorted(n) for m, n in hermanos.items()},
            'otros': sorted(otros),
        }

    sonda = sonda_paquete(pedidos)
    libres, bloqueados = [], []
    for nombre, info in sorted(por_util.items(), key=lambda kv: kv[1]['lineas']):
        faltan = list(info['locales_ausentes'])
        for mod, nombres in info['hermanos'].items():
            hallado = sonda.get(mod)
            if hallado is None:
                faltan.append(f'{mod} (el modulo no carga)')
                continue
            for n in nombres:
                if not hallado.get(n):
                    faltan.append(f'{mod}::{n}')
        faltan += [f'{o} (paquete no hermano)' for o in info['otros']]
        (libres if not faltan else bloqueados).append((nombre, info, faltan))

    print(f'utiles de la fuente sin contraparte: '
          f'{len(por_util) + len(sin_cuerpo)}')
    print(f'SIN CUERPO (stub de la fuente o sin .ts): {len(sin_cuerpo)}')
    for nombre, n in sorted(sin_cuerpo):
        print(f'  {nombre} ({n} .ts, todos stub)')
    print(f'LIBRES a nivel de simbolo: {len(libres)}')
    for nombre, info, _ in libres:
        print(f"  {info['lineas']:5d} L  {nombre}")
    print(f'BLOQUEADOS: {len(bloqueados)}')
    for nombre, info, faltan in bloqueados[:12]:
        print(f"  {info['lineas']:5d} L  {nombre}: {', '.join(faltan[:4])}"
              + (f' (+{len(faltan)-4})' if len(faltan) > 4 else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
