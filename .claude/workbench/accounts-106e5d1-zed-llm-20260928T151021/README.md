# 106e-5d-1 — token LLM de Zed y catálogo de modelos

Porte de la mitad LLM de `omniroute: open-sse/shared/zedAuth.ts` a
`accounts/zed/zedLlm.ts`; la mitad de autenticación nativa ya vivía en
`accounts/zed/zedNativeAuth.ts` (106d-5b-2) y se reusa.

`red-106e5d1.txt` es la mitad roja; `annul-106e5d1.sh`, 36 anulaciones;
`rerun-106e5d1.sh` repite la 6 (un id en arreglo de dos, que `String()` no
reduce) y la 34 (una lectura forzada concurrente con otra normal) tras
afilarlas. `results-106e5d1.txt` publica el resultado.

## Divergencias declaradas

- Las cachés de token, de catálogo y de lecturas en vuelo viven en una
  instancia (`createZedLlmClient`), no en mapas de módulo; `clearCaches` limpia
  las de esa instancia.
- `fetch` y el reloj se inyectan; la referencia usaba el `fetch` global ya
  envuelto por su proxy.
- `ZED_HEADERS.systemId` reusa `ZED_SYSTEM_ID_HEADER` de `zedNativeAuth` en vez
  de repetir el literal.
- El token de modelo se exige como cadena: un `{ value: 5 }` falla con «Zed did
  not return an LLM token» en vez de guardarse.
