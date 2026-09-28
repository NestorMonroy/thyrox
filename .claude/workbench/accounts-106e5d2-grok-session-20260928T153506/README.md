# 106e-5d-2 — cabeceras de sesión de Grok Build

Porte de la parte de sesión de `omniroute: open-sse/config/grokBuild.ts` a
`accounts/grok/grokBuildSession.ts`; la parte OAuth ya vivía en
`accounts/grok/grokBuild.ts` (106d-5b-2), de donde se toma la versión del
cliente.

`red-106e5d2.txt` es la mitad roja; `annul-106e5d2.sh`, 18 anulaciones;
`results-106e5d2.txt` publica el resultado.

## Divergencias declaradas

- La plataforma y la arquitectura se inyectan (`system`) en vez de leerse de
  `providerHeaderProfiles`; por defecto son las del proceso.
- `getGrokBuildClientVersion()` no se porta: la versión es la constante
  `GROK_BUILD_CLIENT_VERSION` y la función sólo la devolvía.
- Los nombres de función pierden el prefijo `get`
  (`grokBuildSessionHeaders`, `grokBuildModelsHeaders`), como las demás
  funciones de cabeceras del árbol (`grokBuildOAuthHeaders`).
- `GROK_BUILD_OAUTH_SCOPES` ya existía como `GROK_BUILD_DEVICE_SCOPES` en el
  módulo OAuth y no se duplica.
