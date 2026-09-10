"""Pruebas de ``transcript.model`` — qué modelo produjo cada turno.

Adaptación de ``kaupamex-docs: .claude/scripts/agents/model_catalog.py``
(``model_of_transcript`` y ``session_usage_by_model``). Lo que discrimina este
primitivo: el reparto de ``Usage`` por modelo (no un total plano), el
discriminador por PREFIJO ``claude-`` (no una gramática de partes, que sería
ciega a los identificadores que ponen la versión delante), la deduplicación
GLOBAL por ``message.id`` — reutilizando ``transcript.usage.usage_of``, no
reimplementándolo — y el cubo nombrado para el mensaje con ``usage`` real pero
sin modelo reconocible.

*Métrica de esta suite:* cada caso ejercita una de las cuatro piezas del
porte; el caso 8 es el control que ANULA la causa del discriminador y
comprueba que el veredicto CAMBIA exactamente donde depende de ella.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from transcript import model as tm  # noqa: E402

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


def assistant(message_id: str | None, model: str | None = "claude-sonnet-5",
              *, input_tokens=0, cache_creation=0, cache_read=0, output=0,
              omit_model: bool = False) -> dict:
    """Una línea ``assistant`` con ``usage`` y ``model`` — omitiendo el campo si se pide."""
    body = {
        "role": "assistant",
        "usage": {
            "input_tokens": input_tokens,
            "cache_creation_input_tokens": cache_creation,
            "cache_read_input_tokens": cache_read,
            "output_tokens": output,
        },
    }
    if not omit_model:
        body["model"] = model
    if message_id is not None:
        body["id"] = message_id
    return {"type": "assistant", "message": body}


def user(text: str = "hola") -> dict:
    return {"type": "user", "message": {"role": "user", "content": text}}


print("== 1. model_of — un assistant con modelo Claude real ==")
check("el identificador viaja verbatim", "claude-sonnet-5",
      tm.model_of(assistant("m1", "claude-sonnet-5")))

print("== 2. model_of — un mensaje de usuario no aplica ==")
check("no es assistant", None, tm.model_of(user()))

print("== 3. model_of — assistant SIN el campo model ==")
check("sin la clave model", None,
      tm.model_of(assistant("m2", omit_model=True)))

print("== 4. model_of — un identificador de OTRO proveedor no pasa el prefijo ==")
check("gpt-4 no empieza con claude-", None,
      tm.model_of(assistant("m3", "gpt-4")))

print("== 5. model_of — DISCRIMINA: identificadores con la versión ADELANTE ==")
# Tres de los diecinueve del catálogo de la fuente ponen la versión antes de
# la familia (claude-3-5-sonnet, claude-3-5-haiku, claude-3-7-sonnet). Un
# patrón que asuma "claude-<familia>-<version>" es ciego a estos tres; el
# prefijo puro no lo es.
for viejo in ("claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-7-sonnet"):
    check(f"{viejo} se reconoce por prefijo, no por gramática de partes",
          viejo, tm.model_of(assistant("v-" + viejo, viejo)))

print("== 6. accumulate_by_model — reparte por modelo, NO un total plano ==")
lineas = [
    assistant("a1", "claude-sonnet-5", input_tokens=10, output=5),
    assistant("a2", "claude-opus-5", input_tokens=100, output=50),
]
por_modelo = tm.accumulate_by_model(lineas)
check("dos cubos, uno por modelo", {"claude-sonnet-5", "claude-opus-5"},
      set(por_modelo.keys()))
check("el cubo de sonnet NO incluye el gasto de opus",
      10, por_modelo["claude-sonnet-5"].input)
check("el cubo de opus NO incluye el gasto de sonnet",
      100, por_modelo["claude-opus-5"].input)
check("cada cubo cuenta su propio mensaje", 1, por_modelo["claude-sonnet-5"].messages)

print("== 7. accumulate_by_model — DISCRIMINA: streaming del MISMO id cuenta UNA vez ==")
repetido = [assistant("dup", "claude-opus-5", input_tokens=7, output=3)
            for _ in range(3)]
dedupe = tm.accumulate_by_model(repetido)
check("un solo cubo", ["claude-opus-5"], list(dedupe.keys()))
check("el input NO se triplica", 7, dedupe["claude-opus-5"].input)
check("un solo id único, aunque aparezca 3 veces", 1, dedupe["claude-opus-5"].messages)

print("== 8. accumulate_by_model — un mensaje con usage y SIN modelo cae en UNKNOWN_MODEL ==")
sin_modelo = [
    assistant("s1", "claude-sonnet-5", input_tokens=1),
    assistant("s2", omit_model=True, input_tokens=9, output=2),
]
con_ausente = tm.accumulate_by_model(sin_modelo)
check("el cubo ausente existe con su nombre propio",
      True, tm.UNKNOWN_MODEL in con_ausente)
check("su gasto NO se pierde", 9, con_ausente[tm.UNKNOWN_MODEL].input)
check("y NO se mezcla con el cubo de sonnet",
      1, con_ausente["claude-sonnet-5"].input)
check("UNKNOWN_MODEL no es la cadena vacía ni None (cubo nombrado, no ambiguo)",
      True, tm.UNKNOWN_MODEL not in (None, ""))

print("== 9. accumulate_by_model — la deduplicación es GLOBAL, no por cubo ==")
# Caso patológico (no observado en un transcript real): el MISMO id aparece
# adjudicado a dos modelos distintos. El dedup ocurre ANTES de mirar el
# modelo -- así que la segunda aparición ni siquiera abre su propio cubo.
malformado = [
    assistant("z", "claude-sonnet-5", input_tokens=5),
    assistant("z", "claude-opus-5", input_tokens=999),
]
resultado_malformado = tm.accumulate_by_model(malformado)
check("sólo el cubo de la PRIMERA aparición existe",
      ["claude-sonnet-5"], list(resultado_malformado.keys()))
check("el cubo de opus ni se crea (dedup global, antes de agrupar)",
      False, "claude-opus-5" in resultado_malformado)

print("== 10. accumulate_by_model — cero líneas da un dict vacío, sin excepción ==")
check("ningún cubo", {}, tm.accumulate_by_model([]))

print("== 11. accumulate_by_model — ignora lo que no trae usage, sin romperse ==")
mixto = tm.accumulate_by_model([user("algo"), assistant("m4", "claude-sonnet-5", input_tokens=3)])
check("sólo el que trae usage cuenta", 1, mixto["claude-sonnet-5"].messages)

print("== 12. ANULACIÓN — retirar el prefijo hace que TODO pase, y sólo eso cambia ==")
# Antes de tocar nada: el control de la línea 4 (otro proveedor) es None.
check("control previo — gpt-4 sigue sin pasar", None,
      tm.model_of(assistant("c1", "gpt-4")))
prefijo_original = tm.MODEL_PREFIX
try:
    tm.MODEL_PREFIX = ""
    check("CAUSA RETIRADA — con el prefijo vacío, gpt-4 SÍ pasa",
          "gpt-4", tm.model_of(assistant("c2", "gpt-4")))
    check("y un identificador Claude real sigue pasando igual (no es lo que cambió)",
          "claude-sonnet-5", tm.model_of(assistant("c3", "claude-sonnet-5")))
finally:
    tm.MODEL_PREFIX = prefijo_original
check("restaurado — gpt-4 vuelve a no pasar", None,
      tm.model_of(assistant("c4", "gpt-4")))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
