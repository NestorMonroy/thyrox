#!/usr/bin/env python3
"""Mide el bloqueo REAL de cada modulo de `permission` que falta por portar.

El tablero (#250) afirmaba «88 son un bloque decidible». Esta sonda no
transcribe esa cifra: la deriva resolviendo, import por import, contra el
arbol de thyrox.

Separa DOS clases de bloqueo que un solo eje colapsa, y son remedios
distintos — es la leccion de #234 («el bloqueo declarado media el manifiesto,
no el arbol»):

    MANIFEST  el archivo EXISTE en src/packages/<pkg>/src/ y el `exports` de
              su package.json no lo declara. Remedio: una linea de manifiesto.
    TREE      el archivo no existe. Remedio: portarlo — otra tarea.
    SIBLING   el hermano dentro de `permission` tampoco esta portado.
    DEP       una dependencia externa (react) no resuelve desde el paquete.

Metrica: specifiers `from '...'` de cada modulo ausente, resueltos contra
         el package.json y el arbol de cada paquete hermano de thyrox.
Ciega a: un import dinamico `await import(...)`, que no lleva `from`; a un
         re-export `export ... from`; y a si el simbolo concreto existe
         dentro del archivo que si resuelve — mide el ARCHIVO, no el simbolo.
"""
import json
import pathlib
import re
import subprocess
import sys

SOURCE = pathlib.Path('/home/user/claude-code-nestor-monroy-tools/packages/permission')
PACKAGES = pathlib.Path('/home/user/thyrox/src/packages')
SOURCE_SCOPE = '@claude-code-how-works/'
EXTERNAL_OK = {'bun:bundle', 'crypto', 'path', 'fs', 'fs/promises', 'os', 'util'}


def missing_modules() -> list[str]:
    """Los `.ts` sin test que la fuente tiene y el puerto no."""
    def listing(root: pathlib.Path) -> set[str]:
        out = subprocess.run(
            ['find', '.', '-name', '*.ts', '-o', '-name', '*.tsx'],
            cwd=root, capture_output=True, text=True).stdout
        return {
            line[2:] for line in out.splitlines()
            if line.endswith(('.ts', '.tsx')) and '__tests__' not in line
        }
    return sorted(listing(SOURCE) - listing(PACKAGES / 'permission'))


def package_exports(package: str) -> dict | None:
    manifest = PACKAGES / package / 'package.json'
    if not manifest.exists():
        return None
    return json.loads(manifest.read_text()).get('exports', {})


def specifiers_of(path: pathlib.Path) -> list[str]:
    """Los tres canales por los que un modulo nombra a otro.

    Medir solo `from '...'` publicaba LIBRE sobre `commands/index.ts`, cuyo
    unico enlace vivo es `load: () => import('./permissions.js')` — un
    hermano sin portar. El import dinamico no lleva `from`, asi que el
    patron era ciego justo al enlace que decide.
    """
    text = path.read_text()
    return (
        re.findall(r"from '([^']+)'", text)
        + re.findall(r"\bimport\(\s*'([^']+)'", text)
        + re.findall(r"\brequire\(\s*'([^']+)'", text)
    )


def expand_export(exports: dict, key: str, package: str) -> pathlib.Path | None:
    """Resuelve `key` contra `exports`, incluidos los patrones con comodin.

    Node resuelve `./*` y `./*.js` igual que una clave exacta: el manifiesto
    NO es el bloqueo cuando existe un comodin que cubre el subpath. Medirlo
    sin expandir publicaba MANIFEST sobre nueve paquetes que declaran `./*`,
    y ese veredicto habria mandado a editar un manifiesto que ya resuelve.
    Devuelve None solo si NINGUNA clave —exacta o comodin— cubre el subpath.
    """
    if key in exports:
        return PACKAGES / package / str(exports[key]).lstrip('./')
    # Node elige el patron MAS ESPECIFICO, no el primero declarado. Sin este
    # orden, `./*` gana sobre `./*.js` y compone `./x.js.ts`, que no existe:
    # el veredicto sale TREE sobre un archivo que si resuelve. Medido sobre
    # `agent/eventMetadata.js`, que existe en el arbol y salia ausente.
    patterns = sorted(
        ((k, v) for k, v in exports.items() if '*' in k),
        key=lambda kv: len(kv[0]) - kv[0].count('*'),
        reverse=True,
    )
    for pattern, target in patterns:
        head, _, tail = pattern.partition('*')
        if key.startswith(head) and key.endswith(tail) and len(key) >= len(head) + len(tail):
            middle = key[len(head):len(key) - len(tail) or None]
            return PACKAGES / package / str(target).replace('*', middle).lstrip('./')
    return None


def resolve(specifier: str, importer: str) -> str:
    if specifier.startswith('.'):
        target = ((SOURCE / importer).parent / specifier).resolve()
        stem = str(target.relative_to(SOURCE.resolve())).removesuffix('.js')
        here = PACKAGES / 'permission'
        if (here / f'{stem}.ts').exists() or (here / f'{stem}.tsx').exists():
            return 'ok'
        return f'SIBLING  {stem}'

    if specifier.startswith(SOURCE_SCOPE):
        rest = specifier[len(SOURCE_SCOPE):]
        package, _, subpath = rest.partition('/')
        # Antes del `exports` del destino esta si el IMPORTADOR lo ve. Medir
        # solo el destino publicaba «resuelve» sobre command-runtime, que
        # declara el comodin `./*` y aun asi da `Cannot find module` desde
        # permission: no esta enlazado en su node_modules. Es el mismo
        # bloqueo que react, y el eje que faltaba.
        if not (PACKAGES / 'permission' / 'node_modules' / '@thyrox' / package).exists():
            return f'LINK     @thyrox/{package} no enlazado en permission'
        exports = package_exports(package)
        if exports is None:
            return f'TREE     paquete {package} ausente'
        key = f'./{subpath}' if subpath else '.'
        declared = expand_export(exports, key, package)
        if declared is None:
            return f'MANIFEST {package} {key}'
        return 'ok' if declared.exists() else f'TREE     {package} {key}'

    if specifier in EXTERNAL_OK:
        return 'ok'
    head = specifier.split('/')[0]
    linked = PACKAGES / 'permission' / 'node_modules' / head
    return 'ok' if linked.exists() or linked.is_symlink() else f'DEP      {specifier}'


def main() -> int:
    tally: dict[str, int] = {}
    modules = missing_modules()
    for module in modules:
        specifiers = sorted(set(specifiers_of(SOURCE / module)))
        blockers = []
        for specifier in specifiers:
            verdict = resolve(specifier, module)
            if verdict != 'ok':
                blockers.append((specifier, verdict))
                tally[verdict.split()[0]] = tally.get(verdict.split()[0], 0) + 1
        mark = 'LIBRE' if not blockers else 'BLOQ '
        print(f'{mark} {module}  ({len(specifiers)} imports)')
        for specifier, verdict in blockers:
            print(f'        {verdict:<40} {specifier}')
    print(f'\nmodulos ausentes: {len(modules)}')
    for kind, count in sorted(tally.items()):
        print(f'  {kind:<9} {count} aristas')
    return 0


if __name__ == '__main__':
    sys.exit(main())
