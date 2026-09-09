#!/usr/bin/env python3
"""Detector PreToolUse: el vocabulario vetado o inventado, antes de escribirlo.

Su gemelo de corpus es ``verify.check_vocabulario_prosa``, y de ahí importa
**todo** el criterio. Duplicar los patrones aquí garantizaría que los dos se
separen: el hook avisaría de una lista y el gate mediría otra.

Los dos ejes miden cosas distintas y por eso conviven:

- **vetadas** — la lista cerrada de clichés y términos ya resueltos. Sin léxico,
  instantáneo.
- **inventadas** — el sustantivo con sufijo nominalizador que ningún corpus
  atestigua. Exige el léxico, así que sólo se carga **si hay candidato**: medido
  en la fuente, cargar el millón de formas cuesta cuatro órdenes de magnitud más
  que consultarlas.

**El gate se importa a nivel de módulo, no dentro de ``detect``.** La fuente lo
cargaba con ``importlib`` dentro de la función, y cuando su ruta quedó muerta
tras una mudanza el fallo lo tragaba el ``except`` de abajo: el hook emitía
``{}`` y un texto sin vocabulario vetado se veía IDÉNTICO a uno con él — el
control que no discrimina. Aquí una ruta muerta revienta al cargar el detector,
el despachador lo cuenta como ausente y lo nombra en su stderr.
"""

import pathlib
import sys

# ``sys.path[0]`` es ``src/hooks`` y ``verify`` no resolvería desde ahí.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from verify import check_vocabulario_prosa as gate  # noqa: E402

PROSE_SUFFIXES = ('.rst', '.md')

# El léxico es opcional POR DISEÑO: sin él cae el eje de inventadas y sobrevive
# el de vetadas, que es el que no lo necesita. Lo que no vale es que su ausencia
# apague los dos en silencio.
try:
    import spacy_lookups_data as _LEXICON_PKG
except ModuleNotFoundError:
    _LEXICON_PKG = None


def written_text(tool_input):
    """Lo que la herramienta va a escribir, sea cual sea su forma.

    ``Write`` trae ``content``; ``Edit``, ``new_string``; ``MultiEdit``, una
    lista de ediciones. Se concatena: al detector le da igual de cuál venga.
    """
    pieces = []
    for key in ('content', 'new_string'):
        value = tool_input.get(key)
        if isinstance(value, str):
            pieces.append(value)
    for edit in tool_input.get('edits') or []:
        if isinstance(edit, dict) and isinstance(edit.get('new_string'), str):
            pieces.append(edit['new_string'])
    return '\n'.join(pieces)


def detect(payload):
    """El aviso de vocabulario si el texto nuevo lo merece, o ``None``."""
    tool_input = payload.get('tool_input') or {}
    path = tool_input.get('file_path') or ''
    if not path.endswith(PROSE_SUFFIXES):
        return None

    text = written_text(tool_input)
    if not text.strip():
        return None

    measured = [pathlib.Path(path)]

    # Las dos exenciones del gate completo, con el mismo código: lo que va
    # dentro de un literal está CITADO, no escrito.
    spans = gate.literal_spans(text) + gate.block_spans(text)

    def outside_quote(start, end):
        return not any(a <= start and end <= b for a, b in spans)

    # --- Eje 1: formas vetadas. Lista cerrada, sin léxico, instantáneo. -----
    # La lista es PARÁMETRO del consumidor (DEC-04), no del proveedor: por eso
    # ``load_forbidden`` exige su ruta y ``resolve_forbidden`` la deriva del
    # archivo medido, que ancla al clon correcto.
    forbidden = []
    forbidden_list = gate.resolve_forbidden(measured)
    for form, pattern in gate.compile_forbidden(gate.load_forbidden(forbidden_list)):
        if any(outside_quote(m.start(), m.end()) for m in pattern.finditer(text)):
            forbidden.append(form)

    # --- Eje 2: sustantivos inventados. El léxico SÓLO si hay candidato. ----
    candidates = {
        m.group(0).lower()
        for m in gate.WORD.finditer(text)
        if outside_quote(m.start(), m.end())
        and gate.NOMINAL_SUFFIX.match(m.group(0).lower())
    }
    coined = []
    if candidates and _LEXICON_PKG is not None:
        lexicon = gate.load_lexicon(_LEXICON_PKG)
        if lexicon:
            frozen = gate.load_baseline(gate.resolve_baseline(measured))
            coined = sorted(
                c for c in candidates
                if not gate.attested(c, lexicon) and c not in frozen
            )

    if not forbidden and not coined:
        return None

    parts = ['GATE DE VOCABULARIO — antes de que esta escritura aterrice.']
    if forbidden:
        parts.append(
            'Formas vetadas en el texto nuevo: '
            + ', '.join(f'`{f}`' for f in sorted(forbidden))
            + '. Son clichés, coloquialismos o términos ya resueltos; su '
              'sustitución está en `redaccion-tecnica-es.md`. Si el texto las '
              'CITA en vez de usarlas, ponlas en literal ``así`` — el gate '
              'reconoce la cita marcada, y la sin marcar no.'
        )
    if coined:
        parts.append(
            'Sustantivos que ningún corpus atestigua: '
            + ', '.join(f'`{c}`' for c in coined)
            + '. Antes de acuñar uno: la cuarta prueba de '
              '`redaccion-tecnica-es.md` prohíbe inventar donde la fuente ya '
              'nombra el concepto, y el tercer corolario recuerda que un '
              'término relacional (`-bilidad`) no se usa sin su segundo '
              'argumento. Si es vocabulario de un estándar que este documento '
              'traduce, va al baseline CON su motivo escrito, no a secas.'
        )
    parts.append(
        'Esto NO bloquea: el hook no puede saber si es cita legítima. El '
        'veredicto con baseline y exenciones lo da el gate de corpus '
        '`verify/check_vocabulario_prosa.py`; este aviso cuesta milisegundos.'
    )
    return '\n\n'.join(parts)
