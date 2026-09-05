#!/usr/bin/env python3
"""drenar_carrete.py — reenvia los eventos que la escritura al store perdio.

La otra mitad del *disk-persistent retry* de ``heng: part7/ch29.md`` §29.3.
``hook_error_log._spool`` apenda el evento cuando la escritura falla; este
guion lo relee al arrancar la sesion y lo retransmite.

Por que existe. El envoltorio de los hooks nunca rompe el flujo — es el
criterio de ch29 para la telemetria y no esta en discusion. Pero "no romper"
se habia implementado como "descartar": el fallo quedaba en un log de prosa
para que alguien lo leyera, y el dato no volvia. Con el carrete, el evento
sobrevive al fallo y se reintenta solo.

Reintentar es seguro porque los dos comandos encolados son idempotentes:
``registrar-sesion`` y ``actualizar-sesion`` resuelven con ``COALESCE`` sobre
la misma clave, asi que reenviar uno ya aplicado no cambia la fila. Un
comando que no lo fuera NO debe encolarse — por eso ``spool=`` lo declara el
llamador y no se infiere del comando.

Tres desenlaces por evento, y los tres dejan rastro:

- **reenviado** — la escritura funciono; el evento sale del carrete.
- **pendiente** — volvio a fallar y le quedan intentos; se conserva con su
  contador incrementado y su ultimo error.
- **abandonado** — agoto ``HOOK_SPOOL_MAX_ATTEMPTS``; sale del carrete y su
  ultimo error queda en el log de prosa. Es el ``EGAVEUP`` de
  ``ccb: bgDaemon.ts:599-604``: un numero acotado de intentos, no infinitos.

Uso::

    python3 .claude/scripts/agents/drenar_carrete.py            # drena y reporta
    python3 .claude/scripts/agents/drenar_carrete.py --quiet    # solo la linea final
    python3 .claude/scripts/agents/drenar_carrete.py --dry-run  # no reenvia ni escribe
"""
from pathlib import Path
import argparse
import json
import os
import subprocess
import sys

HOOKS = Path(__file__).resolve().parents[2] / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))

from hook_error_log import _append, spool_path  # noqa: E402


def _max_attempts() -> int:
    try:
        return int(os.environ.get("HOOK_SPOOL_MAX_ATTEMPTS", 3))
    except ValueError:
        return 3


def _read(destino: Path) -> list:
    """Lee el carrete. Una linea corrupta se descarta, no aborta el drenado.

    El carrete lo escribe un hook bajo fallo — el escenario en que una
    escritura puede quedar a medias. Abortar por una linea rota perderia
    todas las demas, que es exactamente lo que este mecanismo evita.
    """
    if not destino.exists():
        return []
    eventos = []
    for linea in destino.read_text(encoding="utf-8").splitlines():
        if not linea.strip():
            continue
        try:
            evento = json.loads(linea)
        except json.JSONDecodeError:
            continue
        if isinstance(evento, dict) and evento.get("cmd"):
            eventos.append(evento)
    return eventos


def _write(destino: Path, eventos: list) -> None:
    """Reescribe el carrete de forma atomica: temporal y luego rename.

    Un corte a media escritura sobre el archivo definitivo dejaria el carrete
    truncado, perdiendo los eventos que aun no se habian reenviado.
    """
    if not eventos:
        destino.unlink(missing_ok=True)
        return
    temporal = destino.with_suffix(destino.suffix + ".tmp")
    temporal.write_text(
        "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in eventos),
        encoding="utf-8",
    )
    temporal.replace(destino)


def drain(dry_run: bool = False) -> dict:
    """Reenvia cada evento del carrete. Devuelve el conteo por desenlace."""
    destino = spool_path()
    eventos = _read(destino)
    tope = _max_attempts()
    reenviados = abandonados = 0
    quedan = []

    for evento in eventos:
        if dry_run:
            quedan.append(evento)
            continue
        cmd = [str(c) for c in evento["cmd"]]
        try:
            resultado = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30)
            ok, detalle = resultado.returncode == 0, resultado.stderr
        except Exception as exc:
            ok, detalle = False, str(exc)

        if ok:
            reenviados += 1
            continue

        evento["attempts"] = int(evento.get("attempts", 0)) + 1
        evento["last_error"] = (detalle or "").strip()[:500]
        if evento["attempts"] >= tope:
            abandonados += 1
            _append("drenar_carrete.py", cmd, None,
                    f"abandonado tras {evento['attempts']} intento(s): "
                    f"{evento['last_error']}")
        else:
            quedan.append(evento)

    if not dry_run:
        _write(destino, quedan)

    return {
        "medidos": len(eventos),
        "reenviados": reenviados,
        "pendientes": len(quedan),
        "abandonados": abandonados,
    }


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--quiet", action="store_true",
                   help="imprime sólo la línea de resumen")
    p.add_argument("--dry-run", action="store_true",
                   help="mide el carrete sin reenviar ni reescribirlo")
    args = p.parse_args()

    r = drain(dry_run=args.dry_run)
    # El denominador va junto al conteo: sin él, un carrete vacío y un
    # drenado que no pudo leer nada publican la misma cifra.
    print(
        f"drenar-carrete: {r['reenviados']} reenviados, "
        f"{r['pendientes']} pendientes, {r['abandonados']} abandonados "
        f"(alcance medido: {r['medidos']} evento(s) en el carrete)"
    )
    if not args.quiet and r["medidos"] == 0:
        print("  carrete vacío — ninguna escritura al store quedó sin entregar")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
