"""Detector PreToolUse: historial de cambios escrito en un comentario de código.

Un comentario declara la intención del código; cuándo y cómo cambió es de
``git log``, del mensaje del commit o del hallazgo (``clean-code.md``,
«Comentarios»). Este detector avisa cuando un comentario o docstring que se
añade a un archivo de código trae una de las marcas de ``_HISTORY_MARKERS``.

Mide sólo líneas de comentario completas de TypeScript/JavaScript, Python y
shell —por la extensión o, sin ella, por el shebang— y sólo lo que se añade: el contenido de ``Write``,
las líneas de ``Edit`` que no estaban en ``old_string`` y el cuerpo de un
heredoc de Bash que escribe un archivo de código. Avisa, no bloquea: el léxico
no separa toda la historia de toda la intención.

*Métrica:* marcas léxicas de historial en líneas de comentario añadidas.
*Ciega a:* la historia narrada sin esas marcas, y al comentario al final de
una línea de código.
"""
from __future__ import annotations

import importlib.util
import pathlib
import re
import sys

_SHELL_TEXT = pathlib.Path(__file__).with_name("shell_text.py")
_spec = importlib.util.spec_from_file_location("shell_text", _SHELL_TEXT)
assert _spec is not None and _spec.loader is not None
shell_text = importlib.util.module_from_spec(_spec)
sys.modules.setdefault("shell_text", shell_text)
_spec.loader.exec_module(shell_text)

_LANGUAGE_BY_SUFFIX = {
    **dict.fromkeys((".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"), "slash"),
    ".py": "python",
    **dict.fromkeys((".sh", ".bash"), "shell"),
}
#: Intérprete del shebang → lenguaje, para los scripts sin extensión.
_LANGUAGE_BY_INTERPRETER = (
    (re.compile(r"python"), "python"),
    (re.compile(r"\b(ba|z|da)?sh\b"), "shell"),
    (re.compile(r"\b(bun|node|deno|tsx)\b"), "slash"),
)

_HISTORY_MARKERS = (
    re.compile(r"\b20\d{2}-\d{2}-\d{2}\b"),
    re.compile(r"^(corregid|añadid|mudad|retirad|reescrit|actualizad)[oa]s?\b", re.IGNORECASE),
    re.compile(r"\bantes (vivía|era|estaba|decía|tenía|usaba|hacía|daba|leía|iba)\b", re.IGNORECASE),
    re.compile(r"\bla (versión|redacción) anterior\b", re.IGNORECASE),
    re.compile(r"\b(iter|ronda|round) \d+\b", re.IGNORECASE),
    re.compile(r"\bepisodios?\b", re.IGNORECASE),
    re.compile(r"\b(H-[A-Z]+-\d+|ERR-\d+)\b"),
)

_MAX_QUOTED = 3


def _slash_comments(lines: list[str]) -> list[str]:
    """El texto de cada línea de comentario de un lenguaje de la familia C."""
    comments: list[str] = []
    in_block = False
    for line in lines:
        stripped = line.strip()
        if in_block or stripped.startswith("/*"):
            in_block = "*/" not in stripped
            comments.append(stripped.lstrip("/*").rstrip("*/").strip())
        elif stripped.startswith("//"):
            comments.append(stripped.lstrip("/").strip())
    return comments


def _hash_comments(lines: list[str], python: bool) -> list[str]:
    """El texto de cada línea ``#`` y, en Python, de cada línea de docstring."""
    comments: list[str] = []
    quote: str | None = None
    for line in lines:
        stripped = line.strip()
        if quote:
            comments.append(stripped.replace(quote, "").strip())
            if quote in stripped:
                quote = None
            continue
        if python and stripped[:3] in ('"""', "'''"):
            opener = stripped[:3]
            comments.append(stripped.replace(opener, "").strip())
            if stripped.count(opener) == 1:
                quote = opener
            continue
        if stripped.startswith("#"):
            comments.append(stripped.lstrip("#").strip())
    return comments


def language_of(path: str, text: str) -> str | None:
    """El lenguaje por la extensión; sin extensión, por el intérprete del shebang."""
    suffix = pathlib.Path(path).suffix.lower()
    if suffix:
        return _LANGUAGE_BY_SUFFIX.get(suffix)
    first = text.split("\n", 1)[0]
    if not first.startswith("#!"):
        return None
    return next((language for pattern, language in _LANGUAGE_BY_INTERPRETER if pattern.search(first)), None)


def comment_lines(path: str, text: str) -> list[str]:
    """Las líneas de comentario de ``text`` en el lenguaje de ``path``."""
    language = language_of(path, text)
    lines = text.split("\n")
    if language == "slash":
        return _slash_comments(lines)
    if language in ("python", "shell"):
        return _hash_comments(lines, python=language == "python")
    return []


def _added_comments(payload: dict) -> list[str]:
    tool_name = payload.get("tool_name")
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return []
    if tool_name == "Write":
        return comment_lines(str(tool_input.get("file_path") or ""), str(tool_input.get("content") or ""))
    if tool_name == "Edit":
        path = str(tool_input.get("file_path") or "")
        existing = set(comment_lines(path, str(tool_input.get("old_string") or "")))
        return [c for c in comment_lines(path, str(tool_input.get("new_string") or "")) if c not in existing]
    if tool_name == "Bash":
        added: list[str] = []
        for target, body in shell_text.heredoc_writes(str(tool_input.get("command") or "")):
            if target:
                added.extend(comment_lines(target, body))
        return added
    return []


def _carries_history(comment: str) -> bool:
    return any(marker.search(comment) for marker in _HISTORY_MARKERS)


def detect(payload: dict) -> str | None:
    """El aviso con las líneas que narran historial, o ``None``."""
    flagged = [c for c in _added_comments(payload or {}) if _carries_history(c)]
    if not flagged:
        return None
    quoted = "\n".join(f"    «{c}»" for c in flagged[:_MAX_QUOTED])
    more = f"\n    …y {len(flagged) - _MAX_QUOTED} más" if len(flagged) > _MAX_QUOTED else ""
    return (
        "HISTORIAL EN COMENTARIO — un comentario declara la intención del código; "
        "la fecha, la bitácora y el episodio van al commit o al hallazgo "
        f"(`clean-code.md`, «Comentarios»):\n{quoted}{more}\n"
        "Reescríbelo como lo que el código hace y por qué; conserva la procedencia de un porte."
    )
