# Fase B del renombre: CLAUDE_CODE_* → THYROX_CODE_* en src/packages

Tarea #67 (se acuña su cita durable al cerrar). Mecanismo:
`src/verify/renameEnvPrefix.ts`; gate: `src/verify/checkEnvPrefix.ts`.

## Qué se renombró y qué no

- **`src/packages/**`, pruebas incluidas, en un solo paso**: 1415 apariciones
  en 389 de 3978 archivos (`outputs/rename-apply.txt`). Un solo paso porque
  los nombres cruzan paquetes —uno fija la variable y otro la lee—, y por
  paquete dejaba commits intermedios incoherentes. Segunda pasada: 0
  pendientes (idempotente).
- **La credencial se retira con sus DOS nombres.** `subprocessEnv.ts` añade
  `THYROX_CODE_OAUTH_TOKEN` y conserva `CLAUDE_CODE_OAUTH_TOKEN` (marca keep)
  en `ALWAYS_SCRUB` y en la lista de CI: renombrar en vez de ampliar dejaba
  pasar al hijo de Bash la credencial del anfitrión. Prueba nueva con
  anulación: quitar el nombre del anfitrión tumba exactamente ese caso.
- **Las 17 lecturas fuera de `src/packages` son frontera** —el id de la
  sesión anfitriona, su directorio de configuración y de tareas, los límites
  de su binario, los marcadores de sus settings— y llevan la marca keep con
  su razón (`outputs/boundary-lines.tsv`, `probes/insert_keep.awk`).

## Lo que la medición corrigió

1. **La marca keep al final de una línea de código protegía también la
   siguiente**: el elemento de lista después de `CLAUDE_CODE_OAUTH_TOKEN`
   (`CLAUDE_CODE_SUBSCRIPTION_TYPE`) quedaba sin renombrar. La marca sólo
   alcanza la línea siguiente cuando va en una línea de comentario propia;
   la regla vive en `keepFlags` y la usan el renombrador y el gate.
2. **El gate destapó 144 variables THYROX_* sin prueba.** No las crea el
   renombre: ninguna prueba las nombraba antes con ningún prefijo, y bajo
   CLAUDE_CODE_* el gate no las contaba como propias. Quedan congeladas en
   `src/verify/env_test_coverage_baseline.tsv` y se pagan por lotes.
3. **Quedan 65 lecturas CLAUDE_* sin `CODE_`** (`CLAUDE_CONFIG_DIR`,
   `CLAUDE_JOB_DIR`…); el renombrador no las cubre. Segundo pase.

## Verificación

- `tsc --noEmit -p tsconfig.json`: 22 errores, **ninguno en una línea que el
  renombre cambió** (cruce por hunk de `git diff -U0`). Son deuda previa de
  la raíz; 7 no son de importación sin usar y se corrigen aparte.
- Suite TypeScript aislada (`run_ts_isolated.sh`, 1102 archivos): ver
  `outputs/ts-suite.log`.

Métrica: apariciones de `CLAUDE_CODE_<X>` por línea fuera de la marca keep y
de `FOREIGN_CONSTANTS`.
Ciega a: un nombre compuesto en tiempo de ejecución (`'CLAUDE_CODE_' + x`) y
a un anfitrión que siga fijando el nombre viejo: thyrox deja de leerlo, y eso
es la intención de la directiva, no un efecto que el gate mida.

## Cierre: baseline de prefijo a 0 y las 22 variables nuevas con prueba

- El baseline de prefijo (`env_prefix_baseline.tsv`) queda **vacío**: 0
  lecturas `CLAUDE_*` ajenas sin marca, sobre 1798 lecturas en 3505 archivos
  de producción. Las 65 entradas congeladas se pagaron, no se volvieron a
  congelar.
- Las 22 variables `THYROX_*` que el cambio de nombre dejó sin prueba tienen
  ahora una conducta medida cada una (`thyroxEnvReaders.test.ts` en provider,
  bridge, tool-registry, memory, agent, mcp-runtime, cli y repl), contrastando
  la variable fijada con la ausente. El baseline de cobertura baja de 144 a
  142 porque dos entradas congeladas quedaron cubiertas de paso.
- Donde la lectura vivía dentro de una función grande se extrajo a una
  función con nombre y se probó ésa: `getBridgeSessionIngressUrlOverride` e
  `isBridgeCcrV2Forced` (y de paso se quitó la duplicación entre
  `bridgeMain.ts`, `initReplBridge.ts` y `replBridge.ts`), `startupWedgeMs`,
  `skipsMcpToolPrefix`, `fleetFocusSeed`, `isWarningDebugEnabled` y
  `readReplEnvFlags`.
- Paquetes tocados, sus suites enteras: agent 2660, bridge 150, cli 373,
  mcp-runtime 426, memory 91, provider 2022, repl 543, tool-registry 1427 —
  0 fallos en todos.
