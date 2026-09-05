#!/usr/bin/env python3
"""La regla `allow` que existe y nunca puede dispararse.

Una regla de permiso cubierta por otra más ancha no produce error. Sigue en
`settings.json`, se lee como concedida, y el permiso se vuelve a pedir para
siempre. Es la forma de la tarea #711 —rutas de hook rotas— y de H-DOCS-479
sobre otra superficie: la configuración declara algo que el motor no alcanza.

La forma se adapta de `shadowedRuleDetection.ts` del corpus `ccb`, cuyo tipo
principal se llama `UnreachableRule` — de ahí el nombre de este gate. Su
criterio es sólo el de la regla de herramienta entera (`Bash` sin contenido);
aquí se extiende a la **cobertura por prefijo**, que es la forma que este árbol
tiene de verdad: nadie declara `Bash` a secas, pero `Bash(rm -rf *)` sí está en
el `deny` de tres repositorios y cubre a `Bash(rm -rf build/*)`.

El orden de evaluación que hace inalcanzable a la regla lo fija el motor:
`deny` primero, luego `ask`, luego `allow`. Un `deny` que cubre a un `allow`
lo bloquea; un `ask` que lo cubre lo convierte en una pregunta perpetua.

Métrica: reglas de `permissions.{allow,ask,deny}` de cada `settings*.json`
leído, tomadas como un solo conjunto combinado.
Ciega a: (1) el comodín que no está al final —`Edit(/.claude/scripts/*.sh)`—,
cuya cobertura este instrumento no decide y publica aparte; (2) el ámbito real
con que el motor combina las fuentes, que este gate supone único: si una raíz
no carga en la sesión, su `deny` no cubre nada y el hallazgo sería falso;
(3) la regla que ningún archivo declara pero la sesión concede en memoria.
"""
import json
import os
import re
import sys

REPOS = ['docs', 'api', 'ui', 'db', 'server']
TREE = '/home/user'
REPOS_BASE = TREE + '/kaupamex-'
RULE = re.compile(r'^([A-Za-z_][A-Za-z0-9_.-]*)\((.*)\)$', re.DOTALL)


def split_rule(text):
    """`Bash(ls *)` -> ('Bash', 'ls *'); `Bash` -> ('Bash', None)."""
    matches = RULE.match(text.strip())
    if matches:
        return matches.group(1), matches.group(2)
    return text.strip(), None


# `ccb` no evalúa el deny contra la cadena entera: trocea el comando en
# subcomandos y lo aplica a cada uno — `checkSemanticsDeny`,
# `bashPermissions.ts:1422`. Y antes despoja TODAS las asignaciones de
# variable que preceden al comando, no sólo las de su lista segura, porque
# «deny rules must be harder to circumvent» (`:706`). La asimetría es
# deliberada: una regla permisiva debe ser difícil de disparar, una
# restrictiva difícil de evadir.
SEPARATOR = re.compile(r'&&|\|\||;|\|')
ASSIGNMENT = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?\+?=\S*[ \t]+')


def subcommands(content):
    """Los tramos del comando, cada uno sin sus variables antepuestas.

    El primer elemento es siempre el contenido íntegro: un allow puede estar
    cubierto por su cadena entera aunque ningún tramo suelto lo esté.
    """
    if content is None:
        return [None]
    segments = [content]
    for raw in SEPARATOR.split(content):
        segment = raw.strip()
        previous = None
        while segment != previous:
            previous, segment = segment, ASSIGNMENT.sub('', segment, count=1)
        segment = segment.strip()
        if segment and segment not in segments:
            segments.append(segment)
    return segments


def is_simple_prefix(content):
    """True si el contenido es `literal*` — comodín único y final."""
    return (content is not None
            and content.endswith('*')
            and '*' not in content[:-1])


def covers(wide, narrow):
    """¿Toda invocación que casa con `estrecha` casa también con `ancha`?

    Devuelve `True`, `False`, o `None` cuando el instrumento no lo decide.

    Para `Bash` la comparación corre contra cada subcomando además de la
    cadena entera, y con las variables antepuestas despojadas — así el deny
    alcanza a `cd /x && rm -rf y` y no lo evade `FOO=bar rm -rf y`.
    """
    tool_a, content_a = wide
    tool_b, content_b = narrow
    if tool_a != tool_b:
        return False
    if tool_a == 'Bash' and content_b is not None:
        verdicts = [covers_segment(content_a, segment)
                      for segment in subcommands(content_b)]
        if True in verdicts:
            return True
        return None if None in verdicts else False
    return covers_segment(content_a, content_b)


def covers_segment(content_a, content_b):
    """La cobertura entre dos contenidos ya troceados."""
    if content_a is None:
        return True                       # el criterio de `ccb`, verbatim
    if content_b is None:
        return False                      # lo específico no cubre lo general
    if content_a == content_b:
        return True
    if is_simple_prefix(content_a):
        # `contenido_a[:-1]` no lleva comodín, así que los caracteres que
        # `contenido_b` comparte con él son literales: toda cadena que case
        # con B empieza por ese prefijo, y por tanto casa con A.
        return content_b.startswith(content_a[:-1])
    if '*' in content_a:
        return None                       # comodín intermedio: sin decidir
    return False


def declared_rules(roots):
    """Por raíz, las reglas de `permissions` con el archivo que las declara."""
    rules = {'allow': [], 'ask': [], 'deny': []}
    files_read = []
    for root in dict.fromkeys(roots):
        for name in ('settings.json', 'settings.local.json'):
            path = f'{root}/.claude/{name}'
            try:
                with open(path, encoding='utf-8') as fh:
                    data = json.load(fh)
            except (FileNotFoundError, json.JSONDecodeError):
                continue
            permissions = data.get('permissions') or {}
            if not any(k in permissions for k in rules):
                continue
            files_read.append(path)
            for kind in rules:
                for text in permissions.get(kind) or []:
                    rules[kind].append((text, split_rule(text), path))
    return rules, files_read


def unreachable(rules):
    """Las `allow` cubiertas, y los pares que el instrumento no decidió."""
    found = []
    undecided = []
    for text_b, rule_b, path_b in rules['allow']:
        covered = None
        for kind in ('deny', 'ask'):     # deny primero: es más severo
            for text_a, rule_a, path_a in rules[kind]:
                if text_a == text_b and kind == 'allow':
                    continue
                verdict = covers(rule_a, rule_b)
                if verdict is None:
                    undecided.append((text_b, text_a, kind))
                elif verdict and covered is None:
                    covered = (kind, text_a, path_a)
            if covered:
                break
        if covered:
            found.append((text_b, path_b) + covered)
    return found, undecided


def main(argv):
    strict = '--strict' in argv
    quiet = '--quiet' in argv
    roots = [argv[i + 1] for i, a in enumerate(argv)
              if a == '--raiz' and i + 1 < len(argv)]
    if not roots:
        # Mismas raíces que `check_eventos_hook.py`, y por la misma razón: la
        # copia que el cliente ejecuta vive en el árbol de trabajo, no en un
        # repositorio, y sus 186 reglas `allow` quedarían fuera del alcance.
        roots = [REPOS_BASE + r for r in REPOS]
        roots += [TREE, os.path.expanduser('~')]

    rules, files_read = declared_rules(roots)
    total = sum(len(v) for v in rules.values())
    if total == 0:
        print('ERROR — ningún archivo leído declara reglas de permiso. Sin '
              'reglas que medir no hay veredicto: un 0 aquí sería un verde '
              'falso, no una ausencia de reglas inalcanzables.',
              file=sys.stderr)
        return 2

    found, undecided = unreachable(rules)

    if quiet:
        print(len(found))
        return 1 if (strict and found) else 0

    print(f'check-unreachable-rules: {len(found)} regla(s) allow '
          f'inalcanzable(s)')
    print(f'  (alcance medido: {total} regla(s) en {len(files_read)} archivo(s) '
          f'de {len(roots)} raíz/raíces; cobertura sin decidir: '
          f'{len(undecided)} par(es))')
    for path in files_read:
        print(f'      leído: {path}')
    for text, path, kind, coverer, path_a in found:
        print(f'  INALCANZABLE {text!r} [{path}]')
        print(f'      cubierta por {kind} {coverer!r} [{path_a}]')

    return 1 if (strict and found) else 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
