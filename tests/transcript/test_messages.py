"""Pruebas de ``transcript.messages`` — qué mensaje escribió una PERSONA.

Adaptación del lector que ``kaupamex-docs:
.claude/hooks/stop-gate-hallazgo-pendiente.sh`` lleva embebido en un heredoc, y
que ``save-agent-result.mjs`` necesita en su otra mitad (el último mensaje del
asistente). Lo que viaja es la lectura del JSONL y el criterio de procedencia;
lo que se inyecta es qué se busca en el texto, que es del consumidor (DEC-04).

Por qué el criterio NO es «contenido de texto puro»
----------------------------------------------------

Ésa es la heurística del guion original, y **no discrimina**. Medido sobre el
transcript vivo de esta sesión (185 MB, 7210 mensajes con ``role: user``):

======================================  =====  ================================
Marca de la línea                       n      Qué es
======================================  =====  ================================
``origin.kind == "human"``              136    lo que una persona tecleó
``isCompactSummary: true``              105    el resumen de una compactación
``isMeta: true``                         65    recordatorio inyectado
``origin.kind == "task-notification"``   13    aviso del harness
sin ``origin`` (eco de slash-command)     14    ``<command-name>/model</…>``
======================================  =====  ================================

La heurística de texto puro acepta las **335**. Las 199 que no son humanas
entran igual, y el resumen de compactación es el caso peligroso: **cita las
directivas del usuario verbatim**, así que un gate que busque una orden en el
«último mensaje del usuario» puede encontrarla en un texto que nadie tecleó.

Por qué la ausencia de ``origin`` REHÚSA
-----------------------------------------

Si ninguna línea del transcript declara ``origin``, exigirlo daría cero
mensajes humanos — y cero se leería como «nadie pidió nada», que es el
veredicto contrario al que el consumidor busca. Es el sub-patrón D: un verde
que no distingue «no hay directiva» de «no puedo verla». Por eso rehúsa.

*Métrica:* la marca de procedencia de cada línea ``role: user`` del JSONL.
*Ciega a:* un mensaje humano que el harness marcara como inyectado, y a la
autenticidad del contenido — ``origin`` lo declara el cliente, no se verifica.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from transcript import messages as tm  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def write(folder: Path, name: str, lines: list[dict]) -> Path:
    path = folder / name
    path.write_text("".join(json.dumps(o) + "\n" for o in lines), encoding="utf-8")
    return path


def human(text: str) -> dict:
    return {"type": "user", "origin": {"kind": "human"},
            "message": {"role": "user", "content": text}}


def compact_summary(text: str) -> dict:
    """Un resumen de compactación: contenido de texto puro y NO tecleado."""
    return {"type": "user", "isCompactSummary": True,
            "message": {"role": "user", "content": text}}


def meta(text: str) -> dict:
    return {"type": "user", "isMeta": True,
            "message": {"role": "user", "content": text}}


def task_notification(text: str) -> dict:
    return {"type": "user", "origin": {"kind": "task-notification"},
            "message": {"role": "user", "content": text}}


def tool_echo() -> dict:
    return {"type": "user", "origin": {"kind": "human"},
            "message": {"role": "user", "content": [
                {"type": "tool_result", "content": "salida"}]}}


with tempfile.TemporaryDirectory() as tmp:
    folder = Path(tmp)

    print("== 1. el último mensaje humano es el que se devuelve ==")
    path = write(folder, "simple.jsonl", [
        human("primero"), human("segundo"), human("tercero")])
    check("el último, no el primero", "tercero", tm.last_human_text(path))

    print("== 2. CONTROL: un resumen de compactación NO es el último mensaje ==")
    path = write(folder, "compactado.jsonl", [
        human("documenta el hallazgo"),
        compact_summary("… el usuario dijo: documenta el hallazgo …")])
    check("gana el humano, no el resumen",
          "documenta el hallazgo", tm.last_human_text(path))

    print("== 3. las otras tres formas inyectadas tampoco cuentan ==")
    path = write(folder, "inyectados.jsonl", [
        human("lo tecleado"), meta("recordatorio"),
        task_notification("un agente terminó")])
    check("ni meta ni notificación desplazan al humano",
          "lo tecleado", tm.last_human_text(path))

    print("== 4. un eco de herramienta no es un mensaje ==")
    path = write(folder, "eco.jsonl", [human("lo tecleado"), tool_echo()])
    check("el bloque tool_result se salta",
          "lo tecleado", tm.last_human_text(path))

    print("== 5. bloques de texto: se concatenan ==")
    path = write(folder, "bloques.jsonl", [
        {"type": "user", "origin": {"kind": "human"},
         "message": {"role": "user", "content": [
             {"type": "text", "text": "una"}, {"type": "text", "text": "dos"}]}}])
    check("se unen con salto de línea", "una\ndos", tm.last_human_text(path))

    print("== 6. CONTROL: sin NINGÚN origin declarado, REHÚSA ==")
    path = write(folder, "sin-origen.jsonl", [
        {"type": "user", "message": {"role": "user", "content": "algo"}}])
    try:
        tm.last_human_text(path)
        check("rehúsa sin procedencia", "NoProvenanceError", "devolvió texto")
    except tm.NoProvenanceError as err:
        check("rehúsa sin procedencia", True, "origin" in str(err))

    print("== 7. un transcript sin humanos, pero CON procedencia, da vacío ==")
    path = write(folder, "solo-inyectados.jsonl", [
        compact_summary("resumen"), task_notification("aviso")])
    check("cadena vacía, no excepción", "", tm.last_human_text(path))

    print("== 8. una línea corrupta no tumba la lectura ==")
    path = folder / "corrupta.jsonl"
    path.write_text(json.dumps(human("antes")) + "\n{ no es json\n"
                    + json.dumps(human("después")) + "\n", encoding="utf-8")
    check("se salta y sigue", "después", tm.last_human_text(path))

    print("== 9. un archivo que no existe da vacío, no revienta ==")
    check("sin archivo, sin texto", "", tm.last_human_text(folder / "no-existe.jsonl"))

    print("== 10. el último mensaje del ASISTENTE — la otra mitad ==")
    path = write(folder, "asistente.jsonl", [
        human("pregunta"),
        {"type": "assistant", "message": {"role": "assistant", "content": [
            {"type": "text", "text": "primera respuesta"}]}},
        {"type": "assistant", "message": {"role": "assistant", "content": [
            {"type": "tool_use", "name": "Bash"},
            {"type": "text", "text": "el reporte final"}]}}])
    check("devuelve el último, con su texto",
          "el reporte final", tm.last_assistant_text(path))
    check("un transcript sin asistente da vacío", "",
          tm.last_assistant_text(folder / "simple.jsonl"))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
