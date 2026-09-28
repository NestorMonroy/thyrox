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
