# TASK-THYROX-0508 — el almacén de credenciales de 2.1.283 sobre `storage/secureStorage`

Banco del ítem. Fuente de verdad del análisis: `chunk-mmqkf96q.js` del corpus
`_references/claude-code-bin/2.1.283/bunfs-root/` (sólo lectura, `bin/binary symbol`),
más `chunk-twjdyk4f.js` para el backend de archivo real que `ji` envuelve.
El volcado íntegro de los 34 símbolos consultados está en `symbols-2.1.283.txt`.

## Estado de partida

El commit e98224086 ya había portado el tramo. Esta sesión midió cada símbolo
enumerado contra el ejecutable y corrigió lo que el porte previo tenía distinto
o había declarado como no portable sin medirlo.

| Eje | Valor |
|---|---|
| Pruebas de `secureStorage` antes de tocar nada | 31 en verde, 0 en rojo (4 archivos) |
| Símbolos enumerados por la tarea | 34, todos resueltos por `bin/binary symbol` |
| Pruebas al cerrar | 45 en verde, 0 en rojo (5 archivos) |

*Métrica:* salida de `bun test src/secureStorage src/__tests__/secureStorage.test.ts`
en `src/packages/storage`.
*Ciega a:* consumidores fuera del paquete (`bridge/trustedDevice.ts`) que llaman
`update()` síncrono; no se corrieron, porque su contrato no cambia.

## Símbolo por símbolo (`chunk-mmqkf96q.js`, rangos en bytes)

| Símbolo | Rango | Qué hace | Decisión |
|---|---|---|---|
| `fc` | [13645,13683) | `Symbol("secureStorage.READ_FAILED")` | ya portado: `READ_FAILED` (`types.ts`) |
| `Rn` | [13766,13775) | `new AsyncLocalStorage` del candado | ya portado: `writeLockContext` |
| `vs` | [13776,13796) | cola de promesas del candado | ya portado: `writeQueueTail` |
| `fWr` | [13797,14295) | candado: cola + `mkdir(Fw())` + `Ci(<dir>/.storage-write, {realpath:false, retries 10/100/1000, stale 15000, onCompromised→warn})` | **portado en esta sesión**: el porte previo declaraba `Ci` como no portable «por exigir la dependencia externa»; medido, `proper-lockfile` está en `storage/package.json` y `src/packages/storage/src/lockfile.ts` ya lo envuelve. `withWriteLock` toma ahora el candado de archivo con las mismas opciones |
| `aFo` | [14295,14337) | `Rn.run(true, e)` | ya portado: `runWithinWriteLock` |
| `Et` | [14337,14662) | `mutate`: invalida caché, lee con `readAsyncStrict?.(n,{inaccessibleAs:"failureIfTransient"}) ?? readAsync(n)`, salta la escritura si `fc`, `update(i, n)` | **corregido**: el porte pasaba `{unreadableFileAs:'failure'}` y no pasaba el backend `n`. Ahora pasa la opción de la fuente y el backend a las tres llamadas. Divergencia que se mantiene: el evento `p("secure_storage_credentials_write", "read_failed_skip_write")` (telemetría, fuera de alcance) |
| `nl` | [14666,14705) | `Symbol("secureStorage.fallbackLegs")` | ya portado, sin consumidor (declarado) |
| `Fi` | [14710,14717) | `2000` | ya portado, sin consumidor (declarado) |
| `mWr` | [14725,14798) | libsecret: memoiza `Promise.resolve(false)` | ya portado: `isLibsecretAvailable` |
| `we` | [14864,14970) | `{storageDir: Fw(), storagePath: join(Fw(), ".credentials.json")}` | ya portado: `getStoragePath`. **Divergencia declarada**: `Fw` lee `CLAUDE_SECURESTORAGE_CONFIG_DIR` (cadena vacía → `~/.claude`) antes de caer en `Se()`. Portarlo exige una clave `THYROX_SECURESTORAGE_CONFIG_DIR` y `check_env_contract_keys.py` obliga a declararla en `.env.example`, archivo fuera de los que este ítem posee. Se usa `getConfigHomeDir()` directo |
| `v6n` | [14974,15022) | aviso de texto plano | ya portado: `PLAINTEXT_WARNING` |
| `$i` | [15023,15163) | errno → `null`/`fc`, laxo (EACCES/EPERM fuera de win32 → null) | ya portado: `mapErrnoToNullOrReadFailed` |
| `Ui` | [15163,15208) | errno → `null`/`fc`, estricto (sólo ENOENT → null) | ya portado: `mapErrnoStrictToNullOrReadFailed` |
| `Bi` | [15212,15855) | backend crudo: `read`, `readStrict(e)` con `(e?Ui:$i)(code,"linux")`, `write` (`mkdir`, `An(n,b(e),384)`, `Li(n,384)`), `remove` | lecturas ya portadas: `createRawFileReadBackend`. `write`/`remove` siguen en `plainTextStorage.update/delete` síncronos (divergencia ya declarada, y ahora medida: `bridge/trustedDevice.ts:217,357` los llama sin `await`). **Corregido**: el archivo se crea con modo 0600 (`openSync(…, 'w', 0o600)`) en vez de crearse con umask y corregirse después |
| `Wi` | [15856,16033) | estado de copia → valor | ya portado: `mapCopyStateToValue` |
| `ji` | [16033,16839) | envoltorio con generación; `readStrict(r)` llama `r ? e.readCredentials() : e.readCredentialsStrict()` | **corregido**: el porte tenía las dos llamadas invertidas. En el backend real (`chunk-twjdyk4f.js` `y`), `readCredentials = E(w)` usa el mapeador estricto y `readCredentialsStrict = E(I(e,"linux"))` el laxo, así que la fuente es coherente con `Bi.readStrict`: bandera verdadera → estricto |
| `vr` | [16839,16905) | invalida si la promesa rechaza | ya portado: `runTracked` |
| `qi` | [16943,16963) | `new q(() => new Ts)` | ya portado: `generationStates` |
| `Xe` | [16964,17001) | `qi.of(j().host)` | ya portado: `getHostGenerationState` |
| `Tr` | [17001,17065) | fija copia y avanza generación | ya portado: `setCopy` |
| `Ps` | [17065,17300) | reconcilia lectura con la generación | ya portado: `reconcileCopy` |
| `He` | [17300,17344) | invalida y avanza generación | ya portado: `invalidate` |
| `c_e` | [17344,17368) | `He(Xe())` | ya portado: `invalidateHostCache` |
| `Pr` | [17368,17415) | `N() && e !== undefined ? ji(e) : Bi` | ya portado: `selectBackend` |
| `In` | [17419,17942) | el almacén `plaintext`, `osGuarded:false`; `read(e)` consulta la copia sólo con `N()` y `fromStoreCopy`, todo dentro del `try` | **corregido**: el `JSON.parse` de la copia estaba fuera del `try`; una copia corrupta lanzaba en vez de resolver `null`. `mutate(e, r)` pasa ahora el backend `r` |
| `Gi` | [18320,18340) | `new q(() => new Ms)` | ya portado: `windowsCredManMemos` |
| `Ns` | [18341,18378) | `Gi.of(j().host)` | ya portado: `getWindowsCredManMemo` |
| `Ds` | [18378,18508) | rutas del flag: `Se()/.config.json` y `(CLAUDE_CONFIG_DIR ǀǀ homedir())/.claude${uK()}.json` | ya portado con divergencia declarada: las dos bajo `getConfigHomeDir()`, donde `@thyrox/config` guarda `.claude.json` |
| `gWr` | [18508,18614) | `CLAUDE_CODE_FORCE_WINDOWS_CREDMAN==="1"` o `Ns().resolve(Ds, zi)` | ya portado: `shouldUseWindowsCredMan`, con `THYROX_CODE_FORCE_WINDOWS_CREDMAN` |
| `zi` | [18614,18756) | lee `cachedGrowthBookFeatures.tengu_windows_credman` | ya portado: `readWindowsCredManFlagFromConfig` |
| `hWr` | [18756,18789) | `Ns().prime(e, Ds)` | ya portado: `primeWindowsCredManDecision` |
| `Un` | [18796,18836) | `Os ?? In` | ya portado: `getSecureStorage`, con `registerSystemSecureStorage` en lugar de la asignación a `Os` (que ningún texto del chunk asigna: `grep 'Os=[^=]'` da 0) y el chequeo de `darwin` como valor por defecto (divergencia declarada) |
| `gr`, `Ne` | [18836,19188), [19188,19480) | `__classPrivateFieldSet/Get` de esbuild | no se portan: artefacto del bundler para `#campo`, sin lógica de aplicación |

*Métrica:* rangos y cuerpos que `bin/binary symbol chunk-mmqkf96q.js <nombres> --root …` imprime (34 de 34 resueltos).
*Ciega a:* símbolos de otros chunks que el tramo importa (`q`, `j`, `N`, `Se`, `Fw`, `Ci`, `An`, `Jne`, `ce`) — se leyeron por separado y se citan arriba donde deciden algo, pero no se portan íntegros.

## El backend de archivo real (`chunk-twjdyk4f.js`, `y` / `E` / `w` / `I`)

`E(clasificador)` abre con `O_NOFOLLOW` (`ELOOP` → `refused-symlink`), rechaza por
tamaño (`corrupt`), y un JSON `null` es `absent`. `w`: ENOENT → absent, resto →
read-failed. `I(e,"linux")`: ENOENT/EISDIR/ENOTDIR/EACCES/EPERM → absent, resto →
read-failed. `writeCredentials`: `mkdir` + `Jne(n, b(e), {mode:384, exactMode:384})`
(temporal con el modo final y `rename`).

Portado en `createFileCredentialBackend`: los dos clasificadores, el `null` →
`absent`, y la publicación por staging + `rename` con modo 0600 (un `rename` que
falla deja el archivo anterior intacto y retira el temporal). **Declarado, no
portado:** `O_NOFOLLOW`/`refused-symlink` y el tope de tamaño — están fuera del
chunk enumerado; `Wi`/`Ps` ya mapean el estado `refused-symlink` cuando un backend
lo emita.

## Controles de anulación

Cada rama nueva se retiró sobre una copia (`mktemp`), se midió la suite y se
restauró. Los números están en la respuesta del ítem y en `annulment.log` de este
banco.

| Anulación | Qué se retiró | Caen | Sobreviven como control |
|---|---|---|---|
| A | el candado de archivo en `withWriteLock` | 3 (existe durante la tarea; espera al poseedor ajeno; crea el directorio) | la reentrancia |
| B | el orden de llamadas de `ji.readStrict` | 2 (bandera falsa → null; verdadera → READ_FAILED) | — |
| C | `inaccessibleAs` y el backend en `Et` | 2 (opciones/backend observados; EACCES escrito bajo plaintext) | EIO sigue siendo transitorio |
| D | el clasificador laxo de `readCredentialsStrict` | 1 (EACCES → absent) | `readCredentials` con EACCES → read-failed |
| E | JSON `null` → `absent` | 1 | — |
| F | staging + `rename` en `writeCredentials` | 1 (rename fallido deja el anterior intacto) | la publicación sin fallo |
| G | el `try` alrededor de la copia en `In.read` | 1 (copia corrupta → null) | — |

*Métrica:* líneas `(fail)` de `bun test src/secureStorage` con la rama retirada, contra 45/0 restaurada; el log íntegro es `annulment.log`.
*Ciega a:* un fallo que la anulación produjera en otro paquete (`bridge`), que no corre en esta suite.
