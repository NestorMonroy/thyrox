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
| F4c-2b | sobre `cross-session-message` y direcciones de pares (`chunk-q8a07cv0.js`) | pendiente |
| F4c-2c | `ze`/`Oe`/`aEn`: entrega de un `user` a la cola, con sus dependencias inyectadas | pendiente |
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
