# 106e-5c-1 — chequeo de salud de GitHub Copilot

Porte de `omniroute: src/lib/tokenHealthCheck.ts` (ramas `github` y
`checkCopilotSubToken`) a `src/accounts/refresh/health/copilotHealthCheck.ts`.

- `red-106e5c1.txt` — la mitad roja: la suite antes del módulo.
- `annul-106e5c1.sh` — veinte anulaciones; `rerun-106e5c1.sh` repite las
  cuatro que no discriminaron en la primera pasada (3, 4, 15 y 16) tras
  afilar sus casos. `results-106e5c1.txt`: las veinte discriminan.

## Divergencias declaradas

- La caducidad se lee con `parseTokenExpiryMs`, así que acepta un número
  escrito como texto; la referencia sólo aceptaba ISO o número.
- Sin guardia de proxy: el `fetch` se inyecta y el proxy lo resuelve quien
  lo construye.
- La etiqueta del log usa `name` o `id`, nunca el correo.
- Las dos comprobaciones se inyectan en `createConnectionHealthCheck` como
  `providerChecks.githubCopilot`/`copilotSubToken`, no se importan.
