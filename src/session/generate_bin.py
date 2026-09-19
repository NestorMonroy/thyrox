#!/usr/bin/env python3
"""Genera ``bin/`` — nombre corto para los entrypoints de session/verify/agents.

Medido antes de escribir esto (no supuesto): un symlink PLANO rompe scripts
que resuelven su propio directorio con ``${BASH_SOURCE[0]}`` —``bg.sh``
resolvía su raíz contra ``bin/..`` en vez de ``src/session/..`` y moría con
``ModuleNotFoundError``—. Lo que sí funciona, probado: un guion envoltorio de
dos líneas que hace ``exec`` sobre la ruta absoluta REAL del objetivo, porque
``exec`` invoca el archivo en su ubicación verdadera y ``BASH_SOURCE`` adentro
se resuelve correcto.

Universo — dos reglas, cada una medida contra el árbol real
-------------------------------------------------------------
``.sh`` con shebang: todos los de ``src/session``, ``src/verify``,
``src/agents`` (34 medidos) — ninguno es de biblioteca, ninguno se sourcea
desde otro archivo de esas tres carpetas.

``.py`` con guarda ``if __name__ == '__main__':`` (comillas simples O dobles
— el primer intento de esta medición sólo veía dobles y perdía 36 de 82
entrypoints reales, entre ellos ``check_rst_sintaxis.py``).

Los que NO la llevan son **biblioteca**. Esa clasificación ya no descansa en
una frase: la mide ``tests/session/test_generate_bin.py`` sobre TODOS ellos en
cada corrida, y su control de anulación es hacer hablar a uno y comprobar que
cae exactamente ése. La versión anterior de este párrafo transcribía la lista
—13 nombres, que hoy son otros— y la sostenía con un caso recordado; una
frase no es una ``Observation``, y una lista en prosa envejece con el árbol.

**Lo que ese control deja a la vista, y no es cómodo:** los módulos de
biblioteca salen **0 en silencio** al invocarse por ruta. No fallan al entrar
por la puerta equivocada — no dicen nada. Su desenlace está registrado; la
decisión adyacente es el bin único de la referencia (``ccb`` declara
``bin: null`` y compila UN entrypoint), que es otra tarea.

Colisión de nombre corto ENTRE los stems: ninguna — medido comparando los 117
stems entre las tres carpetas antes de decidir que un ``bin/`` plano (sin
subcarpeta por dominio) es seguro.

Colisión de nombre corto CONTRA el intérprete: una — ``bg`` (de ``bg.sh``)
choca con el builtin de bash del mismo nombre (control de trabajos, "bring to
background"). Medido, no asumido: ``bash bin/bg status X`` desde la raíz de
thyrox da el mismo resultado que la ruta completa; pero con ``bin/`` en
``PATH`` y ``bg`` escrito **suelto** (sin ``bin/`` ni ``./``), bash resuelve
el builtin antes que el ejecutable de ``PATH`` — la resolución de nombre de
bash consulta builtins antes que ``PATH`` — y el guion nunca se alcanza:

    $ PATH="$PWD/bin:$PATH" bg status baseline-l2
    bash: line 1: bg: status: no such job

El universo de builtins es el de ``compgen -b`` en esta sesión (bash 5.x); se
declara aquí en vez de invocar bash desde el generador, que acoplaría una
herramienta de composición de árbol a un bash corriendo. ``discover_entrypoints``
ya rehúsa en silencio una colisión de stem contra stem (línea de abajo); esta
es la misma postura aplicada a la otra población — el intérprete, no el árbol.

**Corregido 2026-09-12T09:25:38 (directiva del ejecutor: «¿pueden ser con el
prefijo thyrox_bg?»).** La versión anterior sólo AVISABA de la colisión y
dejaba ``bin/bg`` sin invocación suelta bajo ``PATH`` — la razón dada era «no
renombrar rompe la simetría con ``bg.sh``». Esa razón no se sostiene: el
``.sh`` fuente no cambia de nombre, sólo el ENVOLTORIO corto lo hace, y un
envoltorio no tiene que llamarse igual que su fuente para conservar la
trazabilidad (``bin/thyrox-bg`` sigue apuntando a ``src/session/bg.sh``, igual
que ``bin/bg`` lo hacía).

**El separador se midió, no se copió de la pregunta.** ``thyrox_bg`` (guion
bajo) habría sido la forma de FUNCIÓN bash interna —142 hits en el árbol,
todas sourceadas dentro de un script (``thyrox_safe_sed``,
``thyrox_toolchain_declare``), ninguna invocada suelta—. La forma de
ENTRYPOINT ya tiene precedente exacto en este mismo ``bin/``:
``src/verify/thyrox-audit.sh`` usa guion, no guion bajo. ``resolve_bin_name()``
prefija con ``thyrox-`` **cualquier** stem que ``compgen -b`` liste como
builtin — no sólo ``bg`` a mano — así que una colisión futura (un ``.sh``
nuevo llamado ``test`` o ``read``) se resuelve igual sin tocar este archivo.
Medido tras el cambio: el conjunto resuelto NO comparte ningún elemento con
``BASH_BUILTINS`` — la invocación suelta bajo ``PATH`` vuelve a funcionar
para el único caso que hoy existe (``thyrox-bg``).

Idempotente y con --check
--------------------------
Regenerar sobre un ``bin/`` ya poblado dejando el árbol IGUAL cuenta como
éxito, no como no-op sospechoso: es la propiedad que hace a este generador
seguro de correr en cada sesión. ``--check`` no escribe nada — compara contra
lo que generaría y sale 1 si difiere, para un gate.

``bin/`` en PATH no basta en TODO shell — medido, no el mismo hallazgo dos veces
--------------------------------------------------------------------------------
El patrón que ``NestorMonroy/vvv`` usa para esto —``config/homebin/`` +
guarda idempotente en ``provision/core/env/homedir/.bash_aliases``— es
correcto, y este árbol también lo ofrece (``~/.bash_aliases`` con
``PATH="$PATH:$THYROX_ROOT/bin"``, guarda idempotente igual que VVV). Pero es
correcto **para un shell que sourcea sus dotfiles** — una terminal interactiva
de verdad, un contenedor con login shell, CI que corre ``bash -l``.

**Medido en ESTE harness remoto (la herramienta Bash de esta sesión): el
guarda de ``.bash_aliases`` no dispara nunca.** Cada invocación es un
``bash -c`` **no interactivo y no de login**, con ``BASH_ENV`` vacío — las
tres condiciones bajo las que bash NO lee ``~/.bashrc`` ni ``~/.bash_aliases``.
Confirmado en dos direcciones: un ``export`` hecho en una llamada no sobrevive
a la siguiente (no hay estado de shell compartido entre llamadas), y con
``.bash_aliases`` ya escrito, una llamada nueva sigue sin tener ``bin/`` en
``$PATH``.

Lo que SÍ funciona en este harness, medido: los binarios de ``~/.local/bin``
(o ``/root/.local/bin``) están en ``$PATH`` en **toda** llamada — es parte del
entorno del contenedor, heredado por cada proceso, no de un dotfile que se
vuelva a leer. Ese directorio ya tiene entradas de ``uv tool install`` (p. ej.
``black``, ``mypy``) puestas ahí por la misma razón: es la convención de
"herramienta instalada, invocable en cualquier lado" del propio ecosistema
Python — no una invención de este generador.

**De dónde sale esta lectura: analizando ``NestorMonroy/graphify`` (directiva
del ejecutor 2026-09-12).** Su paquete se instala con
``uv tool install graphifyy`` / ``pipx install graphifyy`` y usa
``[project.scripts]`` de ``pyproject.toml`` — el mecanismo estándar de
Python, no un guion propio. Medido con grep sobre las 46 958 líneas del
paquete: **cero** menciones de ``os.environ["PATH"]``, ``bash_aliases``,
``.bashrc`` o ``which(``. graphify no resuelve el problema de PATH con bash —
lo delega enteramente al instalador (``uv``/``pipx``), que a su vez confía en
que ``~/.local/bin`` ya esté en el ``PATH`` del usuario. Es la misma
convención que este contenedor ya cumple, medida y no asumida.

``--install-user-bin`` (abajo) es la adaptación de esa convención al árbol de
thyrox: copia envoltorios de dos saltos a ``~/.local/bin`` —el primero fija
``THYROX_ROOT`` por env-o-literal, el segundo delega al ``bin/<stem>`` que ya
resuelve correcto—, en vez de un symlink plano, por la misma razón medida al
principio de este archivo.

Uso::

    python3 src/session/generate_bin.py                    # escribe/actualiza bin/
    python3 src/session/generate_bin.py --check             # 0 si bin/ ya está al día
    python3 src/session/generate_bin.py --dry-run           # imprime el plan, no escribe
    python3 src/session/generate_bin.py --install-user-bin  # además, copia a ~/.local/bin
"""
from __future__ import annotations

import argparse
import ast
import os
import pathlib
import re
import subprocess
import sys

from paths import reach  # noqa: E402

#: Las carpetas que este generador cubre. Ampliarla es una decisión nueva, no
#: un descuido — cada carpeta añadida necesita su propia medición de colisiones
#: de nombre corto. Por eso es una lista EXPLÍCITA y no ``src/*`` derivado: un
#: universo derivado haría que ``entrypoints_outside_universe`` no pudiera
#: fallar nunca, y un control que no puede fallar no discrimina.
#:
#: Medido al pasar de cinco a quince (TASK-THYROX-0071): 182 entrypoints en
#: ``src/*``, 181 nombres cortos distintos, UNA colisión — ``reach``, entre
#: ``src/lib/reach.sh`` y ``src/paths/reach.py``. La resuelve el bit ejecutable
#: de ``is_shell_entrypoint``, no una excepción por nombre.
SOURCE_DIRS: tuple[str, ...] = (
    "src/agents", "src/corpus", "src/docs", "src/graph", "src/hallazgo",
    "src/hooks", "src/lib", "src/paths", "src/peer_mailbox", "src/repo",
    "src/session", "src/task", "src/transcript", "src/verify", "src/workbench",
)

#: La guarda que separa un módulo CLI de uno de biblioteca. Tolerante a
#: comilla simple o doble — el defecto medido de la primera versión.
MAIN_GUARD = re.compile(r"__name__\s*==\s*.__main__.")

#: Cabecera de todo guion generado — declara que no se edita a mano.
GENERATED_MARKER = "# Generado por src/session/generate_bin.py — no editar a mano."

#: Dónde vive la convención "herramienta instalada, en PATH en todo shell" —
#: la misma que usan ``uv tool install`` y ``pipx`` (medido contra graphify:
#: ninguna wiring de PATH propia, delega en este directorio).
DEFAULT_USER_BIN_DIR = pathlib.Path.home() / ".local" / "bin"

#: Builtins de bash medidos con ``compgen -b`` (bash 5.x, esta sesión). Un
#: stem que coincida con uno de éstos sigue siendo válido como ``bin/<stem>``
#: o por ruta completa; lo que deja de funcionar es invocarlo SUELTO con
#: ``bin/`` en ``PATH`` — bash resuelve builtins antes que ``PATH``.
BASH_BUILTINS: frozenset[str] = frozenset({
    ".", ":", "[", "alias", "bg", "bind", "break", "builtin", "caller", "cd",
    "command", "compgen", "complete", "compopt", "continue", "declare",
    "dirs", "disown", "echo", "enable", "eval", "exec", "exit", "export",
    "false", "fc", "fg", "getopts", "hash", "help", "history", "jobs",
    "kill", "let", "local", "logout", "mapfile", "popd", "printf", "pushd",
    "pwd", "read", "readarray", "readonly", "return", "set", "shift",
    "shopt", "source", "suspend", "test", "times", "trap", "true", "type",
    "typeset", "ulimit", "umask", "unalias", "unset", "wait",
})


def repository_root() -> pathlib.Path:
    """La raíz de thyrox, por el localizador y no por aritmética de ruta.

    ``parents[2]`` acertaba mientras este archivo viviera en ``src/session/`` y
    fallaba **en silencio** al moverlo: el generador compondría su plan contra
    otro árbol y publicaría un ``bin/`` vacío sin reventar. ``thyrox_root()``
    resuelve por variable declarada o por ascenso hasta el marcador, así que
    sobrevive a la mudanza del archivo.
    """
    return reach.thyrox_root()


def is_shell_entrypoint(path: pathlib.Path) -> bool:
    """Un ``.sh`` **con bit ejecutable**. El bit separa entrypoint de biblioteca.

    La versión anterior devolvía ``True`` para todo ``.sh``, con la razón
    escrita al lado: *"medido: ninguno es de biblioteca"*. Era cierto sobre las
    cinco carpetas que ``SOURCE_DIRS`` cubría entonces, y falso en cuanto el
    universo se ensanchó: los seis ``.sh`` de ``src/lib`` definen funciones para
    que otro guion las sourcee, y ninguno invoca nada.

    El criterio se midió contra las dos poblaciones conocidas antes de
    elegirlo, no se supuso:

    ======================================  ============  ==============
    Discriminador                           entrypoints   bibliotecas
    ======================================  ============  ==============
    bit ejecutable                          36 de 36      0 de 6
    hay una llamada de nivel superior       36 de 36      5 de 6  (falla)
    ======================================  ============  ==============

    El bit acierta en las dos direcciones; la heurística de llamada marca como
    entrypoint a cinco de las seis bibliotecas. Y el bit no es una convención
    que este archivo invente: es cómo POSIX separa "se ejecuta" de "se sourcea".
    """
    return path.suffix == ".sh" and os.access(path, os.X_OK)


def is_python_entrypoint(path: pathlib.Path) -> bool:
    """Tiene guarda de ``__main__`` — la biblioteca no la lleva, medido."""
    if path.suffix != ".py" or path.name == "__init__.py":
        return False
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return False
    return bool(MAIN_GUARD.search(text))


def discover_entrypoints(root: pathlib.Path) -> dict[str, pathlib.Path]:
    """El mapa nombre-corto -> ruta absoluta, para las tres carpetas."""
    found: dict[str, pathlib.Path] = {}
    for rel_dir in SOURCE_DIRS:
        directory = root / rel_dir
        if not directory.is_dir():
            continue
        for entry in sorted(directory.iterdir()):
            if not entry.is_file():
                continue
            if is_shell_entrypoint(entry) or is_python_entrypoint(entry):
                stem = entry.stem
                if stem in found:
                    raise ValueError(
                        f"colisión de nombre corto: {stem!r} lo declaran "
                        f"{found[stem]} y {entry} — este generador rehúsa "
                        f"resolverla en silencio")
                found[stem] = entry
    return found


def entrypoints_outside_universe(root: pathlib.Path) -> list[pathlib.Path]:
    """Los entrypoints de ``src/`` que ``SOURCE_DIRS`` NO cubre.

    Existe porque ``--check`` publicaba *"bin/ al día: 131 entrypoint(s)"* con
    51 entrypoints en 10 directorios fuera de su universo — entre ellos las dos
    herramientas que el flujo de sesión declara obligatorias,
    ``src/task/task_ids.py`` y ``src/hallazgo/hallazgo_ids.py``. Ese verde no
    distinguía "todos los entrypoints tienen envoltorio" de "los directorios
    que miro lo tienen": un conteo sin su denominador.

    Devuelve rutas relativas a ``root``, ordenadas. Lista vacía es el estado
    sano; ``--check`` la reporta y rehúsa el "al día" si trae algo.
    """
    cubiertos = {root / d for d in SOURCE_DIRS}
    fuera: list[pathlib.Path] = []
    raiz_src = root / "src"
    if not raiz_src.is_dir():
        return fuera
    for directory in sorted(raiz_src.iterdir()):
        if not directory.is_dir() or directory in cubiertos:
            continue
        for entry in sorted(directory.iterdir()):
            if entry.is_file() and (is_shell_entrypoint(entry)
                                    or is_python_entrypoint(entry)):
                fuera.append(entry.relative_to(root))
    return fuera


def resolve_bin_name(stem: str) -> str:
    """El nombre corto REAL en ``bin/`` — prefijado si choca con un builtin.

    General, no una tabla de excepciones para ``bg``: cualquier stem que
    ``BASH_BUILTINS`` liste se prefija igual, así que un choque nuevo no
    exige tocar este archivo.

    El separador es GUION, no guion bajo — medido contra el árbol, no
    elegido: ``thyrox_*`` (142 hits) es la forma de función bash INTERNA
    (``thyrox_safe_sed``, ``thyrox_toolchain_declare``, sourceada dentro de
    un script, nunca invocada suelta); ``thyrox-*`` (35 hits) es la forma de
    ENTRYPOINT — ``src/verify/thyrox-audit.sh`` es el precedente exacto:
    mismo árbol, mismo `bin/`, misma categoría que este prefijo.
    """
    return f"thyrox-{stem}" if stem in BASH_BUILTINS else stem


def needs_package_context(path: pathlib.Path) -> bool:
    """¿El módulo exige entrar como PAQUETE (``-m``) y no como guion?

    El discriminador es un ``ImportFrom`` con ``level > 0`` —``from . import x``,
    ``from .thread import y``—. CPython no le da paquete padre a un archivo
    invocado por ruta, así que el módulo muere en el import con
    ``ImportError: attempted relative import with no known parent package``.

    **El criterio es ESTRECHO a propósito, y eso está medido en las dos
    direcciones** (banco ``envoltorio-invoca-modulo-de-paquete-20260918T150856``):

    ================================================  =========  =========
    Sobre los 137 entrypoints ``.py`` del árbol       por ruta   con ``-m``
    ================================================  =========  =========
    los **2** con import relativo                     exit 1     exit 0
    los **4** que importan un hermano por nombre      exit 0     exit 1
    plano (``import clone``, ``import task_ids``)
    ================================================  =========  =========

    Por eso NO se emite ``-m`` para todos: ``-m`` sustituye el directorio del
    guion por el cwd en ``sys.path[0]``, y esos cuatro viven de que
    ``sys.path[0]`` sea su propio directorio. La forma universal arregla dos y
    rompe cuatro.

    Un archivo ilegible o con sintaxis rota devuelve ``False`` —la misma
    tolerancia que ``is_python_entrypoint``—: la clasificación no es el sitio
    donde reventar por un archivo roto.
    """
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return False
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return False
    return any(isinstance(node, ast.ImportFrom) and (node.level or 0) > 0
               for node in ast.walk(tree))


def module_dotted_name(target: pathlib.Path, root: pathlib.Path) -> str:
    """``src/transcript/cache_probe.py`` -> ``transcript.cache_probe``.

    Se deriva contra ``root/src`` y no contra ``root`` porque ``src`` es lo que
    el envoltorio pone en ``PYTHONPATH``: el nombre punteado tiene que ser
    relativo a la raíz de importación, no a la del repositorio.

    **Rehúsa** si el objetivo no cuelga de ``src/``, en vez de componer un
    nombre inventado. Sin la guarda, el envoltorio moriría con
    ``No module named`` — un fallo más lejos de su causa que el que este
    mecanismo cierra.
    """
    try:
        relative = target.relative_to(root / "src")
    except ValueError:
        raise ValueError(
            f"module_dotted_name: {target} no cuelga de {root / 'src'} — "
            f"no hay nombre de módulo que componer, y componerlo a ciegas "
            f"produciría un envoltorio que muere con 'No module named'"
        ) from None
    return ".".join(relative.with_suffix("").parts)


def wrapper_body(target: pathlib.Path, root: pathlib.Path, bin_name: str | None = None) -> str:
    """El cuerpo del guion envoltorio para UN objetivo.

    Resuelve su propia raíz contra sí mismo (``bin/..``), igual que
    ``bg.sh`` resuelve la suya — es seguro porque ``bin/`` no se symlinkea a
    otro sitio, sólo los objetivos individuales lo estaban y eso es lo que
    rompía. Después hace ``exec`` sobre la ruta ABSOLUTA real del objetivo:
    eso es lo que deja a ``BASH_SOURCE`` correcto adentro.

    ``bin_name`` es el nombre ya resuelto (ver ``resolve_bin_name``); sólo se
    usa en el mensaje de error del guardián de intérprete, por defecto
    ``target.stem`` cuando no se pasa.

    Y **declara la raíz de importación** antes del ``exec``. ``src/`` es un
    paquete de espacio de nombres (PEP 420): sus 25 subdirectorios importan
    sin ``__init__.py``, pero sólo si ``src`` está en la ruta de búsqueda.
    Medido con el intérprete que este envoltorio ejecuta (3.11.15), desde un
    directorio de trabajo ajeno: de los 165 módulos que no son ``__init__``,
    **0** importan sin ``PYTHONPATH`` y **162** con él. ``pyproject.toml:56``
    ya documentaba ``PYTHONPATH=src`` y nada lo fijaba; el hueco se venía
    tapando con ``sys.path.insert`` archivo por archivo, que es lo que hace
    que el árbol funcione hoy y lo que oculta que la raíz no está declarada.

    El vehículo es el envoltorio y no un ``.pth`` del entorno porque
    ``.venv`` no se versiona: un ``.pth`` muere en silencio con cada clon
    nuevo o cada ``uv sync``. ``bin/`` sí se versiona y se genera, así que la
    declaración alcanza a los entry points por construcción.

    Los tres módulos que siguen fallando CON la raíz no son de ruta y no se
    tapan aquí: ``backfill_agent_sessions`` rehúsa por su guard de
    DEPRECATED, ``check_manifest_language`` carga a propósito un módulo de
    otro repo (``api: scripts/check_identifier_language.py``) y debe seguir
    sin resolver en solitario, y ``drain_spool`` importa el nombre plano
    ``hook_error_log`` de antes del renombre a ``src/hooks/error_log.py``
    (defecto real, sucesor propio).
    """
    display_name = bin_name if bin_name is not None else target.stem
    relative_target = target.relative_to(root)
    if target.suffix == ".py":
        # La puerta de entrada la decide el módulo, no el generador: con import
        # relativo entra como paquete; sin él, por su ruta real (ver
        # ``needs_package_context`` para la medición de las dos direcciones).
        if needs_package_context(target):
            invocation = (f'exec "$INTERPRETER" -m '
                          f'{module_dotted_name(target, root)} "$@"\n')
        else:
            invocation = f'exec "$INTERPRETER" "$THYROX_ROOT/{relative_target}" "$@"\n'
        return (
            "#!/usr/bin/env bash\n"
            f"{GENERATED_MARKER}\n"
            'THYROX_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"\n'
            'INTERPRETER="$THYROX_ROOT/.venv/bin/python"\n'
            'if [ ! -x "$INTERPRETER" ]; then\n'
            '  echo "bin/'
            f'{display_name}: falta el entorno del proveedor en $INTERPRETER." >&2\n'
            '  echo "              Generalo con: cd \\"$THYROX_ROOT\\" && uv sync" >&2\n'
            '  exit 2\n'
            'fi\n'
            'export PYTHONPATH="$THYROX_ROOT/src${PYTHONPATH:+:$PYTHONPATH}"\n'
            + invocation
        )
    return (
        "#!/usr/bin/env bash\n"
        f"{GENERATED_MARKER}\n"
        'THYROX_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"\n'
        'export PYTHONPATH="$THYROX_ROOT/src${PYTHONPATH:+:$PYTHONPATH}"\n'
        f'exec "$THYROX_ROOT/{relative_target}" "$@"\n'
    )


def user_bin_wrapper_body(stem: str) -> str:
    """El envoltorio de SEGUNDO salto, para ``~/.local/bin``.

    A diferencia de ``wrapper_body``, éste NO puede resolver ``THYROX_ROOT``
    contra su propia ubicación — vive fuera del árbol, en un directorio que
    no tiene ni ``bin/..`` ni ``src/``. Usa env-o-literal (el mismo patrón que
    ``THYROX_ROOT="${THYROX_ROOT:-/home/user/thyrox}"`` en el resto del árbol)
    y delega al ``bin/<stem>`` que sí resuelve correcto — un salto, no dos
    copias de la lógica de intérprete/``.venv``.
    """
    return (
        "#!/usr/bin/env bash\n"
        f"{GENERATED_MARKER}\n"
        'THYROX_ROOT="${THYROX_ROOT:-/home/user/thyrox}"\n'
        f'exec "$THYROX_ROOT/bin/{stem}" "$@"\n'
    )


def path_warning(dest: pathlib.Path, path_value: str | None = None) -> str | None:
    """El aviso si ``dest`` no esta en ``PATH``, o None si si lo esta.

    Porte de ``ccnmt: install.sh:119-133`` (``check_path``), que compara con
    ``case ":$PATH:" in`` e imprime la linea exacta para el shell del usuario.
    Se porta el MECANISMO, no su texto: alli el aviso acompaña a un symlink
    unico; aqui, a N envoltorios copiados.

    Sin el, instalar en un directorio fuera de ``PATH`` publicaba «119
    escrito(s)» —cierto— y ninguno invocable suelto: un verde que no
    distingue «instalado y alcanzable» de «instalado y mudo».
    """
    entorno = os.environ.get("PATH", "") if path_value is None else path_value
    if str(dest) in entorno.split(os.pathsep):
        return None
    shell = pathlib.PurePosixPath(os.environ.get("SHELL", "bash")).name
    linea = (f"    fish_add_path {dest}" if shell == "fish"
             else f'    export PATH="{dest}:$PATH"')
    return (f"AVISO: {dest} no esta en tu PATH — los envoltorios quedan\n"
            f"  instalados pero no invocables sueltos. Anade a tu rc:\n\n"
            f"{linea}")


def install_user_bin(plan: dict[str, str],
                     dest: pathlib.Path) -> tuple[list[str], list[str], list[str]]:
    """Copia envoltorios de segundo salto a ``dest`` (``~/.local/bin`` por defecto).

    Devuelve (escritos, retirados, preservados-ajenos). La tercera lista es la
    guarda de seguridad: ``dest`` tiene archivos que este generador NO escribió
    (``black``, ``mypy``, …) y nunca los toca — sólo gestiona los que llevan su
    propio ``GENERATED_MARKER`` en la segunda línea.
    """
    dest.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    preserved_foreign: list[str] = []

    for stem in plan:
        destination = dest / stem
        body = user_bin_wrapper_body(stem)
        if destination.exists():
            lines = destination.read_text().splitlines()
            ours = len(lines) >= 2 and lines[1] == GENERATED_MARKER
            if not ours:
                preserved_foreign.append(stem)
                continue
        if not destination.exists() or destination.read_text() != body:
            destination.write_text(body)
            destination.chmod(0o755)
            written.append(stem)

    removed: list[str] = []
    if dest.is_dir():
        for existing in sorted(dest.iterdir()):
            if existing.name in plan or not existing.is_file():
                continue
            try:
                lines = existing.read_text().splitlines()
            except (OSError, UnicodeDecodeError):
                continue
            if len(lines) >= 2 and lines[1] == GENERATED_MARKER:
                existing.unlink()
                removed.append(existing.name)

    return written, removed, preserved_foreign


#: Los directorios donde un ``.ts`` con shebang ES un entrypoint. Es la
#: segunda mitad del discriminador, y no es adorno: sin ella cualquier ``.ts``
#: con shebang en cualquier sitio entraria al plan.
TS_ENTRYPOINT_DIRS: frozenset[str] = frozenset({"bin", "entry"})


def is_typescript_entrypoint(path: pathlib.Path) -> bool:
    """Shebang **y** directorio padre de entrypoint. NO ``import.meta.main``.

    El discriminador se midio contra el arbol antes de elegirlo, en las dos
    direcciones, igual que ``is_shell_entrypoint`` hizo con el bit ejecutable:

    ======================================  =============  ================
    Discriminador                           entrypoints    bibliotecas
    ======================================  =============  ================
    shebang + padre ``bin``/``entry``       14 de 14       0
    ``import.meta.main``                    7 de 14        1  (falla)
    ======================================  =============  ================

    La guarda pierde la mitad de los entrypoints **y** mete una biblioteca:
    ``cli/src/exitCodes.ts`` la lleva sin shebang — es un modulo con autotest,
    no algo que se invoque. Medir el significante que esta a mano en vez del
    que discrimina es el sub-patron C de `metrica-decide-la-conclusion.md`.
    """
    if path.suffix != ".ts" or path.parent.name not in TS_ENTRYPOINT_DIRS:
        return False
    try:
        with path.open(encoding="utf-8", errors="replace") as handle:
            return handle.readline().startswith("#!")
    except OSError:
        return False


def _kebab(name: str) -> str:
    """``preModelSwitch`` -> ``pre-model-switch``.

    El envoltorio NO hereda la caja del stem. La forma de entrypoint de este
    arbol es kebab —``thyrox-audit.sh``, ``check-cli-typecheck``— y ``bin/``
    no tiene hoy ni un solo nombre en camello; introducirlo por 2 de 14
    archivos crearia una tercera forma. Que el envoltorio pueda llamarse
    distinto que su fuente ya lo fija ``resolve_bin_name`` con ``thyrox-bg``.
    """
    out: list[str] = []
    for index, char in enumerate(name):
        if char.isupper():
            if index:
                out.append("-")
            out.append(char.lower())
        else:
            out.append(char)
    return "".join(out)


def typescript_bin_name(target: pathlib.Path, root: pathlib.Path) -> str:
    """El nombre corto CUALIFICADO por su dueño — ``skills-emit``, no ``emit``.

    Sin cualificar, la mitad TS no puede entrar al espacio plano de ``bin/``:
    el arbol tiene **cuatro** ``emit.ts`` distintos (``skills``, ``rules``,
    ``commands`` y el paquete ``agent``), y ``discover_entrypoints`` rehusa
    una colision de stem en vez de resolverla en silencio.

    Dueño y stem se COLAPSAN cuando uno contiene al otro: ``shell/bin/shell.ts``
    es ``shell`` y no ``shell-shell``; ``command-runtime/bin/command.ts`` es
    ``command-runtime``. Medido sobre el arbol al fijar la regla: 14 nombres,
    0 colisiones entre si y 0 contra los que ``bin/`` ya tenia.
    """
    relative = target.relative_to(root)
    stem = _kebab(target.stem)
    # El dueño es el segmento anterior al directorio de entrypoint. Con
    # `entry` hay un `src/` de paquete en medio (`cli/src/entry/main.ts`), asi
    # que se sube uno mas.
    partes = relative.parts
    indice = len(partes) - 2
    owner = partes[indice - 1] if partes[indice] == "bin" else partes[indice - 2]
    owner = _kebab(owner)
    if owner in stem or stem in owner:
        return owner if len(owner) >= len(stem) else stem
    return f"{owner}-{stem}"


def discover_typescript_entrypoints(root: pathlib.Path) -> dict[str, pathlib.Path]:
    """El mapa nombre-cualificado -> ruta, recorriendo ``src/`` entero.

    A diferencia de ``discover_entrypoints``, que mira UN nivel de cada
    carpeta de ``SOURCE_DIRS``, este recorre en profundidad: los entrypoints
    ``.ts`` viven dos y tres niveles adentro (``src/packages/<x>/bin/``), y
    una lista explicita de 14 rutas envejeceria con cada paquete nuevo.
    """
    found: dict[str, pathlib.Path] = {}
    src = root / "src"
    if not src.is_dir():
        return found
    for entry in sorted(src.rglob("*.ts")):
        if not entry.is_file() or not is_typescript_entrypoint(entry):
            continue
        name = typescript_bin_name(entry, root)
        if name in found:
            raise ValueError(
                f"colision de nombre TS cualificado: {name!r} lo declaran "
                f"{found[name]} y {entry} — este generador rehusa resolverla "
                f"en silencio")
        found[name] = entry
    return found


def typescript_wrapper_body(target: pathlib.Path, root: pathlib.Path,
                            bin_name: str) -> str:
    """El envoltorio de un entrypoint ``.ts``: guarda de bun, luego ``exec``.

    La guarda DELEGA en ``thyrox_toolchain_require_bun`` en vez de comprobar
    bun aqui. Son dos ejes —que bun resuelva, y que ``node_modules`` este
    materializado— y duplicarlos daria dos redacciones del mismo remedio, que
    es la segunda fuente de verdad que este arbol prohibe para una cifra y
    vale igual para una instruccion.

    Lo que emite al rehusar es el aviso de MODO DEGRADADO: nombra la
    herramienta, su precondicion, y declara que el resto de ``bin/`` sigue
    usable. Un envoltorio que muriera con `bun: command not found` deja al que
    clona sin saber ni que arreglar ni que puede seguir haciendo.

    Si la biblioteca misma no esta alcanzable, el envoltorio lo dice con OTRO
    mensaje y no reescribe el aviso: dos copias del mismo texto divergen, y un
    arbol sin ``src/lib/`` tiene un problema distinto del de un bun ausente.
    """
    relative_target = target.relative_to(root)
    return (
        "#!/usr/bin/env bash\n"
        f"{GENERATED_MARKER}\n"
        'THYROX_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"\n'
        'LIB="$THYROX_ROOT/src/lib/toolchain.sh"\n'
        'if [ ! -r "$LIB" ]; then\n'
        '  echo "bin/'
        f'{bin_name}: no alcanza $LIB — el arbol esta incompleto." >&2\n'
        '  exit 2\n'
        'fi\n'
        '# shellcheck source=/dev/null\n'
        'source "$LIB"\n'
        'thyrox_toolchain_require_bun || exit 2\n'
        f'exec "${{THYROX_TOOLCHAIN_BUN_BIN:-bun}}" "$THYROX_ROOT/{relative_target}" "$@"\n'
    )


def planned_files(root: pathlib.Path) -> dict[str, str]:
    """El plan completo: nombre corto RESUELTO -> contenido del envoltorio.

    La clave es ``resolve_bin_name(stem)``, no el stem crudo — un stem que
    choca con un builtin de bash sale prefijado con ``thyrox_``.
    """
    entrypoints = discover_entrypoints(root)
    plan: dict[str, str] = {}
    for stem, target in entrypoints.items():
        bin_name = resolve_bin_name(stem)
        if bin_name in plan:
            raise ValueError(
                f"colisión de nombre corto tras resolver builtins: "
                f"{bin_name!r} — no debería ocurrir con el árbol actual")
        plan[bin_name] = wrapper_body(target, root, bin_name)

    # La mitad TypeScript. Va DESPUES y con su propia comprobacion de colision
    # contra lo ya planificado: sus nombres estan cualificados por dueño, asi
    # que no deberian chocar — medido, 0 colisiones contra los 184 que bin/
    # tenia—, pero un choque futuro se rehusa en vez de sobrescribir en
    # silencio al envoltorio .sh o .py que ya estaba.
    for bin_name, target in discover_typescript_entrypoints(root).items():
        if bin_name in plan:
            raise ValueError(
                f"colision entre la mitad TS y la mitad sh/py: {bin_name!r} "
                f"lo declaran {target} y un entrypoint ya planificado")
        plan[bin_name] = typescript_wrapper_body(target, root, bin_name)
    return plan


#: El programa que ejercita UN entrypoint: lo importa por la misma puerta que
#: su envoltorio y nada más. ``runpy.run_path`` fija ``__name__`` a
#: ``'<run_path>'`` e ``import_module`` a su nombre punteado: en los dos casos
#: la guarda de ``__main__`` NO dispara, así que corre el nivel de módulo
#: (imports, defs) y **no** ``main()``. Ejercitar con ``--help`` habría
#: ejecutado el trabajo de cualquier entrypoint que no use ``argparse``.
EXERCISE_PROGRAM = """
import importlib, os, runpy, sys
forma, objetivo = sys.argv[1], sys.argv[2]
try:
    if forma == 'module':
        importlib.import_module(objetivo)
    else:
        sys.path.insert(0, os.path.dirname(os.path.abspath(objetivo)))
        sys.argv = [objetivo]
        runpy.run_path(objetivo)
except ImportError as exc:
    print(f'{type(exc).__name__}: {exc}', file=sys.stderr)
    raise SystemExit(3)
except BaseException:
    # Cargó y luego decidió rehusar: política del módulo, no del envoltorio.
    raise SystemExit(0)
raise SystemExit(0)
"""


def exercise_entrypoints(root: pathlib.Path,
                         interpreter: str | None = None
                         ) -> list[tuple[str, str]]:
    """Carga cada entrypoint ``.py`` por la puerta que su envoltorio usa.

    ``--check`` compara ``bin/`` contra el PLAN, así que un plan equivocado
    coincide consigo mismo y publica verde: es **estructuralmente** ciego a
    «el envoltorio no funciona». Fue lo que pasó — ``bin/cache_probe`` y
    ``bin/manifest`` morían con ``ImportError`` mientras ``--check`` decía
    «al día: 171 entrypoint(s)». Sub-patrón D con ``--check`` de instrumento.

    **El discriminador es la CLASE de la excepción, no una lista de
    excepciones.** Un ``ImportError`` dice que el módulo no llegó a cargar: eso
    es cableado, y es lo que este eje mide. Cualquier otra cosa dice que cargó
    y luego rehusó por su propia política —la guarda ``DEPRECATED`` de
    ``backfill_agent_sessions``, el rehúso de ``check_rst_referencias`` al
    medir un consumidor desde el proveedor— y no se reporta. Sin esa
    distinción haría falta un baseline de excepciones por nombre, que envejece;
    con ella el criterio se deriva del fenómeno.

    Coste medido sobre los 137 entrypoints ``.py`` de este árbol: **5.1 s** en
    serie. Por eso es opt-in (``--exercise``) y no parte de ``--check``, que un
    gate corre en cada sesión.

    Devuelve los pares ``(nombre_corto, primera_linea_del_error)``; lista vacía
    es el estado sano.
    """
    # El envoltorio ejecuta SIEMPRE `$THYROX_ROOT/.venv/bin/python`, así que
    # ejercitar con `sys.executable` mediría otra puerta. Medido al cerrarlo:
    # hoy los dos intérpretes dan 137/137, así que la divergencia es LATENTE y
    # no viva — pero un módulo que importe una dependencia del entorno del
    # proveedor al nivel de módulo caería como `ImportError` bajo el intérprete
    # del sistema, y el discriminador lo leería como cableado. `sys.executable`
    # queda de respaldo para un árbol sin `.venv` generado.
    if interpreter is None:
        del_proveedor = root / ".venv" / "bin" / "python"
        interpreter = str(del_proveedor) if del_proveedor.is_file() else sys.executable
    fallos: list[tuple[str, str]] = []
    entorno = dict(os.environ)
    entorno["PYTHONPATH"] = os.pathsep.join(
        [str(root / "src")] + ([entorno["PYTHONPATH"]] if entorno.get("PYTHONPATH") else []))
    for stem, target in sorted(discover_entrypoints(root).items()):
        if target.suffix != ".py":
            continue
        if needs_package_context(target):
            forma, objetivo = "module", module_dotted_name(target, root)
        else:
            forma, objetivo = "path", str(target)
        hecho = subprocess.run([interpreter, "-c", EXERCISE_PROGRAM, forma, objetivo],
                               capture_output=True, text=True, timeout=120,
                               env=entorno, cwd=str(root))
        if hecho.returncode != 0:
            razon = (hecho.stderr.strip().splitlines() or ["sin salida"])[-1]
            fallos.append((resolve_bin_name(stem), razon[:160]))
    return fallos


def apply_plan(root: pathlib.Path, plan: dict[str, str]) -> tuple[list[str], list[str]]:
    """Escribe el plan en ``bin/``. Devuelve (escritos, retirados)."""
    bin_dir = root / "bin"
    bin_dir.mkdir(exist_ok=True)

    written: list[str] = []
    for stem, body in plan.items():
        destination = bin_dir / stem
        if not destination.exists() or destination.read_text() != body:
            destination.write_text(body)
            destination.chmod(0o755)
            written.append(stem)

    removed: list[str] = []
    for existing in sorted(bin_dir.iterdir()):
        if existing.name not in plan:
            existing.unlink()
            removed.append(existing.name)

    return written, removed


def current_state(root: pathlib.Path) -> dict[str, str]:
    """Lo que ``bin/`` tiene HOY, para comparar contra el plan en ``--check``."""
    bin_dir = root / "bin"
    if not bin_dir.is_dir():
        return {}
    return {entry.name: entry.read_text()
            for entry in bin_dir.iterdir() if entry.is_file()}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true",
                        help="no escribe; sale 1 si bin/ difiere del plan")
    parser.add_argument("--dry-run", action="store_true",
                        help="imprime el plan sin escribir")
    parser.add_argument("--exercise", action="store_true",
                        help="carga cada entrypoint .py por la puerta de su "
                             "envoltorio y sale 1 si alguno no llega a cargar; "
                             "ve lo que --check no puede ver (~5 s)")
    parser.add_argument("--install-user-bin", nargs="?", const=str(DEFAULT_USER_BIN_DIR),
                        metavar="DIR", default=None,
                        help="además, copia envoltorios de segundo salto a DIR "
                             f"(default {DEFAULT_USER_BIN_DIR}) — el directorio "
                             "que SÍ está en PATH en cada llamada de este harness")
    args = parser.parse_args(argv)

    root = repository_root()
    plan = planned_files(root)
    # Red de seguridad, no aviso esperado: resolve_bin_name() ya prefija todo
    # stem que choque con un builtin, así que esto debería salir SIEMPRE
    # vacío. Si no lo está, algo en la resolución se rompió.
    shadowed = sorted(set(plan) & BASH_BUILTINS)
    if shadowed:
        print(f"bin/: BUG — {len(shadowed)} nombre(s) resueltos siguen "
              f"chocando con builtins de bash ({', '.join(shadowed)}) pese "
              "a resolve_bin_name(); revisar generate_bin.py.",
              file=sys.stderr)

    if args.exercise:
        fallos = exercise_entrypoints(root)
        total = sum(1 for objetivo in discover_entrypoints(root).values()
                    if objetivo.suffix == ".py")
        if fallos:
            print(f"bin/: {len(fallos)} de {total} entrypoint(s) .py NO cargan "
                  f"por la puerta de su envoltorio:", file=sys.stderr)
            for nombre, razon in fallos:
                print(f"  bin/{nombre}: {razon}", file=sys.stderr)
            return 1
        print(f"bin/ ejercitado: {total} entrypoint(s) .py cargan")
        if not args.check:
            return 0

    if args.check:
        live = current_state(root)
        if live == plan:
            print(f"bin/ al día: {len(plan)} entrypoint(s)")
            return 0
        missing = sorted(set(plan) - set(live))
        stale = sorted(set(live) - set(plan))
        diverged = sorted(k for k in plan.keys() & live.keys() if plan[k] != live[k])
        print("bin/ DESACTUALIZADO respecto a src/session, src/verify, "
              "src/agents:", file=sys.stderr)
        if missing:
            print(f"  faltan: {', '.join(missing)}", file=sys.stderr)
        if stale:
            print(f"  sobran: {', '.join(stale)}", file=sys.stderr)
        if diverged:
            print(f"  contenido distinto: {', '.join(diverged)}", file=sys.stderr)
        print("  corre: python3 src/session/generate_bin.py", file=sys.stderr)
        return 1

    if args.dry_run:
        for stem in sorted(plan):
            print(stem)
        print(f"\n{len(plan)} entrypoint(s) — dry-run, nada escrito")
        return 0

    written, removed = apply_plan(root, plan)
    print(f"bin/: {len(plan)} entrypoint(s) totales, "
          f"{len(written)} escrito(s)/actualizado(s), {len(removed)} retirado(s)")

    if args.install_user_bin is not None:
        dest = pathlib.Path(args.install_user_bin).expanduser()
        ub_written, ub_removed, ub_foreign = install_user_bin(plan, dest)
        print(f"{dest}: {len(ub_written)} escrito(s)/actualizado(s), "
              f"{len(ub_removed)} retirado(s), {len(ub_foreign)} ajeno(s) preservado(s)")
        aviso = path_warning(dest)
        if aviso:
            print(aviso, file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
