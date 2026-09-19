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

import subprocess
import sys
from pathlib import Path

# Bootstrap canonico (`paths.reach.BOOTSTRAP`): ascenso con deteccion hasta el
# marcador, NO `parents[N]`. Un offset acierta a UNA profundidad y falla en
# silencio al mover el archivo; el ascenso sobrevive el cambio de anidamiento.
_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))

from paths import reach  # noqa: E402
from verify import check_absence_claim as gate  # noqa: E402

#: A partir de aqui la raiz sale del localizador declarado, no del bootstrap.
ROOT = reach.thyrox_root()

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

variants = [
    "/** `getAgentHostBindings()`, inexistente en este árbol. */",
    "// `foo()` no existe en este árbol",
    " * Porte PARCIAL de `ccnmt: packages/agent/internal/x.ts`.",
    " * PORTE PARCIAL declarado: falta `bar`.",
    "// `baz` cuya base no existe en este árbol",
]
for text in variants:
    found = gate.find_absence_claims(text)
    check(f"detecta: {text.strip()[:44]}", 1, len(found))

print("\n=== 1-bis. Y las clasifica en las DOS familias ===")
classes = [gate.find_absence_claims(t)[0].kind for t in variants]
check(
    "ausencia / ausencia / alcance / alcance / ausencia",
    [gate.ClaimKind.ABSENCE, gate.ClaimKind.ABSENCE,
     gate.ClaimKind.PARTIAL_PORT, gate.ClaimKind.PARTIAL_PORT,
     gate.ClaimKind.ABSENCE],
    classes,
)
scope = gate.find_absence_claims(
    " * PORTE PARCIAL declarado: solo se porta `computeStandaloneAgentContext`.")[0]
check(
    "una declaracion de alcance NO se resuelve aqui",
    gate.ClaimVerdict.OUT_OF_SCOPE,
    gate.verdict(scope, {"computeStandaloneAgentContext"}),
)

print("\n=== 2. El simbolo sale del entrecomillado invertido ===")

claim = gate.find_absence_claims(
    "/** depende de `getAgentHostBindings()`, inexistente en este árbol. */")[0]
check("extrae getAgentHostBindings", ["getAgentHostBindings"], claim.symbols)

multiple = gate.find_absence_claims(
    "// `alpha` y `beta` no existen en este árbol")[0]
check("extrae los dos simbolos", ["alpha", "beta"], multiple.symbols)

print("\n=== 3. Presente en el arbol -> la afirmacion es FALSE ===")

tree = {"getAgentHostBindings", "readCronTasks"}
check(
    "simbolo presente -> FALSE",
    gate.ClaimVerdict.FALSE,
    gate.verdict(claim, tree),
)

print("\n=== 4. Ausente -> UPHELD; sin simbolo -> UNDECIDABLE ===")

check(
    "simbolo ausente -> UPHELD",
    gate.ClaimVerdict.UPHELD,
    gate.verdict(claim, {"otraCosa"}),
)

without_symbol = gate.find_absence_claims(
    "// el mecanismo no existe en este árbol todavía")[0]
check("sin simbolo -> UNDECIDABLE", [], without_symbol.symbols)
check(
    "sin simbolo -> veredicto UNDECIDABLE",
    gate.ClaimVerdict.UNDECIDABLE,
    gate.verdict(without_symbol, tree),
)

print("\n=== 5. Control positivo REAL: la cabecera pre-porte de cronTasksCore ===")

header = subprocess.run(
    ["git", "show", "48726ae2~1:src/packages/agent/internal/cronTasksCore.ts"],
    cwd=ROOT, capture_output=True, text=True, timeout=30,
).stdout
check("la cabecera real se pudo leer de git", True, len(header) > 200)

real = gate.find_absence_claims(header)
check("la cabecera real dispara al menos una afirmacion", True, len(real) >= 1)

present = gate.exported_symbols(ROOT / "src")
false = [c for c in real if gate.verdict(c, present) is gate.ClaimVerdict.FALSE]
check("y al menos una sale FALSE contra el arbol de hoy", True, len(false) >= 1)

print("\n=== 6. Control de discriminacion: otra cosa no dispara ===")

not_fires = [
    "// devuelve la lista de arboles que el censo recorre",
    "// TODO: revisar el porte parcial de la semana pasada en otro repo",
    "/** Este modulo existe en este árbol y en la fuente. */",
]
for text in not_fires:
    check(f"no dispara: {text.strip()[:44]}", 0, len(gate.find_absence_claims(text)))

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
