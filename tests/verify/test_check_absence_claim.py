#!/usr/bin/env python3
"""Suite de ``verify/check_absence_claim.py`` — el comentario que afirma una ausencia.

El eje NO es el idioma del comentario: es su **verdad**. Un comentario
heredado de la fuente puede estar traducido al español y seguir siendo falso,
y traducirlo preserva la mentira. Es significante contra significado.

El episodio que la origina es :ref:`h-thyrox-93`: la cabecera de
``cronTasksCore.ts`` declaraba que ``getAgentHostBindings()`` era «inexistente
en este árbol» **cuatro minutos después** de que el símbolo aterrizara. Ocho
funciones se recortaron citando esa ausencia.

Lo que la suite mide:

1. La detección ve las variantes de redacción y de caja que el corpus real
   usa — el sondeo que fallo en h-thyrox-93 buscaba «no existe en este árbol»
   cuando la cabecera decía «inexistente en este árbol».
2. El símbolo se extrae del entrecomillado invertido de la propia afirmación.
3. El veredicto resuelve el símbolo contra el árbol: presente -> la
   afirmación es FALSE.
3-bis. «PORTE PARCIAL» NO es una afirmación de ausencia sino una declaración
   de ALCANCE, y este gate no la decide. Lo destapó la propia medición al
   estrenarlo: `sessionRestore.ts:6` dice «sólo se porta
   `computeStandaloneAgentContext`», y ése es el símbolo que SÍ está.
4. Ausente -> UPHELD. Sin símbolo extraíble -> UNDECIDABLE, que es rehusar en
   vez de adivinar.
5. Control positivo REAL del repo: la cabecera pre-porte de
   ``cronTasksCore.ts``, leída de git, tiene que salir FALSE.
6. Control de discriminación: una mención de las mismas palabras en otro
   sentido no dispara.
"""

import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "src"))

from verify import check_absence_claim as gate  # noqa: E402

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


print("=== 1. La deteccion ve las variantes de redaccion y de caja ===")

variantes = [
    "/** `getAgentHostBindings()`, inexistente en este árbol. */",
    "// `foo()` no existe en este árbol",
    " * Porte PARCIAL de `ccnmt: packages/agent/internal/x.ts`.",
    " * PORTE PARCIAL declarado: falta `bar`.",
    "// `baz` cuya base no existe en este árbol",
]
for texto in variantes:
    encontradas = gate.find_absence_claims(texto)
    check(f"detecta: {texto.strip()[:44]}", 1, len(encontradas))

print("\n=== 1-bis. Y las clasifica en las DOS familias ===")
clases = [gate.find_absence_claims(t)[0].kind for t in variantes]
check(
    "ausencia / ausencia / alcance / alcance / ausencia",
    [gate.ClaimKind.ABSENCE, gate.ClaimKind.ABSENCE,
     gate.ClaimKind.PARTIAL_PORT, gate.ClaimKind.PARTIAL_PORT,
     gate.ClaimKind.ABSENCE],
    clases,
)
alcance = gate.find_absence_claims(
    " * PORTE PARCIAL declarado: solo se porta `computeStandaloneAgentContext`.")[0]
check(
    "una declaracion de alcance NO se resuelve aqui",
    gate.ClaimVerdict.OUT_OF_SCOPE,
    gate.verdict(alcance, {"computeStandaloneAgentContext"}),
)

print("\n=== 2. El simbolo sale del entrecomillado invertido ===")

claim = gate.find_absence_claims(
    "/** depende de `getAgentHostBindings()`, inexistente en este árbol. */")[0]
check("extrae getAgentHostBindings", ["getAgentHostBindings"], claim.symbols)

multiple = gate.find_absence_claims(
    "// `alpha` y `beta` no existen en este árbol")[0]
check("extrae los dos simbolos", ["alpha", "beta"], multiple.symbols)

print("\n=== 3. Presente en el arbol -> la afirmacion es FALSE ===")

arbol = {"getAgentHostBindings", "readCronTasks"}
check(
    "simbolo presente -> FALSE",
    gate.ClaimVerdict.FALSE,
    gate.verdict(claim, arbol),
)

print("\n=== 4. Ausente -> UPHELD; sin simbolo -> UNDECIDABLE ===")

check(
    "simbolo ausente -> UPHELD",
    gate.ClaimVerdict.UPHELD,
    gate.verdict(claim, {"otraCosa"}),
)

sin_simbolo = gate.find_absence_claims(
    "// el mecanismo no existe en este árbol todavía")[0]
check("sin simbolo -> UNDECIDABLE", [], sin_simbolo.symbols)
check(
    "sin simbolo -> veredicto UNDECIDABLE",
    gate.ClaimVerdict.UNDECIDABLE,
    gate.verdict(sin_simbolo, arbol),
)

print("\n=== 5. Control positivo REAL: la cabecera pre-porte de cronTasksCore ===")

cabecera = subprocess.run(
    ["git", "show", "48726ae2~1:src/packages/agent/internal/cronTasksCore.ts"],
    cwd=RAIZ, capture_output=True, text=True, timeout=30,
).stdout
check("la cabecera real se pudo leer de git", True, len(cabecera) > 200)

reales = gate.find_absence_claims(cabecera)
check("la cabecera real dispara al menos una afirmacion", True, len(reales) >= 1)

presentes = gate.exported_symbols(RAIZ / "src")
falsas = [c for c in reales if gate.verdict(c, presentes) is gate.ClaimVerdict.FALSE]
check("y al menos una sale FALSE contra el arbol de hoy", True, len(falsas) >= 1)

print("\n=== 6. Control de discriminacion: otra cosa no dispara ===")

no_dispara = [
    "// devuelve la lista de arboles que el censo recorre",
    "// TODO: revisar el porte parcial de la semana pasada en otro repo",
    "/** Este modulo existe en este árbol y en la fuente. */",
]
for texto in no_dispara:
    check(f"no dispara: {texto.strip()[:44]}", 0, len(gate.find_absence_claims(texto)))

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
