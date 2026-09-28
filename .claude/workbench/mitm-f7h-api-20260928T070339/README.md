# F7h — rutas de API del AgentBridge y del inspector

Referencia: `omniroute: src/app/api/{tools/agent-bridge,tools/traffic-inspector,
settings/mitm,cli-tools/antigravity-mitm,v1/antigravity}/**/route.ts` — 40
rutas, 3255 líneas. Todas en el nivel LOCAL_ONLY de `routeGuard.ts`.

Fases: F7h-0 servidor (#124), F7h-1 estado (#125), F7h-2 privilegiadas (#126),
F7h-3 inspector (#127), F7h-4 settings/antigravity (#128).

## F7h-0 — servidor de API local (`src/api/`)

- Propio de `@thyrox/mitm`: el proxy de `@thyrox/provider` no puede montarlo,
  porque `@thyrox/mitm` ya depende de él (el ciclo cerraría).
- Escucha en `127.0.0.1`. Local ⇔ sin `x-forwarded-for`/`x-real-ip`, par real
  de loopback (del socket, `server.requestIP`) y `Host` de loopback.
- Divergencias declaradas: la referencia estampa el par en una cabecera
  firmada porque Next no expone el socket (Bun sí); la ampliación a la LAN
  privada no se porta porque ningún par de la LAN alcanza un servidor en
  `127.0.0.1`; la comprobación del `Host` es un añadido contra DNS rebinding.

Anulaciones (`annul-f7h0.sh` → `results-f7h0.txt`): seis, todas discriminan.
La tercera —un par desconocido cuenta como local— **no discriminaba** en la
primera pasada: la prueba construía la petición sin `Host`, así que la guarda
del Host la rechazaba y el par nunca decidía. Se le dio un `Host` de loopback
explícito; ahora cae exactamente ese caso.

## F7h-1 — rutas de estado del AgentBridge

`src/api/routes/agentBridgeState.ts` (agents, agents/:id GET+PATCH, detect,
detected-models, mappings GET+PUT, bypass GET+POST+DELETE, config GET+POST,
state) y `src/client/normalizeState.ts`. Las sondas del sistema se inyectan
(`AgentBridgeStateDeps`); `defaultAgentBridgeStateDeps(db)` cablea las reales.

Divergencias declaradas en la cabecera del módulo: `GET /agents/:id` busca por
id (la referencia usaba `resolveTarget`, que busca por host, y respondía 404
siempre) y toda ruta por agente rehúsa un id fuera de `MITM_AGENT_IDS`.

Anulaciones: `annul-f7h1.sh` → `results-f7h1.txt`. Las 14 discriminan: cae
exactamente la aserción que depende de cada mitad. Una vista `targetView` que
quitaba `handler` no discriminaba (la serialización JSON ya omite funciones)
y se retiró antes de anular.

## F7h-2 — rutas privilegiadas del AgentBridge

`src/api/routes/agentBridgePrivileged.ts`: server (start, stop, restart,
trust-cert, regenerate-cert), cert GET+POST+DELETE, cert/regenerate,
cert/download, agents/:id/dns, agents/:id/reset, repair, diagnose,
upstream-ca GET+POST, upstream-ca/test y tproxy GET+POST+DELETE. Sondas
inyectadas en `AgentBridgePrivilegedDeps`; `defaultAgentBridgePrivilegedDeps`
cablea las reales. `http.ts` gana `parseOptionalJsonBody` (cuerpo vacío = `{}`)
y el gestor, `writeStoredUpstreamCaPath`.

Anulaciones: `annul-f7h2.sh` → `results-f7h2.txt`, 20 que discriminan. Dos no
lo hacían a la primera, por causas distintas:

- la copia al alias en `reset`: la prueba nunca llenaba el alias antes, así
  que `{}` salía con y sin la copia. Hueco de la prueba: ahora sincroniza y lo
  comprueba antes del reinicio.
- excluir al propio agente de `otherAgentsStillActive`: código muerto, porque
  su estado ya quedó sin DNS antes de contar. Se retiró, y su anulación con él.

## Arreglo aparte: `server/main.ts` instalaba SIGINT/SIGTERM después de escuchar

La suite completa de F7h-2 salió con 1 rojo ajeno al cambio: «SIGINT also
closes the server cleanly». Aislado pasaba 3/3; bajo carga (16 ejecuciones,
`parallel -j8`) falló 5/16 con `actual: 130` — la acción por defecto de
SIGINT, o sea sin manejador. `main()` los instalaba tras `await
handle.listen()`, y la prueba manda la señal al leer «ready on». Con los
manejadores antes de escuchar: 16/16. El antes/después es el control.

## F7h-3a — rutas del inspector: peticiones, sesiones y hosts

`src/api/routes/inspector.ts`: requests GET+DELETE, requests/:id,
requests/:id/annotation, requests/:id/replay (contra el proxy local, con
`x-thyrox-source: inspector-replay`), export.har, sessions GET+POST,
sessions/:id GET+PATCH+DELETE, sessions/:id/requests, sessions/:id/export.har,
hosts GET+POST y hosts/:host PATCH+DELETE.

Divergencia de seguridad: un host propio se valida como nombre de host. La
referencia sólo pedía uno no vacío y ese texto va a `sudo tee -a /etc/hosts`;
con un salto de línea escribía una entrada arbitraria.

Anulaciones: `annul-f7h3a.sh` → `results-f7h3a.txt`, 13 que discriminan. Una
prueba estaba mal escrita, no el código: suponía que `?host=` filtra por
subcadena, y el búfer (como la referencia) filtra por host exacto.

## F7h-3b — modos de captura, ingesta y canal en vivo

`src/api/routes/inspectorCapture.ts`: capture-modes, capture-modes/http-proxy,
capture-modes/system-proxy (guarda con `THYROX_INSPECTOR_SYSTEM_PROXY_GUARD_MINUTES`),
capture-modes/tls-intercept e internal/ingest (token + saneado de cabeceras y
enmascarado de cuerpos). `src/api/liveStream.ts` + `server.ts`: el websocket
del inspector sobre `Bun.serve`, con la misma guarda de loopback.
`src/envNumber.ts` junta el `parseEnvNumber` que estaba copiado en `buffer.ts`
y `httpProxyServer.ts`.

Hallazgo de diseño: el servidor MITM publicaba la ingesta en `routerBaseUrl`,
el proxy local. En la referencia el enrutador y la API son el mismo servidor
Next; en thyrox son dos, y el proxy no tiene esa ruta. La ingesta va ahora a
`THYROX_MITM_API_URL` (`MitmServerConfig.ingestBaseUrl`).

Anulaciones: `annul-f7h3b.sh` → `results-f7h3b.txt`, 13 que discriminan. Una
no lo hacía: la guarda «token sin destino» en `mitmServer.ts` repetía la que ya
tiene `postIngestEntry`, y sin ninguna de las dos el `fetch` de una URL
relativa lanza y se atrapa. Se retiró la guarda y su prueba, que no podía
fallar.

## F7h-4 — ajustes del MITM y CLI de antigravity

`src/api/routes/mitmSettings.ts`: settings/mitm GET (+download=cert) PUT POST,
cli-tools/antigravity-mitm GET POST DELETE y su /alias GET PUT. Divergencias
en la cabecera: autorización = loopback, misma compuerta de sudo que el resto,
clave opcional (el hijo hereda `THYROX_PROXY_API_KEYS`), puerto fijo 443 sin
escribir `settings.json`, regenerar con `force`, alias sólo para agentes
registrados, certificado del modelo vigente.

Anulaciones: `annul-f7h4.sh` → `results-f7h4.txt`, 12 que discriminan.

## F7h-6 — una responsabilidad por módulo de rutas

Los tres módulos grandes de rutas se partieron por responsabilidad, cada uno
con sus dependencias estrechas y su `real*` por defecto:

| Antes | Después |
|---|---|
| `routes/agentBridgeState.ts`, `routes/agentBridgePrivileged.ts` | `routes/agentBridge/{agents,bypass,config,state,server,cert,agentDns,repair,diagnose,upstreamCa,tproxy}.ts` + los compartidos `basePath`, `agentId`, `certStore`, `serverControl`, `dnsStatus` |
| `routes/inspector.ts`, `routes/inspectorCapture.ts` | `routes/inspector/{requests,sessions,hosts,captureModes,ingest}.ts` + `basePath`, `har` |
| `routes/mitmSettings.ts` | `routes/settings/{mitmSettings,antigravityCli,mitmAliases}.ts` + `port`, `serverLifecycle`, `startKey`, `stats`, `targets` |
| `routes/agentBridge/sudoRequest.ts` | `routes/sudoRequest.ts` — la compuerta de sudo la usan también los ajustes |

Los ajustes y la CLI de antigravity pasan ahora por `sudoRequest`, la misma
compuerta que el resto; su conducta no cambia (las 130 pruebas de rutas
siguen en verde sin tocarlas más que en su composición).

Nombres: el fixture `_mitmHandlerHarness.ts` es `_runHandler.ts`
(`HandlerRun`), y el `harness()` de `mitmServer.test.ts` es
`startRecordedMitmServer()`; «sondas» pasa a «detección»/«consultas al
sistema». Nombran el papel, no el mecanismo.

Los guiones de anulación localizan solos el módulo que contiene cada texto
(`annul-lib.sh`): tras el reparto, el archivo de cada mutación ya no es uno.

### Divergencias declaradas (retiradas de las cabeceras)

Las cabeceras declaran interfaz, procedencia e intención; las divergencias
frente a la referencia viven aquí.

`manager.ts`:

- el estado del puente se lee del store del MITM (`openMitmStateStore`), no de
  la base de la aplicación; los hosts de `ghe-copilot` los pasa quien tenga
  las conexiones de proveedor (#106);
- los archivos viven directamente en el directorio de datos del MITM;
- el hijo recibe `THYROX_MITM_*` y `THYROX_PROXY_API_KEYS`; no se fija
  `NODE_ENV`;
- el servidor de thyrox no rehúsa sin clave (reenvía sin `Authorization`);
- los pasos con efecto sobre el sistema se inyectan.

Ajustes y CLI de antigravity:

- la autorización de gestión y la de CLI son la guarda de loopback de la API;
- la contraseña de sudo pasa por la compuerta común (Windows, root,
  NOPASSWD); `settings/mitm` de la referencia la exigía siempre fuera de
  Windows y root;
- la clave del servidor es opcional; un `keyId` que no resuelve, sin clave
  dada, es un 400;
- el puerto es siempre 443 y no se escribe `settings.json`;
- regenerar fuerza un certificado nuevo en vez de borrar y generar;
- los alias sólo se guardan para un agente de `MITM_AGENT_IDS`;
- el certificado que se descarga es el del modelo vigente.

## F7h-5 — la API compuesta y el cableado de la ingesta

`src/api/mitmApi.ts` monta todos los grupos de rutas con sus dependencias
reales sobre una base y un búfer dados (`mitmApiRoutes`), rehúsa un método y
ruta montados dos veces (`assertUniqueRoutes`: el enrutador atendería sólo el
primero, en silencio) y arranca el servidor con el canal en vivo sobre ese
búfer (`startMitmApi`).

Al arrancar publica al gestor el destino de ingesta —su URL y su token—
(`setInspectorIngest`) y lo retira al parar. El gestor compone el entorno del
servidor MITM con `buildServerEnv`: con la API en marcha le pasa
`THYROX_MITM_API_URL` y `THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN`; sin ella
retira los heredados, que apuntarían a una API que ya no escucha.

Anulaciones (`annul-f7h5.sh`, `results-f7h5.txt`): las siete discriminan. La
séptima —el reinicio del gestor que olvida el destino— no tenía prueba en la
primera ejecución; se añadió `resetting the manager forgets the ingest target`.
