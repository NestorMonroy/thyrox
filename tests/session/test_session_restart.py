#!/usr/bin/env python3
"""Suite de `session_restart` — preparar el relevo de sesion sin adivinar.

Origen: el ejecutor pregunto si hay mecanismo para reiniciar sesion con un
script. Yo dije que no podia existir. Me equivoque en el alcance: lo que no
puede hacerse es que una sesion RECARGUE su propia configuracion —el cliente
la lee al arrancar—, pero si puede prepararse el relevo: una sesion nueva en
el mismo entorno, sobre el mismo repo y rama, que si la lee al arrancar.

Por que hace falta un guion y no basta con escribirlo a mano
-------------------------------------------------------------
Los parametros del relevo estan repartidos y uno de ellos NO vive en ninguna
configuracion: el `environment_id` solo aparece dentro del transcript —medido,
tres veces en el de esta sesion—. Componerlo a mano significa leerlo a ojo de
un `.jsonl` de cientos de megabytes cada vez, y equivocarse ahi crea la sesion
en otro entorno sin que nada avise.

Que el relevo este JUSTIFICADO, y no sea un reflejo
----------------------------------------------------
Reiniciar cuesta: se pierde el contexto de la sesion viva. Asi que el guion
mide primero si hace falta — si los hooks del arbol estan disparando, no hace
falta— y lo dice. Un mecanismo que reinicie sin mirar es un grifo.

Lo que mide cada bloque:

1. Deriva el entorno del transcript.
2. Deriva repo y rama del arbol.
3. REHUSA cuando falta cualquier pieza; no compone un relevo a medias.
4. El veredicto de necesidad sale de los hooks que DISPARARON, no del settings.
5. La carga util lleva lo que `create_session` necesita.
6. ANULACION — con hooks disparando, el veredicto cambia.
"""

from __future__ import annotations

import json
import pathlib
import sys
import subprocess
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from session import session_restart as sr  # noqa: E402

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


def transcript_with(lines) -> pathlib.Path:
    path = pathlib.Path(tempfile.mkdtemp()) / "s.jsonl"
    path.write_text("\n".join(json.dumps(x) for x in lines), encoding="utf-8")
    return path


print("=== 1. deriva el entorno del transcript ===")
t = transcript_with([{"x": "ruido"},
                     {"y": "environment_id: env_015bkEjtAHzZXJfrkj66aVCG"},
                     {"z": "env_015bkEjtAHzZXJfrkj66aVCG otra vez"}])
check("lo halla", "env_015bkEjtAHzZXJfrkj66aVCG", sr.environment_of(t))
check("sin ninguno, None", None, sr.environment_of(transcript_with([{"a": 1}])))

print("=== 2. deriva repo y rama del arbol ===")
# Un repo SINTETICO con remoto y rama declarados. La version anterior leia un
# clon de otra sesion (`/home/user/eane-emprendimiento`): su verde dependia de
# que el contenedor lo tuviera, y aqui no esta — media el contenedor.
lab = pathlib.Path(tempfile.mkdtemp())
subprocess.run(["git", "init", "-q", "-b", "rama-de-prueba", str(lab)], check=True)
subprocess.run(["git", "-C", str(lab), "remote", "add", "origin",
                "https://github.com/Owner/Repo-De-Prueba.git"], check=True)
subprocess.run(["git", "-C", str(lab), "-c", "user.name=t", "-c", "user.email=t@t",
                "commit", "-q", "--allow-empty", "-m", "seed"], check=True)
repo = sr.repository_of(lab)
check("el repo sale del remoto", True,
      repo is not None and "Owner/Repo-De-Prueba" in repo)
branch = sr.branch_of(lab)
check("y la rama del HEAD", "rama-de-prueba", branch)
check("un directorio sin repo da None", None,
      sr.repository_of(pathlib.Path(tempfile.mkdtemp())))

print("=== 3. REHUSA cuando falta una pieza ===")
try:
    sr.build_payload(environment=None, repository="u", branch="b", title="t",
                     prompt="p")
    check("sin entorno -> rehusa", True, False)
except sr.RestartError as exc:
    check("sin entorno -> rehusa", True, True)
    check("y NOMBRA la pieza que falta", True, "entorno" in str(exc).lower())
try:
    sr.build_payload(environment="env_x", repository=None, branch="b",
                     title="t", prompt="p")
    check("sin repo -> rehusa", True, False)
except sr.RestartError:
    check("sin repo -> rehusa", True, True)

print("=== 4. la necesidad sale de los hooks que DISPARARON ===")
# La forma REAL del transcript, la que `measure_hook_firing` parsea: la
# entrada lleva `subtype: stop_hook_summary` y los comandos viven en
# `hookInfos[].command`. Una fixture con forma inventada mide el parser de la
# fixture, no el del arbol.
without_fire = transcript_with([
    {"subtype": "stop_hook_summary",
     "hookInfos": [{"command": "~/.claude/stop-hook-git-check.sh"}]},
    {"subtype": "stop_hook_summary",
     "hookInfos": [{"command": "~/.claude/stop-hook-git-check.sh"}]}])
verdict = sr.restart_needed(without_fire, expected=("stop-gate-",))
check("ningun gate del arbol disparo -> hace falta", True, verdict["needed"])
check("y lo dice con el conteo", 0, verdict["matched"])

print("=== 5. la carga util lleva lo que create_session necesita ===")
payload = sr.build_payload(environment="env_x", repository="https://u/r",
                           branch="feature/x", title="Relevo", prompt="sigue")
for key in ("environment_id", "source_url", "source_revision", "title",
              "prompt"):
    check(f"lleva {key}", True, key in payload)
check("la rama viaja como source_revision", "feature/x",
      payload["source_revision"])

print("=== 6. ANULACION — con hooks disparando, el veredicto cambia ===")
firing = transcript_with([
    {"subtype": "stop_hook_summary",
     "hookInfos": [{"command": "bash /x/.claude/hooks/stop-gate-stale-board.sh"}]}])
other = sr.restart_needed(firing, expected=("stop-gate-",))
check("ya no hace falta", False, other["needed"])
check("y los veredictos difieren", True, other["needed"] != verdict["needed"])

print("=== 7. dos transcripts con el MISMO id: elige por evidencia ===")
# Medido el 2026-09-23: el id de esta sesion aparece en DOS directorios de
# proyecto, y tomar el primero del glob daba el vacio. Elegir por orden de
# listado es adivinar cuando hay una medicion a mano.
import time  # noqa: E402
root = pathlib.Path(tempfile.mkdtemp())
old = root / "proyecto-a"
new_dir = root / "proyecto-b"
for d in (old, new_dir):
    d.mkdir(parents=True)
(old / "sesion.jsonl").write_text("", encoding="utf-8")
time.sleep(0.02)
# La clave, no la forma suelta: `environment_of` dejo de aceptar un `env_`
# a secas el 2026-09-23, porque 9 de las 19 lineas que lo llevan en el
# transcript vivo son texto que la sesion escribio.
(new_dir / "sesion.jsonl").write_text(
    json.dumps({"environment_id": "env_0123456789abcdef"}) + "\n",
    encoding="utf-8")
chosen = sr.transcript_for("sesion", home=root)
check("elige el que tiene contenido", str(new_dir / "sesion.jsonl"),
      str(chosen))
check("y de ahi si sale el entorno", "env_0123456789abcdef",
      sr.environment_of(chosen))

print("=== 7b. sin ninguno, None y no una ruta inventada ===")
check("no compone una ruta", None,
      sr.transcript_for("no-existe", home=root))

print("=== 7c. ANULACION — tomar el primero daria el vacio ===")
first = sorted((root).glob("*/sesion.jsonl"))[0]
check("el primero por orden es el vacio", 0, first.stat().st_size)
check("y el elegido NO es ese", True, str(chosen) != str(first))

print("=== 8. la mencion en un COMANDO MIO no es un disparo ===")
# El falso verde medido el 2026-09-23: mi primera version grepeaba dos cadenas
# en la misma linea, y esas lineas llevaban `stop-gate-` porque YO habia
# escrito esos comandos en el turno, no porque hubieran disparado. El
# veredicto salio «no hace falta relevar» sobre una sesion donde ningun gate
# habia disparado en 138 turnos.
only_mention = transcript_with([
    {"subtype": "stop_hook_summary",
     "hookInfos": [{"command": "~/.claude/stop-hook-git-check.sh"}],
     "cwd": "corri bash .claude/hooks/stop-gate-stale-board.sh a mano"},
])
v = sr.restart_needed(only_mention, expected=("stop-gate-",))
check("mencionarlo en la linea NO cuenta como disparo", True, v["needed"])
check("y el conteo de coincidencias es 0", 0, v["matched"])

print("=== 8b. y el disparo de verdad SI cuenta ===")
firing_real = transcript_with([
    {"subtype": "stop_hook_summary",
     "hookInfos": [{"command": "bash /x/.claude/hooks/stop-gate-stale-board.sh"}]},
])
v2 = sr.restart_needed(firing_real, expected=("stop-gate-",))
check("cuenta el comando, no la linea", False, v2["needed"])
check("y lo cuenta una vez", 1, v2["matched"])

print("=== 8c. ANULACION — los dos casos NO dan lo mismo ===")
# ---------------------------------------------------------------------------
# El entorno se lee de la CLAVE, no de la forma suelta
#
# Medido sobre el transcript vivo el 2026-09-23: 19 lineas nombran un `env_`, y
# **9 de ellas son texto que la sesion escribio** —1 del usuario y 8 del
# asistente—. Solo 10 salen de un `tool_result`, que es evidencia que el
# arnes produjo. Que el primer acierto fuera hoy uno de esos 10 es orden, no
# mecanismo: basta que alguien mencione un `env_` antes de consultarlo para que
# la forma suelta devuelva el entorno equivocado y la sesion nueva arranque en
# otro sitio.
#
# Es el MISMO defecto que `restart_needed` ya cerro un nivel mas abajo: grepear
# una cadena que el propio turno pudo escribir.
# ---------------------------------------------------------------------------
loose = transcript_with([
    {"type": "assistant", "text": "propongo env_aaaaaaaaaaaaaaaaaaaa como destino"},
    {"type": "user", "toolUseResult": {"environment_id": "env_bbbbbbbbbbbbbbbbbbbb"}},
])
check("la forma con CLAVE gana a la mencionada antes",
      "env_bbbbbbbbbbbbbbbbbbbb", sr.environment_of(loose))

mention_without_key = transcript_with([
    {"type": "assistant", "text": "el entorno env_cccccccccccccccccccc suena bien"},
])
check("una mencion SIN clave no se toma por declaracion",
      None, sr.environment_of(mention_without_key))

# Anulacion del caso anterior: si el mecanismo volviera a la forma suelta,
# `mencion_sin_clave` devolveria el env_ y este par de casos caeria.

# ---------------------------------------------------------------------------
# Rojo sobre cero tampoco es rojo
#
# Sin transcript, `restart_needed` respondia `needed=True` con `seen=0`: un
# veredicto ROJO sobre un universo vacio. Es la forma simetrica de «verde sobre
# cero no es verde», y aqui importa mas, porque el rojo PROPONE una accion que
# cuesta el contexto de la sesion viva.
# ---------------------------------------------------------------------------
without_file = sr.restart_needed(str(pathlib.Path(tempfile.gettempdir()) /
                                    "no-existe-este-transcript.jsonl"))
check("sin transcript NO se afirma que haga falta", None, without_file["needed"])
check("y se declara que no se midio", False, without_file["measured"])
check("y el denominador sigue siendo cero", 0, without_file["seen"])

with_file = sr.restart_needed(firing_real)
check("con transcript SI se mide", True, with_file["measured"])
check("y ahi el veredicto es booleano", True,
      isinstance(with_file["needed"], bool))

check("mencion y disparo difieren", True, v["needed"] != v2["needed"])


print("=== 9. session.json: entorno y fuentes de get_session ===")
# La forma real de get_session (fixture medida, no inventada):
# `.claude/workbench/session-relay-20260929T025523/session.json`.
session_fixture = {
    "ccr": {
        "id": "session_ejemplo",
        "environment_id": "env_01EjemploEjemplo",
        "session_context": {"sources": [
            {"git_repository": {"url": "https://github.com/NestorMonroy/thyrox",
                                "revision": "refs/heads/feature/thyrox-l4"}},
            {"git_repository": {"url": "https://github.com/jcg-admin/kaupamex-docs",
                                "revision": "refs/heads/feature/kaupamex-l9"}},
            {"git_repository": {"url": "https://github.com/jcg-admin/kaupamex-api"}},
        ]},
    }
}
check("el entorno sale de ccr.environment_id", "env_01EjemploEjemplo",
      sr.session_environment(session_fixture))
check("sin ccr, None", None, sr.session_environment({}))
sources = sr.session_sources(session_fixture)
check("hay tres fuentes", 3, len(sources))
check("la primera trae su url",
      "https://github.com/NestorMonroy/thyrox", sources[0]["url"])
check("y su revision REGISTRADA (no la rama real)",
      "refs/heads/feature/thyrox-l4", sources[0]["registered_revision"])
check("la tercera no trae revision registrada", None,
      sources[2]["registered_revision"])

print("=== 10. normaliza la URL para comparar contra el origin del clon ===")
check("sin .git final", "https://github.com/o/r",
      sr.normalize_repo_url("https://github.com/o/r.git"))
check("sin barra final", "https://github.com/o/r",
      sr.normalize_repo_url("https://github.com/o/r/"))
check("las tres formas son iguales", True,
      sr.normalize_repo_url("https://github.com/o/r")
      == sr.normalize_repo_url("https://github.com/o/r.git/"))

print("=== 11. la rama sale del CLON, nunca de la revision registrada ===")
farm = pathlib.Path(tempfile.mkdtemp())
clone_a = farm / "thyrox"
subprocess.run(["git", "init", "-q", "-b", "main-de-verdad", str(clone_a)],
              check=True)
subprocess.run(["git", "-C", str(clone_a), "remote", "add", "origin",
                "https://github.com/NestorMonroy/thyrox.git"], check=True)
subprocess.run(["git", "-C", str(clone_a), "-c", "user.name=t",
                "-c", "user.email=t@t", "commit", "-q", "--allow-empty",
                "-m", "seed"], check=True)
found_clone = sr.find_clone("https://github.com/NestorMonroy/thyrox", [farm])
check("el clon se localiza por su origin normalizado", str(clone_a),
      str(found_clone))
resolved_a = sr.resolve_repo(
    {"url": "https://github.com/NestorMonroy/thyrox",
     "registered_revision": "refs/heads/feature/thyrox-l4"}, [farm])
check("la rama REAL gana a la registrada", "main-de-verdad",
      resolved_a["branch"])
check("y el registro no se descarta, solo no se usa para la rama",
      "refs/heads/feature/thyrox-l4", resolved_a["registered_revision"])

print("=== 11b. un repo sin revision registrada toma la rama de su clon ===")
clone_c = farm / "kaupamex-api"
subprocess.run(["git", "init", "-q", "-b", "develop", str(clone_c)],
              check=True)
subprocess.run(["git", "-C", str(clone_c), "remote", "add", "origin",
                "https://github.com/jcg-admin/kaupamex-api"], check=True)
subprocess.run(["git", "-C", str(clone_c), "-c", "user.name=t",
                "-c", "user.email=t@t", "commit", "-q", "--allow-empty",
                "-m", "seed"], check=True)
resolved_c = sr.resolve_repo(
    {"url": "https://github.com/jcg-admin/kaupamex-api",
     "registered_revision": None}, [farm])
check("sin revision registrada, la rama sigue saliendo del clon", "develop",
      resolved_c["branch"])

print("=== 11c. ANULACION — HEAD separado no cuenta como rama ===")
detached = farm / "detached"
subprocess.run(["git", "init", "-q", "-b", "main", str(detached)], check=True)
subprocess.run(["git", "-C", str(detached), "-c", "user.name=t",
                "-c", "user.email=t@t", "commit", "-q", "--allow-empty",
                "-m", "seed"], check=True)
subprocess.run(["git", "-C", str(detached), "remote", "add", "origin",
                "https://github.com/o/detached"], check=True)
subprocess.run(["git", "-C", str(detached), "checkout", "-q", "--detach"],
              check=True)
check("git SI da un nombre para HEAD separado", "HEAD",
      sr.branch_of(detached))
resolved_detached = sr.resolve_repo(
    {"url": "https://github.com/o/detached", "registered_revision": None},
    [farm])
check("pero resolve_repo NO lo toma por rama", None,
      resolved_detached["branch"])
check("y el clon si se encontro", str(detached),
      str(resolved_detached["clone"]))

print("=== 12. repo sin clon: aviso BLOQUEANTE ===")
missing = sr.resolve_repo(
    {"url": "https://github.com/nadie/no-existe", "registered_revision": None},
    [farm])
check("sin clon local, no hay clon", None, missing["clone"])
check("ni rama", None, missing["branch"])
warnings_missing = sr.preflight_warnings([missing])
check("hay exactamente un aviso", 1, len(warnings_missing))
check("y bloquea", True, warnings_missing[0]["blocking"])
check("nombrando el repo", True,
      "no-existe" in warnings_missing[0]["message"])

print("=== 12b. clon sin rama tambien bloquea ===")
warnings_detached = sr.preflight_warnings([resolved_detached])
check("un aviso", 1, len(warnings_detached))
check("y bloquea", True, warnings_detached[0]["blocking"])

print("=== 12c. lo que NO viaja avisa, pero NO bloquea ===")
ghost_root = pathlib.Path(tempfile.mkdtemp())
warnings_ghost = sr.preflight_warnings(
    [resolved_a], live_settings=ghost_root / "settings.local.json",
    env_path=ghost_root / ".env", venv_path=ghost_root / ".venv")
check("tres avisos (settings, env, venv)", 3, len(warnings_ghost))
check("ninguno bloquea", True,
      all(not w["blocking"] for w in warnings_ghost))
check("el repo resuelto no genera aviso propio", 3, len(warnings_ghost))

print("=== 12d. ANULACION — un clon completo no genera ningun aviso de repo ===")
warnings_ok = sr.preflight_warnings([resolved_a])
check("sin settings/env/venv declarados, y clon completo: cero avisos", 0,
      len(warnings_ok))

print("=== 13. DECLARADO != INSTALADO != CARGADO: instalar antes que relevar ===")
live_with_gap = {"hooks": {"Stop": [
    {"hooks": [{"command": "bash /x/.claude/hooks/stop-gate-stale-board.sh"}]}]}}
declared_with_gap = {"hooks": {"Stop": [
    {"hooks": [{"command": "bash /x/.claude/hooks/stop-gate-stale-board.sh"}]}],
    "SubagentStop": [
    {"hooks": [{"command": "bash /x/.claude/hooks/stop-gate-nuevo.sh"}]}]}}
from session import user_wiring  # noqa: E402
gap = user_wiring.wiring_drift(live_with_gap, declared_with_gap)
check("hay un evento con algo solo declarado", True,
      "SubagentStop" in gap and bool(gap["SubagentStop"]["only_declared"]))
check("veredicto: instalar primero, aunque los hooks SI disparen", "instalar primero",
      sr.wiring_verdict({"needed": False, "measured": True}, gap))

print("=== 13b. sin brecha, el veredicto lo decide restart_needed ===")
no_gap = user_wiring.wiring_drift(live_with_gap, live_with_gap)
check("sin brecha, el dict de deriva esta vacio", {}, no_gap)
check("ahi si se propone relevar", "relevar",
      sr.wiring_verdict({"needed": True, "measured": True}, no_gap))
check("o no hace falta, si ya disparan", "no hace falta",
      sr.wiring_verdict({"needed": False, "measured": True}, no_gap))

print("=== 13c. ANULACION — sin medir, ningun veredicto se afirma ===")
check("needed=None por no medido -> veredicto None", None,
      sr.wiring_verdict({"needed": None, "measured": False}, no_gap))

print("=== 14. la carga util con VARIAS fuentes: una en la carga, el resto en el prompt ===")
repos_multi = [
    {"url": "https://github.com/NestorMonroy/thyrox", "branch": "main-de-verdad",
     "registered_revision": "refs/heads/feature/thyrox-l4", "clone": clone_a},
    {"url": "https://github.com/jcg-admin/kaupamex-docs", "branch": "feature/kaupamex-l9",
     "registered_revision": "refs/heads/feature/kaupamex-l9", "clone": farm / "docs"},
    {"url": "https://github.com/jcg-admin/kaupamex-api", "branch": "develop",
     "registered_revision": None, "clone": clone_c},
]
multi_payload = sr.build_multi_payload(
    environment="env_01EjemploEjemplo", repos=repos_multi, title="Relevo",
    transcript="/root/.claude/projects/x/sesion.jsonl")
check("la PRIMERA fuente va en la carga", repos_multi[0]["url"],
      multi_payload["source_url"])
check("con su rama REAL", repos_multi[0]["branch"],
      multi_payload["source_revision"])
for repo in repos_multi[1:]:
    check(f"{repo['url']} aparece en el prompt", True,
          repo["url"] in multi_payload["prompt"])
    check(f"con su rama real ({repo['branch']}) en el prompt", True,
          repo["branch"] in multi_payload["prompt"])
check("el primer repo NO se repite como paso del prompt", False,
      repos_multi[0]["url"] in multi_payload["prompt"])
check("el prompt trae el setup: uv sync", True,
      "uv sync" in multi_payload["prompt"])
check("y la instalacion del cableado", True,
      "bin/user_wiring --write" in multi_payload["prompt"])
check("y la medicion con SU PROPIO transcript", True,
      "/root/.claude/projects/x/sesion.jsonl" in multi_payload["prompt"])

print("=== 14b. ANULACION — sin repos, build_multi_payload rehusa ===")
try:
    sr.build_multi_payload(environment="env_x", repos=[], title="t",
                           transcript="/x.jsonl")
    check("sin repos -> rehusa", True, False)
except sr.RestartError:
    check("sin repos -> rehusa", True, True)

print("=== 14c. una fuente sin rama medida NO se disfraza de rama real ===")
broken_repo = {"url": "https://github.com/nadie/no-existe", "branch": None,
              "registered_revision": None, "clone": None}
steps_broken = sr.additional_repo_steps([broken_repo])
check("no imprime la palabra None como si fuera una rama", False,
      "None" in " ".join(steps_broken))
check("nombra que la rama no se pudo medir", True,
      any("no se pudo medir" in step for step in steps_broken))

print("=== 15. main(): un aviso bloqueante sale 3, salvo --allow-partial ===")
# El pre-flight no emite veredicto sobre el relevo, pero su aviso bloqueante
# tiene que llegar a la salida del guion: sin esto, un repo de la sesion sin
# clon local produciria una carga util que el relevo no puede cumplir, con 0.
orphan_dir = pathlib.Path(tempfile.mkdtemp())
orphan_session = orphan_dir / "session.json"
orphan_session.write_text(json.dumps({"ccr": {
    "environment_id": "env_01EjemploEjemplo",
    "session_context": {"sources": [
        {"git_repository": {"url": "https://github.com/NestorMonroy/thyrox"}},
        {"git_repository": {"url": "https://github.com/nadie/sin-clon"}}]},
}}), encoding="utf-8")
orphan_transcript = orphan_dir / "t.jsonl"
orphan_transcript.write_text("", encoding="utf-8")
# La primera fuente tiene clon (el de la seccion 11) y la segunda no: la
# carga util se compone, y el aviso de la segunda es el que bloquea.
empty_roots = farm
script = pathlib.Path(__file__).resolve().parents[2] / "src" / "session" / "session_restart.py"
base_args = [sys.executable, str(script), "--transcript", str(orphan_transcript),
             "--root", str(orphan_dir), "--session-json", str(orphan_session),
             "--clone-root", str(empty_roots)]
env = {**__import__("os").environ,
       "PYTHONPATH": str(pathlib.Path(__file__).resolve().parents[2] / "src")}
strict = subprocess.run(base_args, capture_output=True, text=True, env=env)
check("segundo repo sin clon: sale 3", 3, strict.returncode)
check("repo sin clon: lo imprime como BLOQUEA", True, "[BLOQUEA]" in strict.stdout)
partial = subprocess.run(base_args + ["--allow-partial"], capture_output=True,
                         text=True, env=env)
check("con --allow-partial: sale 0", 0, partial.returncode)
check("con --allow-partial: el aviso sigue impreso", True,
      "[BLOQUEA]" in partial.stdout)

print(f"\nOK={OK} FAILED={FAILED}")


def test_session_restart_suite() -> None:
    """Puente pytest: las verificaciones de arriba ya corrieron al importar.

    Este archivo usa `check()` en vez de `assert` por modulo, asi que pytest
    no vera ningun `test_` si no se declara uno: sin esto, `pytest` colecciona
    cero items y el `raise SystemExit` de mas abajo rompe la coleccion. La
    verificacion en si NO se repite aqui: se lee el contador que las
    comprobaciones de arriba ya llenaron.
    """
    assert FAILED == 0, f"{FAILED} verificacion(es) en rojo (ver salida arriba)"


if __name__ == "__main__":
    raise SystemExit(1 if FAILED else 0)
