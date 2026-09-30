# motor-de-hooks-desde-el-binario

## El encargo

> ve con la 2, reimplementa desde el binario en TDD y no te detengas a preguntar, queremos 0 errores

## La premisa, si se corrigio al primer comando

Se suponía que faltaba una función (`executePostToolBatchHooks`, 20 archivos
rotos). Medido: `hooks.ts` exportaba 7 de los 33 símbolos que el árbol le pide
—faltaba el motor entero, 27 símbolos.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/extraer_definiciones.py` | recorta del binario el cuerpo minificado de cada símbolo pedido |
| `outputs/simbolos-que-piden-los-llamadores.txt` | los 33 símbolos que el árbol importa de `hooks.ts` |
| `outputs/simbolos-presentes-antes.txt` | los 7 que había |
| `outputs/mapa-de-exportaciones.txt` | original ↔ minificado, de `chunk-526kmp4w.js` |
| `outputs/binario/` | los extractos de lectura y su índice |
| `outputs/llamadas/` | cada sitio de llamada con su contexto: el contrato |
| `outputs/rojo.txt`, `verde.txt`, `anulado-*.txt` | la mitad roja, la verde y las dos anulaciones |

## Los resultados

`src/packages/agent/hooks.ts` tenía 99 líneas —los seis formateadores de
mensaje— y los llamadores del árbol pedían **33** símbolos: faltaban **27**
(`simbolos-que-piden-los-llamadores.txt`). La referencia `ccnmt` de la que
salieron esos llamadores no está en el contenedor, y el ejecutor eligió
reimplementar desde el binario.

**De dónde sale cada cosa.**

| Qué | Fuente |
|---|---|
| nombres y firmas | los llamadores del árbol (`llamadas-*.txt`) |
| conducta | binario 2.1.275: `chunk-526kmp4w.js` mapea nombre original ↔ minificado (`mapa-de-exportaciones.txt`) y `chunk-q2gh92k2.js` los define (`*.min.js`, extractos de lectura) |
| salida JSON por evento | `_references/hook-output-control.md` |

El texto del binario es propietario: los `.min.js` son evidencia de lectura y
el cuerpo de `hooks.ts` está escrito aquí, no copiado.

**Constantes medidas en el binario:** plazo por defecto `du=600000`, piso de
SessionEnd `m$r=1500`, techo `Nes=60000`, plazo de la sugerencia de archivos
`5000`.

| Archivo | Qué es |
|---|---|
| `rojo.txt` | `hooksEngine.test.ts` sin el motor: `Export named 'executeWorktreeRemoveHook' not found` |
| `verde.txt` | 23 de 23 |
| `anulado-lista-exacta.txt` | sin la pertenencia exacta del matcher: cae exactamente 1 |
| `anulado-exit-2.txt` | sin el bloqueo por exit 2: caen exactamente 2 |

Suite TypeScript (`.claude/jobs/ts-motor-hooks-20260924T015006/`): 14 030 →
**14 119** pass, 264 → **260** fail, 30 → **26** errores; ningún error de
exportación de `hooks.ts` queda.

*Métrica:* aserciones de `hooksEngine.test.ts` y conteos de `bun test`.
*Ciega a:* la configuración en producción — el snapshot no tiene store de
settings en vivo que lo pueble, así que fuera de un test no hay hooks que
correr. Y a los tipos `prompt`/`agent` dentro del bucle, que se traducen por
el camino fuera del REPL en vez de delegar en `execPromptHook`/`execAgentHook`.

**Seis símbolos sin extracto** (`indice.tsv`, bytes 0): `HookOutsideReplResult`
y `HookResult` son tipos y no dejan cuerpo en el binario;
`executeConfigChangeHooks`, `executeUserPromptExpansionHooks`,
`getPreToolHookBlockingMessage` y `hasWorktreeCreateHook` no están en el mapa
de exportaciones de 2.1.275 —los llamadores los heredaron de una versión
anterior—, así que su conducta sale de sus llamadores y de sus hermanos
(`ConfigChange` por la forma de `sT`; `hasWorktreeCreateHook` por `Uk`).
