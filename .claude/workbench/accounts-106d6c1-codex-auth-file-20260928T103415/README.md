# #106d-6c-1 — auth.json de codex, y lo común de exportar a un CLI

Porte TDD de `omniroute: src/lib/oauth/utils/codexAuthFile.ts` (exportar,
también la escritura guardada) y `codexAuthImport.ts` (importar).

La referencia repite en `claudeAuthFile.ts` y `codexAuthFile.ts` la misma
maquinaria —error con código HTTP, etiqueta y nombre de archivo de la cuenta,
refresco persistido si la sesión está por caducar, escritura con copia al lado
y modo de sólo su dueño—. Aquí vive una vez, en `cliAuthFileExport.ts`, y la
exportación de Anthropic (#106d-6b) pasó a usarla. El decodificador de JWT
también es uno (`accounts/jwtPayload.ts`); el mapeo de Grok dejó el suyo.

| Archivo | Qué |
|---|---|
| `red-106d6c1.txt` | la mitad roja |
| `annul-106d6c1.sh` | 37 anulaciones: codex, el módulo común (con las suites de los dos que lo usan) y el decodificador (con la de Grok) |
| `annul-106d6c1-rerun.sh` | re-medición de 1 y 2 |
| `results-106d6c1.txt` | veredicto por anulación: las 37 discriminan |

## Divergencias declaradas

- **Un solo `AuthFileError`** en vez de uno por proveedor: el código y el
  estado HTTP son lo que distingue un fallo, no la clase.
- **Refresco, ruta del archivo, respaldo central y reloj** inyectados, como en
  #106d-6b. El refresco puede devolver su propia `expiresAt` (codex) y gana a
  la derivada de `expiresIn`.
- La escritura guardada recibe su `authPath`; la referencia lo resolvía de la
  tabla de CLIs.
- No se refresca al importar, igual que la referencia (un `auth.json`
  exportado suele venir ya rotado).

## Re-medición

- **1 y 2 (formas del JWT)** no discriminaban: ninguna suite probaba el
  decodificador de frente. Con `__tests__/accounts/jwtPayload.test.ts`, las dos
  anulaciones caen.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 213 tests, 0 fail (job tsc-106d6c-20260928T103905, común a 6c-1 y 6c-2).
