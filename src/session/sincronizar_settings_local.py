#!/usr/bin/env python3
"""Sincroniza el `settings.local.json` del cwd con su copia versionada.

Generado por `.claude/eventos/settings-local-20260821T110649/gen.py`. No editar a mano: corregir el
generador y volver a emitir, o el proximo cambio de configuracion borra la
correccion.

Por que no es una copia
=======================
El archivo tiene bloques con duenos distintos. `hooks` lo edita una persona en
el repositorio; `permissions` lo escribe el cliente durante la sesion. Copiar el
archivo entero en cualquiera de las dos direcciones destruye el trabajo del otro
lado, y lo hace en silencio.

Por que hace falta una base, y no basta comparar los dos lados
===============================================================
Con solo dos copias, «difieren» no dice quien cambio. Un bloque distinto puede
ser el repositorio que avanzo —hay que propagarlo— o la copia viva que alguien
edito —no hay que pisarla—. Las dos situaciones se ven identicas.

Por eso se guarda una BASE: el valor de cada bloque en la ultima sincronizacion
correcta. Con tres puntos la pregunta se responde:

    repositorio == base  y  viva != base   -> lo edito la copia viva
    repositorio != base  y  viva == base   -> avanzo el repositorio
    los dos != base                        -> conflicto
    los dos == base                        -> nada que hacer

Sin la base, el tercer caso es indistinguible de los otros dos y el mecanismo
elige uno al azar. Esa eleccion silenciosa es exactamente el fallo que este
mecanismo existe para no cometer.

Y cuando el bloque NO esta todavia en la base —instalacion nueva, o un bloque
que acaba de aparecer— no hay historia con que arbitrar, asi que gobierna el
dueno declarado. Llamarlo conflicto seria un falso positivo que dispara en cada
instalacion; de este modo la primera sincronizacion ademas siembra la base.

El control
==========
Un conflicto y una edicion por el lado equivocado NO se resuelven: se reportan y
el guion sale distinto de cero. Un sincronizador que siempre sale 0 no informa
—pasaria igual con los dos lados intactos que con uno perdido—, y esa es la
forma del control que no discrimina.

Uso::

    sincronizar_settings_local.py                      # reporta, no escribe
    sincronizar_settings_local.py --aplicar            # escribe lo que decide
    sincronizar_settings_local.py --direccion repositorio   # solo repo -> viva
    sincronizar_settings_local.py --direccion viva          # solo viva -> repo
"""

import argparse
import json
import pathlib
import sys

# Dueno de cada bloque. Derivado de `datos_bloques.py` del evento generador.
BLOCK_OWNER = {
    "hooks": "repositorio",
    "effortLevel": "no-replicado",
    "env": "no-replicado",
    "permissions": "no-replicado"
}

# Un bloque que no este aqui no se toca en ninguna direccion: se reporta.
UNKNOWN_POLICY = "reportar y no tocar"

# --------------------------------------------------------------------------
# La PROYECCION del bloque `hooks`, y por que el sincronizador la necesita.
#
# El bloque `hooks` de la copia viva no es el del repositorio: es su proyeccion
# —rutas absolutas mas los disparadores de esta misma sincronizacion—. Copiar
# el bloque crudo del repositorio encima de la copia viva borra el mecanismo en
# su primer disparo. Medido antes de instalar: 5 disparadores -> 0, y 16
# comandos vuelven a ruta relativa, que es el defecto que este evento vino a
# reparar.
#
# Por eso la proyeccion vive aqui tambien, emitida por el generador con los
# mismos valores: comparar y propagar usan `project_repo_hooks`, no `repo`.
# --------------------------------------------------------------------------
REPO_ROOT = pathlib.Path('/home/user/kaupamex-docs')
RELATIVE_PREFIX = '.claude/'
SYNC_HOOKS = {
    "ConfigChange": [
        {
            "hooks": [
                {
                    "type": "command",
                    "command": "python3 /home/user/kaupamex-docs/.claude/scripts/session/sincronizar_settings_local.py --repo /home/user/kaupamex-docs/.claude/settings.json --viva /home/user/.claude/settings.local.json --base /home/user/kaupamex-docs/.claude/agent-results/settings_local.base.json --aplicar --direccion viva"
                }
            ],
            "matcher": "local_settings"
        }
    ],
    "CwdChanged": [
        {
            "hooks": [
                {
                    "type": "command",
                    "command": "python3 /home/user/kaupamex-docs/.claude/scripts/session/sincronizar_settings_local.py --registrar-vigilancia --repo /home/user/kaupamex-docs/.claude/settings.json"
                }
            ]
        }
    ],
    "FileChanged": [
        {
            "hooks": [
                {
                    "type": "command",
                    "command": "python3 /home/user/kaupamex-docs/.claude/scripts/session/sincronizar_settings_local.py --repo /home/user/kaupamex-docs/.claude/settings.json --viva /home/user/.claude/settings.local.json --base /home/user/kaupamex-docs/.claude/agent-results/settings_local.base.json --aplicar --direccion repositorio"
                }
            ],
            "matcher": "settings.json"
        }
    ],
    "SessionStart": [
        {
            "hooks": [
                {
                    "type": "command",
                    "command": "python3 /home/user/kaupamex-docs/.claude/scripts/session/sincronizar_settings_local.py --repo /home/user/kaupamex-docs/.claude/settings.json --viva /home/user/.claude/settings.local.json --base /home/user/kaupamex-docs/.claude/agent-results/settings_local.base.json --aplicar --direccion repositorio"
                }
            ]
        }
    ],
    "Stop": [
        {
            "hooks": [
                {
                    "type": "command",
                    "command": "python3 /home/user/kaupamex-docs/.claude/scripts/session/sincronizar_settings_local.py --repo /home/user/kaupamex-docs/.claude/settings.json --viva /home/user/.claude/settings.local.json --base /home/user/kaupamex-docs/.claude/agent-results/settings_local.base.json --aplicar --direccion viva"
                }
            ]
        }
    ]
}


def load(path):
    """Lee un JSON que puede no existir todavia."""
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError as error:
        raise SystemExit(f"ERROR — JSON invalido en {path}: {error}")


def save(path, payload):
    """Escribe el JSON con salto final, como lo deja el cliente."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")


def absolutise(command, repo_root):
    """Vuelve absoluta la ruta del script de un comando de hook."""
    return " ".join(
        str(repo_root / token) if token.startswith(RELATIVE_PREFIX) else token
        for token in command.split()
    )


def project_repo_hooks(repo_hooks):
    """El bloque `hooks` del repositorio, tal como debe verse en la copia viva.

    Rutas absolutas mas los disparadores de la sincronizacion. Es lo que el
    generador emitio en el candidato; si esta funcion y aquella divergen, cada
    disparo reescribe la copia viva y el diff nunca converge."""
    hooks = {}
    for event, matchers in (repo_hooks or {}).items():
        rebuilt = []
        for matcher in matchers:
            entry = {k: v for k, v in matcher.items() if k != "hooks"}
            entry["hooks"] = [
                {**hook, "command": absolutise(hook["command"], REPO_ROOT)}
                for hook in matcher.get("hooks", [])
            ]
            rebuilt.append(entry)
        hooks[event] = rebuilt
    for event, entries in SYNC_HOOKS.items():
        hooks.setdefault(event, [])
        hooks[event].extend(entries)
    return hooks


def repo_view(block, repo):
    """El valor del repositorio TAL COMO debe verse en la copia viva.

    Para `hooks` es su proyeccion; para el resto, el bloque tal cual. Esta
    funcion es la que impide que el mecanismo se borre a si mismo."""
    if block == "hooks":
        return project_repo_hooks(repo.get("hooks"))
    return repo.get(block)


def decide(block, repo_value, live_value, base_value, base_tiene):
    """Devuelve (accion, motivo) para un bloque, con la base como arbitro.

    Las acciones son cuatro y ninguna sobreescribe a ciegas:
      `nada`       los tres coinciden, o el bloque no se replica
      `a_viva`     avanzo el repositorio; se propaga a la copia viva
      `a_repo`     avanzo la copia viva; se absorbe al repositorio
      `reportar`   conflicto, o edicion por el lado que no es dueno
    """
    owner = BLOCK_OWNER.get(block)
    if owner is None:
        return "reportar", f"bloque sin dueno declarado ({UNKNOWN_POLICY})"
    if owner == "no-replicado":
        # Distinto de «sin dueno»: aqui SI hay decision, y es que no viaja. Un
        # bloque asi no puede salir por el canal de error, porque un aviso que
        # suena en cada disparo deja de ser un aviso.
        return "nada", "bloque declarado no-replicado: su hogar es el repositorio"

    if repo_value == live_value:
        return "nada", "las dos copias coinciden"

    if not base_tiene:
        # Sin base para este bloque no hay historia con que arbitrar, y las dos
        # copias se ven «cambiadas» por igual: llamarlo conflicto es un falso
        # positivo que dispara en CADA instalacion nueva. Lo honesto es lo que
        # la tabla de duenos ya decidio — gobierna el dueno—, y de paso la
        # primera sincronizacion siembra la base.
        if owner == "repositorio":
            return "a_viva", "sin base todavia: gobierna el repositorio, su dueno"
        return "a_repo", "sin base todavia: gobierna la copia viva, su duena"

    repo_changed = repo_value != base_value
    live_changed = live_value != base_value

    if repo_changed and live_changed:
        return "reportar", "conflicto: las dos copias cambiaron desde la base"
    if owner == "repositorio":
        if repo_changed:
            return "a_viva", "avanzo el repositorio, que es su dueno"
        return "reportar", "la copia viva edito un bloque cuyo dueno es el repositorio"
    if live_changed:
        return "a_repo", "avanzo la copia viva, que es su dueno"
    return "reportar", "el repositorio edito un bloque cuyo dueno es la sesion"


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", type=pathlib.Path, required=True,
                        help="copia versionada")
    parser.add_argument("--viva", type=pathlib.Path,
                        help="copia que el cliente carga")
    parser.add_argument("--registrar-vigilancia", action="store_true",
                        help="emitir watchPaths y salir; NO sincroniza")
    parser.add_argument("--base", type=pathlib.Path,
                        help="instantanea de la ultima sincronizacion")
    parser.add_argument("--aplicar", action="store_true",
                        help="escribir; sin esto solo reporta")
    parser.add_argument("--direccion", choices=("repositorio", "viva", "ambas"),
                        default="ambas", help="acotar a una sola direccion")
    args = parser.parse_args(argv)

    if args.registrar_vigilancia:
        # El cliente registra la vigilancia leyendo `hookSpecificOutput` de un
        # hook de `CwdChanged` o de `FileChanged`; su esquema exige rutas
        # ABSOLUTAS. Este modo no toca ningun archivo: solo declara que hay que
        # mirar el settings.json del repositorio.
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "CwdChanged",
                "watchPaths": [str(args.repo.resolve())],
            }
        }))
        return 0

    if args.viva is None:
        parser.error("--viva es obligatorio salvo con --registrar-vigilancia")

    base_path = args.base or args.repo.with_suffix(".base.json")
    repo = load(args.repo) or {}
    live = load(args.viva) or {}
    base = load(base_path) or {}

    blocks = sorted(set(repo) | set(live) | set(base))
    pending, applied, reported = [], [], []

    for block in blocks:
        # `repo_view`, no `repo.get`: el bloque `hooks` viaja PROYECTADO.
        vista = repo_view(block, repo)
        # `block in base`, no `base.get(...) is not None`: un bloque presente
        # con valor nulo SI tiene historia, y confundirlo con la ausencia
        # devolveria el arbitraje al azar que la base existe para cerrar.
        action, reason = decide(block, vista, live.get(block),
                                base.get(block), block in base)
        if action == "nada":
            continue
        if action == "reportar":
            reported.append((block, reason))
            continue
        if args.direccion == "repositorio" and action != "a_viva":
            pending.append((block, action, "fuera de la direccion pedida"))
            continue
        if args.direccion == "viva" and action != "a_repo":
            pending.append((block, action, "fuera de la direccion pedida"))
            continue
        if not args.aplicar:
            pending.append((block, action, reason))
            continue
        if action == "a_viva":
            live[block] = vista
        else:
            repo[block] = live.get(block)
        base[block] = vista if action == "a_viva" else live.get(block)
        applied.append((block, action, reason))

    if args.aplicar and applied:
        save(args.viva, live)
        save(args.repo, repo)
        save(base_path, base)

    for block, action, reason in applied:
        print(f"aplicado  {block:<14} {action:<8} {reason}")
    for block, action, reason in pending:
        print(f"pendiente {block:<14} {action:<8} {reason}")
    for block, reason in reported:
        print(f"REPORTE   {block:<14} {'':<8} {reason}", file=sys.stderr)

    if not applied and not pending and not reported:
        print("sin diferencias entre las dos copias")

    # El control: un reporte no se traga. Si el guion saliera 0 aqui, su verde
    # no distinguiria «todo en orden» de «alguien perdio trabajo».
    return 1 if reported else 0


if __name__ == "__main__":
    raise SystemExit(main())
