# F7e/F7f (primera parte): comandos TPROXY y el paquete `@thyrox/transparent-napi`

- `port_test.sh` — convierte una prueba de la referencia (`node:test`) a
  `bun:test` para thyrox; con ella se portaron `tproxy-commands` y
  `tproxy-setup`.
- `@thyrox/transparent-napi` — `native/transparent.c` y `binding.gyp` de la
  referencia, `src/build.ts` (compila con `cc` contra los encabezados locales
  de N-API en vez de `node-gyp`, que los descarga), el `.node` vendorizado para
  x64-linux y el cargador con `require` literal.
- `probe-socket-fd.ts` / `.txt` y `probe-listen-fd.txt` — Bun no adopta un
  descriptor de socket: `listen({ fd })` lanza y `net.Socket({ fd })` queda
  cerrado. Es H-THYROX-233; el puente en C que lo resuelve es la tarea #122.
- `annul.sh` / `results.txt` — cinco anulaciones, cada una tumba sólo lo suyo.
  El revert al revés tumba también la prueba de revert tras fallo, que afirma
  el primer comando del revert.

## El puente en C (tarea #122)

`transparent.c` gana `startTransparentBridge`, `startMarkedEgress`,
`stopRelay` y `relayStats`; `src/proxyHeader.ts` lee y escribe la cabecera
PROXY v1 del lado de Bun. `annul-bridge.sh` / `results-bridge.txt` recompilan el
`.node` por cada anulación y lo restauran:

| Anulación | Cae |
|---|---|
| el puente no escribe la cabecera | la del puente (Bun espera la cabecera y agota el plazo) |
| la salida no pone SO_MARK | la de la salida marcada (`lastUpstreamMark` queda en 0) |
| `stopRelay` no cierra el socket | «detenido el puente, su puerto deja de aceptar» |
| la salida acepta cualquier línea | la de cabecera inválida (`rejectedHeaders` en 0) y la de salida válida, porque sin analizar la cabecera tampoco hay destino |

La primera versión de la prueba de cabecera inválida sólo miraba que la
conexión se cerrara, y no discriminaba: cualquier camino de fallo la cierra.
El contador `rejectedHeaders` mide el rechazo mismo.
