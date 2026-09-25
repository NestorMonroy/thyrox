# copia-desde-ccnmt

## El encargo

<!-- verbatim -->
«copia lo que puedas copiar hacia thyrox, porque se quedo registrado como lo
copiamos de claude-code-nestor-monroy-tools que ahora esta en
kaupamex-docs/.claude/eventos/recibir-nestor-monroy-tools-20260827T191257/extraido/claude-code-nestor-monroy-tools»

## Las piezas

| archivo | qué es |
|---|---|
| `classify_divergence.py` | clasifica cada par distinto en `alias` / `comentario` / `codigo` |
| `outputs/thyrox.txt`, `outputs/ccnmt.txt`, `outputs/comunes.txt` | los `.ts`/`.tsx` de cada árbol bajo `packages/`, y la intersección |
| `outputs/estado.txt` | `igual`/`distinto` por archivo común, medido con `cmp` |
| `outputs/cubos.tsv` | el cubo de cada archivo distinto |
| `outputs/directivas-distintas.txt` | los de cubo `comentario` cuyas directivas `@ts-*`/`eslint`/`biome` difieren: pasan a `codigo` |
| `outputs/a-copiar.txt` | lo que se copió: `alias` + `comentario` sin esas dos |

## Los resultados

Los 3293 `.ts`/`.tsx` de `ccnmt/packages` existen todos en `thyrox/src/packages`
con la misma ruta (thyrox tiene 3841: 548 son propios). De los 3293, 840 eran
idénticos byte a byte y 2453 distintos:

| cubo | archivos | qué se hizo |
|---|---|---|
| `alias` | 966 | copiados, reescribiendo `@claude-code-how-works/` → `@thyrox/` |
| `comentario` | 456 | 454 copiados igual; 2 difieren en directivas y van a `codigo` |
| `codigo` | 1031 (+2) | NO copiados: llevan las correcciones del lazo tsc y los portes de 2.1.275/2.1.281, y sobrescribirlos las revertiría |

Tras la copia, los 1420 son idénticos byte a byte a la fuente con el alias
reescrito (`cmp`, 0 distintos); 477 cambiaron en git, los otros 943 ya lo eran
salvo espaciado.

*Métrica:* igualdad de contenido tras normalizar alias, espacios al final y
líneas en blanco (`alias`), y además sin comentarios (`comentario`).
*Ciega a:* un comentario con semántica que no sea una directiva de las tres
familias medidas; y al cubo `codigo`, cuya copia sólo se decide archivo a
archivo en el lazo, midiendo tsc antes y después.

tsc tras la copia: **2379**, igual que `step-073/final.log`, y sin ningún
archivo que cambie su cuenta (`outputs/tsc-tras-copia.log`). Auditor de forma:
0 hallazgos. Es la prueba de que la copia no tocó código.

## Fase 1 — lote 01 (100 de los 550 con un solo commit)

`src/verify/source_copy_step.py`, 34 pasadas de tsc:

| veredicto | archivos |
|---|---|
| copiados | 89 |
| rechazados: rompen su propio archivo | 8 |
| rechazados: rompen a un consumidor | 3 |

tsc se queda en 2379. Luego, las pruebas: 238 archivos derivados
(`lote-01/pruebas-derivadas.txt`), uno por proceso, porque en un solo
proceso `bun` 1.3.11 murió con SIGILL (exit 132) a mitad de la corrida
(`lote-01/pruebas.log`). Por archivo fallan 7, y los 7 se corrieron sobre HEAD
con las copias retiradas (`lote-01/base-head/`):

- 4 ya fallaban en HEAD: preexistentes, no de la copia.
- 3 pasan en HEAD y fallan con la copia. Se revierten, con veredicto
  `rejected-behavior` en el registro:
  - `agent/internal/runtimeSignals.ts`: la prueba fija la divergencia
    declarada `../host.ts` y la fuente usa `../host.js`;
  - `command-runtime/src/__tests__/skillHelpers.test.ts`: la prueba copiada
    espera `/etc/claude/…` y la ruta gestionada del árbol es `/etc/claude-code/…`;
  - `headless-sdk/src/sdkMemorySummary.ts`: la copia importa `logEvent` del
    paquete y salta la costura `setLogEventFn` que la prueba inyecta.

Quedan **86 copias**. Las tres pruebas vuelven a verde tras revertir.

*Métrica:* diagnósticos nuevos contra el log previo; pruebas verdes en HEAD
que se ponen rojas con la copia.
*Ciega a:* conducta que ninguna prueba derivada ejerce; la derivación busca
el nombre del módulo en los `import` de las pruebas.

## Fase 1 — lote 02 (100 más)

`source_copy_step.py`, ya con la atribución por imports: **3** pasadas de tsc
(el lote 01 necesitó 34). 85 copiados, 8 rechazados por su propio archivo,
7 por romper a un consumidor. tsc **2364 → 2353**.

Pruebas con `pruebas_de_lote.sh` (el procedimiento del lote 01, ahora guion):
196 derivadas, 9 fallan, **2 regresiones** frente a HEAD:

- `ghAuthStatus.ts`: la copia usa `execa` y `@thyrox/shell/which.js`, y salta
  la costura `Bun.which`/`Bun.spawn` que su prueba sustituye. Revertida
  (`rejected-behavior`).
- `internalRuntimeSignals`: el lote copió la **prueba** de la fuente, que
  espera `../host.js`, y el módulo conservaba `../host.ts` porque su copia se
  rechazó en el lote 01 por la prueba vieja. Se copia también
  `agent/internal/runtimeSignals.ts`: el par queda idéntico a la fuente.

Las dos pruebas pasan tras el ajuste; 85 copias en total.

## Fase 1 — lote 03 (100 más)

3 pasadas de tsc; 74 copiados, 13 rechazados por su archivo, 13 por un
consumidor. tsc **2353 → 2351**. Pruebas: 107 derivadas, 2 fallan y las 2 son
regresiones — las dos son pruebas nuestras que fijan nuestra versión:

- `provider/src/openai/modelMapping.ts`: la prueba exige
  `readEnv` desde `@thyrox/config/env/utils`; la fuente lo importa de
  `@thyrox/config/env`.
- `storage/src/fileEncoding.ts`: la prueba espera el aviso «detectFileEncoding
  failed for expected reason» ante un ENOENT, que la copia no emite.

Las dos se revierten (`rejected-behavior`): quedan **72 copias**.

## Fase 1 — lote 04 (100 más)

3 pasadas de tsc; 71 copiados, 12 rechazados por su archivo, 17 por un
consumidor. tsc **2351 → 2343** en el paso; tras revertir, **2344** (el `TS2698` de `openai/client.ts` que la copia quitaba vuelve con la versión de HEAD; 0 diagnósticos nuevos frente a la base del lote). Pruebas: 96 derivadas, 4 regresiones, dos de
cada clase:

- copias de **módulo** que rompen nuestras pruebas de fijación:
  `provider/src/openai/client.ts` (la prueba exige
  `getProxyFetchOptions({ forAnthropicAPI: false })`) e `indexImpl.ts` (la
  bitácora de sesión cae a la de anthropic con `??`);
- copias de **prueba** de la fuente que fallan contra nuestro módulo:
  `agentSwarmsEnabled.test.ts` y `cronJitterConfig.test.ts`.

Las cuatro se revierten: quedan **67 copias**.

## Fase 1 — lote 05 (75)

El primer intento, con lotes de 200, se detuvo tras **52** pasadas de tsc
(~30 s cada una): la atribución por imports era de todo o nada, y un solo
culpable que no explicaba el grafo tiraba la atribución entera y se bisecaba
el lote. Con la atribución por rondas (`src/verify/source_copy_step.py`,
commit `7c6ae52b`): **3** pasadas. 58 copiados, 5 rechazados por su archivo,
12 por un consumidor. tsc **2344 → 2318**, 0 diagnósticos nuevos frente a la
base del lote.

Pruebas: 108 derivadas, 5 regresiones, revertidas (`rejected-behavior`):

- copias de **prueba** que fallan contra nuestro módulo:
  `goalStopHook.test.ts`, `idleCollapse.test.ts`, `trustedDevice.test.ts`;
- copias de **módulo** que rompen nuestras pruebas de fijación:
  `permission/src/planModeV2.ts` (exige credencial al contar agentes) y
  `tool-registry/src/undercover.ts` (la variable de fuerza deja de encenderlo).

Tras revertir las cinco pasan y tsc confirma **2318**; quedan **53 copias**.
Memoria: 53 archivos más en `file-diverged-from-source` (363 en total); el
lote quitó 26 diagnósticos, 10 en sus propios archivos y el resto en
consumidores.

## Fase 1 — lote 06 (los últimos 75)

**23** pasadas de tsc (~31 s cada una): 40 copiados, 23 rechazados por su
archivo, 12 por un consumidor. tsc **2318 → 2314**. Pruebas: 105 derivadas,
1 falla y ya fallaba en HEAD: 0 regresiones.

Por qué 23 y no 3. Las rondas de imports bajaron lo nuevo de 63 a 3, pero
ninguno de los tres consumidores residuales importa una copia directamente:
el tipo roto les llega re-exportado por módulos no copiados y por
especificadores `@thyrox/*`, que el primer salto sólo casaba por nombre.
Sin sospechosos, se bisecaron las ~70 copias restantes. Medido sobre ese
residuo (`reachable_copies`, commit `1297e80d`): a 1 salto no hay ninguna
copia culpable, a 2 hay 1 de 5 alcanzables, a 3 hay 4 de 27 y a 4, 10 de 40.
Acotar la bisección a lo alcanzable baja de ~70 a 43; lo que la acortaría
de verdad es probar por capas de distancia, y queda sin hacer porque este
lote cierra la fase 1 (550 de 550 decididos).

Memoria: 40 archivos más en `file-diverged-from-source` (403 en total); el
lote quitó 4 diagnósticos, los 4 en sus propios archivos.
