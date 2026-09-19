"""Clasifica las dependencias externas sin declarar de cada paquete del workspace.

Sucesor de `deps-sin-declarar-repl-20260919T082130/probes/census_undeclared_deps.py`,
con **tres ceguera cerradas** que aquel tenia y que se midieron antes de escribir
este:

1. **`import()` dinamico.** Su `SPECIFIER` era
   ``(?:from|import|require\()\s*['"]`` — entre `import` y la comilla hay un
   parentesis, asi que `\s*` no casa. Medido: **19** nombres de paquete llegan
   SOLO por `import()` (383 specifiers externos), y ninguno se veia. El censo
   de 90 era una cota inferior. Las cifras las publica
   `remeasure_dynamic_imports.py`; no se transcriben aqui.

   CORREGIDO 2026-09-19 (H-THYROX-129): este punto decia «**1693** llamadas
   `import(...)`» y esa cifra no reproduce — doce lecturas del enunciado dan
   cero coincidencias, y la mas proxima (1697) cuenta LLAMADAS, no specifiers.
   Una llamada sin specifier literal no se reduce a nombre de paquete, asi que
   esa familia no podia sostener la conclusion que se le colgaba.

2. **Autorreferencia.** Un paquete puede importarse a si mismo por su propio
   nombre si declara `exports` — es la regla de Node, y bun la sigue. Medido
   por conducta desde `src/packages/agent`:
   ``await import('@thyrox/agent/idTypes')`` resuelve. Asi que un
   ``@thyrox/agent`` dentro de `agent` NO es una dependencia sin declarar.

3. **El izado a la raiz.** El docstring de aquel instrumento afirmaba *«sin esa
   linea el import no resuelve»*. Es falso para un workspace: bun resuelve por
   ascenso a `node_modules` de la raiz. Medido: `react` lo importan 8 paquetes
   sin declararlo y da **0** TS2307, porque la raiz si lo declara. Por eso este
   instrumento **mide la resolucion por conducta**, no la infiere del
   manifiesto.

El eje que decide la FORMA del arreglo lo fija la referencia, no nosotros:
`ccnmt: package.json` declara **136** claves en `devDependencies` de la RAIZ, y
sus paquetes declaran casi nada (`agent` una, `cli` una, `config`/`tool-registry`/
`output`/`command-runtime` cero). El izado es la forma de la fuente.

Metrica: specifiers de `from`/`import`/`require(`/`import(` en los `.ts`/`.tsx`
de cada paquete, reducidos a nombre de paquete, menos los declarados en el
manifiesto propio, menos el nombre propio del paquete, menos los builtin.
Ciega a: un specifier compuesto en tiempo de ejecucion (concatenacion); un
nombre con forma valida que en realidad sea texto — por eso la salida separa
por resolucion, que es la señal que discrimina.
"""

import json
import os
import pathlib
import re
import subprocess
import sys

# `bun` es el modulo del runtime, no un paquete de npm. Sin el aqui, el censo
# publica `bun` como dependencia sin declarar en `cli` y `computer-use-input`.
BUILTIN = {
    'assert', 'buffer', 'child_process', 'constants', 'crypto', 'dns', 'events',
    'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'perf_hooks', 'process',
    'punycode', 'querystring', 'readline', 'stream', 'string_decoder', 'timers',
    'tls', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads', 'zlib',
    'async_hooks', 'cluster', 'dgram', 'diagnostics_channel', 'domain', 'http2',
    'inspector', 'repl', 'sys', 'trace_events', 'wasi', 'bun',
}

# Cuatro formas, no tres: `import(` lleva parentesis entre la palabra y la
# comilla, asi que necesita alternativa propia.
SPECIFIER = re.compile(
    r"""(?:from|import|require|import)\s*\(?\s*['"]([^'"\n]+)['"]"""
)
COMMENT = re.compile(r'^\s*(?:\*|//|/\*)')
NPM_NAME = re.compile(r'^(?:@[a-z0-9~][a-z0-9._~-]*/)?[a-z0-9~][a-z0-9._~-]*$')


def package_name(specifier: str) -> str:
    """Reduce un specifier a su nombre de paquete (`a/b/c` -> `a`; `@x/y/z` -> `@x/y`)."""
    if specifier.startswith('@'):
        return '/'.join(specifier.split('/')[:2])
    return specifier.split('/')[0]


def declared_in(manifest: dict) -> set[str]:
    names: set[str] = set()
    for key in ('dependencies', 'devDependencies', 'peerDependencies'):
        names |= set(manifest.get(key, {}))
    return names


def specifiers_in(package_dir: pathlib.Path) -> dict[str, int]:
    """Cuenta los specifiers externos por nombre de paquete."""
    counts: dict[str, int] = {}
    for path in package_dir.rglob('*'):
        if path.suffix not in ('.ts', '.tsx', '.js', '.jsx'):
            continue
        if 'node_modules' in path.parts:
            continue
        for line in path.read_text(errors='ignore').splitlines():
            if COMMENT.match(line):
                continue
            for specifier in SPECIFIER.findall(line):
                if specifier[:1] in './' or specifier.startswith(('node:', 'bun:')):
                    continue
                name = package_name(specifier)
                if name in BUILTIN or not NPM_NAME.match(name):
                    continue
                counts[name] = counts.get(name, 0) + 1
    return counts


def resolves_from(package_dir: pathlib.Path, name: str) -> bool:
    """¿Resuelve el nombre desde ESE paquete? Se mide por conducta, no por manifiesto."""
    probe = f"await import({name!r})"
    done = subprocess.run(
        ['bun', '-e', probe], cwd=package_dir,
        capture_output=True, text=True, timeout=60,
    )
    return done.returncode == 0


def reference_declares(reference_root: pathlib.Path, package: str, name: str) -> str:
    """Donde declara la referencia ese nombre: `raiz`, `paquete`, `ambos` o `ninguno`."""
    places = []
    root_manifest = reference_root / 'package.json'
    if root_manifest.is_file():
        if name in declared_in(json.loads(root_manifest.read_text())):
            places.append('raiz')
    own = reference_root / 'packages' / package / 'package.json'
    if own.is_file():
        if name in declared_in(json.loads(own.read_text())):
            places.append('paquete')
    return '+'.join(places) or 'ninguno'


# La raiz NO se cuenta por niveles. `parents[4]` acierta desde donde su autor
# lo escribio y falla EN SILENCIO al mover el archivo — el defecto que
# H-DOCS-1103 midio y que `check_path_arithmetic` existe para ver. Se asciende
# hasta el marcador del arbol, que es lo que `paths.reach.thyrox_root` hace;
# aqui se reimplementa en seis lineas porque una sonda de banco se invoca
# suelta, sin PYTHONPATH que alcance `src/`.
THYROX_MARKER = pathlib.Path('src') / 'paths' / 'reach.py'


def thyrox_root() -> pathlib.Path:
    declared = os.environ.get('THYROX_ROOT')
    if declared:
        return pathlib.Path(declared)
    here = pathlib.Path(__file__).resolve().parent
    for level in (here, *here.parents):
        if (level / THYROX_MARKER).is_file():
            return level
    raise SystemExit('REHUSA: no se encontro la raiz de thyrox — '
                     'declarar THYROX_ROOT. No se emite medicion: un arbol '
                     'equivocado publicaria un cero que nadie podria leer.')


def main() -> int:
    root = thyrox_root()
    packages_dir = root / 'src' / 'packages'
    reference_root = pathlib.Path('/home/user/claude-code-nestor-monroy-tools')
    measure_resolution = '--sin-resolucion' not in sys.argv

    package_dirs = sorted(
        d for d in list(packages_dir.iterdir()) + list((packages_dir / '@ant').iterdir())
        if d.is_dir() and (d / 'package.json').is_file()
    )

    # Una clave de la RAIZ del workspace declara para todos sus miembros — es la
    # forma de la referencia (136 en su raiz contra 0-1 por paquete) y bun la
    # resuelve por ascenso. Un paquete que importa `react` sin declararlo NO
    # esta en deficit si la raiz lo declara; contarlo lo estaria seria medir el
    # manifiesto propio y concluir sobre la resolucion, que es la tercera
    # ceguera que este instrumento cierra.
    root_declared = declared_in(json.loads((root / 'package.json').read_text()))

    total_undeclared = 0
    unresolved: list[tuple[str, str, int, str]] = []
    resolved: list[tuple[str, str, int, str]] = []
    self_refs: list[tuple[str, str]] = []
    covered_by_root: list[tuple[str, str]] = []

    print(f'# paquetes con manifiesto: {len(package_dirs)}')
    print(f'# referencia: {reference_root}')
    print()

    for package_dir in package_dirs:
        manifest = json.loads((package_dir / 'package.json').read_text())
        own_name = manifest.get('name', '')
        declared = declared_in(manifest)
        counts = specifiers_in(package_dir)

        for name, count in sorted(counts.items()):
            if name in declared:
                continue
            if name == own_name:
                self_refs.append((package_dir.name, name))
                continue
            if name in root_declared:
                covered_by_root.append((package_dir.name, name))
                continue
            total_undeclared += 1
            where = reference_declares(reference_root, package_dir.name, name)
            ok = resolves_from(package_dir, name) if measure_resolution else None
            row = (package_dir.name, name, count, where)
            (resolved if ok else unresolved).append(row)

    print(f'SIN DECLARAR (excluidas autorreferencia y raiz): {total_undeclared}')
    print(f'  cubiertas por la RAIZ del workspace: {len(covered_by_root)} '
          f'({len({n for _, n in covered_by_root})} nombre(s) distinto(s))')
    print(f'  autorreferencias descontadas: {len(self_refs)} -> '
          f'{", ".join(f"{p}:{n}" for p, n in self_refs) or "ninguna"}')
    print()
    print(f'== NO RESUELVE (causa un rojo): {len(unresolved)}')
    for package, name, count, where in sorted(unresolved, key=lambda r: (-r[2], r[0])):
        print(f'  {package:<24} {name:<38} {count:>4} import(s)  ref:{where}')
    print()
    print(f'== RESUELVE YA (hueco formal de manifiesto): {len(resolved)}')
    for package, name, count, where in sorted(resolved, key=lambda r: (-r[2], r[0])):
        print(f'  {package:<24} {name:<38} {count:>4} import(s)  ref:{where}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
