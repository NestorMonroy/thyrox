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
