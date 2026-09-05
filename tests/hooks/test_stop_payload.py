"""Pruebas de ``hooks.stop_payload`` — el payload del hook ``Stop``.

Un solo primitivo, y existe porque el bash NO podía tenerlo: sin parser a mano,
los tres gates de ``Stop`` de kaupamex leen la reentrada con

    printf '%s' "$ENTRADA" | grep -q '"stop_hook_active"...true'

bajo ``set -uo pipefail``. Ese constructo **invierte el veredicto** cuando el
payload es multilínea y el acierto cae temprano: ``-q`` cierra el pipe al
primer acierto, ``printf`` muere con SIGPIPE, y ``pipefail`` propaga el 141
como salida del pipe. El ``if`` da FALSO *porque* encontró lo que buscaba.

Medido antes de portar, con un payload real de 2.1 MB y el acierto en la
línea 2: ``PIPESTATUS=141 0``, y ``stop-gate-evidencia-varada.sh`` **bloqueó
siendo una reentrada** (:ref:`h-docs-1083`).

Leer el JSON elimina la trampa por construcción — no hay pipe. Por eso el
caso 4 no es decorativo: es el episodio real convertido en control.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import stop_payload as sp  # noqa: E402

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


print("== 1. la reentrada se lee del JSON, no por subcadena ==")
check("true declarado", True, sp.is_reentry('{"stop_hook_active": true}'))
check("false declarado", False, sp.is_reentry('{"stop_hook_active": false}'))
check("clave ausente", False, sp.is_reentry('{"otra": 1}'))
check("objeto vacío", False, sp.is_reentry("{}"))

print("== 2. el espaciado no cambia el veredicto ==")
for variante in ('{"stop_hook_active":true}',
                 '{"stop_hook_active"  :   true}',
                 '{\n "stop_hook_active": true\n}'):
    check(f"espaciado {variante[:28]!r}", True, sp.is_reentry(variante))

print("== 3. un payload roto NO se lee como reentrada ==")
# Rehusar aquí sería peor que el default: el gate dejaría de correr por un
# payload malformado. La conducta correcta es medir, y sin dato medir es "no".
check("no es JSON", False, sp.is_reentry("no soy json"))
check("cadena vacía", False, sp.is_reentry(""))
check("None", False, sp.is_reentry(None))
check("JSON que no es objeto", False, sp.is_reentry("[1, 2, 3]"))

print("== 4. DISCRIMINA: la clave ANIDADA no es la reentrada del turno ==")
# El `grep` del bash acierta aquí — medido: `grep -c` devuelve 1 sobre este
# mismo texto— porque mide el significante, la subcadena, y concluye sobre el
# significado, el campo de PRIMER nivel. El parser mide el campo.
#
# Un valor de cadena que cite la clave NO sirve de control: `json.dumps` escapa
# sus comillas (`active\\"`) y el patrón del bash deja de acertar. Se midió
# antes de escribirlo; la primera versión de este caso lo daba por hecho y era
# falsa.
anidado = json.dumps({"padre": {"stop_hook_active": True}})
check("la clave vive un nivel abajo", False, sp.is_reentry(anidado))
check("y el patrón del bash sí acierta ahí", True,
      bool(re.search(r'"stop_hook_active"[ ]*:[ ]*true', anidado)))

print("== 5. DISCRIMINA: el payload GRANDE y multilínea da el mismo veredicto ==")
# El control del episodio. Con el pipe del bash este caso invierte; aquí no
# puede, porque no hay pipe que cerrar.
grande = json.dumps({"stop_hook_active": True, "relleno": ["x" * 100] * 20000},
                    indent=1)
check("supera los 2 MB", True, len(grande) > 2_000_000)
check("y sigue siendo reentrada", True, sp.is_reentry(grande))

print("== 6. read_payload: stdin ilegible NO rompe el turno ==")
check("None se lee como objeto vacío", {}, sp.parse(None))
check("basura se lee como objeto vacío", {}, sp.parse("no soy json"))
check("un objeto se devuelve entero", {"a": 1}, sp.parse('{"a": 1}'))
check("un no-objeto se descarta", {}, sp.parse("[1,2]"))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
