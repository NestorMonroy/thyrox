"""Hook Stop que corre la suite del repo si el turno la tocó — sin bloquear.

Adaptación de ``kaupamex-docs: .claude/hooks/stop-tests-scripts.sh`` (57 líneas
de bash). Lo que viaja es el mecanismo: decidir si toca correr, correr, y
publicar el resultado. Lo que se inyecta son sus tres parámetros — la raíz del
repo, el directorio vigilado y el runner— porque son propiedad del consumidor y
no del mecanismo (DEC-04).

Por qué informa y no bloquea
-----------------------------

La forma la fija el binario de claude-code, cuyo esquema de hook declara

    async: "If true, hook runs in background without blocking"

junto a ``timeout`` y ``statusMessage``. Es decir: no resuelve un gate lento
acelerándolo — lo vuelve no-bloqueante y le declara su plazo. Un ``pre-push`` no
tiene ese eje: bloquea por construcción. Bloquear el cierre del turno por una
prueba roja convertiría un aviso en una pared, que es el eje contrario.

Por qué rehúsa en vez de caer a un default
-------------------------------------------

Sin directorio vigilado el hook no se degrada a «vigilo la raíz»: se pondría a
medir el árbol equivocado y publicaría un verde ajeno. Un verde que no
discrimina es peor que un rojo — sub-patrón D de
``metrica-decide-la-conclusion.md``. Rehusar nombrando la variable ausente es la
conducta; el default sería el fallo.
"""
from __future__ import annotations

import json
import sys
import os
import subprocess
from pathlib import Path

#: Grafías admitidas del directorio vigilado, en orden: la propia primero, la
#: heredada después. Misma forma que ``TREE_ROOT_VARS`` en ``paths.reach``.
WATCHED_DIR_VARS: tuple[str, ...] = ("THYROX_WATCHED_DIR", "KAUPAMEX_WATCHED_DIR")

#: Ídem para el runner de la suite.
RUNNER_VARS: tuple[str, ...] = ("THYROX_TEST_RUNNER", "KAUPAMEX_TEST_RUNNER")


class WatchedDirError(RuntimeError):
    """El directorio vigilado no se declaró y no se deriva de nada."""


def _from_env(names: tuple[str, ...]) -> str | None:
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
    return None


def is_reentry(payload: str) -> bool:
    """¿El cliente ya está reentrando en el hook Stop?

    Se lee del JSON, no por subcadena: ``"stop_hook_active": true`` puede venir
    con cualquier espaciado, y un ``grep`` acertaría también dentro de una
    cadena ajena. El bash original usaba el patrón laxo por no tener parser a
    mano; aquí sí lo hay.
    """
    try:
        data = json.loads(payload or "{}")
    except (ValueError, TypeError):
        return False
    return bool(isinstance(data, dict) and data.get("stop_hook_active"))


def touched(repo_root: Path, watched_dir: Path) -> bool:
    """¿El turno tocó el directorio vigilado?

    Se mira el árbol de trabajo **y** el último commit: el trabajo puede estar
    sin commitear o recién commiteado, y las dos formas cuentan.
    """
    relative = os.path.relpath(watched_dir, repo_root)
    for args in (["status", "--porcelain", "--untracked-files=all", "--", relative],
                 ["diff", "--name-only", "HEAD~1..HEAD", "--", relative]):
        done = subprocess.run(["git", "-C", str(repo_root), *args],
                              capture_output=True, text=True)
        if done.returncode == 0 and done.stdout.strip():
            return True
    return False


def resolve_watched_dir(watched_dir: Path | str | None) -> Path:
    if watched_dir:
        return Path(watched_dir)
    declared = _from_env(WATCHED_DIR_VARS)
    if declared:
        return Path(declared)
    raise WatchedDirError(
        f"el directorio vigilado no está declarado: fija {WATCHED_DIR_VARS[0]} "
        f"(o {WATCHED_DIR_VARS[1]}) o pásalo como argumento.\n"
        "  NO se cae a un default: vigilar la raíz publicaría un verde ajeno, "
        "y un verde que no discrimina es peor que un rojo."
    )


def resolve_repo_root(repo_root: Path | str | None, watched_dir: Path) -> Path:
    """La raíz del repo, declarada o preguntada a git.

    NO se supone que sea el padre del directorio vigilado: `.claude/scripts`
    tiene por padre `.claude`, y un `git ... -- scripts` desde ahí mediría una
    ruta que no existe. Preguntarle a git es barato y no puede equivocarse de
    nivel; el fallback sólo actúa si el directorio no está en un repo.
    """
    if repo_root:
        return Path(repo_root)
    done = subprocess.run(["git", "-C", str(watched_dir), "rev-parse", "--show-toplevel"],
                          capture_output=True, text=True)
    if done.returncode == 0 and done.stdout.strip():
        return Path(done.stdout.strip())
    return watched_dir.parent


def resolve_runner(runner: Path | str | None, watched_dir: Path) -> Path:
    if runner:
        return Path(runner)
    declared = _from_env(RUNNER_VARS)
    if declared:
        return Path(declared)
    return watched_dir / "tests" / "run-all.sh"


def run(payload: str = "{}", repo_root: Path | str | None = None,
        watched_dir: Path | str | None = None,
        runner: Path | str | None = None) -> tuple[int, str]:
    """Decide, corre y compone la salida. NUNCA devuelve un código distinto de 0.

    Devuelve ``(codigo, salida)`` en vez de imprimir para que el consumidor
    decida el canal — y para que una prueba pueda leerlo sin redirigir.
    """
    if is_reentry(payload):
        return 0, ""

    watched = resolve_watched_dir(watched_dir)
    root = resolve_repo_root(repo_root, watched)

    if not touched(root, watched):
        return 0, ""

    script = resolve_runner(runner, watched)
    if not script.is_file():
        return 0, ""

    done = subprocess.run(["bash", str(script), "--quiet"],
                          capture_output=True, text=True, cwd=str(root))
    output = (done.stdout + done.stderr).rstrip("\n")

    if done.returncode == 0:
        last = output.splitlines()[-1] if output else ""
        return 0, f"Pruebas de {watched.name}: {last}\n"
    return 0, (f"Pruebas de {watched.name} EN ROJO (exit {done.returncode}):\n"
               f"{output}\n")


def main(argv: list[str] | None = None) -> int:
    """Punto de entrada del hook: lee el payload por stdin, imprime, sale 0."""
    payload = ""
    try:
        payload = sys.stdin.read()
    except (OSError, ValueError):
        pass
    try:
        code, output = run(payload=payload)
    except WatchedDirError as err:
        print(f"stop_tests: {err}", file=sys.stderr)
        return 0
    if output:
        sys.stdout.write(output)
    return code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
