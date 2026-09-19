"""Censa los imports EXTERNOS de un paquete que su manifiesto no declara.

El defecto que mide: un paquete presente en el arbol (o en el lock) cuya
LINEA de declaracion falta en el `package.json` del importador. bun resuelve
un specifier por el paquete del importador, asi que sin esa linea el import
no resuelve aunque el paquete este instalado en otro sitio.

DOS FILTROS, y el segundo existe porque el primero no discrimina:

  1. el specifier no empieza por `.`, `/`, `node:` ni `bun:`, y no es builtin;
  2. **el specifier tiene forma de nombre de paquete npm**. Sin este, el
     recorrido por expresion regular captura la palabra `from` dentro de una
     cadena o de un fragmento de codigo en una plantilla, y publica basura
     como si fuera una dependencia: medido, 33 candidatos de los que 13 eran
     texto. Lo descartado se publica aparte — no se tira en silencio.

Metrica: specifiers de import/export/require, reducidos a nombre de paquete,
contra dependencies + devDependencies + peerDependencies del manifiesto.
Ciega a: un specifier compuesto en tiempo de ejecucion; un builtin de Node
sin prefijo `node:` fuera de la lista; y un nombre con forma valida que en
realidad sea texto (`review`, `trim`) — por eso la salida separa los que el
lock conoce de los que no.
"""

import json
import pathlib
import re
import sys

BUILTIN = {
    'assert', 'buffer', 'child_process', 'constants', 'crypto', 'dns', 'events',
    'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'perf_hooks', 'process',
    'punycode', 'querystring', 'readline', 'stream', 'string_decoder', 'timers',
    'tls', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads', 'zlib',
}
SPECIFIER = re.compile(r"""(?:from|import|require\()\s*['"]([^'"\n]+)['"]""")
# Nombre de paquete npm: opcionalmente con alcance, minusculas, sin espacios.
NOMBRE_NPM = re.compile(r'^(?:@[a-z0-9~][a-z0-9._~-]*/)?[a-z0-9~][a-z0-9._~-]*$')


def package_name(specifier: str) -> str:
    """Reduce un specifier a su nombre de paquete (`a/b/c` -> `a`; `@x/y/z` -> `@x/y`)."""
    if specifier.startswith('@'):
        return '/'.join(specifier.split('/')[:2])
    return specifier.split('/')[0]


def declared_in(manifest: dict) -> set[str]:
    nombres: set[str] = set()
    for clave in ('dependencies', 'devDependencies', 'peerDependencies'):
        nombres |= set(manifest.get(clave, {}))
    return nombres


def census(package_dir: pathlib.Path) -> tuple[dict[str, int], dict[str, int]]:
    """Devuelve (sin declarar con forma de paquete, descartados por forma)."""
    declaradas = declared_in(json.loads((package_dir / 'package.json').read_text()))
    validos: dict[str, int] = {}
    descartados: dict[str, int] = {}
    for archivo in package_dir.rglob('*'):
        if archivo.suffix not in ('.ts', '.tsx') or 'node_modules' in archivo.parts:
            continue
        for m in SPECIFIER.finditer(archivo.read_text(errors='ignore')):
            spec = m.group(1)
            if spec.startswith(('.', '/', 'node:', 'bun:')):
                continue
            nombre = package_name(spec)
            if nombre in BUILTIN or nombre in declaradas:
                continue
            destino = validos if NOMBRE_NPM.match(nombre) else descartados
            destino[nombre] = destino.get(nombre, 0) + 1
    return validos, descartados


def main() -> int:
    package_dir = pathlib.Path(sys.argv[1])
    manifest = json.loads((package_dir / 'package.json').read_text())
    validos, descartados = census(package_dir)
    lock = pathlib.Path('bun.lock').read_text() if pathlib.Path('bun.lock').exists() else ''

    print(f"paquete: {manifest['name']}   declaradas: {len(declared_in(manifest))}")
    print(f"SIN DECLARAR con forma de paquete: {len(validos)}")
    for nombre, n in sorted(validos.items(), key=lambda kv: -kv[1]):
        conocido = 'en el lock' if f'"{nombre}"' in lock else 'NO esta en el lock'
        print(f"  {n:5d}  {nombre:32s} {conocido}")
    print(f"\ndescartados por forma (texto capturado por el recorrido): {len(descartados)}")
    for nombre in sorted(descartados):
        print(f"         {nombre[:60]!r}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
