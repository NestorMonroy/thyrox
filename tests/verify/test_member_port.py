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
# El mismo nombre desde dos módulos (h-thyrox-185, paso 135: `logError` de
# `./internal/logging.js` y de `@thyrox/local-observability/log.js`) es TS2300;
# gana el primero, que es el import que el archivo ya tenía.
twice = mp.merge_imports("import { logError, a } from './internal/logging.js'\n"
                         "import { logError } from '@thyrox/local-observability/log.js'\n"
                         "import type { Message } from './messageShapes.js'\n"
                         "import type { Message } from './messageShapes.ts'\nconst z = 1")
assert_equal("un nombre importado desde dos módulos queda sólo en el primero",
             ["import { logError, a } from './internal/logging.js'",
              "import type { Message } from './messageShapes.js'"],
             [l for l in twice.splitlines() if l.startswith("import")])
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

final, final_report = mp.assemble(BASE, "t.ts", ["f", "g", "h"], {"f": outputs[0], "g": outputs[1]})
assert_equal("assemble deja el archivo sin anclas, con lo aplicado y los imports fusionados",
             (False, True, True, ["f"]),
             ("@port-" in final, "export const g = 2" in final, "import { a, x } from './a.js'" in final,
              final_report["applied"]))
assert_equal("y nombra los ítems sin propuesta", ["h"], final_report["missing"])

# Qué número original lleva cada salida de cada ola (paso 135, ola 3: pasada
# sola con su mapa, se leyó como si numerara todos los ítems desde 1).
assert_equal("la primera ola sin mapa numera todos los ítems; las siguientes, su mapa",
             [[1, 2, 3], [2, 3]], mp.wave_numbers(2, [[2, 3]], 3))
try:
    aligned = mp.wave_numbers(2, [[2], [1, 3]], 3)
except ValueError as error:
    aligned = str(error)
assert_equal("con un mapa por ola, cada ola usa el suyo, también la primera", [[2], [1, 3]], aligned)
try:
    mp.wave_numbers(3, [[1]], 3)
    mismatched = False
except ValueError:
    mismatched = True
assert_equal("un número de mapas que no cuadra con las olas se rehúsa", True, mismatched)

# Un ancla que es prefijo de otra (paso 135: `getNestedMemoryAttachments` y
# `getNestedMemoryAttachmentsForFile`) se reconoce por línea entera, no por
# subcadena.
prefixed = mp.insert_anchors("import { a } from './a.js'\n", ["getNested", "getNestedForFile"])
text, report = mp.apply_outputs(prefixed, "t.ts", {"getNested": {"edits": [
    {"file": "t.ts", "old_string": "// @port-slot: getNested", "new_string": "export const getNested = 1"}]}})
assert_equal("un ancla prefijo de otra se aplica sólo sobre su línea",
             (["getNested"], True, True),
             (report["applied"], "export const getNested = 1" in text, "// @port-slot: getNestedForFile" in text))

# --- plan: el reparto en ítems, que vivía como guion de banco --------------
# (attachments-port-plan-*/probes/build_items.py). Un ayudante pequeño con un
# solo llamador ausente viaja con él; las declaraciones van en un ítem aparte;
# lo que el destino ya tiene no se porta.
declarations = [
    {"name": "Kind", "kind": "declaration", "start": 1, "end": 3, "references": []},
    {"name": "present", "kind": "function", "start": 4, "end": 8, "references": []},
    {"name": "big", "kind": "function", "start": 10, "end": 60, "references": ["helper", "present", "Kind"]},
    {"name": "helper", "kind": "function", "start": 61, "end": 66, "references": ["leaf"]},
    {"name": "leaf", "kind": "function", "start": 67, "end": 70, "references": []},
    {"name": "shared", "kind": "function", "start": 71, "end": 75, "references": []},
    {"name": "a", "kind": "function", "start": 76, "end": 80, "references": ["shared"]},
    {"name": "b", "kind": "function", "start": 81, "end": 85, "references": ["shared"]},
]
plan = mp.plan(declarations, {"present"})
assert_equal("un ayudante pequeño de un solo llamador sube hasta su dueño no absorbido",
             ["big", "helper", "leaf"], plan.get("big"))
assert_equal("un ayudante con dos llamadores es su propio ítem", ["shared"], plan.get("shared"))
assert_equal("lo que el destino ya tiene no se porta", False,
             any("present" in members for members in plan.values()))
assert_equal("las declaraciones ausentes van en su propio ítem", ["Kind"], plan.get("__declarations__:types"))
big_helper = [dict(d, end=d["start"] + 40) if d["name"] == "helper" else d for d in declarations]
assert_equal("un ayudante grande no se absorbe", ["helper", "leaf"], mp.plan(big_helper, {"present"}).get("helper"))

# El CLI `plan`: extractor de TypeScript (bun) + reparto + ítems en el formato
# que la plantilla `module-member-port.md` espera.
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    (base / "source.ts").write_text(
        "/** Documented. */\nexport type Kind = 'a' | 'b'\n\n"
        "export function big(k: Kind): number {\n  return helper(k) + kept()\n}\n\n"
        "const helper = (k: Kind): number => (k === 'a' ? 1 : 0)\n\n"
        "export function kept(): number {\n  return 1\n}\n")
    (base / "target.ts").write_text("export function kept(): number {\n  return 1\n}\n")
    code = mp.main(["plan", "--source", str(base / "source.ts"), "--target", str(base / "target.ts"),
                    "--bench", str(base / "step")])
    lines = (base / "step/items.txt").read_text().splitlines()
    assert_equal("plan escribe un ítem por grupo, en el formato de módulo",
                 (0, 2, True), (code, len(lines), all(l.startswith("module:") for l in lines)))
    texts = [Path(l.split()[1]).read_text() for l in lines]
    big = next(t for t in texts if "Ítem: big" in t)
    assert_equal("el ítem nombra ancla, rangos con JSDoc y los otros miembros que usa",
                 (True, True, True, True),
                 ("// @port-slot: big" in big, "- helper: 8-8" in big, "- big: 4-6" in big, "kept" in big))
    declared = next(t for t in texts if "__declarations__" in t)
    assert_equal("las declaraciones se listan con su rango, JSDoc incluido", True, "- Kind: 1-2" in declared)

# Un ítem partido deja el nombre dos veces en items.txt (paso 135: el 12 y su
# sucesor 52 se llaman `getAttachments`); su ancla se inserta una sola vez.
twice_anchor = mp.insert_anchors("import { a } from './a.js'\n", ["f", "g", "f"])
assert_equal("un nombre repetido lleva una sola ancla de cada clase", (1, 1),
             (twice_anchor.count("// @port-slot: f\n"), twice_anchor.count("// @port-imports: f\n")))

print(f"test_member_port: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
