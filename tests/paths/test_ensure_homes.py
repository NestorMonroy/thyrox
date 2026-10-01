#!/usr/bin/env python3
"""El registro completo de hogares y ``ensure_homes``: Empaquetado P11.

Un clon nuevo no trae los hogares que git ignora (``.claude/jobs-ledger``,
``.thyrox/runtime``, ``.thyrox/pool-worktrees``) y cada módulo los
«descubría» en su primer uso. Estos casos miden las dos mitades del cierre:

- el registro (``paths/declarations.py``) decide CADA clave de hogar que
  ``.env.example`` publica —registrada o excluida con razón—, derivada del
  archivo y no de una lista escrita a mano;
- ``paths/ensure_homes.py`` crea lo registrado, es idempotente y rehúsa con
  exit 2 nombrando la clave cuando el sitio no es escribible.

Qué haría fallar a estos casos: que el registro dejara de leer
``.env.example`` (cae el de la clave nueva sin decidir), que la declaración
del ``.env`` del clon no ganara al default (cae el de la declaración), o que
el rehúse creara algo antes de rehusar (cae el del plan atómico).

Ciega a: los hogares que un módulo compone sin clave de entorno, que el
registro no puede ver por nombre. Las raíces son sintéticas (``mkdtemp``): la
prueba nunca escribe en los hogares reales.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))
#: La raíz ya estrechada a ``Path``: el narrowing de un global no cruza al
#: cuerpo de una función.
ROOT: Path = _ROOT

from paths import declarations  # noqa: E402
from workbench import paths as workbench  # noqa: E402

ENSURE_HOMES = ROOT / "src" / "paths" / "ensure_homes.py"
CONTRACT = ROOT / declarations.CONTRACT_FILE_NAME
NEW_KEY = "THYROX_BRAND_NEW_THING_DIR"
MODEL_ARTIFACT_CACHE_KEY = "THYROX_MODEL_ARTIFACT_CACHE_DIR"
EXIT_REFUSED = 2
RESTRICTIVE_UMASK = 0o077
PERMISSION_BITS = 0o777
OUTCOMES = ("creado", "existía", "declarado fuera del árbol")

PASSED = 0
FAILED = 0


def check(label: str, expected: object, actual: object) -> None:
    global PASSED, FAILED
    if expected == actual:
        PASSED += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{actual}]")


def registered_keys() -> set[str]:
    return {home.key for home in declarations.HOMES}


def isolated_env(root: Path) -> dict[str, str]:
    """El entorno del proceso hijo sin ninguna clave de hogar heredada.

    Equivalente Python de ``thyrox_isolate_homes``: sin retirar las claves, un
    ``THYROX_RUNTIME_DIR`` exportado por el corredor decidiría por la prueba.
    """
    decided = registered_keys() | set(declarations.EXCLUDED)
    env = {name: value for name, value in os.environ.items()
           if name not in decided and not name.startswith("THYROX_")}
    env["THYROX_ROOT"] = str(root)
    env["PYTHONPATH"] = str(ROOT / "src")
    return env


def synthetic_root(base: Path) -> Path:
    root = base / "clone"
    (root / "src" / "paths").mkdir(parents=True)
    (root / "src" / "paths" / "reach.py").write_text("")
    return root


def run_ensure(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(ENSURE_HOMES), *args], env=isolated_env(root),
                          capture_output=True, text=True, check=False,
                          umask=RESTRICTIVE_UMASK)


def lines_with(stdout: str, outcome: str) -> int:
    return sum(1 for line in stdout.splitlines() if line.startswith(outcome))


def outcome_lines(stdout: str) -> int:
    return sum(lines_with(stdout, outcome) for outcome in OUTCOMES)


def snapshot(root: Path) -> list[str]:
    return sorted(str(p.relative_to(root)) for p in root.rglob("*"))


def default_path(root: Path, key: str) -> Path:
    home = next(h for h in declarations.HOMES if h.key == key)
    return home.default_under(root, workbench.STATE_DIR_DEFAULT)


def home_mode() -> int:
    return declarations.HOME_MODE


def case_registry_decides_every_contract_key() -> None:
    print("\n== el registro decide cada clave de hogar del contrato ==")
    check("ninguna clave de .env.example sin decidir", (),
          declarations.undecided_keys(CONTRACT))
    check("ninguna decisión sobre una clave que el contrato ya no publica", (),
          declarations.stale_decisions(CONTRACT))
    check("registrada y excluida son disjuntas", set(),
          registered_keys() & set(declarations.EXCLUDED))
    check("toda exclusión lleva su razón", [],
          [k for k, why in declarations.EXCLUDED.items() if not why.strip()])
    check("todo default es relativo a la raíz", [],
          [h.key for h in declarations.HOMES if Path(h.default).is_absolute()])
    check("todo hogar nombra su módulo dueño", [],
          [h.key for h in declarations.HOMES if not (ROOT / "src" / h.owner).is_file()])


def case_new_key_is_undecided(base: Path) -> None:
    print("\n== una clave nueva en el contrato queda sin decidir ==")
    contract = base / "contract.env"
    contract.write_text(CONTRACT.read_text() + f"\n# nueva\n{NEW_KEY}=\n")
    check("la clave nueva sale como sin decidir", (NEW_KEY,),
          declarations.undecided_keys(contract))


def case_creates_registered_homes(base: Path) -> None:
    print("\n== crea los hogares registrados, e idempotente ==")
    root = synthetic_root(base / "fresh")
    first = run_ensure(root)
    check("primera corrida -> exit 0", 0, first.returncode)
    missing = [h.key for h in declarations.HOMES if not h.is_file
               and not default_path(root, h.key).is_dir()]
    check("existen todos los hogares de directorio", [], missing)
    check("un hogar que es archivo sólo asegura su padre", (True, False),
          (default_path(root, "THYROX_RAM_ADMISSION_LEDGER").parent.is_dir(),
           default_path(root, "THYROX_RAM_ADMISSION_LEDGER").exists()))
    check("una línea de desenlace por hogar", len(declarations.HOMES),
          outcome_lines(first.stdout))
    check("sobre un clon vacío, crea", True, lines_with(first.stdout, "creado") > 0)
    check("el modo del hogar creado no depende del umask", home_mode(),
          default_path(root, "THYROX_RUNTIME_DIR").stat().st_mode & PERMISSION_BITS)
    before = snapshot(root)
    second = run_ensure(root)
    check("segunda corrida -> exit 0", 0, second.returncode)
    check("segunda corrida no cambia el árbol", before, snapshot(root))
    check("segunda corrida: todo `existía`", len(declarations.HOMES),
          lines_with(second.stdout, "existía"))
    check("y lo dice", True, "nada que crear" in second.stdout)


def case_clone_declaration_wins(base: Path) -> None:
    print("\n== una declaración en el .env del clon gana al default ==")
    root = synthetic_root(base / "declared")
    (root / ".env").write_text("THYROX_RUNTIME_DIR=own-runtime\n")
    result = run_ensure(root)
    check("exit 0", 0, result.returncode)
    check("crea el hogar declarado", True, (root / "own-runtime").is_dir())
    check("no crea el default", False, (root / ".thyrox" / "runtime").exists())


def case_resolve_single_key(base: Path) -> None:
    print("\n== --resolve publica la ruta de un hogar sin crear nada ==")
    root = synthetic_root(base / "resolve")
    before = snapshot(root)
    result = run_ensure(root, "--resolve", "THYROX_RUNTIME_DIR")
    check("exit 0", 0, result.returncode)
    check("imprime el default del registro", str(root / ".thyrox" / "runtime"), result.stdout.strip())
    check("no crea nada", before, snapshot(root))
    (root / ".env").write_text("THYROX_RUNTIME_DIR=own-runtime\n")
    declared = run_ensure(root, "--resolve", "THYROX_RUNTIME_DIR")
    check("la declaración del clon gana", str(root / "own-runtime"), declared.stdout.strip())
    unknown = run_ensure(root, "--resolve", NEW_KEY)
    check("una clave no registrada rehúsa con exit 2", EXIT_REFUSED, unknown.returncode)
    check("sin ruta en stdout", "", unknown.stdout)
    check("nombra la clave", True, NEW_KEY in unknown.stderr)


def case_declared_outside_tree(base: Path) -> None:
    print("\n== una declaración fuera del árbol no se crea ==")
    root = synthetic_root(base / "outside")
    elsewhere = base / "elsewhere" / "runtime"
    (root / ".env").write_text(f"THYROX_RUNTIME_DIR={elsewhere}\n")
    result = run_ensure(root)
    check("exit 0", 0, result.returncode)
    check("lo dice", True, any(line.startswith("declarado fuera del árbol")
                               and "THYROX_RUNTIME_DIR" in line
                               for line in result.stdout.splitlines()))
    check("no lo crea", False, elsewhere.exists())


def case_unwritable_declaration_refuses(base: Path) -> None:
    print("\n== una declaración no escribible rehúsa, sin crear nada ==")
    root = synthetic_root(base / "unwritable")
    (root / "a-file").write_text("no soy un directorio\n")
    (root / ".env").write_text("THYROX_RUNTIME_DIR=a-file/runtime\n")
    before = snapshot(root)
    result = run_ensure(root)
    check("exit 2", EXIT_REFUSED, result.returncode)
    check("nombra la clave", True, "THYROX_RUNTIME_DIR" in result.stderr)
    check("no crea nada antes de rehusar", before, snapshot(root))


def case_model_artifact_cache_matches_its_owner() -> None:
    print("\n== la caché de artefactos de modelo: mismo default que su dueño TS ==")
    home = next((h for h in declarations.HOMES if h.key == MODEL_ARTIFACT_CACHE_KEY), None)
    check("registrada como hogar", True, home is not None)
    if home is None:
        return
    check("es un directorio", False, home.is_file)
    owner_text = (ROOT / "src" / home.owner).read_text(encoding="utf-8")
    check("el dueño declara la clave", True, MODEL_ARTIFACT_CACHE_KEY in owner_text)
    check("el dueño compone el mismo default", True,
          home.default.startswith(".thyrox/models/")
          and f"${{base}}/{Path(home.default).name}`" in owner_text)


def main() -> int:
    base = Path(tempfile.mkdtemp(prefix="ensure-homes-"))
    try:
        case_registry_decides_every_contract_key()
        case_new_key_is_undecided(base)
        case_creates_registered_homes(base)
        case_clone_declaration_wins(base)
        case_resolve_single_key(base)
        case_declared_outside_tree(base)
        case_unwritable_declaration_refuses(base)
        case_model_artifact_cache_matches_its_owner()
    finally:
        shutil.rmtree(base, ignore_errors=True)
    print(f"\n{PASSED + FAILED} aserciones: {PASSED} ok, {FAILED} fallidas")
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())
