# bisecar-caida-de-bun-en-la-suite

## El encargo

La suite TypeScript hacía caer a Bun 1.3.11 dos veces seguidas con el pase de
exportaciones ausentes (`classifyAPIError`, `hasSkipDangerousModePermissionPrompt`,
`hasAutoModeOptIn`, `pathExists`): `panic(main thread): Segmentation fault at
address 0x18` a los ~38 s, tras `ReferenceError: Cannot access 'Stream' before
initialization` en `tests/unit/utils/stream.test.ts`.

## La premisa, si se corrigio al primer comando

Tres hipótesis cayeron antes de medir con método: `stream.test.ts` pasa solo
(15/15); la suite de opt-in instalando bindings globales junto a él pasa
(21/21); el SDK cargado y luego simulado por `officialRegistry.test.ts` pasa
(33/33).

## Las piezas

| archivo | que hace |
|---|---|
| `probes/bisecar.sh` | delta debugging del prefijo de 927 suites hasta el objetivo, conservando las suites nuevas |
| `outputs/traza.txt`, `outputs/minimo.txt` | 927 → 464 → 232 → 116; a 116 ninguna mitad reproduce sola |
| `probes/cual-nueva.sh`, `outputs/cual-nueva.txt` | los 116 + objetivo reproducen incluso SIN ninguna suite nueva |
| `probes/cual-modulo.sh`, `outputs/cual-modulo.txt` | revirtiendo un módulo cada vez: la caída DESAPARECE sólo sin `errors.ts` |

## Los resultados

`cual-modulo.txt` dice que la caída desaparece revirtiendo `errors.ts`, y la
primera lectura culpó al `import` del SDK que el pase le añadió. **Falso**:
retirado ese import —`classifyAPIError` reconoce los errores del SDK por su
cadena de constructores— la suite completa se sigue cayendo
(`.claude/jobs/ts-sin-import-sdk-20260924T021822/`). Revertir `errors.ts`
entero quitaba también la exportación `classifyAPIError`, y con ella dejaba
de cargar `logging.ts` y todo lo que cuelga de él: la sonda medía «el grafo
nuevo carga o no», no «el import del SDK». Es el sub-patrón D con la sonda
como sujeto.

Lo que sí consta: en la corrida caída la TDZ no es de un solo módulo
(`Stream` 15 veces, `MAX_FILES` 14) y aparece a partir de
`tests/unit/utils/gitDiff.test.ts`; la corrida sana no tiene ninguna. Hipótesis
vigente, sin medir aún: los 146 `mock.module` de 56 archivos, globales al
proceso, contaminan a los archivos siguientes cuando el grafo nuevo carga.
Se mide aislando cada archivo en su proceso
(`suite-ts-aislada-por-archivo-con-parallel-*`).

Control de partida: la suite TypeScript sin los cambios del pase
(`.claude/jobs/ts-sin-cambios-20260924T021053/`) no se cae y da 14 119 pass,
260 fail, 26 errores — idéntico a la corrida del motor de hooks.

*Métrica:* presencia de `Bun has crashed` o de la TDZ de `Stream` en la salida
de `bun --smol test` sobre cada conjunto.
*Ciega a:* el mecanismo interno de Bun que convierte la TDZ en segfault; se
localizó el disparador, no el defecto del runtime.
