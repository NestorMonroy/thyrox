"""Detector PreToolUse: Write/Edit/Read sobre texto plano, cuando Bash ya podía.

Es el sexto detector, y aplica ``.claude/rules/operaciones-de-archivo-con-bash.md``
—hoy sólo prosa, con dos fragmentos de ejemplo que nadie ejecuta— con la misma
forma que ``detect_agent_dispatch.py`` le dio a
``.claude/rules/trabajo-en-segundo-plano.md``: la regla describe la conducta,
el detector la recuerda en el momento de la acción.

Origen medido: ``err-063`` (2026-09-09) contó 51 escrituras con herramienta
dedicada en tres agentes que NUNCA recibieron la directiva en su prompt, y aun
así usaron Bash el 79-96 % de las veces por su cuenta. La regla ya vive en el
proveedor; lo que le faltaba no era más prosa — era el gate.

La mitad de juicio — las DOS excepciones, y son objetivas
-----------------------------------------------------------

Sin una mitad que calle, el aviso saldría en TODO ``Write``/``Edit``/``Read``
sobre texto, y un aviso que sale siempre se aprende a ignorar —el mismo riesgo
que ``JUDGMENT_ROOTS`` evita en el gemelo. Aquí la mitad no son verbos —Bash no
"decide", así que no hay léxico de juicio que buscar en el ``tool_input``—: son
dos condiciones **del archivo y del contenido**, medibles sin ambigüedad:

1. **Extensión binaria o de medio.** ``cat``/``sed`` no producen un ``.png``
   con sentido, y ``Read`` sobre una imagen usa la vía multimodal del cliente
   —algo que ningún guion de shell replica—. Es la comprobación más barata:
   la extensión del ``file_path``.
2. **Colisión de delimitador de heredoc.** Un contenido que ya trae una línea
   ``EOF`` a secas rompe la forma canónica ``cat > archivo <<'EOF' ... EOF``
   de la propia regla. Ahí Bash SÍ puede —con otro delimitador— pero ya no es
   la forma que la regla ejemplifica, y forzarla sería el mismo error que
   ``check_rst_sintaxis.py`` evita al no reinventar validación a mano.

Qué NO cierra esta mitad, declarado y no escondido
----------------------------------------------------

Un ``Edit``/``Write`` genuinamente justificado por otra razón —tamaño,
formato estructurado donde ``sed`` arriesga romper el documento entero,
seguridad de que ``old_string`` es único— **no tiene aquí una excepción
objetiva**. El aviso sale igual, y quien lo recibe decide con el mismo criterio
que ``detect_agent_dispatch.py`` le deja al lector: *"si esto sí lo exige,
ignora el aviso y dilo al reportar el turno"*. Ampliar la mitad de juicio con
un criterio verificado es trabajo sucesor, no de este primer corte.

Qué NO hace, y es deliberado
-------------------------------

**No bloquea.** Sale por ``additionalContext`` como sus cinco hermanos del
despachador. Un patrón por extensión no distingue "esto era más simple en
Bash" de "esto exigía la herramienta"; bloquear con un instrumento que no
discrimina sería el sub-patrón D de ``metrica-decide-la-conclusion.md`` con el
propio gate como sujeto.

*Métrica:* ``tool_name`` y la extensión de ``tool_input.file_path``, sobre
cada llamada a ``Write``/``Edit``/``Read``.
*Ciega a:* un ``Write``/``Edit`` de texto genuinamente necesario por tamaño o
por estructura (la mitad de juicio no lo distingue, por diseño de este
primer corte); y a ``NotebookEdit``, que es otro tool y no se mide aquí.
"""
from __future__ import annotations

import pathlib

#: Herramientas que este detector mide. ``NotebookEdit`` queda fuera a
#: propósito: opera sobre celdas, no sobre el archivo entero, y su equivalente
#: en Bash no es un heredoc de una pieza.
DEDICATED_TOOLS = frozenset({"Write", "Edit", "Read"})

#: Excepción 1 — extensiones donde Bash genuinamente no produce ni lee con
#: sentido. Lista cerrada y medible, no un "y otros similares".
BINARY_OR_MEDIA_EXTENSIONS = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".svg",
    ".pdf", ".sqlite3", ".sqlite", ".db",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".ipynb",
    ".zip", ".tar", ".gz", ".xz", ".whl", ".jar",
    ".mp3", ".mp4", ".wav", ".webm",
})

#: El equivalente Bash que el aviso sugiere, por tool. ``{path}`` se sustituye.
_BASH_EQUIVALENT = {
    "Write": "cat > \"{path}\" <<'EOF'\n...\nEOF",
    "Edit": "sed -i 's/.../.../' \"{path}\"  (o un guion python -c con re.sub para algo preciso)",
    "Read": "sed -n '1,200p' \"{path}\"   ·   cat \"{path}\"   ·   grep -n \"...\" \"{path}\"",
}


def _has_eof_collision(text: str) -> bool:
    """¿El contenido trae una línea ``EOF`` a secas, que rompería el heredoc?"""
    return any(line.strip() == "EOF" for line in text.splitlines())


def _content_of(tool_name: str, tool_input: dict) -> str:
    """El texto que el tool escribiría, para medir la colisión de delimitador.

    ``Read`` no escribe nada — no hay colisión que medir, y se declara vacío
    en vez de omitir la rama.
    """
    if tool_name == "Write":
        return str(tool_input.get("content") or "")
    if tool_name == "Edit":
        return str(tool_input.get("new_string") or "")
    return ""


def detect(payload: dict) -> str | None:
    """El aviso de archivo si Bash ya cubría esto, o ``None``."""
    tool_name = (payload or {}).get("tool_name")
    if tool_name not in DEDICATED_TOOLS:
        return None

    tool_input = (payload or {}).get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return None

    file_path = tool_input.get("file_path")
    if not file_path or not isinstance(file_path, str):
        return None

    suffix = pathlib.Path(file_path).suffix.lower()
    if suffix in BINARY_OR_MEDIA_EXTENSIONS:
        return None

    if _has_eof_collision(_content_of(tool_name, tool_input)):
        return None

    equivalent = _BASH_EQUIVALENT[tool_name].format(path=file_path)
    return (
        f"GATE DE ARCHIVO — {tool_name} sobre `{file_path}` (texto plano). "
        "`.claude/rules/operaciones-de-archivo-con-bash.md`: leer, buscar y "
        "editar van por Bash; Read/Edit/Write quedan para lo que Bash "
        f"genuinamente no puede. Equivalente:\n    {equivalent}\n"
        "Si este caso sí lo exige (tamaño, formato estructurado donde sed "
        "arriesga el documento), ignora el aviso y dilo al reportar el turno."
    )
