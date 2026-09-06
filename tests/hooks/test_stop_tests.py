"""Pruebas de ``hooks.stop_tests`` — el hook Stop que corre la suite del repo.

Porta la conducta de ``kaupamex-docs: .claude/hooks/stop-tests-scripts.sh``
(57 líneas de bash). Lo que viaja es el mecanismo; lo que se inyecta son sus
tres parámetros: la raíz del repo, el directorio vigilado y el runner.

El eje que el hook adopta de la referencia —y que estas pruebas fijan— es que
**informa y no bloquea**. Su esquema de hook declara ``async`` para eso: el
binario no acelera un gate lento, lo vuelve no-bloqueante. Un hook Stop que
bloqueara por una prueba roja convertiría un aviso en una pared.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import stop_tests  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True,
                   capture_output=True, text=True)


def make_repo(tmp: Path) -> Path:
    """Un repo real, no un doble: el hook decide mirando `git status`/`git diff`."""
    repo = tmp / "repo"
    (repo / "scripts").mkdir(parents=True)
    (repo / "scripts" / "algo.sh").write_text("#!/bin/sh\ntrue\n")
    git(repo.parent, "init", "-q", str(repo))
    git(repo, "config", "user.email", "t@t")
    git(repo, "config", "user.name", "t")
    git(repo, "add", "-A")
    git(repo, "commit", "-q", "-m", "seed")
    return repo


def write_runner(repo: Path, exit_code: int, output: str) -> Path:
    runner = repo / "scripts" / "run-all.sh"
    runner.write_text(f"#!/bin/sh\nprintf '%s\\n' '{output}'\nexit {exit_code}\n")
    runner.chmod(0o755)
    return runner


def run(repo: Path, runner: Path, payload: str = "{}") -> tuple[int, str]:
    """Invoca el hook como lo invoca el cliente: por stdin, y lee su salida."""
    return stop_tests.run(
        payload=payload,
        repo_root=repo,
        watched_dir=repo / "scripts",
        runner=runner,
    )


print("== 1. reentrada: stop_hook_active corta antes de medir nada ==")
with tempfile.TemporaryDirectory() as d:
    tmp = Path(d)
    repo = make_repo(tmp)
    runner = write_runner(repo, 1, "NO DEBERIA CORRER")
    (repo / "scripts" / "nuevo.sh").write_text("x")   # sí hay trabajo que probar
    code, out = run(repo, runner, '{"stop_hook_active": true}')
    check("sale 0", 0, code)
    check("y NO corrió el runner (su salida no aparece)", False, "NO DEBERIA CORRER" in out)

print("== 2. el turno NO tocó el directorio vigilado: no se corre nada ==")
with tempfile.TemporaryDirectory() as d:
    tmp = Path(d)
    repo = make_repo(tmp)
    runner = write_runner(repo, 1, "NO DEBERIA CORRER")
    git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "runner")
    # El commit de arriba tocó scripts/, así que se añade uno posterior que no.
    (repo / "otro.txt").write_text("fuera del directorio vigilado")
    git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "ajeno")
    code, out = run(repo, runner)
    check("sale 0", 0, code)
    check("no corrió el runner", False, "NO DEBERIA CORRER" in out)
    check("y no imprime nada", "", out.strip())

print("== 3. CONTROL que discrimina: con trabajo SUCIO sí corre ==")
# Sin este caso, un hook que NUNCA corriera pasaría los casos 1 y 2 igual: el
# verde no distinguiría «decide bien» de «no hace nada». Sub-patrón D.
with tempfile.TemporaryDirectory() as d:
    tmp = Path(d)
    repo = make_repo(tmp)
    runner = write_runner(repo, 0, "12 de 12 en verde")
    (repo / "scripts" / "nuevo.sh").write_text("x")   # sin commitear
    code, out = run(repo, runner)
    check("sale 0", 0, code)
    check("corrió el runner y publica su última línea", True, "12 de 12 en verde" in out)

print("== 4. el trabajo recién COMMITEADO también cuenta ==")
with tempfile.TemporaryDirectory() as d:
    tmp = Path(d)
    repo = make_repo(tmp)
    runner = write_runner(repo, 0, "verde tras commit")
    (repo / "scripts" / "nuevo.sh").write_text("x")
    git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "toca scripts")
    code, out = run(repo, runner)
    check("el árbol está limpio", "", subprocess.run(
        ["git", "-C", str(repo), "status", "--porcelain"],
        capture_output=True, text=True).stdout.strip())
    check("y aun así corrió, por el último commit", True, "verde tras commit" in out)

print("== 5. runner EN ROJO: informa y NO bloquea ==")
with tempfile.TemporaryDirectory() as d:
    tmp = Path(d)
    repo = make_repo(tmp)
    runner = write_runner(repo, 3, "3 de 12 en rojo")
    (repo / "scripts" / "nuevo.sh").write_text("x")
    code, out = run(repo, runner)
    check("SALE 0 pese al rojo — informa, no bloquea", 0, code)
    check("nombra el código de salida real del runner", True, "3" in out)
    check("y trae la salida del runner", True, "3 de 12 en rojo" in out)

print("== 6. runner ausente: no se inventa un verde ==")
with tempfile.TemporaryDirectory() as d:
    tmp = Path(d)
    repo = make_repo(tmp)
    (repo / "scripts" / "nuevo.sh").write_text("x")
    code, out = run(repo, runner=repo / "scripts" / "no-existe.sh")
    check("sale 0", 0, code)
    check("y no afirma que las pruebas pasaron", False, "verde" in out.lower())

print("== 7. CONTROL: sin parámetro de directorio, rehúsa — no mide otra cosa ==")
# Un hook que cayera a un default se pondría a vigilar el árbol equivocado y
# publicaría un verde ajeno. Rehusar es la conducta; el default sería el fallo.
with tempfile.TemporaryDirectory() as d:
    tmp = Path(d)
    repo = make_repo(tmp)
    try:
        stop_tests.run(payload="{}", repo_root=repo, watched_dir=None,
                       runner=repo / "scripts" / "run-all.sh")
        check("rehúsa sin directorio vigilado", "WatchedDirError", "no lanzó")
    except stop_tests.WatchedDirError as err:
        check("rehúsa sin directorio vigilado", "WatchedDirError",
              type(err).__name__)
        check("y el mensaje nombra la variable ausente", True,
              stop_tests.WATCHED_DIR_VARS[0] in str(err))

print("== N. CONTROL: el módulo ARRANCA como guion, que es como lo invoca el stub ==")
# La suite lo importaba siempre, así que nada medía la vía por la que el
# consumidor lo usa de verdad (`python3 <ruta>`). Al extraer `is_reentry` a
# `stop_payload` el guion dejó de arrancar —`ModuleNotFoundError: hooks`— y
# los 16 casos siguieron en verde: el verde no discriminaba «funciona» de
# «la suite no pregunta». Sub-patrón D de `metrica-decide-la-conclusion.md`.
# El entorno se LIMPIA de las variables del corredor: este control mide que el
# módulo arranca como guion, no que corra una suite. Heredarlas lo convertía en
# el eslabón que cerraba el ciclo de recursión (ver el caso O).
_limpio = {k: v for k, v in os.environ.items()
           if k not in (*stop_tests.WATCHED_DIR_VARS, *stop_tests.RUNNER_VARS)}
proc = subprocess.run([sys.executable, str(Path(stop_tests.__file__).resolve())],
                      input="{}", capture_output=True, text=True, env=_limpio)
check("sale 0", 0, proc.returncode)
check("y NO muere importando su propio paquete", False,
      "ModuleNotFoundError" in proc.stderr)

print("== O. El hook NO se invoca a sí mismo: guard de recursión POR PROCESO ==")
# Episodio medido 2026-09-06: 125 procesos vivos, 63 corredores, 56 minutos y
# aún engendrando. La cadena, PROVEN por `ps -eo pid,ppid`:
#
#   stop_tests.py -> tests/run.sh -> test_stop_tests.py -> stop_tests.py -> ...
#
# `is_reentry(payload)` NO lo cubre: mide la reentrada que el HARNESS declara
# (`stop_hook_active`), y aquí el segundo proceso no viene del harness sino de
# la propia suite, con payload `{}` limpio. El guard tiene que vivir en el
# MECANISMO —no en el consumidor ni en el test— porque cualquier corredor que
# ejercite este módulo reabre el ciclo.
with tempfile.TemporaryDirectory() as tmpdir:
    tmp = Path(tmpdir)
    repo = make_repo(tmp)
    (repo / "scripts" / "tocado.sh").write_text("#!/bin/sh\ntrue\n", encoding="utf-8")
    runner = write_runner(repo, 0, "corri")

    previo = os.environ.get(stop_tests.RECURSION_VAR)
    os.environ[stop_tests.RECURSION_VAR] = "1"
    try:
        codigo, salida = stop_tests.run("{}", repo_root=repo,
                                        watched_dir=repo / "scripts", runner=runner)
        check("con el marcador puesto rehúsa: sale 0", 0, codigo)
        check("y NO corre el corredor (salida vacía)", "", salida)
    finally:
        if previo is None:
            os.environ.pop(stop_tests.RECURSION_VAR, None)
        else:
            os.environ[stop_tests.RECURSION_VAR] = previo

    # CONTROL DE ANULACIÓN: sin el marcador, el mismo caso SÍ corre. Si no
    # cambiara, el verde de arriba no mediría el guard sino otra cosa.
    os.environ.pop(stop_tests.RECURSION_VAR, None)
    codigo, salida = stop_tests.run("{}", repo_root=repo,
                                    watched_dir=repo / "scripts", runner=runner)
    check("sin el marcador SÍ corre (control de anulación)", True, "corri" in salida)

    # Y el marcador viaja al hijo: el corredor lo ve en su entorno.
    delator = repo / "scripts" / "delata-env.sh"
    delator.write_text('#!/usr/bin/env bash\necho "MARCADOR=${'
                       + stop_tests.RECURSION_VAR + ':-ausente}"\n', encoding="utf-8")
    delator.chmod(0o755)
    _, salida = stop_tests.run("{}", repo_root=repo,
                               watched_dir=repo / "scripts", runner=delator)
    check("y el marcador viaja al corredor hijo", True, "MARCADOR=1" in salida)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
