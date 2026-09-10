"""Pruebas de ``hooks.pretooluse_dispatch`` — un proceso para N detectores.

Porta `kaupamex-docs: .claude/hooks/despachar_pretooluse.py` (140 líneas). El
mecanismo viaja: presupuesto compartido, cuota por detector, recorte que se
declara, aislamiento de la excepción y cortocircuito por vacío. Lo que se
inyecta es **la lista de detectores**, que era literal en la fuente.

Y corrige el defecto que :ref:`h-docs-1080` nombró en la fuente: su registro
tolerante hacía que cero detectores cargados devolvieran un JSON válido y un
exit 0. Un hook que sale verde sin medir nada es el sub-patrón D. Aquí las dos
situaciones se separan — un detector roto se sigue aislando; cero cargados
rehúsa.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import pretooluse_dispatch as dispatch  # noqa: E402

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


def says(name: str, text: str):
    return (name, lambda payload: text)


def context(result) -> str:
    return result.get("hookSpecificOutput", {}).get("additionalContext", "")


print("== 1. ninguno aporta: {} y ni una línea de formato ==")
quiet = [says("a", ""), says("b", "   ")]
check("devuelve {}", {}, dispatch.dispatch({}, detectors=quiet))

print("== 2. la salida atribuye por detector, porque el cliente no lo hace ==")
two = [says("submodulo", "aviso uno"), says("vocabulario", "aviso dos")]
out = context(dispatch.dispatch({}, detectors=two))
check("etiqueta el primero", True, "[submodulo]" in out)
check("etiqueta el segundo", True, "[vocabulario]" in out)
check("conserva el texto de ambos", True, "aviso uno" in out and "aviso dos" in out)
check("el evento va en hookEventName", "PreToolUse",
      dispatch.dispatch({}, detectors=two)["hookSpecificOutput"]["hookEventName"])

print("== 3. un detector mudo no gasta ni separador (cortocircuito) ==")
mixed = [says("habla", "algo"), says("calla", "")]
out = context(dispatch.dispatch({}, detectors=mixed))
check("no aparece la etiqueta del mudo", False, "[calla]" in out)
check("y no queda separador colgando", False, out.endswith("\n\n"))

print("== 4. un detector roto se AÍSLA: no tumba a sus compañeros ==")
def explodes(payload):
    raise RuntimeError("revienta")
survivors = [("roto", explodes), says("sano", "sigo aquí")]
out = context(dispatch.dispatch({}, detectors=survivors))
check("el sano publica igual", True, "sigo aquí" in out)
check("y la excepción no viaja al contexto", False, "revienta" in out)

print("== 5. la ventana es COMPARTIDA y el recorte se declara ==")
# El tope del cliente es por hook y ANTES de concatenar; consolidados lo
# comparten. Un recorte mudo no dejaría distinguir «dijo esto» de «dijo más».
long_text = "x" * dispatch.TOTAL_BUDGET
crowded = [says("uno", long_text), says("dos", long_text)]
out = context(dispatch.dispatch({}, detectors=crowded))
check("la salida cabe en el presupuesto", True, len(out) <= dispatch.TOTAL_BUDGET)
check("y dice cuánto dejó fuera", True, "recortado" in out)
check("los dos siguen presentes — ninguno enmudece al otro", True,
      "[uno]" in out and "[dos]" in out)

print("== 6. CONTROL que discrimina: cero detectores REHÚSA, no devuelve {} ==")
# Es el defecto de la fuente (H-DOCS-1080): su registro tolerante dejaba
# `DETECTORES = []`, y `{}` + exit 0 se lee igual que «no había nada que
# avisar». Un verde que no distingue «no hay hallazgo» de «no pude medir» es
# el sub-patrón D.
try:
    dispatch.dispatch({}, detectors=[])
    check("rehúsa con lista vacía", "EmptyRegistryError", "devolvió sin lanzar")
except dispatch.EmptyRegistryError as err:
    check("rehúsa con lista vacía", "EmptyRegistryError", type(err).__name__)
    check("y el mensaje dice que NO es lo mismo que no tener hallazgos", True,
          "no pude medir" in str(err) or "no se cargó" in str(err))

print("== 7. carga parcial: sigue con los que hay, pero LO DICE ==")
# Distinto del caso 6: aquí sí hay con qué medir. Se conserva el aislamiento de
# la fuente y se añade lo que le faltaba — que la merma sea visible.
registry, missing = dispatch.build_registry(
    Path("/no/existe"), names=("ausente_uno", "ausente_dos"))
check("ninguno cargó", 0, len(registry))
check("y los nombra a los dos", 2, len(missing))

print("== 8. el CLI nunca rompe el flujo: entrada basura -> {} y exit 0 ==")
code = dispatch.main(stdin_text="{{{ no es json", detectors=two)
check("sale 0", 0, code)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
