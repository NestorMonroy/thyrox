#!/usr/bin/env python3
"""El hogar de los transcripts del cliente, y el hallazgo de uno — una sola vez.

Por que existe este modulo
--------------------------
Hasta hoy el arbol resolvia el directorio de proyectos del cliente de **seis**
formas distintas, ninguna declarada (censo sobre el indice de git, 2026-09-23)::

    Path.home()/'.claude'/'projects'          agents/measure_subagent_usage.py:68
    Path.home()/".claude"/"projects" + glob   agents/model_catalog.py:281
    os.path.expanduser("~/.claude/projects")  session/session_restart.py:87
    Path("/root/.claude/projects/-home-user") agents/agent_timeline.py:37
    Path("/root/.claude/projects")            agents/reconcile_store.py:57
    Path(args.claude_home)/"projects"         agents/backfill_agent_sessions.py:175

Seis grafias del mismo hogar son seis oportunidades de que una envejezca sola.
Una ya lo hizo: ``agent_timeline`` lleva el SLUG del proyecto incrustado
(``-home-user``), y el cliente lo deriva del cwd — esta sesion escribio bajo
dos slugs distintos al cambiar de grafia el arbol.

El defecto que lo volvio urgente
--------------------------------
Dos de esos seis hacen el MISMO hallazgo —``*/<sid>.jsonl``— con desempates
distintos: ``model_catalog`` ordena por RUTA y toma el ultimo, ``session_restart``
toma el de mayor tamaño. Medido sobre la sesion viva el 2026-09-23::

    model_catalog  : …/-home-user-EANE-Emprendimiento/<sid>.jsonl   5 581 100 B
    session_restart: …/-home-user/<sid>.jsonl                      45 277 263 B

Discrepaban. ``model_catalog`` agregaba tokens y cache sobre el **12%** de la
sesion y publicaba la cifra sin denominador que lo delatara. No es un empate
que da igual: es la misma pregunta con dos respuestas.

Por que el plural es la forma primaria
--------------------------------------
Porque el hecho medido es que una sesion PUEDE tener varios transcripts: el
cliente nombra el directorio de proyecto por el cwd y reslugifica al cambiarlo.
``transcripts_for`` devuelve todos, ordenados; ``transcript_for`` es su cabeza.
Un mecanismo que solo devolviera uno no puede decir que descarto.

*Ciego a:* que dos archivos con el mismo id sean de sesiones distintas —el id
se asume identidad, como lo asume el cliente—; y al contenido, que no se abre
para elegir: el desempate es por tamaño, que es una heuristica declarada, no
una lectura.
"""
from __future__ import annotations

import os
import pathlib

from paths.declarations import record_fallback
from paths.reach import env_value

#: Entrada 1 — el valor. Misma familia que ``THYROX_CACHE_DIR``,
#: ``THYROX_JOBS_DIR`` y sus hermanas, y bajo el prefijo ``THYROX_`` que
#: ``verify/check_env_contract_keys.py`` declara: una clave fuera del prefijo
#: seria invisible a su gate.
TRANSCRIPTS_DIR_VAR = "THYROX_TRANSCRIPTS_DIR"

#: El compuesto por defecto. Aqui SI hay default y no se rehusa, por la misma
#: razon que la familia ``cache``: un transcript es material del CLIENTE, no
#: del arbol, y rehusar dejaria mudos a sus cinco consumidores sin que ninguno
#: gane control a cambio.
#:
#: Y cuelga de ``Path.home()``, no del arbol: los transcripts viven bajo el
#: hogar del proceso (medido: ``/root/.claude/projects`` con el cwd en
#: ``/home/user``). Es lo contrario de ``user_wiring.live_settings``, que se
#: deriva del arbol — porque ahi el sujeto es un archivo del multi-repo y aqui
#: es uno del cliente. La distincion es del sujeto, no del gusto.
TRANSCRIPTS_SEGMENTS = (".claude", "projects")


def transcripts_dir(start: str | pathlib.Path | None = None) -> pathlib.Path:
    """El hogar de los transcripts: el declarado, o el compuesto y anotado.

    Se resuelve **al llamar**, no al importar, por la misma razon que sus cinco
    familias hermanas: una constante de modulo se evalua al importar, asi que
    un consumidor que declare la variable despues del ``import`` no la ve y
    ningun control puede variarla.
    """
    declared = env_value(TRANSCRIPTS_DIR_VAR, start)
    if declared:
        return pathlib.Path(declared).expanduser().resolve()

    home = pathlib.Path.home().joinpath(*TRANSCRIPTS_SEGMENTS)
    record_fallback(
        TRANSCRIPTS_DIR_VAR, home,
        f"nadie lo declaro; sale del hogar del proceso mas "
        f"{'/'.join(TRANSCRIPTS_SEGMENTS)}. Declaralo si el cliente escribe "
        f"sus transcripts en otro sitio — el hogar del proceso y el cwd de la "
        f"sesion no tienen por que coincidir, y aqui no coinciden.")
    return home


def transcripts_for(session_id: str,
                    home: str | pathlib.Path | None = None
                    ) -> tuple[pathlib.Path, ...]:
    """TODOS los transcripts de una sesion, del mas grande al mas pequeño.

    El orden es la decision, y es UNA: mayor tamaño primero y, a igualdad, el
    mas reciente. El que tiene contenido es el que la sesion escribio; los
    demas son los que el cliente abrio bajo otro slug de proyecto y dejo a
    medias.

    Devuelve una tupla vacia si no hay ninguno. NO compone
    ``home/<session_id>.jsonl``: una ruta inventada se abre igual que una real
    y el fallo aparece lejos de su causa.
    """
    if not session_id:
        return ()
    base = pathlib.Path(home) if home is not None else transcripts_dir()
    if not base.is_dir():
        return ()
    found = [p for p in base.glob(f"*/{session_id}.jsonl") if p.is_file()]
    if not found:
        return ()
    found.sort(key=lambda p: (p.stat().st_size, p.stat().st_mtime),
               reverse=True)
    return tuple(found)


def transcript_for(session_id: str,
                   home: str | pathlib.Path | None = None
                   ) -> pathlib.Path | None:
    """El transcript de una sesion: la cabeza de ``transcripts_for``, o None.

    Existe para que los consumidores que solo quieren uno no reimplementen el
    desempate. Cuando el plural importa —«¿cuanto estoy descartando?»— se
    llama al plural.
    """
    found = transcripts_for(session_id, home)
    return found[0] if found else None


def session_id_declared() -> str:
    """El id que el cliente exporta, o cadena vacia.

    Una sola grafia de la variable: dos consumidores la leian por su cuenta y
    una de las dos podria envejecer sola, que es el defecto que este modulo
    cierra un nivel mas arriba.
    """
    return os.environ.get("CLAUDE_CODE_SESSION_ID", "")
