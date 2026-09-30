#!/usr/bin/env python3
"""Traduce al ingles los identificadores en espanol que el gate publica.

Forma de transformacion en bloque (`.claude/eventos` README, TASK-THYROX-0089):
el juicio vive en `lexicon_es_en.py` y aqui solo esta el recorrido.

**Se reescribe por POSICION de token, no por texto.** `tokenize` separa NAME de
STRING y COMMENT, asi que un comentario en espanol —que la regla EXIGE que siga
en espanol— no se toca aunque contenga la misma palabra. Un `sed` por palabra
haria justo lo contrario.

Tres guardas, y cada una descarta un renombre que romperia el archivo:

1. **Simbolo importado.** Si el nombre aparece en un `import`/`from … import`
   del archivo, no es nuestro: renombrarlo rompe la resolucion.
2. **Colision.** Si el nombre en ingles YA existe como NAME en el archivo, el
   renombre fusionaria dos simbolos distintos.
3. **Palabra reservada o builtin.** `id`, `type`, `list` como destino
   sombrearian un builtin.
"""
from __future__ import annotations

import argparse
import ast
import builtins
import io
import keyword
import pathlib
import re
import subprocess
import sys
import tokenize

from paths import reach

ROOT = reach.thyrox_root()
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from lexicon_es_en import LEXICON  # noqa: E402
from overrides import OVERRIDES  # noqa: E402

GATE_LINE = re.compile(r'^  (?P<path>[^:]+\.py):(?P<line>\d+)  (?P<name>\S+)  ->')
#: Prefijo de f-string, en cualquier combinacion de mayusculas y `rb`.
F_PREFIX = re.compile(r'^[a-zA-Z]*[fF][a-zA-Z]*[\'"]')

RESERVED = set(keyword.kwlist) | set(dir(builtins))

#: Un destino que sombrearia un builtin se traduce con su OTRA forma directa,
#: no con un sinonimo buscado: `siguiente` es `next` y tambien `following`.
RESERVED_ALT = {'next': 'following', 'id': 'identifier', 'type': 'kind',
                'list': 'listing', 'all': 'every', 'sum': 'total',
                'format': 'shape', 'input': 'entry', 'max': 'greatest',
                'min': 'least', 'range': 'span', 'hash': 'digest',
                'object': 'obj', 'property': 'attr', 'filter': 'sieve'}

#: `RAIZ11` = palabra + ordinal. Sin separarlos la palabra no se ve.
DIGIT_TAIL = re.compile(r'^(?P<base>.*?)(?P<tail>\d+)$')

#: Parte un CamelCase en sus palabras, conservando un acronimo pegado (`RSTGate`).
CAMEL = re.compile(r'[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+')


#: Congelados por DIRECTIVA del ejecutor, no por deuda: «no toques
#: `generate_bin.py` ni `bin/` hasta que TypeScript, Python y shell esten en
#: verde». El gate los publica —son infractores reales— y este barrido los
#: SALTA. No es una exencion del idioma: es que su renombre se paga en otro
#: pase, cuando el arbol este verde y un fallo sea atribuible.
#:
#: Se aplica AQUI, en la lectura del universo, y no en el filtro de mas abajo,
#: porque el defecto ya ocurrio dos veces: el aplicador toco los dos archivos
#: y hubo que revertirlos a mano. Una exclusion que vive en el recorrido no
#: depende de que nadie se acuerde de pasar `--only`.
FROZEN = ('src/session/generate_bin.py', 'tests/session/test_generate_bin.py')


def gate_violations():
    out = subprocess.run(
        ['bash', str(ROOT / 'bin' / 'check_script_naming'), '--identifiers', str(ROOT)],
        capture_output=True, text=True, check=False, cwd=str(ROOT))
    for raw in out.stdout.splitlines():
        m = GATE_LINE.match(raw)
        if m and m['path'] not in FROZEN:
            yield m['path'], m['name']


def translate(name: str) -> str | None:
    """El nombre con cada pieza traducida, o None si nada cambia.

    Se parte por `_` y se conserva la caja de cada pieza: `Modelo` -> `Model`,
    `MAYUS` -> `MAYUS`. Traducir la palabra, no buscarle un sinonimo.
    """
    # Un nombre de clase no lleva `_`: `ProsaUnida` son dos palabras pegadas y
    # un `split('_')` ve una sola pieza intraducible. Medido: los 3 descartes
    # «sin traduccion» eran las 3 clases del corpus.
    partes = [q for pieza in name.split('_') for q in CAMEL.findall(pieza) or [pieza]]
    sep = '_' if '_' in name else ''
    nuevas, cambio = [], False
    for p in partes:
        # Un sufijo numerico es parte del nombre, no de la palabra: `RAIZ11` es
        # `RAIZ` mas un ordinal, y sin separarlo el `split('_')` no ve ninguna
        # palabra traducible. Medido: 7 de los 83 descartes eran de esta forma.
        m = DIGIT_TAIL.match(p)
        base, cola = (m['base'], m['tail']) if m else (p, '')
        low = base.lower()
        if low in LEXICON:
            en = RESERVED_ALT.get(LEXICON[low], LEXICON[low])
            if base.isupper() and len(base) > 1:
                en = en.upper()
            elif base[:1].isupper():
                en = en[:1].upper() + en[1:]
            nuevas.append(en + cola)
            cambio = True
        else:
            nuevas.append(p)
    return sep.join(nuevas) if cambio else None


def imported_names(tree) -> set[str]:
    out = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                out.add((a.asname or a.name).split('.')[0])
        elif isinstance(node, ast.ImportFrom):
            for a in node.names:
                out.add(a.asname or a.name)
    return out


def scope_ranges(tree):
    """[(inicio, fin)] de cada funcion del archivo, mas el modulo entero.

    El ambito importa: dos funciones distintas pueden tener `nombre` y `name`
    sin que renombrar el primero fusione nada. Medir la colision sobre el
    ARCHIVO entero descarta renombres seguros — es el sub-patron A con el
    aplicador como sujeto: un rotulo («el archivo») sobre dos poblaciones.
    """
    rangos = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            rangos.append((node.lineno, node.end_lineno or node.lineno))
    return rangos


def _enclosing(rangos, line):
    """El ambito mas ajustado que contiene la linea, o None para el modulo."""
    dentro = [r for r in rangos if r[0] <= line <= r[1]]
    return min(dentro, key=lambda r: r[1] - r[0]) if dentro else None


def bound_names(tree):
    """{(nombre, linea)} de lo que el archivo LIGA, por AST.

    Un NAME token no basta: `subprocess.run` y `text=True` son NAME y no ligan
    nada — el primero es un atributo de otro objeto, el segundo el nombre de un
    parametro de una funcion AJENA. Contarlos como colision descarta renombres
    seguros; medido, eran la causa de la mayoria de los 40 descartes.
    """
    out = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            out.add((node.id, node.lineno))
        elif isinstance(node, ast.arg):
            out.add((node.arg, node.lineno))
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            out.add((node.name, node.lineno))
        elif isinstance(node, ast.alias):
            out.add(((node.asname or node.name).split('.')[0], getattr(node, 'lineno', 1)))
    return out


def attribute_positions(toks):
    """Indices de NAME que van DETRAS de un punto: `args.sesion` -> `sesion`.

    No se renombran. Un atributo no es un simbolo de este archivo: puede ser el
    `dest` que argparse derivo de una cadena `--sesion`, y renombrar el acceso
    sin la cadena rompe el CLI en silencio. Es el defecto que este aplicador
    cometio en su primer pase, medido en el diff: `args.sesion` -> `args.session`
    con `add_argument('--sesion')` intacto.
    """
    fuera = set()
    previo = None
    for i, tk in enumerate(toks):
        if tk.type == tokenize.NAME and previo is not None and previo == '.':
            fuera.add(i)
        if tk.type in (tokenize.NAME, tokenize.OP, tokenize.NUMBER, tokenize.STRING):
            previo = tk.string
    return fuera


def collides(ligados, rangos, old, new):
    """True si `new` ya vive en alguno de los ambitos donde `old` aparece.

    Se compara el ambito MAS AJUSTADO de cada aparicion. Una aparicion a nivel
    de modulo colisiona con cualquier `new` del archivo: el modulo envuelve a
    todas las funciones y un renombre ahi las alcanza a todas.
    """
    ambitos_old = set()
    hay_modulo = False
    for nombre, linea in ligados:
        if nombre != old:
            continue
        amb = _enclosing(rangos, linea)
        if amb is None:
            hay_modulo = True
        else:
            ambitos_old.add(amb)
    for nombre, linea in ligados:
        if nombre != new:
            continue
        if hay_modulo:
            return True
        amb = _enclosing(rangos, linea)
        if amb is None or amb in ambitos_old:
            return True
        # Un `new` dentro de una funcion ANIDADA en el ambito de `old` tambien
        # colisiona: la funcion interna ve el nombre de la externa.
        if any(a[0] <= amb[0] and amb[1] <= a[1] for a in ambitos_old):
            return True
    return False


def _rewrite_fstring(texto: str, plan: dict) -> str:
    """Sustituye los nombres del plan DENTRO de los `{...}` de una f-string.

    El texto literal no se toca: `f"la raiz {raiz}"` pasa a `f"la raiz {root}"`
    y la palabra en prosa se queda. `{{` y `}}` son llaves escapadas, no
    interpolacion.
    """
    salida, i, n = [], 0, len(texto)
    while i < n:
        c = texto[i]
        if c == '{' and i + 1 < n and texto[i + 1] == '{':
            salida.append('{{'); i += 2; continue
        if c == '}' and i + 1 < n and texto[i + 1] == '}':
            salida.append('}}'); i += 2; continue
        if c != '{':
            salida.append(c); i += 1; continue
        j, hondo = i + 1, 1
        while j < n and hondo:
            if texto[j] == '{':
                hondo += 1
            elif texto[j] == '}':
                hondo -= 1
            j += 1
        interior = texto[i + 1:j - 1] if hondo == 0 else texto[i + 1:j]
        for old, new in plan.items():
            interior = re.sub(rf'(?<![\w.]){re.escape(old)}\b', new, interior)
        salida.append('{' + interior + ('}' if hondo == 0 else ''))
        i = j
    return ''.join(salida)


def surviving(path: pathlib.Path, plan: dict) -> list[str]:
    """Nombres del plan que SOBREVIVEN en el AST tras reescribir.

    Es la poscondicion que faltaba: `ast` SI ve dentro de una f-string
    (`FormattedValue`), asi que un nombre que el recorrido por tokens se
    salto aparece aqui. Sin ella un renombre parcial deja el archivo
    parseando y lo mata en ejecucion — que es como se descubrio.
    """
    tree = ast.parse(path.read_text(encoding='utf-8'))
    vivos = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and node.id in plan:
            vivos.add(node.id)
        elif isinstance(node, ast.arg) and node.arg in plan:
            vivos.add(node.arg)
    return sorted(vivos)


def rewrite(path: pathlib.Path, names: set[str], dry: bool, rel: str = ''):
    """Devuelve (aplicados, descartados) para un archivo.

    `rel` es la ruta relativa, y sirve para consultar `OVERRIDES`: un override
    se declara POR SITIO porque resuelve una colision de ESE ambito.
    """
    src = path.read_text(encoding='utf-8')
    tree = ast.parse(src)
    externos = imported_names(tree)
    toks = list(tokenize.generate_tokens(io.StringIO(src).readline))
    ambitos = scope_ranges(tree)
    ligados = bound_names(tree)
    atributos = attribute_positions(toks)
    plan, descartes = {}, []
    for old in sorted(names):
        new = OVERRIDES.get((rel, old)) or translate(old)
        if new is None:
            descartes.append((old, 'sin traduccion'))
        elif old in externos:
            descartes.append((old, 'simbolo importado'))
        elif collides(ligados, ambitos, old, new):
            descartes.append((old, f'colision con {new}'))
        elif new in RESERVED:
            descartes.append((old, f'{new} es reservado o builtin'))
        else:
            plan[old] = new
    if not plan:
        return {}, descartes
    piezas = [(tok.start, tok.end, plan[tok.string]) for i, tok in enumerate(toks)
              if tok.type == tokenize.NAME and tok.string in plan
              and i not in atributos]
    # El INTERIOR de una f-string, que bajo 3.11 es invisible al recorrido.
    # `redaccion-tecnica-es.md` ya lo declara (H-API-607): hasta 3.11 la
    # f-string entera es UN token STRING, asi que `f"{veredicto.shape}"` no
    # emite ningun NAME y el renombre por posicion lo salta EN SILENCIO —
    # el archivo sigue parseando y muere en ejecucion con NameError.
    # Aqui no hay 3.12: `python3`, `.venv` y `uv run` dan 3.11.15. Asi que
    # el interior se reescribe aparte, y solo dentro de sus `{...}`.
    for tok in toks:
        if tok.type != tokenize.STRING or tok.start[0] != tok.end[0]:
            continue
        if not F_PREFIX.match(tok.string):
            continue
        nuevo = _rewrite_fstring(tok.string, plan)
        if nuevo != tok.string:
            piezas.append((tok.start, tok.end, nuevo))
    # Se ORDENA por posicion antes de recorrer al reves. `piezas` concatena dos
    # series ascendentes —los NAME y luego los interiores de f-string— y
    # `reversed()` de esa concatenacion NO es descendente: la segunda serie se
    # aplica de izquierda a derecha y desplaza los offsets de la primera.
    # Medido al cometerlo: `for estado, cuantas in fuera` acabo como
    # `for estado,how_manys inoutsidea`.
    piezas.sort(key=lambda p: p[0])
    if piezas and not dry:
        lineas = src.splitlines(keepends=True)
        for (sl, sc), (el, ec), new in reversed(piezas):
            if sl != el:
                continue
            ln = lineas[sl - 1]
            lineas[sl - 1] = ln[:sc] + new + ln[ec:]
        candidato = ''.join(lineas)
        # Se VALIDA antes de escribir, no despues: un `ast.parse` posterior
        # detecta el destrozo con el archivo ya en disco, y entonces el arreglo
        # es revertir el arbol entero. Aqui el archivo roto no llega a existir.
        try:
            ast.parse(candidato)
        except SyntaxError as e:
            raise SystemExit(
                f'{path}:{e.lineno}: la reescritura NO parsea ({e.msg}). '
                f'No se escribio nada. Linea: {(lineas[(e.lineno or 1) - 1]).rstrip()!r}'
            ) from e
        path.write_text(candidato, encoding='utf-8')
        vivos = surviving(path, plan)
        if vivos:                                  # poscondicion dura
            raise SystemExit(
                f'{path}: renombre PARCIAL, sobreviven {vivos}. '
                'El archivo parsea y moriria en ejecucion con NameError.')
    return plan, descartes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--only', help='prefijo de ruta a limitar (p. ej. tests/)')
    args = ap.parse_args()

    por_archivo: dict[str, set[str]] = {}
    for rel, name in gate_violations():
        if args.only and not rel.startswith(args.only):
            continue
        por_archivo.setdefault(rel, set()).add(name)

    total_plan = total_desc = 0
    for rel in sorted(por_archivo):
        plan, desc = rewrite(ROOT / rel, por_archivo[rel],
                             dry=not args.apply, rel=rel)
        total_plan += len(plan)
        total_desc += len(desc)
        # En seco se PUBLICA el plan, no solo su conteo: un modo de prueba que
        # dice «10 renombres» y no cuales no se puede leer, y era justo lo que
        # hacia falta para ver si el paso 1 deshace lo que el paso 5 congela.
        if not args.apply:
            for old, new_name in sorted(plan.items()):
                print(f'  PLAN {rel}::{old} -> {new_name}')
        if desc:
            for old, why in desc:
                print(f'  DESCARTADO {rel}::{old}  ({why})')
    print(f'archivos: {len(por_archivo)} · renombres: {total_plan} · '
          f'descartados: {total_desc} · modo: {"APLICADO" if args.apply else "seco"}')


if __name__ == '__main__':
    main()
