"""Emite el `.rst` de gobierno de cada hallazgo que hoy existe SOLO como fila
del store.

`.claude/CLAUDE.md` declara que un hallazgo del consumidor tiene DOS caras —el
`.rst` es el artefacto de gobierno, la fila es su indice de busqueda— y que la
ventana entre registrar la fila y escribir el archivo **es legitima mientras
dura; congelada, es deuda**. Este guion paga esa deuda.

Por que un generador y no 36 archivos a mano:

- el contenido YA esta escrito, en `summary` y `content` de cada fila.
  Reescribirlo a mano es transcripcion, y la transcripcion es de donde salio
  el 1693 de :ref:`h-thyrox-129`;
- 36 escrituras con `date -u` por archivo es el contexto de lote que
  `timestamps-iso8601-obligatorios.md` marca como de alto riesgo de
  fabricacion. Aqui la fecha sale de `created_at` de la fila, que es la real;
- el `--source-ref` de la fila apunta hoy al README de un banco. Con el `.rst`
  escrito, la fuente de verdad es el `.rst`, y la fila se repunta a el.

**Rehusa con exit 2** ante una fila cuyo `initiative` no tenga un directorio
`hallazgos/` en el arbol del consumidor. Un slug de BANCO en esa columna no es
una iniciativa, y crear el directorio desde una columna del store fabricaria
una iniciativa que nadie decidio. Esas filas se repuntan antes, a mano.

Metrica: filas `H-<PREFIJO>-N` de `findings_history` sin un
`hallazgo-H-<PREFIJO>-N-*.rst` en ninguna raiz de `pm/`.
Ciega a: un `.rst` que exista con el id en el cuerpo pero no en el nombre del
archivo —el emparejamiento es por nombre—; y a si el contenido de la fila es
correcto, que es otro eje y lo decide quien lo escribio.
"""

import argparse
import pathlib
import re
import sqlite3
import sys
import textwrap
import unicodedata

CONSUMER = pathlib.Path('/home/user/kaupamex-docs')
PM = CONSUMER / 'source/gestion/pm'
FINDING_FILE = re.compile(r'^hallazgo-(H-[A-Z]+-\d+)-')
TABLE_ROW = re.compile(r':ref:`h-[a-z]+-\d+`', re.I)
TOC_ENTRY = re.compile(r'^   hallazgo-H-', re.M)


def slugify(text, limit=70):
    """Convierte un resumen en un slug ASCII kebab, como el resto del corpus."""
    plain = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    words = re.findall(r'[a-z0-9]+', plain.lower())
    out = []
    for word in words:
        if len('-'.join(out + [word])) > limit:
            break
        out.append(word)
    return '-'.join(out) or 'sin-titulo'


def existing_ids():
    found = set()
    for path in PM.rglob('hallazgo-H-*.rst'):
        match = FINDING_FILE.match(path.name)
        if match:
            found.add(match.group(1))
    return found


def rows_without_file(store, prefix):
    connection = sqlite3.connect(store)
    have = existing_ids()
    return [
        row for row in connection.execute(
            'select finding_id, submodule, initiative, severity, summary, '
            'content, source_ref, created_at from findings_history '
            f"where finding_id like 'H-{prefix}-%' order by id")
        if row[0] not in have
    ]


def initiative_dir(submodule, initiative):
    return PM / submodule / 'iniciativas' / initiative / 'hallazgos'


def append_to_index(index_path, stem):
    """Añade la entrada de `toctree`. No toca la tabla, y esa es la decision.

    Medido por CONJUNTO de identificadores —no por conteo de ocurrencias, que
    es lo que me engaño la primera vez— la tabla de los cinco indices es un
    subconjunto CURADO: `construir-harness-propio` lista 21 de 50 hallazgos
    `H-THYROX`, y `actualizar-agentic-ai-thyrox` lista 0 de 4 porque su tabla
    enumera los `H-DOCS`. El `toctree`, en cambio, es 1:1 con los archivos en
    los cinco. Asi que el invariante que este guion sostiene es el del
    `toctree` —el que Sphinx exige— y la curacion de la tabla queda en manos de
    quien la mantiene.
    """
    text = index_path.read_text(encoding='utf-8')
    if stem in text:
        return False
    lines = text.rstrip('\n').split('\n')
    last_entry = max(i for i, line in enumerate(lines) if TOC_ENTRY.match(line + '\n'))
    lines.insert(last_entry + 1, f'   {stem}')
    index_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return True


def reindex_orphans(prefix):
    """Indexa todo `hallazgo-*.rst` que no este en el `toctree` de su indice.

    Es un eje distinto del de arriba y por eso se mide aparte: un archivo
    puede existir y estar fuera del indice —lo que Sphinx reporta como
    documento huerfano— tanto porque acaba de emitirse como porque alguien lo
    escribio a mano y olvido la entrada. El universo de esta pasada son los
    ARCHIVOS del arbol, no las filas del store.
    """
    added = 0
    for index_path in sorted(PM.rglob('hallazgos/index.rst')):
        directory = index_path.parent
        for path in sorted(directory.glob(f'hallazgo-H-{prefix}-*.rst')):
            if append_to_index(index_path, path.stem):
                print(f'  + toctree {path.relative_to(CONSUMER)}')
                added += 1
    return added


TITLE_MARKUP = re.compile(r'([*`|_])')


def escape_title_markup(text: str) -> str:
    """Neutraliza el markup en linea de un titulo que es una CITA.

    El titulo es el `summary` de la fila, verbatim. Un `summary` que contenga
    `*.7z` abre enfasis y nunca lo cierra: docutils emite «Inline emphasis
    start-string without end-string» y el documento queda roto por un caracter
    que el autor de la fila nunca puso como markup.

    Escapar en vez de reescribir: `\*` renderiza `*`, asi que la cita sigue
    siendo byte a byte la misma para el lector. Reescribirla la separaria de
    la fila que dice reproducir.
    """
    return TITLE_MARKUP.sub(r'\\\1', text)


def render(row):
    finding_id, submodule, initiative, severity, summary, content, source_ref, created = row
    label = finding_id.lower()
    title = escape_title_markup(f'{finding_id} — {summary}')
    # El subrayado se mide sobre el titulo YA escapado: docutils compara con la
    # linea del fuente, no con lo renderizado.
    rule = '=' * max(len(title), 12)
    # Sangrado de tres espacios: es el cuerpo de un `code-block`, y sin
    # sangrar docutils lo lee como texto del documento otra vez.
    body = textwrap.indent(content or summary, '   ')
    return f""".. meta::
   :fecha_creacion: {created}
   :autor: Equipo Kaupamex
   :estado: documentado
   :submodulo: {submodule}
   :iniciativa: {initiative}

.. _{label}:

{title}
{rule}

- **Severidad:** {severity or 'MEDIA'}
- **Fecha:** {created}
- **Fuente:** ``{source_ref or '(sin declarar)'}``

Descripción
-----------

El cuerpo es el ``content`` de la fila del store, **citado verbatim** en un
bloque literal. Va en bloque literal por dos razones medidas, no por estilo:
es una cita —no prosa de autor, y presentarla como tal invitaría a editarla—
y su texto no es RST válido, así que soltarlo en el cuerpo rompe el documento
(11 de los 36 dieron error de sintaxis al intentarlo).

.. code-block:: text

{body}

.. note::

   Este archivo es la cara de **gobierno** de un hallazgo que hasta hoy vivía
   sólo como fila del store. Su cuerpo es el ``content`` de esa fila, emitido
   por ``probes/emit_missing_finding_rst.py`` del banco
   ``ventana-congelada-de-hallazgos`` — no reescrito a mano, para que no haya
   dos versiones del mismo texto. La evidencia detallada vive en la fuente
   citada arriba.
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prefix', default='THYROX')
    parser.add_argument('--store', default='agent-results/agent_store.sqlite3')
    parser.add_argument('--write', action='store_true',
                        help='sin ella sólo imprime lo que haría')
    options = parser.parse_args()

    rows = rows_without_file(options.store, options.prefix)
    homeless = [r for r in rows if not initiative_dir(r[1], r[2]).is_dir()]
    if homeless:
        print(f'REHUSA: {len(homeless)} fila(s) con un `initiative` que no tiene '
              'directorio `hallazgos/` en el consumidor.', file=sys.stderr)
        for finding_id, submodule, initiative, *_ in homeless:
            print(f'  {finding_id:<16} {submodule}/{initiative}', file=sys.stderr)
        print('Un slug de BANCO no es una iniciativa: repuntar esas filas antes '
              'de emitir.', file=sys.stderr)
        raise SystemExit(2)

    print(f'{len(rows)} hallazgo(s) sin .rst — prefijo {options.prefix}')
    for row in rows:
        finding_id, submodule, initiative, _sev, summary, *_ = row
        target = initiative_dir(submodule, initiative) / (
            f'hallazgo-{finding_id}-{slugify(summary)}.rst')
        relative = target.relative_to(CONSUMER)
        if not options.write:
            print(f'  [dry-run] {relative}')
            continue
        existed = target.exists()
        if not existed:
            target.write_text(render(row), encoding='utf-8')
        indexed = append_to_index(target.parent / 'index.rst', target.stem)
        estado = 'ya existía' if existed else 'escrito'
        print(f'  {estado} {relative}'
              f'{"  + toctree" if indexed else "  (toctree ya lo tenía)"}')

    print()
    if options.write:
        added = reindex_orphans(options.prefix)
        print(f'{added} entrada(s) de toctree añadida(s)')
    else:
        print('(dry-run: nada escrito. Repetir con --write)')


if __name__ == '__main__':
    main()
