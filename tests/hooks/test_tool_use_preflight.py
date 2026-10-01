"""Pruebas de ``hooks.tool_use_preflight`` — un proceso para N detectores.

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

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import tool_use_preflight as preflight_hook  # noqa: E402

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
check("devuelve {}", {}, preflight_hook.preflight({}, detectors=quiet))

print("== 2. la salida atribuye por detector, porque el cliente no lo hace ==")
two = [says("submodulo", "aviso uno"), says("vocabulario", "aviso dos")]
out = context(preflight_hook.preflight({}, detectors=two))
check("etiqueta el primero", True, "[submodulo]" in out)
check("etiqueta el segundo", True, "[vocabulario]" in out)
check("conserva el texto de ambos", True, "aviso uno" in out and "aviso dos" in out)
check("el evento va en hookEventName", "PreToolUse",
      preflight_hook.preflight({}, detectors=two)["hookSpecificOutput"]["hookEventName"])

print("== 3. un detector mudo no gasta ni separador (cortocircuito) ==")
mixed = [says("habla", "algo"), says("calla", "")]
out = context(preflight_hook.preflight({}, detectors=mixed))
check("no aparece la etiqueta del mudo", False, "[calla]" in out)
check("y no queda separador colgando", False, out.endswith("\n\n"))

print("== 4. un detector roto se AÍSLA: no tumba a sus compañeros ==")
def explodes(payload):
    raise RuntimeError("revienta")
survivors = [("roto", explodes), says("sano", "sigo aquí")]
out = context(preflight_hook.preflight({}, detectors=survivors))
check("el sano publica igual", True, "sigo aquí" in out)
check("y la excepción no viaja al contexto", False, "revienta" in out)

print("== 5. la ventana es COMPARTIDA y el recorte se declara ==")
# El tope del cliente es por hook y ANTES de concatenar; consolidados lo
# comparten. Un recorte mudo no dejaría distinguir «dijo esto» de «dijo más».
long_text = "x" * preflight_hook.TOTAL_BUDGET
crowded = [says("uno", long_text), says("dos", long_text)]
out = context(preflight_hook.preflight({}, detectors=crowded))
check("la salida cabe en el presupuesto", True, len(out) <= preflight_hook.TOTAL_BUDGET)
check("y dice cuánto dejó fuera", True, "recortado" in out)
check("los dos siguen presentes — ninguno enmudece al otro", True,
      "[uno]" in out and "[dos]" in out)

print("== 6. CONTROL que discrimina: cero detectores REHÚSA, no devuelve {} ==")
# Es el defecto de la fuente (H-DOCS-1080): su registro tolerante dejaba
# `DETECTORES = []`, y `{}` + exit 0 se lee igual que «no había nada que
# avisar». Un verde que no distingue «no hay hallazgo» de «no pude medir» es
# el sub-patrón D.
try:
    preflight_hook.preflight({}, detectors=[])
    check("rehúsa con lista vacía", "EmptyRegistryError", "devolvió sin lanzar")
except preflight_hook.EmptyRegistryError as err:
    check("rehúsa con lista vacía", "EmptyRegistryError", type(err).__name__)
    check("y el mensaje dice que NO es lo mismo que no tener hallazgos", True,
          "no pude medir" in str(err) or "no se cargó" in str(err))

print("== 7. carga parcial: sigue con los que hay, pero LO DICE ==")
# Distinto del caso 6: aquí sí hay con qué medir. Se conserva el aislamiento de
# la fuente y se añade lo que le faltaba — que la merma sea visible.
registry, missing = preflight_hook.build_registry(
    Path("/no/existe"), names=("ausente_uno", "ausente_dos"))
check("ninguno cargó", 0, len(registry))
check("y los nombra a los dos", 2, len(missing))

print("== 8. el CLI nunca rompe el flujo: entrada basura -> {} y exit 0 ==")
code = preflight_hook.main(stdin_text="{{{ no es json", detectors=two)
check("sale 0", 0, code)

print("== 9. un detector puede PEDIR CONFIRMACION, no solo avisar ==")
# Lo abre `detect_irreversible_operation`: un aviso llega cuando el daño ya
# ocurrio. Su veredicto viaja como `permissionDecision`; los avisos de los
# demas no se pierden.
asks = ("pide", lambda payload: {"notice": "irreversible", "decision": "ask"})
# pyright no ve que `preflight()` acepta un detector que devuelva dict (rama
# `isinstance(notice, dict)` de la propia función): el alias `Detector` que
# declara está más angosto que su comportamiento real, y ese archivo no
# está en esta lista para corregirlo aquí.
out = preflight_hook.preflight({}, detectors=[asks, says("avisa", "aviso")])  # pyright: ignore[reportArgumentType]
hso = out.get("hookSpecificOutput", {})
check("emite la decision", "ask", hso.get("permissionDecision"))
check("con su razon", True, "irreversible" in hso.get("permissionDecisionReason", ""))
check("y conserva el aviso del otro", True, "aviso" in hso.get("additionalContext", ""))
out = preflight_hook.preflight({}, detectors=[says("avisa", "aviso")])
check("sin quien la pida, no hay decision", None,
      out["hookSpecificOutput"].get("permissionDecision"))
denies = ("niega", lambda payload: {"notice": "no", "decision": "deny"})
out = preflight_hook.preflight({}, detectors=[asks, denies])  # pyright: ignore[reportArgumentType] — mismo motivo que arriba
check("entre ask y deny gana la mas fuerte", "deny",
      out.get("hookSpecificOutput", {}).get("permissionDecision"))
check("el detector irreversible esta en la lista", True,
      "detect_irreversible_operation" in preflight_hook.DETECTOR_NAMES)
check("el de edicion en bucle tambien", True,
      "detect_edit_loop" in preflight_hook.DETECTOR_NAMES)
check("el de substr como destino de gsub tambien", True,
      "detect_awk_substr_target" in preflight_hook.DETECTOR_NAMES)
check("y el de los momentos de gensub e -i inplace", True,
      "detect_gawk_opportunity" in preflight_hook.DETECTOR_NAMES)
registry, missing = preflight_hook.build_registry(preflight_hook.DETECTOR_DIR, preflight_hook.DETECTOR_NAMES)
check("y carga sin faltantes", [], missing)
awk_out = preflight_hook.preflight(
    {"tool_name": "Bash", "tool_input": {"command": "gawk '{gsub(/a/,\"X\",substr($0,1,3))}' f"}},
    detectors=registry)
check("el despacho real devuelve su aviso", True,
      "AWK SUBSTR" in json.dumps(awk_out, ensure_ascii=False))

for name in ("detect_parallel_opportunity", "detect_git_grep_opportunity"):
    check(f"{name} esta en la lista", True, name in preflight_hook.DETECTOR_NAMES)
registry, missing = preflight_hook.build_registry(preflight_hook.DETECTOR_DIR, preflight_hook.DETECTOR_NAMES)
pickaxe_out = preflight_hook.preflight(
    {"tool_name": "Bash", "tool_input": {"command": "git log --all --oneline -S foo"}},
    detectors=registry)
check("el despacho real avisa del pickaxe", True,
      "GIT GREP" in json.dumps(pickaxe_out, ensure_ascii=False))

check("detect_history_comment esta en la lista", True, "detect_history_comment" in preflight_hook.DETECTOR_NAMES)
history_out = preflight_hook.preflight(
    {"tool_name": "Write", "tool_input": {"file_path": "a.ts", "content": "// Corregido 2026-09-27\n"}},
    detectors=registry)
check("el despacho real avisa del historial en un comentario", True,
      "HISTORIAL EN COMENTARIO" in json.dumps(history_out, ensure_ascii=False))
loop_out = preflight_hook.preflight(
    {"tool_name": "Bash",
     "tool_input": {"command": "git ls-files | while read f; do git log --follow -1 -- $f; done"}},
    detectors=registry)
check("el despacho real avisa del bucle en serie", True,
      "GNU PARALLEL" in json.dumps(loop_out, ensure_ascii=False))

check("detect_unguarded_removal esta en la lista", True, "detect_unguarded_removal" in preflight_hook.DETECTOR_NAMES)
removal_out = preflight_hook.preflight(
    {"tool_name": "Bash", "tool_input": {"command": "r" + "m -f $W/x.txt && ls"}},
    detectors=registry)
check("el despacho real avisa del borrado sin guarda", True,
      "BORRADO SIN GUARDA" in json.dumps(removal_out, ensure_ascii=False))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
