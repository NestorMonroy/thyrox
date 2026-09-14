#!/usr/bin/env python3
"""Gate: los identificadores se escriben en inglés; los comentarios, en español.

Cierra la tarea #365 (``H-API-607``). Nace de una directiva reiterada del
ejecutor —*"los nombres de los archivos, clases, funciones y atributos son en
inglés, los comentarios sí pueden ir en español"*— que hasta hoy vivía sólo en
prosa (``redaccion-tecnica-es.md``). La prosa no lo previno: hizo falta que el
ejecutor interrumpiera la tarea para corregirlo, que es justo el coste que este
guion existe para eliminar.

Mudado a THYROX (DEC-04, actualizar-agentic-ai-thyrox): el mecanismo —el AST,
el léxico, el corpus— es del proveedor; el baseline de deuda heredada y las
raíces medidas son parámetro de CADA consumidor, y ninguno de los dos se
inyecta por defecto sin decirlo (ver «Baseline» y «Raíces» abajo). El dueño
canónico de este archivo ya no es ``api: scripts/check_identifier_language.py``
—que ahora reexporta el veredicto de aquí— sino
``thyrox: src/verify/check_identifier_language.py``.

Qué mira, y qué NO
==================

Mira **identificadores declarados**: clases, funciones, métodos, argumentos y
nombres asignados. NO mira docstrings, comentarios ni cadenas — ahí el español
es la convención, no el defecto.

Cómo decide que una palabra es española
========================================

Tres criterios, los tres derivados de medir el árbol, no de memoria:

1. **Morfología exclusiva** — sufijos que el inglés no produce (``-ción``,
   ``-dad``, ``-mente``, ``-ando``, ``-iendo``, ``-ador``, ``-encia``). Sólo
   sobre palabras de más de cinco letras, para no confundir ``dad`` o ``and``.
2. **Partículas de alta precisión** en un identificador de **dos o más**
   palabras. El umbral importa: una variable llamada ``y`` o ``la`` es una letra
   suelta, no una frase en español; ``devuelve_el_metodo`` sí lo es.
3. **Léxico cerrado** (``SPANISH_WORDS``) — las palabras de contenido que los
   dos anteriores no ven: un infinitivo (``esperar``, ``verificar``) o un
   sustantivo llano (``tablero``, ``hallazgo``) no tienen sufijo exclusivo ni
   partícula. Se derivó midiendo los nombres reales del árbol (TASK-DB-0003),
   no de memoria, y es la ÚNICA lista: el gate de nombres de ``check_script_naming.py``
   la reusa por ruta en vez de copiarla.
4. **Corpus abierto** (``spanish_by_corpus``) — los tres anteriores son
   cerrados por construcción; el léxico de ``spacy-lookups-data`` atrapa la
   palabra que nadie enumeró, por margen de log-prob sobre el inglés.

Se excluyen a propósito las partículas ambiguas con el inglés (``no``, ``son``,
``a``, ``un``, ``es``) y ``sin``, que es una función trigonométrica.

*Métrica:* palabras españolas en identificadores declarados, por AST.
*Ciega a:* un identificador español cuyas palabras existan también en inglés
(``lista``→no, pero ``total``, ``final``, ``normal`` sí pasan), y a cualquier
palabra fuera del léxico y del corpus. Es una **cota inferior**: un 0 no prueba
que no quede español, prueba que no queda del que este instrumento sabe ver.

Su gemelo en prosa
==================

``docs: .claude/rules/redaccion-tecnica-es.md``, sección «Elegir el término».
Miden la misma pregunta sobre ejes distintos, y **el veredicto puede ser el
opuesto**: ``ejecución`` es correcto en prosa y defecto en un identificador
(``run_id``); ``run`` al revés. ``SPANISH_WORDS`` es la forma ejecutable de la
tabla de términos que esa regla resuelve — cuando resuelve uno nuevo, su palabra
española entra aquí.

Baseline — parámetro del CONSUMIDOR, no del proveedor (DEC-04)
================================================================

La deuda heredada NO viaja con el mecanismo: cada árbol medido tiene la suya
(1268 identificadores en el de ``api``, hoy), y no hay un default razonable —
un baseline ausente leído como conjunto vacío haría ver como NUEVA a toda la
deuda heredada del consumidor, que es exactamente el defecto que
:ref:`h-docs-1072` midió para el gate hermano (``check_script_naming.py``).

Por eso se declara por **dos entradas de entorno**, la misma forma que
``workbench/paths.py`` ya fija para el hogar del banco:

- ``IDENTIFIER_LANGUAGE_BASELINE`` — el VALOR: la ruta absoluta del archivo.
- ``THYROX_ENV_FILE`` — la RUTA del archivo que puede declararlo (reexportada
  de ``paths.reach``, no re-declarada: una segunda constante sería la segunda
  fuente de verdad que este mismo párrafo denuncia).

Sin ninguna de las dos, el gate **REHÚSA con exit 2 y sin emitir cifra** — un 0
ahí no distinguiría «no hay deuda» de «no sé dónde está», que es el sub-patrón
D de ``metrica-decide-la-conclusion.md``. El consumidor ``api`` la declara
desde su propio stub (``api: scripts/check_identifier_language.py``), que
conoce dónde vive su archivo y la exporta para esa invocación — el proceso
gana sobre el ``.env``, que es la forma en que ``env_value`` ya resuelve la
precedencia.

Raíces — también parámetro, pero con un default razonable
============================================================

Qué directorios recorrer cuando no se pasan rutas explícitas (``src``,
``tests``, ``addons`` hoy) es igual de específico del consumidor que el
baseline. La diferencia es que SÍ hay un default seguro: coincide con el único
consumidor de hoy (``api``), y un ``rglob`` sobre una raíz ausente no infla ni
desinfla el conteo — sólo no aporta archivos. ``IDENTIFIER_LANGUAGE_ROOTS``
(mismas dos entradas de entorno) lo sobreescribe, con los directorios
separados por ``:`` como ``PATH``.
"""
from __future__ import annotations

import argparse
import ast
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from paths.reach import ENV_FILE_VAR, env_value  # noqa: E402

#: Entrada 1 (VALOR) — dónde vive la deuda heredada de ESTE consumidor.
BASELINE_VAR = 'IDENTIFIER_LANGUAGE_BASELINE'
#: Entrada 2 (RUTA de declaración) — reexportada de ``paths.reach``, no
#: re-declarada: repetir el nombre crearía la segunda fuente de verdad que
#: este mecanismo existe para no tener.
BASELINE_ENV_FILE_VAR = ENV_FILE_VAR

#: Las raíces medidas cuando no se pasan rutas explícitas. También un
#: parámetro del consumidor (ver docstring), con default razonable.
ROOTS_VAR = 'IDENTIFIER_LANGUAGE_ROOTS'
DEFAULT_ROOTS = ('src', 'tests', 'addons')


class BaselineHomeError(Exception):
    """Se rehúsa cuando el consumidor no declaró su baseline.

    No es un fallo del proveedor: un baseline es un dato del consumidor, y
    fabricar uno vacío por defecto decidiría por él qué es deuda heredada
    y qué no — la misma razón por la que ``workbench_dir()`` no inventa un
    hogar cuando el banco no lo declara.
    """


def roots(start: pathlib.Path | None = None) -> tuple[str, ...]:
    """Las raíces a recorrer: la declaración del consumidor, o el default."""
    declared = env_value(ROOTS_VAR, start)
    if declared:
        return tuple(p for p in declared.split(':') if p)
    return DEFAULT_ROOTS


def baseline_path(start: pathlib.Path | None = None) -> pathlib.Path:
    """La ruta del baseline DECLARADA, o rehusar.

    Mismo criterio que ``workbench_dir()``: sin declaración no hay baseline
    que leer, y NO se inventa uno vacío en el proveedor.
    """
    declared = env_value(BASELINE_VAR, start)
    if declared:
        return pathlib.Path(declared)
    raise BaselineHomeError(
        'El baseline de deuda heredada no está declarado. Es una decisión '
        f'del consumidor, no del proveedor: declara {BASELINE_VAR} en el '
        f'proceso, o en el archivo que nombra {BASELINE_ENV_FILE_VAR} (por '
        'defecto el .env del árbol). NO se emite un baseline vacío por '
        'defecto: eso haría ver como nueva a deuda heredada real '
        '(H-DOCS-1072).'
    )


#: Sufijos que el inglés no produce. Se exigen sobre palabras de >5 letras.
SPANISH_MORPHOLOGY = re.compile(
    r'(cion|ciones|dades?|mente|ando|iendo|adora?|encia|anza)$'
)

#: Partículas inequívocas. Sólo cuentan en identificadores de 2+ palabras.
#: Excluidas por ambigüedad con el inglés: no, son, a, un, e, i, o, y, es, sin.
SPANISH_PARTICLES = frozenset({
    'el', 'los', 'las', 'del', 'una', 'unos', 'unas', 'que', 'con', 'por',
    'para', 'desde', 'hasta', 'sobre', 'entre', 'cuando', 'donde', 'porque',
    'segun', 'sus', 'de', 'en',
})

#: Palabras de contenido que la morfología no atrapa, medidas en este árbol.
SPANISH_WORDS = frozenset({
    'producto', 'orden', 'usuario', 'cliente', 'precio', 'fecha', 'modelo',
    'nombre', 'campo', 'valor', 'codigo', 'linea', 'factura', 'pago', 'envio',
    'empresa', 'prueba', 'sonda', 'devuelve', 'rechaza', 'admite', 'crea',
    'barrido', 'marcado', 'privado', 'heredado', 'publico', 'estatico',
    'clase', 'metodo', 'atributo', 'archivo', 'ejemplo', 'tarea', 'datos',
    'tienda', 'carrito', 'pedido', 'entrega', 'moneda', 'impuesto', 'cuenta',
    'asiento', 'almacen', 'existencia', 'comprador', 'vendedor', 'cobro',
    # Vocabulario resuelto por redaccion-tecnica-es.md («Elegir el término»):
    # el árbol nombra estas cosas en inglés, así que en un identificador
    # el español es defecto. En PROSA el veredicto puede ser el opuesto.
    'corrida', 'corridas', 'tanda', 'tandas', 'guion', 'guiones',
    'lote', 'lotes',
    # TASK-DB-0003 (b): infinitivos y sustantivos llanos que la morfología no
    # atrapa, derivados de los NOMBRES DE ARCHIVO reales de los cinco repos —
    # el banco de la mitad (a) es
    # docs: .claude/eventos/derivar-lexico-cerrado-de-nombres-20260905T062807/
    # (salidas/lexico-derivado-2026-09-05T06-40-22.txt; triaje en el mismo
    # directorio). Es UNA lista, no una segunda fuente: el gate de nombres de
    # docs reusa `spanish_words_in`, así que extender aquí sirve a los tres
    # ejes (identificador en api, nombre de archivo, identificador en .claude).
    'activos', 'agente', 'agentes', 'agrupar', 'antes', 'apertura',
    'arrancar', 'arranque', 'artefacto', 'artefactos', 'asignadas', 'aviso',
    'bloqueo', 'buscar', 'campos', 'carrete', 'cascara', 'censar', 'censo',
    'cerrar', 'cifra', 'clasificar', 'clon', 'columnas', 'como', 'compara',
    'completo', 'conserva', 'contraparte', 'contrato', 'costo', 'decidir',
    'declarada', 'declaradas', 'declarado', 'dependencias', 'derivar',
    'desactualizado', 'despachar', 'destino', 'dia', 'directorio',
    'discrimina', 'disparo', 'divergencias', 'documentales', 'documento',
    'documentos', 'drenar', 'duplicados', 'emisores', 'enlace', 'escotilla',
    'escribir', 'espera', 'esperar', 'eventos', 'extraer', 'familia',
    'fidelidad', 'fuente', 'gana', 'grupo', 'guardas', 'hallazgo',
    'hallazgos', 'idioma', 'instalar', 'mapa', 'materializa', 'medir',
    'mensaje', 'minimos', 'modelos', 'mutante', 'objetos', 'paridad',
    'pendiente', 'pendientes', 'porte', 'prefijo', 'premisa', 'prosa',
    'proyectos', 'publicar', 'queda', 'ramas', 'reconciliar', 'recupera',
    'referencias', 'refrescar', 'renumerar', 'reporte', 'requerido',
    'rutas', 'salida', 'sesion', 'sincronizar', 'sintaxis', 'sobres',
    'subagentes', 'submodulo', 'sucesor', 'superficies', 'tabla', 'tablero',
    'tardia', 'tareas', 'tipos', 'trabajo', 'tres', 'varada', 'vecinos',
    'veredicto', 'verificar', 'vigente', 'vivo', 'vocabulario', 'volcar',
})


def split_words(name):
    """Parte ``snake_case`` y ``camelCase`` en palabras minúsculas."""
    out = []
    for chunk in re.split(r'_+', name):
        out += re.findall(r'[A-Z]+(?![a-z])|[A-Z][a-z]+|[a-z]+', chunk)
    return [w.lower() for w in out if w]


#: Igual que ``split_words`` pero conservando los dígitos como token propio.
#: ``split_words`` los descarta, y esa pérdida es la que hace ilegible
#: ``CenEn16931``: sin el ``16931``, el ``En`` queda suelto y se lee como la
#: preposición española.
_TOKEN = re.compile(r'[A-Z]+(?![a-z])|[A-Z][a-z]+|[a-z]+|\d+')


def _particles_before_digits(name):
    """Partículas que van pegadas a dígitos — códigos, no preposiciones.

    ``En16931`` es la norma europea EN 16931. El español no numera sus
    preposiciones, así que una partícula seguida de dígitos es siempre un
    token técnico. Medido sobre los 1137 del baseline: no pierde ninguno.
    """
    out = set()
    for chunk in re.split(r'_+', name):
        tokens = _TOKEN.findall(chunk)
        for cur, nxt in zip(tokens, tokens[1:]):
            if cur.lower() in SPANISH_PARTICLES and nxt.isdigit():
                out.add(cur.lower())
    return out


def _technical_suffix(name):
    """¿La partícula final es un código, no una preposición?

    ``AccountEdiXmlUbl_De`` termina en el ISO-3166 de Alemania. La señal es la
    **forma mixta**: CamelCase real antes del guion bajo. El español en
    identificadores se escribe en snake_case puro (``_tracking_de``,
    ``_apunte_en``, ``resp_con``), nunca mezclado — medido sobre los 1137 del
    baseline, esta regla no pierde ninguno.

    Y una preposición española no cierra un nombre: conecta (``orden_de_compra``).
    Cuando queda al final de un identificador CamelCase, es un sufijo técnico.
    """
    if '_' not in name:
        return False
    head, _, tail = name.rpartition('_')
    return (tail.lower() in SPANISH_PARTICLES
            and re.search(r'[a-z][A-Z]', head) is not None)


#: Cuantos hermanos hacen falta para que un sufijo de dos letras sea un
#: codigo y no una preposicion. Tres es el minimo que descarta la
#: coincidencia: un archivo con `orden_de`, `orden_en` y `orden_por` seria el
#: falso positivo de esta regla, y no existe — medido, 0 en el arbol.
MINIMUM_FAMILY_SIZE = 3


def code_suffix_families(names):
    """Los prefijos que un archivo declara como familia de codigos de dos letras.

    ``check_vat_de`` no es espanol: ``de`` es el ISO-3166 de Alemania, y el
    nombre es el CONTRATO del despachador de la fuente —
    ``getattr(self, 'check_vat_' + cc.lower(), None)``—, asi que renombrarlo
    rompe la validacion del IVA aleman.

    Lo que lo distingue de una preposicion no es el token, que es identico,
    sino **la familia**: el mismo archivo declara cuarenta hermanos
    ``check_vat_XX`` con otros codigos. Esa evidencia se deriva del archivo, no
    de una tabla ISO copiada aqui — que ademas no discriminaria, porque ``de``
    es a la vez pais y preposicion.

    ``_technical_suffix`` cubre el caso hermano en CamelCase
    (``AccountEdiXmlUbl_De``) y declara que el espanol se escribe en snake_case
    puro. ``check_vat_de`` es el hueco de ese razonamiento: es snake_case puro
    Y su cola es un codigo.

    *Metrica:* prefijos con >= MINIMUM_FAMILY_SIZE identificadores del mismo
    archivo que comparten prefijo y difieren en una cola de exactamente dos
    letras.
    *Ciega a:* una familia repartida entre varios archivos — cada archivo se
    mide solo, que es el lado seguro: sin hermanos, el sufijo vuelve a contar
    como preposicion.
    """
    by_prefix = {}
    for name in names:
        head, separator, tail = name.rpartition('_')
        if separator and len(tail) == 2 and tail.isalpha():
            by_prefix.setdefault(head.lower(), set()).add(tail.lower())
    return {prefix for prefix, tails in by_prefix.items()
            if len(tails) >= MINIMUM_FAMILY_SIZE}


# ── Cuarto criterio: el CORPUS, que es abierto ───────────────────────────────
#
# Los tres de arriba son cerrados por construccion: la morfologia ve siete
# sufijos, las particulas son una lista, y `SPANISH_WORDS` es una lista mas.
# Una lista solo atrapa lo que alguien se acordo de enumerar, asi que la
# siguiente palabra se cuela — medido: de catorce identificadores espanoles que
# yo mismo escribi, el gate vio **uno**.
#
# El corpus decide sin lista: la palabra es espanola si el lexico espanol la
# atestigua con MARGEN sobre el ingles. Umbral derivado midiendo, no elegido:
#
#   espanol   4.0 .. 16.7   (bien 5.1 · mal 4.0 · raiz 4.9 · tocados 16.7)
#   ingles   -6.9 ..  1.6   (final 1.6 · total 0.8 · general 0.5 · error 0.4)
#
# Los cuatro mas altos del ingles son cognados exactos — la ceguera que la
# regla ya declara. 3.0 los separa con holgura por los dos lados.
CORPUS_MARGIN = 3.0

#: Log-prob que se asume cuando una forma NO esta en el corpus del otro idioma.
#: Con un valor finito la resta sigue definida y la ausencia pesa a favor.
CORPUS_ABSENT = -30.0

_corpus_cache = {}


def _corpus(lang):
    """El lexico de un idioma, o ``None`` si no se puede cargar."""
    if lang in _corpus_cache:
        return _corpus_cache[lang]
    try:
        import gzip
        import json as _json
        import spacy_lookups_data
        home = pathlib.Path(spacy_lookups_data.__file__).parent / 'data'
        with gzip.open(home / f'{lang}_lexeme_prob.json.gz', 'rt',
                       encoding='utf-8') as handle:
            _corpus_cache[lang] = _json.load(handle)
    except Exception:
        _corpus_cache[lang] = None
    return _corpus_cache[lang]


def corpus_available():
    """¿Estan los dos lexicos? El gate REHUSA sin ellos, no publica un cero."""
    return _corpus(ES_LANG) is not None and _corpus(EN_LANG) is not None


#: Lo que se imprime al rehusar. Nombra el remedio porque el defecto real no
#: era «falta un paquete»: era que el veredicto dependia del INTERPRETE con que
#: se invocara el gate. Medido sobre el mismo arbol y el mismo baseline —
#: `python3` del sistema (con lexico) daba FAIL con 2994 fuera del baseline, y
#: el `uv` de api (sin lexico) daba OK con 1265 en deuda heredada.
CORPUS_MISSING = (
    'ERROR — el lexico de `spacy-lookups-data` no esta disponible para este\n'
    'interprete, asi que el cuarto criterio (corpus abierto) no puede medir.\n'
    '\n'
    'NO se emite conteo: un 0 aqui no distingue «no hay espanol» de «no lo\n'
    'puedo ver», que es el sub-patron D de metrica-decide-la-conclusion.\n'
    '\n'
    'Remedio: el lexico lo declara el PROVEEDOR (thyrox/pyproject.toml).\n'
    '  cd <thyrox> && uv sync\n'
    'y se invoca el gate con el interprete del proveedor, que resuelve\n'
    '`thyrox_toolchain_provider_python` de src/lib/toolchain.sh.'
)


def refuse_without_corpus():
    """Imprime el rehuse y devuelve 2, o ``None`` si el corpus esta.

    Es funcion y no un `if` en `main` porque la rehusa la comparten los dos
    caminos —medir y congelar— y el segundo es el que mas dano hace: un
    baseline escrito a ciegas congela como limpio lo que el gate no supo ver.
    """
    if corpus_available():
        return None
    print(CORPUS_MISSING, file=sys.stderr)
    return 2


def spanish_by_corpus(word):
    """¿El corpus espanol la atestigua con margen sobre el ingles?

    Metrica: diferencia de log-prob entre los dos lexicos de
    ``spacy-lookups-data`` (1 000 001 formas cada uno).
    Ciega a: el cognado exacto (``total``, ``final``, ``normal``), que los dos
    idiomas atestiguan por igual; y a la forma flexionada que ningun corpus
    tiene, donde la ausencia en ingles la empuja por encima del umbral.
    """
    spanish, english = _corpus(ES_LANG), _corpus(EN_LANG)
    if spanish is None or english is None:
        return False
    here = spanish.get(word)
    if here is None:
        return False
    return here - english.get(word, CORPUS_ABSENT) >= CORPUS_MARGIN


ES_LANG = 'es'
EN_LANG = 'en'


#: Vocabulario TECNICO que el corpus abierto atestigua como español y que aquí
#: se queda. No son palabras del texto: son nombres de cosas.
#:
#: `redaccion-tecnica-es.md` ya los excluía **en prosa** del léxico cerrado —el
#: prefijo de namespace de la referencia, los estándares, los acrónimos— y esa
#: prosa no gobernaba al cuarto criterio, que es abierto y los recogía otra vez.
#: Aquí la exclusión pasa de prosa a mecanismo.
TECHNICAL_VOCABULARY = frozenset({
    'vals',      # la convención de dict de la referencia (`party_vals`)
    'iban',      # estándar bancario ISO 13616
    'incoterm',  # estándar de comercio ICC
    'categ',     # la abreviatura de *category* de la referencia (`categ_id`)
})

#: Piso de longitud del criterio de corpus. Una palabra de una o dos letras no
#: la decide la frecuencia: `q`, `l`, `o` son nombres de variable y `ir`, `es`
#: son a la vez prefijo de namespace y código de idioma. Las partículas
#: españolas reales de esa longitud —`de`, `en`, `el`— NO se pierden: las
#: recoge `SPANISH_PARTICLES` en su propia pasada, que sí consulta las
#: exenciones. El piso quita una duplicación que medía peor, no una defensa.
CORPUS_MINIMUM_LENGTH = 3


def _corpus_says_spanish(word, technical):
    """El cuarto criterio, ya acotado por su vocabulario y su piso.

    Se extrae a una función en vez de encadenarlo en la comprensión porque la
    condición tiene tres partes y una condición de tres partes dentro de un
    filtro es donde se cuela la que falta — que es exactamente lo que pasó.
    """
    if len(word) < CORPUS_MINIMUM_LENGTH:
        return False
    if word in TECHNICAL_VOCABULARY or word in technical:
        return False
    return spanish_by_corpus(word)


def spanish_words_in(name, code_families=frozenset()):
    """Palabras españolas del identificador, o lista vacía.

    ``code_families`` son los prefijos que el ARCHIVO declara como familia de
    codigos de dos letras (ver :func:`code_suffix_families`). Es opcional para
    que el gate hermano de ``docs`` —que mide nombres de archivo sueltos, sin
    archivo que dé contexto— siga llamando con un solo argumento.
    """
    words = split_words(name)

    # Las exenciones se calculan ANTES de la primera pasada, no despues.
    # Calcularlas dentro del bloque de particulas —que es como estaban— dejaba
    # al criterio de corpus sin ninguna: la palabra salia del lexico cerrado
    # por la puerta de delante y volvia a entrar por la de atras (H-DOCS-1139).
    technical = set()
    if len(words) >= 2:
        technical = _particles_before_digits(name)
        if _technical_suffix(name):
            technical.add(name.rpartition('_')[2].lower())
        head, separator, tail = name.rpartition('_')
        if separator and head.lower() in code_families:
            technical.add(tail.lower())

    hits = [w for w in words
            if w in SPANISH_WORDS
            or (len(w) > 5 and SPANISH_MORPHOLOGY.search(w))
            or _corpus_says_spanish(w, technical)]
    if len(words) >= 2:
        hits += [w for w in words
                 if w in SPANISH_PARTICLES and w not in technical]
    return sorted(set(hits))


#: Variable con la que el CONSUMIDOR declara sus claves de contrato: nombres
#: que su propia normativa fija y que por tanto no son deuda de idioma. El caso
#: que la origina es `codigo_error`, la clave canónica de error de `api` —270
#: ocurrencias medidas—, que su regla `canon-idioma` MANDA escribir así.
#:
#: El proveedor entrega el mecanismo y el consumidor el parámetro, igual que el
#: baseline y las raíces (DEC-04). Codificar `codigo_error` aquí sería meter el
#: dominio del producto dentro del proveedor.
CANON_KEYS_VAR = 'IDENTIFIER_LANGUAGE_CANON_KEYS'


def canon_keys(start: pathlib.Path | None = None, source=None) -> frozenset[str]:
    """Las claves de contrato que el consumidor declara, o el conjunto vacío.

    Sin declaración devuelve vacío — no un default inventado. Un default aquí
    absolvería nombres que nadie pidió absolver, y el gate publicaría verde
    sobre una población que no midió.
    """
    declared = env_value(CANON_KEYS_VAR, start, source)
    if not declared:
        return frozenset()
    return frozenset(part.strip() for part in declared.split(',') if part.strip())


def declared_identifiers(tree):
    """Los identificadores que el archivo **declara**, con su línea.

    Los docstrings y comentarios quedan fuera por construcción: el AST no los
    entrega como nombre de nada.

    Una **clave de diccionario** sí entra: `identificadores-en-ingles.md`
    enumera «claves de manifiesto —una clave es un atributo—», y hasta hoy el
    recorrido veía `def`/`class`/`arg`/`Name` y ninguno de los cuatro es un
    literal de dict. La regla nombraba una forma que el instrumento no podía
    ver.

    Sólo entra la clave que **puede ser un nombre** (``str.isidentifier``). Una
    cabecera HTTP (``application/json``), una ruta o un ordinal son datos, no
    símbolos; medirlos haría que el veredicto hablara de otra población.
    """
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            yield node.name, node.lineno
        elif isinstance(node, ast.arg):
            yield node.arg, node.lineno
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            yield node.id, node.lineno
        elif isinstance(node, ast.Dict):
            for key in node.keys:
                if (isinstance(key, ast.Constant) and isinstance(key.value, str)
                        and key.value.isidentifier()):
                    yield key.value, key.lineno


def load_baseline(start: pathlib.Path | None = None) -> set[str]:
    path = baseline_path(start)
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text().splitlines()
            if line.strip() and not line.startswith('#')}


def scan(paths, canon=frozenset()):
    """Devuelve ``(violaciones, archivos_medidos)``.

    ``canon`` son los nombres que el consumidor declaró como contrato propio
    (ver :func:`canon_keys`). Se exime el NOMBRE, no el sitio: si la normativa
    del consumidor fija `codigo_error`, lo fija igual como clave de dict que
    como variable que la construye.
    """
    findings, measured = [], 0
    for path in paths:
        if 'migrations' in path.parts:
            continue
        try:
            tree = ast.parse(path.read_text(encoding='utf-8'))
        except (SyntaxError, UnicodeDecodeError):
            continue
        measured += 1
        seen = set()
        declared = list(declared_identifiers(tree))
        families = code_suffix_families(n for n, _ in declared)
        for name, lineno in declared:
            if name in seen or name in canon:
                continue
            hits = spanish_words_in(name, families)
            if hits:
                seen.add(name)
                findings.append((str(path), name, lineno, hits))
    return findings, measured


def collect(argv_paths, start: pathlib.Path | None = None):
    if argv_paths:
        return [pathlib.Path(p) for p in argv_paths if p.endswith('.py')]
    files = []
    for root in roots(start):
        files += sorted(pathlib.Path(root).rglob('*.py'))
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('paths', nargs='*', help='archivos a medir (default: todo el árbol)')
    parser.add_argument('--write-baseline', action='store_true',
                        help='congela el estado actual como deuda heredada')
    args = parser.parse_args()

    start = pathlib.Path.cwd()

    try:
        baseline_file = baseline_path(start)
    except BaselineHomeError as exc:
        print(f'ERROR — {exc}', file=sys.stderr)
        return 2

    refused = refuse_without_corpus()
    if refused is not None:
        return refused

    findings, measured = scan(collect(args.paths, start), canon_keys(start))

    if args.write_baseline:
        lines = sorted({f'{path}::{name}' for path, name, _, _ in findings})
        baseline_file.write_text(
            '# Deuda heredada de identificadores en español (tarea #147).\n'
            '# Congelada por check_identifier_language.py --write-baseline.\n'
            '# Un identificador NUEVO no entra aquí: se escribe en inglés.\n'
            + '\n'.join(lines) + '\n')
        print(f'baseline escrita: {len(lines)} identificadores '
              f'({measured} archivos medidos) en {baseline_file}')
        return 0

    baseline = load_baseline(start)
    fresh = [f for f in findings if f'{f[0]}::{f[1]}' not in baseline]

    if not fresh:
        print(f'OK: identificadores en inglés ({measured} archivos medidos, '
              f'{len(baseline)} en deuda heredada).')
        return 0

    print(f'FAIL — {len(fresh)} identificador(es) en español fuera del baseline:\n')
    for path, name, lineno, hits in fresh:
        print(f'  {path}:{lineno}  {name}   →  {", ".join(hits)}')
    print('\nLos identificadores van en INGLÉS; los comentarios y docstrings, en')
    print('español. Traducir el nombre, no buscarle un sinónimo más evocador:')
    print('  Modelo → Model (no Probe) · _Base se queda _Base.')
    print('OJO: un modelo CONCRETO no puede empezar ni terminar en guion bajo')
    print('  (Django models.E023). Lo vigila check_model_name_lookup.py.')
    print(f'\nMedido: {measured} archivos. Deuda heredada congelada: '
          f'{len(baseline)} (tarea #147).')
    return 1


if __name__ == '__main__':
    sys.exit(main())