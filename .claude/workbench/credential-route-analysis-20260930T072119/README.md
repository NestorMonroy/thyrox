# Ruta de credencial de `thyrox -p` — análisis 2026-09-30

Pregunta del ejecutor: los ítems del pool corren `thyrox -p` pero delegan en
`claude -p`; ya existe el mecanismo para crear y asociar una clave. ¿Por qué
no se usa?

## Lo medido

| Pieza | Dónde | Estado en este contenedor |
|---|---|---|
| Generador de la clave de cifrado | `src/packages/provider/bin/generateStorageKey.ts` (`bin/provider-generate-storage-key`) | existía; la clave NO estaba en `.env` |
| `.env` | ignorado por git (`.gitignore:11`), creado hoy 04:16:51 | el `.env` con la clave vivía en otro contenedor y no viajó: es lo esperado para un archivo con secretos |
| Clave de cifrado | `THYROX_STORAGE_ENCRYPTION_KEY` | generada 07:2x con el bin: 64 hex, sin imprimirse |
| Store de conexiones | `resolveProvidersDataDir()` → `/root/.claude/providers` | no existe: ninguna conexión en este contenedor |
| Alta de la conexión | `thyrox providers add anthropic` (`cli/src/commands/providers/writeVerbs.ts`, `3da668cf4`) | falta la clave de API, que es del ejecutor |
| Resolución | `resolveCredential(env, readFd, store?)` (`provider/src/credentials.ts:145`), rama `PROVIDER_CONNECTION` | la rama existe (`526cee2c8`) |

## El defecto: la rama del store no la alcanza ningún llamador de producción

`resolveCredential` sólo consulta el store si se lo pasan, y ninguno de los
tres llamadores lo hace:

- `cli/src/entry/printDelegation.ts:49` — `resolveCredential(env, readFd)`:
  decide delegar en `claude -p` aunque exista una conexión.
- `provider/src/anthropicHttp.ts:68` — `resolveCredential(env, opts.readFd)`:
  el bucle propio sin `--connection` no ve la conexión.
- `provider/bin/credentialProxy.ts:32` — `resolveCredential(process.env)`:
  el proxy local tampoco.

Aunque se dé de alta la conexión, `thyrox -p` seguiría delegando. Cerrarlo es
lo que falta de C2 (TASK-THYROX-0495): abrir el store en esos tres puntos con
`openConnectionStore()` y pasarlo, con TDD.

## Qué falta del ejecutor

`thyrox providers add anthropic` con la clave de API (la guarda cifrada con la
clave de arriba). Es un secreto: no se deriva ni se inventa.

*Métrica:* nombres de clave del `.env` (nunca valores), existencia del
directorio del store, y los llamadores de `resolveCredential` por `rg`.
*Ciega a:* una credencial que el ejecutor declare fuera del `.env` o del store
(por ejemplo en el entorno de otra sesión).
