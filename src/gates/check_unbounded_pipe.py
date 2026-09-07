#!/usr/bin/env python3
"""Gate — escritor SIN FIN canalizado a un consumidor que cortocircuita.

El defecto, y por qué su alcance no es «todo `| grep -q`»
--------------------------------------------------------
``grep -q`` sale en cuanto casa y cierra su extremo del pipe. Si el escritor
sigue escribiendo recibe SIGPIPE y muere con 141; bajo ``set -o pipefail`` el
veredicto del pipeline **es** ese 141, así que un ``if`` que preguntaba «¿está
la marca?» toma la rama del **no** habiendo encontrado la marca.

El enunciado de la tarea #148 —«`grep -q` bajo pipefail invierte»— es cierto
**a veces**, y el «a veces» decide si este gate sirve. Medido antes de
escribirlo (banco de #148, 2026-09-05, más las sondas del banco
``escritor-no-acotado-20260907T003710`` en el árbol del consumidor):

===========================================  ============  ===============
caso                                          pipefail      resultado
===========================================  ============  ===============
``yes | grep -q y``                           sí            invierte 10/10
``yes | grep -m 1 y``                         sí            invierte 10/10
``yes | head -n 1`` · ``head -c 4``           sí            invierte 10/10
``tail -f -n +1`` 20 MB ``| grep -q``         sí            invierte 10/10
``cat`` 20 MB ``| grep -q``                   sí            invierte 10/10
``echo "$V" | grep -q`` con V de 5 MB         sí            **0 de 20**
``printf MARCA | grep -q MARCA`` (5 bytes)    sí            **0 de 20**
``yes | grep -q y``                           **no**        **0 de 10**
marca al FINAL de la entrada                  sí            **0 de 10**
===========================================  ============  ===============

De ahí salen las tres condiciones que este gate exige a la vez, y ninguna es
prescindible: sin ``pipefail`` no invierte; con entrada corta no invierte; con
un consumidor que lo lee todo no invierte —cuelga, que es otro defecto—.

Lo que se marca, y por qué NO se marca `cat`
--------------------------------------------
Sólo el **escritor sin fin por construcción**: ``yes``, ``tail -f``,
``journalctl --follow``, ``docker/kubectl logs -f``, la lectura de
``/dev/urandom`` y hermanos. Ahí la inversión no depende de un tamaño que
haya que adivinar.

``cat``, ``echo`` y ``printf`` quedan **fuera a propósito**. El umbral entre
los 5 MB que no invierten y los 20 MB que sí no está medido, y el árbol ya
tiene dos sitios que un gate ingenuo marcaría —``cat
/sys/module/apparmor/parameters/enabled | grep -q Y`` y ``systemctl cat … |
grep -q``, ambos de unos pocos bytes, que **nunca** invierten—. Marcarlos
sería el falso positivo por construcción que entrena a ignorar un gate, y ese
coste ya está registrado en este proyecto.

El contrafactual está medido, no supuesto: el alcance ingenuo —todo pipeline
bajo pipefail que acabe en un consumidor que corta— marcaba **527** sitios en
los seis repos, y su escritor más común era ``echo`` con **202**, la clase que
midió 0 de 20 inversiones. Ver ``counterfactual_naive_scope.py`` del banco.

Consumidores: los cuatro medidos
--------------------------------
``grep -q``/``--quiet``/``--silent``, ``grep -m N``/``--max-count``,
``grep -l``/``--files-with-matches`` y ``head``. ``grep -l`` entra con su
matiz medido: invierte (141) cuando su stdout es un pipe y **cuelga** (124)
cuando va a ``/dev/null``. Las dos salidas son defectos.

``grep -c`` y ``wc -l`` NO entran: leen hasta EOF, así que con un escritor sin
fin **cuelgan** 10/10 en vez de invertir. Es un defecto distinto y este gate no
lo mide.

Sin sujeto alcanzable REHÚSA con exit 2 y sin conteo: un 0 ahí no distinguiría
«no hay escritores sin fin» de «no medí nada».
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

EXIT_OK, EXIT_VIOLATIONS, EXIT_GUARD = 0, 1, 2

#: El baseline vive junto al gate, como el resto del árbol.
DEFAULT_BASELINE = Path(__file__).resolve().parent / "unbounded_pipe_baseline.txt"

SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "build", "dist",
             "__pycache__", "_archived", "_references", ".mypy_cache"}

SHELL_SUFFIXES = {".sh", ".bash"}

#: ``set -o pipefail`` en cualquiera de sus formas con guion. ``set +o
#: pipefail`` lo APAGA y por eso el signo entra en el patrón.
PIPEFAIL = re.compile(r"(?m)^[^#\n]*\bset\s+(?:-[A-Za-z]+\s+)*-[A-Za-z]*o\s+pipefail\b")

#: Palabras que envuelven a un comando sin cambiar quién escribe. ``timeout``
#: NO está: acota al escritor, y por eso lo saca del alcance.
WRAPPERS = {"sudo", "command", "exec", "nohup", "env", "builtin", "eval", "time"}

#: Asignación de entorno al principio de una etapa (``LC_ALL=C grep …``).
ENV_ASSIGN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")

#: Palabras reservadas y restos de sintaxis que preceden al comando real.
#: Sin ellas ``if yes | grep -q x`` deja ``if`` como nombre del escritor y el
#: gate no ve nada — medido con el contrafactual del banco, que las reportaba
#: como el «escritor» de 311 de sus 527 sitios.
KEYWORDS = {"if", "elif", "while", "until", "then", "do", "done", "else", "fi",
            "!", "{", "}", "$", "&&", "||", ";"}

#: Comandos de seguimiento: nunca terminan solos.
FOLLOW_COMMANDS = {"tail", "journalctl", "logs", "kubectl", "docker", "podman",
                   "oc", "nomad", "stern"}
FOLLOW_FLAG = re.compile(r"(?:^|\s)(?:-[A-Za-z]*[fF]\b|--follow\b)")

#: Fuentes de caracteres sin fin.
INFINITE_DEVICE = re.compile(r"/dev/(?:urandom|random|zero)\b")

QUIET_FLAG = re.compile(r"(?:^|\s)(?:-[A-Za-z]*q[A-Za-z]*\b|--quiet\b|--silent\b)")
MAXCOUNT_FLAG = re.compile(r"(?:^|\s)(?:-m\b|--max-count\b)")
FILESWITH_FLAG = re.compile(r"(?:^|\s)(?:-[A-Za-z]*l[A-Za-z]*\b|--files-with-matches\b)")

GREPS = {"grep", "egrep", "fgrep", "zgrep", "rg", "ag"}


@dataclass(frozen=True)
class Finding:
    """Un pipeline con escritor sin fin y consumidor que cortocircuita."""

    path: str
    line: int
    writer: str
    consumer: str
    text: str

    @property
    def key(self) -> str:
        """Clave del baseline. Sin número de línea: ése cambia con cada edición."""
        return f"{self.path}\t{self.writer}>{self.consumer}\t{normalize(self.text)}"


def normalize(text: str) -> str:
    """Colapsa el espacio para que la clave sobreviva a un re-sangrado."""
    return " ".join(text.split())


def declares_pipefail(text: str) -> bool:
    """¿El guion pone ``pipefail`` en efecto?

    Ciego a: un ``set +o pipefail`` posterior que lo apague, a ``SHELLOPTS`` y
    a ``bash -o pipefail`` en el shebang. Ninguno se ha observado en el árbol.
    """
    return bool(PIPEFAIL.search(text))


def logical_lines(text: str):
    """Las líneas con las continuaciones ya unidas, con su número de inicio.

    Una tubería partida con ``\\`` es una sola sentencia; medirla por líneas
    físicas dejaría al escritor en una y al consumidor en otra, y el gate no
    vería ninguna de las dos.
    """
    pending: list[str] = []
    start = 0
    for number, raw in enumerate(text.splitlines(), start=1):
        if not pending:
            start = number
        if raw.rstrip().endswith("\\"):
            pending.append(raw.rstrip()[:-1])
            continue
        pending.append(raw)
        yield start, "".join(pending)
        pending = []
    if pending:
        yield start, "".join(pending)


def split_outside_quotes(line: str, operators: tuple[str, ...]):
    """Parte la línea por los operadores dados, respetando comillas.

    Devuelve pares ``(fragmento, operador que lo sigue)``; el último trae
    ``""``. Se ignora lo que va dentro de ``'…'`` y ``"…"`` porque un ``|`` en
    una cadena no es una tubería — confundirlos es marcar prosa como código.
    """
    out: list[tuple[str, str]] = []
    current: list[str] = []
    quote = ""
    i = 0
    while i < len(line):
        char = line[i]
        if quote:
            current.append(char)
            if char == "\\" and quote == '"' and i + 1 < len(line):
                current.append(line[i + 1])
                i += 2
                continue
            if char == quote:
                quote = ""
            i += 1
            continue
        if char in "'\"":
            quote = char
            current.append(char)
            i += 1
            continue
        for operator in operators:
            if line.startswith(operator, i):
                out.append(("".join(current), operator))
                current = []
                i += len(operator)
                break
        else:
            current.append(char)
            i += 1
            continue
    out.append(("".join(current), ""))
    return out


def commands(line: str):
    """Los comandos de una línea, con el operador que sigue a cada uno."""
    return split_outside_quotes(line, ("&&", "||", ";"))


def stages(command: str) -> list[str]:
    """Las etapas de una tubería. ``||`` ya se consumió antes que ``|``."""
    return [fragment for fragment, _ in split_outside_quotes(command, ("|",))]


def head_words(stage: str) -> list[str]:
    """Las palabras de la etapa sin envoltorios ni asignaciones de entorno."""
    words = stage.replace("(", " ").replace(")", " ").split()
    while words and (words[0] in WRAPPERS
                     or words[0] in KEYWORDS
                     or ENV_ASSIGN.match(words[0])):
        words.pop(0)
    return words


def unbounded_writer(stage: str) -> str | None:
    """El escritor sin fin de la etapa, o ``None``.

    ``timeout`` lo acota y por eso lo excluye: ``timeout 5 tail -f … | grep -q``
    termina, y marcarlo sería marcar el arreglo.
    """
    words = head_words(stage)
    if not words:
        return None
    if words[0] == "timeout":
        return None
    command = Path(words[0]).name
    if command == "yes":
        return "yes"
    if command in FOLLOW_COMMANDS and FOLLOW_FLAG.search(" " + " ".join(words[1:])):
        return f"{command} --follow"
    if command != "head":
        device = INFINITE_DEVICE.search(stage)
        if device:
            return device.group(0)
    return None


def short_circuit_consumer(stage: str) -> str | None:
    """El consumidor que corta de la etapa, o ``None``. Los cuatro medidos."""
    words = head_words(stage)
    if not words:
        return None
    command = Path(words[0]).name
    rest = " " + " ".join(words[1:])
    if command == "head":
        return "head"
    if command in GREPS:
        if QUIET_FLAG.search(rest):
            return f"{command} -q"
        if MAXCOUNT_FLAG.search(rest):
            return f"{command} -m"
        if FILESWITH_FLAG.search(rest):
            return f"{command} -l"
    return None


def review(text: str, path: str = "<memoria>") -> tuple[list[Finding], int]:
    """Los incumplidores de un guion y las tuberías que se midieron.

    El segundo valor es el denominador local: tuberías de dos o más etapas
    bajo ``pipefail``. Un conteo sin él no distingue «este guion está limpio»
    de «este guion no tiene tuberías».
    """
    if not declares_pipefail(text):
        return [], 0

    findings: list[Finding] = []
    pipelines = 0
    for number, line in logical_lines(text):
        if line.lstrip().startswith("#"):
            continue
        chunks = commands(line)
        for index, (chunk, operator) in enumerate(chunks):
            # Estado neutralizado: `… || true` descarta el veredicto, así que
            # la inversión no llega a decidir nada.
            if operator == "||" and index + 1 < len(chunks):
                if chunks[index + 1][0].strip() in {"true", ":"}:
                    continue
            parts = stages(chunk)
            if len(parts) < 2:
                continue
            pipelines += 1
            for position, stage in enumerate(parts[:-1]):
                writer = unbounded_writer(stage)
                if not writer:
                    continue
                for downstream in parts[position + 1:]:
                    consumer = short_circuit_consumer(downstream)
                    if consumer:
                        findings.append(Finding(path, number, writer, consumer,
                                                chunk.strip()))
                        break
                else:
                    continue
                break
    return findings, pipelines


def is_shell(path: Path) -> bool:
    """``.sh``/``.bash``, o un archivo sin extensión con shebang de shell."""
    if path.suffix in SHELL_SUFFIXES:
        return True
    if path.suffix:
        return False
    try:
        with path.open("rb") as handle:
            header = handle.read(120)
    except OSError:
        return False
    return header.startswith(b"#!") and (b"sh" in header.split(b"\n", 1)[0])


def scan(root: Path) -> tuple[list[Finding], dict[str, int]]:
    """Recorre la raíz. Devuelve los incumplidores y los tres denominadores."""
    findings: list[Finding] = []
    stats = {"files": 0, "with_pipefail": 0, "pipelines": 0}
    for path in sorted(root.rglob("*")):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if not path.is_file() or path.is_symlink():
            continue
        if not is_shell(path):
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
    """La deuda congelada. Una entrada listada no bloquea; una nueva sí."""
    if not path.is_file():
        return set()
    return {line.rstrip("\n")
            for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="raíz a medir")
    parser.add_argument("--baseline", default=str(DEFAULT_BASELINE),
                        help="archivo de deuda congelada")
    parser.add_argument("--write-baseline", action="store_true",
                        help="congela lo que hay hoy y sale 0")
    parser.add_argument("--quiet", action="store_true",
                        help="emitir sólo el conteo, como entero pelado")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"ERROR — la raíz no existe: {root}", file=sys.stderr)
        print("NO se emite un conteo: un 0 aquí no distinguiría «no hay "
              "escritores sin fin» de «no medí nada».", file=sys.stderr)
        return EXIT_GUARD

    findings, stats = scan(root)

    if stats["files"] == 0:
        print(f"ERROR — ningún guion de shell bajo {root}. NO se emite un conteo.",
              file=sys.stderr)
        return EXIT_GUARD

    baseline_path = Path(args.baseline)
    if args.write_baseline:
        header = ("# Deuda congelada de check_unbounded_pipe. Una entrada listada\n"
                  "# no bloquea; una nueva sí. Se paga al tocar el guion.\n")
        baseline_path.write_text(header + "".join(f"{f.key}\n" for f in findings),
                                 encoding="utf-8")
        print(f"baseline escrito: {len(findings)} entrada(s) en {baseline_path}")
        return EXIT_OK

    frozen = load_baseline(baseline_path)
    fresh = [f for f in findings if f.key not in frozen]
    inherited = len(findings) - len(fresh)

    if args.quiet:
        print(len(fresh))
        return EXIT_VIOLATIONS if fresh else EXIT_OK

    for finding in fresh:
        print(f"  {finding.path}:{finding.line}  "
              f"{finding.writer} → {finding.consumer}")
        print(f"     {normalize(finding.text)}")
        print(f"     el escritor no termina solo: cuando `{finding.consumer}` "
              "corte, recibirá SIGPIPE y bajo pipefail el pipeline valdrá 141")

    print(f"check-unbounded-pipe: {len(fresh)} incumplidor(es) nuevo(s), "
          f"{inherited} congelado(s)  (alcance medido: {stats['pipelines']} "
          f"tubería(s) en {stats['with_pipefail']} guion(es) con pipefail, de "
          f"{stats['files']} guion(es) de shell)")
    print("Métrica: tubería bajo `set -o pipefail` con una etapa de escritor sin "
          "fin (yes · tail/journalctl/docker/kubectl --follow · /dev/urandom) "
          "seguida de una etapa que cortocircuita (grep -q/-m/-l · head), con el "
          "estado NO neutralizado por `|| true`.")
    print("Ciega a: el escritor ACOTADO pero grande —`cat` de 20 MB invierte 10/10 "
          "y de 5 MB 0/20, y el umbral no está medido—; a la posición de la marca, "
          "que decide si hay SIGPIPE; al consumidor que lee hasta EOF (`grep -c`, "
          "`wc`), que con escritor sin fin CUELGA en vez de invertir; y a la "
          "tubería armada en una variable o por `eval`.")
    return EXIT_VIOLATIONS if fresh else EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
