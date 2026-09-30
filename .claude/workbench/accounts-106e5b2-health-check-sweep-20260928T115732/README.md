# #106e-5b-2 — la comprobación de una conexión y el barrido

La parte con efectos del refresco proactivo de `omniroute: src/lib/tokenHealthCheck.ts`.

| Módulo | Qué |
|---|---|
| `refresh/health/connectionHealthCheck.ts` | `checkConnection`: relee la fila, decide con `planConnectionCheck` y escribe; refresca a través del orquestador de #106e-4 |
| `refresh/health/healthCheckScheduler.ts` | el barrido por lotes con pausa, sin solapes, y su arranque y parada |

| Archivo | Qué |
|---|---|
| `red-106e5b2.txt` | la mitad roja (módulos apartados al medirla) |
| `annul-106e5b2.sh` | 40 anulaciones |
| `rerun-106e5b2.sh` | la re-medida tras afinar |
| `results-106e5b2.txt` | veredicto |

## Veredicto de las anulaciones

37 de 40 discriminaron a la primera.

- **18** (subtoken de Copilot para todos): ninguna prueba miraba que un
  refresco que no es de GitHub no lo pidiera. Ahora sí.
- **22** (sin id se lee la fila): la decisión ya salta una conexión sin id,
  así que el resultado era el mismo; la guarda evita consultar el almacén con
  un id vacío. La prueba cuenta ahora las lecturas.
- **24** (un tamaño de lote negativo vale): con un negativo el barrido no
  termina nunca. La prueba lleva ahora su propio plazo, y su `sleep` cede un
  temporizador real: con uno que sólo resolvía promesas el bucle no dejaba
  correr ningún temporizador, el plazo nunca vencía y la primera re-medida se
  colgó hasta el `timeout` del guion (`rerun-106e5b2-24.sh` es la buena).

## Divergencias declaradas

- **Las comprobaciones de Cursor, Kimi web, cookies web y Copilot son
  dependencias** (`providerChecks`), que porta #106e-5c. Sin una, la conexión
  se salta, igual que la referencia cuando no hay nada que hacer.
- **Ocultar el registro es sólo una variable**, `THYROX_HIDE_HEALTHCHECK_LOGS`.
  La referencia la lee también de su tabla de ajustes, que aquí no existe.
- **Sin guarda de proceso de construcción ni de pruebas.** La referencia no
  arranca el planificador durante `next build` ni bajo un corredor de pruebas;
  aquí nada arranca solo: el planificador se crea y se arranca explícitamente.
- **Sin guarda de proxy** (`resolveGuardedProxyConfig`): el punto de
  inyección de salida es `fetch`, en el despacho.
- **El registro nombra la conexión por su nombre o su id, nunca por el
  correo**: la referencia enmascara el correo; aquí no se registra.
- **Estado por instancia.** El estado del planificador vive en la instancia
  que crea `createHealthCheckScheduler`, no en `globalThis`.
- Variables con prefijo propio: `THYROX_DISABLE_TOKEN_HEALTHCHECK`,
  `THYROX_HEALTHCHECK_SKIP_PROVIDERS`, `THYROX_HEALTHCHECK_BATCH_SIZE`,
  `THYROX_HEALTHCHECK_STAGGER_MS`, `THYROX_HEALTHCHECK_JITTER_MIN_MS`,
  `THYROX_HEALTHCHECK_JITTER_MAX_MS`, `THYROX_HIDE_HEALTHCHECK_LOGS`.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes, tras sustituir dos conversiones de unión en la prueba (TS2352) por un ayudante `updateOf` (tsc-106e5b-2).
