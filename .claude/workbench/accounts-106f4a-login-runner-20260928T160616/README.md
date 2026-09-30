# #106f-4a — corredor de inicio de sesión OAuth

Porte de `runCallbackFlow`, `runDeviceFlow` y `runImportFlow`
(`omniroute: bin/cli/commands/oauth.mjs`) y de las acciones `exchange`,
`device-code`, `poll` e `import-token` de
`src/app/api/oauth/[provider]/[action]/route.ts` (MIT).

- `red-106f4a.txt`: la mitad roja.
- `annul-106f4a.sh`: 28 anulaciones; `rerun-106f4a.sh` repite dos afinadas.
- `results-106f4a.txt`: las dos pasadas.

Divergencias con la referencia:

- Lo que allí hace el servidor —callback, intercambio, sondeo y
  persistencia— aquí lo hace el mismo proceso; no hay retorno a un flujo
  manual porque el callback siempre es local.
- El `state` del callback se compara en tiempo constante y un desacuerdo
  rechaza antes de intercambiar el código.
- `ghe-copilot` no recibe todavía la URL de su servidor como dato extra del
  sondeo: el verbo `login` no la declara.
