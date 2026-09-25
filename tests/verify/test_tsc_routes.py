#!/usr/bin/env python3
"""Control de `src/verify/tsc_routes.py`: las tres rutas del plan v3.

Qué haría fallar a este control:
- leer las líneas de continuación de tsc como diagnósticos propios;
- mandar a la ruta 2 un error de código determinista (la ruta 1 manda);
- no ver el tipo citado dentro de un genérico (`Promise<X>`);
- tomar el nombre de una PROPIEDAD entre comillas por un tipo citado;
- ordenar la cola por nombre y no por frecuencia;
- contar como duplicado un tipo que sólo se repite en `__tests__`,
  `node_modules` o `dist`;
- no ver una copia LOCAL (sin `export`) de un tipo exportado en otro archivo:
  paso 113, dos `type CanUseToolFn = (...args: unknown[]) => …` en `agent`
  causaban 6 errores y el clasificador no los contaba;
- contar un nombre local que nadie exporta (`Props`, `State`): llenaría la cola;
- tomar como citado un tipo que sólo aparece DENTRO de un literal de objeto
  impreso: paso 114, ocho errores de `ToolPermissionContext` se atribuyeron a
  `AdditionalWorkingDirectory` porque tsc imprimía la estructura entera.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from verify import tsc_routes as tr

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


print("test_tsc_routes:")
LOG = """\
src/a.ts(3,5): error TS2322: Type '() => void' is not assignable to type 'Promise<CommandModule>'.
  Types of property 'call' are incompatible.
    Type 'X' is not assignable to type 'CommandModule'.
src/b.ts(1,1): error TS7016: Could not find a declaration file for module 'qrcode'.
src/c.ts(9,2): error TS2339: Property 'HostBindings' does not exist on type 'LocalOnly'.
src/d.ts(4,4): error TS2345: Argument of type 'string' is not assignable to parameter of type 'HostBindings'.
src/e.ts(2,2): error TS2322: Type 'number' is not assignable to type 'HostBindings'.
src/f.ts(5,5): error TS2305: Module '"./x"' has no exported member 'CommandModule'.
src/g.ts(7,1): error TS7006: Parameter 'bindings' implicitly has type 'HostBindings'.
"""
# g.ts está construido a mano: un código determinista cuyo mensaje SÍ cita un
# tipo duplicado. Sin él, la prioridad de la ruta 1 no se ejerce — medido: con
# el orden invertido las diez aserciones seguían en verde.
diags = tr.parse_diagnostics(LOG)
assert_equal("las continuaciones no son diagnósticos", 7, len(diags))
assert_equal("archivo y código del primero", ("src/a.ts", "TS2322"), (diags[0].file, diags[0].code))

assert_equal("el tipo citado dentro de un genérico se ve", {"Promise", "CommandModule"},
             tr.cited_types(diags[0].message))
assert_equal("el nombre de una propiedad entre comillas no es un tipo citado", {"LocalOnly"},
             tr.cited_types(diags[2].message))

structural = ("Type '{ mode: PermissionMode; dirs: Map<string, WorkDir> }' is not assignable to type "
              "'ToolContext'.")
assert_equal("los nombres dentro de un literal de objeto no se citan", {"ToolContext"},
             tr.cited_types(structural))
assert_equal("los de una unión y un arreglo, sí", {"Alpha", "Beta"},
             tr.cited_types("Type 'Alpha[] | Beta' is not assignable to type 'string'."))
assert_equal("ni los de un tipo función", {"Result"},
             tr.cited_types("Type '(input: WorkDir) => Result' is not assignable to type 'string'."))

duplicates = {"CommandModule": ["p/a.ts", "q/a.ts"], "HostBindings": ["p/h.ts", "q/h.ts"]}
routes = tr.classify(diags, duplicates)
assert_equal("ruta 1: códigos deterministas, aunque citen un tipo duplicado",
             ["src/b.ts", "src/f.ts", "src/g.ts"], [d.file for d in routes["deterministic"]])
assert_equal("ruta 2: los que citan un tipo duplicado", ["src/a.ts", "src/d.ts", "src/e.ts"],
             [d.file for d in routes["shared"]])
assert_equal("ruta 3: el resto", ["src/c.ts"], [d.file for d in routes["local"]])

queue = tr.shared_queue(routes["shared"], duplicates)
assert_equal("la cola va por frecuencia, no por nombre", ["HostBindings", "CommandModule"],
             [entry["type"] for entry in queue])
assert_equal("cada entrada nombra sus definiciones y sus consumidores",
             {"type": "HostBindings", "errors": 2, "definitions": ["p/h.ts", "q/h.ts"],
              "consumers": ["src/d.ts", "src/e.ts"]}, queue[0])

with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    for rel, text in {
        "pkg-a/src/types.ts": "export type Shared = { a: 1 }\nexport interface Only = {}\n",
        "pkg-b/src/types.ts": "export interface Shared { b: 2 }\n",
        "pkg-a/src/__tests__/t.ts": "export type Only = 1\n",
        "pkg-a/node_modules/x/i.ts": "export type Only = 2\n",
        "pkg-b/dist/types.d.ts": "export type Only = 3\n",
    }.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    found = tr.duplicated_types(root)
    assert_equal("un nombre exportado desde dos archivos es duplicado",
                 {"Shared": ["pkg-a/src/types.ts", "pkg-b/src/types.ts"]}, found)

with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    for rel, text in {
        "repl/hooks.ts": "export type CanUse = (a: string) => boolean\n",
        "agent/query.ts": "type CanUse = (...args: unknown[]) => boolean\nfunction f() {}\n",
        "agent/engine.ts": "type CanUse = (...args: unknown[]) => boolean\n",
        "ui/a.tsx": "type Props = { a: 1 }\n",
        "ui/b.tsx": "type Props = { b: 2 }\n",
    }.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    found = tr.duplicated_types(root)
    assert_equal("una copia local de un tipo exportado cuenta como duplicado",
                 ["agent/engine.ts", "agent/query.ts", "repl/hooks.ts"], found.get("CanUse"))
    assert_equal("un nombre local que nadie exporta no cuenta", None, found.get("Props"))

print(f"test_tsc_routes: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
