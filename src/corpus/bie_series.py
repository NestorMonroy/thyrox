#!/usr/bin/env python3
"""La nota de una serie del Banco de Informacion Economica se LEE, no se
recuerda.

Existe por un episodio de cuatro series en una sesion. En cada una hay que
decidir que trimestres son comparables entre si, y esa decision **la declara
el propio archivo** en su seccion «Notas y Llamadas». Las tres primeras se
clasificaron a mano; en la segunda se le aplico a una serie la nota de otra,
y el ejecutor lo destapo preguntando si el equivocado era el.

Lo que las notas declaran, medido sobre las que llegaron:

=====================  ========  ========  ======
Serie                  base      Otis      PNEA
=====================  ========  ========  ======
TOSI1 sector informal  **2010**  **si**    no
TIL1 informalidad      **2012**  no        **si**
Subocupacion           **2010**  **si**    no
=====================  ========  ========  ======

**Dos series del mismo organismo, del mismo dia y del mismo banco no
comparten advertencias.** Por eso el universo comparable de una tiene 55
trimestres y el de la otra 47. Memorizarlo no escala y ya fallo; leerlo del
archivo, si.

Los tres cortes que la nota declara
===================================

1. **Instrumento.** ENOE, ETOE (telefonica, un solo trimestre) y ENOE(N).
   Comparar a traves de ellos mide el cambio de encuesta junto con el del
   fenomeno y no separa cual es cual.
2. **Base poblacional.** Antes de cierto ano la serie usa proyecciones
   demograficas; desde ese ano, el Marco de Muestreo. **El ano cambia por
   serie.**
3. **Perturbacion declarada.** Un evento que la fuente nombra —el huracan
   Otis sobre el 4T2023— y cuyo dato dice que no refleja el impacto. No es
   un dato malo: es un dato cuya perturbacion esta declarada.

Uso
---

    bash bin/bie_series SERIE.xls            # el veredicto, legible
    bash bin/bie_series SERIE.csv --json     # para consumir
    bash bin/bie_series SERIE.xls --rows     # la serie comparable, en TSV

Lo que NO hace, declarado
=========================

- **No adivina.** Si la nota no declara la base, **rehusa**. Caer a un ano
  por defecto reintroduce en silencio el error exacto que este modulo
  existe para impedir.
- **No entiende prosa.** Reconoce las formas que el BIE usa hoy, no
  cualquier redaccion. Una nota con otra estructura se rehusa en vez de
  leerse a medias.
- **No decide que hacer con lo perturbado.** Lo marca; excluirlo o no es
  juicio de quien analiza.

*Metrica:* patrones de la nota normalizada que resuelven a un trimestre o a
un ano.
*Ciega a:* una advertencia que la nota exprese sin ninguno de esos patrones
—una limitacion de cobertura redactada de otra forma— y a cualquier cambio
metodologico que la nota **no** mencione. Es una cota inferior: lo que marca,
esta; lo que calla no prueba que no haya.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from dataclasses import dataclass, field

from corpus import xls_to_text

#: Los ordinales con que el BIE nombra un trimestre en prosa.
ORDINALS = {"primer": 1, "segundo": 2, "tercer": 3, "cuarto": 4}
_ORD = "|".join(ORDINALS)

#: «del primer trimestre de 2010 al cuarto trimestre de 2020, la informacion
#: considera las estimaciones poblacionales» — el ano en que entra el Marco
#: de Muestreo. Es el corte que cambia por serie.
RE_BASE = re.compile(
    r"primer\s+trimestre\s+de\s+(\d{4})\s+al\s+cuarto\s+trimestre\s+de\s+\d{4},?"
    r"\s+la\s+informacion\s+considera\s+las\s+estimaciones\s+poblacionales",
    re.IGNORECASE)

#: «en el segundo trimestre de 2020 corresponde a la Encuesta Telefonica»
RE_ETOE = re.compile(
    r"en\s+el\s+(%s)\s+trimestre\s+de\s+(\d{4})\s+corresponde\s+a\s+la\s+"
    r"encuesta\s+telefonica" % _ORD, re.IGNORECASE)

#: «del tercer trimestre de 2020 al cuarto trimestre de 2022 la informacion se
#: genero con la Encuesta Nacional ... (Nueva edicion)»
RE_ENOEN = re.compile(
    r"(%s)\s+trimestre\s+de\s+(\d{4})\s+al\s+(%s)\s+trimestre\s+de\s+(\d{4})"
    r"\s+la\s+informacion\s+se\s+genero" % (_ORD, _ORD), re.IGNORECASE)

#: «... correspondientes al cuarto trimestre de 2023, se construyen ...»,
#: dentro del pasaje que nombra el evento.
RE_PERTURBED = re.compile(
    r"correspondientes\s+al\s+(%s)\s+trimestre\s+de\s+(\d{4})" % _ORD,
    re.IGNORECASE)

#: Un periodo del BIE: ``2026/02``.
RE_PERIOD = re.compile(r"^(\d{4})/(\d{1,2})$")

#: Acentos que la nota trae y los patrones no. Se pliegan antes de comparar
#: para que el patron no dependa de como sobrevivio la codificacion.
FOLD = str.maketrans("áéíóúÁÉÍÓÚñÑ", "aeiouAEIOUnN")


class UnreadableNote(ValueError):
    """La nota no declara lo que hace falta. NO se cae a un default."""


@dataclass
class Note:
    """Lo que la nota de una serie declara."""
    base_year: int
    etoe: tuple[int, int] | None = None
    enoen: tuple[tuple[int, int], tuple[int, int]] | None = None
    perturbed: list[tuple[int, int]] = field(default_factory=list)


def normalize(text: str) -> str:
    """Pliega acentos y colapsa el espacio.

    El volcado trae la nota con dos y tres espacios seguidos —viene de una
    celda con saltos de linea duros— y un patron escrito con un solo espacio
    no casa. Normalizar antes es lo que hace el patron legible.
    """
    return re.sub(r"\s+", " ", text.translate(FOLD)).strip()


def note_text(rows: list[list[str]]) -> str:
    """El texto de la nota, reconstruido desde las filas del volcado.

    **La nota no vive en una celda: vive en una treintena de filas de una
    celda cada una**, porque el ``.xls`` la trae envuelta a mano. Medido en
    la serie del sector informal: la seccion arranca en la fila 89 y sigue
    hasta el final. Una heuristica de «la celda mas larga» encuentra el
    encabezado de la columna —323 caracteres— y no la nota; esa fue la
    primera version y rehuso, que es lo que tenia que hacer.

    Donde arrancan las notas lo decide ``xls_to_text.note_rows``, que ya
    existe para avisar de ellas. Aqui se consume: el detector localiza y este
    modulo lee.
    """
    marks = xls_to_text.note_rows(rows)
    if not marks:
        return ""
    return "\n".join(c for row in rows[marks[0]:] for c in row if c.strip())


def parse_note(text: str) -> Note:
    """Lee la nota, o REHUSA nombrando lo que falta."""
    flat = normalize(text)

    base = RE_BASE.search(flat)
    if base is None:
        raise UnreadableNote(
            "la nota no declara el ano de la base poblacional; NO se supone "
            "uno por defecto, porque suponerlo es el error que este modulo "
            "existe para impedir")
    note_value = Note(base_year=int(base.group(1)))

    etoe = RE_ETOE.search(flat)
    if etoe:
        note_value.etoe = (int(etoe.group(2)), ORDINALS[etoe.group(1).lower()])

    enoen = RE_ENOEN.search(flat)
    if enoen:
        note_value.enoen = ((int(enoen.group(2)), ORDINALS[enoen.group(1).lower()]),
                      (int(enoen.group(4)), ORDINALS[enoen.group(3).lower()]))

    # Solo se busca la perturbacion si la nota nombra un evento: el patron de
    # «correspondientes al N trimestre» es demasiado general por si solo.
    if re.search(r"huracan|sismo|desastre\s+natural", flat, re.IGNORECASE):
        note_value.perturbed = [(int(y), ORDINALS[o.lower()])
                          for o, y in RE_PERTURBED.findall(flat)]
    return note_value


def as_quarter(period: str) -> tuple[int, int]:
    m = RE_PERIOD.match(period.strip())
    if not m:
        raise ValueError("no es un periodo del BIE: %r" % period)
    return int(m.group(1)), int(m.group(2))


def is_comparable(period: str, note: Note) -> bool:
    """¿Este trimestre se puede comparar con el ultimo de la serie?

    Tiene que cumplir los tres cortes a la vez: mismo instrumento, misma base
    poblacional, y sin perturbacion declarada.
    """
    q = as_quarter(period)
    if q[0] < note.base_year:
        return False
    if note.etoe and q == note.etoe:
        return False
    if note.enoen and note.enoen[0] <= q <= note.enoen[1]:
        return False
    return q not in note.perturbed


def summarize(series: list[tuple[str, float]], note: Note) -> dict:
    """El resumen de una serie, **con su denominador**.

    Un conteo sin denominador no es un resultado: con el alcance oculto, un
    instrumento ciego y uno correcto publican la misma cifra.
    """
    if not series:
        return {"total": 0, "comparable": 0, "above": None, "max": None,
                "min": None, "last": None, "no_subject": True}
    last = series[-1]
    good_ones = [(p, v) for p, v in series if is_comparable(p, note)]
    if not good_ones:
        return {"total": len(series), "comparable": 0, "above": None,
                "max": None, "min": None, "last": last, "no_subject": True}
    return {
        "total": len(series),
        "comparable": len(good_ones),
        "above": sum(1 for _, v in good_ones if v > last[1]),
        "max": max(good_ones, key=lambda x: x[1]),
        "min": min(good_ones, key=lambda x: x[1]),
        "last": last,
        "no_subject": False,
    }


#: Firmas de UTF-16, **cuando las hay**. El CSV del BIE **no las trae**:
#: medido, empieza directo en ``50 00`` —la letra P— sin BOM. Un detector
#: que busque la firma declara UTF-8 un archivo UTF-16 y lo devuelve con un
#: espacio entre cada letra, que parece corrupcion y es codificacion.
BOM_UTF16 = (b"\xff\xfe", b"\xfe\xff")

#: Cuantos bytes se miran para decidir la codificacion, y desde que
#: proporcion de NUL se declara UTF-16. Un texto latino en UTF-16 tiene un
#: NUL por caracter, o sea ~50 %; uno en UTF-8 no tiene ninguno. El umbral va
#: holgadamente en medio para que un archivo con algun byte nulo suelto no
#: bascule.
ENCODING_PROBE_BYTES = 2048
NUL_RATIO_UTF16 = 0.25


def detect_encoding(raw: bytes) -> str:
    """La codificacion, medida por CONDUCTA y no por firma.

    Se cuenta la proporcion de bytes NUL y **en que posiciones caen**: en
    UTF-16LE un texto latino pone el NUL en las posiciones impares y en
    UTF-16BE en las pares. Es lo que distingue las dos sin BOM.
    """
    if raw.startswith(BOM_UTF16):
        return "utf-16"
    head = raw[:ENCODING_PROBE_BYTES]
    if not head:
        return "utf-8"
    nulls = head.count(0)
    if nulls / len(head) < NUL_RATIO_UTF16:
        return "utf-8"
    odd = sum(1 for i in range(1, len(head), 2) if head[i] == 0)
    return "utf-16-le" if odd * 2 >= nulls else "utf-16-be"


def read_rows(source) -> list[list[str]]:
    """Las filas de una serie del BIE, venga en ``.xls`` o en ``.csv``.

    El formato se decide por los BYTES: un ``.xls`` del BIE es un contenedor
    OLE2 y su ``.csv`` llega en UTF-16. Ninguno de los dos se deduce del
    sufijo, y el segundo leido como UTF-8 sale con un espacio entre cada
    letra — que parece corrupcion y es codificacion.
    """
    source = pathlib.Path(source)
    raw = source.read_bytes()
    if raw.startswith(bytes.fromhex("D0CF11E0A1B11AE1")):
        return xls_to_text.rows(source)
    text_value = raw.decode(detect_encoding(raw), "replace")
    sep = "\t" if text_value.count("\t") > text_value.count(",") else ","
    return [line.split(sep) for line in text_value.splitlines()]


def read_series(rows: list[list[str]]) -> list[tuple[str, float]]:
    """Los pares periodo-valor. La primera celda que sea un periodo manda, y
    el valor es la **ultima** celda numerica de esa fila: el BIE mete la
    clave del area geografica en medio."""
    output = []
    for row in rows:
        cells = [c.strip() for c in row]
        if not cells or not RE_PERIOD.match(cells[0]):
            continue
        value = None
        for c in cells[1:]:
            try:
                value = float(c)
            except ValueError:
                continue
        if value is not None:
            output.append((cells[0], value))
    return output


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("entrada", help="la serie del BIE, .xls o .csv")
    parser.add_argument("--json", action="store_true", help="salida legible por maquina")
    parser.add_argument("--rows", action="store_true",
                        help="vuelca la serie con su clasificacion, en TSV")
    args = parser.parse_args(argv)

    source = pathlib.Path(args.entrada)
    if not source.is_file():
        print("bie_series: no existe o no es un archivo: %s" % source, file=sys.stderr)
        print("            NO se emite conteo.", file=sys.stderr)
        return 2

    row_list = read_rows(source)
    one_series = read_series(row_list)
    if not one_series:
        print("bie_series: no se reconocio ningun periodo del BIE en %s" % source,
              file=sys.stderr)
        print("            NO se emite conteo: un 0 aqui se leeria como "
              "«la serie venia vacia».", file=sys.stderr)
        return 2
    try:
        note_value = parse_note(note_text(row_list))
    except UnreadableNote as err:
        print("bie_series: %s" % err, file=sys.stderr)
        print("            Sin la nota NO se puede decir que trimestres son "
              "comparables,", file=sys.stderr)
        print("            asi que no se publica ningun maximo ni ninguna "
              "posicion.", file=sys.stderr)
        return 2

    if args.rows:
        for period_value, value in one_series:
            print("%s\t%s\t%s" % (period_value, value,
                                   "comparable" if is_comparable(period_value, note_value)
                                   else "excluido"))
        return 0

    r = summarize(one_series, note_value)
    if args.json:
        print(json.dumps({
            "base_year": note_value.base_year,
            "etoe": note_value.etoe, "enoen": note_value.enoen,
            "perturbed": note_value.perturbed, **r}, ensure_ascii=False))
        return 0

    print("lo que la NOTA declara")
    print("  base poblacional desde : %d" % note_value.base_year)
    print("  ETOE                   : %s" % ("%d/%02d" % note_value.etoe if note_value.etoe else "no declara"))
    print("  ENOE(N)                : %s" % (
        "%d/%02d a %d/%02d" % (note_value.enoen[0] + note_value.enoen[1]) if note_value.enoen else "no declara"))
    print("  perturbaciones         : %s" % (
        ", ".join("%d/%02d" % q for q in note_value.perturbed) or "ninguna"))
    print()
    if r["no_subject"]:
        print("SIN SUJETO — ningun trimestre es comparable con el ultimo.")
        print("  (alcance medido: 0 de %d)" % r["total"])
        return 0
    print("la serie, sobre su universo COMPARABLE")
    print("  ultimo      : %s = %.4f" % r["last"])
    print("  por encima  : %d de %d" % (r["above"], r["comparable"]))
    print("  maximo      : %s = %.4f" % r["max"])
    print("  minimo      : %s = %.4f" % r["min"])
    print("  (alcance medido: %d comparables de %d trimestres)"
          % (r["comparable"], r["total"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
