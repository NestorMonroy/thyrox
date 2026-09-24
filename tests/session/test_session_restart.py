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
repo = sr.repository_of(pathlib.Path("/home/user/eane-emprendimiento"))
check("el repo sale del remoto", True,
      repo is not None and "EANE-Emprendimiento" in repo)
branch = sr.branch_of(pathlib.Path("/home/user/eane-emprendimiento"))
check("y la rama del HEAD", True, isinstance(branch, str) and len(branch) > 0)
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
import os, time  # noqa: E402
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

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
