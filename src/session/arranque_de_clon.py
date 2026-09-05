#!/usr/bin/env python3
"""Deja a un clon recien descargado con los hooks de sesion cargados.

El problema
===========
El archivo que gobierna la sesion —``<raiz>/.claude/settings.local.json``— no
vive en ningun repositorio, y el mecanismo que lo sincroniza se dispara desde
**ese mismo archivo**. Su disparador esta del otro lado del hueco que cierra:
un clon que no lo tiene no puede obtenerlo sincronizando.

Este guion es el puente. Compone el archivo desde tres fuentes que SI estan
versionadas y lo escribe, con confirmacion previa.

De donde sale cada pieza
========================

``hooks``
    Del ``.claude/settings.json`` del repositorio, cuyas rutas son relativas, y
    de los disparadores de sincronizacion que declara el propio modulo
    ``sincronizar_settings_local``. Las dos con la raiz de ESTE clon, no la del
    contenedor donde se genero — un comando de hook cuya ruta no existe no se
    queja y no corre, que es el fallo silencioso ya medido.

``permissions.allow``
    De ``.claude-user/bitacora-de-aprobaciones.json``. Es la **bitacora de
    aprobaciones**, no la politica curada del repositorio: dos objetos con el
    mismo nombre cuya fusion ya costo una regresion. Ninguno absorbe al otro.

Union, nunca reemplazo
======================
Si la copia viva ya existe, sus aprobaciones se conservan: el resultado es la
union con las versionadas. Borrar un permiso que alguien concedio no es
sincronizar, es perder trabajo.

La confirmacion
===============
La escritura no es silenciosa. Se imprime el destino, el desglose de lo que va
a quedar y el delta contra lo que hay, y se pide confirmacion — salvo con
``--si``, que es como lo invoca un instalador desatendido.

Uso::

    arranque_de_clon.py                  # muestra y pregunta
    arranque_de_clon.py --si             # desatendido
    arranque_de_clon.py --solo-mostrar   # no escribe nunca
    arranque_de_clon.py --capturar       # copia viva -> bitacora versionada
"""

import argparse
import importlib.util
import json
import pathlib
import sys

DOCS_ROOT = pathlib.Path(__file__).resolve().parents[3]
PAYLOAD = DOCS_ROOT / ".claude-user" / "bitacora-de-aprobaciones.json"
REPO_SETTINGS = DOCS_ROOT / ".claude" / "settings.json"
SYNC_MODULE = DOCS_ROOT / ".claude" / "scripts" / "session" / "sincronizar_settings_local.py"

PLACEHOLDER_DOCS = "%%DOCS_ROOT%%"
PLACEHOLDER_ROOT = "%%RAIZ%%"
RELATIVE_PREFIX = ".claude/"


def load_sync_module():
    """Importa el sincronizador para reusar SU declaracion de disparadores.

    No se copian aqui: si el generador los cambia, este guion los toma del
    modulo emitido. Una segunda copia divergiria en silencio."""
    spec = importlib.util.spec_from_file_location("sync", SYNC_MODULE)
    if spec is None or spec.loader is None:
        raise SystemExit(f"ERROR — no se pudo importar {SYNC_MODULE}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def render(value, docs_root, root):
    """Sustituye los dos marcadores en cualquier estructura JSON.

    El de `docs_root` va primero: en el arbol por defecto es un prefijo mas
    largo que el de la raiz, y sustituir al reves lo partiria."""
    if isinstance(value, str):
        return value.replace(PLACEHOLDER_DOCS, str(docs_root)) \
                    .replace(PLACEHOLDER_ROOT, str(root))
    if isinstance(value, list):
        return [render(item, docs_root, root) for item in value]
    if isinstance(value, dict):
        return {k: render(v, docs_root, root) for k, v in value.items()}
    return value


def to_placeholders(value, docs_root, root):
    """La direccion inversa: rutas absolutas -> marcadores.

    `docs_root` primero por la misma razon, aqui invertida: si se sustituyera
    la raiz antes, la ruta del clon quedaria mitad marcador y mitad literal."""
    if isinstance(value, str):
        return value.replace(str(docs_root), PLACEHOLDER_DOCS) \
                    .replace(str(root), PLACEHOLDER_ROOT)
    if isinstance(value, list):
        return [to_placeholders(item, docs_root, root) for item in value]
    if isinstance(value, dict):
        return {k: to_placeholders(v, docs_root, root) for k, v in value.items()}
    return value


def absolutise(command, docs_root):
    """Vuelve absoluta la ruta del script de un comando de hook."""
    return " ".join(
        str(docs_root / token) if token.startswith(RELATIVE_PREFIX) else token
        for token in command.split()
    )


def build_hooks(repo_settings, sync_hooks, docs_root):
    """El bloque `hooks` como debe verse en la copia viva de ESTE clon."""
    hooks = {}
    for event, matchers in (repo_settings.get("hooks") or {}).items():
        rebuilt = []
        for matcher in matchers:
            entry = {k: v for k, v in matcher.items() if k != "hooks"}
            entry["hooks"] = [
                {**hook, "command": absolutise(hook["command"], docs_root)}
                for hook in matcher.get("hooks", [])
            ]
            rebuilt.append(entry)
        hooks[event] = rebuilt
    for event, entries in sync_hooks.items():
        hooks.setdefault(event, [])
        hooks[event].extend(entries)
    return hooks


def count_commands(hooks):
    """Cuantos comandos declara el bloque, contados sobre la estructura.

    Contar lineas con `"command"` mide otra cosa — una entrada puede ocupar
    varias lineas o compartir una."""
    return sum(len(m.get("hooks", [])) for arr in hooks.values() for m in arr)


def unresolved(hooks, docs_root):
    """Los comandos cuyo SCRIPT no existe en el disco.

    Es el control que hace util a este guion: un hook cuyo script no existe
    no se queja y no corre, asi que sin este conteo la instalacion se ve
    igual cuando funciona y cuando no.

    Se mide el PRIMER token bajo la raiz, que es el script; los siguientes
    son argumentos y su ausencia no impide que el hook corra. La version
    anterior media los tokens de un comando por igual, y por eso avisaba de
    `--base .../settings_local.base.json` en TODO clon nuevo: ese archivo
    esta git-ignored por diseno y su consumidor lo siembra en la primera
    sincronizacion. Un aviso que suena siempre deja de ser un aviso."""
    missing = []
    for arr in hooks.values():
        for matcher in arr:
            for hook in matcher.get("hooks", []):
                bajo_raiz = [t for t in hook["command"].split()
                             if t.startswith(str(docs_root))]
                if bajo_raiz and not pathlib.Path(bajo_raiz[0]).exists():
                    missing.append(bajo_raiz[0])
    return missing


def load_json(path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError as error:
        raise SystemExit(f"ERROR — JSON invalido en {path}: {error}")


def save_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")


def capture(live_path, docs_root, root):
    """Copia viva -> bitacora versionada, con marcadores en vez de rutas."""
    live = load_json(live_path)
    if live is None:
        raise SystemExit(f"ERROR — no hay copia viva en {live_path}")
    allow = sorted(live.get("permissions", {}).get("allow", []))
    payload = {
        "_comentario": [
            "Bitacora de aprobaciones versionada (DEC-12). NO es la politica",
            "curada del repositorio: esa vive en .claude/settings.json con su",
            "defaultMode, ask y deny, y este archivo no la toca.",
            "Se regenera con: python3 .claude/scripts/session/arranque_de_clon.py --capturar",
        ],
        "allow": to_placeholders(allow, docs_root, root),
    }
    previous = load_json(PAYLOAD)
    save_json(PAYLOAD, payload)
    before = len((previous or {}).get("allow", []))
    print(f"OK: {len(allow)} aprobacion(es) en {PAYLOAD}")
    print(f"    antes: {before} · ahora: {len(allow)} · delta: {len(allow) - before:+d}")
    return 0


def describe(destination, hooks, allow_final, allow_live, allow_payload, missing):
    """El aviso que se muestra ANTES de escribir."""
    print("Arranque de clon — esto es lo que se va a escribir:\n")
    print(f"  destino: {destination}")
    print(f"  hooks:   {len(hooks)} evento(s) · {count_commands(hooks)} comando(s)")
    for event in sorted(hooks):
        print(f"             {event:16s} {count_commands({event: hooks[event]})}")
    print(f"  permissions.allow: {len(allow_final)} regla(s)")
    print(f"             versionadas: {len(allow_payload)}"
          f" · ya presentes: {len(allow_live)}"
          f" · nuevas: {len(allow_final) - len(allow_live)}")
    if missing:
        print(f"\n  AVISO — {len(missing)} comando(s) cuyo script no existe:")
        for token in sorted(set(missing))[:10]:
            print(f"             {token}")
        print("           Un hook cuyo script no existe no se queja y no corre.")
    print()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--raiz", type=pathlib.Path, default=None,
                        help="raiz de proyecto de la sesion "
                             "(por defecto: el directorio que contiene el clon)")
    parser.add_argument("--si", action="store_true",
                        help="no preguntar; escribir directamente")
    parser.add_argument("--solo-mostrar", action="store_true",
                        help="mostrar lo que haria y salir sin escribir")
    parser.add_argument("--capturar", action="store_true",
                        help="copia viva -> bitacora versionada")
    parser.add_argument("--docs-root", type=pathlib.Path, default=DOCS_ROOT,
                        help="raiz del clon de docs (para pruebas)")
    args = parser.parse_args(argv)

    docs_root = args.docs_root.resolve()
    root = (args.raiz or docs_root.parent).resolve()
    live_path = root / ".claude" / "settings.local.json"

    if args.capturar:
        return capture(live_path, docs_root, root)

    repo_settings = load_json(REPO_SETTINGS)
    if repo_settings is None:
        raise SystemExit(f"ERROR — no existe {REPO_SETTINGS}")
    payload = load_json(PAYLOAD)
    if payload is None:
        raise SystemExit(
            f"ERROR — no existe {PAYLOAD}. Se genera con --capturar; sin el, "
            "este guion NO emite un archivo a medias: quedaria sin las "
            "aprobaciones y la sesion pediria confirmacion en cada paso.")

    sync = load_sync_module()
    sync_hooks = render(to_placeholders(sync.SYNC_HOOKS, sync.REPO_ROOT,
                                        sync.REPO_ROOT.parent),
                        docs_root, root)
    hooks = build_hooks(repo_settings, sync_hooks, docs_root)

    allow_payload = render(payload.get("allow", []), docs_root, root)
    live = load_json(live_path) or {}
    allow_live = live.get("permissions", {}).get("allow", [])
    allow_final = sorted(set(allow_live) | set(allow_payload))

    missing = unresolved(hooks, docs_root)
    describe(live_path, hooks, allow_final, allow_live, allow_payload, missing)

    if args.solo_mostrar:
        print("  --solo-mostrar: no se escribio nada.")
        return 0
    if not args.si:
        if not sys.stdin.isatty():
            print("  Sin terminal y sin --si: no se escribio nada.")
            return 1
        if input("  ¿Escribir? [s/N] ").strip().lower() not in ("s", "si", "sí"):
            print("  Cancelado; no se escribio nada.")
            return 1

    resultado = dict(live)
    resultado["hooks"] = hooks
    permissions = dict(resultado.get("permissions", {}))
    permissions["allow"] = allow_final
    resultado["permissions"] = permissions
    save_json(live_path, resultado)
    print(f"OK: {live_path} — {count_commands(hooks)} comando(s), "
          f"{len(allow_final)} regla(s)")
    return 2 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
