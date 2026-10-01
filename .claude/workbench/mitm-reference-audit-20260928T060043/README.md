# Auditoría: el MITM de la referencia contra @thyrox/mitm

Fecha: 2026-09-28. Referencia: `/home/user/nestormonroy/omniroute` (MIT).
Motivo: el análisis de fases F0–F7 listó sólo los `.ts` de `src/mitm` y dejó
fuera el nativo de tproxy (`tproxy/native/transparent.c`, `binding.gyp`), su
script de build y todo lo que consume el MITM fuera de `src/mitm`.

## Universo medido

- `reference-src-mitm.txt` — 86 archivos en `src/mitm` (incluye `.cjs`, `.c`,
  `.gyp`, `.md`).
- `reference-consumers.txt` — 292 archivos fuera de `src/mitm` que nombran
  mitm/tproxy/agentbridge: 67 i18n, 59 del tablero, 64 rutas de API, el resto
  bibliotecas y scripts de build.
- `reference-tests.txt` — 117 pruebas que nombran mitm/tproxy/agentbridge/
  inspector; `thyrox-ported-tests.txt` — 54 citadas como porte en
  `@thyrox/mitm`; `reference-tests-not-ported.txt` — las que ninguna prueba de
  thyrox cita (se excluyen 5 de `rateLimitManager`, que casan «mitm» dentro de
  «limitmanager» y no son del MITM).

*Métrica:* nombre de la prueba de la referencia citado en la cabecera de una
prueba de thyrox. *Ciega a:* una prueba portada sin citar su origen; por eso
el grupo D se verifica una por una antes de portarla otra vez.

## Grupos y fase que los cubre

| Grupo | Qué | Fase |
|---|---|---|
| A | `tproxy/*.ts` y sus 9 pruebas de lógica | F7e (#115) |
| A' | nativo `transparent.node` (C, gyp, build, carga) y `tproxy-build-native` | F7f (#116) |
| B | rutas de API: `tools/agent-bridge/*` (17), `tools/traffic-inspector/*` (14, incluida la ingesta con su token que el gestor usa), `settings/mitm`, `cli-tools/antigravity-mitm` (+alias), `v1/antigravity`; y sus pruebas de ruta | F7h |
| C | `lib/inspector`: `harExport`, `configPortability`, `matchesTrafficFilter`, `tproxyCaptureApi`, `agentBridgeMaintenanceApi`; `lib/db/inspectorSessions`; esquemas `shared/schemas/agentBridge.ts` e `inspector.ts` | F7i |
| D | pruebas cuyo módulo ya está portado pero que no se citan (db-agent-bridge-*, mitm-dnsConfig, mitm-cert-*, mitm-server-*, passthrough, upstream-ca-wiring, hosts-cleanup-on-exit, cleanup-symmetry, root-ca-leaf…) | F7g (#117) |
| E | `manager.stub.ts` y `mitm-stub-flag.mjs`: degradación cuando el MITM no está disponible en el empaquetado | F7g, junto al empaquetado |
| F | handler antigravity | F2b (#105) |
| G | tablero (59) e i18n (67): thyrox no tiene tablero web; su superficie equivalente son subcomandos `thyrox mitm …` | F7j |
