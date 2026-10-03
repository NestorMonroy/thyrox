"""Slugs para URLs: minúsculas ASCII separadas por guiones."""

import re
import unicodedata

_SEPARATOR_RUN = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    """Convierte un texto en slug: sin acentos, en minúsculas, guiones simples."""
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return _SEPARATOR_RUN.sub("-", ascii_text.lower()).strip("-")


def title_slug(title: str, max_length: int) -> str:
    """El slug de un título, acotado a ``max_length`` caracteres.

    Corta en un límite de palabra (nunca a media palabra) y nunca termina en
    guion. Si la primera palabra ya excede el límite, se trunca esa palabra.
    """
    raise NotImplementedError("title_slug")
