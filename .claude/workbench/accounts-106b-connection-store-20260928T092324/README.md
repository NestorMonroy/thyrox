# #106b — store de cuentas de proveedor (`provider_connections`)

Porte de `omniroute: src/lib/db/providers.ts` y sus hojas (`providers/columns.ts`,
`providers/deletion.ts`, `providers/lazyConnectionView.ts`, `caseMapping.ts`,
`webSessionDedup.ts`, `oauth/utils/codexConnectionSelection.ts`) a
`src/packages/provider/src/accounts/`:

| Módulo | Responsabilidad |
|---|---|
| `connectionSchema.ts` | la tabla, sus índices y el conjunto de columnas de una proyección |
| `connectionColumns.ts` | fila ⇄ registro camelCase y validación de los dos mapas por conexión |
| `connectionIdentity.ts` | ¿es la misma cuenta? identidad OAuth, usuario de Codex, sesión web, servidor local |
| `lazyConnectionRow.ts` | credenciales descifradas la primera vez que se leen |
| `connectionDeletion.ts` | borrado y renumeración de prioridades |
| `connectionStore.ts` | crear/actualizar/leer/contar/uso/backoff/grupos/borrar |

## Decisión pendiente desde #106a: dos modelos, dos hogares

`provider/src/connections.ts` guarda en la configuración global las
conexiones con que la CLI **elige modelo**; `provider_connections` es el
**conjunto de cuentas por upstream** que el proxy local reparte. Medido: ningún
consumidor de `connections.ts` necesita prioridad, backoff ni credenciales
cifradas, y ningún consumidor del proxy lee la configuración global. Viven al
lado; #106e decide cómo una fila de aquí se vuelve `ProxyCredential`.

## Divergencias

1. **La base y el cifrado se inyectan** (`createConnectionStore({ db, cipher, now, newId })`)
   en vez de salir de `getDbInstance()` y del módulo de cifrado global. El reloj
   y el generador de ids también, para que la prioridad por `updated_at` sea
   reproducible.
2. **Síncrono.** La referencia declara `async` sobre `better-sqlite3`, que es
   síncrono; `bun:sqlite` también lo es, y el `await` no protegía nada.
3. **Sin caché de lectura, copia de seguridad ni generación de configuración
   del proxy** (`invalidateDbCache`, `backupDbFile`, `bumpProxyConfigGeneration`):
   son servicios del proceso de OmniRoute que aquí no existen. Si el proxy
   local llega a cachear filas, la invalidación entra con él (#106e).
4. **El borrado no limpia tablas vecinas** (`proxy_assignments`,
   `quota_snapshots`, combos, LKGP, pines de turno de Codex): ninguna existe
   en este árbol.
5. **Sin guardia de contraseña de gestión** (`assertApiKeyIsNotManagementPassword`):
   protege el formulario del tablero de OmniRoute; thyrox no tiene contraseña
   de gestión que un autocompletado pueda colar.
6. **Sin normalización por proveedor de `providerSpecificData`** (semilla de
   huella de Codex, caducidad de cookies web, `normalizeProviderSpecificData`):
   son reglas de cada flujo, y entran con su flujo en #106d.
7. **Sin reconciliación del historial de uso de Codex ni de sus enfriamientos
   por ámbito** (`reconcileCodexUsageHistory`, `codexAccountState`): dependen
   de tablas de uso y de cuota que llegan con #106e.
8. **Sin el retiro de proveedores** (`isRuntimeRetiredProviderId` y
   compañía): catálogo propio de OmniRoute.
9. **`createLazyConnectionView` tipado no se porta**: la referencia lo declara
   para código nuevo y no tiene consumidor; `createLazyConnectionRow` es el que
   usa `getProviderConnections`.
10. **Una sola lista de columnas escritas** para INSERT y UPDATE
    (`WRITTEN_COLUMNS`), en vez de dos sentencias escritas a mano que ya
    divergían (la de INSERT omitía `last_ping_at`/`last_pinged_reset_key`).

## Verificación

Rojo persistido en `red-106b.txt`. Anulaciones: `annul-106b.sh`,
`results-106b.txt`.

Build tsc: 0 errores. Test tsc: sólo los dos TS6059 que ya están en HEAD
(`claudeAiLimits.test.ts`, `command-runtime/.../pendingCrossPackageDeps.ts`).
`__tests__/accounts`: 42/42. Doce anulaciones, las doce discriminan; la
siete no lo hacía hasta añadir la credencial que otra clave no descifra
(con la clave correcta, descifrar y recifrar da lo mismo).
