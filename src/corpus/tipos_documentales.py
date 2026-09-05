"""Vocabulario de tipos documentales — PROYECCION del canon, no su fuente.

DEC-DOC-015 fija que `.claude/` es mecanismo y `source/` es canon y registro.
Este modulo es un mecanismo que consume canon: cada fila cita la fila del
estandar de la que se deriva, con el mismo criterio con que un cheat-sheet de
`.claude/rules/` declara su canonico en docs.

Lo que este modulo SI puede llevar:
  - el vocabulario, porque cada entrada nombra su origen y es verificable;
  - el patron de nombre, que es sintaxis y por tanto mecanismo.

Lo que NO lleva, y es la mitad que DEC-DOC-015 protege:
  - cuantos documentos hay de cada tipo;
  - que series existen en el arbol.
Eso es registro y su hogar es `source/`, publicado por el generador del evento
`catalogo-series-documentales-*`.

Por que el tipo se lee del PREFIJO y no de la clave `:tipo:` — los dos ejes se
midieron cruzados sobre el arbol completo (H-DOCS-415) y NO son el mismo:

    eje                cobertura        vocabulario
    :tipo: declarado   68 %             cientos de formas
    prefijo            100 %            este modulo + `otro`

Ninguno sustituye al otro. El primero es la intencion del autor y es el que la
norma documental audita; el segundo es mecanico, y por eso puede ser la unidad
de una serie de conservacion. La cifra vive en el hallazgo, no aqui.
"""

from pathlib import PurePosixPath

#: El tipo que se declara cuando el nombre no cae en ninguno de los anteriores.
#: NO es un cajon de sastre: es un VEREDICTO — "este nombre no declara tipo".
#: Un NULO ahi seria "no mire", que es la ceguera del sub-patron D de
#: `metrica-decide-la-conclusion.md`.
DOCUMENT_TYPE_UNKNOWN = "otro"

#: tipo -> (patron de nombre, fila del canon de la que se proyecta)
#:
#: La tercera columna es lo que hace auditable a este modulo: quien dude de una
#: fila abre el canon citado y la compara. Una fila sin cita seria vocabulario
#: inventado viviendo en mecanismo, que es justo el defecto de H-DOCS-414.
DOCUMENT_TYPE_ROWS = {
    # --- clasificacion-documental-por-tipo, tabla "Dentro de la iniciativa" ---
    "alcance":    ("alcance-<slug>.rst",
                   "clasificacion-documental-por-tipo :: Encuadre del pase"),
    "analisis":   ("analisis-<slug>.rst",
                   "clasificacion-documental-por-tipo :: Medicion, linea base, causa raiz"),
    "decisiones": ("decisiones-<slug>.rst",
                   "clasificacion-documental-por-tipo :: Decision con alternativas"),
    "tareas":     ("tareas-<slug>.rst",
                   "clasificacion-documental-por-tipo :: Tareas atomicas T-NNN"),
    "progreso":   ("progreso-<slug>.rst",
                   "clasificacion-documental-por-tipo :: Bitacora del recorrido"),
    "hallazgo":   ("hallazgo-<ID>-<slug-corto>.rst",
                   "clasificacion-documental-por-tipo :: Hallazgo (bug · drift · gap)"),
    # --- clasificacion-documental-por-tipo, tabla "canon del producto" -------
    "adr":        ("adr-NNN-<tema>.rst",
                   "clasificacion-documental-por-tipo :: Decision arquitectonica de producto"),
    "reporte":    ("reporte-<slug>-<fecha>.rst",
                   "clasificacion-documental-por-tipo :: Auditoria · reporte analitico"),
    "uc":         ("uc-<id>-<tema>.rst",
                   "clasificacion-documental-por-tipo :: Caso de uso"),
    "fr":         ("fr-<id>-<tema>.rst",
                   "clasificacion-documental-por-tipo :: Requisito funcional"),
    # --- convention-naming, "Excepcion: ID de tracking" ----------------------
    "sol":        ("sol-NNN-<slug>.rst",
                   "convention-naming :: Excepcion: ID de tracking (SOL-NNN)"),
    # --- SIN FILA EN EL CANON, y se declara ---------------------------------
    #: `index` no es un tipo documental: es el punto de entrada de un
    #: directorio, y ninguna de las dos tablas del estandar lo enumera. Se
    #: reconoce porque el recorrido tiene que darle UN veredicto y meterlo en
    #: `otro` lo confundiria con lo que si es deuda de clasificacion.
    "index":      ("index.rst",
                   "SIN FILA — estructural; ver #879"),
}

#: El orden importa: se compara por prefijo y `analisis` no debe capturar a un
#: hipotetico `analisis-de-algo` que fuera otro tipo. Hoy no hay solapamiento
#: medido, pero fijar el orden hace determinista el veredicto.
DOCUMENT_TYPES = tuple(DOCUMENT_TYPE_ROWS)


def document_type(rel: str) -> str:
    """El tipo que el NOMBRE del archivo declara.

    Devuelve siempre un veredicto: uno de ``DOCUMENT_TYPES`` o
    ``DOCUMENT_TYPE_UNKNOWN``. Nunca ``None`` — la ausencia de tipo se declara,
    no se calla.
    """
    nombre = PurePosixPath(rel).stem
    for prefijo in DOCUMENT_TYPES:
        if nombre == prefijo or nombre.startswith(prefijo + "-"):
            return prefijo
    return DOCUMENT_TYPE_UNKNOWN


def canon_row(tipo: str) -> str:
    """La fila del canon de la que se proyecta un tipo, para citarla."""
    if tipo == DOCUMENT_TYPE_UNKNOWN:
        return "SIN FILA — el nombre no declara tipo"
    return DOCUMENT_TYPE_ROWS[tipo][1]
