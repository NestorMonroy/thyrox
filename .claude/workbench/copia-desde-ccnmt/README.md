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
