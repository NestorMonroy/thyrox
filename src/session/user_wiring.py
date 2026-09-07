#!/usr/bin/env python3
"""El cableado de hooks del usuario: declarado en thyrox, medido contra el disco.

thyrox es el PRODUCTOR del multi-repo, asi que el cableado que el cliente
carga tiene que existir aqui como fuente. Hasta hoy no existia en ningun
repo: medido 2026-09-07, el unico `advisorModel` de los seis clones vivia
dentro de un artefacto de sonda del 2026-09-02.

Y llevaba una ruta muerta sin que nada lo dijera: `PreModelSwitch` apuntaba a
`kaupamex-docs/.claude/packages/agent/bin/preModelSwitch.ts`, AUSENTE — el real
esta en `thyrox/src/packages/agent/bin/`. Ese hook estaba muerto. Medido por
este mismo modulo: **1 roto sobre 6 comandos**.

Una segunda ruta ausente —`kaupamex-docs/.claude/scripts/session/`— vive en el
FUENTE de `sync_local_settings.py`, no en la copia viva. Son dos cosas
distintas y al describirlas juntas dije «dos rutas muertas en la copia viva»,
que es falso: este control ve una.

Nada lo delataba porque el cliente no avisa: un hook cuyo comando no existe
falla en silencio y el turno sigue. `broken_targets` es el control que faltaba
— la misma forma que #252 pide para el `bin`.

*Metrica:* primer argumento con pinta de ruta de cada `command`, comprobado
con `os.path.exists`.
*Ciega a:* un comando que resuelva su objetivo por `PATH` o lo construya en
tiempo de ejecucion; y a que el archivo exista pero no sea ejecutable ni
correcto. Mide presencia, no salud.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from paths.reach import thyrox_root  # noqa: E402

#: El archivo que el lanzador remoto carga. El cwd de la sesion es
#: `/home/user`, no un clon, asi que este es el unico settings de proyecto que
#: pesa — por eso el cableado no puede vivir solo en el `.claude` de un repo.
#:
#: Se DERIVA del arbol, no de `Path.home()`. La primera version usaba
#: `Path.home()` y aterrizaba en `/root/.claude/`, porque HOME es `/root`
#: mientras el cwd es `/home/user`: el control publico «0 rotos sobre 0
#: comandos» — un verde que no medio nada, sobre el archivo que existe a dos
#: directorios de distancia. Es el sub-patron D de
#: `metrica-decide-la-conclusion.md` dentro del instrumento escrito para
#: cerrar otro caso del mismo patron.
LIVE_SETTINGS_VAR = "THYROX_LIVE_SETTINGS"


def live_settings(root: Path | None = None) -> Path:
    """El settings del lanzador: declarado, o derivado del arbol de clones."""
    declarado = os.environ.get(LIVE_SETTINGS_VAR)
    if declarado:
        return Path(declarado)
    base = Path(root) if root else Path(thyrox_root())
    return base.parent / ".claude" / "settings.local.json"


def declared_wiring(root: Path | None = None) -> dict:
    """El cableado que thyrox declara, con sus rutas resueltas a este arbol."""
    base = Path(root) if root else Path(thyrox_root())
    consumer = base.parent / "kaupamex-docs"

    def cmd(command: str, timeout: int | None = None) -> dict:
        entrada = {"type": "command", "command": command}
        if timeout is not None:
            entrada["timeout"] = timeout
        return entrada

    # Los tres primeros son envoltorios que hoy viven en el consumidor; su
    # MECANISMO ya vive aqui (`src/agents/register_session.py`,
    # `src/agents/measure_delta.py`). Se declaran donde estan, no donde
    # gustaria que estuvieran: una declaracion que apunte a un archivo que no
    # existe es exactamente el defecto que este modulo cierra.
    hooks = f"{consumer}/.claude/hooks"
    return {
        "hooks": {
            "SubagentStart": [{"hooks": [
                cmd(f"python3 {hooks}/medir_delta_subagente.py --start"),
                cmd(f"python3 {hooks}/register_agent_session.py --start"),
            ]}],
            "PreModelSwitch": [{"hooks": [
                # Repuntado a thyrox: la copia viva apunta al consumidor, donde
                # el archivo NO existe, y el hook esta muerto por eso.
                cmd(f"bun run {base}/src/packages/agent/bin/preModelSwitch.ts", timeout=10),
            ]}],
            "SubagentStop": [{"hooks": [
                cmd(f"node {hooks}/save-agent-result.mjs"),
                cmd(f"python3 {hooks}/medir_delta_subagente.py --stop"),
                cmd(f"python3 {hooks}/register_agent_session.py --stop"),
            ]}],
        },
        "advisorModel": "claude-fable-5-1",
    }


def _target_of(command: str) -> str | None:
    """La ruta que el comando invoca, o None si no nombra ninguna."""
    for pieza in command.split():
        if pieza.startswith("/"):
            return pieza
    return None


def broken_targets(settings: dict) -> list[dict]:
    """Los comandos cuya ruta declarada no existe, con su evento."""
    rotos = []
    for evento, grupos in (settings.get("hooks") or {}).items():
        for grupo in grupos:
            for entrada in grupo.get("hooks", []):
                ruta = _target_of(entrada.get("command", ""))
                if ruta and not os.path.exists(ruta):
                    rotos.append({"event": evento, "path": ruta,
                                  "command": entrada["command"]})
    return rotos


def main() -> int:
    ruta = live_settings()
    if not ruta.exists():
        # REHUSA en vez de publicar un cero. Un «0 rotos» sobre un archivo que
        # no se encontro no se distingue de un «0 rotos» sobre uno sano, y esa
        # confusion es el defecto que este modulo existe para no repetir.
        print(f"ERROR — no se encuentra el cableado vivo en {ruta}. "
              f"Declaralo con {LIVE_SETTINGS_VAR}. NO se emite conteo: un 0 "
              f"aqui seria un verde falso.", file=sys.stderr)
        return 2
    viva = json.loads(ruta.read_text())
    rotos_vivos = broken_targets(viva)
    rotos_declarados = broken_targets(declared_wiring())
    n_viva = sum(len(g.get("hooks", [])) for gs in (viva.get("hooks") or {}).values() for g in gs)

    for r in rotos_vivos:
        print(f"  roto en la copia viva  {r['event']:16} {r['path']}", file=sys.stderr)
    for r in rotos_declarados:
        print(f"  roto en lo declarado   {r['event']:16} {r['path']}", file=sys.stderr)
    print(f"{len(rotos_vivos)} roto(s) en la copia viva sobre {n_viva} comandos "
          f"({ruta}) · {len(rotos_declarados)} en lo que thyrox declara")
    return 1 if rotos_declarados else 0


if __name__ == "__main__":
    raise SystemExit(main())
