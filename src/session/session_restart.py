#!/usr/bin/env python3
"""Prepara el RELEVO de sesion: los parametros, derivados y no adivinados.

Que puede y que no puede un guion
----------------------------------
No puede hacer que una sesion viva recargue su configuracion: el cliente la
lee al arrancar y es dueño de su ciclo de vida. Eso no es una limitacion que
se pueda programar alrededor.

Lo que SI puede es preparar el relevo — una sesion NUEVA en el mismo entorno,
sobre el mismo repo y rama, que si lee la configuracion al arrancar. Medido el
2026-09-23 sobre esta sesion: 138 de 138 fines de turno dispararon un solo
comando, el del launcher, y ninguno de los seis gates del arbol. El cableado
estaba bien —las 22 rutas resuelven desde los tres cwd— y aun asi no disparaba,
porque `settings.json` se movio DESPUES de que la sesion arrancara.

Por que hace falta un guion y no basta escribirlo a mano
---------------------------------------------------------
Los parametros estan repartidos y uno NO vive en ninguna configuracion: el
`environment_id` solo aparece dentro del transcript —medido, tres veces en el
de esta sesion, en un `.jsonl` de cientos de megabytes—. Leerlo a ojo cada vez
invita a equivocarse, y equivocarse ahi crea la sesion en OTRO entorno sin que
nada avise.

Por que mide antes de proponer
-------------------------------
Relevar cuesta: se pierde el contexto de la sesion viva. `restart_needed` mira
que hooks DISPARARON de verdad en el transcript —no lo que `settings.json`
promete— y dice si hace falta. Un mecanismo que relevara sin mirar seria un
grifo, y el arbol ya tiene bastante de eso.

*Ciego a:* un `environment_id` que el transcript no nombre —ahi rehusa en vez
de componer uno—; a la rama que cambie entre la medicion y el relevo; y a que
la sesion nueva CARGUE lo que se espera, que solo se comprueba midiendola a
ella. Este guion prepara; no promete el resultado.
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import subprocess

from session import transcripts

#: La forma DECLARADA del entorno: la clave, su separador —que el transcript
#: escapa (``\"environment_id\":\"env_…\"``) o no, segun quien la escribio— y
#: el valor. No la forma suelta: medido sobre el transcript vivo el
#: 2026-09-23, 19 lineas nombran un ``env_`` y **9 son texto que la sesion
#: escribio**; solo 10 salen de un ``tool_result``. Que el primer acierto
#: fuera hoy uno de esos 10 es orden, no mecanismo.
_ENVIRONMENT = re.compile(
    r"environment_id[\\\"'\s:]{1,6}(env_[A-Za-z0-9]{10,})")


class RestartError(RuntimeError):
    """Falta una pieza del relevo. NO se compone uno a medias."""


def environment_of(transcript) -> str | None:
    """El identificador de entorno que el transcript nombra, o ``None``.

    Se lee por lineas y se corta en la primera coincidencia: el archivo pesa
    cientos de megabytes y cargarlo entero para hallar una cadena de treinta
    caracteres es gastar memoria por comodidad.

    Lo que se busca es la CLAVE ``environment_id`` con su valor, no un
    ``env_…`` suelto. La forma suelta es la misma clase de defecto que
    `restart_needed` ya cerro un nivel mas abajo: leer una cadena que el propio
    turno pudo escribir. Basta mencionar un entorno antes de consultarlo para
    que la sesion nueva arranque en otro sitio, y nada lo avisaria.

    *Ciego a:* un ``tool_result`` que devuelva la clave con un valor ajeno —la
    clave acota el origen, no lo certifica—; y a un transcript donde el cliente
    nombre el entorno de otra forma, donde rehusa en vez de componer uno.
    """
    path = pathlib.Path(transcript)
    if not path.is_file():
        return None
    with path.open(encoding="utf-8", errors="replace") as handle:
        for line in handle:
            found = _ENVIRONMENT.search(line)
            if found:
                return found.group(1)
    return None


def transcript_for(session_id, home=None) -> pathlib.Path | None:
    """El transcript de una sesion. DELEGA en `session.transcripts`.

    El desempate —el mayor, y a igualdad el mas reciente— y el hogar del
    cliente viven ahi, declarados una sola vez. Aqui vivian tambien, con
    `os.path.expanduser("~/.claude/projects")` escrito a mano, y esa era la
    quinta de seis grafias del mismo hogar en el arbol.

    Se conserva el nombre porque es la puerta que el resto de este modulo usa;
    lo que se retiro es la SEGUNDA implementacion, no la funcion.
    """
    return transcripts.transcript_for(session_id, home)


def _git(root, *args) -> str | None:
    try:
        done = subprocess.run(("git", "-C", str(root)) + args,
                              capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return None
    output = done.stdout.strip()
    return output if done.returncode == 0 and output else None


def repository_of(root) -> str | None:
    """La URL del remoto ``origin``, o ``None`` si el arbol no es un repo."""
    return _git(root, "remote", "get-url", "origin")


def branch_of(root) -> str | None:
    """La rama de HEAD, o ``None``."""
    return _git(root, "rev-parse", "--abbrev-ref", "HEAD")


def restart_needed(transcript, expected=("stop-gate-",)) -> dict:
    """Si el relevo hace falta, medido por los hooks que DISPARARON.

    Delega el parseo en `measure_hook_firing`, que es de quien es el concepto.
    La primera version de esto grepeaba dos cadenas en la misma linea y dio un
    FALSO VERDE el 2026-09-23: las lineas llevaban `stop-gate-` porque el turno
    habia escrito esos comandos a mano, no porque hubieran disparado. El
    veredicto salio «no hace falta relevar» sobre una sesion donde ningun gate
    habia disparado en 138 turnos.

    Lo que se mira es el COMANDO de cada `hookInfos`, no el texto de la linea:
    mencionar un gate y ejecutarlo son cosas distintas, y una sesion de trabajo
    sobre gates menciona muchos.

    Devuelve ``{needed, matched, seen, measured}``. Sin el denominador `seen`,
    un `matched` de 0 no distingue «no disparo» de «no hubo turnos».

    Y sin `measured`, el caso «no hay transcript» devolvia ``needed=True`` con
    ``seen=0``: un veredicto ROJO sobre un universo vacio. Es la forma
    simetrica de «verde sobre cero no es verde», y aqui pesa mas, porque el
    rojo PROPONE una accion que cuesta el contexto de la sesion viva. Sin
    sujeto, `needed` es ``None`` — ni si ni no — y quien llame tiene que mirar
    `measured` antes de creerselo.
    """
    path = pathlib.Path(transcript)
    if not path.is_file():
        return {"needed": None, "matched": 0, "seen": 0, "measured": False}
    from session import measure_hook_firing  # noqa: PLC0415

    summaries = measure_hook_firing.read_summaries(str(path))
    commands, _ = measure_hook_firing.tally(summaries)
    matched = sum(count for command, count in commands.items()
                  if any(mark in command for mark in expected))
    return {"needed": matched == 0, "matched": matched,
            "seen": len(summaries), "measured": True}


def build_payload(*, environment, repository, branch, title, prompt) -> dict:
    """La carga util de `create_session`, o un error que nombra lo que falta.

    Rehusa en vez de rellenar: un relevo con el entorno equivocado arranca en
    otro sitio y el fallo aparece lejos de su causa.
    """
    missing = [name for name, value in (
        ("entorno", environment), ("repositorio", repository),
        ("rama", branch), ("titulo", title), ("prompt", prompt),
    ) if not value]
    if missing:
        raise RestartError(
            f"faltan {len(missing)} pieza(s) del relevo: {', '.join(missing)}. "
            f"NO se compone uno a medias: con el entorno o el repo "
            f"equivocados la sesion arranca en otro sitio y el fallo aparece "
            f"lejos de su causa.")
    return {
        "environment_id": environment,
        "source_url": repository,
        "source_revision": branch,
        "title": title,
        "prompt": prompt,
    }


def main(argv=None) -> int:
    import argparse  # noqa: PLC0415

    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--transcript", default=None,
                        help="el .jsonl de la sesion viva; por defecto se "
                             "deriva de CLAUDE_CODE_SESSION_ID")
    parser.add_argument("--root", default=".",
                        help="el arbol del que derivar repo y rama")
    parser.add_argument("--title", default="Relevo de sesion")
    parser.add_argument("--prompt", default="Continua el trabajo de la sesion "
                                            "anterior en esta rama.")
    args = parser.parse_args(argv)

    transcript = args.transcript
    if not transcript:
        found = transcript_for(os.environ.get("CLAUDE_CODE_SESSION_ID", ""))
        transcript = str(found) if found else ""

    verdict = restart_needed(transcript)
    print(f"hooks del arbol que dispararon: {verdict['matched']} "
          f"de {verdict['seen']} resumen(es) de hook")
    if not verdict["measured"]:
        print("veredicto: NO PUDE MEDIR — no hay transcript que leer "
              f"({transcript or 'ninguno derivado'}). Un rojo sobre cero "
              f"resumenes no es un rojo: propondria relevar, que cuesta el "
              f"contexto de esta sesion, sin haber mirado nada.")
        return 2
    print("veredicto: "
          + ("HACE FALTA relevar" if verdict["needed"]
             else "NO hace falta: los gates ya disparan"))

    payload = build_payload(
        environment=environment_of(transcript),
        repository=repository_of(args.root),
        branch=branch_of(args.root),
        title=args.title, prompt=args.prompt)
    print("\ncarga util para create_session:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print("\nEste guion PREPARA el relevo; no lo emite. La llamada la hace "
          "quien tenga la herramienta, con esta carga util tal cual.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
