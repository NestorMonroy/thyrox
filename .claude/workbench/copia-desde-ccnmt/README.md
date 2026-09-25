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
