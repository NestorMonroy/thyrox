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
        # Una copia reducida: dos campos del contrato de tres.
        "pkg-a/src/types.ts": "export type Shared = {\n  a: 1\n  b: 2\n}\nexport interface Only = {}\n",
        "pkg-b/src/types.ts": "export interface Shared {\n  a: 1\n  b: 2\n  c: 3\n}\n",
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

# Agrupar por forma, no sólo por nombre (TASK-THYROX-0253, h-thyrox-185): en
# el paso 134, 9 de 19 unidades eran tipos distintos con el mismo nombre. Las
# declaraciones de abajo son las del árbol, copiadas tal cual.
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    for rel, text in {
        "agent/messageShapes.ts": "export type RequestStartEvent = { type: 'stream_request_start' }\n",
        "agent/types/events.ts": ("export interface RequestStartEvent {\n  type: 'request_start'\n"
                                  "  turnId?: string\n  ts?: number\n  params: unknown\n}\n"),
        "agent/types/deps.ts": "export interface SystemPrompt {\n  content: unknown\n  cacheConfig?: unknown\n}\n",
        "agent/internalUtils.ts": "export type SystemPrompt = readonly string[] & {\n  readonly __brand: 'SystemPrompt'\n}\n",
        "provider/systemPromptType.ts": "export type SystemPrompt = readonly string[] & {\n  readonly __brand: 'SystemPrompt'\n}\n",
        "app-host/state/AppStateCompat.ts": "export type AppState = {\n  verbose: boolean\n}\n",
        "agent/hooks/sessionHooks.ts": "type AppState = import('@thyrox/app-host/state/AppState.js').AppState\n",
        "agent/inProcessTeammateHelpers.ts": "type AppState = import('@thyrox/app-host/state/AppState.js').AppState\n",
        "ink/Box.tsx": "export type Props = Except<Styles, 'textWrap'> & {\n  readonly tabIndex?: number\n}\n",
        "ink/AppContext.ts": "export type Props = {\n  readonly exit: (error?: Error) => void\n}\n",
    }.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    found = tr.duplicated_types(root)
    assert_equal("dos discriminantes distintos no son el mismo tipo", None, found.get("RequestStartEvent"))
    assert_equal("de tres SystemPrompt, sólo las dos de la misma forma son duplicado",
                 ["agent/internalUtils.ts", "provider/systemPromptType.ts"], found.get("SystemPrompt"))
    assert_equal("un alias a import(...) no es una copia", None, found.get("AppState"))
    assert_equal("dos Props de componentes distintos no son el mismo tipo", None, found.get("Props"))

# Los falsos negativos y el falso positivo que destapó medir contra el árbol
# (.claude/workbench/route2-shape-grouping-20260925T204815/compare_step134.tsv).
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    for rel, text in {
        "agent/types/hooks.ts": "export type HookJSONOutput = Record<string, unknown>\n",
        "headless-sdk/coreTypes.generated.ts":
            "export type HookJSONOutput = z.infer<ReturnType<typeof S.HookJSONOutputSchema>>\n",
        "permission/permissionRequestTypes.ts": (
            "export type ToolUseConfirm<Input extends AnyObject = AnyObject> = {\n"
            "  assistantMessage: AssistantMessage\n  tool: Tool<Input>\n  description: string\n}\n"),
        "swarm/appUi.ts": "export type ToolUseConfirm = unknown;\n",
        "repl/Dialog.tsx": "export type Props = {\n  children: React.ReactNode\n  onClose: () => void\n}\n",
        "repl/Panel.tsx": "export type Props = {\n  children: React.ReactNode\n  title: string\n}\n",
        "repl/Row.tsx": "type Props = {\n  children: React.ReactNode\n  index: number\n}\n",
    }.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    found = tr.duplicated_types(root)
    assert_equal("un marcador Record<string, unknown> es copia reducida del contrato",
                 ["agent/types/hooks.ts", "headless-sdk/coreTypes.generated.ts"], found.get("HookJSONOutput"))
    assert_equal("un marcador = unknown es copia reducida, y el = de un genérico no es el de la declaración",
                 ["permission/permissionRequestTypes.ts", "swarm/appUi.ts"], found.get("ToolUseConfirm"))
    assert_equal("un solo campo común (children) no encadena props distintas", None, found.get("Props"))

# Un nombre convencional (`Props`: 282 copias, 155 formas en el árbol) no es
# un contrato aunque dos de sus copias coincidan; el siguiente nombre con más
# formas tiene 8 (shape_group_counts.tsv del banco).
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    files = {f"ui/C{i}.tsx": f"export type Props = {{\n  f{i}a: 1\n  f{i}b: 2\n}}\n" for i in range(11)}
    files["ui/Twin.tsx"] = "export type Props = {\n  f0a: 1\n  f0b: 2\n}\n"
    files["ink/reconciler.ts"] = "type Props = Record<string, unknown>\n"
    for rel, text in files.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    assert_equal("un nombre con más de 10 formas distintas es convención, no contrato",
                 None, tr.duplicated_types(root).get("Props"))

# Casos que sólo decide una mitad: la anulación de cada una los tumba solos.
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    for rel, text in {
        "a/confirm.ts": "export type Confirm<I extends AnyObject = AnyObject> = {\n  tool: Tool<I>\n  input: I\n}\n",
        "b/confirm.ts": "export type Confirm<I extends AnyObject = AnyObject> = {\n  label: string\n  color: Color\n}\n",
        "a/event.ts": "export type Event = {\n  type: 'request_start'\n  id: string\n  ts: number\n}\n",
        "b/event.ts": "export type Event = {\n  type: 'request_end'\n  id: string\n  ts: number\n}\n",
    }.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    found = tr.duplicated_types(root)
    assert_equal("el = del valor por defecto de un genérico no hace iguales dos cuerpos distintos",
                 None, found.get("Confirm"))
    assert_equal("mismos campos con discriminante distinto no son el mismo tipo", None, found.get("Event"))

print(f"test_tsc_routes: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
