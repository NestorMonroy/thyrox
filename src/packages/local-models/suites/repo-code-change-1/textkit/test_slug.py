"""Pruebas de textkit.slug; se corren con ``python3 -m unittest``."""

import unittest

from textkit.slug import slugify, title_slug


class SlugifyTest(unittest.TestCase):
    def test_strips_accents_and_punctuation(self) -> None:
        self.assertEqual(slugify("¡Hola, Mundo Ágil!"), "hola-mundo-agil")


class TitleSlugTest(unittest.TestCase):
    def test_short_title_is_the_whole_slug(self) -> None:
        self.assertEqual(title_slug("Hello World", 40), "hello-world")

    def test_reuses_slugify_normalization(self) -> None:
        self.assertEqual(title_slug("Ágil  y   Rápido", 40), "agil-y-rapido")

    def test_never_ends_with_a_hyphen(self) -> None:
        self.assertEqual(title_slug("Hello World Again", 12), "hello-world")

    def test_cuts_at_a_word_boundary(self) -> None:
        self.assertEqual(title_slug("Hello World Again", 8), "hello")

    def test_truncates_a_first_word_longer_than_the_limit(self) -> None:
        self.assertEqual(title_slug("Supercalifragilistic", 5), "super")

    def test_result_never_exceeds_the_limit(self) -> None:
        for limit in range(1, 30):
            self.assertLessEqual(len(title_slug("The quick brown fox jumps", limit)), limit)


if __name__ == "__main__":
    unittest.main()
