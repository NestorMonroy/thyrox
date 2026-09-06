#!/usr/bin/env python3
"""El vocabulario de la prosa, en dos ejes que un solo instrumento NO cubre.

Es la forma ejecutable de ``redaccion-tecnica-es.md``. Tiene **dos detectores**
porque la regla prohíbe dos cosas distintas, y —éste es el punto— el
instrumento que sirve para una va **al revés** para la otra:

============  ==========================  ==========================
Eje           Qué busca                   Instrumento
============  ==========================  ==========================
`inventado`   sustantivo con sufijo       léxico de frecuencia:
              nominalizador que ningún    **ausente** del corpus
              corpus atestigua            = sospechoso
`prohibido`   cliché, coloquialismo y     lista cerrada, la que la
              verbo comodín que la        regla enumera
              regla veta
============  ==========================  ==========================

**Por qué no basta el léxico.** Un coloquialismo prohibido es, por
definición, de uso corriente — así que el corpus lo atestigua con alta
frecuencia. Medido: ``chamba`` −13.80, ``agarrar`` −12.63, ``oro`` −9.81,
todos presentes; mientras que ``idempotencia`` y ``conmutatividad``, que son el
vocabulario técnico **correcto**, están AUSENTES. Sobre este eje la
frecuencia está **anti-correlacionada** con lo que se quiere detectar: el
instrumento marcaría lo bueno y dejaría pasar lo vetado. Por eso el segundo
detector no usa corpus, sino la enumeración de la propia regla
(``vocabulario_prohibido.txt``).

Episodio de origen del primer eje, y es propio: el 2026-08-20 escribí
**«democión»** en un hallazgo —una palabra que no existe— y la corrección la
hizo el ejecutor, no una re-lectura. Medido entonces: 1 aparición de «democi»
en todo ``source/`` contra 36 archivos con «degradación», la palabra real.

Episodio de origen del segundo: al escribir este mismo guion se usó
**«chamba»** como ejemplo de vocabulario mexicano que el corpus acepta, sin
notar que es justo una de las formas que la regla veta. Lo señaló el ejecutor
en el mismo turno. El defecto es exacto: el eje del registro se estaba
midiendo con el instrumento del eje de la existencia.

Lo que este guion NO puede ver: el significante, no el significado
------------------------------------------------------------------

Los dos detectores operan sobre la **forma** —un sufijo, una cadena— y ninguno
alcanza el **referente**. ``redaccion-tecnica-es.md`` ya lo fija para la prosa
(*"el significante no autoriza a inferir el significado"*, el corolario de
``Harness``/``Scaffolding``); aquí es una limitación del instrumento, y se
mide sobre su propia lista.

Medido: ``regla de oro`` aparece en **4** archivos, y el reparto es **2 y 2**:

=====================================  ============================  ==========
Archivo                                Contexto                      Referente
=====================================  ============================  ==========
``uml-12-diagramas-componentes.rst``   *"¿cuál es la regla de oro     uso real
                                       para…"*                       (defecto)
``decision-authz-editable-runtime…``   *"(regla de oro de la          uso real
                                       directiva)"*                   (defecto)
``model-selection-subagents.md``       *"se llamaba «regla de oro»    cita del
                                       —un cliché que… prohíbe"*      anti-patrón
``redaccion-tecnica-es.md``            *"tras corregir el uso de      la regla
                                       'regla de oro'"*               misma
=====================================  ============================  ==========

**Consecuencia de diseño, no anécdota.** Por eso la clave del baseline de una
forma vetada es ``<ruta>::<forma>`` y no la forma sola: congelar «regla de oro»
globalmente la autorizaría en un hallazgo nuevo, que es justo lo que se veta.
El archivo es el sustituto pobre del referente — separa la regla que cita del
documento que usa, y no separa dos usos dentro del mismo archivo. Esa segunda
mitad **queda abierta** y su desenlace es el juicio de quien triaja, no el
gate: tarea **#645**.

Estructuras — lo que CS 106X aporta, y lo que la medición corrigió
------------------------------------------------------------------

Dos conceptos de ``source/base-cognitiva/cs106x-abstracciones/`` gobiernan
este guion, y su propia directiva de apertura —*"antes de escribir una
estructura de datos, se mide si ya existe en la biblioteca estándar"*— decide
cuál se construye:

- **Conjunto** (lectura 6, :ref:`bc-cs106x-mapas-y-conjuntos`). El léxico se
  consulta una vez por palabra sobre 1 000 001 formas: es pertenencia pura, y
  el ``set`` de Python la da en O(1). No se construye nada.
- **Trie** (lectura 21, :ref:`bc-cs106x-tries-y-grafos`). El árbol de prefijos
  existe para casar **muchas** cadenas en **una** pasada, que es exactamente
  la forma del detector ``prohibido``. La intuición dice: un autómata
  alternado en vez de N búsquedas.

**Medido, esa intuición es falsa aquí.** Sobre las 26 formas vetadas y los
4283 archivos del corpus, con hits idénticos (31):

===========================  =========  =============
Forma                        Tiempo     Factor
===========================  =========  =============
26 autómatas independientes  13.3 s     **1×**
1 autómata alternado         41.4 s     3.1× más lento
===========================  =========  =============

*Métrica:* ``time.perf_counter`` sobre el corpus completo, un solo pase por
forma.
*Ciega a:* el mecanismo interno que lo explica. La causa **plausible y no
medida** es que ``re`` optimiza cada patrón de prefijo literal con una
búsqueda rápida, y la alternación con grupos nombrados la desactiva; queda
como INFERRED, no como hecho.

Por eso el guion conserva las N búsquedas. La lección de CS 106X que **sí**
se aplica no es la estructura sino su primera directiva: medir antes de
construir. Aquí la construcción habría triplicado el costo.

**Por qué un léxico y no un ``grep``.** La cuarta prueba se venía aplicando
con búsquedas literales sobre el volcado del ejecutable, y ese instrumento
responde *"¿existe esta cadena?"* — no *"¿existe esta palabra?"*. Contra
«democión» un ``grep`` da 0, y ese 0 se lee como *"término nuevo, adelante"*
en vez de como *"palabra inventada"*: es el sub-patrón C de
``metrica-decide-la-conclusion.md``, medir la FORMA y concluir sobre el FONDO.

Métrica: palabras de ``source/**.rst`` y ``.claude/rules/**.md`` que terminan
en un sufijo nominalizador productivo del español (``-ción``, ``-sión``,
``-dad``, ``-miento``, ``-anza``, ``-encia``, con sus plurales) y **no**
aparecen en ``es_lexeme_prob`` de ``spacy-lookups-data`` (1 000 001 formas de
un corpus de español real) **ni en su singular** — ver ``attested()``: el
léxico es una lista de frecuencias, no un analizador morfológico, y su corte
parte pares singular/plural de palabras correctas.

Ciega a: (1) una palabra española legítima que el corpus no recoge — el
tecnicismo culto es el caso frecuente (``idempotencia``, ``memoización``,
``observabilidad``), y por eso la deuda heredada va en baseline en vez de
bloquear; (2) toda invención que **no** lleve uno de esos sufijos; (3) la
distinción préstamo/nativo — ``script`` y ``harness`` están atestiguados en el
corpus y el gate los acepta, que es lo correcto para la prueba 2 pero no
sustituye al juicio de las pruebas 1, 3 y 4; **(4) el REGISTRO regional**, que
es la ceguera que más importa aquí y se detalla abajo.

**El corpus es panhispánico, no mexicano — medido, no supuesto.** La
convención que este gate sirve prescribe *"español mexicano profesional"*, y el
léxico **no distingue variantes**: de 22 formas de uso mexicano
(``jitomate``, ``chamba``, ``cajuela``, ``alberca``, ``banqueta``, ``curp``,
``rfc``…) atestigua **22**; de 12 peninsulares (``ordenador``, ``zumo``,
``nevera``, ``maletero``, ``fontanero``…) atestigua **12**. Las dos mitades
tienen consecuencia:

- **A favor:** el gate NO marca como inventado el vocabulario mexicano que la
  convención pide. Ésa era la duda razonable y quedó descartada.
- **En contra:** el gate **no puede hacer cumplir el registro**. ``ordenador``
  le pasa igual que ``computadora``. Vigilar la variante exige otro
  instrumento —una lista de contraste peninsular↔mexicano— y no un léxico:
  spaCy declara **una sola** lengua ``es`` y **ninguna** de sus 79 lenguas
  lleva sufijo regional. Sucesor registrado: tarea **#644**.

Es una **cota inferior**: un 0 no prueba que no quede vocabulario inventado —
prueba que no queda del que este instrumento sabe ver.
"""
from __future__ import annotations

import argparse
import collections
import gzip
import json
import os
import pathlib
import os
import re
import subprocess
import sys

ROOT_VAR = 'VOCAB_GATE_ROOT'
HERE = pathlib.Path(__file__).resolve().parent
BASELINE_NAME = 'vocabulario_prosa_baseline.txt'
BASELINE_VAR = 'VOCAB_GATE_BASELINE'
FORBIDDEN_NAME = 'vocabulario_prohibido.txt'
FORBIDDEN_VAR = 'VOCAB_GATE_FORBIDDEN'


def resolve_parameter(name, var, measured=()):
    """Localiza un parametro del consumidor: variable, hogar propio, o el arbol.

    Sirve al baseline y a la lista de formas vetadas, que son el MISMO
    problema: los dos congelan o declaran algo de un arbol concreto, y thyrox
    -el proveedor- no los tiene. Tenerlo escrito dos veces es como divergen:
    el baseline se arreglo en h-docs-1107 y la lista se quedo con la ruta fija
    `HERE / <nombre>`, asi que el detector `prohibido` corria con CERO formas
    y publicaba «0 hallazgos» sobre un texto que no habia comparado con nada.

    El baseline es **parametro del consumidor**, no mecanismo de thyrox:
    congela la deuda de un arbol concreto, y un segundo consumidor tendria la
    suya. Por eso el gate lo BUSCA en vez de codificar una ruta.

    Origen (h-docs-1107): con la ruta fija `HERE / <nombre>` la mudanza a
    thyrox dejo 638 entradas congeladas invisibles, y el pre-commit --strict
    empezo a bloquear deuda historica como si fuera nueva.

    Donde vive el baseline de forma definitiva es la tarea #162; esta funcion
    no la adelanta — admite las tres ubicaciones sin mover el archivo.
    """
    declarado = os.environ.get(var, '').strip()
    if declarado:
        return pathlib.Path(declarado)

    propio = HERE / name
    if propio.is_file():
        return propio

    # El consumidor: se asciende desde cada archivo medido, y si ninguno
    # llega a un `.claude/baselines/`, desde el directorio de invocacion.
    #
    # El cwd es RESPALDO, no alternativa: antes se componia con un `or`, que
    # solo dispara con `measured` vacio. Con un archivo medido FUERA del arbol
    # del consumidor —un `.rst` en un temporal, que es como la suite del
    # pre-commit lo ejercita— el ascenso fallaba y el cwd no se consultaba
    # nunca: el gate rehusaba teniendo el baseline a un `cd` de distancia.
    origenes = [pathlib.Path(f).resolve() for f in measured]
    origenes.append(pathlib.Path.cwd())
    for origen in origenes:
        for base in [origen] + list(origen.parents):
            candidato = base / '.claude' / 'baselines' / name
            if candidato.is_file():
                return candidato
    return propio


def consumer_root(measured=()):
    """La raiz del ARBOL MEDIDO, que no es la del proveedor.

    Gobierna dos cosas: la clave del baseline (`<relativa>::<forma>`) y, sin
    argumentos, que corpus enumerar (`source/**.rst` + `.claude/rules/**.md`).

    Era `parents[3]` del propio archivo: valia la raiz del repo cuando el gate
    vivia en `kaupamex-docs/.claude/scripts/gates/`, y desde `thyrox/src/gates/`
    vale `/home/user`. Con eso la clave salia `kaupamex-docs/source/x.rst::f`
    y no emparejaba con las entradas congeladas, que dicen `source/x.rst::f`:
    la deuda heredada se habria publicado entera como nueva.
    """
    declarada = os.environ.get(ROOT_VAR, '').strip()
    if declarada:
        return pathlib.Path(declarada).resolve()

    origenes = [pathlib.Path(f).resolve() for f in measured]
    origenes.append(pathlib.Path.cwd())
    for origen in origenes:
        for base in [origen] + list(origen.parents):
            if (base / '.claude').is_dir():
                return base
    return pathlib.Path.cwd()


def resolve_baseline(measured=()):
    """El baseline de deuda congelada de este consumidor."""
    return resolve_parameter(BASELINE_NAME, BASELINE_VAR, measured)


def resolve_forbidden(measured=()):
    """La lista de formas vetadas de este consumidor."""
    return resolve_parameter(FORBIDDEN_NAME, FORBIDDEN_VAR, measured)


def refuse_without_parameter(name, var, ruta, motivo):
    """Rehusa en vez de operar con un conjunto vacio.

    Un cero NO distingue «no hay nada que encontrar» de «no encontre el
    archivo» — el sub-patron D de metrica-decide-la-conclusion.md. Mismo
    criterio que el guard del lexico de este mismo archivo.
    """
    print(
        f'ERROR — no se encontro {name}.\n'
        f'  Buscado: ${var} · {HERE} · <consumidor>/.claude/baselines/\n'
        f'  Ultimo candidato: {ruta}\n'
        f'  NO se emite un conteo: {motivo}',
        file=sys.stderr,
    )
    raise SystemExit(2)


def refuse_without_baseline(ruta):
    refuse_without_parameter(
        BASELINE_NAME, BASELINE_VAR, ruta,
        'sin baseline, toda la deuda heredada se\n  publicaria como nueva. Ver h-docs-1107.',
    )


def refuse_without_forbidden(ruta):
    refuse_without_parameter(
        FORBIDDEN_NAME, FORBIDDEN_VAR, ruta,
        'sin la lista, el detector `prohibido` compara\n'
        '  contra CERO formas y todo texto pasa. Es la mitad del gate, y su\n'
        '  ausencia lo dejaria midiendo un solo eje sin decirlo.',
    )

# Sufijos que convierten una raíz en sustantivo abstracto. Una palabra que los
# lleva ESTÁ afirmando ser un sustantivo español, así que su ausencia del
# corpus es una señal y no ruido.
NOMINAL_SUFFIX = re.compile(
    r'^[a-záéíóúñü]+'
    r'(ción|ciones|sión|siones|dad|dades|miento|mientos|anza|anzas|encia|encias)$'
)
WORD = re.compile(r'[A-Za-zÁÉÍÓÚÑÜáéíóúñü]{6,}')


#: La variable que abre la rama de instalación. Es opt-in y no default por lo
#: que dice ``install_lexicon()``: instalar es un efecto que el llamador no
#: pidió, y un gate no lo produce a espaldas de quien lo invoca.
INSTALL_VAR = 'VOCAB_GATE_INSTALL_LEXICON'
LEXICON_PKG = 'spacy-lookups-data'


def _import_lexicon():
    """El módulo del léxico, o ``None``. La comprobación, aislada.

    Vive aparte porque se ejecuta **dos veces**: antes de instalar y después.
    La segunda es la que importa — ver ``install_lexicon()``.
    """
    try:
        import spacy_lookups_data
    except ModuleNotFoundError:
        return None
    return spacy_lookups_data


def install_lexicon():
    """La rama ``else``: intenta instalar el léxico y devuelve el módulo o ``None``.

    **El éxito NO se lee del código de salida de ``pip``.** Un `pip` que
    termina en 0 no prueba que el módulo se pueda importar: puede haber
    instalado en otro intérprete, o el proxy puede haber devuelto algo que no
    es el paquete. El código de salida es el *significante*; que el `import`
    funcione es el *significado*, y concluir del primero sobre el segundo es el
    sub-patrón C de ``metrica-decide-la-conclusion.md``. Por eso la única
    prueba admitida es re-importar.
    """
    print(f'check-vocabulario-inventado: falta `{LEXICON_PKG}`; '
          f'{INSTALL_VAR} está activa, se intenta instalar…', file=sys.stderr)
    try:
        subprocess.run(
            [sys.executable, '-m', 'pip', 'install', '--quiet', LEXICON_PKG],
            check=False, timeout=300,
            stdout=sys.stderr, stderr=sys.stderr,
        )
    except (OSError, subprocess.TimeoutExpired) as e:
        print(f'check-vocabulario-inventado: la instalación falló ({e}).',
              file=sys.stderr)
        return None
    # La segunda comprobación. Sin ella, la rama de instalación sería un `if`
    # que confía en su propia intención en vez de medir su efecto.
    return _import_lexicon()


def require_lexicon(auto_install: bool | None = None):
    """Guard de librería: sin el léxico NO se emite conteo.

    Un gate que muere por un import ausente imprime nada, y ``${VAR:-0}`` lee
    esa nada como **0 → PASS**. Ese verde no discrimina *"no hay defectos"* de
    *"no pude medir"* — el sub-patrón D de ``metrica-decide-la-conclusion.md``.
    Por eso el fallo es ruidoso, con código de salida propio, y sin cifra.

    Mismo criterio que el guard de Sphinx en ``check-rst-sintaxis.py``, que es
    el precedente de forma en este directorio.

    La estructura: tres desenlaces, no dos
    --------------------------------------

    Hasta 2026-09-05 esto era un ``if`` **sin ``else``**: falta el léxico ->
    rehusar. La rama alterna la pidió el ejecutor tras ver que la instalación
    se hacía a mano fuera del guion. Los tres desenlaces::

        si el léxico está                -> devolverlo
        si falta Y hay opt-in            -> instalar, RE-COMPROBAR, y si aun
                                            así falta -> rehusar (exit 2)
        si falta y NO hay opt-in         -> rehusar (exit 2)   [el default]

    **El default no cambia.** Instalar es un efecto colateral que el llamador
    no pidió: en un ``pre-commit`` es una sorpresa, y en CI puede ser una
    llamada de red que cuelga. Se abre con ``--instalar-lexico`` o con la
    variable ``VOCAB_GATE_INSTALL_LEXICON``.

    **Ninguna rama termina en un cero.** Ésa es la propiedad que la rama nueva
    no puede romper: si la instalación no consigue el módulo, el guion rehúsa
    igual que si nadie lo hubiera intentado.
    """
    modulo = _import_lexicon()
    if modulo is not None:
        return modulo

    if auto_install is None:
        auto_install = os.environ.get(INSTALL_VAR, '') not in ('', '0', 'no')

    if auto_install:
        modulo = install_lexicon()
        if modulo is not None:
            print('check-vocabulario-inventado: léxico instalado y verificado '
                  'por re-import.', file=sys.stderr)
            return modulo
        print('check-vocabulario-inventado: se intentó instalar y el módulo '
              'sigue sin importarse.', file=sys.stderr)

    print(
        'check-vocabulario-inventado: ERROR — falta la librería '
        f'`{LEXICON_PKG}`, que provee el léxico del español. '
        f'Instálala con `python3 -m pip install {LEXICON_PKG}`, o repite con '
        f'`--instalar-lexico` / `{INSTALL_VAR}=1`. '
        'NO se emite un conteo: un 0 aquí sería un verde falso.',
        file=sys.stderr,
    )
    raise SystemExit(2)


def load_lexicon(module):
    """Las 1 000 001 formas atestiguadas, tal como las declara el paquete."""
    data = os.path.join(os.path.dirname(module.__file__), 'data')
    with gzip.open(os.path.join(data, 'es_lexeme_prob.json.gz')) as handle:
        table = json.load(handle)
    return {key for key in table if not key.startswith('__')}


def attested(word, lexicon):
    """¿La atestigua el corpus, en esta forma o en su singular?

    El léxico es una lista de FRECUENCIAS, no un analizador morfológico: la
    forma que no llegó al corte del corpus está ausente aunque la palabra sea
    correcta, y el corte no respeta el par singular/plural. Medido: está
    ``propagación`` (−12.60) y falta ``propagaciones``; está ``iteraciones``
    (−15.49) y falta ``iteracion``.

    Sin este fallback el gate marca como inventado el plural de una palabra
    que él mismo atestigua en singular, y su denuncia empuja a reescribir
    español correcto — que es lo contrario de lo que existe para hacer.

    No afloja el criterio: si el singular tampoco está atestiguado, la palabra
    sigue siendo un hallazgo. ``demociones`` no pasa, porque ``democion``
    tampoco está.
    """
    if word in lexicon:
        return True
    if word.endswith('es') and word[:-2] in lexicon:
        return True
    return word.endswith('s') and word[:-1] in lexicon


def load_baseline(ruta):
    if not ruta.is_file():
        refuse_without_baseline(ruta)
    return {
        line.strip()
        for line in ruta.read_text(encoding='utf-8').splitlines()
        if line.strip() and not line.startswith('#')
    }


def canonical_path(path, root):
    """La clave de un archivo es su ruta relativa a la raiz del repo.

    El baseline se versiona, asi que su clave no puede depender ni del
    directorio desde el que se invoque el gate ni de la ruta del contenedor.
    Medido antes de esta funcion (#905, 2026-08-26): el mismo archivo con el
    mismo baseline daba **11 contra 0** segun se le nombrara con ruta relativa
    o por el barrido completo, que produce rutas absolutas. Un gate cuyo
    veredicto cambia con la forma del argumento no sirve en un hook de
    escritura ni en un pre-commit, que son justo las dos invocaciones baratas.

    Un archivo fuera del arbol conserva su ruta absoluta resuelta: no hay
    relativa que darle, y colapsarlo a un nombre comun haria que dos archivos
    distintos compartieran clave.
    """
    resolved = pathlib.Path(path).resolve()
    try:
        return str(resolved.relative_to(root))
    except ValueError:
        return str(resolved)


def corpus_files(targets, root=None):
    """Los archivos de prosa: RST publicable y reglas siempre-cargadas."""
    if targets:
        return [pathlib.Path(t) for t in targets if pathlib.Path(t).is_file()]
    root = root or consumer_root()
    return sorted(
        list((root / 'source').rglob('*.rst'))
        + list((root / '.claude' / 'rules').rglob('*.md'))
    )


def load_forbidden(ruta):
    """Las formas vetadas, leídas del registro — no escritas en el guion."""
    if not ruta.is_file():
        refuse_without_forbidden(ruta)
    return [
        line.strip().lower()
        for line in ruta.read_text(encoding='utf-8').splitlines()
        if line.strip() and not line.startswith('#')
    ]


def compile_forbidden(forms):
    """Toda forma se busca con frontera de palabra, tenga espacios o no.

    La version anterior buscaba las multipalabra **literal**, sin frontera, y
    eso no es un detalle de implementacion: ``correr la`` casaba dentro de
    ``recorrer las``, y ``correr el`` dentro de ``re-correr el``. Medido sobre
    ``source/`` al corregirlo: 214 apariciones sin frontera contra 176 con
    frontera — **38 artefactos**, el 18 % del eje multipalabra, todos del
    verbo ``recorrer`` y de ``a ojos``.

    El dano no es el conteo inflado: es que el baseline los absorbe con clave
    ``archivo::forma``, asi que un ``recorrer`` congelado **autoriza** el
    ``correr`` real en ese mismo archivo. El instrumento pasa a medir la
    subcadena y el veredicto se emite sobre la palabra — la ceguera de
    ``metrica-decide-la-conclusion.md``.

    ``\b`` sirve igual para una forma multipalabra: su primer y ultimo
    caracter son de palabra, asi que la frontera se ancla en los extremos y
    los espacios interiores siguen siendo literales.
    """
    compiled = []
    for form in forms:
        pattern = rf'\b{re.escape(form)}\b'
        compiled.append((form, re.compile(pattern, re.IGNORECASE)))
    return compiled


INLINE_LITERAL = re.compile(r'``[^`\n]+``')


def literal_spans(text):
    """Los tramos de literal en linea ``...`` de un RST.

    En este arbol el literal en linea ES la forma de **citar** un token
    verbatim, asi que una forma vetada dentro de el es una **mencion**, no un
    uso. Medido sobre ``source/``: 53 de 948 apariciones de forma vetada caen
    dentro de un literal — 5.6 %.

    Es un discriminador mejor que la clave por archivo, y no la sustituye: la
    clave por archivo separa *la regla que cita* del *documento que usa*, y es
    ciega a dos usos dentro del mismo archivo; esto separa mencion de uso
    **dentro** del archivo. Los dos ejes se componen.

    *Metrica:* apariciones de forma vetada contenidas en un ``...`` de una sola
    linea, sobre todo ``.rst`` bajo ``source/``.
    *Ciega a:* un literal partido en dos renglones (:ref:`h-docs-377`), un
    bloque literal ``::`` y una cita en comillas normales. Es una cota inferior
    de las menciones, no su total.
    """
    return [m.span() for m in INLINE_LITERAL.finditer(text)]


DIRECTIVA_LITERAL = re.compile(r'^(\s*)\.\.\s+(code-block|literalinclude|parsed-literal)::')
CIERRE_DOS_PUNTOS = re.compile(r'::\s*$')


def block_spans(text):
    """Los tramos de BLOQUE literal — el otro contenedor de cita verbatim.

    Un bloque literal (``::`` al final de un renglon, o una directiva
    ``.. code-block::``) contiene salida de comando, fragmento de codigo o
    texto de muestra: lo que hay dentro se **cita**, no se escribe.

    Medido sobre ``source/``: 174 de 948 apariciones de forma vetada caen
    dentro de un bloque — **18.4 %**, cuatro veces mas que el literal en linea.
    Sin esta exencion, un hallazgo que publica la salida del propio gate se
    denuncia a si mismo, que es el caso de :ref:`h-docs-384`.

    *Metrica:* apariciones contenidas entre el primer renglon sangrado tras la
    apertura y el ultimo sangrado por encima de la sangria base.
    *Ciega a:* un bloque con sangria inconsistente y a una cita entre comillas
    normales. Cota inferior de las menciones, no su total.
    """
    lineas = text.splitlines(keepends=True)
    inicios = []
    desplazamiento = 0
    for linea in lineas:
        inicios.append(desplazamiento)
        desplazamiento += len(linea)
    inicios.append(desplazamiento)

    tramos = []
    i = 0
    while i < len(lineas):
        linea = lineas[i]
        abre = DIRECTIVA_LITERAL.match(linea) is not None or (
            CIERRE_DOS_PUNTOS.search(linea) and linea.strip() != ''
        )
        if not abre:
            i += 1
            continue
        sangria_base = len(linea) - len(linea.lstrip())
        j = i + 1
        fin = i
        while j < len(lineas):
            actual = lineas[j]
            if actual.strip() == '':
                j += 1
                continue
            if len(actual) - len(actual.lstrip()) <= sangria_base:
                break
            fin = j
            j += 1
        if fin > i:
            tramos.append((inicios[i + 1], inicios[fin + 1]))
        i = max(j, i + 1)
    return tramos


def scan(files, lexicon, forbidden, root):
    """Devuelve {clave: (apariciones, primer archivo)} de los DOS ejes.

    La clave de un inventado es la palabra suelta —el veredicto es global—; la
    de una forma prohibida es ``<ruta>::<forma>``, porque el veredicto es por
    archivo: «regla de oro» dentro de la regla que la prohíbe es la cita del
    anti-patrón, y en un hallazgo nuevo es el anti-patrón.
    """
    hits = collections.Counter()
    first_seen = {}
    for path in files:
        try:
            text = path.read_text(encoding='utf-8')
        except (OSError, UnicodeDecodeError):
            continue
        key_path = canonical_path(path, root)
        # Los tramos se calculan ANTES porque los dos ejes los usan. La
        # version anterior eximia la cita solo en el eje de formas vetadas, y
        # lo declaraba como eleccion. El positivo que la corrige es real y del
        # repo: el hallazgo H-API-785 transcribe `grep -rl "[Dd]ivergencia"`
        # dentro de un bloque, y el escaner de palabras leia `ivergencia` como
        # un sustantivo inventado. Una palabra dentro de un bloque literal
        # esta TRANSCRITA, no escrita — el mismo argumento en los dos ejes.
        tramos = literal_spans(text) + block_spans(text)
        for m in WORD.finditer(text):
            if any(a <= m.start() and m.end() <= b for a, b in tramos):
                continue
            word = m.group(0).lower()
            if NOMINAL_SUFFIX.match(word) and not attested(word, lexicon):
                hits[word] += 1
                first_seen.setdefault(word, key_path)
        for form, pattern in forbidden:
            found = sum(
                1 for m in pattern.finditer(text)
                if not any(a <= m.start() and m.end() <= b for a, b in tramos)
            )
            if found:
                key = f'{key_path}::{form}'
                hits[key] += found
                first_seen.setdefault(key, key_path)
    return {k: (n, first_seen[k]) for k, n in hits.items()}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('files', nargs='*', help='archivos concretos (default: todo el corpus)')
    parser.add_argument('--quiet', action='store_true', help='sólo el conteo')
    parser.add_argument('--strict', action='store_true', help='exit 1 si hay nuevos')
    parser.add_argument('--write-baseline', action='store_true', help='congelar lo medido')
    parser.add_argument(
        '--instalar-lexico', action='store_true',
        help=f'si falta el léxico, instalarlo y RE-COMPROBAR. Opt-in: el default sigue siendo rehusar. Equivale a {INSTALL_VAR}=1'.format(INSTALL_VAR=INSTALL_VAR))
    parser.add_argument(
        '--no-baseline', action='store_true',
        help='ignorar el baseline — mide el DETECTOR, no la política. Es lo que '
             'usa la suite: su control positivo real («democión») vive en el '
             'baseline porque la regla que lo prohíbe lo cita, y con el baseline '
             'puesto el control no podría fallar nunca.',
    )
    args = parser.parse_args(argv)

    lexicon = load_lexicon(
        require_lexicon(auto_install=True if args.instalar_lexico else None))
    raiz = consumer_root(args.files)
    files = corpus_files(args.files, raiz)
    forbidden = compile_forbidden(load_forbidden(resolve_forbidden(files)))
    found = scan(files, lexicon, forbidden, raiz)

    baseline_path = resolve_baseline(files)

    if args.write_baseline:
        if not baseline_path.is_file() and baseline_path == HERE / BASELINE_NAME:
            print(
                f'ERROR — no hay baseline que regenerar y el destino caeria en\n'
                f'  {baseline_path}, el hogar del PROVEEDOR. Crearlo ahi lo haria\n'
                f'  ganar sobre el del consumidor en la proxima lectura, que es\n'
                f'  como 638 entradas se volvieron invisibles (h-docs-1107).\n'
                f'  Declara el destino con ${BASELINE_VAR}. Donde vive de forma\n'
                '  definitiva es la tarea #162.',
                file=sys.stderr,
            )
            raise SystemExit(2)
        baseline_path.parent.mkdir(parents=True, exist_ok=True)
        baseline_path.write_text(
            '# Vocabulario congelado — prospectivo, se paga al tocar.\n'
            '# Regenerar: python3 .claude/scripts/gates/check_vocabulario_prosa.py --write-baseline\n'
            '#\n'
            '# Conviven los DOS ejes: una palabra suelta es un inventado (veredicto\n'
            '# global) y una clave `<ruta>::<forma>` es una forma vetada en ESE\n'
            '# archivo. Ceguera declarada de la clave por archivo: una ocurrencia\n'
            '# NUEVA dentro de un archivo ya congelado no se ve — el grifo protege\n'
            '# al archivo nuevo, no a la línea nueva (tarea #664).\n'
            '#\n'
            '# NO todo lo de aquí es un defecto que corregir. Tres clases conviven:\n'
            '#  (a) tecnicismo culto legítimo que el corpus no recoge —\n'
            '#      idempotencia, memoización, observabilidad, conmutatividad;\n'
            '#  (b) defecto real que espera su pase — occurrencias, nnotificaciones,\n'
            '#      disjunción (la forma española es disyunción);\n'
            '#  (c) la palabra CITADA por la regla que la prohíbe: «democión» está\n'
            '#      aquí porque redaccion-tecnica-es.md documenta el episodio, y\n'
            '#      corregirla ahí borraría la documentación del anti-patrón.\n'
            '# El triaje de las tres clases es la tarea #645.\n'
            + '\n'.join(sorted(found)) + '\n',
            encoding='utf-8',
        )
        print(f'baseline escrito: {len(found)} palabra(s) en {baseline_path}')
        return 0

    baseline = set() if args.no_baseline else load_baseline(baseline_path)
    fresh = {w: v for w, v in found.items() if w not in baseline}

    if args.quiet:
        print(len(fresh))
        return 1 if (args.strict and fresh) else 0

    for word, (count, path) in sorted(fresh.items(), key=lambda kv: -kv[1][0]):
        # La clave de una forma vetada YA lleva su archivo (`<ruta>::<forma>`),
        # asi que imprimir ademas `first_seen` lo repetia en la misma linea. Con
        # la clave absoluta la linea era ilegible; con la relativa sigue
        # sobrando. Y esta linea es lo que lee quien acaba de ver su commit
        # bloqueado — el reporte del gate ES su interfaz.
        origen = '' if '::' in word else f' {path}'
        print(f'  {count:4}  {word}{origen}')
    inventado = sum(1 for k in fresh if '::' not in k)
    # El denominador es el ALCANCE —cuántos archivos se leyeron—, no cuántas
    # claves salieron. Decía `{len(found)} de {len(files)} archivos`, y
    # `found` son hallazgos (baseline incluido): dos magnitudes distintas bajo
    # un solo rótulo, que es el sub-patrón A de la regla que este gate vigila.
    # Coste medido: una sonda de 1 archivo imprimía «0 de 1 archivos» y se
    # leyó como «no midió nada», cuando sí lo había medido.
    print(
        f'{len(fresh)} hallazgo(s) nuevo(s): {inventado} inventado(s) · '
        f'{len(fresh) - inventado} prohibido(s) '
        f'(alcance medido: {len(files)} archivo(s); {len(found)} hallazgo(s) '
        f'en total; {len(baseline)} en baseline; léxico: {len(lexicon)} '
        f'formas; vetadas: {len(forbidden)})'
    )
    return 1 if (args.strict and fresh) else 0


if __name__ == '__main__':
    raise SystemExit(main())
