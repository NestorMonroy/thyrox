"""Qué mensaje escribió una persona, y cuál inyectó el harness.

Adaptación del lector embebido en ``kaupamex-docs:
.claude/hooks/stop-gate-hallazgo-pendiente.sh`` (un heredoc de Python dentro de
un guion de shell), que es el mismo que ``save-agent-result.mjs`` necesita por
su otra mitad. Medido antes de portarlo: **24 archivos** de ``.claude/`` abren
un transcript JSONL — es un primitivo de familia, no de un hook.

El criterio de procedencia, y por qué NO es «texto puro»
---------------------------------------------------------

La fuente clasificaba como genuino todo mensaje ``role: user`` cuyo contenido
fuera una cadena o bloques ``text`` — el resto, ecos de herramienta. Medido
sobre el transcript vivo de la sesión que la porta (185 MB, 7210 mensajes de
usuario), esa heurística acepta **335**, y sólo **136** los tecleó alguien:

======================================  =====  ================================
Marca de la línea                       n      Qué es
======================================  =====  ================================
``origin.kind == "human"``              136    lo que una persona tecleó
``isCompactSummary: true``              105    el resumen de una compactación
``isMeta: true``                         65    recordatorio inyectado
``origin.kind == "task-notification"``   13    aviso de subagente terminado
sin ``origin`` (eco de slash-command)     14    ``<command-name>/model</…>``
======================================  =====  ================================

El resumen de compactación es el caso que hace daño: **cita las directivas del
usuario verbatim**, porque el prompt de resumen se lo exige. Un consumidor que
busque una orden en «el último mensaje del usuario» la encuentra ahí sin que
nadie la haya dado — y actúa sobre una cita.

Por qué la ausencia de procedencia REHÚSA
------------------------------------------

Si ninguna línea declara ``origin``, exigirlo da cero mensajes humanos. Ese
cero se leería como «nadie pidió nada», que es el veredicto **contrario** al
que el consumidor busca: el sub-patrón D de ``metrica-decide-la-conclusion`` —
un verde que no distingue «no hay» de «no puedo ver». Se rehúsa, y el
consumidor decide qué hacer con la incógnita.

*Métrica:* la marca de procedencia declarada por cada línea ``role: user``.
*Ciega a:* un mensaje humano que el harness marcara como inyectado; y a la
autenticidad del contenido — ``origin`` lo declara el cliente, nadie lo firma.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

#: El valor de ``origin.kind`` que declara a una persona al teclado.
HUMAN = "human"

#: Marcas de nivel de línea que declaran inyección por el harness.
INJECTED_FLAGS = ("isCompactSummary", "isMeta")


class NoProvenanceError(RuntimeError):
    """Ninguna línea declara ``origin``: la procedencia no se puede medir."""


@dataclass(frozen=True)
class Message:
    """Una línea del transcript, con su texto y de quién es."""

    text: str
    origin: str | None
    injected: bool

    @property
    def human(self) -> bool:
        return self.origin == HUMAN and not self.injected


def read_user_messages(path: str | Path) -> list[Message]:
    """Los mensajes ``role: user``, con su procedencia y sin los ecos.

    Un bloque ``tool_result`` no es un mensaje: es la respuesta de una
    herramienta que el protocolo transporta por el mismo carril.
    """
    out: list[Message] = []
    for obj in _lines(path):
        if obj.get("type") != "user":
            continue
        body = obj.get("message") or {}
        if body.get("role") != "user":
            continue
        text = _text_of(body.get("content"))
        if not text:
            continue
        out.append(Message(text=text,
                           origin=(obj.get("origin") or {}).get("kind"),
                           injected=any(obj.get(f) for f in INJECTED_FLAGS)))
    return out


def last_human_text(path: str | Path) -> str:
    """El último mensaje que tecleó una persona; cadena vacía si no hay.

    Rehúsa si **ninguna** línea de usuario declara procedencia: ahí el cero no
    significa «no hay humano», significa que el instrumento no lo ve.
    """
    messages = read_user_messages(path)
    if messages and not any(m.origin for m in messages):
        raise NoProvenanceError(
            "ninguna línea de usuario declara `origin`: la procedencia no se "
            "puede medir, y un cero aquí se leería como «nadie pidió nada»"
        )
    for message in reversed(messages):
        if message.human:
            return message.text
    return ""


def last_assistant_text(path: str | Path) -> str:
    """El texto del último mensaje del asistente — su reporte final.

    Un mensaje del asistente mezcla bloques ``text`` con ``tool_use``; lo que
    el consumidor quiere es la prosa, así que los demás bloques se descartan en
    vez de descartar el mensaje entero.
    """
    out = ""
    for obj in _lines(path):
        if obj.get("type") != "assistant":
            continue
        body = obj.get("message") or {}
        if body.get("role") != "assistant":
            continue
        text = _text_of(body.get("content"), only_text=True)
        if text:
            out = text
    return out


def _lines(path: str | Path):
    """Los objetos del JSONL; una línea corrupta se salta, no tumba la lectura."""
    try:
        handle = open(path, encoding="utf-8")
    except OSError:
        return
    with handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except ValueError:
                continue
            if isinstance(obj, dict):
                yield obj


def _text_of(content, only_text: bool = False) -> str:
    """El texto de un contenido; vacío si trae bloques que no son texto.

    ``only_text`` cambia la conducta ante la mezcla: el asistente la tiene por
    construcción (texto + ``tool_use``) y ahí se filtra; en un mensaje de
    usuario la mezcla ES la señal de que es un eco, y se descarta entero.
    """
    if isinstance(content, str):
        return content.strip()
    if not isinstance(content, list) or not content:
        return ""
    blocks = [b for b in content if isinstance(b, dict)]
    kinds = {b.get("type") for b in blocks}
    if not only_text and kinds - {"text"}:
        return ""
    return "\n".join(b.get("text", "") for b in blocks
                     if b.get("type") == "text").strip()
