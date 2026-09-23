# El store versionado queda fuera del alcance de las suites de bun

H-THYROX-164 / TASK-THYROX-0244. `loop/index.ts:211,677` resolvía
`persistCleared ?? STORE_PATH`, y sin `THYROX_STORE` eso es el store
versionado: `contextPressure.test.ts` le sumaba filas de fixture.

`tests/preload/store.ts` copia el store al `TMPDIR` de la ejecución (el que
`tmpdir.ts` declara y retira) y fija `THYROX_STORE` a la copia, salvo que el
llamador ya lo haya fijado. Es una copia y no un archivo vacío porque
`observability.test.ts` y `subagent.test.ts` leen el esquema real.

| Archivo | Qué es |
|---|---|
| `rojo.txt` | `tests/session/test-store-faucet.sh` sin el preload: el sha1 del store cambia (1 de 2 falla) |
| `verde.txt` | con el preload: 2 de 2 |
| `anulado.txt` | fuera `store.ts` de `bunfig.toml`: cae exactamente el caso del store |

`observability.test.ts` comparaba contra la constante `STORE_PATH`, que bajo el
preload apunta a la copia; ahora compara contra el último peldaño de la
precedencia, que es lo que el caso afirma. Rojos heredados, que siguen igual
con el preload desactivado: `subagent.test.ts` (1, esquema del tablero) e
`importTasksStoreHome.test.ts` (1, consumidor declarado).
