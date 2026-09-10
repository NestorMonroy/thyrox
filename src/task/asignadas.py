"""Quien es dueno de cada tarea que NO hacemos nosotros.

La tabla es el dato; ``render_tablero_asignadas.py`` solo la formatea. Separar
las dos cosas es lo que permite que reasignar una tarea sea editar una fila y
regenerar, en vez de editar un documento a mano y que el registro y la realidad
se separen en silencio.

Por que un tablero NUEVO y no una columna en el que ya hay
==========================================================

``tablero-de-tareas.rst`` lo genera ``agent_store.py render-tablero`` desde la
tabla ``tasks`` del store, y lo refresca un hook cuando la firma de estados
cambia. Escribir ahi la asignacion la perderia en el primer refresco: el store
es la fuente de ese documento y no lleva este eje. Este registro es de otra
naturaleza —una decision de alcance del ejecutor, no un estado observado— y por
eso vive aparte y se edita aqui.

El criterio de la frontera, corregido
=====================================

La primera version cortaba por **de que arbol es el entregable**, y el ejecutor
la corrigio el mismo dia: *"yo di la orden incorrecta; las que son de API y sus
derivados de trabajo, si las tenemos que hacer"*.

La linea real es **quien lo consume**:

- un gate, un hook o un guion que vive en ``.claude/`` pero cuyo consumidor es
  nuestro trabajo de API es un **derivado**, y es **nuestro**;
- una regla, una convencion o un guion cuyo consumidor es el trabajo de otro
  repo es **ajeno**, y se asigna.

Los dos criterios discrepan justo donde importa, y esa discrepancia es la
leccion: ``#39`` vive entera en ``docs/.claude/scripts/task/`` —por el criterio
viejo, ajena— y su salida ordena **nuestro** backlog, asi que es nuestra. Lo
mismo ``#101``: el gate es de docs y las rutas que revisa apuntan a ``api``,
donde un porte que mueve un archivo deja la cita colgando.

Lo que sigue asignado no es "lo que vive en docs": es lo que **otro** consume —
propagar una regla a siete repos, renumerar etiquetas del corpus, borrar ramas,
los githooks de los cinco clones.
"""

#: Los cuatro duenos. No son personas: son las areas de las que la tarea
#: depende, que es lo que se puede afirmar sin inventar nombres.
DUENOS = {
    'docs-gobernanza': 'reglas y convenciones del proyecto (.claude/rules/, normativa)',
    'docs-tooling': 'gates, hooks y guiones de .claude/',
    'docs-corpus': 'el arbol RST de source/',
    'infra-git': 'higiene de los clones, sus ramas y sus hooks',
}

#: (id, dueno, por que no es nuestra). El "por que" es la mitad que hace
#: auditable la asignacion: sin el, la tabla es una opinion.
ASIGNADAS = (
    (1,   'infra-git',       'higiene de ramas, multi-repo; no toca codigo de api'),
    (2,   'docs-gobernanza', 'propagacion de una regla de .claude/rules/ a siete repos'),
    (3,   'docs-gobernanza', 'convencion de citacion de tareas'),
    (6,   'docs-tooling',    'guion de arranque de clon, en .claude/scripts/ de docs'),
    (8,   'docs-tooling',    'sonda de conducta del cliente; cierra el DESCONOCIDO de H-DOCS-428'),
    (12,  'docs-tooling',    'test de los guiones de .claude/, no de la suite de api'),
    (13,  'docs-corpus',     'renumerar etiquetas RST; no hay codigo de por medio'),
    (14,  'docs-gobernanza', 'vocabulario del censo, bajo redaccion-tecnica-es.md'),
    (21,  'infra-git',       'githooks activos en los cinco clones'),
    (22,  'infra-git',       'los cuatro gates sobre lo ya commiteado en los cinco clones'),
)

#: Retiradas de esta tabla tras revisarla con el ejecutor. Se listan porque una
#: frontera se aprende de sus casos dudosos, no de su enunciado.
DEVUELTAS = (
    (7, 'la ejercemos en cada cifra que publicamos; dos fallos de hoy la habrian atajado'),
    (16, 'el tercer desenlace estructura NUESTROS hallazgos; dos casos vivos hoy'),
    (17, 'su poblacion son los hallazgos H-API que escribimos nosotros'),
    (19, 'escribimos hallazgos RST en cada pase'),
    (20, 'su caso real es de hoy: la colision de H-API-854'),
    (39, 'su salida ordena nuestro backlog de API (correccion del ejecutor)'),
    (94, 'nuestros artefactos citan rutas, y una efimera muere con el contenedor'),
    (101, 'las rutas que revisaria apuntan a api; un porte que mueve un archivo deja la cita colgando'),
    (18, 'las ejecuciones largas SON el bucle de trabajo de api: la suite son '
         '294 s con -n 4 y 675 s en serie, y el timeout del primer plano son '
         '120 s. El "contra las referencias y el binario" del asunto dice COMO '
         'se analiza, no de quien es el problema.'),
)

#: Tareas asignadas que YA tienen trabajo hecho, y donde esta. Se declara para
#: que quien las tome no lo rehaga, y para que conste que se commiteo por no
#: perderlo con el contenedor, NO por adoptar la tarea.
TRABAJO_PARCIAL = {
    21: ('docs@31d2ea10d', 'check_githooks_activos.py con contrato probado '
                           '(5 estados, 9 aserciones) y cableado en thyrox-audit.sh'),
    22: ('docs@d37511b3f', 'reporte regenerable remedicion-gates-githook.rst + '
                           'H-API-858; el INCUMPLE que hallo era de api y se '
                           'corrigio en api@21caa716'),
}
