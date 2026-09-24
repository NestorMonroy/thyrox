#!/usr/bin/env python3
"""La nota de una serie del BIE se LEE, no se recuerda.

Origen: cuatro series del Banco de Informacion Economica en una sesion, y en
cada una clasifique los trimestres a mano. A la segunda me equivoque —le
aplique a TOSI1 la nota de TIL1— y a la tercera el ejecutor lo destapo
preguntando si el que se equivocaba era el. No lo era.

Lo que las notas declaran, medido sobre las cuatro:

=====================  ========  ========  ==============
Serie                  base      Otis      PNEA
=====================  ========  ========  ==============
TOSI1 sector informal  **2010**  **si**    no
TIL1 informalidad      **2012**  no        **si**
Subocupacion           **2010**  **si**    no
=====================  ========  ========  ==============

**Dos series del mismo organismo, del mismo dia y del mismo banco no
comparten advertencias.** Por eso el universo comparable de una tiene 55
trimestres y el de la otra 47, y por eso esto tiene que salir del archivo y
no de mi memoria.

Los textos de abajo son las notas REALES de esas series, recortadas. No son
fixtures fabricadas: son el control positivo que el arbol exige.
"""

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from corpus import bie_series as bie  # noqa: E402

NOTE_TOSI = """/a  La  informacion a partir del primer trimestre de 2023 y del
primer  trimestre de  2005 hasta el primer trimestre de 2020 proviene  de  la
Encuesta  Nacional  de  Ocupacion y Empleo (ENOE), en  el segundo trimestre de
2020  corresponde  a  la Encuesta Telefonica de Ocupacion y Empleo (ETOE)  y a
partir del  tercer  trimestre  de  2020 al cuarto trimestre de 2022 la
informacion  se  genero  con  la  Encuesta  Nacional  de Ocupacion y Empleo
(Nueva edicion) ENOE(N)).
  A  partir  del  primer  trimestre  de  2021  y  del  primer trimestre   de
2010   al  cuarto  trimestre  de  2020,  la informacion   considera   las
estimaciones   poblacionales trimestrales  generadas  por el Marco Muestreo del
INEGI. La informacion  de  los  trimestres  primero  de 2005 al cuarto
trimestre  de 2009 toma en cuenta la estimacion de poblacion con base en las
proyecciones demograficas de 2013.
  Derivado  del  desastre  natural  ocasionado por el huracan Otis en el estado
de Guerrero, a partir del 25 de octubre de 2023 se postergo la captacion de
informacion en esta entidad. La  informacion  de  ocupacion  y empleo de la
entidad de  Guerrero  y  la  ciudad  de Acapulco correspondientes al cuarto
trimestre  de  2023, se construyen principalmente, a partir  de la entrevista
completa del mes de octubre."""

NOTE_TIL1 = """/a  Para  la  ENOEN  del  tercer  trimestre  de 2020 al segundo
trimestre de 2022, dentro de la PNEA disponible se clasifico a las personas
ausentes temporales de una actividad u oficio. Ver documento de Diseno
Conceptual de la ENOEN, Seccion 3.6.
  La  informacion a partir del primer trimestre de 2023 y del primer trimestre
de 2005 hasta el primer  trimestre de 2020 proviene  de  la  Encuesta
Nacional  de  Ocupacion y Empleo (ENOE), en el segundo  trimestre  de  2020
corresponde a  la Encuesta  Telefonica  de  Ocupacion  y  Empleo  (ETOE) y del
tercer  trimestre  de  2020 al  cuarto trimestre de 2022  la informacion se
genero con la  Encuesta Nacional de Ocupacion y Empleo (Nueva edicion)
ENOE(N)).
  A  partir  del  primer  trimestre  de  2021  y  del  primer trimestre   de
2012   al  cuarto  trimestre  de  2020,  la informacion   considera   las
estimaciones   poblacionales trimestrales generadas por el Marco Muestreo del
INEGI.
  La  informacion de los trimestres primero de 2005 al cuarto trimestre  de
2011 toma en cuenta la estimacion de poblacion con base en las proyecciones
demograficas de 2013."""


class TestNoteReading(unittest.TestCase):
    def test_1_the_BASE_year_comes_from_the_note(self):
        self.assertEqual(bie.parse_note(NOTE_TOSI).base_year, 2010)

    def test_2_and_it_is_ANOTHER_in_the_other_series(self):
        """El caso que discrimina todo este modulo: la misma frase, otro
        ano. Recordarlo en vez de leerlo es el error que ya se cometio."""
        self.assertEqual(bie.parse_note(NOTE_TIL1).base_year, 2012)

    def test_3_the_ETOE_quarter_is_read(self):
        for note in (NOTE_TOSI, NOTE_TIL1):
            self.assertEqual(bie.parse_note(note).etoe, (2020, 2))

    def test_4_the_ENOEN_range_is_read(self):
        for note in (NOTE_TOSI, NOTE_TIL1):
            n = bie.parse_note(note)
            self.assertEqual(n.enoen, ((2020, 3), (2022, 4)))

    def test_5_the_OTIS_disruption_is_read_where_it_is(self):
        self.assertEqual(bie.parse_note(NOTE_TOSI).perturbed, [(2023, 4)])

    def test_6_and_is_NOT_invented_where_it_is_not(self):
        """Control de anulacion del caso 5. Sin el, un detector que
        devolviera siempre 4T2023 pasaria el anterior sin medir nada."""
        self.assertEqual(bie.parse_note(NOTE_TIL1).perturbed, [])

    def test_6b_the_phrase_WITHOUT_an_event_marks_no_disruption(self):
        """EL QUE DISCRIMINA la guarda de evento, y lo supo la anulacion: al
        retirarla no cayo ninguna asercion, porque la nota de TIL1 no trae la
        frase en absoluto. Un caso que no ejercita la rama no la mide.

        Aqui la frase SI esta —«correspondientes al cuarto trimestre de
        2022»— y no hay evento: es una revision de rutina. Sin la guarda,
        ese trimestre se excluiria del universo comparable sin que la fuente
        lo pidiera.
        """
        note = NOTE_TIL1 + (" Los datos correspondientes al cuarto trimestre"
                            " de 2022 se revisaron en la publicacion "
                            "siguiente.")
        self.assertEqual(bie.parse_note(note).perturbed, [])

    def test_6c_and_WITH_an_event_it_does_mark_it(self):
        """El control positivo del anterior: misma frase, con el evento
        delante. Sin este par, la guarda pasaria devolviendo siempre vacio."""
        note = NOTE_TIL1 + (" Derivado del desastre natural ocasionado por el"
                            " huracan Otis, los datos correspondientes al"
                            " cuarto trimestre de 2023 se construyen de otra"
                            " forma.")
        self.assertEqual(bie.parse_note(note).perturbed, [(2023, 4)])


class TestVerdict(unittest.TestCase):
    def test_7_a_note_that_does_not_declare_the_base_REFUSES(self):
        """No se cae a un default. Un ano supuesto es exactamente el error
        que este modulo existe para impedir, y un default lo reintroduce
        en silencio."""
        with self.assertRaises(bie.UnreadableNote):
            bie.parse_note("Fuente: INEGI. Series calculadas por metodos.")

    def test_8_the_rejection_NAMES_what_is_missing(self):
        try:
            bie.parse_note("Fuente: INEGI.")
        except bie.UnreadableNote as err:
            self.assertIn("base", str(err).lower())
        else:
            self.fail("no rehuso")


class TestClassification(unittest.TestCase):
    def setUp(self):
        self.tosi = bie.parse_note(NOTE_TOSI)
        self.til1 = bie.parse_note(NOTE_TIL1)

    def test_9_an_ordinary_quarter_is_comparable(self):
        self.assertTrue(bie.is_comparable("2019/04", self.tosi))

    def test_10_the_ETOE_one_is_not(self):
        self.assertFalse(bie.is_comparable("2020/02", self.tosi))

    def test_11_the_ENOEN_ones_are_not(self):
        for p in ("2020/03", "2021/02", "2022/04"):
            self.assertFalse(bie.is_comparable(p, self.tosi), p)

    def test_12_2023_01_is_comparable_again(self):
        self.assertTrue(bie.is_comparable("2023/01", self.tosi))

    def test_13_the_OLD_base_is_not_comparable(self):
        self.assertFalse(bie.is_comparable("2009/04", self.tosi))
        self.assertTrue(bie.is_comparable("2010/01", self.tosi))

    def test_14_and_the_base_cutoff_DIFFERS_between_series(self):
        """2011/01 es comparable en TOSI (base 2010) y no en TIL1 (2012).
        Un universo unico para las dos es justo el defecto."""
        self.assertTrue(bie.is_comparable("2011/01", self.tosi))
        self.assertFalse(bie.is_comparable("2011/01", self.til1))

    def test_15_the_DISRUPTED_quarter_is_excluded_where_the_note_says_so(self):
        self.assertFalse(bie.is_comparable("2023/04", self.tosi))
        self.assertTrue(bie.is_comparable("2023/04", self.til1))


class TestSummary(unittest.TestCase):
    def test_16_the_summary_publishes_its_DENOMINATOR(self):
        note = bie.parse_note(NOTE_TOSI)
        series = [("2009/04", 28.4), ("2010/01", 28.4), ("2020/02", 22.9),
                 ("2023/04", 28.2), ("2026/02", 30.2)]
        r = bie.summarize(series, note)
        self.assertEqual(r["total"], 5)
        self.assertEqual(r["comparable"], 2)          # 2010/01 y 2026/02
        self.assertEqual(r["above"], 0)
        self.assertEqual(r["last"], ("2026/02", 30.2))

    def test_17_NO_SUBJECT_when_nothing_comparable_is_left(self):
        """Un resumen sobre cero no es un resumen. Se declara en vez de
        publicar un maximo de un conjunto vacio."""
        note = bie.parse_note(NOTE_TOSI)
        r = bie.summarize([("2020/02", 22.9)], note)
        self.assertEqual(r["comparable"], 0)
        self.assertIsNone(r["max"])
        self.assertTrue(r["no_subject"])


class TestNoteFromDump(unittest.TestCase):
    """La nota no vive en una celda: vive en muchas filas de una celda."""

    def test_18_it_is_rebuilt_from_where_the_notes_start(self):
        rows = [["2026/02", "", "30.18"],
                 ["Notas y Llamadas:"],
                 ["/a La informacion a partir del primer"],
                 [" trimestre de 2010 al cuarto trimestre de 2020, la"],
                 [" informacion considera las estimaciones poblacionales"]]
        self.assertEqual(bie.parse_note(bie.note_text(rows)).base_year, 2010)

    def test_19_NULLIFICATION_the_LONGEST_cell_is_not_the_note(self):
        """Control de anulacion, y es el defecto que se cometio: una
        heuristica de «la celda mas larga» encuentra el encabezado de la
        columna —323 caracteres en el archivo real— y no la nota, que esta
        troceada en lineas cortas."""
        rows = [["Periodos", "Area", "x" * 400],
                 ["Notas y Llamadas:"],
                 ["/a del primer trimestre de 2012 al cuarto trimestre de"],
                 [" 2020, la informacion considera las estimaciones"],
                 [" poblacionales trimestrales"]]
        longest = max((c for f in rows for c in f), key=len)
        with self.assertRaises(bie.UnreadableNote):
            bie.parse_note(longest)
        self.assertEqual(bie.parse_note(bie.note_text(rows)).base_year, 2012)

    def test_20_a_dump_WITHOUT_notes_yields_an_empty_string_and_then_REFUSES(self):
        rows = [["2026/02", "", "30.18"]]
        self.assertEqual(bie.note_text(rows), "")
        with self.assertRaises(bie.UnreadableNote):
            bie.parse_note(bie.note_text(rows))


class TestEncoding(unittest.TestCase):
    """El CSV del BIE llega en UTF-16 y SIN BOM. Medido: empieza en
    ``50 00`` —la letra P— sin firma delante."""

    def test_21_UTF_16_LE_without_BOM_is_detected(self):
        raw = "Periodos,Area,Valor\n2026/02,00 EUM,6.81\n".encode("utf-16-le")
        self.assertEqual(bie.detect_encoding(raw), "utf-16-le")

    def test_22_NULLIFICATION_a_SIGNATURE_detector_declares_it_UTF_8(self):
        """Control de anulacion, y es el defecto que se cometio: sin BOM, un
        detector de firma cae a UTF-8 y el archivo sale con un espacio entre
        cada letra — lo que parece corrupcion y es codificacion."""
        raw = "Periodos,Area\n".encode("utf-16-le")
        self.assertFalse(raw.startswith((b"\xff\xfe", b"\xfe\xff")))
        self.assertNotEqual(bie.detect_encoding(raw), "utf-8")

    def test_23_ordinary_UTF_8_is_not_confused(self):
        """El que discrimina en la otra direccion: sin el, un detector que
        dijera siempre UTF-16 pasaria los dos casos de arriba."""
        raw = "Periodos,Area,Valor\n2026/02,00 EUM,6.81\n".encode("utf-8")
        self.assertEqual(bie.detect_encoding(raw), "utf-8")

    def test_24_UTF_16_BE_is_distinguished_from_LE(self):
        raw = "Periodos,Area\n".encode("utf-16-be")
        self.assertEqual(bie.detect_encoding(raw), "utf-16-be")

    def test_25_an_EMPTY_file_does_not_blow_up(self):
        self.assertEqual(bie.detect_encoding(b""), "utf-8")


class TestLineSurface(unittest.TestCase):
    def _run(self, *args):
        wrapper = (pathlib.Path(__file__).resolve().parents[2]
                      / "bin" / "bie_series")
        import subprocess
        return subprocess.run(["bash", str(wrapper), *args],
                              capture_output=True, text=True)

    def test_26_a_missing_origin_exits_2_and_emits_NO_count(self):
        r = self._run("/no/existe/x.xls")
        self.assertEqual(r.returncode, 2)
        self.assertNotRegex(r.stdout, r"\b0\b")

    def test_27_a_file_WITHOUT_periods_refuses_without_publishing_a_zero(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.csv"
            f.write_text("hola,mundo\n", encoding="utf-8")
            r = self._run(str(f))
            self.assertEqual(r.returncode, 2)
            self.assertIn("NO se emite conteo", r.stderr)

    def test_28_a_series_WITHOUT_a_note_refuses_and_explains_it(self):
        """No publica un maximo: sin la nota no se sabe que es comparable."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.csv"
            f.write_text("Periodos,Area,Valor\n2026/02,00 EUM,6.81\n",
                         encoding="utf-8")
            r = self._run(str(f))
            self.assertEqual(r.returncode, 2)
            self.assertIn("comparable", r.stderr.lower())


if __name__ == "__main__":
    unittest.main(verbosity=2)
