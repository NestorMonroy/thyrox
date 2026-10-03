# P4 — OllamaRuntimeAdapter

Tarea: TASK-THYROX-0701 (tarjeta 63). Archivo tuyo: `src/packages/local-models/ollamaRuntimeAdapter.ts`.
Pruebas: `src/packages/local-models/__tests__/ollamaRuntimeAdapter.test.ts`, contra
`testing/fakeOllamaRuntime.ts` (no lo modifiques).

Lee: el docstring del archivo, `src/packages/model-scheduling/executionPrimitive.ts` (el puerto),
`src/packages/local-models/ollamaApi.ts` (cliente existente: reutilízalo con `new OllamaApi(unit.endpoint)`;
si le falta una llamada pública —`/api/version`, `/api/ps`, `/api/generate` con `keep_alive`— añádela ahí
también, es archivo tuyo en este ítem, sin romper `__tests__/ollamaApiInstall.test.ts`) y
`kaupamex-docs: source/thyrox/arquitectura/operacion-residencia-de-modelo.rst` (tabla de operaciones).

Reglas: cada mutación compara antes `binding.generation` con `currentGeneration(binding.residencyKey)` y,
si difiere o es `unavailable`, devuelve `stale_generation` sin ninguna petición HTTP. Ninguna operación
lanza por un error del runtime: `probeHealth` → `unhealthy`, mutaciones → `failed`, `verify` → `failed`
o `mismatch`, `observe` → `error`. La identidad se toma del `FROM .../sha256-<hex>` de `/api/show`;
`/api/ps` sólo dice qué nombres están residentes. Nunca `DELETE`, `/api/delete` ni `/api/chat`.
