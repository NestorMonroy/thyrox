#!/usr/bin/env python3
"""Prueba de clasificar_agentes.py.

Dos bloques con propósitos distintos, y la distinción importa:

1. **El motor** — 24 casos controlados que ejercitan cada rama de la cadena de
   precedencia, en los dos idiomas. Prueban que el puerto de
   ``ccb: classifier/heuristic.ts`` es fiel.

2. **La cobertura sobre el corpus real** — mide qué fracción de nuestro roster
   decide por patrón. Hoy es **0**, y ese cero es el hallazgo, no un fallo:
   el banco lee marcadores (``result:``/``blocked:``) que nuestros subagentes
   no emiten. Si algún día adoptamos la convención de cierre, este número
   sube y el test lo hace visible en vez de dejarlo implícito.

El bloque 2 **no falla** cuando la cobertura es baja — afirmar que 0 es un
error sería fabricar una expectativa. Publica el número con su denominador,
que es lo que ``hallazgo-abierto-genera-sucesor.md`` exige de todo gate.

Caveat medido: **el corpus incluye esta misma corrida**. La salida de este
test es, mientras corre, una entrada más del roster, y su cola contiene los
literales del banco de casos (``blocked: …``) — así que el conteo puede dar
1 de más *durante* la ejecución y volver a 0 al cerrarse el archivo. No se
auto-excluye a propósito: la heurística que haría falta ("la entrada más
reciente") taparía datos legítimos. Ver H-DOCS-142.

Uso:  python3 .claude/scripts/test-clasificar_agentes.py
"""

from __future__ import annotations

import importlib.util
import pathlib
import sys

# El SUT vive un nivel arriba (``.claude/scripts/``); este archivo está en
# ``tests/``, directorio hermano del código — no co-localizado.
HERE = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("clf", HERE / "agents" / "clasificar_agentes.py")
clf = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(clf)

PASS = 0
FAIL = 0


def check(desc: str, expected, got) -> None:
    global PASS, FAIL
    if expected == got:
        PASS += 1
        print(f"  ok    {desc}")
    else:
        FAIL += 1
        print(f"  FALLA {desc}\n        esperado: {expected}\n        obtenido: {got}")


def state_of(text: str):
    v = clf.pre_classify(text)
    return v["state"] if v else None


def branch_of(text: str):
    v = clf.pre_classify(text)
    return v["branch"] if v else None


print("== 1. el motor: cada rama de la cadena de precedencia ==")

# Marcadores de línea — la rama de mayor precedencia.
check("blocked: marcador [en]", "blocked", state_of("blocked: need the API key"))
check("bloqueado: marcador [es]", "blocked", state_of("bloqueado: falta la credencial"))
check("failed: marcador [en]", "failed", state_of("failed: migration 0016 aborted"))
check("falló: marcador [es]", "failed", state_of("falló: la suite quedó en rojo"))
check("needs input [en]", "blocked", state_of("needs input: which of the two options"))
check("necesito: [es]", "blocked", state_of("necesito: que confirmes el alcance"))

# result: y su interacción con next:
check("result: solo -> done", "done", state_of("result: portados los 6 símbolos"))
check("result: + next: -> working", "working",
      state_of("result: portados los 6\nnext: falta el test"))

# Esperar a una máquina NO es estar bloqueado. Es la distinción central.
check("esperar a CI -> working", "working", state_of("Waiting for CI to finish"))
check("esperar a la suite [es] -> working", "working",
      state_of("Quedo esperando la suite"))
check("esperar a una persona -> blocked", "blocked",
      state_of("Awaiting your decision on the scope"))
check("queda a tu criterio [es] -> blocked", "blocked",
      state_of("El resto queda a tu criterio"))

# Pregunta final y verbos.
check("pregunta final [es]", "blocked", state_of("¿Sigo con la Ola 2?"))
check("verbo de trabajo [en]", "working", state_of("Let me check the remaining files"))
check("verbo de trabajo [es]", "working", state_of("Voy a medir el resto de los addons"))
check("no puedo seguir [es]", "blocked", state_of("No puedo seguir sin la credencial"))
check("me rindo [es]", "failed", state_of("Me rindo con este archivo"))
check("VERDICT: PASS", "done", state_of("VERDICT: PASS"))
check("VEREDICTO: CONFIRMADO [es]", "done", state_of("VEREDICTO: CONFIRMADO"))
check("auth / límite de uso", "blocked", state_of("usage limit reached"))

# La pieza que separa la afirmación de la cita.
check(
    "blocked: DENTRO de cerca se ignora",
    "working",
    state_of("```\nblocked: esto es una cita\n```\nLet me continue with the port"),
)
check(
    "blocked: FUERA de cerca sí cuenta",
    "blocked",
    state_of("```\nalgo de código\n```\nblocked: falta la credencial"),
)

# El descargo degrada el marcador.
check(
    "descargo 'nothing needed from you' -> no bloquea",
    "done",
    state_of("result: todo portado\nblocked: nada — nothing needed from you"),
)

# La guarda de recencia: 3+ párrafos después, ya no es el cierre.
check(
    "3 párrafos tras el marcador -> no decide",
    None,
    state_of("blocked: algo\n\npárrafo uno\n\npárrafo dos\n\npárrafo tres"),
)

print("\n== 2. el fallback nunca devuelve None ==")
fb = clf.fallback_heuristic("una línea cualquiera")
check("fallback da working/idle", ("working", "idle"), (fb["state"], fb["tempo"]))
check("fallback declara su procedencia", "heuristic", fb["source"])
check("texto vacío no revienta", "—", clf.fallback_heuristic("")["detail"])

print("\n== 3. cobertura sobre el corpus REAL (informativo, no falla) ==")
roster, origen = clf.resolve_roster()
if not roster.is_dir():
    print("  (sin roster legible en este entorno — bloque omitido)")
else:
    total = decided = 0
    for entry in sorted(roster.glob("*.output")):
        total += 1
        if clf.pre_classify(clf.closing_text(entry)) is not None:
            decided += 1
    pct = (decided / total * 100) if total else 0.0
    print(f"  decididos por patrón: {decided} de {total} ({pct:.1f}%)  [{origen}]")
    if decided == 0:
        print("  ↳ 0 es el resultado ESPERADO hoy: el banco lee marcadores")
        print("    (result:/blocked:/failed:) que nuestros subagentes no emiten.")
        print("    El clasificador es la mitad LECTORA de un protocolo; falta la")
        print("    escritora. Ver H-DOCS-142 y la tarea #302.")

print(f"\nresultado: {PASS} ok, {FAIL} fallas")
sys.exit(1 if FAIL else 0)
