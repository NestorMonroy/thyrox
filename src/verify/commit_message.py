#!/usr/bin/env python3
"""El ancho de línea de un mensaje de commit, medido en la unidad correcta.

Por qué este mecanismo existe y no es un `awk`
----------------------------------------------
La regla Tim Pope fija el cuerpo a 72. Hasta este módulo, ningún hook de los
seis repos lo medía —los cinco `commit-msg` de los consumidores validan el
subject y nada más— así que se comprobaba a mano, y el `awk` de esta máquina
es **mawk**, que no es UTF-8 aware: su `length()` cuenta octetos. Una línea de
prosa española con dos em-dashes se reporta cuatro «caracteres» más larga de
lo que es, y la corrección que induce es recortar texto que cabía.

Tres medidas, no una — el significante contra el significado
------------------------------------------------------------
«Ancho de línea» nombra tres cosas distintas, y la regla se refiere a la
tercera:

===============  ==========================  ==========  =============
Medida           Qué cuenta                  ``a—b``     Quién la da
===============  ==========================  ==========  =============
bytes            octetos UTF-8               5           mawk
code points      caracteres                  3           ``len()``
columnas         ancho en una terminal       3           este módulo
===============  ==========================  ==========  =============

Tim Pope habla de **legibilidad en una terminal**, así que el referente es la
columna. Para prosa latina coincide con el code point; diverge con CJK (un
ideograma ocupa dos columnas) y con los combinantes (ocupan cero). Se
implementan las tres para que la elección sea explícita en el sitio de uso, no
una propiedad accidental de la herramienta que había a mano.

Por qué Python y no ``gawk``
----------------------------
``gawk`` mide code points correctamente bajo un locale UTF-8, y aquí no está
garantizado: exigirlo añadiría una dependencia y una precondición de locale
invisible, que es la clase de premisa que falla en silencio. El rendimiento no
decide — un mensaje de commit tiene decenas de líneas, y a esa escala los tres
candidatos son indistinguibles. Deciden la **corrección** (la unidad) y la
**claridad** (que las tres medidas se puedan nombrar por separado).
"""
from __future__ import annotations

import sys
import unicodedata

#: Límite del asunto y del cuerpo, en columnas. Tim Pope recomienda 50 para el
#: asunto; el máximo absoluto que este proyecto admite es 72 para ambos.
DEFAULT_LIMIT = 72

#: Categorías de ancho de `unicodedata.east_asian_width` que ocupan dos
#: columnas: Wide y Fullwidth. Las demás ocupan una, salvo los combinantes.
DOUBLE_WIDTH = frozenset({"W", "F"})


def byte_length(line: str) -> int:
    """Octetos UTF-8 — lo que mawk devuelve, y lo que la regla NO pide."""
    return len(line.encode("utf-8"))


def character_count(line: str) -> int:
    """Code points. Correcto para prosa latina; ciego al ancho del ideograma."""
    return len(line)


def display_width(line: str) -> int:
    """Columnas que la línea ocupa en una terminal — el referente de la regla.

    Un combinante no avanza el cursor (ancho 0); un ideograma o un carácter
    de ancho completo avanza dos. Es la única de las tres que responde a la
    pregunta que la regla hace: «¿cabe en un terminal de 72 columnas?».
    """
    width = 0
    for char in line:
        if unicodedata.combining(char):
            continue
        width += 2 if unicodedata.east_asian_width(char) in DOUBLE_WIDTH else 1
    return width


#: Las tres, por nombre, para que un llamador pueda elegir sin importarlas.
MEASURES = {
    "bytes": byte_length,
    "characters": character_count,
    "columns": display_width,
}


def overlong_lines(
    text: str, limit: int = DEFAULT_LIMIT, measure: str = "columns"
) -> list[tuple[int, int, str]]:
    """Las líneas que exceden `limit`, como ``(número, ancho, línea)``.

    El número es 1-based y cuenta sobre el texto **completo** que se le pasa,
    no sobre el fragmento: quien reporta necesita señalar la línea del archivo.
    """
    width_of = MEASURES[measure]
    return [
        (number, width_of(line), line)
        for number, line in enumerate(text.splitlines(), 1)
        if width_of(line) > limit
    ]


def check_commit_message(
    text: str, limit: int = DEFAULT_LIMIT, measure: str = "columns"
) -> list[tuple[int, int, str]]:
    """Aplica el límite al mensaje entero, saltando lo que git ignora.

    Las líneas de comentario (``#``) las descarta ``git commit`` antes de
    escribir el objeto, así que medirlas reportaría un problema que no existe
    en el commit resultante — el instrumento mediría el archivo y se concluiría
    sobre el mensaje.
    """
    significant = "\n".join(
        "" if line.startswith("#") else line for line in text.splitlines()
    )
    return overlong_lines(significant, limit=limit, measure=measure)


#: La etiqueta del aviso. NO dice ERROR a proposito: el hook lo invoca con
#: `|| true` y el commit pasa igual, asi que «ERROR» prometia un bloqueo que no
#: existe — significante y significado en desacuerdo. Su consumidor
#: (`check_branch_commit_messages.sh`) la grepea por literal, y
#: `tests/verify/test_commit_message_label.py` ata los dos.
WARNING_LABEL = "WARN commit-msg:"


def main(argv: list[str]) -> int:
    """CLI: mide el archivo que git le pasa. Rehúsa si no lo puede leer.

    Rehusar con 2 y sin veredicto es deliberado: un 0 ante un archivo ausente
    no distinguiría «el mensaje cabe» de «no pude medirlo», y el llamador —un
    hook— lee ese 0 como autorización.
    """
    if len(argv) != 2:
        print("uso: commit_message.py <archivo-de-mensaje>", file=sys.stderr)
        return 2
    try:
        text = open(argv[1], encoding="utf-8").read()
    except OSError as error:
        print(f"commit-msg REHUSADO — no se pudo leer {argv[1]}: {error}",
              file=sys.stderr)
        print("  No se emite veredicto: un 0 aqui seria un verde falso.",
              file=sys.stderr)
        return 2

    problems = check_commit_message(text)
    if not problems:
        return 0
    print(f"{WARNING_LABEL} {len(problems)} linea(s) exceden "
          f"{DEFAULT_LIMIT} columnas", file=sys.stderr)
    for number, width, line in problems:
        print(f"  linea {number}: {width} columnas — {line[:60]}…", file=sys.stderr)
    print("  La medida es COLUMNAS de terminal, no bytes: un `awk` de esta",
          file=sys.stderr)
    print("  maquina (mawk) sobre-reporta toda linea con acentos o em-dash.",
          file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
