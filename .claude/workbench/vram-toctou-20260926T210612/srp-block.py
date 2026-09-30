#: Reintentos del lock del registro: la sección crítica es una lectura de
#: nvidia-smi y una escritura, así que se espera a otro ítem, no a un paso.
LEDGER_LOCK_RETRIES = 50


class VramLedger:
    """El registro de VRAM comprometida: ``{pid del dueño: MiB reservados}``.
    Sólo persiste; no bloquea — quien lo usa sostiene el lock del archivo."""

    def __init__(self, path: Path):
        self.path = Path(path)

    def _read(self) -> dict[str, int]:
        try:
            return {pid: int(mib) for pid, mib in json.loads(self.path.read_text()).items()}
        except (OSError, ValueError):
            return {}

    def live(self) -> dict[str, int]:
        """Las reservas de dueños vivos: la de uno muerto ya no compromete nada."""
        return {pid: mib for pid, mib in self._read().items() if _alive(int(pid))}

    def save(self, reservations: dict[str, int]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        shared_lock.write_atomic(self.path, json.dumps(reservations, sort_keys=True))

    def reserve(self, owner_pid: int, need_mib: int) -> None:
        self.save({**self.live(), str(owner_pid): need_mib})

    def release(self, owner_pid: int) -> None:
        reservations = self._read()
        reservations.pop(str(owner_pid), None)
        self.save(reservations)


def measure(nvidia_smi: str) -> tuple[Sample | None, int | None]:
    """La medida: la muestra por PID y la VRAM libre; ``(None, None)`` sin GPU."""
    try:
        return sample(nvidia_smi), free_vram_mib(nvidia_smi)
    except GpuUnavailable:
        return None, None


def pending(reservations: dict[str, int], usage: dict[int, int], trees: dict[int, set[int]]) -> int:
    """Lo comprometido que la GPU aún NO muestra: de cada reserva, la parte
    que su árbol todavía no usa. Lo que ya usa ya está restado de lo libre, y
    contarlo otra vez bloquearía VRAM que sí existe."""
    total = 0
    for pid, mib in reservations.items():
        used = sum(usage.get(p, 0) for p in trees.get(int(pid), {int(pid)}))
        total += max(0, mib - used)
    return total


def admissible(free_mib: int | None, pending_mib: int, need_mib: int) -> bool:
    """La decisión, pura: cabe si lo libre menos lo comprometido alcanza."""
    return free_mib is not None and free_mib - pending_mib >= need_mib


def _try_admit(ledger: VramLedger, need_mib: int, owner_pid: int, nvidia_smi: str) -> bool:
    """Una pasada de comprobar-y-reservar. Se llama CON el lock sostenido: la
    atomicidad es del lock, no de juntar las responsabilidades en una función."""
    live = ledger.live()
    current, free = measure(nvidia_smi)
    usage = current.vram_by_pid if current else {}
    trees = {int(pid): tree(int(pid)) for pid in live}
    if admissible(free, pending(live, usage, trees), need_mib):
        ledger.reserve(owner_pid, need_mib)
        return True
    ledger.save(live)
    return False


def admit(need_mib: int, ledger: Path, owner_pid: int, nvidia_smi: str = "nvidia-smi",
          timeout_s: float = 600.0, interval_s: float = DEFAULT_INTERVAL_S) -> bool:
    """La admisión por VRAM SIN carrera de comprobar-y-usar.

    ``wait_free`` comprobaba sola cada ítem: con 5000 MiB libres dos ítems de
    3000 veían sitio los dos y arrancaban los dos (sonda:
    ``.claude/workbench/vram-toctou-*/probe-toctou.sh``). Aquí cada pasada de
    comprobar-y-reservar corre bajo el lock del registro (``shared_lock``), así
    que no queda ventana entre comprobar y reservar. Las responsabilidades
    siguen separadas: ``VramLedger`` persiste, ``measure`` mide, ``pending`` y
    ``admissible`` deciden; esta función sólo sostiene el lock y reintenta."""
    book = VramLedger(ledger)
    deadline = time.monotonic() + timeout_s
    while True:
        with shared_lock.held(book.path, run_id="vram-admission", retries=LEDGER_LOCK_RETRIES,
                              min_wait_s=0.01, max_wait_s=0.2):
            if _try_admit(book, need_mib, owner_pid, nvidia_smi):
                return True
        if time.monotonic() >= deadline:
            return False
        time.sleep(interval_s)


def release(ledger: Path, owner_pid: int) -> None:
    """Suelta la reserva de un ítem que terminó, bajo el lock del registro."""
    book = VramLedger(ledger)
    if not book.path.exists():
        return
    with shared_lock.held(book.path, run_id="vram-admission", retries=LEDGER_LOCK_RETRIES,
                          min_wait_s=0.01, max_wait_s=0.2):
        book.release(owner_pid)


