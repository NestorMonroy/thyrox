#!/usr/bin/env python3
"""Puentea los hooks de los clones a la fuente viva de settings del harness.

El problema
-----------

Un hook sólo dispara si su comando está en una **fuente de settings** que el
cliente carga: usuario, proyecto (= el cwd de la sesión), local, flag o
política. El harness remoto lanza la sesión con cwd ``/home/user`` y monta los
clones como **directorios adicionales**: por esa vía cargan ``CLAUDE.md`` y
``.claude/rules/``, **no los hooks** (:ref:`h-docs-1010`). El
``.claude/settings.json`` de cada clon queda declarado y sin efecto.

La forma de la solución es la misma que ``reach_roots.py``: **una sola
declaración de ubicaciones, resuelta al consultarla**. Aquí lo resuelto no son
raíces sino comandos — el comando relativo de cada clon se absolutiza contra su
raíz y se deposita en la fuente que el cliente sí lee.

Tres restricciones que el censo midió, y que este guion respeta
---------------------------------------------------------------

1. **No se deduplica por nombre de archivo.** Tres guiones existen en dos
   clones con el **mismo nombre y cuerpo distinto** — medido por sha256 en
   ``.claude/eventos/censo-hooks-inertes-*``. Elegir una copia silenciaría a la
   otra. Cada comando se puentea con su ruta absoluta, por clon.

2. **Sólo se reescribe ``command``.** ``matcher`` y ``timeout`` viajan
   intactos: son el contrato del hook con el cliente, no la ubicación.

3. **``Stop`` queda fuera por defecto.** Siete de los hooks inertes son de ese
   evento y varios **bloquean** el fin del turno; su cadena tiene una conducta
   sin decidir (tarea **#95**). Puentearlos sin cerrar esa decisión activa una
   cadena bloqueante con un modo de fallo conocido. Se abre con
   ``--include-stop`` cuando #95 se cierre.

Y una cuarta que no es del censo sino del coste
------------------------------------------------

**Aplicar esto a mitad de sesión rompe la clave de caché del hilo.** Medido
(:ref:`h-docs-1012`): una recarga de ``settings.local.json`` fue seguida por un
turno que leyó **0** y escribió **778 297** tokens. Por eso el modo por defecto
es el diff: se aplica al arrancar una sesión o justo tras compactar, nunca con
cientos de miles de tokens cacheados.

Uso::

    python3 .claude/scripts/bridge_hooks.py              # diff, no escribe
    python3 .claude/scripts/bridge_hooks.py --apply      # escribe
    python3 .claude/scripts/bridge_hooks.py --include-stop --apply

Métrica: comandos de hook declarados en el ``.claude/settings.json`` de cada
raíz de ``reach_roots``, absolutizados contra su raíz.
Ciega a: si el cliente **carga** la fuente viva —eso lo prueba la conducta del
hook, no este guion—; a un hook declarado fuera de ese archivo; y al fallo de
un hook que sí dispara.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import signal
import sys

# Morir en silencio ante `| head`: un traceback de SIGPIPE se lee como
# fallo del guion cuando sólo es el lector que cerró.
signal.signal(signal.SIGPIPE, signal.SIG_DFL)

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import reach_roots  # noqa: E402

LAUNCHERS = ("python3", "python", "node", "bash", "sh", "bun run", "bun")

#: Eventos que NO se puentean por defecto, con la razón de su exclusión.
GATED_EVENTS = {
    "Stop": "cadena bloqueante con conducta sin decidir — tarea #95",
}

#: La clave que este guion posee dentro de la fuente viva. Todo lo demás del
#: archivo (p. ej. ``advisorModel``) se preserva sin tocar.
OWNED_KEY = "hooks"


def live_settings_path() -> pathlib.Path:
    """El settings que el cliente sí lee: el del cwd del PROCESO.

    Se deriva de ``/proc/<pid>/cwd`` cuando el harness publica el pid; el
    respaldo es ``/home/user``, que es lo medido en :ref:`h-docs-1010`.
    """
    override = os.environ.get("KX_BRIDGE_SETTINGS")
    if override:
        return pathlib.Path(override)
    cwd = pathlib.Path("/home/user")
    pid = os.environ.get("CLAUDE_PID")
    if pid and pid.isdigit():
        try:
            cwd = pathlib.Path(os.readlink(f"/proc/{pid}/cwd"))
        except OSError:
            pass
    return cwd / ".claude" / "settings.local.json"


def absolutize(command: str, root: pathlib.Path) -> str:
    """El comando relativo de un clon, resuelto contra su raíz.

    No se envuelve en ``cd <raíz> &&``: 26 de los 27 cuerpos ya se anclan solos
    (``BASH_SOURCE``, ``__file__``, ``reach_roots``), y un ``cd`` global
    escondería al que no lo haga en vez de delatarlo.
    """
    for launcher in LAUNCHERS:
        prefix = f"{launcher} .claude"
        if command.startswith(prefix):
            return command.replace(f"{launcher} .claude", f"{launcher} {root}/.claude", 1)
    return command


def bridged_hooks(include_stop: bool):
    """El bloque ``hooks`` que la fuente viva debería declarar.

    Conserva la forma del cliente —``{evento: [{matcher, hooks:[...]}]}``— y de
    cada hook copia todas sus claves, reescribiendo sólo ``command``.
    """
    merged: dict[str, list] = {}
    skipped: list[tuple[str, str, str]] = []
    for root in reach_roots.require_all().values():
        settings = root / ".claude" / "settings.json"
        if not settings.exists():
            continue
        declared = json.loads(settings.read_text()).get("hooks", {})
        for event, groups in declared.items():
            for group in groups:
                rewritten = []
                for hook in group.get("hooks", []):
                    command = hook.get("command", "")
                    if not command:
                        continue
                    if event in GATED_EVENTS and not include_stop:
                        skipped.append((root.name, event, command))
                        continue
                    copy = dict(hook)
                    copy["command"] = absolutize(command, root)
                    rewritten.append(copy)
                if not rewritten:
                    continue
                out = {k: v for k, v in group.items() if k != "hooks"}
                out["hooks"] = rewritten
                merged.setdefault(event, []).append(out)
    return merged, skipped


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true",
                        help="escribe la fuente viva (por defecto sólo muestra el diff)")
    parser.add_argument("--include-stop", action="store_true",
                        help="incluye los eventos con verja; hoy sólo Stop (#95)")
    parser.add_argument("--quiet", action="store_true",
                        help="sólo el conteo de deriva, para el audit de sesión")
    args = parser.parse_args(argv)

    target = live_settings_path()
    current = json.loads(target.read_text()) if target.exists() else {}
    merged, skipped = bridged_hooks(args.include_stop)

    total = sum(len(h["hooks"]) for groups in merged.values() for h in groups)

    if args.quiet:
        # La DERIVA: comandos que este puente declararía y la fuente viva aún
        # no lleva. Con su denominador, porque un 0 sin universo no distingue
        # «todo puenteado» de «no medí nada» (`metrica-decide-la-conclusion`).
        declared = {(event, h["command"])
                    for event, groups in merged.items()
                    for g in groups for h in g["hooks"]}
        live = {(e, h.get("command", "").strip())
                for e, groups in current.get(OWNED_KEY, {}).items()
                for g in groups for h in g.get("hooks", [])}
        drift = len(declared - live)
        # La unidad es el par (evento, comando) ÚNICO, no el comando: un mismo
        # guion declarado en dos grupos con matchers distintos es un solo par.
        print(f"{drift} sin puentear de {len(declared)} pares (evento, comando)"
              f"; {len(skipped)} con verja  [{target}]")
        print(drift)
        return 0

    print(f"fuente viva: {target}")
    print(f"comandos a puentear: {total}   eventos: {len(merged)}")
    if skipped:
        print(f"con verja, NO puenteados: {len(skipped)}")
        for event, reason in sorted(GATED_EVENTS.items()):
            n = sum(1 for _r, e, _c in skipped if e == event)
            if n:
                print(f"  {event}: {n} — {reason}")

    proposed = dict(current)
    proposed[OWNED_KEY] = merged
    foreign = sorted(k for k in current if k != OWNED_KEY)
    if foreign:
        print(f"claves ajenas preservadas: {', '.join(foreign)}")

    if proposed == current:
        # No tocar el archivo: su mtime dispara la recarga de settings, y esa
        # recarga es lo que cuesta la caché (:ref:`h-docs-1012`).
        print("\nsin cambios — la fuente viva ya declara exactamente esto")
        return 0

    before = json.dumps(current.get(OWNED_KEY, {}), indent=2, sort_keys=True, ensure_ascii=False)
    after = json.dumps(merged, indent=2, sort_keys=True, ensure_ascii=False)
    antes = len([1 for groups in current.get(OWNED_KEY, {}).values()
                 for g in groups for _ in g.get("hooks", [])])
    print(f"\ncomandos en la fuente hoy: {antes}  ->  tras el puente: {total}")

    if not args.apply:
        import difflib
        print("\n--- diff de la clave `hooks` (NO se escribió nada) ---")
        for line in difflib.unified_diff(before.splitlines(), after.splitlines(),
                                         "actual", "propuesto", lineterm="", n=1):
            print(line)
        print("\nPara escribirlo: --apply. Hacerlo al arrancar la sesión o justo\n"
              "tras compactar: recargar settings reescribe el contexto cacheado.")
        return 0

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(proposed, indent=2, ensure_ascii=False) + "\n")
    print(f"\nescrito: {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
