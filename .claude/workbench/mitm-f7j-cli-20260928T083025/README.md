# F7j — `thyrox mitm` en la CLI

## F7j-1 — registro del subcomando, servir la API y su ciclo de vida

`src/packages/cli/src/commands/mitm-commands.ts`:

- `mitmServe(port, deps)` arranca `startMitmApi` sobre el store del MITM y el
  búfer global, anuncia la URL, sirve hasta que llega la señal de parar y al
  parar detiene la API —que retira el destino de ingesta— y cierra el store.
  Un puerto que no es un entero de 0 a 65535 rehúsa con exit 2 sin abrir nada.
- `mitmCommand(argv)` es el manejador de la tabla de modos: `mitm` como
  primera palabra selecciona el modo (gana sobre cualquier bandera) y el
  verbo es la segunda. Uno desconocido rehúsa nombrando los válidos.
- `registerMitmCommands(program)` lo cuelga del programa Commander completo.

La CLI tiene dos entradas: `runCli`, la de `bin/cli`, con la tabla de modos, y
`runClaudeCode`, el programa completo con Commander. `mitm` se registra en las
dos sobre la misma función: dos registros, una lógica. El primer intento
registró sólo en Commander, y `bin/cli mitm serve` imprimió la ayuda; lo
destapó correr el lanzador real, no una prueba unitaria.

La prueba de proceso real lanza `bin/cli mitm serve --port 0`, espera el
anuncio y comprueba que SIGTERM termina con 0.

Anulaciones (`annul-f7j1.sh`, `results-f7j1.txt`): las siete discriminan.

## F7j-2 — verbos de estado sobre la API en proceso

`src/packages/cli/src/commands/mitm/`:

- `inProcessApi.ts` monta las mismas rutas que `serve` sobre el store abierto
  y responde sin abrir puerto: los verbos de estado no exigen una API en
  marcha, porque sólo leen y escriben el store.
- `stateVerbs.ts` traduce cada verbo a su petición —`status`, `agents`,
  `agent <id>`, `detect <id>`, `mappings [--set origen=destino]`,
  `bypass [list|set|remove]`, `config export|import <archivo>`—; un argumento
  que falta o no tiene forma rehúsa con exit 2 sin llamar a la API.
- `verbResult.ts` imprime el JSON de la respuesta, y un rechazo de la API sale
  con exit 1 y su mensaje.

`mitmCommand` y el programa Commander cuelgan los mismos verbos de la misma
tabla (`STATE_VERBS`), y cada verbo cierra el store al terminar.

Anulaciones (`annul-f7j2.sh`, `results-f7j2.txt`): las ocho discriminan; cada
una tumba exactamente su caso, y el árbol restaurado vuelve a 16/0.

## F7j-3 — verbos privilegiados sobre la API publicada

El servidor MITM es un proceso hijo de quien lo arranca; una CLI de vida corta
se lo llevaría al salir. Por eso los verbos privilegiados —`start`, `stop`,
`restart`, `trust-cert`, `regenerate-cert`, `cert`, `untrust-cert`,
`dns <id> on|off`, `reset <id>`, `repair`, `diagnose`, `upstream-ca`,
`tproxy`— no montan la API en proceso: van por HTTP a la que sirve
`thyrox mitm serve`, que es la dueña del hijo.

- `apiEndpoint.ts`: `serve` publica su URL en `api.url` del directorio de
  datos (modo 0600) al arrancar y la retira al parar.
- `privilegedVerbs.ts`: traduce cada verbo a su petición; sin URL publicada
  rehúsa con exit 2 nombrando `thyrox mitm serve`.
- `stdinSecret.ts`: la contraseña de sudo es la primera línea de stdin
  (`--sudo-password-stdin`); `--sudo-password` en argv se rehúsa, porque ahí
  queda a la vista de `ps` y del historial.

La prueba del lanzador real corre con `THYROX_MITM_DATA_DIR` propio: sin él,
publicaría la URL en el directorio de datos del usuario.

Rojo persistido en `red-f7j3.txt`. Anulaciones: `annul-f7j3.sh`,
`results-f7j3.txt`.

## F7j-4 — `thyrox mitm inspect` sobre la API publicada

El búfer de tráfico vive en el proceso de `serve`: una CLI de vida corta no
tiene uno propio que leer. Los verbos del inspector van, como los
privilegiados, a la API publicada; `publishedApi.ts` es el rechazo común de
los dos cuando no hay ninguna.

`inspectVerbs.ts` traduce cada verbo a su petición:

| Verbo | Petición |
|---|---|
| `requests [--profile --host --agent --status --source --session]` | `GET /requests?…` |
| `clear` · `show <id>` · `annotate <id> <texto…>` · `replay <id>` | `DELETE /requests` · `GET` · `PUT …/annotation` · `POST …/replay` |
| `export-har [filtros]` | `GET /export.har?…` |
| `sessions [start [nombre] \| show \| stop \| rename \| delete \| export-har <id>]` | `/sessions…` |
| `hosts [add <host> [--label --kind] \| enable \| disable \| remove <host>]` | `/hosts…` |
| `capture-modes [http-proxy start\|stop \| system-proxy apply [--port --guard-minutes]\|revert \| tls-intercept on\|off]` | `/capture-modes…` |

Las opciones salen de tablas cerradas: una desconocida o sin valor es error de
uso, no un filtro que se ignora en silencio. Los segmentos de ruta se
codifican (un id con `/` no escapa a otra ruta).

`liveTail.ts`: `tail` abre el websocket del canal en vivo y escribe una línea
JSON por evento —`snapshot` al abrir, luego `new`/`update`/`clear`— hasta la
señal de parar o el cierre del canal.

Una respuesta 204 (`clear`, borrar una sesión o un host) no imprime nada: el
`null` que salía antes no decía nada que el código de salida no dijera.

Rojo persistido en `red-f7j4.txt`. Anulaciones: `annul-f7j4.sh`,
`results-f7j4.txt`.
