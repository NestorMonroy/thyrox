# Buzón por socket de la sesión (uds-messaging): porte de 2.1.283

`src/packages/local-observability/src/uds/udsMessaging.ts` y `udsClient.ts`
eran sustitutos de tres líneas, y `setup.ts` ya los llama tras
`feature('UDS_INBOX')`. El original es el buzón `uds-messaging` de
`chunk-yg53q7yp.js` (`mn`, arrancado por `z1o` en la ruta de `W1o`): el
socket por el que las sesiones de una máquina se envían mensajes. No es
inferencia y no usa la credencial del anfitrión.

Instrumento: `bin/binary symbol|references|reflow` sobre el ejecutable
2.1.283. `chunk-yg53q7yp.reflow.js` es el chunk reformateado (971 líneas).

| Fase | Qué | Estado |
|---|---|---|
| F1 | ruta (`W1o`, `p9r`, `z`=103), validez (`IL`, `qce`, `Ln`, `_N`) | hecha: 13 pruebas, 3 anulaciones (`anulacion-f1-*.txt`), cada una tumba sólo su caso |
| F2a | `me`, `ne`, `tn`, `sn`, `rn`, `B`/`H`: vida del socket, bind sin robar, rutas apartadas, cierre | hecha: 10 pruebas; anulaciones en `anulacion-f2a-*.txt` |
| F2b-1 | espacio de nombres de uid (`F`, `h`, `R`, `B`, `bko`, `LOt`, `A`) | hecha: 15 pruebas; 4 anulaciones, cada una su caso |
| F2b-2 | verificación del directorio de sockets (`Re`) con sus mensajes (`Te`, `De`, `fn`, `an`, `qr`) | hecha: 18 pruebas; 9 anulaciones, cada una su caso (`anulacion-f2b2-*.txt`) |
| F2b-3 | ruta explícita (`G1o`) con `CliUserError` (`_m`) | hecha: 7 pruebas; 7 anulaciones, cada una su caso (`anulacion-f2b3-*.txt`) |
| F3a | tokens y marcos: `ofn`, `YDo`, `zFr`, `eLo`, `tLo`, `v0`, `Iv`, `J`, `Q` | hecha: 9 pruebas; 5 anulaciones (`anulacion-f3a-*.txt`) |
| F3b | identidad de proceso: `b`/`Zne`, `n6`, `Hx`, `TFe`, `mfn`, `Nh`, `nc`/`Pv`, `_Lo`/`HP` | hecha: 10 pruebas; 7 anulaciones, cada una su caso (`anulacion-f3b-*.txt`) |
| F3c-1 | escritura atómica con modo: `An`, `Jne`, `Kx`, `kA`, `j`, `XL`, `We`, `Ye`, `R`, `XS` → `uds/atomicWrite.ts` | hecha |
| F3c-2 | clave publicada y leída: `XDo`, `sz`, `be`, `ifn`, `JDo`, `QDo`, `W`, `cl` → `uds/inboxKeys.ts` (rama de archivos locales) | hecha |
| F3d-1 | token de inicio fuera de `/proc`: la rama `ps -o lstart=` de `b` (`lxe`, `RGr`, `ya`) y la forma de Windows de `n6`/`Hx` → `uds/processIdentity.ts` | hecha; la fuente del token en Windows, DESCONOCIDO |
| F3d-2 | `Jne` completo: `exactMode`, `flush` (`De`, `oxe`), `stagingDir` (`Me`, `Ue`), `beforePublish` (`fhn`), `inPlaceOnTempCreateRefused`, rechazo por enlace duro (`uhn`, `ae`), `we`/`Ie` por plataforma y `ce`/`Ez`/`Le` como `shouldRetryRename` → `uds/atomicWrite.ts` | hecha |
| F3d-3 | rama de storage de la clave: `ye`, la rama `N()` de `JDo`, `J4n`, `Ee`, `Ks`, `rt` y el contrato `SessionKeyStorage` que consumen → `uds/inboxKeys.ts` | hecha |
| F4a | credenciales del par: `lsn`, `te`, `Yce`, `aUr`; `Bun.ant.getPeerPid` sustituido por `getsockopt` (`SO_PEERCRED` en Linux, `LOCAL_PEERPID` en macOS) por `bun:ffi` → `uds/peerCredentials.ts` | hecha (H-THYROX-241) |
| F4b | el manejador de conexión `en`: plazo de primera línea, marco de auth, tope `WOt` de 1 MiB, líneas JSON, fragmento final, `TB`/`Bf`, telemetría `_`/`m`/`p` → `uds/inboxConnection.ts`, `uds/logRedaction.ts`, `uds/featureTelemetry.ts` | hecha |
| F4c-1 | despacho: `Qe` (inmediato o en cadena), `be` por tipo y acción, `Ie` (session_id), acción `rename` → `uds/inboxRouting.ts` | hecha |
| F4c-2 | entrega de un mensaje `user` a la cola de la sesión: `ze` (`C7e`, `E2e`, `g9r`, `pYe`, `Aot`, `zce`, `fbt`, `gE`, `Oe`) y adjuntos (`chunk-yrfq0b3e.js`) | pendiente |
| F4c-3 | `peer_message_status` (`WRr`, `GRr`, `jRr`, `R1n`, `Cko`) | pendiente |
| F4c-4 | `notify_when_idle` y `peer_idle_notice` (`qtr`, `aEn`, `Ytr`, `pqt`, `Ktr`, `ibt`, `Jtr`) | pendiente |
| F4c-5 | `yield`/`unyield_artifact_replies` y `artifact_replies_yielded` (`cno`, `uno`, `bno`, `dno`, `gno`, `hno`, `glr`) | pendiente |
| F4c-6a | el veredicto «lo envió esta sesión»: `ye`, `Le`, `Ke`, `he`, `Ne`, `hfn` → `uds/peerTrust.ts` | hecha |
| F4c-6b | `unr`: la política `crossSessionInbound` (`I`, `B`, `O`, `zje`, niveles `accept`/`hold`/`refuse`) y el modo de permisos (`C`, `S`, `V1`, `NL`) → `uds/inboundPolicy.ts`; la clave entra al esquema de `@thyrox/config` | hecha |
| F4c-2a | escape del cierre de la etiqueta que envuelve texto ajeno (`Qce`, `CFt`, `PL`, `h`, `H`, `iRe`, `Spt` de `chunk-0grnxhq4.js`) → `uds/tagClose.ts` | hecha |
| F4c-2b | `chunk-q8a07cv0.js` entero salvo las constantes de equipo (ya en `@thyrox/swarm`): sobre `cross-session-message` → `uds/peerEnvelope.ts`; direcciones de pares → `uds/peerAddress.ts`; lectores con tope y resumen de una línea → `uds/cappedText.ts`; y la rama `win32.normalize` de `_N` que F1 omitía | hecha |
| F4c-2c-1 | neutralizado de etiquetas por forma (`DLo`, `xu`, `_u`, `D`, `$u`, `W`, `Su`, `Pfn` con las tablas `N` y `M` generadas) → `uds/tagFormScrub.ts`, `uds/confusableTables.ts`; texto de par (`aYe`, `X4n`, `lYe`, `fe`, `Wce`, `m`, `g9r`, `ioe`) → `uds/peerTextScrub.ts`; escapes XML (`qt`, `AYe`, `AFt`, `Do`, `$w`, `ine`) → `uds/xmlText.ts` | hecha |
| F4c-2c-1b | resto de `chunk-0grnxhq4.js`: `Uq`, `lz`, `RYe`, `cu`, `Ofn`, `Hfn`, `mu`, `LLo`, `yJ`, `CYe`, `RUr` con `y3n`/`sne` y sus clases → `uds/confusableTagPatterns.ts`; `H` general y `OFe`, `sRe`, `F`, `B`, `U`, `uu` → `uds/tagClose.ts`; `sf`, `E`, `R8e`, `t6n`, `Mz` → `uds/unicodeSanitize.ts` | hecha: 19 pruebas; 16 anulaciones (`anulacion-f4c2c1b-*.txt`); oráculo `diferencial-confusable-patterns.txt`, 0 discrepancias |
| F4c-2c-1c | `chunk-pbnxt79v.js` entero → `uds/unicodeSanitize.ts`; `re`, `Mz`, `fr` de `chunk-vq0drrah.js` → `uds/stringUnits.ts`; `displayText.ts` y `cappedText.ts` dejan de duplicar `Mz`, `Tn` y `YH`; `@thyrox/mcp-runtime: sanitization.ts` delega en `Njr`/`H_` | hecha: 18 pruebas; 14 anulaciones (`anulacion-f4c2c1c-*.txt`); oráculo `diferencial-unicode-sanitize.txt`, 0 discrepancias |
| F4c-2c | `ze`/`Oe`/`aEn`/`E2e`/`B4e`: entrega de un `user` a la cola, con sus dependencias inyectadas → `uds/inboxDelivery.ts`; `InboxState` gana `peerDirOwnerUids` y `onEnqueue` | hecha |
| F4c-2d | `session.receive` (`Aot`, `NXe`, `R_e`, `WCt`, `jCt`, `Q0n`, `BXe`, `HXe`, `jXe`, `FXe`, `$Xe`, `Me`) sobre una interfaz `HookSite` → `uds/sessionReceive.ts`; el runtime de módulos que la implementa es la serie MOD | hecha |
| F4c-2e-0 | predicados de ruta de una copia de transferencia (`Djt`, `nM`, `p9n`, `yN`/`Pt`, `tt`, `GF`, `pn` de `chunk-yqm14hey.js`; `Mur` de `chunk-d6ekr2rh.js`) → `@thyrox/permission: pathSafety.ts`, sobre sus primitivas ya portadas; `local-observability` exporta `./uds/peerAddress.js` para `zF` | hecha |
| F4c-2e-1 | adjuntos de un par: `chunk-xqnw10c4.js` entero con los nombres que exporta `chunk-yrfq0b3e.js`, `ZOe`/`Dur`, `met`, `G3`, y la bandera `nlt`/`Ws` (`THYROX_CODE_HARBOR_KITE`) → `uds/peerFiles.ts`, exportado como `./uds/peerFiles.js` | hecha: 18 pruebas; 14 anulaciones (`anulacion-f4c2e1-*.txt`) |
| F4c-2f-1 | estado de nombre y correspondientes (`b`, `q`, `wS`, `Wkr`, `zFn`, `He`) y decisión de colisión de nombres (`P`, `L`, `D`, `O`, `B`, `A`, `C`, `U`, `fDe`, `Cr`) → `uds/sessionNameState.ts`; `ADo` → `@thyrox/tool-registry: isShortWordSlug` | hecha |
| F4c-2f-2 | flujos de renombre (`tPt`, `Gkr`, `Vtn`, `VFn`, `sae`, `jkr`, `y`, `z`, `T`) y saneado de nombre (`li`, `AY`) sobre un `RenameContext` inyectado → `uds/sessionRename.ts` | hecha: 22 pruebas; 19 anulaciones (`anulacion-f4c2f2-*.txt`); oráculo por escenarios `diferencial-session-rename.txt`, 0 discrepancias en 3000 |
| F4c-2f-4 | el registro de sesiones de 2.1.283 (`HH`/`eD`, `kv`, `Cut`, `eF`/`Vt`, `D3`) que los flujos reciben inyectado; hoy sólo existe `agent/concurrentSessions.ts`, un porte anterior más simple. Partida en 4a–4f | en curso |
| F4c-2f-4a | estado del registro (`By`, `eD`, `HH`, `Y5o`, `kv`, `Cut`) con `JM`, `KKn`, `XM` y la bandera `Nq` → `uds/sessionRegistryState.ts` | hecha: 14 pruebas; 16 anulaciones (`anulacion-registry-*.txt`); oráculo `diferencial-registry-state.txt`, 0 discrepancias en 3000 secuencias |
| F4c-2f-4b | escritura del archivo pid (`Vt`, `Ms`) y lo que la sesión publica en él (`eF`, `Rut`, `X5o`, `ipn`, `GNr`, `apn`, `kCe`, `rD`, `Wy`, `ud`) → `uds/pidFileRecord.ts`; `ud` llega como sonda que instala F4c-2f-4g | hecha: 23 pruebas; 30 anulaciones (`anulacion-pidfile-*.txt`) |
| F4c-2f-4g | sesión hija y contexto de equipo (`kFe`, `nUr`, `cFt`, `dF`, `tl`, sonda ambiente de tmux, `chunk-jzycvw5e.js`) en `@thyrox/swarm`, con `THYROX_CODE_CHILD_SESSION` y `THYROX_CODE_FORCE_SESSION_PERSISTENCE`; su veredicto es la sonda de `ud` → `swarm/src/childSession.ts` (`ownsSessionRegistryRecord` es `ud`, que F6 instala con `setRegistryOwnershipProbe`) y `setCliParentSessionId`/`zE` en `teammateState.ts`. Divergencia: la referencia guarda el estado por anfitrión (`$2o.of(host)`); aquí es del módulo, como el resto de `teammateState.ts` | hecha: 21 pruebas; 24 anulaciones (`anulacion-4g-*.txt`) |
| F4c-2f-4c-1 | latido del tablero (`ld`, `jNr`, `WNr`, `$y`, `VNt`, `qNt`, `Ds`, `tD`, `Gy`, `fBe`) → `uds/fleetHeartbeat.ts` | hecha: 11 pruebas; 16 anulaciones (`anulacion-heartbeat-*.txt`) |
| K | catálogo de claves del storage (`chunk-qbkceaaj.js` completo: `Re`, `K`, `mhn`, `SUo`, `bUo`, `wUo`, `vUo`, `jn`, `sR`, `qBt`, `_Uo`, `KBt`, `cK`, `YBt`) → `storageKeys.ts` | hecha: 11 pruebas; 24 anulaciones (`anulacion-storagekeys-*.txt`); oráculo `diferencial-storage-keys.txt`, 0 discrepancias en 20000 nombres y 20000 claves |
| F4c-2f-4c-2 | sesión de reserva: si ya la reclamaron (`jy`) y su sondeo (`iD`, `sD`, `oD`) → `uds/spareSession.ts` | hecha: 11 pruebas; 19 anulaciones (`anulacion-spare-*.txt`) |
| E | módulo de entrypoints y anfitrión (`chunk-jwddn0q9.js` completo) con las variables `THYROX_CODE_*` y el intérprete de cada una (`str`/`bool`/`triBool` de `chunk-b1cxch1w.js`) → `@thyrox/config: entrypoint.ts` | hecha: 16 pruebas; 27 anulaciones (`anulacion-entrypoint-*.txt`); oráculo `diferencial-entrypoint.txt`, 0 discrepancias en 20000 escenarios |
| W-2 | nombre derivado de una sesión (`xs`) → `@thyrox/tool-registry: derivedSessionName`; con carpeta sin slug toma el nombre del producto | hecha: 3 pruebas; 5 anulaciones (`anulacion-xs-*.txt`) |
| F4c-2f-4c-3 | alta de la sesión en el registro (`nD`, `KNt`, `lD`, `ZM`, `QM`, `QKn`, `opn`, `xy`, `YKn`, `XKn`, `JKn`, `FNr`, `tUr`) → `uds/sessionRegistration.ts`; el nombre derivado, la limpieza y las señales de sesión y de directorio llegan por `processRegistrationDeps(parts)` | hecha: 25 pruebas; 44 anulaciones (`anulacion-registration-*.txt`) |
| S | señales de cambio de sesión con motivo y de `originalCwd` (`Sn`/`fn`, `yn`/`hn`, `mh`, `Zd`, `kzr`, `oT`, `D1t`) en `@thyrox/app-host`: `switchSession(id, motivo, dir, rutas)` con los ocho motivos de `XGe`, `regenerateSessionId` avisa `clear`, `setOriginalCwd` avisa el valor NFC; llamadores con su motivo (`hydrate`, `resume`/`fork`, `startup_custom_id`). Divergencia: el tercer argumento de `fn` (restauración del modelo de respaldo por rechazo, `mn`) no se emite porque el enclavamiento no existe; es la fase R | hecha |
| F4c-2f-4d | listado y barrido del registro (`Ny`, `Fy`, `zy`, `TCe`, `aD`, `ZKn`, `Ly`, `lpn`, `xut`, `id`) → `uds/registrySweep.ts`, y la sonda de permiso (`probeRegistrySweepPermitted`, `gfn`) → `uds/registrySweepPermission.ts`; `J4n` pasa a exportarse con `partialOnCap` y `onIssue`. El `D3` del registro vive en `chunk-qcy58j4w.js` (listado de pares vivos) y pasa a la fase C; el de `chunk-gpsyc3w1.js` es otro símbolo, la ruta de seccomp. Divergencia: los borrados de claves huérfanas se esperan; la referencia no los espera. Redundantes por construcción: `array` (un arreglo no tiene `pid`) y `claves-muerto` (la segunda comprobación de pid muerto decide lo mismo). La sonda se instala en el estado del registro en F6 | hecha: 29 pruebas; 51 anulaciones (`anulacion-4d-*.txt`) |
| F4c-2f-4e | tipo de sesión por entorno y anfitrión (`oJ`, `vt`, `fm`, `Ip`, `tc`, `tz`, `jte`, `NNr`, `qKn`) con `THYROX_CODE_SESSION_KIND`, `THYROX_JOB_DIR` y `THYROX_BG_BACKEND`; `fb`, `Ul`, `dR` y `md` llegan por `configureSessionKindHost` → `uds/sessionKind.ts` | hecha: 9 pruebas; 17 anulaciones (`anulacion-sessionkind-*.txt`) |
| F4c-2f-4f | `agent/concurrentSessions.ts` retirado; sus consumidores importan los símbolos portados (`isBgSession`→`isBackgroundSession`, `updateSessionName`→`setSessionName`, `updateSessionActivity`→`updateSessionStatus`, `updateSessionBridgeId`→`recordBridgeSessionId`, `countConcurrentSessions`→`sweepRegistry`); el puente deja su punto de inyección de `updateSessionBridgeId`. `setSessionName` acepta `undefined` y `recordBridgeSessionId` acepta `null`, como `eF` e `ipn`. `CLAUDE_BG_BACKEND` pasa a `THYROX_BG_BACKEND` en quien la escribe (`bg.ts`, `spawnPty.ts`) y en la lista que `subprocessEnv` retira: `jte` ya leía `THYROX_BG_BACKEND`. `registerSession` del módulo retirado no tenía llamadores; el alta es `registerSession` de `sessionRegistration.ts`, que cablea F6 | hecha |
| W-1 | `@thyrox/tool-registry: words.ts`: `TDo` → `shortWordSlugFromSeed`, `E$t` → `slugFromText` con `c`; `M4n` y `Q5` ya eran `generateWordSlug` y `generateShortWordSlug`, ahora nombrados; `Q5` llega inyectado a los flujos de renombre porque `tool-registry` depende de `local-observability` | hecha: 5 pruebas nuevas; 7 anulaciones (`anulacion-w1-*.txt`); oráculo `diferencial-words.txt`, 0 discrepancias |
| F4c-2f-3 | aviso de renombre a los correspondientes (`zkr`) sobre `RenameNoticeDeps` (envío `VOt`, registro `D3`, `Ws`, `DV` inyectados) → `uds/renameNotice.ts` | hecha: 7 pruebas; 10 anulaciones (`anulacion-f4c2f3-*.txt`) |
| F4c-6c | el aviso de validación por un `crossSessionInbound` inválido (`.catch(void 0)` → `severity: warning` en la ruta de la clave), que `B` lee → `@thyrox/config: settings/crossSessionInbound.ts` y los cuatro sitios que parsean settings | hecha |
| F4d | el resto del subsistema de mensajes entrantes (`chunk-dv9ctjss.js`): mensajes retenidos, recibos, cierre ordenado, disponibilidad, `C7e`, `fbt` | pendiente |
| F3d-4a | la bandera que activa el backend: `N`, `DBo`, `dVn` → `uds/storageBackendPin.ts`, cableada en `processInboxKeyDeps` | hecha |
| F3d-4b | un backend que implemente `SessionKeyStorage` | decisión del ejecutor: en la referencia es un servicio REST del proveedor (bandera remota `tengu_hover_rest`) |
| F4 | conexión y mensajes: `en`, `Qe`, `be`, `ze`, `Ie` | pendiente |
| F2c | orquestación de `mn` (tras F3 y F4) | pendiente |
| F3 | autenticación: tokens, clave en el registro de sesiones | pendiente |
| F4 | protocolo y entrega del sobre cross-session-message | pendiente |
| F5 | cliente `uds:<ruta>` y descubrimiento de pares | pendiente |
| F6 | cableado de setup, bandera y variable exportada | pendiente |

*Ciega a:* `bin/binary literal 'uds-messaging'` da 0 aunque la cadena está
en `mn`: el literal vive dentro de una plantilla, y `literal` no la ve
(`censo.txt`).

## Lo que las sondas de F2a midieron sobre Bun 1.3.11

- `probe-bun-hijack.txt` (H-THYROX-239): un segundo `listen` sobre un socket
  vivo sale bien y se queda con los clientes; Node 22 da `EADDRINUSE`. La
  referencia confía en `EADDRINUSE` (`ne`), así que el porte mide la vida del
  socket antes de escuchar. Anular esa medida tumba 2 casos.
- `probe-bun-unix.txt`: `close()` no borra el archivo del socket; `closeInbox`
  lo borra. Anularlo tumba 1 caso.
- La rama de `rn` que borra un socket muerto antes de reintentar **no
  discrimina** bajo Bun (`anulacion-f2a-muertoretirado.txt`, 0 casos): Bun ya
  escribe encima de un archivo muerto. Se conserva por fidelidad al porte.
- En F2b-1, la anulación de «el overflowuid cae dentro del mapa» no
  discriminaba con un mapa de `hostStart` 0: traducir y no traducir daban el
  mismo uid. Se cambió el mapa de la prueba a `0 200000 70000`, y ahora la
  anulación tumba su caso (`anulacion-f2b-sobredentro.txt`).
- `probe-bun-sticky.txt` (H-THYROX-240): `fs.chmod`/`fs.chmodSync` de Bun
  1.3.11 descartan el sticky bit (0o1777 queda 0777); `stat` sí lo lee. Las
  pruebas de F2b-2 ponen el bit con el binario `chmod`. El código de producción
  sólo fija 0700.
- La referencia deja pasar el `ENOTDIR` crudo de `lstat` cuando un archivo
  está en medio del camino: su predicado `U` es sólo `ENOENT`. `De` y `fn` lo
  tratan por su código; la prueba lo exige así.
- La guarda «la hoja es un enlace» no discriminaba por clase de rechazo (un
  enlace tampoco es directorio y el rechazo salía igual); la prueba exige
  ahora el mensaje del enlace.
- En F3a, la guarda «candidato vacío» de `v0` no puede discriminar: un vacío
  frente a un esperado no vacío ya falla por longitud, y un esperado vacío lo
  rechaza `!expected`. Es redundante en la referencia y se conserva por
  fidelidad (`anulacion-f3a-vacio.txt`, 0 casos).

## F3c-1 — escritura atómica: controles

Anulaciones en `anulacion-atomicwrite-*.txt`; cada una tumba sólo sus casos:
`sin-xs` 5, `sin-restaurar` 1, `sin-conservar` 2, `sin-nofollow` 1,
`sin-reintento` 2, `sin-modo` 1.

Control que no discrimina, declarado: el caso «rehúsa un destino que no es
archivo regular» no llega al `ENXIO`. Abrir un directorio con `O_WRONLY` falla
antes con `EISDIR`, así que el caso sólo mide que el temporal se retira. El
`ENXIO` de la referencia protege un destino que se abre para escritura y no es
regular ni dispositivo de caracteres (un FIFO con lector), y ese camino queda
sin prueba.

## F3c-2 — clave publicada: controles

Anulaciones en `anulacion-inboxkeys-*.txt`; once, y cada una tumba sólo sus
casos. `sin-filtro-key` no discriminaba en su primera forma, porque el
temporal ya lo descarta `endsWith`. Se añadió el caso que exige la regex, un
nombre con el sufijo de la dirección y sin pid numérico, y con él tumba 1.

## Fases F3d — las divergencias declaradas se implementan

Directiva del ejecutor: una rama que la compilación de Linux de la
referencia no alcanza no es razón para no portarla. Las ramas que los
docstrings de F3a–F3c declaraban «no se porta» pasan a las fases F3d-1..3.

## F3d-1 — token de inicio fuera de `/proc`: controles

Anulaciones en `anulacion-starttoken-*.txt`; ocho, y cada una tumba sólo sus
casos. `sin-rama-linux` incluye el control contra el `ps` real del
contenedor (`/usr/bin/ps`, procps), que devuelve la fecha en inglés y UTC.

Control que no discrimina, declarado: el caso «un PATH sin entradas
absolutas no lanza ps» sobrevive a `sin-path-absoluto`, porque `Bun.which`
tampoco encuentra `ps` en `rel:./bin`. Lo que filtra las entradas relativas
lo mide el caso unitario de `absolutePathEntries`.

DESCONOCIDO, con su condición de cierre: de dónde toma la referencia el token
en Windows. La compilación de Linux 2.1.283 sólo contiene la forma del campo
(`procStartFt`); la lectura del FILETIME no está en el bundle. Se cierra con
una compilación de Windows de la referencia.

## F3d-2 — `Jne` completo: controles

Anulaciones en `anulacion-atomicwrite-sin-*.txt` (las 15 nuevas junto a las
6 de F3c-1); cada una tumba sólo sus casos. Dos sondas del contenedor,
ejecutado como root, que las pruebas usan:

- un `EACCES` real al crear en exclusiva: `/sys/<nombre>` da `EACCES` y
  `/proc/<nombre>` da `ENOENT`. Por eso el caso de
  `inPlaceOnTempCreateRefused` fija el temporal bajo `/sys`: un directorio
  con permisos quitados no rehúsa a root.
- `ce` (reintentar el `rename`) y `uhn` (rechazo por enlace duro) son
  constantes `false` en la compilación de Linux. `uhn` depende además de una
  bandera de ejecución (`te`/`fUo`). Aquí son opciones con esos mismos
  valores por omisión.

## F3d-3 — rama de storage de la clave: controles

Anulaciones en `anulacion-keystorage-*.txt`; doce, y cada una tumba sólo sus
casos. El storage de las pruebas es un doble en memoria con la forma de
resultados de la referencia (`{ok, value}` / `{ok:false, error}`, páginas
con `cursor`, lecturas con `found` y `totalBytes`). Lo que ese doble no puede
probar es que un backend real cumpla el contrato. Eso lo cierra F3d-4.

## F3d-4 — qué activa `N()`, medido

`N()` devuelve la bandera `t` de `chunk-8nz62976.js`. Sólo `DBo` la fija
(`references-DBo.txt`: 1 uso), y a `DBo` sólo la llama `dVn`, que lee la
bandera remota `tengu_hover_rest` y avisa si el valor servido no es booleano
o si contradice una decisión anterior (`symbol-dVn.txt`). `N()` tiene 559 usos
en 128 chunks, así que el backend es un subsistema transversal de
almacenamiento remoto del proveedor, no algo propio del buzón.

Anulaciones de la bandera en `anulacion-pin-*.txt`: `sin-primero` 3,
`sin-solo-true` 1, `sin-aviso-tipo` 1.

La bandera se porta. El backend no se porta contra el servicio del
proveedor, porque exigiría su credencial. Decidir si thyrox tiene un
backend propio que cumpla `SessionKeyStorage` corresponde al ejecutor.

## F4a — credenciales del par: controles

La sonda `probe-peer-pid.ts` → `probe-peer-pid.txt` confirma dos cosas en el
Bun 1.3.11 del árbol: un socket aceptado expone `_handle.fd` como número, y
`getsockopt(SOL_SOCKET, SO_PEERCRED)` por `bun:ffi` devuelve el pid del par.
La prueba real conecta desde un proceso hijo y obtiene su pid y nuestro uid.

Anulaciones en `anulacion-peercred-*.txt`. Dos no discriminaban en su
primera forma y se endurecieron sus casos: `sin-corte-init` (el doble no
tenía padre para init) y `sin-vacio` (ningún caso producía un campo 22
vacío). La rama de macOS se mide sólo por la consulta que elige, porque este
contenedor no puede ejecutarla.

## F4b — el manejador de conexión: controles

Anulaciones en `anulacion-connection-*.txt` (15) y `anulacion-redaction-*.txt`
(6); cada una tumba sólo sus casos.

Una trampa del arnés, medida (`probe-bun-server-data.txt`,
`probe-handler.txt`). El manejador aislado enruta bien, pero la primera
versión de la prueba afirmaba en cuanto el CLIENTE veía `close`, y en Bun ese
`close` puede llegar antes de que el servidor procese sus `data`: la prueba
veía cero mensajes enrutados. Desde entonces el arnés espera el `close` del
socket del servidor. La prueba se corrió tres veces seguidas en verde.

## F4c-1 — despacho: controles

Anulaciones en `anulacion-routing-*.txt`; nueve, y cada una tumba sólo su
caso. Las guardas de `be` —por ejemplo `peer_message_status` sólo con un
`status` conocido— hacen que un mensaje que no las cumple caiga en «acción
sin manejar». Aquí eso lo expresa `accepts`, que declara cada acción al
registrarse en F4c-3..5.

## F4c-6a — veredicto del par: controles

Anulaciones en `anulacion-trust-*.txt`; diez, y cada una tumba sólo su caso.
`walkAncestors` se prueba contra el `ps` real del contenedor: la cadena del
proceso propio empieza por su padre.

## F4c-6b — política de mensajes entrantes: controles

Anulaciones en `anulacion-inbound-*.txt`; diez. Una no discrimina, y es por
construcción: `sin-modo-conocido` retira la pertenencia del modo a `NL`, pero
la clase bypass sólo admite `bypassPermissions` y `plan`, que están en `NL`.
En la referencia esa comprobación es redundante; se porta igual y no tiene
caso que la separe.

El esquema de settings de thyrox declara sólo las claves que tienen
consumidor, y `crossSessionInbound` lo tiene ahora (`unr`). Lleva
`.catch(undefined)`, como en la referencia: un valor inválido cuenta como
ausente (`sin-catch` 1). El aviso que `B` busca en ese caso lo produce la
validación de settings de la referencia, y thyrox todavía no lo emite. Eso
es F4c-6c.

## F4c-6c — aviso de un `crossSessionInbound` inválido: controles

`sanitizeCrossSessionInbound` (`Oy`/`wy`) corre antes de `SettingsSchema`
en los cuatro sitios que parsean settings: `parseSettingsFile` y
`loadSettings` (fuera de política retira el valor y avisa con
`severity: warning`, que es lo que `B` lee para retener), y
`parseCommandOutputAsSettings`, `readPolicyDocument` y la fuente
`policySettings` de `loadSettings` (sustituyen por `refuse` con un aviso
`statusOnly`, que `B` no cuenta). `SettingsError` gana `severity`,
`statusOnly` y `expected`, opcionales.

Anulaciones en `anulacion-csi-*.txt`; siete, y cada una tumba sólo su caso
(`sin-refuse` tumba dos: el saneo directo y el de MDM). `sin-clon` retira
la copia del documento de política y cae el caso que exige no mutar el
original, que es el que la caché por documento necesita.

## F4c-2a — escape del cierre de etiqueta: controles

Anulaciones en `anulacion-tag-*.txt`; siete, y cada una tumba sólo su caso.
`sin-parecidos` retira a la vez los parecidos de `<` y de `/`, que caen en el
mismo caso. La caché de 64 patrones que se vacía al llenarse no tiene caso
que la separe: sólo cambia cuándo se reconstruye un patrón, no cuál.

## F4c-2b — sobre, direcciones y texto con tope: controles

Anulaciones en `anulacion-env-*`, `anulacion-addr-*`, `anulacion-capped-*` y
`anulacion-sp-*`; veintidós. Dos no discriminaban en el primer pase y se
estrecharon con un caso nuevo: `env-sin-compacto` (un resumen de
compactación después de un mensaje de par; antes el único caso daba
`undefined` con y sin el salto) y `addr-sin-volumen` (la comparación de dos
rutas en macOS a través de `/System/Volumes/Data`; antes sólo se probaba la
función suelta). `env-sin-escape` y `addr-sin-uid` tumban dos casos cada
una, los dos que dependen de ellas.

F1 portó `Ln` sin la segunda mitad de `_N`: una ruta que sólo cae en el
espacio de dispositivos al normalizarla como Windows (`/x/../??/c`). Se
completa aquí, con su caso en `udsSocketPath.test.ts` (`sp-sin-normalizar`).

## F4c-2c-1 — neutralizado por forma y texto de par: controles

Dos oráculos diferenciales evalúan los chunks de la referencia con sus
importaciones sustituidas y comparan con el porte sobre 20 000 entradas
generadas cada uno: `probes/differential_tag_scrub.ts` (`DLo`, `Pfn`,
`Qce`, `CFt`, `PL`) y `probes/differential_peer_text_scrub.ts` (`aYe`,
`X4n`, `lYe`, `Wce`, `g9r`, `ioe`). Los dos dan 0 discrepancias
(`diferencial-*.txt`). Las tablas de confundibles se generan del chunk con
`probes/extract_confusable_tables.ts`; no se transcriben.

El oráculo no sustituye a las pruebas: mide la coincidencia en la población
que genera, y esa población casi nunca produce las condiciones de cada rama.
Con las nueve anulaciones de `peerTextScrub.ts` el oráculo sólo cae con
`scrub-sin-json`; las nueve las tumban las pruebas unitarias. Dos de ellas
no lo hacían en el primer pase y se estrecharon: `scrub-sin-salto` (una
etiqueta que sólo se completa con el salto de línea entre dos bloques) y
`scrub-sin-escape-simple` (una barra escapada antes de `u003c`).

`form-sin-guion-parecido` no tumba nada, y es por construcción: un guion
que no pasa a `-` cae en la rama de separador y se lee como `_`, que la
clase de `_u` para `-` también admite. Medido sin testigo: ningún carácter
de U+0080 a U+2FFFF cambia de veredicto (`probes/dash_fold_witness.ts`).

## F4c-2c — entrega de un `user`: controles

Anulaciones en `anulacion-ze-*.txt`; dieciocho, y cada una tumba sólo su
caso. `ze-sin-adjuntos-cero` no discriminaba en el primer pase: se añadió el
caso de un lote de adjuntos que no deja ninguno. `ze-sin-soltar` y
`ze-sin-replicable` tumban dos cada una (la reserva se suelta también cuando
la aceptación retiene; el directorio por defecto y el de otro directorio
dependen del mismo corte).

Cada subsistema que decide un paso llega como dependencia y tiene su fase:
F4d (`C7e`, `nSe`, `kJr`, `fbt`), F4c-2d (`Aot`), F4c-2e (adjuntos),
F4c-2f (`Wkr`) y F6 (la cola de la sesión, `gE`).

## F4c-2f-1 — estado de nombre y colisión: controles

Anulaciones en `anulacion-name-*.txt`; trece, todas discriminan.
`name-sin-numerar` no cae con un rojo: sin el sufijo numérico, el bucle de
nombres libres gira sin fin cuando los dieciséis intentos con slug chocan, y
la anulación se corta con `timeout` (exit 124, anotado en su archivo). Ese
cuelgue es la conducta que el caso de la prueba existe para impedir.

Episodio de método, sin efecto en el árbol: la primera pasada colgó en esa
anulación; al matar el proceso, un `pkill` en bucle mató también la
siguiente (`name-sin-recorte`) y la dio por verde. Se repitieron las dos con
`timeout 30`. El archivo se restauró entero en los dos casos (0 restos de
la anulación, medido con `grep -c`).

## F4c-2d — `session.receive`: controles

Anulaciones en `anulacion-recv-*.txt`; nueve. Dos no discriminaban y se
estrecharon: `recv-sin-atajo` (sin módulos que escuchen, la cadena ni se
llama) y `recv-sin-soltar-al-consumir` (una entrega que llega al núcleo
después de que un manejador la consumió recibe el error de no encolado, en
vez de quedar pendiente para siempre). `recv-sin-una-vez` no discrimina y es
por construcción: una promesa sólo se asienta una vez, así que la guarda de
`done` no cambia ningún desenlace; se porta igual.

El runtime de módulos que ejecuta la cadena (`Ml`, `Vp`, `Xot`, `EH`, `cB` y
los chunks `7g2tbnrf`, `cnp2ghvr`, `ss489drq`, unos 215 KB y treinta
señales) es la serie MOD. `session.receive` lo consume por `HookSite`.

## F4c-2e-0 — predicados de ruta de transferencia: controles

Anulaciones en `anulacion-tps-*.txt`; nueve. `tps-sin-parcial` no
discrimina, y es por construcción: un prefijo parcial de `tt` sólo aparece
cuando el primer segmento es `network` (`zF` no lo produce: `Network` no
está en `wn`), y en ese caso `yN` ya devolvió verdadero antes en `GF`.
Medido con tres rutas, sin testigo. La misma razón cubre la comprobación
de un prefijo completo `/network/`. Se portan igual.

`Mur` toma `linux` como plataforma por omisión, como en la referencia: la
rama de macOS (`GF`) sólo cuenta cuando quien llama la pide.

`@thyrox/permission` depende de `@thyrox/local-observability`, así que los
predicados viven en `permission`, junto a sus primitivas, y los adjuntos
(F4c-2e-1) los reciben inyectados.

Los dos errores de tsc de `permission`
(`__tests__/pathInAllowedWorkingPath.test.ts`, TS2722) son previos: medidos
iguales sobre un worktree de `HEAD`.

## F4c-2e-1 — adjuntos de un par: controles

Anulaciones en `anulacion-f4c2e1-*.txt`; catorce, cada una tumba su caso.
`sin-wx` no discriminaba con la primera suite: ningún caso encontraba un
archivo previo en uploads. Se añadió el que lo encuentra y la anulación
ahora lo tumba.

Dos guardas no tienen testigo, y es por construcción:

- `dot > 0` en `sanitizePeerFileName`: con el punto en la posición 0 y el
  nombre de 16 caracteres o menos, la extensión es el nombre entero y el
  tallo queda vacío, así que el resultado es el mismo con la guarda o sin
  ella; con más de 16, la extensión se descarta en los dos casos.
- el `overLimit` de la lectura acotada: `stat` y `fstat` ya rechazaron un
  archivo mayor que el tope antes de leer. Sólo cuenta si el archivo crece
  entre `fstat` y la lectura, una carrera que la suite no reproduce.

El esquema de la lista (`V`/`Z`, zod en la referencia) se valida a mano:
`local-observability` no depende de zod. El texto del registro de una lista
mal formada no reproduce el de zod; el prefijo y el desenlace sí.

`Mur` entra como dependencia (`processPeerFileDeps(isUnsafeTransferPath)`):
vive en `@thyrox/permission`, que depende de este paquete. `G3` usa el
directorio de uploads de la sesión; el `ujt` de la referencia es el
argumento `override`.

## F4c-2c-1b — patrones de letras parecidas y encabezados: controles

Anulaciones en `anulacion-f4c2c1b-*.txt`; dieciséis, cada una tumba su
caso. `sin-parecido-apertura` no discriminaba con la primera suite: la
clase de apertura ya admite los parecidos de `<`, así que retirar la
normalización sólo se nota en un `>` o una `/` parecidos. Se añadió ese
caso.

El oráculo `probes/differential_confusable_patterns.ts` evalúa los tres
chunks encadenados por sus importaciones (`chunk-vq0drrah.js` →
`chunk-pbnxt79v.js` → `chunk-0grnxhq4.js`) y compara el texto de seis
patrones —`LLo` con la especificación que usa el ejecutable
(`chunk-f31sk9qj.js`)— y la salida de `yJ`, `RUr`, `sf`, `R8e` y de los
patrones aplicados sobre 20 000 entradas: 0 discrepancias
(`diferencial-confusable-patterns.txt`). Discrimina: con cuatro unidores
cambiados a tres, reporta la discrepancia del texto de `LLo`
(`anulacion-f4c2c1b-oraculo-unidores.txt`).

`H` pasa a ser general (`buildTagScrubPattern`) y `Qce`/`CFt` lo usan con
sus parámetros; los oráculos de F4c-2a y F4c-2c-1 siguen en 0.
`HYPHEN_LOOKALIKES` (`B`) vive ahora en `tagClose.ts` y `tagFormScrub.ts`
lo importa.

`sf` necesita `Mz` y `E`, que se portan aquí; el resto de
`chunk-pbnxt79v.js` es la fase F4c-2c-1c.

## F4c-2c-1c — saneadores de texto: controles

Anulaciones en `anulacion-f4c2c1c-*.txt`; catorce, cada una tumba su caso.
`sin-sustituto-marca` no discriminaba con la primera suite: sustituir un
sustituto suelto por `​` antes de quitar ANSI sólo se nota cuando el
sustituto queda ante una secuencia de escape, que al retirarse lo empareja
con lo que sigue. El oráculo lo mostró (480 discrepancias con la marca
retirada, `anulacion-f4c2c1c-oraculo-sustituto-marca.txt`) y se añadió ese
caso, con el valor tomado de la referencia.

El oráculo `probes/differential_unicode_sanitize.ts` compara las 21
funciones de `chunk-pbnxt79v.js` y `chunk-vq0drrah.js` sobre 20 000
entradas: 0 discrepancias (`diferencial-unicode-sanitize.txt`). Los tres
oráculos anteriores siguen en 0 tras mover `sliceUnits` a `stringUnits.ts`.

`@thyrox/mcp-runtime` tenía un porte anterior de `Njr`/`H_` que no retiraba
los sustitutos sueltos; ahora delega, y sus 25 pruebas siguen en verde.

## F4c-2f-2 — flujos de renombre: controles

Anulaciones en `anulacion-f4c2f2-*.txt`; diecinueve, cada una tumba su caso.
`sin-nombre-vigente-vtn` no discriminaba con la primera suite: si el nombre
ya cambió, la segunda comprobación también impide ceder. Lo que la primera
evita es consultar el registro; la prueba ahora cuenta esas consultas.

El oráculo `probes/differential_session_rename.ts` corre `tPt`, `sae` y
`Gkr` de la referencia y el porte sobre el mismo registro falso en 3000
escenarios generados (sesiones vivas con y sin `procStart`, nombre
registrado y su fuente, bandera, fallo del registro, adopciones y
restauraciones concurrentes, `lastYield` y nombre tecleado previos), y en
`Gkr` además ejecuta la primera revisión programada con una sesión nueva que
toma el nombre: 0 discrepancias en nombre, escrituras, aviso de cesión,
nombre tecleado, registros, eventos y contadores. Discrimina: retirada la
retención del sufijo da 728 discrepancias, la guarda de restauración
obsoleta 202 y la revisión de `Gkr` 1764 (`anulacion-f4c2f2-oraculo-*.txt`).

La referencia sólo cuenta como rival a una sesión con `procStart` (`L`); el
primer juego de fixtures no lo traía y la prueba no detectaba ninguna
colisión.

## W-1 — slugs de `words.ts`: controles

Anulaciones en `anulacion-w1-*.txt`; siete, cada una tumba su caso. El
oráculo `probes/differential_words.ts` evalúa `chunk-fvmr4qjr.js` con las
listas de thyrox en lugar de las suyas —las listas son divergencia
declarada de datos— y compara `E$t` y `TDo` sobre 20 000 entradas: 0
discrepancias. Discrimina: sin retirar las marcas de pegado, 10 740
(`anulacion-w1-oraculo-sin-marcas.txt`).

## F4c-2f-3 — aviso de renombre: controles

Anulaciones en `anulacion-f4c2f3-*.txt`; diez, cada una tumba su caso.
`sin-esquema` no discriminaba con la primera suite: la dirección `bridge:`
de la prueba apuntaba a un destino que no era el socket registrado de su
pid, así que la descartaba esa otra comprobación. Ahora apunta al mismo
socket y sólo el esquema la descarta.

`l` y `v` de `chunk-ern0s5ks.js` son `errorMessage` y `getErrnoCode`, ya
portados en `errorHelpers.ts`; `mJ` es `mayBeSameSocket` y `Bf` es
`withholdTokenText`.

## F4c-2f-4a — estado del registro de sesiones: controles

El oráculo extrae la clase `By` de `chunk-t6pwageh.js` [386532, 388790) y le
aplica las mismas secuencias que al porte, con el mismo reloj, sesión y
bandera; compara nombre registrado, anteriores, retenidos, apartados y avisos.

Su primer generador era un LCG en coma flotante: el producto supera 2^53,
pierde bits y cae en un ciclo corto. Con él, ninguna secuencia pasaba de tres
nombres anteriores y el oráculo no discriminaba el tope (`.slice(0, 4)` daba
0 discrepancias). Con mulberry32 (`Math.imul`) las secuencias llegan a ocho y
la misma anulación da 99 de 3000 (`anulacion-registry-oraculo-tope.txt`).

| Anulación | Qué retira | Caen |
|---|---|---|
| `mismo-nombre` | la rama que conserva `since` al repetir el nombre | 1 |
| `held-set` / `held-delete` | registrar y liberar el nombre retenido | 2 / 1 |
| `umbral` | los 10 s mínimos para recordar un nombre anterior | 2 |
| `derivado` / `estable` | la exclusión de `derived` y su excepción por `Nq` | 1 / 1 |
| `tope-anteriores` / `filtro-anteriores` | el tope de tres y el retiro del nombre nuevo de la lista | 1 / 1 |
| `borra-vivo` | olvidar el apartado de la conversación viva | 1 |
| `tope-conversaciones` / `keepid` / `reinsercion` | el tope de ocho, la conversación protegida y el reordenado | 1 / 1 / 1 |
| `memo` | la memoización del sondeo de barrido | 1 |
| `registrado` | esperar al alta en curso en `Cut` | 1 |
| `emit-cambio` / `launched` | el aviso sin cambio de nombre y el `givenAtLaunch` heredado | 1 / 1 |

## F4c-2f-4b — archivo pid del registro: controles

`ud` (`Vk()==null && !kFe()`) lee el contexto de equipo y la marca de sesión
hija, que viven en `@thyrox/swarm`; ese paquete depende de éste, así que la
sonda se instala desde fuera (`setRegistryOwnershipProbe`) y su porte es
F4c-2f-4g.

| Anulación | Qué retira | Caen |
|---|---|---|
| `cadena` | encadenar la escritura siguiente detrás de la anterior | 1 |
| `try-catch` | que un fallo de lectura o de JSON se registre y no rompa la cadena | 5 |
| `mezcla-local` | mezclar el parche sobre el registro leído | 8 |
| `storage-lectura` / `storage-encontrado` / `storage-escritura` / `en-sitio` | las tres salidas de la rama de storage y la escritura en su sitio | 1 / 1 / 1 / 1 |
| `nombre-vacio` / `ud-ef` / `aviso` / `anteriores` | el nombre vacío, el éxito cuando el registro no es propio, el nivel del aviso y omitir la lista vacía | 1 / 1 / 1 / 1 |
| `espera-alta` / `derivado` / `auto-distinto` | esperar al alta y las dos condiciones de sustitución | 1 / 4 / 1 |
| `revierte` / `revierte-ajeno` / `revierte-held` / `revierte-former` / `revierte-emit` | la vuelta atrás, su guarda y sus tres efectos | 1 cada una |
| `hora-estado` / `deja-reserva` / `wy-publicado` / `ud-kce` / `rd` / `wy` / `sonda` | la hora del estado, la salida de reserva, su condición de publicado, el éxito ajeno, la guarda de `rD`, el `clearInterval` y el instalador de la sonda | 1 cada una |
| `vacio-rut` | la guarda de nombre vacío de `Rut` | 0 — redundante por construcción: `eF` rehúsa el nombre vacío antes de tocar el estado, y sin cambio de estado no hay vuelta atrás |

## F4c-2f-4c-1 — latido del tablero: controles

| Anulación | Qué retira | Caen |
|---|---|---|
| `absent-code` / `absent-tel` / `touch-calla` | reconocer el padre ausente y callarlo | 1 / 1 / 1 |
| `touch-catch` / `touch-local` / `remove-local` / `remove-storage` | registrar la excepción y las dos escrituras y borrados | 1 cada una |
| `cache-edad` / `cache-local` / `cache-storage` / `guarda-local` | la vigencia de un segundo, usarla en las dos formas y guardarla | 3 / 1 / 1 / 1 |
| `fresco-local` / `enoent` / `notfound` | la edad de cinco segundos y callar la ausencia en archivo y en storage | 1 cada una |
| `hora-despues` / `no-pisa` | medir con la hora de después y no pisar una medida más nueva | 1 / 1 |

## K — catálogo de claves del storage: controles

El chunk no importa nada, así que el oráculo lo evalúa entero y compara las
reglas de nombre sobre 20000 nombres generados (con puntos, espacios, dos
puntos, separadores, NUL y los sufijos de apartado, temporal y `.jsonl`) y
los constructores con su forma canónica sobre 20000 claves; las excepciones se
comparan por tipo, porque su mensaje nombra la variable local. Anulado el
recorte del espacio final, el oráculo da 911 discrepancias
(`anulacion-storagekeys-oraculo-espacio.txt`).

| Anulación | Qué retira | Caen |
|---|---|---|
| `recorte` / `dos-puntos` / `minusculas` / `congelado` / `cache` / `tope` | las variantes de nombre, su congelado, su caché y su tope | 3 / 3 / 3 / 1 / 1 / 1 |
| `seg-*` / `segs-vacio` | cada condición de un segmento válido y la lista vacía | 1 cada una |
| `opcional` / `journal` / `sessionjournal` / `copia` / `meta` / `hwm` / `capa-user` / `borrador` / `relpath` / `vuo` | los campos opcionales y cada rama con alternativa de la forma canónica | 1 cada una |
| `punto-inicial` | el atajo de `qBt` para nombres sin punto inicial | 0 — redundante por construcción: la expresión de apartado exige `^\.`, y ninguna variante (minúsculas, recorte del final, prefijo antes de `:`) añade un punto al principio |

## F4c-2f-4e — tipo de sesión: controles

Una anulación por condición de cada predicado (`bg` tumba 5 porque todos
parten de `oJ`), más las dos de `qKn` —segmento válido y colgar directamente
de la raíz de trabajos— y el instalador del anfitrión: cada una cae en su
caso (`anulacion-sessionkind-*.txt`), ninguna en cero.

## F4c-2f-4c-2 — sesión de reserva: controles

Cada condición de `jy` (directorio, backend, storage presente, clave del
trabajo, las tres salidas del `statMeta`, su excepción y la ausencia en disco)
y cada paso de `sD`/`iD` (no solaparse, sondeo ya detenido, marca en curso,
liberar sólo lo reclamado, detener sólo lo liberado, soltar la marca, `unref`,
el intervalo y guardar el temporizador) cae en su caso. `con-storage` y
`reclamado` no discriminaban en la primera versión de la suite; se añadieron
el caso de backend activo sin storage y el de una reserva sin reclamo con su
archivo pid presente.

## E — entrypoints y anfitrión: controles

El oráculo evalúa el chunk con sus importaciones sustituidas: `a` lee el
mismo entorno generado con el nombre `THYROX_CODE_*` y el intérprete que el
ejecutable declara para cada variable (`str` recorta y trata vacía como
ausente; `bool` sólo acepta 1/true/yes/on; `triBool` distingue además el
falso declarado), `q`/`j` dan un anfitrión propio por escenario, y `Te`/`dR`
salen del escenario. En cada uno corre `NUo` en los dos lados y compara el
entorno resultante (las normalizaciones de `D`) y los 32 predicados exportados,
más `P6`, `l`, `i1t`, `xUo` y `$Uo`. El nombre del anfitrión se compara sin la
marca, que el porte sustituye por la del producto. Anulada la excepción del
editor en `P6`, el oráculo da 198 discrepancias
(`anulacion-entrypoint-oraculo-vscode.txt`).

Anulaciones de la suite unitaria: una por variable y por rama de `D` y `NUo`,
el recorte de `str`, la lista de conocidos, la marca del nombre, y las dos
condiciones de `P6`. `gestionado` no discriminaba en la primera versión; se
añadió el caso con `THYROX_CODE_PROVIDER_MANAGED_BY_HOST` apagada.

## F4c-2f-4c-3 — alta en el registro: controles

Una anulación por paso del alta (propiedad del registro, cadena de
escrituras y su liberación, reserva y su reclamo, nombre de lanzamiento y su
saneado, salida y limpieza en las dos formas, modo del directorio, nombre
derivado sólo en interactiva, cada campo condicional del registro, escritura
en su sitio y su fallo, `registered`, sondeo, no pisar un nombre, `givenAtLaunch`,
sesión viva), una por rama de la adopción (dirección estable, motivo,
contador, apartar, apartar con sesión viva, restaurar, sólo cambiar de
sesión, publicar la sesión y el aparcado), las tres del cambio de directorio,
`KNt`, y las de `lD`, `QM`, `ZM`, `QKn` y `xy`. `reserva`, `modo` y `trabajo`
no discriminaban en la primera versión; se añadió el caso de una sesión
interactiva con `THYROX_BG_SOURCE=spare` y `THYROX_JOB_DIR` sobre un
directorio ya existente en 0755.

### Controles de la fase S

`bun test src/bootstrap/__tests__/sessionSignals.test.ts` en `@thyrox/app-host`, 10 casos.
Cada anulación deja su salida en `anulacion-S-<nombre>.txt`; entre paréntesis, los casos que caen:
motivo (4), clear (1), rutas (1), aviso-cwd (1), orden (1), set-aviso (2), nfc-rutas (1),
desuscribir-cwd (1), siempre-cwd (1), slug-condicion (1), raiz (1), cwd (1).

| Fase | Qué | Estado |
|---|---|---|
| R | enclavamiento del modelo de respaldo por rechazo (`refusalFallbackModelLatch`, `unlatchRefusalFallbackModel`, `mn`) en la selección de modelo, y su restauración como tercer argumento de la señal de sesión → `app-host/src/bootstrap/state.ts`. Redundante por construcción: `a2r` (sin enclavamiento, las dos formas dejan `undefined`) | hecha: 16 pruebas; 13 anulaciones (`anulacion-R-*.txt`) |
| R-2a | oyentes de la restauración con dependencias inyectadas: `wt` sobre el estado de la aplicación, `sA`, `Pyt` con el evento `tengu_refusal_fallback_latch_reset` y `b8r` (`chunk-6ff16z73.js`) → `app-host/src/state/refusalFallbackRestore.ts`. Redundante por construcción: `aviso` (`sA` ya normaliza con `!!`) | hecha: 12 pruebas; 14 anulaciones (`anulacion-R2a-*.txt`) |
| R-2b-0 | consulta de capacidades de modelo (`$h`, `UYe` con `THYROX_CODE_MODEL_CAPABILITIES`, `qFt`, `MBr`, `P`/`L`, `h`, `ENo`, `kNo`, `chunk-4h0c4z04.js`) → `agent/modelCapabilities.ts`, sobre el catálogo `MODELS` | hecha: 11 pruebas; 17 anulaciones (`anulacion-R2b0-*.txt`) |
| R-2b-1 | puertas del modo rápido: `mo` (primera parte y cualquier valor de `THYROX_CODE_DISABLE_FAST_MODE` lo apaga) y `qy` (capacidad `fast_mode` y, si no consta, Opus 4.8 / Opus 5 por el nombre) en `provider/src/fastMode.ts` | hecha: 8 pruebas; 8 anulaciones (`anulacion-R2b1-*.txt`) |
| R-2b-2 | disponibilidad del modo rápido sobre un contexto explícito: `gL`, `aC`, `$g`, `Wg`, `D5`, `Bk`, `Yi`, `Yg` → `provider/src/fastModeAvailability.ts`. Redundantes por construcción: `unknown-oauth` (`$g('unknown')` no depende del tipo de autenticación) y `bk` (`gL` ya devuelve causa con el modo rápido apagado) | hecha: 14 pruebas; 27 anulaciones (`anulacion-R2b2-*.txt`) |
| R-2b-2b | contexto de disponibilidad desde el proceso (`processFastModeAvailabilityContext`: `Vr`→`isModelAllowed`, `Rte`, `K$` por el catálogo, preferencias por origen, `Te`/`ijt`→`preferThirdPartyAuthentication`, `uc`/`Iz`); `getFastModeUnavailableReason` pasa a ser `D5` y se retira `getDisabledReasonMessage` | hecha: 6 pruebas; 9 anulaciones (`anulacion-R2b2b-*.txt`) |
| R-2b-2c | `eo` (`Ndt`, `dqn`, `Vi`, `U6e`: claims del token de una sesión de trabajo remota), que completa `remoteManaged` | pendiente |
| R-2b-2d | créditos de uso en el mensaje de `extra_usage_disabled` (`_6e`, `M5`, `hy`, `Ex`, `DC`, `c2o`, `Run`, `nqn`, `dKn`) | pendiente |
| R-2b-5 | ciclo de vida del estado de la organización de 2.1.283 (`Vg`: `replaceOrgStatus`, `$Oo` con su guarda de origen, `source: 'server'` al leer del servidor, avisos de créditos agotados, rechazo por excedente `lC`) | pendiente |
| R-2b-3 | `Yl` (preferencia con opt-in por sesión), `Ndn`, `oA`, `Dt` (espacio remoto), `Ea` (canal de control remoto) | pendiente |
| R-2b-4 | modelo y nombre visible del modo rápido (`Rte`, `K$`); 2.1.283 ya no tiene la anulación a Opus 4.6 que `getFastModeModel` y `agent/prompts.ts` conservan | pendiente |
| R-2c | alcance del modelo de respaldo (`vV`: `ahe`, `$h`/`Be` con `refusal_fallback`, `MNe`, `Tle`, `$5`, `izn`) | pendiente |
| R-2d | cableado: `Pyt` sobre el `setState` del almacén del REPL y `b8r` en el modo headless (olvida el modelo pedido por el usuario), con las dependencias de R-2b y R-2c | pendiente |

### Fase C — el módulo cliente y de recibos (`chunk-qcy58j4w.js`)

| Fase | Qué | Estado |
|---|---|---|
| C-0 | estado de mensajería por anfitrión (`ti`, `g`, `o`, `d`, `l`, `a`, `u`, `p`, `m`, `i`, `t`, `f`, `chunk-s7j2aven.js`) y colas por clave (`Fm`) → `uds/messagingState.ts`. Redundantes por construcción: `sin-id` y `wrote-id` (cada guarda sola impide que una entrada sin `msg_id` se reconozca) y `vacio` (retirar un buzón vacío sólo libera memoria) | hecha: 10 pruebas; 15 anulaciones (`anulacion-C0-*.txt`) |
| C-1 | admisión de pares (`LRr`, `csn`, `ke`, `Cko`, `H`, `M`, `B`, `_e`), aviso de descartes (`URr`, `Ee`, `Rko`, `X`), límites por bandera (`zOt`) y ritmo de salida (`ie`) | pendiente |
| C-2 | lectura del registro para pares (`F`, `Z`, `Ge`, `Je`, `KOt`, `YOt`, `G3o`, `we`, `D3`, `ee`, `Y`, `qRr`, `XOt`, `VRr`, `qe`, `q`, `qOt`, `zRr`, `V`, `ne`) | pendiente |
| C-3 | envío (`Pe`, `ye`, `VOt`, `kee`, `iat`), errores (`ce`, `fe`, `j`, `MV`, `cG`, `Mae`, `A1n`, `C1n`, `R4e`, `x4e`, `I4e`, `dsn`), redacción (`Bf`, `TB`), recibos (`Xe`, `ze`, `WRr`, `GRr`), ritmo (`je`, `We`, `jRr`, `R1n`, `Se`), fichas propias (`$Rr`, `GOt`, `FRr`), `DV`, `K`, `Ako`; reemplaza el `udsClient.ts` provisional | pendiente |

### Controles de la fase R

`bun test src/bootstrap/__tests__/refusalFallback.test.ts` en `@thyrox/app-host`.
Casos que caen por anulación: cadena (1), vigente (1), restaura-switch (1),
olvida-switch (1), restaura-clear (1), olvida-clear (1), dos-args (3, tras
exigir la longitud: `toEqual` ignora un `undefined` final), origen (1),
explicito (1), fija (4), suelta (2); `a2r` (0) es redundante por construcción.

### Controles de la fase R-2a

`bun test src/state/__tests__/refusalFallbackRestore.test.ts` en `@thyrox/app-host`.
Casos que caen: igual (3), origen (2), remoto (1), orden (1), habilitado (1),
intacto (1), sin-actualizador (1), override (1), pyt-guarda (2), alcance (1),
motivo (1), explicito (1, tras añadir el caso sin override previo), b8r (1);
`aviso` (0) es redundante por construcción.

### Controles de la fase R-2b-0

`bun test __tests__/modelCapabilities.test.ts` en `@thyrox/agent`. Casos que
caen: sufijo (4), vacio (1, tras exigir que un patrón vacío no case con un
modelo vacío), asterisco (1), no-coincide (1), negacion (4), ultima (1),
env-model (1), catalogo-sufijo (1), gate (2), gate-true (1), servido (1),
servido-gate (1), servido-args (1), catalogo (3), catalogo-niega (2), orden (1).

### Controles de la fase R-2b-1

`bun test src/__tests__/fastModeModelSupport.test.ts` en `@thyrox/provider`.
Casos que caen: primera-parte (1), cualquier-valor (1), capacidad (2),
canonico (1), opus-5 (1), opus-48 (1), minusculas (1), habilitado-qy (1).
La expectativa de la consulta servida se deriva de `parseUserSpecifiedModel`:
otra prueba del mismo proceso deja activo el sufijo `[1m]`.

### Controles de la fase R-2b-2

`bun test src/__tests__/fastModeAvailability.test.ts` en `@thyrox/provider`.
Cada anulación cae en uno o dos casos, salvo `unknown-oauth` y `bk` (0,
redundantes por construcción); `extra` cae en 1 tras añadir el caso con
instrucción de créditos.

### Controles de la fase R-2b-2b

`bun test src/__tests__/fastModeProcessContext.test.ts` en `@thyrox/provider`.
Casos que caen: omision-org (1), omision-red (1), resolver (1, tras fijar
`ANTHROPIC_MODEL` para separar el modelo del bucle del de la configuración),
modelo-rapido (1), remoto (1), cowork (1, tras el caso remoto fuera de
cowork), proveedor (2), habilitado (2), d5 (1). Cambio de conducta: con el
estado de la organización pendiente, el modo rápido deja de estar disponible
hasta que el prefetch lo resuelva, como en la referencia.
