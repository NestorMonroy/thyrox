#!/usr/bin/env python3
"""Gate — escritor de TAMAÑO DESCONOCIDO canalizado a un consumidor que corta.

El defecto
----------
``grep -q`` sale en cuanto casa y cierra su extremo del pipe. Si quien escribe
todavía tiene texto por entregar, su siguiente ``write`` recibe EPIPE: muere
con 141, o sale 1 con ``BrokenPipeError`` si es Python. Bajo ``pipefail`` ese
estado es el del pipeline, y un ``if … | grep -q`` toma la rama del «no»
habiendo encontrado la marca.

Qué decide si invierte, medido el 2026-09-27
---------------------------------------------
Banco ``sigpipe-finite-writer-*``: 20 ejecuciones por caso, la marca al
principio de la entrada, bajo ``pipefail``, la variable SIN exportar.

===========================================  ==========
escritor                                      invierte
===========================================  ==========
``echo``/``printf`` builtin, 10 KB            0/20
``echo``/``printf`` builtin, 107 KB           20/20
``echo`` builtin, 5 MB                        20/20
``python3``, 1 KB y 20 KB                     0/20
``python3``, 200 KB                           20/20
``gawk``, 22 KB                               11/20
``gawk``, 220 KB                              20/20
===========================================  ==========

El umbral es el búfer del pipe (64 KiB): lo que cabe se entrega antes del
corte; lo que no, recibe EPIPE. Da igual si escribe un builtin o un proceso.

**El gate hermano, ``check_unbounded_pipe.py``, cita lo contrario** —«``echo``
de 5 MB: 0/20»— y por eso excluye al builtin. Ese 0 no se reprodujo, y la
primera sonda de este banco dio el mismo 0 por una causa medida: exportaba una
variable de 200 KB, que excede ``MAX_ARG_STRLEN`` (128 KiB), así que ningún
``exec`` posterior arrancaba —``seq`` tampoco— y el bucle no midió nada.

El discriminador
----------------
«builtin o proceso» era el significante. Lo que importa es si el tamaño de lo
escrito se conoce, y estáticamente sólo se conoce cuando un builtin escribe
argumentos LITERALES: ahí el texto está en el guion y cabe en el búfer. Una
expansión, una sustitución, una función o un proceso tienen tamaño
desconocido, y se marcan.

La salida correcta no es adivinar el tamaño sino no canalizar:
``grep -q M <<<"$(cmd)"`` lee el texto entero antes de decidir.

Sin sujeto alcanzable REHÚSA con exit 2 y sin conteo.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from verify.check_unbounded_pipe import (
    SKIP_DIRS, commands, declares_pipefail, head_words, is_shell, logical_lines,
    normalize, stages, unbounded_writer,
)

EXIT_OK, EXIT_VIOLATIONS, EXIT_GUARD = 0, 1, 2

DEFAULT_BASELINE = Path(__file__).resolve().parent / "unsized_writer_pipe_baseline.txt"

#: Los builtins cuyo texto está en el guion cuando sus argumentos son literales.
LITERAL_WRITERS = frozenset({"echo", "printf"})

#: Los que no escriben nada.
SILENT_WRITERS = frozenset({":", "true", "false"})

#: Lo que hace desconocido el tamaño de un argumento: expansión, sustitución.
EXPANSION = re.compile(r"[$`]")

#: El consumidor que corta. ``head`` queda fuera a propósito: su veredicto
#: casi nunca se consulta (``x=$(cmd | head -1)`` sin ``set -e``), y marcarlo
#: sería el falso positivo que entrena a ignorar el gate.
QUIET_FLAG = re.compile(r"(?:^|\s)(?:-[A-Za-z]*q[A-Za-z]*\b|--quiet\b|--silent\b)")
MAXCOUNT_FLAG = re.compile(r"(?:^|\s)(?:-m\b|--max-count\b)")
FILESWITH_FLAG = re.compile(r"(?:^|\s)(?:-[A-Za-z]*l[A-Za-z]*\b|--files-with-matches\b)")
GREPS = {"grep", "egrep", "fgrep", "zgrep", "rg", "ag"}

#: La cabecera de una función de una línea (``f() {``, ``function f {``): lo
#: que escribe es el cuerpo, no el nombre de la función.
FUNCTION_HEADER = re.compile(r"^\s*(?:function\s+)?[A-Za-z_][\w-]*\s*(?:\(\s*\))?\s*\{")

#: Duración o bandera de ``timeout``: se salta para llegar a quien escribe.
TIMEOUT_ARG = re.compile(r"^(?:-.*|\d+(?:\.\d+)?[smhd]?)$")


@dataclass(frozen=True)
class Finding:
    """Un pipeline con un escritor de tamaño desconocido antes de un consumidor que corta."""

    path: str
    line: int
    writer: str
    consumer: str
    text: str

    @property
    def key(self) -> str:
        """Clave del baseline, sin número de línea."""
        return f"{self.path}\t{self.writer}>{self.consumer}\t{normalize(self.text)}"


def writes_known_literal(words: list[str]) -> bool:
    """¿Un builtin que escribe sólo literales? Su texto está a la vista y cabe
    en el búfer del pipe; es el único escritor cuyo tamaño se conoce."""
    return (bool(words) and words[0] in LITERAL_WRITERS
            and not any(EXPANSION.search(word) for word in words[1:]))


def unsized_writer(stage: str) -> str | None:
    """Quien escribe la etapa si su tamaño es desconocido, o ``None``.

    El escritor sin fin es del gate hermano y no se cuenta dos veces.
    ``timeout`` acota el tiempo, no quién escribe: se salta hasta el comando."""
    if unbounded_writer(stage):
        return None
    words = head_words(FUNCTION_HEADER.sub("", stage))
    if words and words[0] == "timeout":
        words = words[1:]
        while words and TIMEOUT_ARG.match(words[0]):
            words = words[1:]
    if not words or words[0] in SILENT_WRITERS or writes_known_literal(words):
        return None
    command = words[0]
    return Path(command).name if "/" in command and "$" not in command else command


def short_circuit_consumer(stage: str) -> str | None:
    """``grep -q``, ``-m`` o ``-l``: los que salen antes de EOF."""
    words = head_words(stage)
    if not words:
        return None
    command = Path(words[0]).name
    if command not in GREPS:
        return None
    rest = " " + " ".join(words[1:])
    if QUIET_FLAG.search(rest):
        return f"{command} -q"
    if MAXCOUNT_FLAG.search(rest):
        return f"{command} -m"
    if FILESWITH_FLAG.search(rest):
        return f"{command} -l"
    return None


def review(text: str, path: str = "<memoria>") -> tuple[list[Finding], int]:
    """Los incumplidores de un guion y cuántas tuberías se midieron."""
    if not declares_pipefail(text):
        return [], 0
    findings: list[Finding] = []
    pipelines = 0
    for number, line in logical_lines(text):
        if line.lstrip().startswith("#"):
            continue
        chunks = commands(line)
        for index, (chunk, operator) in enumerate(chunks):
            if operator == "||" and index + 1 < len(chunks) \
                    and chunks[index + 1][0].strip() in {"true", ":"}:
                continue
            parts = stages(chunk)
            if len(parts) < 2:
                continue
            pipelines += 1
            finding = _first_finding(parts, path, number, chunk)
            if finding:
                findings.append(finding)
    return findings, pipelines


def _first_finding(parts: list[str], path: str, number: int, chunk: str) -> Finding | None:
    """El primer escritor de tamaño desconocido que tiene aguas abajo un consumidor que corta."""
    for position, stage in enumerate(parts[:-1]):
        writer = unsized_writer(stage)
        if not writer:
            continue
        for downstream in parts[position + 1:]:
            consumer = short_circuit_consumer(downstream)
            if consumer:
                return Finding(path, number, writer, consumer, chunk.strip())
    return None


def scan(root: Path) -> tuple[list[Finding], dict[str, int]]:
    findings: list[Finding] = []
    stats = {"files": 0, "with_pipefail": 0, "pipelines": 0}
    for path in sorted(root.rglob("*")):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if not path.is_file() or path.is_symlink() or not is_shell(path):
            continue
        stats["files"] += 1
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if not declares_pipefail(text):
            continue
        stats["with_pipefail"] += 1
        own, pipelines = review(text, str(path.relative_to(root)))
        stats["pipelines"] += pipelines
        findings.extend(own)
    return findings, stats


def load_baseline(path: Path) -> set[str]:
    if not path.is_file():
        return set()
    return {line for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument("--root", default=".", help="raíz a medir")
    parser.add_argument("--baseline", default=str(DEFAULT_BASELINE))
    parser.add_argument("--write-baseline", action="store_true",
                        help="congela lo que hay hoy y sale 0")
    parser.add_argument("--quiet", action="store_true", help="sólo el conteo")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"ERROR — la raíz no existe: {root}. NO se emite un conteo.", file=sys.stderr)
        return EXIT_GUARD
    findings, stats = scan(root)
    if stats["files"] == 0:
        print(f"ERROR — ningún guion de shell bajo {root}. NO se emite un conteo.",
              file=sys.stderr)
        return EXIT_GUARD

    baseline_path = Path(args.baseline)
    if args.write_baseline:
        header = ("# Deuda congelada de check_unsized_writer_pipe. Una entrada\n"
                  "# listada no bloquea; una nueva sí. Se paga al tocar el guion.\n")
        baseline_path.write_text(header + "".join(f"{f.key}\n" for f in findings),
                                 encoding="utf-8")
        print(f"baseline escrito: {len(findings)} entrada(s) en {baseline_path}")
        return EXIT_OK

    frozen = load_baseline(baseline_path)
    fresh = [f for f in findings if f.key not in frozen]
    if args.quiet:
        print(len(fresh))
        return EXIT_VIOLATIONS if fresh else EXIT_OK
    for finding in fresh:
        print(f"  {finding.path}:{finding.line}  {finding.writer} → {finding.consumer}")
        print(f"     {normalize(finding.text)}")
        print(f"     captura antes de decidir: {finding.consumer} … <<<\"$(…)\"")
    print(f"check-unsized-writer-pipe: {len(fresh)} incumplidor(es) nuevo(s), "
          f"{len(findings) - len(fresh)} congelado(s)  (alcance medido: "
          f"{stats['pipelines']} tubería(s) en {stats['with_pipefail']} guion(es) con "
          f"pipefail, de {stats['files']} guion(es) de shell)")
    print("Métrica: tubería bajo `set -o pipefail` con una etapa de tamaño "
          "desconocido —proceso, función, expansión; todo salvo `echo`/`printf` "
          "de literales— seguida de `grep -q`/`-m`/`-l`, con el estado no "
          "neutralizado por `|| true`.")
    print("Ciega a: el tamaño real —lo que cabe en 64 KiB no invierte y se marca "
          "igual—; a la posición de la marca; a `head` como consumidor; y a la "
          "tubería armada en una variable o por `eval`.")
    return EXIT_VIOLATIONS if fresh else EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
