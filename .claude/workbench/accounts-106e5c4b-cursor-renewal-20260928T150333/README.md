# 106e-5c-4b — renovación de Cursor y su hoja del barrido

Porte de `omniroute: src/lib/cursor/renewal.ts` y
`src/lib/tokenHealthCheckCursor.ts`:

- `accounts/cursor/cursorRenewal.ts` — la sonda de `cursor-agent` (estado y
  empujón), la lectura compartida del IDE, la renovación y lo que se guarda.
- `accounts/refresh/health/cursorHealthCheck.ts` — la hoja del barrido, una
  renovación a la vez por conexión.

`red-106e5c4b.txt` es la mitad roja; `annul-106e5c4b.sh`, 36 anulaciones;
`rerun-106e5c4b.sh` repite la 9 (un estado JSON sin `isAuthenticated`) y la 33
(una conexión ya `expired` vuelve activa) tras afilar sus casos.
`results-106e5c4b.txt` publica el resultado.

## Divergencias declaradas

- El estado de módulo de la referencia —procesos en vuelo, caché de
  disponibilidad, lectura compartida del IDE, candado por conexión— vive en
  instancias (`createCursorAgentProbe`, `createDedupedIdeAuth`, la hoja), no
  en variables globales; `defaultCursorRenewalDeps` compone las reales.
- `renewCursorConnection` recibe sus dependencias siempre: la referencia las
  hacía opcionales con los módulos reales por defecto.
- El reloj de la caché y el `home` de la lectura compartida se inyectan.
- `buildCursorRenewedUpdate` retira `refreshCircuit` por desestructuración, sin
  mutar la copia.
- La etiqueta del log es `provider/name-o-id` con el tag `HEALTH_CHECK`, sin
  los símbolos ✓/✗.
- El `never` exhaustivo del `switch` no se porta: el tipo de resultado es una
  unión de tres y la rama de fallo cubre las dos que no renuevan.
