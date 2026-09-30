# #130 — flujo de arranque de thyrox, medido por fases

## El flujo hoy

`bin/cli` → `entry/cli.tsx` (caminos rápidos por argumento: `--version`,
`--bg-pty-host`, `daemon`, `ps/logs/…`, `remote-control`) → si ninguno aplica,
`entry/main.tsx` → `import '@thyrox/app-host/runtime/bootstrap.js'` →
`runCli` → `detect-mode` → `mode-dispatch` (REPL, `-p`, `providers`, `mitm`…).

La referencia (2.1.282) tiene la misma forma: `cli.tsx` despacha los caminos
rápidos y sólo el resto carga la capa `main`. Lo que difiere es el peso de esa
capa, y que los subcomandos propios de thyrox no tienen camino rápido.

## Medido (Bun 1.3.11, este contenedor)

| Camino | Pared | RSS |
|---|---|---|
| `--version` (camino rápido) | 0.08–0.16 s | 41 MB |
| `--help` | 1.48 s | 236 MB |
| `providers list --json` | 1.69 s | 242 MB |

`import-cost.tsv` (un proceso por módulo): `runtime/bootstrap.js` 1928 ms y
225 MB; `commands/providers-commands.ts` solo, 89 ms.

`module-count.txt`: `bootstrap` deja **4627** módulos cargados; `providers`
necesita **86**. Entre los 4627: lodash-es 640, Sentry ~570, tool-registry 228,
repl 177, mitm 125, SDKs de Anthropic y OpenAI ~240.

`profile-by-package.txt`: el 89 % del tiempo es nativo — transpilar y enlazar
módulos. El coste es el NÚMERO de módulos, no el código que ejecutan.

`import-paths.txt` — la arista que trae cada bloque pesado:

- CLI entera y `mitm`: `bootstrap → installCliBindings → cli/src/index.ts →
  run-cli → run-program → mitm-commands → mitm/api`.
- REPL: `bootstrap → agent/sessionStores → repl/onChangeAppState`.
- Sentry: `bootstrap → installPluginBindings → gracefulShutdown →
  local-observability/sentry → @sentry/node`.
- Barril de lodash-es: `bootstrap → installPluginBindings →
  tool-registry/SkillTool/prompt → lodash-es/lodash.js` (el árbol tiene 111
  importaciones por función y 2 del barril).

*Métrica:* pared y RSS con GNU Time, módulos en `require.cache` tras la
importación, y aristas del metafile de `Bun.build`.
*Ciega a:* el orden de evaluación real (el metafile da un camino, no todos) y a
un binario compilado, donde la transpilación ya ocurrió: allí el coste es el de
evaluar, no el de transpilar, y hay que volver a medir (#108).

## Fases que se desprenden

1. Camino rápido para los subcomandos propios (`providers`, `mitm`, …) en
   `cli.tsx`, antes de `main.tsx`.
2. Cortar `installCliBindings → cli/src/index.ts`: instalar enlaces no debe
   importar la CLI entera.
3. Cortar `agent/sessionStores → repl/onChangeAppState`.
4. Sentry perezoso en `gracefulShutdown`.
5. `SkillTool/prompt` y el otro importador: por función, no el barril.
6. Presupuesto de módulos por camino de arranque, con gate.
7. Informe del perfilador (`THYROX_CODE_PROFILE_STARTUP`) en los caminos que
   no son el REPL.
