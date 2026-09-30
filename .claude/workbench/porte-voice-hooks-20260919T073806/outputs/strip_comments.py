"""Emite solo las lineas de CODIGO: sin comentarios de linea, de bloque,
sin comentario AL FINAL de una linea de codigo, y sin lineas vacias.

Discrimina «se retiro o se tradujo un comentario» de «el porte esta
incompleto», que es lo que un diff crudo colapsa en una sola cifra.

Banderas:
  --scope     normaliza `@claude-code-how-works/` -> `@thyrox/` antes de medir.
  --no-trail  NO retira el comentario al final de una linea de codigo. Es el
              control de anulacion del recorte de cola: con el, `'raw', // PCM
              crudo` cuenta como divergencia de CODIGO y no lo es.

Metrica: lineas no vacias que quedan tras retirar los tres tipos de comentario.
Ciega a: una linea partida por el formateador (un `,` movido de linea cuenta
como dos diferencias), y a un `//` dentro de una plantilla anidada con
interpolacion — el recorte de cola sigue comillas simples, dobles y backtick,
no el interior de un `${...}`.
"""
import re
import sys
from pathlib import Path


def strip_trailing_comment(line: str) -> str:
    """Retira ` // ...` cuando el `//` NO esta dentro de una cadena.

    Se recorre caracter a caracter siguiendo el estado de comilla porque un
    `'http://x'` lleva `//` y no es un comentario: un `split('//')` lo partiria.
    """
    quote = None
    i = 0
    while i < len(line):
        c = line[i]
        if quote:
            if c == '\\':
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in '\'"`':
            quote = c
        elif c == '/' and line[i + 1:i + 2] == '/':
            return line[:i]
        i += 1
    return line


args = sys.argv[1:]
path = args[0]
scope = '--scope' in args
trail = '--no-trail' not in args

texto = Path(path).read_text()
if scope:
    texto = texto.replace('@claude-code-how-works/', '@thyrox/')

# Bloques /* ... */ fuera de cadena: aproximacion suficiente para este uso.
texto = re.sub(r'/\*.*?\*/', '', texto, flags=re.S)
for line in texto.split('\n'):
    sin = line.strip()
    if not sin or sin.startswith('//'):
        continue
    if trail:
        sin = strip_trailing_comment(sin).strip()
        if not sin:
            continue
    print(sin)
