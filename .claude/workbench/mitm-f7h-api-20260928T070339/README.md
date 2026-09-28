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
