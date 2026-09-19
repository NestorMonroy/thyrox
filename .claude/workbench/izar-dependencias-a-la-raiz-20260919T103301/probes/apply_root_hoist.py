"""Iza a la raiz las dependencias que la referencia declara ahi, y cierra las
otras tres clases que el censo destapo.

La FORMA la fija la referencia, no nosotros: `ccnmt: package.json` declara
**136** claves en `devDependencies` de la RAIZ, y sus paquetes declaran casi
nada (`agent` 1, `cli` 1, `config`/`tool-registry`/`output`/`command-runtime`
0). Declarar 122 lineas por paquete divergiria de la fuente.

Cinco clases, leidas del cruce censo x referencia:

  A  ref:raiz, paquete de registro   -> a la raiz, con la version VERBATIM de ccnmt
  B  ref:raiz, miembro de NUESTRO workspace -> a la raiz como `workspace:*`
  C  defecto de importador: el renombre de alcance dejo el specifier desnudo
  D  hermano de workspace sin declarar en el manifiesto del importador
  E  texto con forma de paquete -> NO es dependencia; el `ref:` lo discrimina

`--aplicar` escribe; sin el, sólo publica lo que haría.
"""

import argparse
import json
import os
import pathlib
import re
import sys

# Clase C: el renombre de alcance (#185) renombro el `name` del paquete y no
# los specifiers que lo nombran. Medido: `modifiers-napi` 2 archivos desnudos y
# 0 con alcance; `stdin-napi` 4 y 0; `image-processor-napi` 1 y 1 — partido.
BARE_TO_SCOPED = {
    'modifiers-napi': '@thyrox/modifiers-napi',
    'stdin-napi': '@thyrox/stdin-napi',
    'image-processor-napi': '@thyrox/image-processor-napi',
}


def declared_in(manifest: dict) -> set[str]:
    names: set[str] = set()
    for key in ('dependencies', 'devDependencies', 'peerDependencies'):
        names |= set(manifest.get(key, {}))
    return names


def workspace_members(packages_dir: pathlib.Path) -> dict[str, pathlib.Path]:
    members: dict[str, pathlib.Path] = {}
    for manifest_path in packages_dir.glob('*/package.json'):
        members[json.loads(manifest_path.read_text()).get('name', '')] = manifest_path
    for manifest_path in (packages_dir / '@ant').glob('*/package.json'):
        members[json.loads(manifest_path.read_text()).get('name', '')] = manifest_path
    members.pop('', None)
    return members


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
    parser = argparse.ArgumentParser()
    parser.add_argument('--aplicar', action='store_true')
    parser.add_argument('--names', required=True, help='listado de nombres reales, uno por linea')
    parser.add_argument('--siblings', default='', help='pares paquete=hermano, separados por coma')
    args = parser.parse_args()

    root = thyrox_root()
    packages_dir = root / 'src' / 'packages'
    reference = pathlib.Path('/home/user/claude-code-nestor-monroy-tools')

    reference_root = json.loads((reference / 'package.json').read_text())
    reference_dev = reference_root.get('devDependencies', {})
    members = workspace_members(packages_dir)

    own_manifest_path = root / 'package.json'
    own = json.loads(own_manifest_path.read_text())
    own_dev = dict(own.get('devDependencies', {}))

    names = [n.strip() for n in pathlib.Path(args.names).read_text().splitlines() if n.strip()]

    class_a: dict[str, str] = {}
    class_b: dict[str, str] = {}
    already: list[str] = []
    no_reference: list[str] = []
    renamed: list[str] = []

    for name in names:
        if name in own_dev:
            already.append(name)
            continue
        if name in members:
            class_b[name] = 'workspace:*'
            continue
        spec = reference_dev.get(name)
        if spec is None:
            no_reference.append(name)
            continue
        if spec.startswith('workspace:'):
            # La referencia lo declara `workspace:*` porque ALLI es miembro con
            # ESE nombre. Aqui el renombre de alcance (#185) lo dejo como
            # `@thyrox/<name>`, asi que una clave de raiz con el nombre desnudo
            # no resolveria a nuestro miembro: bun buscaria un paquete de
            # registro que no existe. Esos van por la clase C (reapuntar el
            # specifier) mas la D (declararlo en su importador), no por aqui.
            if name in members:
                class_b[name] = spec
            else:
                renamed.append(name)
            continue
        class_a[name] = spec

    print(f'== A  registro, version de la referencia: {len(class_a)}')
    for name, spec in sorted(class_a.items()):
        print(f'   {name:<34} {spec}')
    print(f'== B  miembro de workspace -> workspace:*: {len(class_b)}')
    for name, spec in sorted(class_b.items()):
        print(f'   {name:<34} {spec}')
    print(f'== renombrados al alcance (van por C+D, no a la raiz): {len(renamed)} -> '
          f'{", ".join(sorted(renamed)) or "ninguno"}')
    print(f'== ya en nuestra raiz: {len(already)} -> {", ".join(sorted(already))}')
    print(f'== sin declaracion en la referencia: {len(no_reference)} -> '
          f'{", ".join(sorted(no_reference)) or "ninguno"}')

    # Clase C: specifiers desnudos de un paquete que hoy vive bajo @thyrox/.
    touched_c: list[str] = []
    for bare, scoped in BARE_TO_SCOPED.items():
        pattern = re.compile(
            r"""((?:from|import|require)\s*\(?\s*['"])""" + re.escape(bare) + r"""(['"/])"""
        )
        for path in packages_dir.rglob('*'):
            if path.suffix not in ('.ts', '.tsx') or 'node_modules' in path.parts:
                continue
            text = path.read_text(errors='ignore')
            new_text = pattern.sub(lambda m: m.group(1) + scoped + m.group(2), text)
            if new_text != text:
                touched_c.append(f'{path.relative_to(root)}  {bare} -> {scoped}')
                if args.aplicar:
                    path.write_text(new_text)
    print(f'== C  specifier desnudo reapuntado al alcance: {len(touched_c)}')
    for line in sorted(touched_c):
        print(f'   {line}')

    # Clase D: hermano de workspace que el importador no declara.
    touched_d: list[str] = []
    for pair in filter(None, args.siblings.split(',')):
        package, sibling = pair.split('=')
        manifest_path = packages_dir / package / 'package.json'
        manifest = json.loads(manifest_path.read_text())
        if sibling in declared_in(manifest):
            continue
        touched_d.append(f'{package} -> {sibling}')
        if args.aplicar:
            deps = manifest.setdefault('dependencies', {})
            deps[sibling] = 'workspace:*'
            manifest['dependencies'] = dict(sorted(deps.items()))
            manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'== D  hermano de workspace declarado en su importador: {len(touched_d)}')
    for line in sorted(touched_d):
        print(f'   {line}')

    if args.aplicar:
        own_dev.update(class_a)
        own_dev.update(class_b)
        own['devDependencies'] = dict(sorted(own_dev.items()))
        own_manifest_path.write_text(json.dumps(own, indent=2) + '\n')
        print(f'\nESCRITO: raiz {len(own["devDependencies"])} claves '
              f'(antes {len(json.loads(own_manifest_path.read_text()).get("devDependencies", {}))})')
    else:
        print('\nNO se escribio nada (faltó --aplicar)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
