"""Detector PreToolUse: el idioma DENTRO de un archivo de codigo.

Es el undecimo detector, y cierra una ceguera medida, no supuesta. Aplica
``identificadores-en-ingles.md`` (identificador en ingles, comentario en
espanol) y ``redaccion-tecnica-es.md`` (sin coloquialismos, termino tecnico en
ingles) a las dos extensiones que ningun gate del arbol alcanza.

La ceguera, medida antes de escribir esto
------------------------------------------

=========================================  =====================================
Instrumento                                Que NO ve
=========================================  =====================================
``detect_prose_vocabulary.py``             ``PROSE_SUFFIXES = ('.rst', '.md')``
                                           y ``:65`` rechaza el resto: un
                                           comentario en espanol dentro de un
                                           ``.ts`` o un ``.sh`` no es prosa
``check_identifier_language.py``           recorre AST de Python; un ``.ts`` y
                                           un ``.sh`` no tienen AST que recorrer
``check_script_naming.py --identifiers``   el mismo recorrido AST, otra raiz
``check_script_naming.py --idioma``        el NOMBRE del archivo, no su interior
=========================================  =====================================

El control positivo NO esta fabricado: al escribir el grifo de /tmp de esta
misma sesion se colaron diez ocurrencias de ``corrida`` —linea 66 de la lista
vetada— en ``tests/preload/tmpdir.ts``, ``tests/run.sh``, ``bunfig.toml`` y la
suite del grifo. Ningun gate del arbol las vio, y el ejecutor tuvo que
senalarlas. Ese es el defecto que este detector ataja en el momento de escribir.

Significante contra significado
--------------------------------

Este detector mide el **significante**: la forma de la palabra. No mide el
significado, y no puede. De ahi sus dos mitades de juicio, que son lo unico que
lo separa de un aviso que sale siempre y se aprende a ignorar:

1. **Un literal de cadena no es un comentario.** ``const s = "corrida"`` puede
   ser el dato de una prueba; un comentario no.
2. **Una cita marcada no es un uso.** Una forma vetada entre acentos graves
   dentro de un comentario esta CITANDO el antipatron, que es exactamente lo
   que hacen las reglas que lo prohiben. Sin esta mitad, el detector marcaria
   como defecto el documento que ensena a evitarlo.

Las dos se prueban por anulacion en ``tests/hooks/test_detect_code_language.py``:
retirada cada una, caen exactamente los casos que dependen de ella.

Reusa el lexico, no lo copia
-----------------------------

Que palabras son espanolas lo decide ``spanish_words_in`` de
``src/verify/check_identifier_language.py``; que formas estan vetadas lo decide
el ``vocabulario_prohibido.txt`` que ``src/verify/check_vocabulario_prosa.py``
resuelve. Duplicar cualquiera de los dos creaba una segunda fuente de verdad que
nadie sincroniza — el defecto que ``calibration-verified-numbers.md`` prohibe.

Por eso **declara su precondicion**: sin lexico el detector NO calla, avisa de
que no pudo medir. Un ``None`` silencioso es indistinguible de «no hay
defectos», que es el sub-patron D con este detector como sujeto.

Ciego a
--------

- la palabra que existe en los dos idiomas (``total``, ``final``, ``normal``) —
  la ceguera del lexico que reusa;
- el identificador que el regex no alcanza: es una **cota inferior** por
  construccion, no un recorrido de AST. Un cero aqui no prueba que no quede
  espanol, prueba que no queda del que este instrumento sabe ver;
- el sentido: no separa «cita legitima en prosa llana» de «uso real». La cita
  marcada si la reconoce; la llana, no.
"""
from __future__ import annotations

import importlib.util
import pathlib
import re
import sys

TOOLS = ('Write', 'Edit', 'MultiEdit')

#: Las extensiones cuyo interior ningun otro gate del arbol mide.
CODE_SUFFIXES = ('.ts', '.tsx', '.js', '.mjs', '.cjs', '.sh', '.bash')

#: Extensiones cuyo comentario abre con ``#`` en vez de ``//``.
HASH_COMMENT_SUFFIXES = ('.sh', '.bash')

_HERE = pathlib.Path(__file__).resolve().parent
_VERIFY = _HERE.parent / 'verify'


def _load(name: str):
    """Carga un modulo de ``src/verify`` por ruta, sin exigir el paquete."""
    ruta = _VERIFY / f'{name}.py'
    if not ruta.is_file():
        return None
    spec = importlib.util.spec_from_file_location(f'_code_language_{name}', ruta)
    if spec is None or spec.loader is None:
        return None
    modulo = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = modulo
    try:
        spec.loader.exec_module(modulo)
    except Exception:
        return None
    return modulo


# --- extraccion: identificadores -------------------------------------------
#
# Por regex y no por AST, y se declara: un `.ts` exigiria el analizador de
# TypeScript y un `.sh` no tiene ninguno. La consecuencia esta declarada arriba
# como ceguera — es una cota inferior, no un censo.

_TS_DECLARATION = re.compile(
    r'\b(?:function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)'
    r'|\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)'
)
_TS_PARAMETER = re.compile(r'[(,]\s*([a-z_$][\w$]*)\s*[:),]')
_SH_DECLARATION = re.compile(
    r'^\s*([A-Za-z_][\w]*)\s*\(\)\s*\{'
    r'|^\s*(?:local|export|declare|readonly)?\s*([A-Za-z_][\w]*)=',
    re.M,
)


def declared_identifiers(text: str, is_shell: bool) -> set[str]:
    """Los identificadores que el archivo declara, hasta donde el regex llega."""
    found: set[str] = set()
    patterns = (_SH_DECLARATION,) if is_shell else (_TS_DECLARATION, _TS_PARAMETER)
    for pattern in patterns:
        for match in pattern.finditer(text):
            for group in match.groups():
                if group:
                    found.add(group)
    return found


# --- extraccion: comentarios -----------------------------------------------

_TS_LINE_COMMENT = re.compile(r'(?<![:"\'`\\])//(.*)$', re.M)
_TS_BLOCK_COMMENT = re.compile(r'/\*(.*?)\*/', re.S)
_SH_LINE_COMMENT = re.compile(r'(?<!\$)#(.*)$', re.M)

#: Una forma vetada entre acentos graves esta CITANDO el antipatron, no usandolo.
_MARKED_CITATION = re.compile(r'`[^`]*`|``[^`]*``')


def comment_text(text: str, is_shell: bool) -> str:
    """La prosa del archivo: sus comentarios, sin sus literales de cadena.

    La mitad de juicio numero 1 vive aqui — se descuentan los literales antes de
    buscar el comentario, para que ``const s = "// corrida"`` no cuente.
    """
    sin_literales = re.sub(r'"[^"\n]*"|\'[^\'\n]*\'', '""', text)
    partes: list[str] = []
    if is_shell:
        # La primera linea puede ser el shebang: es interprete, no prosa.
        cuerpo = re.sub(r'\A#![^\n]*\n', '\n', sin_literales)
        partes += _SH_LINE_COMMENT.findall(cuerpo)
    else:
        partes += _TS_BLOCK_COMMENT.findall(sin_literales)
        partes += _TS_LINE_COMMENT.findall(sin_literales)
    return '\n'.join(partes)


def unmarked(prose: str) -> str:
    """La prosa sin sus citas marcadas — la mitad de juicio numero 2."""
    return _MARKED_CITATION.sub(' ', prose)


# --- el veredicto ----------------------------------------------------------

def load_forbidden() -> frozenset[str] | None:
    """Las formas vetadas, resueltas por el gate que ya las gobierna."""
    gate = _load('check_vocabulario_prosa')
    if gate is None:
        return None
    try:
        ruta = gate.resolve_forbidden()
    except SystemExit:
        return None
    except Exception:
        return None
    if ruta is None or not pathlib.Path(ruta).is_file():
        return None
    formas = set()
    for linea in pathlib.Path(ruta).read_text(encoding='utf-8').splitlines():
        linea = linea.strip()
        if linea and not linea.startswith('#'):
            formas.add(linea.lower())
    return frozenset(formas)


def forbidden_in(prose: str, forbidden: frozenset[str]) -> list[str]:
    """Las formas vetadas que la prosa USA — no las que cita."""
    cuerpo = unmarked(prose).lower()
    return sorted({
        forma for forma in forbidden
        if re.search(r'(?<![\w])' + re.escape(forma) + r'(?![\w])', cuerpo)
    })


def spanish_in(identifiers: set[str]) -> list[str]:
    """Los identificadores con palabra espanola, segun el lexico del gate."""
    gate = _load('check_identifier_language')
    if gate is None:
        return []
    try:
        families = gate.code_suffix_families(identifiers)
    except Exception:
        families = frozenset()
    marcados = []
    for name in sorted(identifiers):
        try:
            if gate.spanish_words_in(name, families):
                marcados.append(name)
        except Exception:
            continue
    return marcados


def _content_of(tool_name: str, tool_input: dict) -> str:
    if tool_name == 'Write':
        return str(tool_input.get('content') or '')
    if tool_name == 'Edit':
        return str(tool_input.get('new_string') or '')
    if tool_name == 'MultiEdit':
        edits = tool_input.get('edits') or []
        if isinstance(edits, list):
            return '\n'.join(str(e.get('new_string') or '') for e in edits
                             if isinstance(e, dict))
    return ''


def detect(payload: dict) -> str | None:
    tool_name = payload.get('tool_name') or ''
    if tool_name not in TOOLS:
        return None
    tool_input = payload.get('tool_input') or {}
    if not isinstance(tool_input, dict):
        return None
    path = str(tool_input.get('file_path') or '')
    if not path.endswith(CODE_SUFFIXES):
        return None
    text = _content_of(tool_name, tool_input)
    if not text.strip():
        return None

    is_shell = path.endswith(HASH_COMMENT_SUFFIXES)
    prose = comment_text(text, is_shell)
    identifiers = declared_identifiers(text, is_shell)

    forbidden = load_forbidden()
    if forbidden is None:
        return (
            'IDIOMA: no se pudo medir — falta `vocabulario_prohibido.txt`, que '
            '`src/verify/check_vocabulario_prosa.py` resuelve. NO se emite un '
            'veredicto: un silencio aqui seria indistinguible de «sin '
            'defectos». Declarar el parametro o correr desde el consumidor.'
        )

    vetadas = forbidden_in(prose, forbidden)
    espanoles = spanish_in(identifiers)
    if not vetadas and not espanoles:
        return None

    lineas = ['IDIOMA en un archivo de codigo — el gate de prosa sólo ve '
              '`.rst`/`.md` y los de identificador recorren AST de Python, '
              'así que este archivo no lo mide nadie más.']
    if espanoles:
        lineas.append(
            '  identificador en español (van en INGLÉS): '
            + ', '.join(espanoles[:8])
        )
    if vetadas:
        lineas.append(
            '  vocabulario vetado en un comentario (el comentario va en '
            'español, pero sin coloquialismos y con el término técnico en '
            'inglés): ' + ', '.join(vetadas[:8])
        )
    lineas.append(
        '  Mide el significante, no el significado: una cita marcada entre '
        'acentos graves no cuenta, una cita en prosa llana sí — el juicio es '
        'de quien recibe el aviso. Reglas: `identificadores-en-ingles.md`, '
        '`redaccion-tecnica-es.md`.'
    )
    return '\n'.join(lineas)
