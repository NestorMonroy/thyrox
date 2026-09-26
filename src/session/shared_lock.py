"""El lock de estado compartido: un solo escritor para lo que no se reparte.

Porte de ``proper-lockfile`` tal como lo empaqueta el ejecutable 2.1.282
(``chunk-bzev8hcq.js``). La extracción, con cada función del ejecutable, su
línea y su porte, está en
``.claude/workbench/lock-port-20260926T202249/README.md``.

Para qué: los trabajos del pool escriben cada uno sus propios archivos
(``<n>.json``, ``<n>.time``) y no necesitan lock. Lo que sí es compartido
—``setups.jsonl``, el historial de una plantilla, el commit y el push de un
paso— lo escribe un solo proceso a la vez, y ése es el que toma este lock.

El algoritmo del ejecutable:

- adquirir es un ``mkdir`` de ``<archivo>.lock``, atómico en el sistema de
  archivos (``De``);
- el dueño renueva la ``mtime`` del directorio cada ``update_s`` (``pe``); un
  lock cuya ``mtime`` es más vieja que ``stale_s`` es huérfano (``rt``) y se
  retira (``nt``) para volver a intentar UNA vez;
- si el latido encuentra el lock ausente o con una ``mtime`` que no es la
  suya, el lock quedó comprometido (``Fe``), y soltarlo avisa que la sección
  pudo correr sin exclusividad (``vm``).

Dos divergencias declaradas, las dos por directiva del ejecutor 2026-09-26:
el lock lleva ``owner.json`` (quién, desde qué paso) y un huérfano cuyo dueño
es de este host y sigue vivo NO se roba: colgado no es muerto, y se devuelve
la sonda de ``stdin_probe`` de ese pid para diagnosticarlo.

Métrica: ``mtime`` del directorio del lock contra el reloj local.
Ciega a: un dueño de otro host que sigue vivo pero no renueva —se recupera
por latido, como en el ejecutable— y a un ``SIGKILL``, que no retira el lock
y lo deja al umbral ``stale_s``.
"""
from __future__ import annotations

import atexit
import json
import os
import socket
import sys
import tempfile
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

from roster import stdin_probe

OWNER_FILE = "owner.json"
#: Los valores con que el ejecutable llama a su lock (``callers-ci.txt``):
#: ``stale: 60000``, ``update: 5000``.
DEFAULT_STALE_S = 60.0
DEFAULT_UPDATE_S = 5.0
#: Los pisos de ``Nt``: ``stale`` nunca baja de 2 s y ``update`` de 1 s.
MIN_STALE_S = 2.0
MIN_UPDATE_S = 1.0
#: La espera entre reintentos de ``ze``: ``minTimeout`` 1000 ms, ``factor`` 2.
DEFAULT_MIN_WAIT_S = 1.0
WAIT_FACTOR = 2.0
NO_EXCLUSIVITY = "the locked section may have run without exclusivity"


class LockHeld(Exception):
    """ELOCKED: el lock es de otro y no se pudo tomar."""

    code = "ELOCKED"

    def __init__(self, target: Path, owner: dict, reason: str, probe=None):
        self.target, self.owner, self.reason, self.probe = target, owner, reason, probe
        super().__init__(f"{target}: lock ocupado ({reason}); dueño {owner or 'sin declarar'}")


def lock_path(target: str | os.PathLike) -> Path:
    """``ne``: el lock de un archivo es ``<archivo>.lock``, sobre su ruta real (``Pe``)."""
    return Path(os.path.realpath(target) + ".lock")


def _read_owner(lock: Path) -> dict:
    try:
        return json.loads((lock / OWNER_FILE).read_text())
    except (OSError, ValueError):
        return {}


def _pid_alive(pid) -> bool:
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def _is_stale(lock: Path, stale_s: float) -> bool:
    """``rt``: huérfano si su ``mtime`` es más vieja que el umbral."""
    return lock.stat().st_mtime < time.time() - stale_s


def _remove(lock: Path) -> None:
    """``nt``, más el ``owner.json`` que el porte añade dentro."""
    try:
        (lock / OWNER_FILE).unlink()
    except FileNotFoundError:
        pass
    try:
        lock.rmdir()
    except FileNotFoundError:
        pass


def force_remove(target: str | os.PathLike) -> None:
    """Retira un lock sin preguntar de quién es. Para quien opera, no para el flujo."""
    _remove(lock_path(target))


def check(target: str | os.PathLike, stale_s: float = DEFAULT_STALE_S) -> bool:
    """``Pt``: el lock existe y no es huérfano."""
    lock = lock_path(target)
    try:
        return not _is_stale(lock, max(stale_s, MIN_STALE_S))
    except FileNotFoundError:
        return False


@dataclass
class _Options:
    stale_s: float
    update_s: float


def _normalize(stale_s: float, update_s: float | None) -> _Options:
    """Los pisos y el acotado de ``Nt``: ``update`` en [1 s, ``stale``/2]."""
    stale = max(stale_s or 0, MIN_STALE_S)
    update = stale / 2 if update_s is None else update_s
    return _Options(stale, max(min(update, stale / 2), MIN_UPDATE_S))


class Lock:
    """Un lock tomado: renueva su latido hasta que se suelta."""

    _held: set["Lock"] = set()

    def __init__(self, target: Path, lock: Path, options: _Options):
        self.target, self.path, self.options = target, lock, options
        self.compromised = False
        self._mtime_ns = lock.stat().st_mtime_ns
        self._last_update = time.monotonic()
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._heartbeat, daemon=True)
        self._thread.start()
        Lock._held.add(self)

    def _heartbeat(self) -> None:
        """``pe``: renueva la ``mtime``; si no es la suya, el lock se perdió."""
        while not self._stop.wait(self.options.update_s):
            overdue = time.monotonic() - self._last_update > self.options.stale_s
            try:
                current = self.path.stat().st_mtime_ns
            except FileNotFoundError:
                self._compromise(); return
            if current != self._mtime_ns or overdue:
                self._compromise(); return
            try:
                os.utime(self.path)
                self._mtime_ns = self.path.stat().st_mtime_ns
            except FileNotFoundError:
                self._compromise(); return
            self._last_update = time.monotonic()

    def _compromise(self) -> None:
        """``Fe``: el lock dejó de ser nuestro sin que lo soltáramos."""
        self.compromised = True
        print(f"shared_lock: {self.target}: lock comprometido (ECOMPROMISED)", file=sys.stderr)

    def release(self) -> str | None:
        """``it`` + ``vm``: retira el lock propio; si ya no lo era, avisa."""
        self._stop.set()
        if self._thread is not threading.current_thread():
            self._thread.join()
        Lock._held.discard(self)
        if self.compromised or _read_owner(self.path).get("pid") != os.getpid():
            code = "ERELEASED" if self.compromised else "ENOTACQUIRED"
            warning = f"lock was no longer held at release ({code}); {NO_EXCLUSIVITY}"
            print(f"shared_lock: {self.target}: {warning}", file=sys.stderr)
            return warning
        _remove(self.path)
        return None


@atexit.register
def _release_all() -> None:
    """El ``Dt(...)`` del ejecutable: al salir, retira los locks propios."""
    for held in list(Lock._held):
        held.release()


def _try_acquire(target: Path, lock: Path, options: _Options, owner: dict, may_steal: bool) -> Lock:
    """``De``: un ``mkdir``; si existe, fresco es ELOCKED y huérfano se retira."""
    try:
        lock.mkdir()
    except FileExistsError:
        try:
            stale = _is_stale(lock, options.stale_s)
        except FileNotFoundError:
            return _try_acquire(target, lock, options, owner, may_steal=False)
        current = _read_owner(lock)
        if not stale:
            raise LockHeld(target, current, "activo") from None
        if current.get("host") == owner["host"] and _pid_alive(current.get("pid")):
            raise LockHeld(target, current, "dueño vivo sin latido: se verifica antes de recuperar",
                           probe=stdin_probe.probe(current["pid"])) from None
        if not may_steal:
            raise LockHeld(target, current, "huérfano, y otro lo recuperó primero") from None
        _remove(lock)
        return _try_acquire(target, lock, options, owner, may_steal=False)
    (lock / OWNER_FILE).write_text(json.dumps(owner, sort_keys=True))
    os.utime(lock)
    return Lock(target, lock, options)


def acquire(target: str | os.PathLike, *, run_id: str = "", step_id: str = "",
            stale_s: float = DEFAULT_STALE_S, update_s: float | None = DEFAULT_UPDATE_S,
            retries: int = 0, min_wait_s: float = DEFAULT_MIN_WAIT_S,
            max_wait_s: float = float("inf")) -> Lock:
    """``Nt``: toma el lock, reintentando con espera exponencial (``ze``)."""
    target = Path(target)
    lock = lock_path(target)
    options = _normalize(stale_s, update_s)
    owner = {"pid": os.getpid(), "host": socket.gethostname(), "run_id": run_id,
             "step_id": step_id, "acquired_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    for attempt in range(retries + 1):
        try:
            return _try_acquire(target, lock, options, owner, may_steal=True)
        except LockHeld:
            if attempt == retries:
                raise
            time.sleep(min(min_wait_s * WAIT_FACTOR ** attempt, max_wait_s))
    raise AssertionError("inalcanzable: el bucle devuelve o relanza")


@contextmanager
def held(target: str | os.PathLike, **options):
    """El lock como sección crítica: se toma al entrar y se suelta al salir."""
    lock = acquire(target, **options)
    try:
        yield lock
    finally:
        lock.release()


def write_atomic(path: str | os.PathLike, text: str) -> None:
    """Temporal en el mismo directorio, ``fsync`` y ``rename``: quien lee ve el
    archivo viejo o el nuevo, nunca uno a medio escribir."""
    path = Path(path)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def append_line(path: str | os.PathLike, line: str) -> None:
    """Añade una línea con ``fsync``. Quien llama tiene el lock del archivo."""
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(line.rstrip("\n") + "\n")
        handle.flush()
        os.fsync(handle.fileno())
