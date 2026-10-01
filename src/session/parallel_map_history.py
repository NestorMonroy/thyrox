"""El historial de `parallel_map`: la memoria medida de un comando repartido.

`parallel_map` corre cada ítem bajo GNU Time y deja sus `<n>.time`; este
módulo los graba —con `pool_history.record`, el mismo formato que los pools—
en un historial por TEXTO DE COMANDO, y la ejecución siguiente del mismo
comando deriva de la última fila cuánta memoria reservar por ítem y cuántos
caben a la vez (`pool_history.derive_memory`).

Qué hace `parallel_map` con esa cifra NO lo decide este módulo: la reserva
entre procesos concurrentes es del registro de admisión, no de una medición.

La RAM disponible con que se deriva el tope es la efectiva
(`resource_admission.effective_available_ram_kb`): la del cgroup cuando el
proceso corre bajo un límite, `MemAvailable` si no.

Métrica: memoria residente pico por ítem, de GNU Time, por comando.
Ciega a: dos invocaciones del mismo comando sobre ítems de peso muy distinto
—comparten historial— y a la memoria de los hijos que el ítem no espera.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import sys
from pathlib import Path

from cache.paths import cache_dir
from session import pool_history, resource_admission

HISTORY_DIR_VAR = "THYROX_PARALLEL_MAP_HISTORY_DIR"


def history_base() -> Path:
    declared = os.environ.get(HISTORY_DIR_VAR)
    return Path(declared) if declared else cache_dir() / "parallel-map"


def command_history_dir(base: Path, command: str) -> Path:
    """Un historial por texto de comando: el mismo comando con otros ítems
    comparte medida; otro comando, no."""
    return Path(base) / f"command-{hashlib.sha256(command.encode()).hexdigest()[:12]}"


def effective_ram_kb(args: argparse.Namespace) -> int | None:
    """La RAM que este proceso puede repartir: la del cgroup si corre bajo un
    límite, ``MemAvailable`` si no. Un ``parallel_map`` anidado dentro de un
    contenedor no promete la memoria del anfitrión."""
    view = resource_admission.CgroupView(args.self_cgroup, args.cgroup_root)
    return resource_admission.effective_available_ram_kb(args.meminfo or resource_admission.meminfo_path(), view)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="parallel_map_history", description=(__doc__ or "").splitlines()[0])
    sub = parser.add_subparsers(dest="action", required=True)
    p_dir = sub.add_parser("dir", help="imprime el historial de un comando")
    p_dir.add_argument("command")
    p_rec = sub.add_parser("record", help="graba la fila de una ejecución medida")
    p_rec.add_argument("history"); p_rec.add_argument("run_dir")
    p_der = sub.add_parser("derive", help="imprime memfree, tope, reserva en kB y porqué, por tabuladores")
    p_der.add_argument("history")
    p_der.add_argument("--margin", type=float, default=pool_history.DEFAULT_MARGIN)
    p_der.add_argument("--available-ram-kb", type=int, default=None)
    p_der.add_argument("--meminfo", type=Path, default=None, help="de dónde se lee MemAvailable")
    p_der.add_argument("--self-cgroup", type=Path, default=resource_admission.SELF_CGROUP,
                       help="la pertenencia a cgroups cuyo límite acota la RAM libre")
    p_der.add_argument("--cgroup-root", type=Path, default=resource_admission.DEFAULT_CGROUP_ROOT)
    args = parser.parse_args(argv)

    if args.action == "dir":
        print(command_history_dir(history_base(), args.command))
        return 0
    if args.action == "record":
        pool_history.record(Path(args.history), Path(args.run_dir))
        return 0
    ram = args.available_ram_kb if args.available_ram_kb is not None else effective_ram_kb(args)
    decision = pool_history.derive_memory(Path(args.history), args.margin, available_ram_kb=ram)
    ram_cap = "" if decision.ram_cap is None else str(decision.ram_cap)
    need_kb = "" if decision.need_kb is None else str(decision.need_kb)
    print(f"{decision.memfree or ''}\t{ram_cap}\t{need_kb}\t{decision.why}{decision.cap_why}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
