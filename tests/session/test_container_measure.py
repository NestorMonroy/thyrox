"""La medida de un contenedor sale de SU cgroup, no del cliente que lo lanzó.

El proceso de un contenedor cuelga de ``conmon`` → ``init``, no del
``podman run`` del wrapper: GNU Time sobre ``podman run`` dio 41 MB con el
contenedor reteniendo ~200 MB (banco ``podman-execution-primitive-*``).
``container_measure`` lee los PIDs y el pico de memoria del cgroup que da
``podman inspect``, con tres estados que no se colapsan: medida, ausente y
error.

El caso 1 corre un contenedor real (``docker.io/ollama/ollama:0.35.0``); sin
``podman`` o sin la imagen, rehúsa con exit 2 en vez de pasar en verde.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from session import container_measure as cm
from session.resource_admission import tree

OK = FAILED = 0
IMAGE = "docker.io/ollama/ollama:0.35.0"
HELD_BYTES = 200_000_000
#: Lo que el pico tiene que alcanzar para reflejar los ~200 MB retenidos.
PEAK_FLOOR_BYTES = 150_000_000
#: El pico que GNU Time atribuyó al cliente en la sonda del banco, holgado.
CLIENT_CEILING_BYTES = 100_000_000
WAIT_S = 60
EXIT_REFUSED = 2


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLA {label}: esperado {expected!r}, obtenido {obtained!r}"); FAILED += 1


def podman_ready() -> bool:
    if shutil.which("podman") is None:
        return False
    found = subprocess.run(["podman", "image", "exists", IMAGE], capture_output=True, timeout=60)
    return found.returncode == 0


def wait_for_peak(name: str) -> cm.ContainerReading:
    """Lee hasta que el pico del cgroup refleje la reserva, o vence el plazo."""
    deadline = time.monotonic() + WAIT_S
    reading = cm.read_container(name)
    while time.monotonic() < deadline:
        reading = cm.read_container(name)
        if reading.peak_bytes is not None and reading.peak_bytes >= PEAK_FLOOR_BYTES:
            return reading
        time.sleep(0.5)
    return reading


def fake_podman(directory: Path, cgroup_path: str) -> Path:
    """Un ``podman`` falso: ``inspect`` devuelve un contenedor en marcha con
    esa ruta de cgroup; cualquier otro nombre no existe."""
    script = directory / "podman"
    script.write_text("#!/usr/bin/env bash\n"
                      'case "$*" in\n'
                      '  *exists*known*) exit 0 ;;\n'
                      '  *exists*broken*) echo "cannot connect to the service" >&2; exit 125 ;;\n'
                      '  *exists*) exit 1 ;;\n'
                      f'  *inspect*known*) echo "true {cgroup_path}" ;;\n'
                      '  *) echo "orden no prevista: $*" >&2; exit 125 ;;\n'
                      "esac\n")
    script.chmod(0o755)
    return script


def case_real_container() -> None:
    print("caso 1 — contenedor real: sus PIDs, no el cliente; y el pico de su cgroup")
    name = f"thyrox-measure-test-{uuid.uuid4().hex[:8]}"
    command = f'x=$(head -c {HELD_BYTES} /dev/zero | tr "\\0" a); sleep 30'
    client = subprocess.Popen(["podman", "run", "--rm", "--name", name, "--entrypoint", "sh", IMAGE,
                               "-c", command], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        reading = wait_for_peak(name)
        inspected = subprocess.run(["podman", "inspect", "-f", "{{.State.Pid}}", name],
                                   capture_output=True, text=True, timeout=30).stdout.strip()
        check("estado medido", cm.MEASURED, reading.state)
        check("el PID principal del contenedor está en sus miembros", True,
              inspected.isdigit() and int(inspected) in reading.pids)
        check("el cliente `podman run` NO está en sus miembros", False, client.pid in reading.pids)
        check("el árbol del cliente no alcanza al contenedor", False,
              inspected.isdigit() and int(inspected) in tree(client.pid))
        check("el pico del cgroup refleja la reserva de ~200 MB", True,
              (reading.peak_bytes or 0) >= PEAK_FLOOR_BYTES)
        check("y supera lo que GNU Time atribuyó al cliente", True,
              (reading.peak_bytes or 0) > CLIENT_CEILING_BYTES)
        check("el uso actual es una cifra", True, isinstance(reading.usage_bytes, int))
    finally:
        subprocess.run(["podman", "rm", "-f", "-t", "0", name], capture_output=True, timeout=60)
        client.wait(timeout=60)


def case_absent_container() -> None:
    print("caso 2 — un contenedor que no existe está AUSENTE, no medido en cero")
    reading = cm.read_container(f"thyrox-no-existe-{uuid.uuid4().hex[:8]}")
    check("ausente", cm.ABSENT, reading.state)
    check("sin PIDs ni cifras", (frozenset(), None, None),
          (reading.pids, reading.peak_bytes, reading.usage_bytes))


def cgroup_v1_double(root: Path, relative: str) -> Path:
    memory = root / "memory" / relative.lstrip("/")
    memory.mkdir(parents=True)
    return memory


def case_cgroup_doubles(tmp: Path) -> None:
    print("caso 3 — dobles de cgroup: v1 legible, v2 legible, ilegible y desaparecido")
    relative = "/libpod_parent/libpod-abc"
    podman = str(fake_podman(tmp, relative))

    v1_root = tmp / "v1"
    memory = cgroup_v1_double(v1_root, relative)
    (memory / "cgroup.procs").write_text("11\n12\n")
    (memory / "memory.max_usage_in_bytes").write_text("5000\n")
    (memory / "memory.usage_in_bytes").write_text("3000\n")
    reading = cm.read_container("known", podman, v1_root)
    check("v1: medido con sus PIDs y cifras", (cm.MEASURED, frozenset({11, 12}), 5000, 3000),
          (reading.state, reading.pids, reading.peak_bytes, reading.usage_bytes))

    v2_root = tmp / "v2"
    unified = v2_root / relative.lstrip("/")
    unified.mkdir(parents=True)
    (unified / "cgroup.controllers").write_text("memory pids\n")
    (unified / "cgroup.procs").write_text("21\n")
    (unified / "memory.peak").write_text("7000\n")
    (unified / "memory.current").write_text("4000\n")
    reading = cm.read_container("known", podman, v2_root)
    check("v2: medido con memory.peak y memory.current", (cm.MEASURED, frozenset({21}), 7000, 4000),
          (reading.state, reading.pids, reading.peak_bytes, reading.usage_bytes))

    broken_root = tmp / "broken"
    memory = cgroup_v1_double(broken_root, relative)
    (memory / "cgroup.procs").mkdir()
    (memory / "memory.max_usage_in_bytes").write_text("5000\n")
    (memory / "memory.usage_in_bytes").write_text("3000\n")
    reading = cm.read_container("known", podman, broken_root)
    check("cgroup ilegible: error con causa", (cm.ERROR, True), (reading.state, bool(reading.reason)))

    garbled_root = tmp / "garbled"
    memory = cgroup_v1_double(garbled_root, relative)
    (memory / "cgroup.procs").write_text("11\n")
    (memory / "memory.max_usage_in_bytes").write_text("no-es-un-número\n")
    (memory / "memory.usage_in_bytes").write_text("3000\n")
    check("cifra no entera: error", cm.ERROR, cm.read_container("known", podman, garbled_root).state)

    check("cgroup desaparecido (el contenedor ya salió): ausente", cm.ABSENT,
          cm.read_container("known", podman, tmp / "empty").state)
    check("podman que falla (exit 125): error, no ausente", cm.ERROR,
          cm.read_container("broken", podman, v1_root).state)
    check("podman que no se puede ejecutar: error, no ausente", cm.ERROR,
          cm.read_container("known", str(tmp / "no-podman"), v1_root).state)


def case_member_source(tmp: Path) -> None:
    print("caso 4 — la fuente de miembros del contenedor")
    relative = "/libpod_parent/libpod-src"
    (tmp / "src").mkdir()
    podman = str(fake_podman(tmp / "src", relative))
    root = tmp / "src-root"
    memory = cgroup_v1_double(root, relative)
    (memory / "cgroup.procs").write_text("31\n")
    (memory / "memory.max_usage_in_bytes").write_text("1\n")
    (memory / "memory.usage_in_bytes").write_text("1\n")
    source = cm.ContainerMembers("known", podman, root)
    check("vivo: sus miembros son los del cgroup", {31}, source.current_members())
    (memory / "cgroup.procs").unlink()
    (memory / "cgroup.procs").mkdir()
    try:
        source.current_members()
        raised = ""
    except cm.MembersUnavailable as error:
        raised = str(error)
    check("cgroup ilegible: lanza MembersUnavailable con su causa, no para ni da vacío", True, bool(raised))
    gone = cm.ContainerMembers("otro", podman, root)
    check("un contenedor ausente ya no vive: None, no un conjunto vacío", None, gone.current_members())


def case_cli(tmp: Path) -> None:
    print("caso 5 — la CLI: read imprime el estado y sale 0 sólo si midió")
    relative = "/libpod_parent/libpod-cli"
    (tmp / "cli").mkdir()
    podman = str(fake_podman(tmp / "cli", relative))
    root = tmp / "cli-root"
    memory = cgroup_v1_double(root, relative)
    (memory / "cgroup.procs").write_text("41\n40\n")
    (memory / "memory.max_usage_in_bytes").write_text("900\n")
    (memory / "memory.usage_in_bytes").write_text("800\n")
    env = {**os.environ, "PYTHONPATH": str(ROOT / "src")}

    def run(name: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, "-m", "session.container_measure", "read", name,
                               "--podman", podman, "--cgroup-root", str(root)],
                              env=env, capture_output=True, text=True, timeout=60)
    measured = run("known")
    check("medido: exit 0 y la línea con pico, uso y PIDs", (0, "measured 900 800 40,41"),
          (measured.returncode, measured.stdout.strip()))
    absent = run("otro")
    check("ausente: exit 2 y la palabra absent", (2, "absent"),
          (absent.returncode, absent.stdout.split(" ", 1)[0]))


def main() -> int:
    if not podman_ready():
        print(f"test_container_measure: sin podman o sin {IMAGE}; no se afirma nada", file=sys.stderr)
        return EXIT_REFUSED
    case_real_container()
    case_absent_container()
    with tempfile.TemporaryDirectory() as raw:
        case_cgroup_doubles(Path(raw))
        case_member_source(Path(raw))
        case_cli(Path(raw))
    print(f"\ntest_container_measure: {OK} ok, {FAILED} falla(s)")
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())
