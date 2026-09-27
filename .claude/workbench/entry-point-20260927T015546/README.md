# ¿Cuál es nuestro punto de entrada? — medido contra el binario

Origen: TS5056 en `cli`: `entry/main.ts` y `entry/main.tsx` emiten el mismo
`dist/entry/main.d.ts`. Antes de decidir cuál retirar, el ejecutor pidió
derivar el punto de entrada del binario.

## Extracción (este banco)

| Archivo | Qué es |
|---|---|
| `info.out` | `bin/binary info` sobre el ejecutable vivo: declara **2.1.283** |
| `graph.json` | `bin/binary graph --json` (vivo, 2.1.283) |
| `cli-2.1.282.js` | `bin/binary reflow cli --root _references/claude-code-bin/2.1.282/bunfs-root` |
| `binary-cli-literals.txt` / `ours-cli-literals.txt` | banderas y subcomandos que cada `cli` despacha |

El módulo de entrada del bundle es `bunfs-root/cli` (21 743 B, el único sin
extensión del MANIFEST); `graph` no lo lista porque sólo recorre `.js`.

## El binario tiene DOS capas

1. **`cli`** — punto de entrada. Despachador de caminos rápidos: valida el
   cwd (`rt`), `--version` sin cargar nada, `plugin test`,
   `--eval-mock-server`, `--claude-in-chrome-mcp`, `--chrome-native-host`,
   `attach`/`respawn`/`rm`, worktree en tmux, `--update`, `--bare`… Al final
   arranca `startMdmRawRead` + `startKeychainPrefetch`, importa perezosamente
   el módulo principal y lo llama:
   `let{main:pt}=await import("/$bunfs/root/chunk-8qx3adam.js"); … await pt(c)`.
2. **`main`** (`chunk-8qx3adam.js`) — el módulo pesado.

## Lo que hay en `cli/src/entry/`

| Binario | Referencia portada (verbatim, `6f320a8d`) | Propio |
|---|---|---|
| `cli` | `entry/cli.tsx` — despacha y termina en `const { main: cliMain } = await import('./main.tsx'); await cliMain()` | — |
| `main` | `entry/main.tsx` — efectos de arranque + `export async function main()` → `runClaudeCode(createRuntimeHandles())` | — |
| — | — | `entry/main.ts` — `import.meta.main` → `runCli(argv)`; es el ejecutable real (`bin/cli-main`, 6 tests, `exports['./entry/main']`) |

**Corrección a la pregunta que hice:** el `.tsx` NO es el mismo módulo dos
veces. `main.tsx` es la capa `main` del binario; `main.ts` hace el trabajo de
la capa `cli` —ser lo que se ejecuta— bajo el nombre de la otra. La colisión
TS5056 es el síntoma de ese nombre cruzado.

## Caminos rápidos pendientes (sólo en el binario 2.1.282)

`--agent --allow-dangerously-skip-permissions --dangerously-skip-permissions
--effort --inherit-permission-mode --model --permission-mode` (el `It()` que
arma `dispatchDefaults`), `--debug* -d -d2e` (el `st()` que reconoce una
línea de sólo depuración), `--preload --bg-spare`, `--eval-mock-server`,
`plugin test`, `--routine=`, `--verbose`, y la validación de cwd `rt()`.

Sólo en el nuestro (ccnmt, anteriores o propios): `--ax-screen-reader --bare
--bg-detached --bg-interactive --bg-pty --computer-use-mcp
--dump-system-prompt --safe-mode daemon environment-runner list new ps reply`.

*Métrica:* literales de bandera/subcomando comparados en cada `cli`.
*Ciega a:* un camino que el binario reconozca por otra forma (un `Set`, una
función importada — p. ej. `NON_REPL_SUBCOMMANDS` de `chunk-xpk75x19.js`), y
a que un literal compartido haga lo mismo en los dos.

## Propuesta

1. **El punto de entrada es `entry/cli.tsx`**, como en el binario:
   `bin/cli-main` y `exports['./entry/cli']` apuntan ahí.
2. **`entry/main.tsx` conserva `main()`**, y su cuerpo absorbe lo que hoy hace
   `main.ts`: activar `@thyrox/config` y despachar con `runCli`. El camino
   `runClaudeCode` (REPL) queda donde está, sin cablear, hasta que el REPL
   corra.
3. **`entry/main.ts` se retira**: cierra el TS5056 sin tocar la estructura de
   la referencia. Sus consumidores importan `runCli` de `entry/run-cli.ts`,
   que es donde vive.
4. **Los caminos rápidos pendientes se portan en TDD** desde este `cli`,
   empezando por `rt()` (cwd borrado) e `It()` (`dispatchDefaults`).

Antes del paso 4: el corpus más reciente es 2.1.282 y el ejecutable vivo
declara 2.1.283 — se extrae 2.1.283 para portar desde la versión vigente.
