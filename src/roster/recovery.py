#!/usr/bin/env python3
"""Qué se hace con un subagente terminado, y cuándo.

`delivery` separa los desenlaces de un transcript cerrado; este módulo decide
la acción. El mecanismo de reactivación es del cliente: `SendMessage` al id de
un subagente terminado lo retoma desde su transcript, con su contexto. Lo que
faltaba era saber cuándo sirve:

- **entregó** → recoger su informe;
- **cortado** a media herramienta → reanudarlo para que termine;
- **error de API 429** → reanudarlo ya, y medir. La hora `quotaLimits.resetsAt`
  se publica como dato, no como espera: medido 2026-09-27, cinco subagentes
  rechazados con `rateLimitType: seven_day` y reinicio declarado a tres días
  se retomaron una hora después, en el mismo modelo, sin 429. Si la
  reanudación repite el error, el transcript lo registra y el roster lo
  vuelve a clasificar;
- **error de API 400** → relanzarlo con el prompt corregido: reanudar repite
  la misma petición inválida;
- **indecidible** → leer el transcript; el instrumento no puede decidir.

*Métrica:* el último mensaje `assistant` del transcript y su `quotaLimits`.
*Ciega a:* si la cuota se liberó antes por otra vía (un plan cambiado): la
hora publicada es la que el servidor declaró al rechazar.
"""
from __future__ import annotations

import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from roster import delivery

COLLECT = "collect"
RESUME = "resume"
RELAUNCH = "relaunch"
INSPECT = "inspect"
ACTIONS = (COLLECT, RESUME, RELAUNCH, INSPECT)


@dataclass(frozen=True)
class Recovery:
    action: str
    reason: str
    #: Desde cuándo tiene sentido reanudar (época Unix), o `None`.
    retry_at: int | None = None


def iso(epoch: int) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _api_error(entry: dict, now: float) -> Recovery:
    status = entry.get("apiErrorStatus")
    if status != 429:
        return Recovery(RELAUNCH, f"la API rehusó la petición con {status}: reanudar la repite; "
                                  "relanzar con el prompt corregido")
    raw_quota = entry.get("quotaLimits")
    quota: dict = raw_quota if isinstance(raw_quota, dict) else {}
    resets_at = quota.get("resetsAt")
    kind = quota.get("rateLimitType", "desconocido")
    if isinstance(resets_at, int) and resets_at > now:
        return Recovery(RESUME, f"límite de uso {kind}: reanudar (SendMessage) y medir; si repite "
                                f"el 429, el servidor declaró reinicio en {iso(resets_at)}",
                        retry_at=resets_at)
    return Recovery(RESUME, f"límite de uso {kind} ya reiniciado o sin hora: reanudar (SendMessage)",
                    retry_at=resets_at if isinstance(resets_at, int) else None)


def plan(text: str, now: float | None = None) -> Recovery:
    """La acción para un transcript YA CERRADO (misma precondición que `delivery`)."""
    moment = time.time() if now is None else now
    verdict = delivery.classify(text)
    if verdict == delivery.DELIVERED:
        return Recovery(COLLECT, "entregó: recoger su informe")
    if verdict == delivery.CUT:
        return Recovery(RESUME, "cortado a media herramienta: reanudar (SendMessage) para que termine")
    if verdict == delivery.API_ERROR:
        entry = delivery.last_assistant(text) or {}
        return _api_error(entry, moment)
    return Recovery(INSPECT, "indecidible: leer el transcript antes de actuar")


def main(argv: list[str]) -> int:
    """`recovery.py <transcript>` imprime acción, desde-cuándo y razón, separados por tabulador."""
    if len(argv) != 1:
        print("uso: recovery.py <transcript>", file=sys.stderr)
        return 2
    try:
        with open(argv[0], encoding="utf-8", errors="ignore") as handle:
            text = handle.read()
    except OSError as exc:
        print(f"recovery: no se pudo leer {argv[0]}: {exc}", file=sys.stderr)
        return 2
    r = plan(text)
    print(f"{r.action}\t{iso(r.retry_at) if r.retry_at else '-'}\t{r.reason}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
