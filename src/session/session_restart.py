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


def session_environment(session: dict) -> str | None:
    """El entorno de una sesion ya cargada (`get_session`): ``ccr.environment_id``.

    Alternativa a `environment_of` cuando la fuente es la respuesta de la API
    y no el transcript: la clave es la misma idea, la procedencia es otra.
    """
    ccr = (session or {}).get("ccr") or {}
    return ccr.get("environment_id") or None


def session_sources(session: dict) -> list[dict]:
    """Los repositorios de una sesion: su URL y la revision REGISTRADA al arranque.

    La revision que aqui viaja no es la rama actual: un repo puede arrancar
    sin ninguna (medido en la fixture: el tercero no la trae), y aunque la
    traiga puede haber cambiado desde entonces. La rama real se mide aparte,
    con `branch_of` dentro del clon (`resolve_repo`).
    """
    ccr = (session or {}).get("ccr") or {}
    context = ccr.get("session_context") or {}
    sources = []
    for source in context.get("sources") or []:
        repo = (source or {}).get("git_repository") or {}
        url = repo.get("url")
        if not url:
            continue
        sources.append({"url": url, "registered_revision": repo.get("revision")})
    return sources


def normalize_repo_url(url: str) -> str:
    """`url` sin barra final ni sufijo ``.git``, para comparar contra un ``origin``.

    Dos clones del mismo repo pueden declarar su remoto con o sin cada uno de
    los dos, y son la misma URL.
    """
    normalized = (url or "").strip()
    if normalized.endswith("/"):
        normalized = normalized[:-1]
    if normalized.endswith(".git"):
        normalized = normalized[:-4]
    return normalized


def find_clone(url, roots) -> pathlib.Path | None:
    """El clon local cuyo ``origin`` normalizado coincide con `url`, bajo `roots`.

    Cada raiz de `roots` se prueba como clon ella misma y, si es un
    directorio, tambien por su primer nivel de subdirectorios: un
    `--clone-root` puede nombrar el padre que contiene varios clones
    hermanos, o el clon mismo.

    *Ciega a:* un remoto que no se llame ``origin``; y a un clon a mas de un
    nivel de profundidad bajo la raiz dada.
    """
    target = normalize_repo_url(url)
    checked: set[pathlib.Path] = set()
    for root in roots:
        root_path = pathlib.Path(root)
        candidates = [root_path]
        if root_path.is_dir():
            candidates += sorted(p for p in root_path.iterdir() if p.is_dir())
        for candidate in candidates:
            resolved = candidate.resolve()
            if resolved in checked:
                continue
            checked.add(resolved)
            if not (resolved / ".git").exists():
                continue
            origin = repository_of(candidate)
            if origin and normalize_repo_url(origin) == target:
                return candidate
    return None


def resolve_repo(source: dict, clone_roots) -> dict:
    """Un repo de la sesion con su clon y su rama REAL, medidos, no adivinados.

    La rama sale de `branch_of` DENTRO del clon, nunca de
    `registered_revision`: esa es la de arranque, no la actual. Un HEAD
    separado (`branch_of` devuelve el nombre literal ``"HEAD"``) no cuenta
    como rama: no hay a que hacer checkout.
    """
    clone = find_clone(source["url"], clone_roots)
    branch = None
    if clone is not None:
        raw_branch = branch_of(clone)
        if raw_branch and raw_branch != "HEAD":
            branch = raw_branch
    return {
        "url": source["url"],
        "registered_revision": source.get("registered_revision"),
        "clone": clone,
        "branch": branch,
    }


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


def wiring_verdict(hooks: dict, drift: dict) -> str | None:
    """El veredicto compuesto: instalar, relevar, o que no hace falta nada.

    `drift` —de `session.user_wiring.wiring_drift(live, declared)`— gana
    sobre `hooks` —de `restart_needed`—: un comando en `only_declared` esta
    declarado y NO instalado, y `settings.local.json` no viaja al contenedor
    nuevo, asi que un relevo lo dejaria igual de no instalado. Solo cuando no
    queda nada pendiente de instalar tiene sentido preguntar si los hooks ya
    disparan.

    Devuelve ``None`` cuando `hooks["measured"]` es falso: sin universo
    medido no se afirma ni «relevar» ni «no hace falta» — la misma razon por
    la que `restart_needed` deja `needed` en ``None``.

    *Ciega a:* un evento con deriva que no sea `only_declared` —por ejemplo
    `only_live`, un comando instalado que ya no se declara— porque eso no es
    "falta instalar", es limpieza, y proponer instalar por eso seria un
    veredicto sobre el fenomeno equivocado.
    """
    pending = any(sides.get("only_declared") for sides in drift.values())
    if pending:
        return "instalar primero"
    if not hooks.get("measured"):
        return None
    return "relevar" if hooks.get("needed") else "no hace falta"


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


#: El prompt por defecto de un relevo de UNA sola fuente. Con varias fuentes,
#: `build_relay_prompt` lo usa como cabecera y le añade los pasos de las
#: demás.
DEFAULT_PROMPT = "Continua el trabajo de la sesion anterior en esta rama."

#: Los pasos de arranque de la sesion NUEVA, en el orden que el Item fija:
#: sincronizar dependencias, instalar el cableado declarado, y por ultimo
#: MEDIR que dispara — no basta con instalarlo, `wiring_drift` compara contra
#: lo declarado, no contra lo que de verdad se ejecuta en un turno.
SETUP_STEPS = (
    "uv sync",
    "bin/user_wiring --write",
    "medir que los hooks disparan con `bin/session_restart --transcript {transcript}`",
)


def preflight_warnings(repos, *, live_settings=None, env_path=None,
                       venv_path=None) -> list[dict]:
    """Avisos del relevo, cada uno con si BLOQUEA. Sin veredicto sobre relevar.

    Bloquean: un repo de la sesion sin clon local, y un clon sin rama (HEAD
    separado o vacio). Avisan sin bloquear: `settings.local.json`, `.env` y
    `.venv` ausentes — ninguno de los tres viaja al contenedor nuevo, y la
    sesion nueva los restaura por su cuenta (`user_wiring --write`, `uv sync`,
    y el usuario para `.env`).

    *Ciega a:* la SALUD del clon mas alla de tener rama —un remoto
    inalcanzable, cambios sin commitear— y a si el archivo ausente es
    recuperable; solo mide presencia.
    """
    warnings: list[dict] = []
    for repo in repos:
        if repo.get("clone") is None:
            warnings.append({
                "message": f"sin clon local para {repo['url']}: no se puede "
                          f"medir su rama real ni adjuntarlo al relevo",
                "blocking": True})
            continue
        if not repo.get("branch"):
            warnings.append({
                "message": f"{repo['clone']}: HEAD separado o sin rama — no "
                          f"hay a que hacer checkout en el relevo",
                "blocking": True})
    for path, name, restored_by in (
        (live_settings, "settings.local.json",
         "lo instala `bin/user_wiring --write`"),
        (env_path, ".env", "lo restaura el usuario"),
        (venv_path, ".venv", "lo recrea `uv sync`"),
    ):
        if path is not None and not pathlib.Path(path).exists():
            warnings.append({
                "message": f"{path} ausente: no viaja al contenedor nuevo, "
                          f"{restored_by}",
                "blocking": False})
    return warnings


def additional_repo_steps(repos) -> list[str]:
    """Los pasos de prompt para adjuntar y ubicar los repos que NO son el primero.

    Cada repo lleva su rama REAL —medida por `resolve_repo`, nunca la
    registrada— porque es la que existe de verdad en su clon.
    """
    steps = []
    for repo in repos:
        steps.append(f"add_repo {repo['url']}")
        if repo["branch"]:
            steps.append(f"checkout la rama `{repo['branch']}` en {repo['url']}")
        else:
            steps.append(f"su rama no se pudo medir (sin clon o sin HEAD "
                        f"con nombre) — resolver el aviso bloqueante antes "
                        f"de hacer checkout en {repo['url']}")
    return steps


def build_relay_prompt(repos, transcript, base_prompt=DEFAULT_PROMPT) -> str:
    """El prompt de un relevo con varias fuentes: pasos explicitos, no supuestos.

    Solo `repos` —los que NO son la fuente primaria— entran aqui como pasos;
    la primaria ya viaja en `source_url`/`source_revision` y repetirla en el
    prompt duplicaria la instruccion. El setup de la sesion nueva va SIEMPRE
    al final y en el orden fijado: `uv sync` antes de instalar el cableado
    —que sus dependencias pueden requerir—, y medir los hooks al final,
    porque medir antes de instalar mediria lo viejo.
    """
    lines = [base_prompt]
    if repos:
        lines.append("")
        lines.append("Adjunta y ubica los repositorios restantes de la sesion:")
        lines.extend(f"- {step}" for step in additional_repo_steps(repos))
    lines.append("")
    lines.append("Luego, en la sesion nueva, en este orden:")
    lines.extend(f"- {step.format(transcript=transcript)}"
                for step in SETUP_STEPS)
    return "\n".join(lines)


def build_multi_payload(*, environment, repos, title, transcript,
                        base_prompt=DEFAULT_PROMPT) -> dict:
    """La carga util de `create_session` para VARIAS fuentes, no solo una.

    `create_session` acepta una fuente: la primera de la sesion viaja como
    `source_url`/`source_revision`, con su rama REAL; el resto se declara
    dentro del `prompt` como pasos explicitos de `add_repo` y checkout —
    `build_relay_prompt`—, seguidos del setup de la sesion nueva.

    Rehusa —via `build_payload`— si falta cualquier pieza del primario; y
    aqui mismo si no hay ningun repo, porque entonces no hay fuente primaria
    que nombrar.
    """
    if not repos:
        raise RestartError(
            "faltan 1 pieza(s) del relevo: repositorios. NO se compone un "
            "relevo sin ninguna fuente.")
    primary, rest = repos[0], repos[1:]
    prompt = build_relay_prompt(rest, transcript, base_prompt)
    return build_payload(environment=environment, repository=primary["url"],
                         branch=primary["branch"], title=title, prompt=prompt)
def main(argv=None) -> int:
    import argparse  # noqa: PLC0415

    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument("--transcript", default=None,
                        help="el .jsonl de la sesion viva; por defecto se "
                             "deriva de CLAUDE_CODE_SESSION_ID")
    parser.add_argument("--root", default=".",
                        help="el arbol del que derivar repo y rama")
    parser.add_argument("--session-json", default=None,
                        help="la salida de get_session (ccr.environment_id y "
                             "session_context.sources[]); con esto, MEMBRESIA "
                             "y rama salen de ahi y de los clones, no del "
                             "transcript ni de --root")
    parser.add_argument("--clone-root", action="append", default=None,
                        help="raiz bajo la que buscar el clon de cada repo de "
                             "la sesion (repetible); por defecto, el padre de "
                             "--root. Solo aplica con --session-json")
    parser.add_argument("--allow-partial", action="store_true",
                        help="sale 0 aunque algun aviso del pre-flight "
                             "bloquee; sin esto, un bloqueante sale 3")
    parser.add_argument("--title", default="Relevo de sesion")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT)
    args = parser.parse_args(argv)

    transcript = args.transcript
    if not transcript:
        # thyrox-rename: keep — el id de la sesión anfitriona
        found = transcript_for(os.environ.get("CLAUDE_CODE_SESSION_ID", ""))
        transcript = str(found) if found else ""

    hooks = restart_needed(transcript)
    print(f"hooks del arbol que dispararon: {hooks['matched']} "
          f"de {hooks['seen']} resumen(es) de hook")

    from session import user_wiring  # noqa: PLC0415
    live_settings_path = user_wiring.live_settings(pathlib.Path(args.root))
    live_wiring = (json.loads(live_settings_path.read_text(encoding="utf-8"))
                  if live_settings_path.exists() else {})
    drift = user_wiring.wiring_drift(
        live_wiring, user_wiring.declared_wiring(pathlib.Path(args.root)))
    verdict = wiring_verdict(hooks, drift)
    if verdict == "instalar primero":
        pending = sorted({command for sides in drift.values()
                          for command in sides.get("only_declared", [])})
        print("veredicto: INSTALAR PRIMERO — declarado y no instalado: "
              + "; ".join(pending))
        print("settings.local.json no viaja al contenedor nuevo: un relevo "
              "ahora lo dejaria igual de no instalado.")
    elif verdict is None:
        print("veredicto: NO PUDE MEDIR — no hay transcript que leer "
              f"({transcript or 'ninguno derivado'}). Un rojo sobre cero "
              f"resumenes no es un rojo: propondria relevar, que cuesta el "
              f"contexto de esta sesion, sin haber mirado nada.")
        return 2
    else:
        print("veredicto: "
              + ("HACE FALTA relevar" if verdict == "relevar"
                 else "NO hace falta: los gates ya disparan"))

    if args.session_json:
        session = json.loads(
            pathlib.Path(args.session_json).read_text(encoding="utf-8"))
        environment = session_environment(session)
        sources = session_sources(session)
        clone_roots = args.clone_root or [
            str(pathlib.Path(args.root).resolve().parent)]
        repos = [resolve_repo(source, clone_roots) for source in sources]

        live = pathlib.Path(args.root).parent / ".claude" / "settings.local.json"
        warnings = preflight_warnings(
            repos, live_settings=live,
            env_path=pathlib.Path(args.root) / ".env",
            venv_path=pathlib.Path(args.root) / ".venv")
        print("\navisos del pre-flight (sin veredicto sobre el relevo):")
        if not warnings:
            print("  ninguno")
        for warning in warnings:
            label = "BLOQUEA" if warning["blocking"] else "no bloquea"
            print(f"  [{label}] {warning['message']}")
        blocking = any(warning["blocking"] for warning in warnings)

        try:
            payload = build_multi_payload(
                environment=environment, repos=repos, title=args.title,
                transcript=transcript, base_prompt=args.prompt)
        except RestartError as exc:
            print(f"\nno se pudo componer la carga util: {exc}")
            return 3 if blocking and not args.allow_partial else 1

        print("\ncarga util para create_session:")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        print("\nEste guion PREPARA el relevo; no lo emite. La llamada la hace "
              "quien tenga la herramienta, con esta carga util tal cual.")
        if blocking and not args.allow_partial:
            return 3
        return 0

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
