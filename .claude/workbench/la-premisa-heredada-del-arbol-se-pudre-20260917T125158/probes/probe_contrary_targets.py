#!/usr/bin/env python3
"""Mide de donde viene la premisa del control de topologia contraria.

El control afirma que «los seis archivos de la otra topologia existen», y esa
afirmacion la HEREDA del arbol del consumidor: la topologia contraria compone
`h = <consumidor>/.claude/hooks` y nombra tres guiones ahi.

Esta sonda separa dos lecturas del rojo:

(a) un archivo se RETIRO — el mecanismo desaparecio del consumidor;
(b) un archivo se RENOMBRO — el mecanismo sigue, con otro nombre.

Las dos dan el mismo `no existe`, y solo la segunda dice que la premisa se
pudre por una causa que va a volver a ocurrir.
"""

from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "src"))

from paths import reach  # noqa: E402

CONSUMER = reach.root("docs")
HOOKS = CONSUMER / ".claude" / "hooks"

#: Los tres que la topologia contraria nombra bajo `h`, verbatim.
NAMED = ("medir_delta_subagente.py", "register_agent_session.py",
         "save-agent-result.mjs")


def main() -> int:
    print("== los tres nombres que la topologia contraria compone bajo h ==")
    for name in NAMED:
        print(f"  {str((HOOKS / name).is_file()):5}  {name}")

    print()
    print("== que hay de verdad en el hooks del consumidor ==")
    present = sorted(p.name for p in HOOKS.glob("*")) if HOOKS.is_dir() else []
    for name in present:
        print(f"  {name}")

    print()
    print("== el cableado VIVO del consumidor ==")
    settings = CONSUMER / ".claude" / "settings.json"
    datos = json.loads(settings.read_text(encoding="utf-8"))
    for event, groups in datos.get("hooks", {}).items():
        for group in groups:
            for hook in group.get("hooks", []):
                comando = hook.get("command", "")
                if ".claude/hooks/" in comando:
                    print(f"  {event}: {comando}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
