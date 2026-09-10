#!/usr/bin/env python3
"""Rechaza una clase de caracteres con un multibyte en herramienta de BYTE.

El defecto, medido
------------------
``grep``, ``sed`` y ``awk`` operan por byte. Sin un locale UTF-8, la ``é`` son
dos bytes (``303 251``) y dentro de ``[...]`` se vuelven **dos alternativas de
un byte cada una**. Por tanto ``m[eé]trica`` exige exactamente UN byte entre
la ``m`` y ``trica``, y ninguna de las dos mitades de la ``é`` lo satisface.

El patron es sintacticamente valido, no emite advertencia, y **devuelve 0**.
Un cero asi no se distingue de la ausencia real::

    grep -c  'Métrica:'      -> 6      el literal casa
    grep -ciE 'm[eé]trica:'  -> 0      la clase no casa NADA

El eje NO es el acento: es BYTE contra CARACTER
-----------------------------------------------
Python ``re`` sobre ``str`` opera por caracter y **no** tiene el defecto —
medido, 2 de 2. Sobre ``bytes``, si — 1 de 2. Por eso este gate mide ``.sh``
y no ``.py``: marcar un ``.py`` con ``[aá]`` seria ruido sobre codigo
correcto, y un aviso que sale siempre se aprende a ignorar.

Los dos arreglos que el gate acepta
-----------------------------------
1. **Alternancia** — ``an(a|á)lisis``: cada rama es una secuencia de bytes
   completa, asi que casa aunque el motor sea de byte.
2. **Locale declarado** — ``export LC_ALL=C.UTF-8``: el motor pasa a operar
   por caracter y la clase recupera su sentido.

Ceguera declarada
-----------------
- Recorre el **working tree**, no el indice: un ``.sh`` sin seguir entra, y uno
  seguido pero borrado del disco no.
- Solo ve la clase **corta y sin espacios**. Excluye a proposito el ``test`` de
  shell (``[ $x -eq 1 ]``) y la lista de Python, que casaban con un patron
  ingenuo y eran falsos positivos medidos.
- Es ciega al ``.py`` con patron de **bytes** (``rb"[aá]"``), que si tiene el
  defecto. No se midio ningun caso en el arbol; cerrar esa mitad exige
  distinguir el prefijo del literal, y queda declarado, no supuesto.

Familia
-------
Tercera forma registrada del mismo defecto —un patron valido que mide un
universo distinto del que su autor cree, y publica el resultado como cifra
sana—. Las otras dos: ``[^\\n]`` dentro de una clase ERE, que excluye la letra
n; y el cuantificador de intervalo que revienta ``mawk`` y mata una rama
entera del universo.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Una clase de REGEX: corta, sin espacios ni comillas.
REGEX_CLASS = re.compile(rb'\[[^]\n"\',$ ]{1,8}\]')
NON_ASCII = re.compile(rb'[\x80-\xff]')
DECLARES_UTF8_LOCALE = re.compile(
    rb'LC_ALL[=\s]*(C\.UTF-8|[a-z]{2}_[A-Z]{2}\.UTF-8)')

SKIP_DIRS = {'.git', 'node_modules', '.venv', 'build', 'dist',
             '__pycache__', '_archived'}


def offending_classes(raw: bytes) -> list[str]:
    """Las clases con un byte >= 0x80, si el guion no declara su locale.

    Se miden solo las lineas de CODIGO. Un comentario de linea entera que
    NOMBRA la clase —«sustituye [aa] por (a|a)»— no la ejecuta, asi que
    marcarlo confunde el significante con el significado (sub-patron C de
    `metrica-decide-la-conclusion.md`). Ocurrio: al cablear este gate al audit,
    el comentario que documentaba el defecto disparo el gate sobre su propio
    documentador.

    Ciego, y se declara: una clase en un comentario AL FINAL de una linea con
    codigo si se marca (la linea no empieza por `#`), y una clase dentro de una
    cadena que contenga `#` al principio de linea no se marca. Ninguna de las
    dos se ha observado; el filtro corrige el caso medido, no todos.
    """
    if DECLARES_UTF8_LOCALE.search(raw):
        return []
    encontradas = set()
    for linea in raw.splitlines():
        if linea.lstrip().startswith(b'#'):
            continue
        for m in REGEX_CLASS.finditer(linea):
            if NON_ASCII.search(m.group(0)):
                encontradas.add(m.group(0).decode('utf-8', 'replace'))
    return sorted(encontradas)


def scan(root: Path) -> tuple[int, dict[str, list[str]]]:
    measured, offenders = 0, {}
    for path in sorted(root.rglob('*.sh')):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if not path.is_file():
            continue
        measured += 1
        classes = offending_classes(path.read_bytes())
        if classes:
            offenders[str(path.relative_to(root))] = classes
    return measured, offenders


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default='.', help='raiz a medir')
    parser.add_argument('--strict', action='store_true',
                        help='exit 1 si hay incumplidores')
    # El contrato de --quiet en este arbol es un ENTERO PELADO, no prosa: el
    # llamador (thyrox-audit.sh) lo compara con -eq, y bash evalua el operando
    # aritmeticamente. Un gate que emite prosa bajo --quiet hace que la primera
    # palabra se lea como nombre de variable. Ver el filtro de `gate_midio`.
    parser.add_argument('--quiet', action='store_true',
                        help='emitir solo el conteo, como entero pelado')
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f'ERROR — la raiz no existe: {root}', file=sys.stderr)
        print('NO se emite un conteo: un 0 aqui seria un verde falso.',
              file=sys.stderr)
        return 2

    measured, offenders = scan(root)

    if args.quiet:
        print(len(offenders))
        return 1 if (args.strict and offenders) else 0

    for path, classes in sorted(offenders.items()):
        print(f'  {path}: {" ".join(classes)}')
        print('     la clase no casa NADA sin locale UTF-8 — usar (a|á) o '
              'declarar LC_ALL')

    print(f'check-byte-oriented-class: {len(offenders)} incumplidor(es) '
          f'(alcance medido: {measured} archivo(s) .sh)')
    return 1 if (args.strict and offenders) else 0


if __name__ == '__main__':
    raise SystemExit(main())
