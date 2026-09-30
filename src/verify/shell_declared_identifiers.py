"""Los identificadores que un guion de shell DECLARA, con su línea.

No hay parser de bash en el entorno y no se añade dependencia: se mide con un
análisis léxico acotado a las formas que declaran un nombre —asignación,
``local``/``export``/``readonly``/``declare``/``typeset`` con sus banderas,
definición de función (``name() {`` y ``function name``), la variable de
``for``/``select`` y los nombres de ``read``—.

Una asignación cuenta sólo en posición de comando: al empezar la línea o tras
un separador (``;``, ``&&``, ``|``, ``(``, ``{``…) y sus palabras clave
(``then``, ``do``…). ``make valor=1`` pasa un argumento, no declara nada. Las
cadenas y los comentarios se enmascaran antes de buscar, y el cuerpo de un
heredoc se descarta con ``hooks.shell_text.strip_heredoc_bodies``, el mismo
instrumento que usan los detectores.

*Métrica:* nombres en posición de declaración, fuera de cadenas, comentarios
y cuerpos de heredoc.
*Ciega a:* un ``<<`` que no abre heredoc fuera de un comentario de línea
entera —un desplazamiento aritmético ``$((a<<2))`` o una cola de comentario
``cmd # <<EOF``— descarta las líneas siguientes hasta su terminador, y lo que
declaren no se mide; a las asignaciones dentro de ``$(…)`` entre comillas; y a
los nombres que se declaran por indirección (``printf -v``, ``eval``). Es una
cota inferior, como el gate que la usa.
"""
from __future__ import annotations

import re
from pathlib import Path

from hooks.shell_text import strip_heredoc_bodies

SHELL_SUFFIX = '.sh'
#: Intérpretes cuyo shebang hace shell a un archivo sin extensión.
SHELL_INTERPRETERS = frozenset({'bash', 'sh'})
#: Bytes que se leen para decidir el shebang: la primera línea, no el archivo.
SHEBANG_READ_LIMIT = 256

#: Constructores que declaran cada nombre que reciben, con o sin valor.
DECLARING_BUILTINS = frozenset({'local', 'export', 'readonly', 'declare', 'typeset'})
#: Palabras que introducen la variable del bucle en la palabra siguiente.
LOOP_KEYWORDS = frozenset({'for', 'select'})
#: Palabras clave tras las que la siguiente palabra vuelve a estar en posición
#: de comando.
COMMAND_PREFIX_KEYWORDS = frozenset({'then', 'do', 'else', 'elif', 'if', 'while', 'until', '!', 'time'})
#: Opciones de ``read`` que consumen un argumento que no es un nombre.
READ_OPTIONS_WITH_VALUE = frozenset('dnNptui')
#: La opción de ``read`` cuyo argumento SÍ es un nombre: el arreglo destino.
READ_ARRAY_OPTION = 'a'

_ASSIGNMENT = re.compile(r'^([A-Za-z_]\w*)(?:\[[^\]]*\])?\+?=')
_NAME = re.compile(r'^([A-Za-z_]\w*)(?:\[[^\]]*\])?(?:\+?=.*)?$')
_FUNCTION = re.compile(
    r'(?:^|[;&|(){}])\s*(?:(?:then|do|else)\s+)?'
    r'(?:function\s+([A-Za-z_][\w:-]*)|([A-Za-z_][\w:-]*)\s*\(\s*\))')
_SEPARATOR = re.compile(r'\|\||&&|;;|[;&|(){}]')
_REDIRECTION = re.compile(r'^\d*[<>]')
_FULL_LINE_COMMENT = re.compile(r'^\s*#')
#: Caracteres tras los que un ``#`` abre comentario: inicio de palabra.
_COMMENT_OPENERS = frozenset(' \t;&|()')
_MASK = '_'


def is_shell_script(path: Path) -> bool:
    """¿Es un guion de shell? Por extensión, o sin ella por su shebang."""
    if path.suffix == SHELL_SUFFIX:
        return True
    if path.suffix or not path.is_file():
        return False
    return _shebang_interpreter(path) in SHELL_INTERPRETERS


def _shebang_interpreter(path: Path) -> str:
    """El nombre del intérprete del shebang, resolviendo ``env``; vacío si no hay."""
    with path.open('rb') as handle:
        first = handle.readline(SHEBANG_READ_LIMIT)
    if not first.startswith(b'#!'):
        return ''
    words = first[2:].decode('utf-8', 'replace').split()
    if words and Path(words[0]).name == 'env':
        words = words[1:]
    return Path(words[0]).name if words else ''


def shell_declared_identifiers(text: str) -> list[tuple[str, int]]:
    """``[(nombre, línea)]`` de cada declaración del guion, en orden."""
    found: list[tuple[str, int]] = []
    for lineno, line in _masked_lines(_lines_outside_heredocs(text)):
        found += [(name, lineno) for name in _declared_in_line(line)]
    return found


def _lines_outside_heredocs(text: str) -> list[tuple[int, str]]:
    """Las líneas que no son cuerpo de heredoc, con su número original.

    ``strip_heredoc_bodies`` devuelve sólo texto. Para no perder el número, se
    antepone a cada línea su índice en binario escrito con espacio y
    tabulador: su comparación con el terminador usa ``strip()``, que lo
    ignora, y la búsqueda del marcador no lo ve. Los comentarios de línea
    entera se vacían antes, porque un ``<<'EOF'`` citado en prosa abriría un
    heredoc que no existe.
    """
    lines = ['' if _FULL_LINE_COMMENT.match(line) else line for line in text.split('\n')]
    width = max(1, len(lines).bit_length())
    encoded = [_index_prefix(index, width) + line for index, line in enumerate(lines)]
    kept = strip_heredoc_bodies('\n'.join(encoded)).split('\n')
    return [(_decode_index(line[:width]) + 1, line[width:]) for line in kept]


def _index_prefix(index: int, width: int) -> str:
    return format(index, f'0{width}b').replace('0', ' ').replace('1', '\t')


def _decode_index(prefix: str) -> int:
    return int(prefix.replace(' ', '0').replace('\t', '1'), 2)


def _masked_lines(lines: list[tuple[int, str]]) -> list[tuple[int, str]]:
    """Las líneas con el contenido de sus cadenas vaciado y sin comentarios.

    Las comillas se conservan y su contenido se sustituye por un carácter de
    palabra, así que una cadena sigue siendo UNA palabra y ya no lleva ``=``.
    El estado de comillas cruza líneas: una cadena puede ocupar varias.
    """
    masker = _QuoteMasker()
    return [(lineno, masker.mask(line)) for lineno, line in lines]


class _QuoteMasker:
    """Enmascara cadenas y comentarios línea a línea, recordando la comilla abierta."""

    def __init__(self) -> None:
        self.quote = ''

    def mask(self, line: str) -> str:
        out: list[str] = []
        index = 0
        while index < len(line):
            char = line[index]
            if self.quote:
                index = self._inside_quote(line, index, out)
            elif char == '\\':
                out.append(line[index:index + 2])
                index += 2
            elif char in ('"', "'"):
                self.quote = "$'" if char == "'" and line[index - 1:index] == '$' else char
                out.append(char)
                index += 1
            elif char == '#' and _opens_comment(line, index):
                break
            else:
                out.append(char)
                index += 1
        return ''.join(out)

    def _inside_quote(self, line: str, index: int, out: list[str]) -> int:
        char = line[index]
        if char == '\\' and self.quote != "'":
            out.append(_MASK * len(line[index:index + 2]))
            return index + 2
        if char == self.quote[-1]:
            self.quote = ''
            out.append(char)
        else:
            out.append(_MASK)
        return index + 1


def _opens_comment(line: str, index: int) -> bool:
    return index == 0 or line[index - 1] in _COMMENT_OPENERS


def _declared_in_line(line: str) -> list[str]:
    names = [match.group(1) or match.group(2) for match in _FUNCTION.finditer(line)]
    for segment in _SEPARATOR.split(line):
        names += _declared_in_segment(segment.split())
    return names


def _declared_in_segment(words: list[str]) -> list[str]:
    """Los nombres que declara UN comando simple, ya partido en palabras."""
    position = 0
    while position < len(words) and words[position] in COMMAND_PREFIX_KEYWORDS:
        position += 1
    names: list[str] = []
    while position < len(words) and (assignment := _ASSIGNMENT.match(words[position])):
        names.append(assignment.group(1))
        position += 1
    if position == len(words):
        return names
    command, arguments = words[position], words[position + 1:]
    if command in DECLARING_BUILTINS:
        names += _declared_by_builtin(arguments)
    elif command in LOOP_KEYWORDS and arguments:
        names += _names_among(arguments[:1])
    elif command == 'read':
        names += _declared_by_read(arguments)
    return names


def _declared_by_builtin(arguments: list[str]) -> list[str]:
    return _names_among(word for word in arguments if not word.startswith(('-', '+')))


def _declared_by_read(arguments: list[str]) -> list[str]:
    """Los nombres de ``read``: sus operandos y el arreglo de ``-a``."""
    names: list[str] = []
    position = 0
    while position < len(arguments) and not _REDIRECTION.match(arguments[position]):
        word = arguments[position]
        position += 1
        if word == '--' or not word.startswith('-'):
            names += _names_among([word]) if word != '--' else []
            continue
        option, value = _read_option_value(word)
        if option and not value and position < len(arguments):
            value = arguments[position]
            position += 1
        if option == READ_ARRAY_OPTION:
            names += _names_among([value])
    return names


def _read_option_value(word: str) -> tuple[str, str]:
    """La primera opción de ``word`` que lleva valor, y el valor pegado a ella."""
    flags = word[1:]
    for index, flag in enumerate(flags):
        if flag == READ_ARRAY_OPTION or flag in READ_OPTIONS_WITH_VALUE:
            return flag, flags[index + 1:]
    return '', ''


def _names_among(words) -> list[str]:
    return [match.group(1) for match in map(_NAME.match, words) if match]
