#!/usr/bin/env python3
"""Un conteo de terminos en espanol no se hace con `grep -iE`, y ya mordio.

Origen: al leer el Programa Anual de Incentivos 2026 se midio
`grep -ciE "plan m[eé]xico"` sobre un archivo que dice **Plan Mexico**, y el
conteo dio **0**. La conclusion «el documento no lo nombra» estuvo a un paso
de publicarse.

La causa, medida por conducta en este contenedor::

    LANG=            (vacio)  -> grep -ciE "plan m[eé]xico"  = 0
    LC_ALL=C.UTF-8            -> grep -ciE "plan m[eé]xico"  = 1
    grep -c "Plan Mexico" (literal, byte a byte)             = 1

En la localidad C una clase `[eé]` no es «una e o una e acentuada»: es un
conjunto de **bytes**, y `é` son dos (`\\xC3\\xA9`). Asi que el patron pide
`m` + UN byte + `xico` contra un texto que trae `M` + DOS + `xico`.

**El fallo es silencioso y se parece a un hallazgo.** Un cero se lee como
«el termino no esta», que es justo la forma de conclusion que esta ranura
publica. Y las reglas de este arbol prescriben `grep -iE` como idioma sin
nombrar `locale` ni una vez — medido: 0 archivos en `.claude/rules/`.

La salida no es recordar `LC_ALL`: es **no depender de la localidad**. Este
modulo normaliza en Python y el conteo no cambia con el entorno.

Tercera vez que hace falta una tabla de frecuencias —ENDUTIH, PAI y el
corpus de prensa—, que es el umbral que este arbol ya uso para factorizar
`ooxml.py`: dos son coincidencia, tres son mecanismo.
"""

import pathlib
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from corpus import term_census  # noqa: E402


class TestTheAccent(unittest.TestCase):
    def test_1_the_accent_does_NOT_split_the_count(self):
        """CONTROL POSITIVO del defecto que origina el modulo. Un corpus en
        espanol escribe las dos formas y las dos son el mismo termino."""
        text = ("Plan M\u00e9xico, el Plan Mexico y otra vez "
                 "PLAN M\u00c9XICO.")
        self.assertEqual(term_census.count(text, ["plan mexico"]),
                         {"plan mexico": 3})

    def test_2_searching_WITHOUT_an_accent_finds_the_accented(self):
        """Es la direccion que importa: quien escribe el patron en una
        terminal no siempre teclea el acento."""
        self.assertEqual(
            term_census.count("cr\u00e9dito y credito", ["credito"]),
            {"credito": 2})

    def test_3_and_searching_WITH_an_accent_finds_the_bare(self):
        self.assertEqual(
            term_census.count("credito simple", ["cr\u00e9dito"]),
            {"cr\u00e9dito": 1})

    def test_4_the_ENIE_does_not_fold_into_the_ENE(self):
        """CONTROL DE ANULACION del plegado: `n` y `n` son letras distintas
        en espanol, no una variante de acento. Plegarlas hace que `ano` y
        `ano` se cuenten juntos, que es un error de otra clase."""
        self.assertEqual(term_census.count("el a\u00f1o pasado", ["ano"]),
                         {"ano": 0})
        self.assertEqual(term_census.count("el a\u00f1o pasado", ["a\u00f1o"]),
                         {"a\u00f1o": 1})


class TestTheUppercase(unittest.TestCase):
    def test_5_the_accented_UPPERCASE_also_counts(self):
        """`-i` de grep en localidad C tampoco pliega `E` con `e`: son
        bytes distintos. Un titulo en versales pierde sus terminos."""
        self.assertEqual(
            term_census.count("CR\u00c9DITO PREFERENTE", ["credito"]),
            {"credito": 1})

    def test_6_case_sensitivity_can_be_required(self):
        """Hay veces que la caja ES el dato: `ERP` no es `erp`."""
        self.assertEqual(
            term_census.count("ERP y erp", ["ERP"], fold_case=False),
            {"ERP": 1})


class TestTheBoundary(unittest.TestCase):
    def test_7_an_acronym_does_not_match_INSIDE_another_word(self):
        """`ERP` dentro de `SUPERPUESTO` no es una mencion. En localidad C
        el `\\b` de grep tampoco trata una letra acentuada como letra, asi
        que la frontera se rompe justo donde el espanol la necesita."""
        self.assertEqual(term_census.count("SUPERPUESTO", ["ERP"]),
                         {"ERP": 0})
        self.assertEqual(term_census.count("un ERP nuevo", ["ERP"]),
                         {"ERP": 1})

    def test_8_the_boundary_recognizes_the_ACCENTED_letter_as_a_letter(self):
        """`Mexico` dentro de `Mexicoamericano` no es `Mexico`. Si la
        frontera no sabe que `e` es letra, la palabra se corta ahi y el
        conteo sube."""
        self.assertEqual(
            term_census.count("M\u00e9xicoamericano", ["Mexico"]),
            {"Mexico": 0})

    def test_9_a_term_of_SEVERAL_words_is_counted_whole(self):
        self.assertEqual(
            term_census.count("comercio electronico y comercio a secas",
                              ["comercio electronico"]),
            {"comercio electronico": 1})

    def test_10_the_prefix_is_required_explicitly(self):
        """`digitaliza` tiene que poder alcanzar a `digitalizacion` cuando
        quien busca lo pide, y no por accidente."""
        self.assertEqual(
            term_census.count("la digitalizaci\u00f3n avanza", ["digitaliza"]),
            {"digitaliza": 0})
        self.assertEqual(
            term_census.count("la digitalizaci\u00f3n avanza", ["digitaliza"],
                              prefix=True),
            {"digitaliza": 1})


class TestTheZero(unittest.TestCase):
    def test_11_a_missing_term_counts_ZERO_and_is_present(self):
        """Un cero es un resultado, no una ausencia de fila: la tabla que
        se publica necesita decir «se busco y no esta»."""
        self.assertEqual(term_census.count("nada", ["software", "nada"]),
                         {"software": 0, "nada": 1})

    def test_12_an_EMPTY_corpus_is_not_confused_with_real_zeros(self):
        """Verde sobre cero no es verde: doce ceros sobre un texto vacio no
        son el mismo hallazgo que doce ceros sobre 66 paginas."""
        summary = term_census.summarize("", ["software"])
        self.assertEqual(summary["characters"], 0)
        self.assertTrue(summary["empty_corpus"])

    def test_13_and_over_a_corpus_with_text_it_does_NOT_declare_it_empty(self):
        """CONTROL DE ANULACION del anterior."""
        summary = term_census.summarize("hay texto aqui", ["software"])
        self.assertFalse(summary["empty_corpus"])
        self.assertEqual(summary["counts"], {"software": 0})


class TestTheOverlap(unittest.TestCase):
    def test_14_occurrences_are_not_counted_twice(self):
        self.assertEqual(term_census.count("aaa", ["aa"], prefix=True),
                         {"aa": 1})


class TestLineSurface(unittest.TestCase):
    def _run(self, *args, entrada=""):
        wrapper = (pathlib.Path(__file__).resolve().parents[2]
                      / "bin" / "term_census")
        return subprocess.run(["bash", str(wrapper), *args],
                              input=entrada, capture_output=True, text=True)

    def test_15_counts_over_a_file_and_publishes_the_table(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "c.txt"
            f.write_text("Plan Mexico y Plan Mexico", encoding="utf-8")
            r = self._run(str(f), "plan mexico")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("2", r.stdout)
            self.assertIn("plan mexico", r.stdout)

    def test_16_an_empty_corpus_says_NO_SUBJECT(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "c.txt"
            f.write_text("", encoding="utf-8")
            r = self._run(str(f), "software")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("SIN SUJETO", r.stdout + r.stderr)

    def test_17_a_missing_origin_exits_2_and_emits_NO_table(self):
        r = self._run("/no/existe.txt", "software")
        self.assertEqual(r.returncode, 2)
        self.assertNotIn("software", r.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
