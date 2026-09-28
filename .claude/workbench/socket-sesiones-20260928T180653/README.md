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
| F2 | servidor `mn`: bind, socket vivo, permisos, respaldo, apagado | pendiente |
| F3 | autenticación: tokens, clave en el registro de sesiones | pendiente |
| F4 | protocolo y entrega del sobre cross-session-message | pendiente |
| F5 | cliente `uds:<ruta>` y descubrimiento de pares | pendiente |
| F6 | cableado de setup, bandera y variable exportada | pendiente |

*Ciega a:* `bin/binary literal 'uds-messaging'` da 0 aunque la cadena está
en `mn`: el literal vive dentro de una plantilla, y `literal` no la ve
(`censo.txt`).
