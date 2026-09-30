"""La cifra `1693` que el README y el docstring del clasificador citan no
reproduce bajo ninguna lectura del enunciado «1693 llamadas `import(...)` en
`src/packages`».

Este guion enumera las lecturas plausibles y **computa** el veredicto en vez
de afirmarlo: si alguna diera 1693 lo diria. Publicar «ninguna da 1693» como
literal seria un control que no puede fallar, que es el sub-patron D con este
propio guion como sujeto.

Dos familias de lectura, porque el enunciado es ambiguo entre ellas:

- **specifier literal** — `import('x')`: es lo que el censo puede reducir a
  nombre de paquete, y por tanto lo unico que puede nombrar una dependencia
  sin declarar.
- **llamada** — todo `import(` incluido el de argumento variable y el
  `import()` en posicion de tipo: cuenta mas, y ninguna de esas formas
  nombra un paquete que el censo pudiera perderse.

Metrica: ocurrencias por lectura (familia x extensiones x si se descuentan
los specifiers relativos/`node:`/`bun:` x si se descuentan las lineas de
comentario).
Ciega a: un `import()` cuyo specifier se componga en tiempo de ejecucion —no
lleva comilla literal, asi que la familia de specifier no lo ve y la de
llamada no puede reducirlo a nombre—; y al `require()` dinamico, que es otra
forma.
"""

import pathlib
import re

COMMENT = re.compile(r'^\s*(?:\*|//|/\*)')
DYNAMIC_SPECIFIER = re.compile(r"""import\s*\(\s*['"]([^'"\n]+)['"]""")
DYNAMIC_CALL = re.compile(r'\bimport\s*\(')
STATIC_SPECIFIER = re.compile(r"""(?:from|require)\s*\(?\s*['"]([^'"\n]+)['"]""")
# La forma valida de un nombre de npm y los builtin, tomados del clasificador:
# sin este filtro el conjunto incluye fragmentos de template literal
# (`${join(RAIZ, `) y frameworks nativos (`AppKit`), que ningun censo cuenta.
NPM_NAME = re.compile(r'^(?:@[a-z0-9~][a-z0-9._~-]*/)?[a-z0-9~][a-z0-9._~-]*$')
BUILTIN = {'fs', 'path', 'os', 'util', 'vm', 'crypto', 'url', 'net', 'tls',
           'http', 'https', 'stream', 'events', 'zlib', 'child_process',
           'worker_threads', 'module', 'assert', 'buffer', 'process', 'repl'}
ROOT = pathlib.Path('src/packages')
CITED = 1693


def is_relative(specifier):
    return specifier[:1] in './' or specifier.startswith(('node:', 'bun:'))


def package_name(specifier):
    if specifier.startswith('@'):
        return '/'.join(specifier.split('/')[:2])
    return specifier.split('/')[0]


def source_lines(extensions):
    for path in ROOT.rglob('*'):
        if path.suffix not in extensions or 'node_modules' in path.parts:
            continue
        for line in path.read_text(errors='ignore').splitlines():
            yield line


def count(family, extensions, skip_relative, skip_comments):
    total = 0
    for line in source_lines(extensions):
        if skip_comments and COMMENT.match(line):
            continue
        if family == 'llamada':
            total += len(DYNAMIC_CALL.findall(line))
            continue
        for specifier in DYNAMIC_SPECIFIER.findall(line):
            if skip_relative and is_relative(specifier):
                continue
            total += 1
    return total


def external_names(extensions):
    """Los nombres de paquete que cada forma alcanza, para separar los que
    SOLO llegan por `import()` dinamico."""
    dynamic, static = set(), set()
    for line in source_lines(extensions):
        if COMMENT.match(line):
            continue
        for bucket, pattern in ((dynamic, DYNAMIC_SPECIFIER), (static, STATIC_SPECIFIER)):
            for specifier in pattern.findall(line):
                if is_relative(specifier):
                    continue
                name = package_name(specifier)
                if name in BUILTIN or not NPM_NAME.match(name):
                    continue
                bucket.add(name)
    return dynamic, static


def main():
    extension_sets = (
        ('.ts/.tsx  ', ('.ts', '.tsx')),
        ('+.js/.jsx ', ('.ts', '.tsx', '.js', '.jsx')),
    )
    results = []
    print(f'{"familia":<10} {"extensiones":<11} {"externos":<9} {"sin-coment":<11} cifra')
    for family in ('specifier', 'llamada'):
        for label, extensions in extension_sets:
            for skip_relative in (False, True):
                if family == 'llamada' and skip_relative:
                    continue  # una llamada sin specifier literal no es externa ni interna
                for skip_comments in (False, True):
                    got = count(family, extensions, skip_relative, skip_comments)
                    results.append(got)
                    print(
                        f'{family:<10} {label:<11} {str(skip_relative):<9} '
                        f'{str(skip_comments):<11} {got:>6}'
                    )

    matches = [got for got in results if got == CITED]
    print()
    print(f'lecturas medidas: {len(results)}  ·  coinciden con {CITED}: {len(matches)}')
    if matches:
        print(f'REPRODUCE: {CITED} sale de al menos una lectura del enunciado.')
    else:
        print(
            f'NO REPRODUCE: ninguna de las {len(results)} lecturas da {CITED}. '
            'La cifra llego sin el comando que la produce.'
        )

    dynamic, static = external_names(('.ts', '.tsx'))
    only_dynamic = sorted(dynamic - static)
    print()
    print(f'nombres externos alcanzables por import() dinamico : {len(dynamic)}')
    print(f'nombres externos alcanzables por from/require      : {len(static)}')
    print(f'nombres que SOLO llegan por import() dinamico      : {len(only_dynamic)}')
    for name in only_dynamic:
        print(f'  {name}')


if __name__ == '__main__':
    main()
