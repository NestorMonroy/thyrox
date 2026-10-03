# P0 — baseline de lo que ya existe, antes de P1–P7

Medido el 2026-09-30 sobre `feature/thyrox-l6` (`dc23b7a84`). Instrumentos:
`probes/baseline_activation.sh` (conducta) y el censo `outputs/p0-census.txt`
(`git grep -l` sobre `src bin tests install.sh`, sin `dist`).

*Métrica:* archivos versionados que nombran la pieza, y conducta medida del cli
con cada dependencia apuntando a un centinela.
*Ciega a:* una pieza equivalente con otro nombre que el censo no buscó; por eso
cada fila cita el archivo que se leyó, no sólo el conteo.

| P | Capacidad | Implementación existente | Estado | Owner actual | Acción |
|---|---|---|---|---|---|
| P1 | arranque perezoso | `cli.tsx:85-96` vía rápida de `--version` (sólo el profiler); `cli.tsx:78` «all imports are dynamic»; `lightModes.ts` + `lightModes.test.ts`; `versionMacro.test.ts`. Medido: `--version`, `--help`, `-p --help` → 0 conexiones, 0 llamadas a Podman | PARTIAL_EXTEND | cli (`entry/`) | extend: falta el contrato de activación como prueba, con control de anulación; la conducta ya es la correcta |
| P1 | versión fuera del árbol | `manifestVersion()` lee `package.json` relativo a `import.meta.dir`; desde `/` con `env -i` funciona (medido: `0.1.0 (thyrox)`), porque el fuente sigue en el árbol | PARTIAL_EXTEND | cli | extend en P5: sólo falla en un ejecutable compilado, y ese ejecutable no existe hoy |
| P2 | recursos | `paths/reach.py` (196 archivos lo nombran) y `packages/paths/reach.ts`; `THYROX_CONSUMER`, `THYROX_REACH_ROOT(S)`; `src/paths/declarations.py` + `ensure_homes.py` (P11) | PARTIAL_EXTEND | `@thyrox/paths` / `src/paths` | extend: falta la clasificación bundled/external/dev/test/runtime por recurso; no se crea otra raíz |
| P3 | dependencias externas | `src/lib/toolchain.sh`: 17 `thyrox_toolchain_require_*` (bun, gawk, parallel, podman, redis, pgvector, postgres_test_db, rsync, gnu_time, …) con instalador opt-in y re-verificación; `check-toolchain-ready.sh` (sondas de conducta, lo corre `install.sh`); `bin/hardware-inventory` | PARTIAL_EXTEND | `src/lib/toolchain.sh` | extend: el inventario (consumidor, requerido/opcional, condición, versión, fallo) se DERIVA de estos detectores; no hay segundo detector |
| P4 | skills y recursos de ejecución | `command-runtime/src/skills/loadSkillsDir.ts`, `managedPath.ts` (config home); sin prueba desde otra ubicación | PARTIAL_EXTEND (sin medir desde fuera del árbol) | `@thyrox/command-runtime` | extend: medir desde otra ubicación antes de tocar |
| P5 | construcción reproducible | `emit_declarations.py`, `check_exports_types`, `check_package_typecheck`, `bun.lock` raíz. **Ninguna** construcción de un distribuible: 0 `bun build` en los `package.json` | MISSING (el distribuible); EXISTS_AND_REUSE (gates de tipos) | `src/typescript`, `src/verify` | implement missing: la construcción y su gate de dos rutas; reuse de los gates de declaraciones |
| P6 | alcance por subcomando | ramas de `cli.tsx` (imports dinámicos por rama); `generate_bin.py` descubre los entrypoints (`discover_entrypoints`, `discover_typescript_entrypoints`); `closure_graph` es de tareas, `bin/reach` de rutas: **ninguna herramienta de grafo de imports** | MISSING (el grafo); EXISTS_AND_REUSE (lista de entrypoints) | — | implement missing, tomando los entrypoints de `generate_bin.py` y las ramas de `cli.tsx` |
| P7 | instalación / distribución | `install.sh`: raíz, `bin/` (`generate_bin`), `.env`, hogares (P11), githooks y driver de merge por clon, preflight. **No** invoca `infrastructure_ensure` ni el toolchain de Podman/Redis | PARTIAL_EXTEND | `install.sh` | extend después de P1–P6; la infraestructura gestionada es P12 |
| P7 | infraestructura gestionada | `src/lib/infrastructure.sh` (argv de creación, health check, imagen, disco, inspect) + `bin/infrastructure_ensure` (red, imagen, admisión de disco, contenedor, health). `InfrastructureBootstrap` **no existe con ese nombre**: la autoridad es este par | EXISTS_AND_REUSE | `src/lib/infrastructure.sh` | reuse: P7/P12 lo invocan, no se crea otro instalador de PostgreSQL/Redis |
| P7 | workers especializados | `daemon/src/podman/podmanWorkerManager.ts`: `launch`, `retire`, `retireAll`, `reconcileOrphans`, admisión de VRAM, veredicto de hardware | EXISTS_AND_REUSE | `@thyrox/daemon` | reuse; perfil separado de la infraestructura |

## Lo que decide la construcción

- **P1 no se reescribe.** Se añade la prueba de contrato de activación sobre la
  conducta que ya existe, con su control de anulación (una inicialización
  ansiosa inyectada tiene que hacerla caer).
- **P6 es la única pieza genuinamente ausente de las dos primeras.** Se
  construye sobre los entrypoints que ya enumera `generate_bin.py` y sobre los
  abridores directos que ya existen: `store/sql.ts` (`openByUrl`),
  `shared-state/factory.ts`, `semantic-search/store.ts`,
  `provider/src/proxy/openaiCompat/declaration.ts`,
  `daemon/src/podman/podmanWorkerManager.ts` (`createPodmanExecutor`) y
  `src/lib/infrastructure.sh`.
