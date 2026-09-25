#!/usr/bin/env python3
"""Control de `src/verify/member_port.py`: el porte de un módulo grande por miembros.

Un módulo demasiado grande para un `claude -p` (`attachments.ts`, 3824 líneas:
el ítem único agotó 31 turnos en el paso 130) se reparte en ítems, uno por
miembro, que escriben el MISMO archivo a la vez. Cada ítem reemplaza sólo sus
dos anclas; esta pieza pone las anclas, aplica las salidas y deja el archivo
compilable: imports fusionados y anclas sin usar retiradas.

Qué haría fallar a este control:
- aplicar una edición que no reemplaza un ancla del propio ítem;
- dejar dos `import` del mismo nombre (TS2300) o un import que choca con una
  declaración local (TS2440);
- dejar anclas sin usar en el archivo;
- fusionar un `import type` con uno de valor.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from verify import member_port as mp

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


print("test_member_port:")
BASE = ("import { a } from './a.js'\n"
        "import {\n  b,\n  c,\n} from './bc.js'\n"
        "\n"
        "export const existing = 1\n")
anchored = mp.insert_anchors(BASE, ["f", "g"])
assert_equal("las anclas de imports van tras el último import, incluso multilínea",
             True, "} from './bc.js'\n// @port-imports: f\n// @port-imports: g\n" in anchored)
assert_equal("las de cuerpo van al final", True,
             anchored.rstrip().endswith("// @port-slot: f\n// @port-slot: g"))

outputs = [
    {"module": "m", "edits": [
        {"file": "t.ts", "old_string": "// @port-slot: f", "new_string": "export function f() { return a }"},
        {"file": "t.ts", "old_string": "// @port-imports: f", "new_string": "import { a, x } from './a.js'"}]},
    {"module": "m", "edits": [
        {"file": "t.ts", "old_string": "// @port-slot: g", "new_string": "export const g = 2"},
        {"file": "t.ts", "old_string": "// @port-imports: g",
         "new_string": "import type { T } from './a.js'\nimport { x, existing } from './a.js'"},
        {"file": "otro.ts", "old_string": "", "new_string": "no"},
        {"file": "t.ts", "old_string": "export const existing = 1", "new_string": "roto"}]},
]
text, report = mp.apply_outputs(anchored, "t.ts", {"f": outputs[0], "g": outputs[1]})
assert_equal("aplica las ediciones de ancla de cada ítem", True,
             "export function f() { return a }" in text and "export const g = 2" in text)
assert_equal("rechaza lo que no es un ancla propia, con su motivo",
             {"g": ["otro.ts: fuera del destino", "t.ts: no reemplaza un ancla del ítem"]},
             report["rejected"])
merged = mp.merge_imports(text)
import_lines = "\n".join(l for l in merged.splitlines() if l.startswith("import"))
assert_equal("un nombre importado dos veces del mismo módulo queda una vez", 1,
             len(__import__("re").findall(r"\bx\b", import_lines)))
assert_equal("los imports de valor del mismo módulo se fusionan en uno",
             True, "import { a, x } from './a.js'" in merged)
assert_equal("el import type no se mezcla con el de valor", True, "import type { T } from './a.js'" in merged)
assert_equal("un import que choca con una declaración local se retira", False,
             "existing } from" in merged or "existing, " in merged.split("export const existing")[0])
clean = mp.strip_anchors(mp.insert_anchors(BASE, ["h"]))
assert_equal("las anclas sin usar se retiran", (False, False),
             ("@port-slot" in clean, "@port-imports" in clean))

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    (base / "out").mkdir()
    (base / "out/1.json").write_text(json.dumps({"result": "```json\n" + json.dumps(outputs[0]) + "\n```"}))
    (base / "out/2.json").write_text(json.dumps({"subtype": "error_max_turns"}))
    names = mp.read_outputs(base / "out", ["f", "g"])
    assert_equal("lee la salida de cada ítem por su número; la que falló no cuenta",
                 (["f"], []), (list(names), [e for e in names.get("g", {}).get("edits", [])]))

print(f"test_member_port: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
