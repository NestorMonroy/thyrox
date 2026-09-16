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

Las dos condiciones, y ambas hacen falta
-----------------------------------------

1. **Forma sin cota** — ``recursive=True``, ``rglob``, ``os.walk``, ``grep -r``,
   ``find`` sin profundidad, ``ls -R``.
2. **Raiz pesada** — una ruta cuyo subarbol incluye ``node_modules``,
   ``_references`` o ``.git`` de un repo grande.

Con la primera sola, el aviso saldria sobre ``src/**/*.py`` —milisegundos— y un
aviso que sale siempre se aprende a ignorar. Con la segunda sola, saldria sobre
``cat`` de un archivo de esa raiz. La conjuncion es lo que lo hace informativo.

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

*Metrica:* formas de recorrido sin cota y raices pesadas, ambas por patron
lexico sobre el texto completo del comando.
*Ciega a:* un guion invocado por ruta, cuyo cuerpo no viaja en el comando; a
una raiz pesada que llegue por una variable que este detector no conoce; y a
``rg``, que respeta ``.gitignore`` y por eso no cae en la clase — pero tampoco
se descuenta explicitamente.
"""
from __future__ import annotations

import re

#: Formas de recorrido que descienden sin limite declarado. Cada entrada es
#: (etiqueta, patron); la etiqueta se cita en el aviso para que el lector sepa
#: que lo disparo en vez de recibir un recordatorio generico.
UNBOUNDED_SHAPES: tuple[tuple[str, str], ...] = (
    ("un glob recursivo", r"recursive\s*=\s*True|\.rglob\s*\(|glob\s*\(\s*['\"][^'\"]*\*\*"),
    ("un os.walk", r"\bos\.walk\s*\("),
    ("un grep recursivo", r"\bgrep\b[^|;&]*\s-[a-zA-Z]*[rR][a-zA-Z]*\b"),
    ("un find sin profundidad", r"\bfind\s+[~/$]"),
    ("un listado recursivo", r"\bls\s+-[a-zA-Z]*R\b|\bdu\s+-[a-zA-Z]*s?h?\s+[~/$]"),
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

#: El mecanismo que el aviso nombra. Va como constante para que el texto y el
#: archivo no puedan divergir en silencio.
MECHANISM = "src/session/bounded_scan.py"


def matched_shapes(command: str) -> list[str]:
    """Las formas de recorrido sin cota que este comando contiene."""
    return [label for label, pattern in UNBOUNDED_SHAPES
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
