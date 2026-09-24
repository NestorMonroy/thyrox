#!/usr/bin/env python3
"""Cuenta terminos en un corpus en espanol, sin depender de la localidad.

Nace de un fallo silencioso. Leyendo el Programa Anual de Incentivos 2026 se
midio ``grep -ciE "plan m[eé]xico"`` sobre un archivo que dice **Plan
Mexico** y el conteo dio **0**. La conclusion «el documento no lo nombra»
estuvo a un paso de publicarse, y habria sido del mismo tipo que las demas
de esa ranura: un cero se lee como hallazgo.

La causa, medida por conducta en este contenedor::

    LANG=            (vacio)  -> grep -ciE "plan m[eé]xico"  = 0
    LC_ALL=C.UTF-8            -> grep -ciE "plan m[eé]xico"  = 1
    grep -c "Plan México"     (literal, byte a byte)         = 1

En la localidad C una clase ``[eé]`` no es «una e o una e acentuada»: es un
conjunto de **bytes**, y ``é`` son dos. El patron pide ``m`` + UN byte +
``xico`` contra un texto con ``M`` + DOS + ``xico``.

**La salida no es acordarse de ``LC_ALL``.** Un remedio que hay que recordar
falla la vez que nadie se acuerda, y el fallo es mudo. Aqui se normaliza en
Python y el conteo **no cambia con el entorno**.

Las cuatro decisiones, y por que cada una
=========================================

1. **El acento se pliega; la enie NO.** ``credito`` y ``credito`` son el
   mismo termino escrito de dos formas, y un corpus en espanol trae las dos.
   ``n`` y ``n`` son letras distintas: plegarlas cuenta juntos ``ano`` y
   ``ano``, que es un error peor que el que se arregla.
2. **La caja se pliega por omision, y se puede exigir.** Un titulo en
   versales no puede perder sus terminos —``CREDITO``—. Pero a veces la caja
   **es** el dato: ``ERP`` no es ``erp``.
3. **La frontera de palabra sabe que una letra acentuada es letra.** Sin
   eso, ``Mexico`` casa dentro de ``Mexicoamericano`` y el conteo sube.
4. **Un cero es un resultado con fila propia**, y se distingue de un corpus
   vacio: doce ceros sobre un texto vacio no son el mismo hallazgo que doce
   ceros sobre 66 paginas.

*Metrica:* ocurrencias no solapadas de cada termino, plegando acento y caja.
*Ciega a:* el sinonimo, la perifrasis y la negacion. Contar ``software`` no
ve «sistemas informaticos», y un ``software`` dentro de «no aplica a
software» cuenta igual. Esta es la ceguera que convierte un conteo de
terminos en el sub-patron C —medir el significante y concluir sobre el
significado— si la conclusion no se acota a lo literal.

Uso
---

    bash bin/term_census CORPUS TERMINO [TERMINO...]
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys
import unicodedata

#: Las marcas de acento que se pliegan. Se enumeran para NO plegar la enie:
#: `unicodedata` descompone `ñ` en `n` + tilde combinante igual que `é` en
#: `e` + agudo, asi que un plegado a ciegas las trata igual y en espanol no
#: lo son.
FOLDED_MARKS = {
    "́",  # agudo:    a e i o u
    "̀",  # grave
    "̈",  # dieresis: u
    "̂",  # circunflejo
}


def fold(text_value: str) -> str:
    """Pliega acento —y solo acento— a su letra base.

    La enie sobrevive: su tilde (``\\u0303``) no esta en `FOLDED_MARKS`, asi
    que se recompone y ``ano`` sigue siendo distinto de ``ano``.
    """
    decomposed = unicodedata.normalize("NFD", text_value)
    clean = "".join(c for c in decomposed if c not in FOLDED_MARKS)
    return unicodedata.normalize("NFC", clean)


def _boundary(patron: str) -> str:
    """Envuelve el patron en fronteras que reconocen la letra acentuada.

    ``\\b`` de `re` en modo Unicode ya trata `é` como letra, que es justo lo
    que el `\\b` de grep en localidad C no hace. Se declara aqui porque es la
    mitad de la guarda y no se ve en el codigo.
    """
    left = r"(?<!\w)" if patron[:1].isalnum() else ""
    right = r"(?!\w)" if patron[-1:].isalnum() else ""
    return left + re.escape(patron) + right


def _prefix_boundary(patron: str) -> str:
    """Como `_boundary` pero abierto por la derecha: ``digitaliza`` alcanza
    a ``digitalizacion``. Se pide explicitamente, no ocurre por accidente."""
    left = r"(?<!\w)" if patron[:1].isalnum() else ""
    return left + re.escape(patron)


def count(text: str, terms: list[str], *, fold_case: bool = True,
          prefix: bool = False) -> dict[str, int]:
    """Ocurrencias no solapadas de cada termino, con su cero.

    El resultado tiene **una clave por termino pedido**, incluidos los que
    no aparecen: la tabla que se publica necesita poder decir «se busco y no
    esta», y una fila ausente no dice eso.
    """
    body = fold(text)
    if fold_case:
        body = body.casefold()
    output: dict[str, int] = {}
    for term in terms:
        needle = fold(term)
        if fold_case:
            needle = needle.casefold()
        if not needle:
            output[term] = 0
            continue
        shape = _prefix_boundary(needle) if prefix else _boundary(needle)
        # `findall` no solapa, que es lo que un conteo de menciones quiere.
        output[term] = len(re.findall(shape, body))
    return output


def summarize(text: str, terms: list[str], **kwargs) -> dict:
    """El conteo mas lo que hace falta para leerlo.

    ``empty_corpus`` existe porque un cero sobre la nada y un cero sobre 66
    paginas se escriben igual y no significan lo mismo. Verde sobre cero no
    es verde.
    """
    return {
        "characters": len(text),
        "empty_corpus": not text.strip(),
        "counts": count(text, terms, **kwargs),
    }


def format_census(summary: dict) -> list[str]:
    counts = summary["counts"]
    width = max((len(t) for t in counts), default=8)
    lines = ["%-*s  %s" % (width, "termino", "veces"),
              "%s  %s" % ("-" * width, "-----")]
    for term, times in counts.items():
        lines.append("%-*s  %d" % (width, term, times))
    return lines


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("corpus", help="el archivo de texto")
    parser.add_argument("terminos", nargs="+", help="que contar")
    parser.add_argument("--prefix", action="store_true",
                        help="el termino cuenta como prefijo")
    parser.add_argument("--case", action="store_true",
                        help="distingue mayusculas de minusculas")
    args = parser.parse_args(argv)

    source = pathlib.Path(args.corpus)
    if not source.is_file():
        print("term_census: no existe o no es un archivo: %s" % source,
              file=sys.stderr)
        print("             NO se emite tabla.", file=sys.stderr)
        return 2

    text_value = source.read_text(encoding="utf-8", errors="replace")
    summary = summarize(text_value, args.terminos,
                        fold_case=not args.case, prefix=args.prefix)
    if summary["empty_corpus"]:
        # Doce ceros sobre un corpus vacio no son doce hallazgos.
        print("SIN SUJETO: el corpus no tiene texto (%d caracteres)."
              % summary["characters"])
        return 0
    print("\n".join(format_census(summary)))
    found = sum(1 for v in summary["counts"].values() if v)
    print("corpus: %d caracteres · terminos: %d (%d con al menos una "
          "mencion)" % (summary["characters"], len(summary["counts"]),
                        found), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
