#!/usr/bin/env python3
"""Gate de referencias cruzadas RST — el dominio real de kaupamex-docs.

Sustituye al gate de "broken markdown links" heredado del template THYROX,
que medía un dominio que este repo **no tiene**: `source/` acepta sólo `.rst`
(0 archivos `.md` medidos), y el validador heredado recoge sólo `.md`/`.json`
("archivos MD relevantes", `detect_broken_references.py:209,218`). Su PASS era
cierto y ajeno: hablaba de los 423 `.md` de `.claude/`, no de los 3564 `.rst`
donde vive la documentación del producto. Ver :ref:`h-docs-92`.

Qué mide
--------

Los ``:ref:`etiqueta``` cuyo destino no está declarado por ningún
``.. _etiqueta:`` del árbol. Es la clase de rotura que revienta el build
estricto de Sphinx y que hoy sólo se descubre corriendo ``make html``
(15-20 min) — este gate la responde en un segundo.

*Métrica:* usos de ``:ref:`` con destino ausente del conjunto de etiquetas
declaradas en ``source/**.rst``.

Desde la tarea **#166** mide también los ``:doc:`` — su destino es una **ruta
de documento**, no una etiqueta, así que se resuelve replicando lo que hace
Sphinx, leído del paquete instalado y no de memoria:
``docname_join(refdoc, target)`` (``sphinx/util/__init__.py:23``, un
``posixpath.normpath`` que absorbe tanto la ruta relativa como la absoluta con
``/`` inicial) y pertenencia a ``env.all_docs``
(``sphinx/domains/std/__init__.py:1201``). Aquí ``all_docs`` se aproxima por
los ``.rst`` del árbol sin sufijo: ``conf.py:40`` no excluye nada dentro de
``source/``.

*Ciega a:*

- que un ``:doc:`` resuelva al documento **correcto**. Mide existencia del
  destino, no si es el que el autor quería — la misma ceguera que ya tiene el
  lado ``:ref:``.
- etiquetas que Sphinx genera sin declararlas en el árbol: ``genindex``,
  ``search``, ``modindex``, ``py-modindex``. Se excluyen por nombre.
- etiquetas declaradas por extensiones (autosectionlabel u otras). Si alguna
  se activa, este gate producirá falsos positivos y habrá que leer el
  ``conf.py`` — hoy no hay ninguna que las genere.
- ``:ref:`` escrito dentro de un **literal en línea** (doble comilla
  invertida). Sphinx no lo resuelve; este gate sí lo cuenta. Se deja fuera a
  propósito: el barrido de :ref:`h-docs-93` encontró 17 pasajes con comillas
  anidadas que **sí** eran markup mal formado, y son indistinguibles de un
  literal correcto sin parsear. Medido tras esta versión: 0 casos vivos.

Bloques literales — por qué se saltan (tarea #173)
---------------------------------------------------

Un ``:ref:`` dentro de un bloque literal (``::``, ``code-block``,
``literalinclude``) es **texto que enseña el patrón**, no un uso: Sphinx no lo
resuelve. Contarlo produce una rotura que nadie puede reparar salvo borrando
el ejemplo. Medido antes de este cambio: 4 de las 5 rotas del repo eran los
cuatro ``:ref:`` del bloque que ``fnd-04-trazabilidad.rst`` usa para explicar
cómo se escribe una referencia cruzada.

El recorte se aplica **también** a las etiquetas: un ``.. _x:`` dentro del
mismo ejemplo tampoco declara nada. Contarlo como etiqueta haría resolver
referencias que en el build no resuelven — el falso negativo simétrico.

``parsed-literal`` **no** se salta: es el único bloque literal donde Sphinx
sigue interpretando roles.

Uso
---

    python3 .claude/scripts/gates/check_rst_referencias.py             # reporte
    python3 .claude/scripts/gates/check_rst_referencias.py --quiet     # conteo :ref:
    python3 .claude/scripts/gates/check_rst_referencias.py --quiet-doc # conteo :doc:
    python3 .claude/scripts/gates/check_rst_referencias.py --strict    # exit 1 si hay rotas

Los dos conteos se publican **por separado**, nunca sumados: un ``:ref:`` roto
y un ``:doc:`` roto son dos poblaciones con dos causas y dos reparaciones, y
un encabezado único sobre ambas es el sub-patrón A de
``metrica-decide-la-conclusion.md``.
"""
import pathlib
import posixpath
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from paths import reach  # noqa: E402

#: Destinos que Sphinx crea por su cuenta: no se declaran en el árbol.
BUILTIN = {'genindex', 'search', 'modindex', 'py-modindex'}

ETIQUETA = re.compile(r'^\.\.\s+_([^:]+):\s*$', re.M)
REF = re.compile(r':ref:`(?:[^`<]*<)?([^`>]+?)>?`')
DOC = re.compile(r':doc:`(?:[^`<]*<)?([^`>]+?)>?`')

#: Directivas cuyo cuerpo es literal. ``parsed-literal`` NO entra: es la única
#: en la que Sphinx sigue interpretando roles.
DIRECTIVA_LITERAL = re.compile(
    r'^(\s*)\.\.\s+(?:code-block|code|literalinclude|highlight|raw)::')

# La raíz del árbol MEDIDO, no la del proveedor. Era `parents[3]`, que
# valía cuando el gate vivía en `kaupamex-docs/.claude/scripts/gates/` y
# desde `thyrox/src/gates/` daba `/home/user/source`.
CONSUMIDOR = reach.consumer_root()
RAIZ = CONSUMIDOR / 'source'


def sin_bloques_literales(texto):
    """El texto sin sus bloques literales, preservando el número de líneas.

    Un ``:ref:`` dentro de un bloque literal es texto que **enseña** el patrón:
    Sphinx no lo resuelve, así que contarlo produce una rotura irreparable
    salvo borrando el ejemplo. Lo mismo vale para un ``.. _x:`` de ejemplo, que
    no declara nada — por eso el recorte se aplica a ambos lados de la medición.

    Las líneas recortadas se sustituyen por vacías en vez de eliminarse: así el
    conteo de usos y etiquetas cambia, pero cualquier diagnóstico por número de
    línea sigue apuntando al mismo sitio.
    """
    lineas = texto.split('\n')
    salida = []
    i = 0
    while i < len(lineas):
        linea = lineas[i]
        m = DIRECTIVA_LITERAL.match(linea)
        # Un ``::`` al final de línea abre bloque literal; ``::`` sola también.
        abre = m is not None or (linea.rstrip().endswith('::')
                                 and not linea.lstrip().startswith('..'))
        if not abre:
            salida.append(linea)
            i += 1
            continue

        base = len(linea) - len(linea.lstrip())
        salida.append(linea)          # el marcador se conserva
        i += 1
        # El cuerpo son las líneas indentadas por encima de la base, con las
        # vacías intercaladas; termina en la primera línea con contenido a la
        # base o menos.
        while i < len(lineas):
            cur = lineas[i]
            if cur.strip() and (len(cur) - len(cur.lstrip())) <= base:
                break
            salida.append('')
            i += 1
    return '\n'.join(salida)


def docname_join(basedocname, docname):
    """Copia literal de ``sphinx/util/__init__.py:23``.

    Absorbe las dos formas de destino de un ``:doc:`` sin ramificar: la
    relativa (``componentes``) sube un nivel desde el documento que cita, y la
    absoluta (``/requisitos/...``) hace que ``posixpath.join`` descarte el
    prefijo. Reimplementarlo con un ``if`` sería adivinar la semántica en vez
    de copiarla.
    """
    return posixpath.normpath(posixpath.join(f'/{basedocname}', '..', docname))[1:]


def main():
    quiet = '--quiet' in sys.argv
    quiet_doc = '--quiet-doc' in sys.argv
    strict = '--strict' in sys.argv

    if not RAIZ.is_dir():
        # Raíz muerta: no se publica un 0 — se dice que no se midió. Es el
        # defecto que H-API-335 corrigió en los otros gates.
        print(f'ERROR: no existe la raíz {RAIZ}', file=sys.stderr)
        sys.exit(2)

    archivos = sorted(RAIZ.rglob('*.rst'))
    docnames = {f.relative_to(RAIZ).with_suffix('').as_posix() for f in archivos}
    etiquetas, usos, usos_doc, recortados = set(), [], [], 0
    for f in archivos:
        crudo = f.read_text(errors='ignore')
        texto = sin_bloques_literales(crudo)
        recortados += len(REF.findall(crudo)) - len(REF.findall(texto))
        etiquetas.update(ETIQUETA.findall(texto))
        usos.extend((f, r) for r in REF.findall(texto))
        base = f.relative_to(RAIZ).with_suffix('').as_posix()
        usos_doc.extend((f, d, docname_join(base, d)) for d in DOC.findall(texto))

    if not archivos:
        print(f'ERROR: 0 archivos .rst bajo {RAIZ} — raíz sospechosa',
              file=sys.stderr)
        sys.exit(2)

    rotas = [(f, r) for f, r in usos
             if r not in etiquetas and r not in BUILTIN]
    rotas_doc = [(f, d, destino) for f, d, destino in usos_doc
                 if destino not in docnames]

    if quiet:
        print(len(rotas))
    elif quiet_doc:
        print(len(rotas_doc))
    else:
        for f, r in rotas:
            rel = f.relative_to(CONSUMIDOR)
            print(f'  ROTA  :ref:`{r}`  en {rel}')
        estado = 'OK — todas resuelven' if not rotas else f'{len(rotas)} rotas'
        print(f'check-rst-referencias: {estado}')
        print(f'  (alcance medido: {len(usos)} usos de :ref: sobre '
              f'{len(etiquetas)} etiquetas en {len(archivos)} archivos .rst; '
              f'{recortados} usos dentro de bloques literales, no contados)')

        for f, d, destino in rotas_doc:
            rel = f.relative_to(CONSUMIDOR)
            print(f'  ROTA  :doc:`{d}` -> {destino}  en {rel}')
        estado_doc = ('OK — todos resuelven' if not rotas_doc
                      else f'{len(rotas_doc)} rotas')
        print(f'check-rst-documentos: {estado_doc}')
        print(f'  (alcance medido: {len(usos_doc)} usos de :doc: sobre '
              f'{len(docnames)} documentos del árbol)')

    sys.exit(1 if (strict and (rotas or rotas_doc)) else 0)


if __name__ == '__main__':
    main()
