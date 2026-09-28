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
| F2c | orquestación de `mn` | pendiente |
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
