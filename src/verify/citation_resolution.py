#!/usr/bin/env python3
"""¿La cita durable de un mensaje de commit RESUELVE a una tarea, o sólo lo parece?

El defecto que cierra, y por qué no lo ve el detector que ya existe
-------------------------------------------------------------------
``src/hooks/detect_ephemeral_citation.py`` —el séptimo detector— avisa cuando
un texto cita ``board #N`` **sin** una forma durable que la acompañe. Mide la
**forma**. El defecto de aquí vive en el **referente**: una cadena con forma
durable impecable que no nombra a nadie, porque es el ordinal del board
rellenado a cuatro dígitos.

    board #445  ->  «TASK-THYROX-0445»      la cita real es TASK-THYROX-0095

El ``NNNN`` de la forma durable es la secuencia del **store**, no el ordinal
del board. Ante esa cadena el detector ve forma durable y calla: su verde no
distingue «la cita resuelve» de «no miré el referente», que es el sub-patrón D
de ``metrica-decide-la-conclusion.md`` con el propio gate como sujeto.

Medido al escribirlo, sobre los commits de este repo: de **114** citas durables
distintas, **13** no resuelven, y las 13 tienen esa misma forma. No es un
desliz suelto — es una regla de composición equivocada que se repite.

Por qué aquí y no en el detector
---------------------------------
Un ``PreToolUse`` es una función pura sobre un payload y corre en **cada**
llamada a ``Bash``: abrir el store en cada una es el modelo de coste
equivocado. Y bajo el harness remoto los ``PreToolUse`` de este árbol están
**inertes** (``H-DOCS-1010``), mientras el hook ``commit-msg`` **sí dispara**
—medido: avisó del ancho de línea en los commits de esta misma sesión—. El
gate va donde el defecto aterriza y donde algo lo va a correr.

Por qué el hook AVISA y no bloquea, y qué lo graduaría
-------------------------------------------------------
Hay deuda heredada en la historia publicada, que no se enmienda. Bloquear hoy
pelearía por algo que el commit de hoy no causó, y un gate que se pelea se
aprende a saltar con ``--no-verify``. Mismo criterio y mismo precedente que su
hermano ``commit_message.py``.

**La cifra viva no se transcribe aquí** —caducaría sin que nadie tocara este
archivo, que es lo que ``calibration-verified-numbers.md`` prohíbe—. La publica
``--history 50``, que es también la medición de la graduación.

*Evidencia fechada del episodio* (2026-09-17T20:04:33, no el estado de mañana):
**8** citas sin resolver de **35** distintas en los últimos 50 commits, y los
siete commits que las llevan son de la sesión que descubrió el defecto — o sea
que la deuda no es antigua, es de hoy y ya está acotada.

**La condición de graduación se declara, no se deja abierta:** cuando
``--history 50`` sostenga 0 sin resolver, el ``|| true`` del hook se retira. Es
un cambio de una línea.

**La refusal NO se traga.** Sin store no se emite veredicto y se sale con 2: un
0 ahí no distinguiría «todas resuelven» de «no pude medir», y el hook lee ese 0
como permiso.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from task import task_ids
from verify.commit_message import significant_lines

#: La forma durable, DERIVADA de quien la define. ``task_ids.ID_RE`` está
#: anclada (``^…$``) porque valida un identificador entero; aquí hace falta
#: buscarla DENTRO de un texto, así que se le quitan las anclas y se le ponen
#: fronteras de palabra. Transcribir el patrón crearía una segunda fuente de
#: verdad de la forma, que es lo que ``calibration-verified-numbers.md``
#: prohíbe para una cifra y vale igual para una gramática.
CITATION = re.compile(r"\b" + task_ids.ID_RE.pattern.strip("^$") + r"\b")


class StoreUnavailable(RuntimeError):
    """El store no se pudo leer. NO se emite conteo: sería un verde falso."""


def known_citations(store_path) -> dict[str, str]:
    """``citation_id`` -> asunto de su tarea, leído del store.

    Reusa ``task_ids.mapping_from_store``, que es quien posee el concepto de
    cita: duplicar aquí el ``SELECT`` pondría dos lectores del mismo mapa que
    pueden divergir.
    """
    try:
        mapping = task_ids.mapping_from_store(store_path)
    except task_ids.MappingError as error:
        raise StoreUnavailable(str(error)) from error
    return {citation: entry.get("subject", "")
            for citation, entry in mapping.ids.items()}


def classify(text: str, known: dict[str, str]) -> tuple[list[str], list[str]]:
    """Las citas del texto, partidas en (las que resuelven, las que no).

    Descuenta las líneas de comentario porque git las borra antes de escribir
    el objeto: ``git commit -v`` mete el diff entero ahí, y medirlas reportaría
    un defecto que el commit resultante no tiene.
    """
    cited = sorted(set(CITATION.findall(significant_lines(text))))
    resolved = [citation for citation in cited if citation in known]
    unresolved = [citation for citation in cited if citation not in known]
    return resolved, unresolved


def cited_in_history(limit: int) -> dict[str, list[str]]:
    """Las citas de los últimos ``limit`` commits, con los hashes que las usan."""
    # El separador va en la SALIDA, no en argv: un NUL dentro de un argumento
    # revienta el `execve` con `ValueError: embedded null byte`. `git log -z`
    # termina cada registro con NUL, que es justo lo que hace falta y no exige
    # inventar un centinela que un mensaje de commit pudiera contener.
    log = subprocess.run(
        ["git", "log", "-z", "--format=%h%n%s%n%b", f"-{limit}"],
        capture_output=True, text=True).stdout
    usage: dict[str, list[str]] = {}
    for entry in log.split("\0"):
        if not entry.strip():
            continue
        commit = entry.splitlines()[0].strip()
        for citation in set(CITATION.findall(entry)):
            usage.setdefault(citation, []).append(commit)
    return usage


#: La etiqueta del aviso. Dice WARN y no ERROR mientras el hook lo invoque con
#: `|| true`: prometer un bloqueo que no ocurre es significante y significado
#: en desacuerdo, el mismo criterio que su hermano ya fijó.
WARNING_LABEL = "WARN cita-sin-resolver:"


def _report_message(path: str, store_path, verbose: bool) -> int:
    try:
        text = Path(path).read_text(encoding="utf-8")
    except OSError as error:
        print(f"cita-sin-resolver REHUSADO — no se pudo leer {path}: {error}",
              file=sys.stderr)
        print("  No se emite veredicto: un 0 aqui seria un verde falso.",
              file=sys.stderr)
        return 2
    try:
        known = known_citations(store_path)
    except StoreUnavailable as error:
        print(f"cita-sin-resolver REHUSADO — {error}", file=sys.stderr)
        print("  No se emite veredicto: un 0 aqui seria un verde falso.",
              file=sys.stderr)
        return 2

    resolved, unresolved = classify(text, known)
    if verbose:
        # Surfacing del eje (b) — una cita puede existir y nombrar OTRO sujeto.
        # Verlo exige comparar el asunto, y eso lo hace quien lee, no el gate.
        for citation in resolved:
            print(f"  {citation} -> {known[citation][:70]}")
    if not unresolved:
        return 0
    print(f"{WARNING_LABEL} {len(unresolved)} cita(s) sin resolver "
          f"(alcance medido: {len(resolved) + len(unresolved)} cita(s) en el mensaje)",
          file=sys.stderr)
    for citation in unresolved:
        print(f"  {citation} no nombra ninguna tarea del store", file=sys.stderr)
    print("  El NNNN de la forma durable es la secuencia del STORE, no el "
          "ordinal del board:", file=sys.stderr)
    print("  rellenar el ordinal a cuatro digitos fabrica una cita que PARECE "
          "durable y no resuelve.", file=sys.stderr)
    print("  La cita del sujeto se busca con: "
          "python3 -m task.task_ids censo --capa thyrox", file=sys.stderr)
    return 1


def _report_history(limit: int, store_path) -> int:
    try:
        known = known_citations(store_path)
    except StoreUnavailable as error:
        print(f"cita-sin-resolver REHUSADO — {error}", file=sys.stderr)
        print("  No se emite veredicto: un 0 aqui seria un verde falso.",
              file=sys.stderr)
        return 2
    usage = cited_in_history(limit)
    broken = {c: commits for c, commits in usage.items() if c not in known}
    print(f"citas durables distintas: {len(usage)} "
          f"(alcance medido: {limit} commit(s) pedidos)")
    print(f"sin resolver: {len(broken)}")
    for citation, commits in sorted(broken.items()):
        print(f"  {citation}  en {', '.join(sorted(set(commits)))}")
    # Medir NO es juzgar: `--history` es el instrumento del corpus, no una
    # entrada del gate. Su veredicto lo da el hook sobre el mensaje entrante.
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Verifica que cada cita durable del mensaje resuelva a una tarea.")
    parser.add_argument("message", nargs="?", help="archivo con el mensaje de commit")
    parser.add_argument("--store", default=None,
                        help="store de tareas; por defecto el que thyrox declara")
    parser.add_argument("--history", type=int, default=None, metavar="N",
                        help="mide las citas de los ultimos N commits en vez del mensaje")
    parser.add_argument("--verbose", action="store_true",
                        help="imprime el sujeto de cada cita que resuelve")
    args = parser.parse_args(argv[1:])

    store_path = task_ids.resolve_store(args.store)
    if args.history is not None:
        return _report_history(args.history, store_path)
    if not args.message:
        parser.error("hace falta el archivo del mensaje, o --history N")
    return _report_message(args.message, store_path, verbose=True)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
