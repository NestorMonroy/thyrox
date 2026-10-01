#!/usr/bin/env python3
"""El gate que mantiene en cero los hallazgos de la mitad shell y Python.

Tres verificadores, uno por pregunta:

- **ShellCheck** sobre `.sh`, desde severidad `warning` (lo `info`/`style` no
  cuenta como error). Su configuración vive en `.shellcheckrc` de la raíz.
- **ruff** sobre `.py`, sólo las reglas que son defecto y no estilo: sintaxis
  (`E9`), comparaciones y sentencias inválidas (`F63`, `F7`), nombres
  indefinidos (`F82`), imports y variables muertas (`F401`, `F841`) y
  redefiniciones (`F811`, que ya escondió una suite duplicada entera).
- **pyright** sobre `.py`, con la configuración de `[tool.pyright]` del
  `pyproject.toml` de la raíz medida (por eso corre con ella como cwd).

Sin rutas mide lo versionado bajo `src/` y `tests/`; con rutas, sólo esas (el
pre-commit le pasa las staged). Los verificadores salen del `.venv/bin` del
proveedor —el grupo `lint`— o de `THYROX_LINT_BIN_DIR`.

Salidas: 0 sin hallazgos; 1 con hallazgos, cada uno con `archivo:línea`;
2 cuando falta un verificador que el alcance necesita, SIN conteo: un 0 ahí no
distinguiría «no hay hallazgos» de «no pude medir».
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from paths import reach

RUFF_RULES = "E9,F63,F7,F82,F401,F811,F841"
SCOPE_DIRS = ("src", "tests")


@dataclass
class Finding:
    path: str
    line: int
    code: str
    message: str

    def render(self) -> str:
        return f"    {self.path}:{self.line}: {self.code} {self.message}"


class MissingTool(Exception):
    pass


# Los verificadores son del proveedor (su `.venv`), no del árbol medido: un
# consumidor o un árbol sintético no tienen por qué traer el grupo `lint`.
PROVIDER_BIN = reach.thyrox_root() / ".venv" / "bin"


def tool(name: str) -> str:
    base = Path(os.environ.get("THYROX_LINT_BIN_DIR") or PROVIDER_BIN)
    candidate = base / name
    if not (candidate.is_file() and os.access(candidate, os.X_OK)):
        raise MissingTool(name)
    return str(candidate)


def relative(path: str, root: Path) -> str:
    try:
        return str(Path(path).resolve().relative_to(root.resolve()))
    except ValueError:
        return path


def shellcheck(files: list[str], root: Path) -> list[Finding]:
    out = subprocess.run([tool("shellcheck"), "-f", "json1", "-S", "warning", *files],
                         cwd=root, capture_output=True, text=True)
    comments = json.loads(out.stdout or '{"comments": []}')["comments"]
    return [Finding(relative(c["file"], root), c["line"], f"SC{c['code']}", c["message"])
            for c in comments]


def ruff(files: list[str], root: Path) -> list[Finding]:
    out = subprocess.run([tool("ruff"), "check", "--no-cache", "--select", RUFF_RULES,
                          "--output-format", "json", *files],
                         cwd=root, capture_output=True, text=True)
    return [Finding(relative(d["filename"], root), d["location"]["row"], d["code"] or "E",
                    d["message"])
            for d in json.loads(out.stdout or "[]")]


def pyright(files: list[str], root: Path) -> list[Finding]:
    out = subprocess.run([tool("pyright"), "--outputjson", *files],
                         cwd=root, capture_output=True, text=True)
    report = json.loads(out.stdout or '{"generalDiagnostics": []}')
    return [Finding(relative(d["file"], root), d["range"]["start"]["line"] + 1,
                    d.get("rule", "pyright"), d["message"].splitlines()[0])
            for d in report["generalDiagnostics"] if d["severity"] == "error"]


def versioned(root: Path) -> list[str]:
    out = subprocess.run(["git", "ls-files", "--", *(f"{d}/*.py" for d in SCOPE_DIRS),
                          *(f"{d}/*.sh" for d in SCOPE_DIRS)],
                         cwd=root, capture_output=True, text=True, check=True)
    return [line for line in out.stdout.splitlines() if line]


def report(name: str, findings: list[Finding], measured: int) -> None:
    print(f"{name}: {len(findings)} hallazgo(s) (alcance medido: {measured} archivo(s))")
    for finding in findings:
        print(finding.render())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument("--root", type=Path, default=reach.thyrox_root())
    parser.add_argument("files", nargs="*")
    args = parser.parse_args(argv)
    root = args.root
    files = args.files or versioned(root)
    shell_files = [f for f in files if f.endswith(".sh")]
    python_files = [f for f in files if f.endswith(".py")]
    if not shell_files and not python_files:
        print("check-lint-zero: nada que verificar (ningún .sh ni .py en el alcance)")
        return 0
    total = 0
    try:
        if shell_files:
            found = shellcheck(shell_files, root)
            report("shellcheck", found, len(shell_files))
            total += len(found)
        if python_files:
            for name, measure in (("ruff", ruff), ("pyright", pyright)):
                found = measure(python_files, root)
                report(name, found, len(python_files))
                total += len(found)
    except MissingTool as missing:
        print(f"check-lint-zero: falta el verificador `{missing}`; instálalo con "
              "`uv sync --group lint`. NO se emite un conteo.", file=sys.stderr)
        return 2
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
