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
entrypoints reales, entre ellos ``check_rst_sintaxis.py``). Los que NO la
llevan (13: ``__init__.py`` × 3, ``job_ledger.py``, ``job_runs.py``,
``task_pool.py``, ``class_header.py``, ``counterpart_body.py``, ``reader.py``,
``registry.py``, ``symbol_home.py``, ``symbol_presence.py``,
``agents_paths.py``) son biblioteca — confirmado: ``reader.py --help`` corre a
exit 0 sin imprimir nada, ninguna superficie de CLI que nombrar.

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
import pathlib
import re
import sys

#: Las tres carpetas que este generador cubre. Ampliarla es una decisión
#: nueva, no un descuido — cada carpeta añadida necesita su propia medición
#: de colisiones de nombre corto.
SOURCE_DIRS: tuple[str, ...] = ("src/session", "src/verify", "src/agents")

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
    """La raíz de thyrox: dos niveles arriba de este archivo (``src/session/``)."""
    return pathlib.Path(__file__).resolve().parents[2]


def is_shell_entrypoint(path: pathlib.Path) -> bool:
    """Todo ``.sh`` de las tres carpetas, medido: ninguno es de biblioteca."""
    return path.suffix == ".sh"


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
    """
    display_name = bin_name if bin_name is not None else target.stem
    relative_target = target.relative_to(root)
    if target.suffix == ".py":
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
            f'exec "$INTERPRETER" "$THYROX_ROOT/{relative_target}" "$@"\n'
        )
    return (
        "#!/usr/bin/env bash\n"
        f"{GENERATED_MARKER}\n"
        'THYROX_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"\n'
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
    return plan


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

    return 0


if __name__ == "__main__":
    sys.exit(main())
