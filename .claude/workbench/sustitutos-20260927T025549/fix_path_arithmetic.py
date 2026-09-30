"""Sustituye `parents[N]` por el localizador en los 16 archivos que
`check_path_arithmetic.py` marcó (2026-09-27). Cada par debe casar una vez."""
import pathlib, sys

INSERT = 'sys.path.insert(0, str(Path(__file__).resolve().parents[{n}] / "src"))'
PLAN = {
 "src/typescript/emit_declarations.py": [
   ('BUILD_GLOBALS = Path(__file__).resolve().parents[1] / "types" / "build-globals.d.ts"',
    'BUILD_GLOBALS = reach.thyrox_root() / "src" / "types" / "build-globals.d.ts"')],
 "src/verify/check_lint_zero.py": [
   ("from pathlib import Path\n", "from pathlib import Path\n\nfrom paths import reach\n"),
   ('PROVIDER_BIN = Path(__file__).resolve().parents[2] / ".venv" / "bin"',
    'PROVIDER_BIN = reach.thyrox_root() / ".venv" / "bin"'),
   ('default=Path(__file__).resolve().parents[2])', 'default=reach.thyrox_root())')],
 "tests/package/test_packages_home.py": [
   ("ROOT = Path(__file__).resolve().parents[2]", "ROOT = reach.thyrox_root()")],
 "tests/paths/test_unprefixed_clone.py": [
   ("ROOT = Path(__file__).resolve().parents[2]", "ROOT = reach.thyrox_root()")],
 "tests/session/hardware/test_gpu_admission_real.py": [
   ('ROOT = Path(__file__).resolve().parents[3]\nsys.path.insert(0, str(ROOT / "src"))\n',
    INSERT.format(n=3) + '\nfrom paths import reach  # noqa: E402\n\nROOT = reach.thyrox_root()\n')],
 "tests/session/test_gpu_monitor.py": [
   ("from session import gpu_monitor as gm\n", "from paths import reach\nfrom session import gpu_monitor as gm\n"),
   ('str(Path(__file__).resolve().parents[2] / "src")', 'str(reach.thyrox_root() / "src")')],
 "tests/session/test_gpu_scenarios.py": [
   ('ROOT = Path(__file__).resolve().parents[2]\nsys.path.insert(0, str(ROOT / "src"))\n',
    INSERT.format(n=2) + '\nfrom paths import reach  # noqa: E402\n\nROOT = reach.thyrox_root()\n')],
 "tests/session/test_gpu_trace.py": [
   ('ROOT = Path(__file__).resolve().parents[2]\nsys.path.insert(0, str(ROOT / "src"))\n',
    INSERT.format(n=2) + '\nfrom paths import reach  # noqa: E402\n\nROOT = reach.thyrox_root()\n')],
 "tests/session/test_shared_lock.py": [
   ("from session import shared_lock as sl  # noqa: E402\n",
    "from paths import reach  # noqa: E402\nfrom session import shared_lock as sl  # noqa: E402\n"),
   ('SRC = str(Path(__file__).resolve().parents[2] / "src")', 'SRC = str(reach.thyrox_root() / "src")')],
 "tests/verify/test_check_exports_types.py": [
   ("from pathlib import Path\n", "from pathlib import Path\n\nfrom paths import reach\n"),
   ("ROOT = Path(__file__).resolve().parents[2]", "ROOT = reach.thyrox_root()")],
 "tests/verify/test_check_lint_zero.py": [
   ("from pathlib import Path\n", "from pathlib import Path\n\nfrom paths import reach\n"),
   ("ROOT = Path(__file__).resolve().parents[2]", "ROOT = reach.thyrox_root()")],
 "tests/verify/test_check_stand_ins.py": [
   ('ROOT = Path(__file__).resolve().parents[2]\nsys.path.insert(0, str(ROOT / "src"))\n',
    INSERT.format(n=2) + '\nfrom paths import reach  # noqa: E402\n\nROOT = reach.thyrox_root()\n')],
 "tests/verify/test_stand_ins_cleared.py": [
   ('ROOT = Path(__file__).resolve().parents[2]\nsys.path.insert(0, str(ROOT / "src"))\n',
    INSERT.format(n=2) + '\nfrom paths import reach  # noqa: E402\n\nROOT = reach.thyrox_root()\n')],
 "tests/verify/test_step_close.py": [
   ("from session import shared_lock\n", "from paths import reach\nfrom session import shared_lock\n"),
   ('str(Path(__file__).resolve().parents[2] / "src")', 'str(reach.thyrox_root() / "src")')],
 "tests/verify/test_step_setup.py": [
   ("from verify import step_setup as ss\n\n", "from paths import reach\nfrom verify import step_setup as ss\n\n"),
   ('str(Path(__file__).resolve().parents[2] / "src")', 'str(reach.thyrox_root() / "src")')],
}
bad = 0
for rel, pairs in PLAN.items():
    p = pathlib.Path(rel); s = p.read_text()
    for old, new in pairs:
        n = s.count(old)
        if n != 1:
            print(f"{rel}: {n} coincidencias de {old[:60]!r}"); bad += 1; continue
        s = s.replace(old, new)
    p.write_text(s)
sys.exit(1 if bad else 0)
