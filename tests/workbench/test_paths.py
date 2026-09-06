"""Pruebas de ``workbench.paths`` — el predicado que separa banco de producto.

Existe por una colision de nombre que no es cosmetica. El banco de THYROX se
llama ``workbench`` (decidido en ``docs: analisis-hogar-del-workbench-en-thyrox``,
que midio la forma de ``kaupamex-api/scripts/workbench/`` contra
``kaupamex-docs/.claude/eventos/``), y ``src/workbench/`` —producto— lleva el
mismo nombre.

Tres gates excluian el banco por el NOMBRE suelto de un segmento
(``'eventos' in path.parts``). Traducir eso a ``'workbench'`` habria apagado los
tres sobre ``src/workbench/`` sin que nada lo delatara: el gate seguiria
publicando su conteo, medido sobre un arbol con un agujero. Es el sub-patron D
de ``metrica-decide-la-conclusion.md`` — un verde que no distingue «no hay
defectos» de «el instrumento no mira ahi».

El control DISCRIMINA en los dos sentidos: el mismo defecto plantado bajo el
banco tiene que quedar fuera, y bajo ``src/workbench/`` tiene que quedar dentro.
Un control que solo probara la primera mitad pasaria igual con el predicado por
nombre suelto, que es justo el que se rechaza.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from workbench import paths  # noqa: E402

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


print("== 1. el banco de THYROX queda fuera ==")
check("una pieza del banco propio", True,
      paths.is_bank_path(".claude/workbench/medir-algo-20260906T000000/gen.py"))
check("el directorio del banco a secas", True,
      paths.is_bank_path(".claude/workbench"))

print("== 2. el banco de un CONSUMIDOR conserva su nombre y tambien queda fuera ==")
# `eventos` no viaja: es como se llama el banco de kaupamex-docs, y su corpus
# se queda ahi (directiva del ejecutor sobre los 54 manifiestos en espanol).
check("una pieza del banco del consumidor", True,
      paths.is_bank_path("kaupamex-docs/.claude/eventos/censo-20260901T000000/gen.py"))

print("== 3. CONTROL que discrimina: `src/workbench/` es PRODUCTO, no banco ==")
# Sin este caso, un predicado por nombre suelto —`'workbench' in parts`— pasaria
# el bloque 1 igual y apagaria los gates sobre producto real.
check("el modulo de producto NO es banco", False,
      paths.is_bank_path("src/workbench/paths.py"))
check("ni su directorio", False, paths.is_bank_path("src/workbench"))
check("ni su suite", False, paths.is_bank_path("tests/workbench/test_paths.py"))

print("== 4. el par se mide adyacente, no como dos segmentos sueltos ==")
check("`.claude` y `workbench` separados NO son banco", False,
      paths.is_bank_path(".claude/skills/thyrox/workbench/nota.md"))

print("== 5. la ruta absoluta se mide igual que la relativa ==")
check("absoluta bajo el banco", True,
      paths.is_bank_path("/home/user/thyrox/.claude/workbench/x-20260906T000000/gen.py"))
check("absoluta bajo producto", False,
      paths.is_bank_path("/home/user/thyrox/src/workbench/manifest.ts"))

print("== 6. los nombres de banco se DECLARAN, no se adivinan ==")
check("declara los dos nombres en uso", ("workbench", "eventos"),
      paths.BANK_DIR_NAMES)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
