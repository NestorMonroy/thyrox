"""Detector PreToolUse: el recorrido de arbol SIN COTA sobre una raiz pesada.

Es el gate de la seccion «El recorrido tiene cota» de
``.claude/rules/trabajo-en-segundo-plano.md``, y su origen tiene fecha y dos
ocurrencias en la misma sesion (:ref:`h-thyrox-23`)::

    python3 - <<'PY'
    for db in glob.glob('/home/user/thyrox/**/*.sqlite3', recursive=True): ...
    PY

Un recorrido sin cota sobre una raiz pesada no falla: **gira**. Paso de los
120 s del primer plano, el cliente lo mando a segundo plano y ahi quedo — sin
resultado, sin error y sin final. El corolario en prosa ya existia
(``model-selection-subagents.md``, «Corolario para el propio orquestador»:
*acotar con --include, -maxdepth o una raiz concreta*) y no lo previno. La
prosa no previene la reincidencia; un gate ejecutable si —``gitlink-bump-gate``
lo dejo dicho y este episodio lo confirma.

Por que es un detector APARTE y no una familia mas del hermano
--------------------------------------------------------------

``detect_foreground_long_command`` mide **que programa** se invoca, y para eso
pela envolturas con ``command_heads``. El comando de arriba, pelado, es ``-``:
la forma vive dentro de un heredoc, no en posicion de comando. El hermano calla
con razon — no es su eje. Aqui el sujeto es la **forma del recorrido**, asi que
se escanea el texto entero.

Dos familias, y sus condiciones NO son las mismas
--------------------------------------------------

El detector medía una sola clase bajo el rotulo «sin cota», y eran dos
fenomenos con costes distintos — el sub-patron A de
``metrica-decide-la-conclusion.md``, con este gate como sujeto. h-thyrox-29 los
separo midiendo (banco ``particion-de-recorrido-por-raiz-20260916T220401``):

**1. Coste LINEAL en el tamano del subarbol** — ``rglob``, ``os.walk`` sin
seguir enlaces, ``grep -r``, ``find`` sin profundidad, ``ls -R``. Exige **dos**
condiciones: la forma **y** una raiz pesada. Con la forma sola el aviso saldria
sobre ``src/**/*.py`` —milisegundos— y un aviso que sale siempre se aprende a
ignorar; con la raiz sola saldria sobre un ``cat``. La conjuncion es lo que lo
hace informativo, y sigue vigente para esta familia: ``grep -r`` sobre
``odoo-tools`` —861 555 entradas— es un timeout real.

**2. Coste COMBINATORIO por el grafo de enlaces** — todo lo que **sigue**
symlinks: ``glob(..., recursive=True)``, ``walk(..., followlinks=True)``,
``find -L``, ``grep -R``, ``rg -L``, ``du -L``, ``tar -h``. Avisa **sin
condicion de raiz**, porque el peso de la raiz no discrimina este fenomeno:
medido, ``src/packages/agent`` tiene **369 entradas** y ``glob(...,
recursive=True)`` **no termina en 30 s** sobre ella, mientras ``odoo-tools``
con **861 555** termina en 15.51 s. Lo que explota es el abanico —844 enlaces
bajo ``src/``, 137 de workspace en 21 paquetes, abanico hasta 18—, acotado por
ELOOP a los 41 saltos: no es bucle infinito sino explosion combinatoria.

Aplicar la condicion de raiz a la familia 2 era un **falso negativo medido**:
el comando que gira sobre una raiz ligera pasaba en silencio.

Y los **descuentos** callan lo que ya esta acotado: ``--include``,
``--exclude-dir``, ``-maxdepth``, ``-prune``, el indice de git, la poda in situ
de ``os.walk``, y ``timeout N`` — que es el piso siempre disponible.

Que NO hace, y es deliberado
----------------------------

**No bloquea.** Sale por ``additionalContext`` como sus hermanos: un patron
lexico no distingue un ``os.walk`` con poda escrita tres lineas mas abajo de
uno sin ella, y bloquear con un instrumento que no discrimina seria el
sub-patron D con el gate como sujeto. Lo que si hace es nombrar el mecanismo
—``bounded_scan.py``— y el piso —``timeout``—, para que el aviso deje una
accion y no un reproche.

*Metrica:* formas de recorrido de las dos familias y raices pesadas, todas por
patron lexico sobre el texto completo del comando. Cual sigue enlaces y cual no
esta medido por conducta, no supuesto: sobre un arbol con un enlace a
directorio, ``grep -r`` da 0 hits y ``grep -R`` 1; ``find`` 0 y ``find -L`` 1;
``rg`` 0 y ``rg -L`` 1.
*Ciega a:* un guion invocado por ruta, cuyo cuerpo no viaja en el comando
—**TASK-THYROX-0062**, declarada DESCONOCIDO con su condicion de cierre: el
censo cross-language no halla ningun positivo real hoy, asi que su control
positivo habria que fabricarlo—; a la familia de proceso (``awk``, ``sort``,
``xargs``…) cuando su entrada llega por una tuberia cuyo productor este
detector no marco —se mide la fuente, no el consumidor, y esa eleccion se
declara arriba—; y a una raiz pesada que llegue por una variable que este
detector no conoce.

Y ``HEAVY_ROOTS`` sigue listando ``/home/user/thyrox``, cuyo recorrido lineal
cuesta 0.36 s — el orden de un ``cat``. Su recalibracion por coste es
**TASK-THYROX-0061**; no se hace aqui porque retirar una raiz exige su propio
control de anulacion, y este pase midio otra cosa.
"""
from __future__ import annotations

import re

#: Formas de recorrido que descienden sin limite declarado. Cada entrada es
#: (etiqueta, patron); la etiqueta se cita en el aviso para que el lector sepa
#: que lo disparo en vez de recibir un recordatorio generico.
UNBOUNDED_SHAPES: tuple[tuple[str, str], ...] = (
    ("un glob recursivo", r"\.rglob\s*\(|glob\s*\(\s*['\"][^'\"]*\*\*"),
    ("un os.walk", r"\bos\.walk\s*\("),
    # ``-r`` NO sigue symlinks y ``-R`` SI (medido: mismo arbol con un enlace a
    # directorio, 0 hits contra 1). Por eso ``-R`` vive en la familia de giro.
    ("un grep recursivo", r"\bgrep\b[^|;&]*\s-[a-z]*r[a-z]*\b"),
    # ``rg`` recorre el arbol por DEFECTO —esa es su razon de ser—, asi que es
    # una forma de recorrido como las demas. Lo que lo distingue es que trae su
    # propia cota, y eso lo resuelve el descuento de abajo, no esta lista.
    ("una busqueda con ripgrep", r"\brg\b"),
    ("un find sin profundidad", r"\bfind\s+[~/$]"),
    ("un listado recursivo", r"\bls\s+-[a-zA-Z]*R\b|\bdu\s+-[a-zA-Z]*s?h?\s+[~/$]"),
    ("una expansion recursiva del shell", r"\*\*/"),
    ("un empaquetado de la raiz", r"\btar\s+-?[a-zA-Z]*c[a-zA-Z]*\s"),
)

#: Formas que **SIGUEN** enlaces simbolicos. Son otra clase, no un subconjunto
#: de la de arriba, y por eso avisan **sin condicion de raiz**: lo que las
#: vuelve caras no es el volumen del subarbol sino el grafo de enlaces.
#:
#: Medido (h-thyrox-29, banco ``particion-de-recorrido-por-raiz-20260916T220401``):
#: ``src/packages/agent`` tiene **369 entradas** y ``Path.rglob`` la recorre en
#: 0.01 s, pero ``glob.glob(..., recursive=True)`` **no termina en 30 s** sobre
#: ella; ``odoo-tools``, con **861 555 entradas**, termina en 15.51 s. Una raiz
#: de 369 entradas gira y una de 861k no: el peso de la raiz no discrimina este
#: fenomeno. La causa es el abanico de enlaces —844 bajo ``src/``, 137 de
#: workspace en 21 paquetes, abanico hasta 18— que el kernel corta a los 41
#: saltos (ELOOP): no es bucle infinito sino explosion combinatoria acotada.
#:
#: Cual sigue enlaces y cual no esta MEDIDO, no supuesto: sobre un arbol con un
#: enlace a directorio, ``grep -r`` da 0 hits y ``grep -R`` 1; ``find`` 0 y
#: ``find -L`` 1; ``rg`` 0 y ``rg -L`` 1.
#:
#: ``recursive=True`` y ``followlinks=True`` van anclados a su llamada
#: (``glob(``/``walk(``) a proposito: sin el ancla, un ``grep -rn
#: recursive=True .claude/rules/`` —buscar el literal— disparaba el aviso.
SYMLINK_FOLLOWING_SHAPES: tuple[tuple[str, str], ...] = (
    ("un glob que sigue enlaces", r"\b(?:i)?glob\s*\(.{0,200}?recursive\s*=\s*True"),
    ("un os.walk que sigue enlaces", r"\bwalk\s*\(.{0,200}?followlinks\s*=\s*True"),
    ("un find que sigue enlaces", r"\bfind\s+-L\b"),
    ("un grep que sigue enlaces", r"\bgrep\b[^|;&]*\s-[a-zA-Z]*R[a-zA-Z]*\b"),
    ("un ripgrep que sigue enlaces", r"\brg\b[^|;&]*\s(?:-L\b|--follow\b)"),
    ("un du que sigue enlaces", r"\bdu\b[^|;&]*\s-[a-zA-Z]*L[a-zA-Z]*\b"),
    ("un tar que sigue enlaces", r"\btar\b[^|;&]*\s(?:-[a-zA-Z]*h[a-zA-Z]*\b|--dereference\b)"),
)

#: La familia de PROCESO que ``operaciones-de-archivo-con-bash.md`` prescribe
#: —``awk``, ``sort``, ``uniq``, ``comm``, ``cut``, ``paste``, ``xargs``,
#: ``wc``— **no lleva patron propio, y es deliberado**: ninguno de esos
#: programas recorre un arbol. Lo que los vuelve caros es **de donde les llega
#: la entrada**, y esa entrada es siempre una de las formas de arriba: una
#: expansion ``**/`` del shell, un ``find`` sin profundidad, un ``grep -r``.
#:
#: Anadirlos como familia seria medir el consumidor y concluir sobre el
#: productor — el sub-patron C de ``metrica-decide-la-conclusion.md``: un
#: ``awk '{s+=$1}' archivo.tsv`` es instantaneo y un ``awk`` alimentado por
#: ``find / `` no termina, y el literal ``awk`` no distingue los dos casos.
#: Por eso el detector marca la FUENTE de la entrada y los deja pasar.
CONSUMERS_WITHOUT_OWN_PATTERN: tuple[str, ...] = (
    "awk", "sort", "uniq", "comm", "cut", "paste", "xargs", "wc", "shuf", "cat",
)

#: Raices cuyo subarbol lleva el volumen que no se ve en `git ls-files`:
#: ``node_modules``, ``_references`` con los corpus vendorizados, ``.git``.
#: Es una lista de DATOS, como ``LONG_FAMILIES`` del hermano: crece midiendo,
#: no adivinando.
HEAVY_ROOTS: tuple[str, ...] = (
    r"/home/user/thyrox\b",
    r"/home/user/odoo-tools\b",
    r"/home/user/-progress\b",
    r"\$\{?THYROX_ROOT\b",
    r"\$\{?T\}?/",
    r'"\$T"',
    r"/home/user/?[\"'\s]",
    r"\bnode_modules\b",
    r"\b_references\b",
    r"~/?[\"'\s]",
)

#: Ya esta acotado: el aviso no aplica. ``timeout`` es coreutils y esta
#: siempre, asi que es el piso disponible aunque ningun hook cargue; el indice
#: de git no recorre el arbol; ``dirs[:]`` es la poda in situ de ``os.walk``.
BOUNDED = re.compile(
    r"--include[= ]|--exclude-dir|-maxdepth\b|-prune\b|"
    r"\bgit\s+(?:-C\s+\S+\s+)?(?:grep|ls-files)\b|"
    r"\btimeout\s+\d|\bbounded_scan\b|dirs\[:\]"
)

#: ``rg`` acota POR DEFECTO: respeta ``.gitignore`` y salta los ocultos, asi que
#: no necesita ``--include`` para no recorrer ``node_modules``. Medido en este
#: arbol: **14 067** archivos visitados contra **50 190** con
#: ``--no-ignore --hidden`` — una cota real de 3.6x, automatica.
#:
#: Por eso es descuento y no ceguera declarada, que es como figuraba antes de
#: medirlo. Pero el descuento **se retira** cuando el comando desactiva esa
#: cota: ``rg --no-ignore`` recorre lo mismo que un ``grep -r`` pelado, y
#: tratarlo como acotado seria confiar en el nombre del programa en vez de en
#: lo que el comando hace.
RIPGREP = re.compile(r"\brg\b")
RIPGREP_UNBOUNDED = re.compile(r"--no-ignore\b|--hidden\b|(?<!\w)-[a-zA-Z]*u[a-zA-Z]*(?=\s|$)")

#: El mecanismo que el aviso nombra. Va como constante para que el texto y el
#: archivo no puedan divergir en silencio.
MECHANISM = "src/session/bounded_scan.py"


def matched_shapes(command: str) -> list[str]:
    """Las formas de recorrido sin cota que este comando contiene."""
    return [label for label, pattern in UNBOUNDED_SHAPES
            if re.search(pattern, command)]


def matched_symlink_shapes(command: str) -> list[str]:
    """Las formas que siguen enlaces simbolicos que este comando contiene."""
    return [label for label, pattern in SYMLINK_FOLLOWING_SHAPES
            if re.search(pattern, command)]


def touches_heavy_root(command: str) -> bool:
    """Si el comando nombra una raiz cuyo subarbol es volumen no versionado."""
    return any(re.search(pattern, command) for pattern in HEAVY_ROOTS)


def detect(payload: dict) -> str | None:
    """El aviso de recorrido sin cota si el comando lo merece, o ``None``."""
    tool_input = payload.get("tool_input") or {}
    command = tool_input.get("command")
    if not isinstance(command, str) or not command.strip():
        return None

    # Un recorrido ya acotado cumple la regla: callar.
    if BOUNDED.search(command):
        return None

    # La familia que SIGUE enlaces avisa SIN condicion de raiz: lo que la
    # vuelve cara es el grafo de enlaces, no el volumen. Va antes del descuento
    # de ``rg`` porque ``rg -L`` sigue enlaces aunque respete .gitignore.
    symlink_shapes = matched_symlink_shapes(command)
    if symlink_shapes:
        return (
            "GATE DE RECORRIDO ACOTADO — este comando hace "
            + ", ".join(symlink_shapes)
            + ". Esa forma NO depende del tamano de la raiz: medido, una de "
            "369 entradas no termina en 30 s y una de 861 555 termina en "
            "15.51 s (h-thyrox-29). Lo que explota es el abanico de enlaces, "
            "acotado por ELOOP a los 41 saltos — combinatorio, no infinito. "
            f"Usa `python3 {MECHANISM} <raiz> --name '<patron>'`, que no sigue "
            "enlaces, o retira la bandera que los sigue (-L, -R, --follow, "
            "recursive=True, followlinks=True). Y el piso, que esta siempre: "
            "antepon `timeout 60`."
        )

    # ``rg`` trae su propia cota, salvo que el comando la desactive.
    if RIPGREP.search(command) and not RIPGREP_UNBOUNDED.search(command):
        return None

    shapes = matched_shapes(command)
    if not shapes or not touches_heavy_root(command):
        return None

    return (
        "GATE DE RECORRIDO ACOTADO — este comando hace "
        + ", ".join(shapes)
        + " sobre una raiz pesada y SIN cota. Esa forma no falla: gira. Paso "
        "ya dos veces en una sesion, se comio el timeout de primer plano y "
        "quedo en segundo plano sin devolver nada (h-thyrox-23). Usa "
        f"`python3 {MECHANISM} <raiz> --name '<patron>'`, que poda .git y "
        "node_modules y declara si se quedo corto. Si el "
        "recorrido tiene que ser este, acotalo: --include / --exclude-dir para "
        "grep, -maxdepth o -prune para find, `git grep` si basta el indice. Y "
        "el piso, que esta siempre: antepon `timeout 60`. Si la raiz es "
        "estrecha de verdad, ignora este aviso: mide la forma, no el tamano real."
    )
