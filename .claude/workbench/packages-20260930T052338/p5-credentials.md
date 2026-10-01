# p5-credentials

## [243] TASK-THYROX-0494 — Credenciales C1 — generador de THYROX_STORAGE_ENCRYPTION_KEY

Status on board: in_progress

TDD. Un bin del paquete provider que genera una clave aleatoria y la escribe en el .env ignorado sin imprimirla. Rehúsa rotar una clave existente, porque dejaría huérfanas las conexiones cifradas (fieldCipher.ts, AES-256-GCM con clave derivada por scrypt). Control: si la clave existe, el archivo no cambia y sale con código distinto de 0; la clave nunca aparece en stdout ni en stderr.

## [244] TASK-THYROX-0495 — Credenciales C2 — el store de conexiones como fuente de resolveCredential

Status on board: in_progress

TDD. Añadir «conexión del store» a la cadena de @thyrox/provider/credentials.ts, después de las variables. Así thyrox -p y provider-credential-proxy usan una conexión cifrada de provider_connections. Rehúsa con causa, sin degradar a none, si la clave de cifrado falta o no descifra (caso real: la conexión openai 70913bb3).

## [245] TASK-THYROX-0496 — Credenciales C3 — proceso del proxy local y cableado en headless-pool

Status on board: pending

TDD. Un bin que levanta startProxyServer (provider/src/proxy/startServer.ts) con las credenciales del store, y la opción del pool para lanzarlo y entregar a cada ítem su socket o URL sin credencial en el entorno del ítem. Complementa --credential-proxy, no lo reemplaza.

## [246] TASK-THYROX-0497 — Credenciales C4 — alta de una credencial Anthropic: providers add y login claude

Status on board: pending

TDD. `thyrox providers add anthropic` con una clave de API guardada cifrada; `providers login claude` exige THYROX_CLAUDE_OAUTH_CLIENT_ID, que declara el consumidor y nunca se publica. Después, test/validate contra el proxy local. Depende de C1.

## [247] TASK-THYROX-0498 — Credenciales C5 — upstream claude-cli en el proxy local, con tool_use de ida y vuelta

Status on board: pending

Decisión del ejecutor 2026-09-29: todo pasa por el proxy. Es un upstream del proxy que atiende /v1/messages dentro de un entorno claude sin credencial propia, lanzando `claude -p`. Restricción medida: claude ejecuta sus propias herramientas y no devuelve tool_use al cliente. Por eso las tools de la petición se exponen a claude como un servidor MCP puente: cuando claude invoca una, el puente suspende, el proxy responde al cliente con ese tool_use (stop_reason tool_use), y la siguiente petición, con el tool_result, reanuda la misma conversación (--session-id por conversación, afinidad por prefijo con session_cache). En TDD por subfases: C5a, petición sin tools → texto; C5b, puente MCP que devuelve el tool_use; C5c, reanudar con tool_result; C5d, stream SSE.

## [248] TASK-THYROX-0499 — Credenciales C6 — elegir la fuente de credencial en el pool

Status on board: pending

TDD. Cómo decide headless-pool entre el entorno de claude (sin credencial, máscara), el proxy con credencial del entorno (--credential-proxy) y el proxy con credenciales del store (C3). Cada rama se declara y la salida del pool dice cuál usó; ninguna cae a otra en silencio.

## [249] TASK-THYROX-0500 — Credenciales C7 — la máscara de thyrox -p pasa por el proxy, no por claude -p directo

Status on board: pending

Decisión del ejecutor 2026-09-29: todo pasa por el proxy. printDelegation.ts hoy delega en `claude -p` directamente cuando no hay credencial. Tras C5, en esa condición thyrox -p apunta su provider http al proxy local (upstream claude-cli) y el bucle propio de thyrox ejecuta las herramientas. La delegación directa se retira sólo cuando C5a–C5c estén en verde. En TDD: con proxy disponible se usa el proxy; sin proxy se rehúsa con causa. Depende de C3 y C5.

## [257] TASK-THYROX-0508 — Portar el almacén de credenciales de 2.1.283 (chunk-mmqkf96q.js) sobre storage/secureStorage

Status on board: pending

storage/secureStorage viene de ccnmt, no de 2.1.283. Portar el tramo del almacén: fc Rn vs fWr aFo Et nl Fi mWr we v6n $i Ui Bi Wi ji vr qi Xe Tr Ps He c_e Pr In Gi Ns Ds gWr zi hWr Un gr Ne — archivo 0600 en claro con osGuarded:false y aviso, copia del store por generación, lecturas estrictas, selector Un del backend del sistema. Por headless-pool worktree.
