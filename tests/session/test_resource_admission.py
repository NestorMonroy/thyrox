"""La admisión por recurso SIN carrera de comprobar-y-usar, para la RAM.

Comprobar sin reservar deja una ventana: A mide 5000 libres y decide que caben
sus 3000; antes de que A llegue a usarlos, B mide lo mismo y decide lo mismo.
Aquí comprobar y reservar son UN paso bajo el lock del registro, y lo
comprometido que el sistema aún no muestra —la reserva menos lo que el árbol
del dueño ya reside— se descuenta de lo libre. La reserva caduca sola cuando
su dueño muere: un `slots++` en un `trap` no corre con SIGKILL.

El registro y el bucle son los que `gpu_monitor` usaba para la VRAM; la RAM
sólo aporta su medida: `MemAvailable` y el RSS de cada árbol.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from session import gpu_monitor as gm
from session import resource_admission as ra

OK = FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLA {label}: esperado {expected!r}, obtenido {obtained!r}"); FAILED += 1


def meminfo(path: Path, available_kb: int) -> Path:
    path.write_text(f"MemTotal:       16000000 kB\nMemAvailable:   {available_kb} kB\n")
    return path


#: Una pertenencia en la raíz de v2: sin cgroup que acote, así las admisiones
#: de estos casos leen sólo el MemAvailable que el caso declara.
NO_CGROUP_DIR = tempfile.TemporaryDirectory()
NO_CGROUP = Path(NO_CGROUP_DIR.name) / "self-root"
NO_CGROUP.write_text("0::/\n")


def cli(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, "-m", "session.resource_admission", *args],
                          cwd=ROOT, env={**os.environ, "PYTHONPATH": str(ROOT / "src")},
                          capture_output=True, text=True, timeout=60)


with tempfile.TemporaryDirectory() as tmp:
    tmp_path = Path(tmp)

    print("caso 1 — el registro es el mismo que usaba la GPU")
    check("gpu_monitor reutiliza el bucle común", ra.admit_locked, gm.admit_locked)
    check("y la decisión pura", ra.admissible, gm.admissible)

    print("caso 2 — la reserva de un dueño muerto no compromete nada")
    dead = subprocess.Popen(["true"]); dead.wait()
    book = ra.ReservationLedger(tmp_path / "ledger.json")
    book.save({str(dead.pid): 3000, str(os.getpid()): 1000})
    check("sólo queda la del vivo", {str(os.getpid()): 1000}, book.live())

    print("caso 3 — lo libre de RAM descuenta lo reservado que aún no reside")
    free = ra.ram_headroom({"4242": 3000}, meminfo(tmp_path / "meminfo", 10_000),
                           usage=lambda pid: 1000 if pid == 4242 else 0)
    check("10000 − (3000 − 1000)", 8000, free)
    check("sin MemAvailable no hay margen", None,
          ra.ram_headroom({}, tmp_path / "absent", usage=lambda pid: 0))

    print("caso 4 — dos que piden 3 GB sobre 5 GB libres: entra uno")
    # En kB: el RSS de un `sleep` dueño (1–2 MB) es despreciable frente a lo
    # reservado, así que lo aún no usado es casi toda la reserva.
    info = meminfo(tmp_path / "meminfo5g", 5_000_000)
    ledger = tmp_path / "race.json"
    owners = [subprocess.Popen(["sleep", "30"]) for _ in range(2)]
    try:
        racers = [subprocess.Popen([sys.executable, "-m", "session.resource_admission", "admit-ram", "3000000", "--self-cgroup", str(NO_CGROUP),
                                    "--ledger", str(ledger), "--owner", str(o.pid), "--meminfo", str(info),
                                    "--timeout", "0"],
                                   cwd=ROOT, env={**os.environ, "PYTHONPATH": str(ROOT / "src")})
                  for o in owners]
        codes = sorted(r.wait(timeout=60) for r in racers)
        check("uno admitido (0) y uno vencido (3)", [0, 3], codes)
        check("una sola reserva en el registro", 1, len(ra.ReservationLedger(ledger).live()))

        print("caso 5 — soltar la reserva deja entrar al siguiente")
        admitted = next(iter(ra.ReservationLedger(ledger).live()))
        check("release sale 0", 0, cli("release", "--ledger", str(ledger), "--owner", admitted).returncode)
        waiting = next(str(o.pid) for o in owners if str(o.pid) != admitted)
        check("el otro entra ahora", 0, cli("admit-ram", "3000000", "--self-cgroup", str(NO_CGROUP), "--ledger", str(ledger), "--owner", waiting,
                                              "--meminfo", str(info), "--timeout", "0").returncode)

        print("caso 6 — muerto el dueño, su reserva deja de contar")
        holder = next(o for o in owners if str(o.pid) == waiting)
        holder.kill(); holder.wait()
        survivor = next(o for o in owners if o is not holder)
        check("el vivo entra sin que nadie haya soltado", 0,
              cli("admit-ram", "3000000", "--self-cgroup", str(NO_CGROUP), "--ledger", str(ledger), "--owner", str(survivor.pid),
                  "--meminfo", str(info), "--timeout", "0").returncode)
    finally:
        for o in owners:
            o.kill(); o.wait()

    print("caso 7 — el RSS de un árbol vivo se mide de /proc")
    child = subprocess.Popen(["sleep", "30"])
    try:
        time.sleep(0.1)
        check("un proceso vivo reside algo", True, ra.proc_rss_kb({child.pid}) > 0)
        check("un pid inexistente no suma", 0, ra.proc_rss_kb({2 ** 22 + 7}))
    finally:
        child.kill(); child.wait()

print("caso 7d — un dueño en contenedor: lo pendiente descuenta el uso de SU cgroup, no el RSS del cliente")
with tempfile.TemporaryDirectory() as raw:
    root = Path(raw)
    relative = "/libpod_parent/libpod-ram"
    podman = root / "podman"
    podman.write_text("#!/usr/bin/env bash\n"
                      'case "$*" in\n'
                      "  *exists*known*) exit 0 ;;\n  *exists*) exit 1 ;;\n"
                      f'  *inspect*known*) echo "true {relative}" ;;\n'
                      '  *) echo "orden no prevista: $*" >&2; exit 125 ;;\nesac\n')
    podman.chmod(0o755)
    memory = root / "cgroup" / "memory" / relative.lstrip("/")
    memory.mkdir(parents=True)
    (memory / "cgroup.procs").write_text("77\n")
    (memory / "memory.max_usage_in_bytes").write_text(f"{2500 * 1024}\n")
    (memory / "memory.usage_in_bytes").write_text(f"{2000 * 1024}\n")
    source = ra.ContainerMembers("known", str(podman), root / "cgroup")
    client_rss = lambda pid: 40  # el cliente `podman run`: ~nada frente a la reserva
    usage = ra.container_aware_usage({4242: source}, client_rss)
    check("10000 − (3000 − 2000 del cgroup)", 9000,
          ra.ram_headroom({"4242": 3000}, meminfo(root / "meminfo", 10_000), usage))
    check("un dueño sin contenedor sigue midiéndose por su árbol", 7040,
          ra.ram_headroom({"4343": 3000}, meminfo(root / "meminfo", 10_000), usage))
    (memory / "memory.usage_in_bytes").unlink(); (memory / "memory.usage_in_bytes").mkdir()
    check("cgroup ilegible: sin medida, no un cero", None,
          ra.ram_headroom({"4242": 3000}, meminfo(root / "meminfo", 10_000), usage))
    (memory / "memory.usage_in_bytes").rmdir()
    (memory / "memory.usage_in_bytes").write_text(f"{2000 * 1024}\n")

    print("caso 7e — la reserva de un ítem en contenedor la acota su --memory")
    check("sin límite: la necesidad entera", 5000, ra.bounded_need(5000, None))
    check("con --memory menor: el límite", 2000, ra.bounded_need(5000, 2000))
    check("con --memory mayor: la necesidad", 5000, ra.bounded_need(5000, 8000))

    print("caso 7f — la CLI: admit-ram --container registra al dueño y reserva acotado")
    ledger = root / "ram.json"
    owner = subprocess.Popen(["sleep", "30"])
    try:
        code = cli("admit-ram", "5000", "--self-cgroup", str(NO_CGROUP), "--ledger", str(ledger), "--owner", str(owner.pid),
                   "--meminfo", str(meminfo(root / "meminfo3", 3000)), "--timeout", "0",
                   "--container", "known", "--memory-limit-kb", "2000",
                   "--podman", str(podman), "--cgroup-root", str(root / "cgroup")).returncode
        check("5000 pedidos, --memory 2000, 3000 libres: admitido", 0, code)
        check("la reserva es la acotada", {str(owner.pid): 2000}, ra.ReservationLedger(ledger).live())
        check("el dueño queda asociado a su contenedor", {owner.pid: "known"}, ra.read_container_owners(ledger))
        # El cgroup ya usa 2000 kB: la reserva del dueño está entera a la vista
        # y no se resta dos veces. Por su árbol (un `sleep`) se restaría casi entera.
        check("otro de 2500 cabe en 3000 libres: el cgroup ya muestra la reserva", 0,
              cli("admit-ram", "2500", "--self-cgroup", str(NO_CGROUP), "--ledger", str(ledger), "--owner", str(os.getpid()),
                  "--meminfo", str(root / "meminfo3"), "--timeout", "0",
                  "--podman", str(podman), "--cgroup-root", str(root / "cgroup")).returncode)
    finally:
        owner.kill(); owner.wait()

print("caso 7b — soltada la última reserva viva, el registro desaparece: en reposo no queda archivo")
with tempfile.TemporaryDirectory() as idle:
    idle_ledger = Path(idle) / "idle.json"
    ra.ReservationLedger(idle_ledger).save({str(os.getpid()): 10})
    ra.release_from(idle_ledger, os.getpid(), "ram-admission")
    check("sin reservas vivas no queda el archivo", False, idle_ledger.exists())
    ra.ReservationLedger(idle_ledger).save({str(os.getpid()): 10, "1": 5})
    ra.release_from(idle_ledger, os.getpid(), "ram-admission")
    check("con otra reserva viva el registro sigue", True, idle_ledger.exists())

print("caso 7c — sin medida, admit_with espera hasta el plazo: rehusar al instante es de la VRAM, no de aquí")
with tempfile.TemporaryDirectory() as unmeasured:
    started = time.monotonic()
    waited = ra.admit_with(Path(unmeasured) / "ledger.json", 1, os.getpid(), lambda live: None,
                           "ram-admission", timeout_s=0.3, interval_s=0.1)
    check("sin medida no admite", False, waited)
    check("y agota el plazo antes de responder", True, time.monotonic() - started >= 0.3)

print("caso 8 — el registro y la fuente de MemAvailable se declaran por entorno")
os.environ["THYROX_RAM_ADMISSION_LEDGER"] = "/x/ledger.json"
os.environ["THYROX_RAM_ADMISSION_MEMINFO"] = "/x/meminfo"
check("THYROX_RAM_ADMISSION_LEDGER gana", Path("/x/ledger.json"), ra.ram_ledger_path())
check("THYROX_RAM_ADMISSION_MEMINFO gana", Path("/x/meminfo"), ra.meminfo_path())
del os.environ["THYROX_RAM_ADMISSION_LEDGER"], os.environ["THYROX_RAM_ADMISSION_MEMINFO"]
check("sin declararlo, el registro vive en la caché del repo", "ram-admission.json", ra.ram_ledger_path().name)
check("sin declararlo, MemAvailable sale del kernel", Path("/proc/meminfo"), ra.meminfo_path())


def fake_headroom(path: Path, ceiling: str, code: int = 3, delay_s: float = 0.0) -> Path:
    """Un disk-headroom falso: imprime CEILING con --ceiling-bytes, espera DELAY_S
    (para ensanchar la ventana de carrera) y sale con CODE."""
    path.write_text(f"#!/usr/bin/env bash\nsleep {delay_s}\n"
                    f"[[ \" $* \" == *' --ceiling-bytes '* ]] && printf '%s\\n' '{ceiling}'\nexit {code}\n")
    path.chmod(0o755)
    return path


def disk_cli(headroom: Path, ledger: Path, *args: str, floor_mb: str = "0") -> subprocess.CompletedProcess:
    env = {**os.environ, "PYTHONPATH": str(ROOT / "src"), "THYROX_DISK_ADMISSION_HEADROOM": str(headroom),
           "THYROX_DISK_ADMISSION_LEDGER": str(ledger), "THYROX_DISK_ADMISSION_FLOOR_MB": floor_mb}
    return subprocess.run([sys.executable, "-m", "session.resource_admission", *args],
                          cwd=ROOT, env=env, capture_output=True, text=True, timeout=60)


MIB = 1024 * 1024

print("caso 9 — disco: el techo sale de disk-headroom --ceiling-bytes")
with tempfile.TemporaryDirectory() as disk_tmp:
    disk_dir = Path(disk_tmp)
    check("un entero con exit 3 es el techo", 5000,
          ra.ceiling_bytes(fake_headroom(disk_dir / "h3", "5000", 3), "/"))
    check("con exit 1 (reserva alcanzable) también", 7000,
          ra.ceiling_bytes(fake_headroom(disk_dir / "h1", "7000", 1), "/"))
    check("exit 2 es «sin medida»", None, ra.ceiling_bytes(fake_headroom(disk_dir / "h2", "", 2), "/"))
    check("una salida no entera es «sin medida»", None,
          ra.ceiling_bytes(fake_headroom(disk_dir / "hx", "abc", 0), "/"))
    check("un binario ausente es «sin medida»", None, ra.ceiling_bytes(disk_dir / "absent", "/"))

    print("caso 10 — disco: lo admisible es techo − piso − reservas vivas")
    check("10000 − 1000 − 3000", 6000, ra.disk_headroom({"4242": 3000}, 10_000, 1000))
    check("sin techo no hay margen", None, ra.disk_headroom({}, None, 1000))

    print("caso 11 — disk-admit: cabe → 0 y queda la reserva; no cabe → 3")
    ledger = disk_dir / "disk.json"
    fits = fake_headroom(disk_dir / "fits", str(10 * MIB))
    owner = subprocess.Popen(["sleep", "30"])
    try:
        check("cabe → 0", 0, disk_cli(fits, ledger, "disk-admit", "--need-bytes", str(4 * MIB),
                                      "--owner", str(owner.pid), "--timeout", "0").returncode)
        check("la reserva queda registrada", {str(owner.pid): 4 * MIB}, ra.ReservationLedger(ledger).live())
        check("el piso en MiB se descuenta: 10 − 7 de piso no deja 4", 3,
              disk_cli(fits, disk_dir / "floor.json", "disk-admit", "--need-bytes", str(4 * MIB),
                       "--owner", str(owner.pid), "--timeout", "0", floor_mb="7").returncode)
        refused_fit = disk_cli(fits, ledger, "disk-admit", "--need-bytes", str(7 * MIB),
                               "--owner", str(os.getpid()), "--timeout", "0")
        check("no cabe → 3", 3, refused_fit.returncode)
        check("el vencido publica necesidad y techo", True,
              f"necesidad {7 * MIB} bytes" in refused_fit.stderr and f"techo {10 * MIB} bytes" in refused_fit.stderr)

        print("caso 12 — disk-release suelta la reserva")
        check("disk-release sale 0", 0, disk_cli(fits, ledger, "disk-release", "--owner", str(owner.pid)).returncode)
        check("el registro ya no la cuenta", {}, ra.ReservationLedger(ledger).live())
    finally:
        owner.kill(); owner.wait()

    print("caso 13 — dos dueños vivos cuya suma no cabe: entra uno")
    slow = fake_headroom(disk_dir / "slow", str(5 * MIB), delay_s=0.4)
    race_ledger = disk_dir / "race.json"
    owners = [subprocess.Popen(["sleep", "30"]) for _ in range(2)]
    try:
        env = {**os.environ, "PYTHONPATH": str(ROOT / "src"), "THYROX_DISK_ADMISSION_HEADROOM": str(slow),
               "THYROX_DISK_ADMISSION_LEDGER": str(race_ledger), "THYROX_DISK_ADMISSION_FLOOR_MB": "0"}
        racers = [subprocess.Popen([sys.executable, "-m", "session.resource_admission", "disk-admit",
                                    "--need-bytes", str(3 * MIB), "--owner", str(o.pid), "--timeout", "0"],
                                   cwd=ROOT, env=env) for o in owners]
        check("uno admitido (0) y uno vencido (3)", [0, 3], sorted(r.wait(timeout=60) for r in racers))
        check("una sola reserva en el registro", 1, len(ra.ReservationLedger(race_ledger).live()))

        print("caso 14 — muerto el dueño, su reserva de disco deja de contar")
        for o in owners:
            o.kill(); o.wait()
        check("entra sin que nadie haya soltado", 0,
              disk_cli(fake_headroom(disk_dir / "tight", str(5 * MIB)), race_ledger, "disk-admit",
                       "--need-bytes", str(4 * MIB),
                       "--owner", str(os.getpid()), "--timeout", "0").returncode)
    finally:
        for o in owners:
            o.kill(); o.wait()

    print("caso 15 — disk-headroom rehúsa: 2, con la causa, sin tocar el registro")
    refused_ledger = disk_dir / "refused.json"
    refused = disk_cli(fake_headroom(disk_dir / "refuse", "", 2), refused_ledger, "disk-admit",
                       "--need-bytes", "1", "--owner", str(os.getpid()), "--timeout", "5")
    check("sale 2", 2, refused.returncode)
    check("nombra disk-headroom en stderr", True, "disk-headroom" in refused.stderr)
    check("no crea el registro", False, refused_ledger.exists())

print("caso 16 — el registro, el piso y el medidor de disco se declaran por entorno")
for name in ("THYROX_DISK_ADMISSION_LEDGER", "THYROX_DISK_ADMISSION_FLOOR_MB", "THYROX_DISK_ADMISSION_HEADROOM"):
    os.environ.pop(name, None)
check("sin declararlo, el registro vive en la caché del repo", "disk-admission.json", ra.disk_ledger_path().name)
check("sin declararlo, el piso es el default con nombre", ra.DEFAULT_DISK_FLOOR_MB * MIB, ra.disk_floor_bytes())
check("sin declararlo, el medidor es el disk-headroom del árbol", "disk-headroom.sh", ra.disk_headroom_command().name)
os.environ["THYROX_DISK_ADMISSION_LEDGER"] = "/x/disk.json"
os.environ["THYROX_DISK_ADMISSION_FLOOR_MB"] = "3"
os.environ["THYROX_DISK_ADMISSION_HEADROOM"] = "/x/headroom"
check("THYROX_DISK_ADMISSION_LEDGER gana", Path("/x/disk.json"), ra.disk_ledger_path())
check("THYROX_DISK_ADMISSION_FLOOR_MB gana, en MiB", 3 * MIB, ra.disk_floor_bytes())
check("THYROX_DISK_ADMISSION_HEADROOM gana", Path("/x/headroom"), ra.disk_headroom_command())
for name in ("THYROX_DISK_ADMISSION_LEDGER", "THYROX_DISK_ADMISSION_FLOOR_MB", "THYROX_DISK_ADMISSION_HEADROOM"):
    del os.environ[name]

print("caso 17 — .env.example declara las tres variables del disco")
example = (ROOT / ".env.example").read_text()
for name in ("THYROX_DISK_ADMISSION_LEDGER", "THYROX_DISK_ADMISSION_FLOOR_MB", "THYROX_DISK_ADMISSION_HEADROOM"):
    check(f"{name} figura en .env.example", True, f"\n{name}=" in example)

V1_SENTINEL = 9223372036854771712  # el «sin límite» de v1 medido en este anfitrión


def membership(path: Path, text: str) -> Path:
    path.write_text(text)
    return path


def cgroup_level(directory: Path, files: tuple[str, str], limit: str, usage: str) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / files[0]).write_text(f"{limit}\n")
    (directory / files[1]).write_text(f"{usage}\n")


V1_FILES = ("memory.limit_in_bytes", "memory.usage_in_bytes")
V2_FILES = ("memory.max", "memory.current")

print("caso 18 — cgroups v1: el límite más restrictivo del cgroup y sus ancestros")
with tempfile.TemporaryDirectory() as raw:
    root = Path(raw)
    info = meminfo(root / "meminfo", 10_000)
    own_v1 = membership(root / "self-v1", "4:memory:/a/b\n3:cpuset:/\n0::/\n")
    view = ra.CgroupView(own_v1, root)
    cgroup_level(root / "memory" / "a" / "b", V1_FILES, str(8 * MIB), str(2 * MIB))
    cgroup_level(root / "memory" / "a", V1_FILES, str(4 * MIB), str(3 * MIB))
    check("el ancestro deja 1 MiB aunque el propio deje 6", 1024, ra.effective_available_ram_kb(info, view))
    cgroup_level(root / "memory" / "a", V1_FILES, str(V1_SENTINEL), str(3 * MIB))
    check("con el ancestro sin límite manda el propio: 6 MiB", 6144, ra.effective_available_ram_kb(info, view))
    cgroup_level(root / "memory" / "a" / "b", V1_FILES, str(V1_SENTINEL), str(2 * MIB))
    check("el sentinela de v1 es «sin límite», no una cifra", ra.UNLIMITED, ra.cgroup_headroom_bytes(view))
    check("y sin límite la RAM es la del anfitrión", 10_000, ra.effective_available_ram_kb(info, view))
    cgroup_level(root / "memory" / "a" / "b", V1_FILES, str(2 * MIB), str(3 * MIB))
    check("uso por encima del límite: 0, no negativo", 0, ra.cgroup_headroom_bytes(view))
    check("«sin límite» no es 0", False, ra.UNLIMITED == 0)

    print("caso 19 — cgroups v2 con un doble: memory.max y memory.current")
    own_v2 = membership(root / "self-v2", "0::/x/y\n")
    view2 = ra.CgroupView(own_v2, root / "unified")
    cgroup_level(root / "unified" / "x" / "y", V2_FILES, str(5 * MIB), str(1 * MIB))
    cgroup_level(root / "unified" / "x", V2_FILES, "max", "0")
    check("4 MiB libres bajo memory.max", 4096, ra.effective_available_ram_kb(info, view2))
    cgroup_level(root / "unified" / "x" / "y", V2_FILES, "max", str(1 * MIB))
    check("«max» en todos los niveles: sin límite", ra.UNLIMITED, ra.cgroup_headroom_bytes(view2))

    print("caso 20 — un cgroup ilegible es «sin medida», no la RAM del anfitrión")
    cgroup_level(root / "memory" / "a" / "b", V1_FILES, "basura", "0")
    check("límite ilegible: None", None, ra.effective_available_ram_kb(info, view))
    check("pertenencia ilegible: None", None,
          ra.effective_available_ram_kb(info, ra.CgroupView(root / "no-existe", root)))

    print("caso 21 — sin cgroup de memoria observable, la RAM es la del anfitrión")
    check("en la raíz de v2: sin límite", ra.UNLIMITED,
          ra.cgroup_headroom_bytes(ra.CgroupView(membership(root / "self-root", "0::/\n"), root / "unified")))
    check("un cgroup propio que no está montado: sin límite", ra.UNLIMITED,
          ra.cgroup_headroom_bytes(ra.CgroupView(membership(root / "self-hidden", "0::/oculto\n"), root / "unified")))

    print("caso 22 — un límite holgado no promete más de lo que el anfitrión tiene")
    cgroup_level(root / "memory" / "a" / "b", V1_FILES, str(64 * MIB), "0")
    cgroup_level(root / "memory" / "a", V1_FILES, str(V1_SENTINEL), "0")
    check("64 MiB de límite con 10000 kB libres en el anfitrión: 10000", 10_000,
          ra.effective_available_ram_kb(info, view))

    print("caso 23 — la admisión de RAM lee el cgroup (invariante 9)")
    cgroup_level(root / "memory" / "a" / "b", V1_FILES, str(3 * MIB), str(1 * MIB))
    check("10000 kB en /proc/meminfo, 2 MiB en el cgroup: 2048", 2048,
          ra.ram_headroom({}, info, usage=lambda pid: 0, cgroup=view))
    big = meminfo(root / "meminfo-big", 5_000_000)
    check("admit-ram bajo el límite: 3 GB no caben en 2 MiB", 3,
          cli("admit-ram", "3000000", "--ledger", str(root / "cg.json"), "--owner", str(os.getpid()),
              "--meminfo", str(big), "--self-cgroup", str(own_v1), "--cgroup-root", str(root),
              "--timeout", "0").returncode)
    check("admit-ram sin límite: caben en los 5 GB del anfitrión", 0,
          cli("admit-ram", "3000000", "--ledger", str(root / "cg2.json"), "--owner", str(os.getpid()),
              "--meminfo", str(big), "--self-cgroup", str(membership(root / "self-free", "0::/\n")),
              "--cgroup-root", str(root), "--timeout", "0").returncode)

print("caso 24 — el cgroup real de este anfitrión se lee sin error")
real = ra.cgroup_headroom_bytes(ra.CgroupView())
check("un entero o «sin límite»", True, isinstance(real, (int, ra.Unlimited)))

print("caso 25 — un admit-ram rehusado publica sus cifras, como el de disco")
with tempfile.TemporaryDirectory() as refusal_dir:
    refusal_root = Path(refusal_dir)
    refused_ram = cli("admit-ram", "5000", "--self-cgroup", str(NO_CGROUP),
                      "--ledger", str(refusal_root / "ram.json"), "--owner", str(os.getpid()),
                      "--meminfo", str(meminfo(refusal_root / "meminfo", 3000)), "--timeout", "0")
    check("no cabe → 3", 3, refused_ram.returncode)
    check("nombra la necesidad y lo libre", True,
          "necesidad 5000 kB" in refused_ram.stderr and "libre 3000 kB" in refused_ram.stderr)

print(f"test_resource_admission: {OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
