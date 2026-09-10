"""Pruebas de ``transcript.thread`` — cuál de las cadenas es el hilo vivo.

Qué DISCRIMINA esta suite
---------------------------

El caso 7 es el que da sentido al módulo: dos conversaciones distintas bajo
un MISMO ``sessionId``. El filtro intuitivo —quedarse con las líneas cuyo
``sessionId`` coincide— devuelve las dos enteras; la cadena de ``parentUuid``
devuelve una. Sin ese caso, cualquier implementación que se limitara a
copiar la lista pasaría toda la suite.

Es la forma medida sobre el transcript real (2026-09-10): **un solo
``sessionId`` para 104 449 líneas**, o sea un filtro que selecciona el 100 %,
repartidas en **250 cadenas**. El caso 7 es esa medición reducida a dos
cadenas y cuatro líneas.

La anulación (7-bis)
----------------------

Retira la causa declarada: sustituye el aislamiento por cadena por el filtro
de ``sessionId``. Tiene que caer el caso 7 y **sólo** él — los casos de
indexado, de ciclo y de sidechain no dependen del aislamiento y sobreviven.
Un control cuya anulación no invalide ninguna afirmación no discrimina
(sub-patrón D de ``metrica-decide-la-conclusion.md``).
"""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from transcript.thread import (SIDECHAIN_FLAG, chain_from, index_rows,
                               main_chain, main_chain_of)

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")


def row(uuid: str, parent: str | None = None, *, session: str = "S",
        kind: str = "assistant", sidechain: bool = False, mark: str = "") -> dict:
    return {"uuid": uuid, "parentUuid": parent, "sessionId": session,
            "type": kind, SIDECHAIN_FLAG: sidechain, "mark": mark or uuid}


print("== 1. index_rows — indexa por uuid y conserva el orden de llegada ==")
rows, order = index_rows([row("a"), row("b", "a"), row("c", "b")])
check("uuids indexados", ["a", "b", "c"], sorted(rows))
check("orden de llegada", ["a", "b", "c"], order)

print("== 2. index_rows — un uuid repetido sobrescribe y NO duplica el orden ==")
rows, order = index_rows([row("a", mark="first"), row("a", mark="last")])
check("gana la última aparición", "last", rows["a"]["mark"])
check("el orden no se duplica", ["a"], order)

print("== 3. index_rows — una línea sin uuid se salta, sin lanzar excepción ==")
rows, order = index_rows([{"type": "attachment"}, row("a")])
check("sólo la que tiene uuid", ["a"], order)

print("== 4. chain_from — camina hacia atrás y devuelve cronológico ==")
rows, _ = index_rows([row("a"), row("b", "a"), row("c", "b")])
check("raíz primero", ["a", "b", "c"],
      [line["uuid"] for line in chain_from(rows, "c")])

print("== 5. chain_from — un ciclo en los punteros NO recorre sin fin ==")
rows, _ = index_rows([row("a", "b"), row("b", "a")])
check("el guard corta el ciclo", 2, len(chain_from(rows, "a")))

print("== 6. main_chain — arranca en la última línea del archivo ==")
lines = [row("a"), row("b", "a"), row("c", "b")]
check("hilo completo", ["a", "b", "c"],
      [line["uuid"] for line in main_chain(lines)])

print("== 7. DISCRIMINA: dos cadenas bajo UN sessionId — sólo vuelve una ==")
# Las cuatro líneas comparten `sessionId`; son dos conversaciones distintas.
two_chains = [row("v1", session="S"), row("v2", "v1", session="S"),
              row("w1", session="S"), row("w2", "w1", session="S")]
by_chain = [line["uuid"] for line in main_chain(two_chains)]
by_session = [line["uuid"] for line in two_chains if line["sessionId"] == "S"]
check("la cadena aísla una conversación", ["w1", "w2"], by_chain)
check("el filtro por sessionId NO aísla nada", 4, len(by_session))
check("y por eso los dos NO coinciden", True, by_chain != by_session)

print("== 7-bis. ANULACIÓN: con el filtro de sessionId como aislamiento ==")
# Se retira la causa declarada (la cadena) y se pone el filtro en su lugar.
nullified = [line["uuid"] for line in two_chains if line["sessionId"] == "S"]
case7_falls = nullified != ["w1", "w2"]
indexing_survives = index_rows([row("a"), row("a", mark="z")])[1] == ["a"]
cycle_guard_survives = len(
    chain_from(index_rows([row("a", "b"), row("b", "a")])[0], "a")) == 2
check("cae el caso 7 al anular", True, case7_falls)
check("sobrevive el indexado (no depende del aislamiento)", True,
      indexing_survives)
check("sobrevive el guard de ciclo", True, cycle_guard_survives)

print("== 8. main_chain de CERO líneas da lista vacía, sin excepción ==")
check("lista vacía", [], main_chain([]))
check("ninguna línea con uuid tampoco falla", [],
      main_chain([{"type": "system"}]))

print("== 9. main_chain salta una sidechain final y toma la del hilo ==")
with_sidechain = [row("a"), row("b", "a"), row("s1", "b", sidechain=True)]
check("el desvío no arranca el hilo", ["a", "b"],
      [line["uuid"] for line in main_chain(with_sidechain)])

print("== 10. main_chain_of — lee un JSONL real de disco ==")
with tempfile.TemporaryDirectory() as tmp:
    path = Path(tmp) / "t.jsonl"
    path.write_text("\n".join(json.dumps(line) for line in
                              [row("a"), row("b", "a")]) + "\n",
                    encoding="utf-8")
    check("hilo leído del archivo", ["a", "b"],
          [line["uuid"] for line in main_chain_of(path)])
    check("una ruta inexistente da lista vacía, no excepción", [],
          main_chain_of(Path(tmp) / "missing.jsonl"))

print("== 11. una línea sin la bandera se lee como del hilo, no como desvío ==")
without_flag = [{"uuid": "a", "parentUuid": None},
                {"uuid": "b", "parentUuid": "a"}]
check("ausente significa «del hilo»", ["a", "b"],
      [line["uuid"] for line in main_chain(without_flag)])

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
