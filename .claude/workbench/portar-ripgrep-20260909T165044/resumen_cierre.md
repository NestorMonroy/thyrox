# Resumen de cierre — portar ripgrep.ts

## Cobertura: 6 de 6

Los seis símbolos de la fuente quedan portados con comportamiento real
(no stubs): `RipgrepTimeoutError`, `ripgrepCommand`, `getRipgrepStatus`,
`ripGrep`, `ripGrepStream`, `countFilesRoundedRg`.

## Divergencia declarada (mecanismo, no comportamiento)

`ripgrep-napi` está ausente de este árbol (medido: no en ningún
package.json, no en node_modules; ya lo medía
`.claude/workbench/frontera-tool-registry-simbolo/root_modules_report.txt`
como bloqueador). El puerto reimplementa los 6 símbolos contra el binario
`rg` del sistema (`/usr/bin/rg`, v14.1.0) vía `node:child_process.spawn`,
parseando `--json`. Detalle completo, con las tres mejoras declaradas y
las tres sondas medidas, en el docstring de cabecera de `ripgrep.ts`.

## Bugs propios descubiertos y corregidos DURANTE el porte (no estaban en
   el plan original, los destapó TDD)

1. **Anclaje de `--glob`**: un patrón con "/" en medio (`!nested/**`) se
   ancla al CWD del proceso `rg`, no a la ruta pasada como argumento
   posicional. Medido con sondas manuales fuera del módulo antes de
   corregir (`/tmp/rgdbg2-*`, `/tmp/rgdbg3-*`). Fix: `resolveSearchRoot()`
   traduce `target` a `{cwd, arg}` y las rutas de salida se absolutizan en
   post-proceso (`toAbsolute`).
2. **Sentinel de salto de contexto sin contexto activo**: la primera
   versión insertaba `--` entre CUALQUIER dos match/context con
   discontinuidad de `line_number`, incluso sin `-A/-B` pedido (dos
   matches en líneas 1 y 3 sin contexto generaban un `--` espurio). Fix:
   el sentinel sólo se sintetiza cuando `beforeContext`/`afterContext`
   activo (`contextActive`).

## Nulling — evidencia (ver `nulling_log.txt`, `sha_baseline.txt`,
   `sha_baseline2.txt`)

| # | Mecanismo anulado | Resultado esperado | Resultado medido |
|---|---|---|---|
| 1 | Guarda `contextActive` del sentinel | sólo falla test 5 | CONFIRMADO: 19 pass / 1 fail (test 5) |
| 2 | Anclaje `--glob` (cwd de spawn) en `runFindFiles` | sólo falla test 4 | CONFIRMADO: 19 pass / 1 fail (test 4) |
| 3 | `memoize()` de `countFilesRoundedRg` | sólo falla test 17 | CONFIRMADO: 19 pass / 1 fail (test 17), tras corregir el propio test 17 (12→13 archivos no cruza de bucket de redondeo; se cambió a 12→20) |

Las tres restauraciones se verificaron con `sha256sum` idéntico al
original antes de continuar (ver los dos `sha_baseline*.txt`).

## Suite final

`bun test src/__tests__/ripgrep.test.ts` → **20 pass, 0 fail, 39
expect() calls** (ver `final_test_run.txt`).

## Fuera de mi alcance (reportado al orquestador, no corregido por mí)

- `installPluginBindings.ts:238` importa `ripGrep` desde el specifier
  legacy `@claude-code-how-works/tool-registry/ripgrep.js`.
- `_deps.ts:812` tiene el stub `ripGrep(...args:unknown[]): Promise<string>`
  con forma de retorno distinta a la real (`Promise<string[]>`).

Ambos quedan para quien toque esos archivos — no son de mi alcance (dos
archivos permitidos: `ripgrep.ts` + su test).
