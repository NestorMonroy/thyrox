#!/usr/bin/env python3
"""Suite de `check_lint_zero.py`: el gate que mantiene en cero los hallazgos
de ShellCheck (`.sh`) y de pyright + ruff (`.py`).

Cada caso corre el gate como proceso sobre un árbol sintético, con los
verificadores reales de `.venv/bin` (grupo `lint`). El caso de la herramienta
ausente es el que discrimina: un 0 ahí no distinguiría «no hay hallazgos» de
«no pude medir».
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GATE = ROOT / "src" / "verify" / "check_lint_zero.py"
PASSED = 0
FAILED = 0


def check(label: str, condition: bool, detail: str = "") -> None:
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"  ok   {label}")
    else:
        FAILED += 1
        print(f"  FAIL {label}\n       {detail}")


def run(root: Path, *files: str, env: dict | None = None) -> subprocess.CompletedProcess:
    full_env = {**os.environ, **(env or {})}
    return subprocess.run([sys.executable, str(GATE), "--root", str(root), *files],
                          capture_output=True, text=True, env=full_env, timeout=300)


def tree() -> Path:
    base = Path(tempfile.mkdtemp(prefix="lint-zero-"))
    (base / "pyproject.toml").write_text("[tool.pyright]\ninclude = ['.']\n")
    return base


def case_clean_shell_passes() -> None:
    base = tree()
    (base / "ok.sh").write_text('#!/usr/bin/env bash\nset -eu\necho "hola"\n')
    r = run(base, "ok.sh")
    check("un .sh limpio sale 0", r.returncode == 0, r.stdout + r.stderr)
    check("y publica el conteo con su denominador",
          "shellcheck: 0 hallazgo(s) (alcance medido: 1 archivo(s))" in r.stdout, r.stdout)


def case_shell_warning_blocks() -> None:
    base = tree()
    (base / "bad.sh").write_text('#!/usr/bin/env bash\nsin_uso=1\necho hola\n')
    r = run(base, "bad.sh")
    check("un .sh con variable sin uso sale 1", r.returncode == 1, r.stdout + r.stderr)
    check("y nombra el código y la línea", "bad.sh:2" in r.stdout and "SC2034" in r.stdout, r.stdout)


def case_python_undefined_name_blocks() -> None:
    base = tree()
    (base / "bad.py").write_text("def f():\n    return nombre_inexistente\n")
    r = run(base, "bad.py")
    check("un .py con nombre indefinido sale 1", r.returncode == 1, r.stdout + r.stderr)
    check("ruff lo nombra (F821)", "F821" in r.stdout, r.stdout)
    check("pyright lo nombra", "pyright: 1 hallazgo(s)" in r.stdout, r.stdout)


def case_python_type_error_blocks() -> None:
    base = tree()
    (base / "types.py").write_text("import re\n\ndef g(s: str) -> str:\n    return re.match('a', s).group(0)\n")
    r = run(base, "types.py")
    check("un Optional sin estrechar sale 1 aunque ruff calle", r.returncode == 1, r.stdout + r.stderr)
    check("y es pyright quien lo ve", "reportOptionalMemberAccess" in r.stdout, r.stdout)


def case_clean_python_passes() -> None:
    base = tree()
    (base / "ok.py").write_text("def f(x: int) -> int:\n    return x + 1\n")
    r = run(base, "ok.py")
    check("un .py limpio sale 0", r.returncode == 0, r.stdout + r.stderr)
    check("ruff publica su denominador", "ruff: 0 hallazgo(s) (alcance medido: 1 archivo(s))" in r.stdout, r.stdout)


def case_pyright_warning_is_not_an_error() -> None:
    base = tree()
    (base / "warn.py").write_text("PATRON = \"\\d+\"\n")
    r = run(base, "warn.py")
    check("una advertencia de pyright no cuenta como error", r.returncode == 0, r.stdout + r.stderr)


def case_missing_tool_refuses() -> None:
    base = tree()
    (base / "ok.sh").write_text('#!/usr/bin/env bash\necho hola\n')
    empty = Path(tempfile.mkdtemp(prefix="lint-bin-"))
    r = run(base, "ok.sh", env={"THYROX_LINT_BIN_DIR": str(empty)})
    check("sin shellcheck rehúsa con exit 2", r.returncode == 2, r.stdout + r.stderr)
    check("y NO publica un cero", "0 hallazgo" not in r.stdout, r.stdout)
    check("y nombra la herramienta y el remedio",
          "shellcheck" in r.stderr and "uv sync --group lint" in r.stderr, r.stderr)


def case_other_files_ignored() -> None:
    base = tree()
    (base / "nota.md").write_text("# nada que verificar\n")
    r = run(base, "nota.md")
    check("un archivo que no es .sh ni .py no se mide y sale 0", r.returncode == 0, r.stdout + r.stderr)
    check("y lo dice", "nada que verificar" in r.stdout, r.stdout)


def main() -> int:
    for case in (case_clean_shell_passes, case_shell_warning_blocks,
                 case_python_undefined_name_blocks, case_python_type_error_blocks,
                 case_clean_python_passes, case_pyright_warning_is_not_an_error,
                 case_missing_tool_refuses,
                 case_other_files_ignored):
        print(f"== {case.__name__}")
        case()
    print(f"\n{PASSED} aprobada(s) · {FAILED} fallida(s) (alcance medido: check_lint_zero.py)")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
