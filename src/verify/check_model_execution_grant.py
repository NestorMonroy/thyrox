#!/usr/bin/env python3
"""check_model_execution_grant.py — ninguna ruta productiva ejecuta un modelo local sin grant.

ADR-007 1.10.0, invariante M8: ``nombre de modelo → Proxy → runtime`` es
imposible en código productivo. Una ejecución local gestionada —Ollama,
llama.cpp— exige un ``ExecutionGrant`` válido y su materialización por
``PodmanExecutionPrimitive`` en una ``ExecutionUnit``; sólo después la alcanza
el ``RuntimeAdapter`` (TASK-THYROX-0712). Un provider externo tiene su propia
materialización y no entra en este gate.

El gate busca en ``src/`` los puntos por los que se llega al runtime local sin
ese camino, en cuatro formas:

- ``model-name-upstream``: código que lee el modelo de
  ``THYROX_OPENAI_COMPAT_MODEL`` para construir un upstream;
- ``model-name-export``: código que exporta esa variable, o su base URL, a otro
  proceso;
- ``managed-runtime-endpoint``: una URL de inferencia construida sobre el puerto
  del Ollama gestionado;
- ``direct-inference``: una llamada a la inferencia del runtime (``/api/chat``,
  ``/api/generate`` o ``OllamaApi.chat``).

El ciclo de vida del artefacto —``/api/blobs``, ``/api/create``, ``/api/show``—
no es ejecución (M12) y no se marca.

Un punto es legítimo sólo dentro de la frontera declarada en
``model_execution_boundary.txt`` y en un archivo que recibe a la vez un
``ExecutionGrant`` y una ``ExecutionUnit`` de la primitiva: la lista sola
convertiría la frontera en una excepción por nombre, y el grant solo dejaría
pasar una ejecución autorizada que nadie materializó.

Salida: 0 sin violaciones (o con violaciones, sin ``--strict``); 1 con
violaciones y ``--strict``; 2 sin poder medir.

*Métrica:* líneas de código productivo (fuera de comentarios, pruebas, ``dist``
y dobles) que casan con una de las cuatro formas.
*Ciega a:* una ruta que llegue al runtime por un nombre que estas formas no
reconocen —otro nombre de variable, otro endpoint— y al flujo de datos entre
archivos: marca el punto donde el nombre se convierte en ruta, no lo rastrea.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

DESCRIPTION = "Ninguna ruta productiva ejecuta un modelo local sin un grant materializado."
BOUNDARY_FILE = Path(__file__).with_name("model_execution_boundary.txt")
# Lo que un archivo de la frontera tiene que recibir: la decisión y su materialización.
BOUNDARY_SYMBOLS = ("ExecutionGrant", "ExecutionUnit")
SCRIPT_SUFFIXES = {".ts", ".tsx", ".js", ".mjs"}
SHELL_SUFFIXES = {".sh"}
EXCLUDED_PARTS = {"__tests__", "dist", "testing", "node_modules", "__pycache__"}

# Cada forma, con el patrón que la reconoce en una línea de código.
SCRIPT_SINKS = (
    ("model-name-upstream", re.compile(r"\bMODEL_ENV\b|THYROX_OPENAI_COMPAT_MODEL|\bopenAICompatDeclarationOf\(")),
    ("direct-inference", re.compile(r"""['"`]/api/(chat|generate)['"`]""")),
)
OLLAMA_CHAT_CALL = re.compile(r"\.chat\(")
SHELL_SINKS = (
    ("model-name-export", re.compile(r"\bTHYROX_OPENAI_COMPAT_(MODEL|BASE_URL)=")),
    ("managed-runtime-endpoint", re.compile(r"THYROX_INFRA_OLLAMA_PORT.*(/v1\b|/api/(chat|generate))")),
)


@dataclass(frozen=True)
class Violation:
    path: str
    line: int
    kind: str

    def render(self) -> str:
        return f"{self.path}:{self.line} {self.kind}"


def is_comment(line: str, shell: bool) -> bool:
    stripped = line.lstrip()
    if shell:
        return stripped.startswith("#")
    return stripped.startswith(("//", "*", "/*"))


def is_productive(path: Path, root: Path) -> bool:
    relative = path.relative_to(root).parts
    return not EXCLUDED_PARTS.intersection(relative)


def load_boundary(path: Path) -> frozenset[str]:
    if not path.is_file():
        return frozenset()
    entries = (line.strip() for line in path.read_text(encoding="utf-8").splitlines())
    return frozenset(entry for entry in entries if entry and not entry.startswith("#"))


def sinks_of(text: str, shell: bool) -> list[tuple[int, str]]:
    found: list[tuple[int, str]] = []
    calls_ollama = not shell and "OllamaApi" in text
    patterns = SHELL_SINKS if shell else SCRIPT_SINKS
    for number, line in enumerate(text.splitlines(), start=1):
        if is_comment(line, shell):
            continue
        for kind, pattern in patterns:
            if pattern.search(line):
                found.append((number, kind))
        if calls_ollama and OLLAMA_CHAT_CALL.search(line):
            found.append((number, "direct-inference"))
    return found


def violations_in(root: Path, boundary: frozenset[str]) -> tuple[list[Violation], int]:
    source = root / "src"
    measured = 0
    violations: list[Violation] = []
    for path in sorted(source.rglob("*")):
        shell = path.suffix in SHELL_SUFFIXES
        if not path.is_file() or not (shell or path.suffix in SCRIPT_SUFFIXES) or not is_productive(path, root):
            continue
        measured += 1
        relative = path.relative_to(root).as_posix()
        text = path.read_text(encoding="utf-8", errors="replace")
        # La frontera exige estar declarada y recibir el grant y la unidad materializada.
        if relative in boundary and all(symbol in text for symbol in BOUNDARY_SYMBOLS):
            continue
        violations.extend(Violation(relative, line, kind) for line, kind in sinks_of(text, shell))
    return violations, measured


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=DESCRIPTION)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--boundary", type=Path, default=BOUNDARY_FILE)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args(argv)
    if not (args.root / "src").is_dir():
        print(f"check_model_execution_grant: no hay src/ bajo {args.root}; no se mide", file=sys.stderr)
        return 2
    violations, measured = violations_in(args.root, load_boundary(args.boundary))
    for violation in violations:
        print(violation.render())
    print(f"check_model_execution_grant: {len(violations)} punto(s) de ejecución sin grant "
          f"(alcance medido: {measured} archivo(s) productivos)")
    return 1 if violations and args.strict else 0


if __name__ == "__main__":
    sys.exit(main())
