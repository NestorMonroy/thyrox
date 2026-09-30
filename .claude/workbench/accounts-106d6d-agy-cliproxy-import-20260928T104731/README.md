# #106d-6d — importación de agy y de CLIProxyAPI

Porte TDD de `omniroute: src/lib/oauth/utils/agyAuthImport.ts`,
`utils/cliProxyAuthImport.ts` y de la lógica de
`app/api/oauth/cliproxy-import/route.ts` (vista previa sin tokens e
importación por cuenta).

| Archivo | Qué |
|---|---|
| `red-106d6d.txt` | la mitad roja |
| `annul-106d6d.sh` | 56 anulaciones |
| `rerun-106d6d.sh` | las tres re-medidas tras afinar las pruebas |
| `results-106d6d.txt` | veredicto (abajo) |

## Veredicto de las anulaciones

52 de 56 discriminaron a la primera. Las cuatro que no:

- **8, 25, 27 — pruebas insuficientes, afinadas.** El método de acceso
  dentro de `.token` sin uno en el documento; el estado degradado al
  sobrescribir con una importación sin proyecto; el correo declarado frente
  a uno descubierto. Re-medidas en `rerun-106d6d.sh`.
- **38 — comprobación muerta, retirada.** `Array.isArray` en
  `parseCliProxyAuthRecord`: un arreglo JSON nunca trae `type`, así que ya
  cae en «tipo desconocido».

## Divergencias declaradas

- **Un solo tipo de error** (`AuthFileError` de `cliAuthFileExport.ts`) en
  vez de `AgyAuthFileError`: mismo estado HTTP y mismo código.
- **Store, reloj, `fetch`, versiones del cliente y plataforma inyectados.**
  `parseCliProxyAuthRecord` exige `nowMs`: el `now = 0` por defecto de la
  referencia fechaba un `expires_in` desde 1970.
- **El directorio de CLIProxyAPI** sale de `THYROX_CLIPROXYAPI_CONFIG_DIR`
  (antes `CLIPROXYAPI_CONFIG_DIR`), con el mismo valor por defecto.
- **Código muerto retirado al sobrescribir en agy:** con correo resuelto,
  `email || existing.email` y el nombre por defecto tras `email` nunca se
  alcanzaban.
- **Conservado tal cual:** al sobrescribir sin proyecto descubierto, la
  conexión se marca degradada aunque conserve el proyecto guardado (la
  referencia decide el estado sólo con lo descubierto).
- **Fuera de esta fase:** las rutas `agy-auth/apply-local` (leer el login
  local) e `import-bulk` son orquestación de la superficie de uso; entran en
  #106f (`thyrox providers import`).

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 248 tests, 0 fail (job tsc-106d6d-20260928T105210).
