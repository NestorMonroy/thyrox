"""El ciclo de vida de un ítem de pool: vive fuera del banco y se publica entero.

Por qué existe
--------------
Un ítem escribe su ``stream.jsonl``, su ``.err`` y su ``.time`` durante minutos.
Si escribe directamente en el directorio de salida —que suele vivir dentro de
un banco versionado—, ``git status`` lo ve a medio escribir y un consumidor
puede leer un ítem que aún no terminó. Aquí el ítem escribe en un directorio de
*runtime* (``$THYROX_RUNTIME_DIR/pool/<run-id>/``, ignorado por git) y sus
artefactos llegan a la salida sólo al cerrarse, por un publicador que deja
``<n>.closed`` como última escritura.

La visibilidad es lógica, no física
-----------------------------------
Mover N archivos no es atómico. Lo atómico es el ``rename`` final de
``<n>.closed``: un ítem existe para un consumidor si y sólo si ese archivo
existe, y su manifiesto enumera qué artefactos le pertenecen con su
``sha256``. Por eso todo consumidor consulta ``closed_items``/``is_closed`` y
nunca el ``glob`` de la salida.

Máquina de estados
------------------
``CREATED → RUNNING ⇄ SNAPSHOTTING → CLOSING → PUBLISHING → CLOSED``, más dos
estados de recuperación: ``ABANDONED_RECOVERABLE`` (el dueño murió antes de
publicar; su runtime se conserva) y ``PARTIALLY_PUBLISHED`` (una publicación se
interrumpió; ``reconcile`` la completa). Una transición que la tabla no admite
se rehúsa.

Generaciones
------------
Cada vez que un ítem se ejecuta sobre la misma salida recibe una generación
mayor que la última publicada. Una publicación cuya generación no supera la
que ya está cerrada se rehúsa sin mover nada: una recuperación tardía de la
generación N nunca pisa a N+1.

Publicación idempotente
-----------------------
El plan de publicación —generación, artefactos y su ``sha256``— se escribe en
el runtime ANTES de mover nada. Con el plan, cada paso se puede repetir: un
artefacto que ya está en la salida con el hash del plan no se vuelve a mover.
Un proceso que muere en medio deja el estado en ``PUBLISHING`` y ``reconcile``
retoma el mismo plan.

*Ciega a:* un escritor que no pertenece a la sesión del ítem y escribe en la
salida por su cuenta; eso lo mide ``writer_inspector``, no este módulo.
"""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import shutil
import sys
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

CREATED = "CREATED"
RUNNING = "RUNNING"
SNAPSHOTTING = "SNAPSHOTTING"
CLOSING = "CLOSING"
PUBLISHING = "PUBLISHING"
CLOSED = "CLOSED"
ABANDONED_RECOVERABLE = "ABANDONED_RECOVERABLE"
PARTIALLY_PUBLISHED = "PARTIALLY_PUBLISHED"

#: Transiciones admitidas. ``PUBLISHING`` puede reentrar en sí mismo: es lo que
#: hace ``reconcile`` al retomar un plan interrumpido.
TRANSITIONS: dict[str, frozenset[str]] = {
    CREATED: frozenset({RUNNING, ABANDONED_RECOVERABLE}),
    RUNNING: frozenset({SNAPSHOTTING, CLOSING, ABANDONED_RECOVERABLE}),
    SNAPSHOTTING: frozenset({RUNNING, ABANDONED_RECOVERABLE}),
    CLOSING: frozenset({PUBLISHING, ABANDONED_RECOVERABLE}),
    PUBLISHING: frozenset({PUBLISHING, CLOSED, PARTIALLY_PUBLISHED}),
    PARTIALLY_PUBLISHED: frozenset({PUBLISHING}),
    ABANDONED_RECOVERABLE: frozenset({CLOSING}),
    CLOSED: frozenset(),
}
#: Estados en los que un dueño vivo sigue siendo responsable del ítem.
OWNED_STATES = frozenset({CREATED, RUNNING, SNAPSHOTTING, CLOSING})

STATE_SUFFIX = ".state.json"
PLAN_SUFFIX = ".plan.json"
CLOSED_SUFFIX = ".closed"
RUN_METADATA = "run.json"
RUN_CLOSED = "run.closed"
#: Artefactos de la ejecución entera, no de un ítem.
RUN_ARTIFACTS = ("index.tsv", "joblog.tsv", "unexpected-stashes")

#: Salidas del CLI.
EXIT_REJECTED = 5
EXIT_UNRECOVERABLE = 6


class LifecycleError(Exception):
    """Una operación que el estado declarado no admite."""


class StaleGenerationError(LifecycleError):
    """La generación que se quiere publicar ya fue superada en la salida."""


@dataclass(frozen=True)
class ItemState:
    item: str
    state: str
    generation: int
    owner_pid: int
    exit_code: int | None = None

    def to_json(self) -> dict[str, object]:
        return {"item": self.item, "state": self.state, "generation": self.generation,
                "owner_pid": self.owner_pid, "exit_code": self.exit_code}


def runtime_root() -> Path:
    """La raíz del runtime, con la misma resolución que ``launcher_freeze.sh``."""
    declared = os.environ.get("THYROX_RUNTIME_DIR")
    if declared:
        return Path(declared)
    root = os.environ.get("THYROX_ROOT") or str(Path(__file__).resolve().parents[2])
    return Path(root) / ".thyrox" / "runtime"


def out_key(out_dir: Path) -> str:
    return hashlib.sha1(str(out_dir.resolve()).encode()).hexdigest()[:12]


def _write_atomic(path: Path, data: str) -> None:
    tmp = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    with open(tmp, "w", encoding="utf-8") as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)
    _fsync_dir(path.parent)


def _fsync_dir(directory: Path) -> None:
    fd = os.open(directory, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def _read_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


@contextmanager
def _out_lock(out_dir: Path, item: str) -> Iterator[None]:
    """Serializa a los publicadores de un mismo ítem sobre una misma salida.

    El candado vive en el runtime, no en la salida: un archivo de candado en el
    banco lo ensuciaría para ``git status``.
    """
    locks = runtime_root() / "pool" / "locks"
    locks.mkdir(parents=True, exist_ok=True)
    with open(locks / f"{out_key(out_dir)}-{item}.lock", "w") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        yield


def artifact_digest(path: Path) -> str:
    """``sha256`` de un archivo, o de un directorio como lista ordenada de rutas y hashes."""
    digest = hashlib.sha256()
    if path.is_dir():
        for child in sorted(p for p in path.rglob("*") if p.is_file() and not p.is_symlink()):
            digest.update(str(child.relative_to(path)).encode() + b"\0")
            digest.update(artifact_digest(child).encode() + b"\n")
        return digest.hexdigest()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def item_artifacts(live_dir: Path, item: str) -> list[str]:
    """Los artefactos de un ítem en el runtime: ``<n>.*`` salvo su estado y su plan."""
    prefix = f"{item}."
    names = []
    for entry in live_dir.iterdir():
        name = entry.name
        if not name.startswith(prefix) or name.startswith("."):
            continue
        if name.endswith(STATE_SUFFIX) or name.endswith(PLAN_SUFFIX):
            continue
        names.append(name)
    return sorted(names)


def read_state(live_dir: Path, item: str) -> ItemState | None:
    data = _read_json(live_dir / f"{item}{STATE_SUFFIX}")
    if data is None:
        return None
    return ItemState(item=str(data["item"]), state=str(data["state"]),
                     generation=int(data["generation"]), owner_pid=int(data["owner_pid"]),
                     exit_code=data.get("exit_code"))


def write_state(live_dir: Path, state: ItemState) -> None:
    _write_atomic(live_dir / f"{state.item}{STATE_SUFFIX}", json.dumps(state.to_json()) + "\n")


def transition(live_dir: Path, item: str, target: str, **changes: object) -> ItemState:
    current = read_state(live_dir, item)
    if current is None:
        raise LifecycleError(f"el ítem {item} no tiene estado en {live_dir}")
    if target not in TRANSITIONS[current.state]:
        raise LifecycleError(f"transición no admitida para el ítem {item}: {current.state} → {target}")
    updated = ItemState(item=item, state=target,
                        generation=int(changes.get("generation", current.generation)),  # type: ignore[arg-type]
                        owner_pid=int(changes.get("owner_pid", current.owner_pid)),  # type: ignore[arg-type]
                        exit_code=changes.get("exit_code", current.exit_code))  # type: ignore[arg-type]
    write_state(live_dir, updated)
    return updated


def read_closed(out_dir: Path, item: str) -> dict | None:
    """El manifiesto de ``<n>.closed``, o ``None`` si el ítem no está cerrado."""
    return _read_json(out_dir / f"{item}{CLOSED_SUFFIX}")


def closed_generation(out_dir: Path, item: str) -> int:
    manifest = read_closed(out_dir, item)
    return int(manifest["generation"]) if manifest else 0


def is_closed(out_dir: Path, item: str) -> bool:
    return read_closed(out_dir, item) is not None


def closed_items(out_dir: Path) -> list[str]:
    """Los ítems publicados de una salida, en orden numérico cuando lo son."""
    if not out_dir.is_dir():
        return []
    items = [p.name[: -len(CLOSED_SUFFIX)] for p in out_dir.iterdir()
             if p.name.endswith(CLOSED_SUFFIX) and p.name != RUN_CLOSED
             and read_closed(out_dir, p.name[: -len(CLOSED_SUFFIX)]) is not None]
    return sorted(items, key=lambda n: (0, int(n)) if n.isdigit() else (1, n))  # type: ignore[return-value]


def closed_glob(out_dir: Path, pattern: str) -> list[Path]:
    """El ``glob`` de una salida restringido a los artefactos de ítems cerrados.

    Es la forma en que un consumidor lee ``*.json``, ``*.time`` o ``*.gpu``:
    el prefijo ``<n>.`` de cada archivo tiene que tener su ``<n>.closed``.
    """
    closed = set(closed_items(out_dir))
    return sorted(p for p in Path(out_dir).glob(pattern) if p.name.split(".", 1)[0] in closed)


def verify_closed(out_dir: Path, item: str) -> list[str]:
    """Las discrepancias entre ``<n>.closed`` y la salida; vacía si el ítem es coherente."""
    manifest = read_closed(out_dir, item)
    if manifest is None:
        return [f"{item}: sin {CLOSED_SUFFIX}"]
    problems = []
    for name, expected in manifest["artifacts"].items():
        path = out_dir / name
        if not path.exists():
            problems.append(f"{name}: falta")
        elif artifact_digest(path) != expected:
            problems.append(f"{name}: sha256 distinto del manifiesto")
    return problems


def begin(live_dir: Path, out_dir: Path, item: str, owner_pid: int) -> ItemState:
    """Da de alta al ítem en ``RUNNING`` con la generación siguiente a la publicada."""
    live_dir.mkdir(parents=True, exist_ok=True)
    previous = read_state(live_dir, item)
    if previous is not None and previous.state != CLOSED:
        raise LifecycleError(f"el ítem {item} ya tiene estado {previous.state} en {live_dir}")
    generation = closed_generation(out_dir, item) + 1
    state = ItemState(item=item, state=CREATED, generation=generation, owner_pid=owner_pid)
    write_state(live_dir, state)
    return transition(live_dir, item, RUNNING)


def _place(source: Path, dest: Path) -> None:
    """Lleva un artefacto a la salida: ``rename`` si comparten sistema de archivos.

    Entre sistemas distintos copia a un temporal junto al destino y lo
    renombra; el origen se retira sólo después.
    """
    try:
        os.replace(source, dest)
        return
    except OSError as error:
        if error.errno != 18:  # EXDEV
            raise
    staging = dest.with_name(f".{dest.name}.publishing")
    if staging.is_dir():
        shutil.rmtree(staging)
    if source.is_dir():
        shutil.copytree(source, staging, symlinks=True)
    else:
        shutil.copy2(source, staging)
    os.replace(staging, dest)
    _remove(source)


def _remove(path: Path) -> None:
    if path.is_dir() and not path.is_symlink():
        shutil.rmtree(path)
    elif path.exists() or path.is_symlink():
        path.unlink()


def publish(live_dir: Path, out_dir: Path, item: str, *, exit_code: int | None = None,
            fail_after_moves: int | None = None, staged: bool = True) -> dict:
    """Cierra y publica el ítem; idempotente y reanudable desde su plan.

    ``staged=False`` escribe cada artefacto directamente con su nombre final;
    existe sólo como control de anulación de la etapa oculta.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    with _out_lock(out_dir, item):
        state = read_state(live_dir, item)
        if state is None:
            raise LifecycleError(f"el ítem {item} no tiene estado en {live_dir}")
        if state.state == CLOSED:
            return read_closed(out_dir, item) or {}
        plan_path = live_dir / f"{item}{PLAN_SUFFIX}"
        plan = _read_json(plan_path)
        if plan is None:
            if state.state in (RUNNING, SNAPSHOTTING, ABANDONED_RECOVERABLE):
                state = transition(live_dir, item, CLOSING,
                                   exit_code=exit_code if exit_code is not None else state.exit_code)
            if state.state != CLOSING:
                raise LifecycleError(f"el ítem {item} está en {state.state}; no se puede publicar")
            published = closed_generation(out_dir, item)
            if published >= state.generation:
                raise StaleGenerationError(
                    f"el ítem {item} publicaría la generación {state.generation}, "
                    f"pero la salida ya tiene la {published}")
            superseded = read_closed(out_dir, item) or {}
            plan = {"item": item, "generation": state.generation, "exit_code": state.exit_code,
                    "run_id": live_dir.name, "superseded": sorted(superseded.get("artifacts", {})),
                    "artifacts": {name: artifact_digest(live_dir / name)
                                  for name in item_artifacts(live_dir, item)}}
            _write_atomic(plan_path, json.dumps(plan, sort_keys=True) + "\n")
            state = transition(live_dir, item, PUBLISHING)
        elif state.state not in (PUBLISHING, PARTIALLY_PUBLISHED):
            raise LifecycleError(f"el ítem {item} tiene plan pero está en {state.state}")
        elif state.state == PARTIALLY_PUBLISHED:
            state = transition(live_dir, item, PUBLISHING)
        generation = int(plan["generation"])
        # Al reanudar se vuelve a mirar la salida: otra ejecución pudo cerrar una
        # generación posterior entre la caída y este intento.
        published = closed_generation(out_dir, item)
        if published == generation:
            transition(live_dir, item, CLOSED)
            plan_path.unlink(missing_ok=True)
            return read_closed(out_dir, item) or {}
        if published > generation:
            raise StaleGenerationError(
                f"el ítem {item} reanudaría la generación {generation}, "
                f"pero la salida ya tiene la {published}")
        # Etapa 1: cada artefacto llega a la salida con un nombre oculto propio de
        # su generación. Mientras dura —la parte larga, la que copia entre
        # sistemas de archivos— la generación anterior sigue cerrada y válida.
        moves = 0
        for name, expected in plan["artifacts"].items():
            source, dest = live_dir / name, out_dir / name
            staged_path = out_dir / f".{name}.g{generation}" if staged else dest
            if dest.exists() and artifact_digest(dest) == expected and (not staged or not staged_path.exists()):
                if source.exists() or source.is_symlink():
                    _remove(source)
                continue
            if not (staged_path.exists() and artifact_digest(staged_path) == expected):
                if not (source.exists() or source.is_symlink()):
                    transition(live_dir, item, PARTIALLY_PUBLISHED)
                    raise LifecycleError(f"el artefacto {name} del ítem {item} no está ni en el "
                                         f"runtime ni en la salida con el hash del plan")
                _remove(staged_path)
                _place(source, staged_path)
                moves += 1
                if fail_after_moves is not None and moves >= fail_after_moves:
                    os._exit(9)
            if source.exists() or source.is_symlink():
                _remove(source)
        _fsync_dir(out_dir)
        # Etapa 2: el intercambio. Se retira el cierre anterior —desde aquí ningún
        # consumidor lee el ítem— y cada artefacto preparado toma su nombre.
        (out_dir / f"{item}{CLOSED_SUFFIX}").unlink(missing_ok=True)
        _fsync_dir(out_dir)
        for name in plan["superseded"]:
            if name not in plan["artifacts"]:
                _remove(out_dir / name)
        for name, expected in plan["artifacts"].items():
            dest = out_dir / name
            staged_path = out_dir / f".{name}.g{generation}"
            if staged and staged_path.exists():
                if dest.is_dir() and not dest.is_symlink():
                    shutil.rmtree(dest)
                os.replace(staged_path, dest)
            if not dest.exists() or artifact_digest(dest) != expected:
                transition(live_dir, item, PARTIALLY_PUBLISHED)
                raise LifecycleError(f"el artefacto {name} del ítem {item} no llegó íntegro a {out_dir}")
        _fsync_dir(out_dir)
        manifest = {"item": item, "generation": plan["generation"], "exit_code": plan["exit_code"],
                    "run_id": plan["run_id"], "artifacts": plan["artifacts"],
                    "closed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
        _write_atomic(out_dir / f"{item}{CLOSED_SUFFIX}", json.dumps(manifest, sort_keys=True) + "\n")
        transition(live_dir, item, CLOSED)
        plan_path.unlink(missing_ok=True)
        return manifest


def pid_alive(pid: int) -> bool:
    """El proceso existe y no es un zombi."""
    if pid <= 0:
        return False
    try:
        stat = Path(f"/proc/{pid}/stat").read_text()
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        return False
    return stat[stat.rfind(")") + 2:].split()[0] != "Z"


def reconcile(pool_root: Path | None = None) -> list[str]:
    """Completa publicaciones interrumpidas y declara ítems huérfanos; nunca borra.

    Devuelve una línea por ítem tocado: ``<run>\\t<ítem>\\t<desenlace>``.
    """
    pool_root = pool_root or runtime_root() / "pool"
    report: list[str] = []
    if not pool_root.is_dir():
        return report
    for live_dir in sorted(p for p in pool_root.iterdir() if p.is_dir() and p.name != "locks"):
        meta = _read_json(live_dir / RUN_METADATA)
        if meta is None:
            continue
        out_dir = Path(meta["out_dir"])
        for state_file in sorted(live_dir.glob(f"*{STATE_SUFFIX}")):
            item = state_file.name[: -len(STATE_SUFFIX)]
            state = read_state(live_dir, item)
            if state is None or state.state == CLOSED:
                continue
            if state.state in (PUBLISHING, PARTIALLY_PUBLISHED):
                try:
                    publish(live_dir, out_dir, item)
                    outcome = "publicado"
                except StaleGenerationError as error:
                    outcome = f"rechazado: {error}"
                except LifecycleError as error:
                    outcome = f"sin completar: {error}"
            elif state.state in OWNED_STATES and not pid_alive(state.owner_pid):
                transition(live_dir, item, ABANDONED_RECOVERABLE)
                outcome = ABANDONED_RECOVERABLE
            else:
                outcome = f"sin cambios ({state.state})"
            report.append(f"{live_dir.name}\t{item}\t{outcome}")
    return report


def open_run(out_dir: Path, owner_pid: int, run_id: str | None = None) -> Path:
    """Crea el directorio de runtime de una ejecución y devuelve su ruta."""
    run_id = run_id or f"{out_key(out_dir)}-{time.strftime('%Y%m%dT%H%M%S', time.gmtime())}-{owner_pid}"
    live_dir = runtime_root() / "pool" / run_id
    live_dir.mkdir(parents=True, exist_ok=False)
    _write_atomic(live_dir / RUN_METADATA, json.dumps(
        {"run_id": run_id, "out_dir": str(out_dir.resolve()), "owner_pid": owner_pid}) + "\n")
    return live_dir


def close_run(live_dir: Path, out_dir: Path) -> list[str]:
    """Publica los artefactos de la ejecución y ``run.closed`` al final.

    Rehúsa si algún ítem no llegó a ``CLOSED``: su runtime se conserva y el
    directorio de la ejecución no se retira.
    """
    pending = [s.name[: -len(STATE_SUFFIX)] for s in live_dir.glob(f"*{STATE_SUFFIX}")
               if (read_state(live_dir, s.name[: -len(STATE_SUFFIX)]) or ItemState("", "", 0, 0)).state != CLOSED]
    names = [name for name in RUN_ARTIFACTS if (live_dir / name).exists()]
    for name in names:
        dest = out_dir / name
        if dest.is_dir() and not dest.is_symlink() and (live_dir / name).is_dir():
            shutil.copytree(live_dir / name, dest, dirs_exist_ok=True)
            shutil.rmtree(live_dir / name)
        else:
            _place(live_dir / name, dest)
    if pending:
        return sorted(pending)
    _write_atomic(out_dir / RUN_CLOSED, json.dumps(
        {"run_id": live_dir.name, "items": closed_items(out_dir), "artifacts": names}) + "\n")
    shutil.rmtree(live_dir)
    return []


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("open-run", help="crea el runtime de una ejecución e imprime su ruta")
    p.add_argument("out_dir", type=Path)
    p.add_argument("--owner", type=int, required=True)
    p = sub.add_parser("begin", help="da de alta un ítem en RUNNING con su generación")
    p.add_argument("live_dir", type=Path)
    p.add_argument("out_dir", type=Path)
    p.add_argument("item")
    p.add_argument("--owner", type=int, required=True)
    p = sub.add_parser("transition", help="cambia el estado de un ítem")
    p.add_argument("live_dir", type=Path)
    p.add_argument("item")
    p.add_argument("state", choices=sorted(TRANSITIONS))
    p = sub.add_parser("publish", help="publica un ítem en la salida, <n>.closed al final")
    p.add_argument("live_dir", type=Path)
    p.add_argument("out_dir", type=Path)
    p.add_argument("item")
    p.add_argument("--exit", dest="exit_code", type=int)
    p.add_argument("--fail-after-moves", type=int, help=argparse.SUPPRESS)
    p.add_argument("--direct", action="store_true", help=argparse.SUPPRESS)
    p = sub.add_parser("close-run", help="publica index/joblog y run.closed")
    p.add_argument("live_dir", type=Path)
    p.add_argument("out_dir", type=Path)
    sub.add_parser("reconcile", help="completa publicaciones y declara ítems huérfanos")
    p = sub.add_parser("closed-items", help="los ítems publicados de una salida")
    p.add_argument("out_dir", type=Path)
    p = sub.add_parser("is-closed", help="exit 0 si el ítem está publicado")
    p.add_argument("out_dir", type=Path)
    p.add_argument("item")
    p = sub.add_parser("verify", help="compara <n>.closed con los artefactos de la salida")
    p.add_argument("out_dir", type=Path)
    p.add_argument("item")
    args = parser.parse_args(argv)
    try:
        if args.command == "open-run":
            print(open_run(args.out_dir, args.owner))
        elif args.command == "begin":
            state = begin(args.live_dir, args.out_dir, args.item, args.owner)
            print(state.generation)
        elif args.command == "transition":
            transition(args.live_dir, args.item, args.state)
        elif args.command == "publish":
            publish(args.live_dir, args.out_dir, args.item, exit_code=args.exit_code,
                    fail_after_moves=args.fail_after_moves, staged=not args.direct)
        elif args.command == "close-run":
            pending = close_run(args.live_dir, args.out_dir)
            if pending:
                print(f"pool_lifecycle: ítems sin cerrar, runtime conservado en {args.live_dir}: "
                      + " ".join(pending), file=sys.stderr)
                return EXIT_UNRECOVERABLE
        elif args.command == "reconcile":
            print("\n".join(reconcile()) or "reconcile: nada pendiente")
        elif args.command == "closed-items":
            for item in closed_items(args.out_dir):
                print(item)
        elif args.command == "is-closed":
            return 0 if is_closed(args.out_dir, args.item) else 1
        elif args.command == "verify":
            problems = verify_closed(args.out_dir, args.item)
            print("\n".join(problems) or "coherente")
            return 1 if problems else 0
    except StaleGenerationError as error:
        print(f"pool_lifecycle: REHÚSA — {error}", file=sys.stderr)
        return EXIT_REJECTED
    except LifecycleError as error:
        print(f"pool_lifecycle: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
