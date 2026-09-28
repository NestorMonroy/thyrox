# F7e-2 — TPROXY contra el kernel real

## Entorno medido (2026-09-28)

- `unshare --net` crea un espacio de red propio: su inodo de red difiere del
  del anfitrión.
- `iptables` (1.8.10, nf_tables) y `nsenter` presentes; una regla de
  `mangle OUTPUT` añadida dentro del espacio no aparece en el del anfitrión.
- `ip` (iproute2) ausente: lo pide F7e-2a con `THYROX_INSTALL_IPROUTE2=1`.

## F7e-2b — un espacio de red propio para las órdenes

`src/tproxy/networkNamespace.ts`: `openNetworkNamespace()` lanza
`unshare --net -- sleep infinity`, espera a que su espacio de red deje de ser
el nuestro, y da un `CommandRunner` que entra con
`nsenter --net=/proc/<pid>/ns/net`, el mismo contrato que
`applyTproxy`/`revertTproxy` ya aceptan. `close()` termina el proceso y con
él el espacio.

Anulaciones (`annul-f7e2b.sh`, `results-f7e2b.txt`): las cuatro discriminan.
La primera quita el aislamiento y por construcción escribe en el anfitrión;
el guion retira esa regla con un `trap` al salir, y se comprobó el
`mangle OUTPUT` del anfitrión vacío después.

En la primera ejecución dos no discriminaban:

- **la espera a que exista el espacio**: con un `unshare` rápido la carrera
  nunca se perdía. Se añadió el caso con un `unshare` lento (0.3 s).
- **el error de arranque guardado**: era redundante con la rama de pid
  ausente. Se retiró; esa rama espera el evento `error` y lo nombra.

## F7e-2c — las reglas TPROXY reales, aplicadas y revertidas

`__tests__/tproxy/realTproxyRules.test.ts` corre `applyTproxy` y
`revertTproxy` —sin cambiar una línea de ellos— contra el kernel real,
dentro de un espacio de red de F7e-2b. `ip` se instaló con el instalador de
F7e-2a (`THYROX_INSTALL_IPROUTE2=1`, iproute2 6.1.0; el éxito se comprobó
re-leyendo el binario).

Lo que la prueba comprueba: el apply deja la marca en `mangle OUTPUT` con la
exclusión de la marca propia, el TPROXY en `mangle PREROUTING`, la regla
`fwmark 0x11 lookup 117` y la ruta `local default dev lo table 117`; el
revert devuelve el espacio a su estado previo; un apply que falla en su
último paso no deja nada; y el anfitrión no cambia en ningún momento.

Una lectura de la prueba se corrigió en la primera ejecución:
`ip route show table 117` sale con error si la tabla aún no existe, así que
se lee `table all` y se filtran las filas de la 117.

Anulaciones (`annul-f7e2c.sh`, `results-f7e2c.txt`): las cinco discriminan.
Retirar del revert la regla de política o la ruta local tumba dos casos cada
una (el revert y el apply a medias), porque los dos pasan por el mismo
revert.

## F7e-2d — la captura de extremo a extremo, con descifrado

`__tests__/tproxy/tproxyCaptureEndToEnd.test.ts` lanza con `nsenter`, dentro
de un espacio de red propio, `fixtures/captureInNamespace.ts`. El fixture:

- levanta un upstream HTTPS en `10.77.0.1:443`, con una CA propia que el
  proceso confía vía `NODE_EXTRA_CA_CERTS`;
- arranca la captura TPROXY real con descifrado (`startTproxyCapture`: reglas
  reales, puente transparente y salida marcada del nativo);
- hace una petición HTTPS a `10.77.0.1` con SNI `api.example.test`, confiando
  sólo en la CA de la sesión.

Comprueba que el cliente recibe la respuesta del upstream, que la conexión se
interceptó una vez y que el búfer registra `POST api.example.test
/v1/messages 200`.

### Dos hallazgos al medir

1. **El primer rojo era de la prueba.** `https.request` de Bun va sobre
   `fetch` y construye la URL con la cabecera `Host`: intentaba resolver
   `api.example.test` por DNS y recibía «refused» sin abrir TCP. Medido con
   `probes/capture-diagnostics.ts`: 2 paquetes de 50 bytes en `mangle OUTPUT`,
   ninguno TCP 443. El cliente pasó a `tls.connect` a la IP con SNI y una
   petición HTTP escrita, que es lo que pone en el cable un agente cuyo DNS ya
   resolvió.
2. **El segundo era del motor.** Con el cliente arreglado, la captura
   funcionaba entera, pero la conexión quedaba abierta aunque el cliente pidió
   `Connection: close`: RFC 9112 §9.6 obliga al servidor a cerrarla tras la
   respuesta final, y un cliente que lee hasta el cierre se queda esperando.
   `handleDecryptedRequest` responde ahora con `Connection: close` y cierra el
   socket al terminar, y ya no copia al cliente la cabecera `connection` del
   upstream, que es de salto a salto.

Anulaciones (`annul-f7e2d.sh`, `results-f7e2d.txt`): las cinco discriminan.
La tercera —la `connection` del upstream copiada— no tenía caso en la primera
ejecución; se añadió en `tlsCapture.test.ts`.
