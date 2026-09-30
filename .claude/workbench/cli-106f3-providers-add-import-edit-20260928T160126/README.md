# #106f-3 — `thyrox providers add|edit|import`

Porte de `buildProviderPayload`, `resolveProviderCredential`,
`redactProviderResponse`, `runProviderAddCommand`, `runProviderEditCommand` y
`runProviderImportCommand` (`omniroute: bin/cli/commands/provider-crud.mjs`),
MIT, más un prompt oculto propio (`secretPrompt.ts`).

- `red-106f3*.txt`: la mitad roja de las suites.
- `annul-106f3.sh`: 39 anulaciones; `rerun-106f3.sh` repite la 38.
- `results-106f3.txt`: las tres pasadas.

Divergencias con la referencia:

- `--credential <valor>` se rehúsa: un secreto en la línea de órdenes queda en
  el historial y en `ps`. Quedan `--credential-env`, `--credential-stdin` y el
  prompt oculto, que sólo se ofrece con una terminal delante.
- El store es local: no hay servidor al que pedir el alta ni verificación
  posterior contra él.
- Un resultado de `import` nombra la conexión creada (`connectionId`) y su
  ensayo se marca `would_create`; las existentes se saltan también en el
  ensayo.
- Lección de la anulación 38: una prueba que espera un rechazo tiene que
  acotar la espera, o sin la rama que rechaza se cuelga en vez de fallar.
