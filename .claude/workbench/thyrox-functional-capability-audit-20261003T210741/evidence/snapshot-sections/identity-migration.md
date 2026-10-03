<!-- extraído textual de report-20261003T232604Z-pre-structured-audit.md (sha256 75a113337c2d367ba09bb18022ecb211cd7d616f25b22b12376a97bb7ac77d0a); no editar: la fuente es el snapshot -->

## Identity migration audit (THYROX → kaupamex-ai) — 2026-10-03

Directiva del ejecutor, añadida a la auditoría en curso. **Nada se renombró.**
Salidas: `identity-surface-inventory.tsv` (39 superficies, 11 columnas) y
`identity/` (extractos por superficie y conteos).

### Canonical proposed identity

```
ecosystem: kaupamex
component: ai
product: kaupamex-ai
CLI: kaupamex-ai        (no `kaupamex -p`: el ecosistema no tiene CLI raíz)
legacy alias: thyrox
```

### Surface inventory — apariciones versionadas por categoría

Métrica: `identity/classify_occurrences.sh`, primera regla que casa sobre cada
aparición de «thyrox» (insensible), sin `_references` ni `_archived`.
Ciega a: lo no versionado (`.thyrox/`, `.env`, volúmenes) y al significado de un
literal que ninguna regla separa (cae en PRODUCT_NAME).

| categoría | apariciones |
|---|---|
| HISTORICAL_REFERENCE (benches, jobs, cachés, agent-results) | 1 010 334 |
| STABLE_DOMAIN_ID (H-/TASK-THYROX-*) | 17 492 |
| PACKAGE_NAMESPACE (@thyrox/*) | 15 177 |
| TEST_FIXTURE | 9 795 |
| ENV_NAMESPACE (THYROX_*) | 7 124 |
| PRODUCT_NAME | 2 963 |
| DOCUMENTATION | 528 |
| FILESYSTEM_NAMESPACE (.thyrox/) | 308 |
| USER_FACING_COMMAND | 269 |
| COMPATIBILITY_ALIAS (`thyrox-rename: keep`) | 58 |
| RUNTIME_RESOURCE_NAME | 47 |
| OCI_LOGICAL_IDENTITY (labels) | 43 |
| OCI_DISTRIBUTION_NAME | 8 |

El 96 % es historia y procedencia: **no se toca**. El código vivo que importa
es del orden de 25 000 apariciones, casi todas de paquete y entorno.

### Must remain stable

- `H-THYROX-*` (hasta 460) y `TASK-THYROX-*`: ids estables; el componente se
  declara en metadata, el prefijo futuro es una decisión separada del ecosistema.
- Identidad de documento `domain + domainId`; `source_ref` es procedencia.
  Probado contra PostgreSQL real: `thyrox@0123456:…` y luego
  `kaupamex-ai@89abcde:…` con `H-THYROX-293` → **un** documento, versión 1,
  procedencia actualizada (`identity.postgres.test.ts` 4b, 10/10).
- Digests: `sha256:6775c008…` (manifiesto publicado), `7485fe6f…` (GGUF).
- Nombres contractuales de modelo `thyrox-<slug>:<quant>-<src>-<rev12>`: son
  clave de `qualifications.json`.
- Esquemas versionados persistidos: `thyrox.*-record.v1`, `thyrox.gguf.v1`,
  `thyrox-cred-v1.`.
- Commits de git.

### Can migrate by alias

- CLI `thyrox -p` → `kaupamex-ai -p`, mismo `bin/cli` → `cli.tsx` antes de
  parsear; el alias se mide para retirarlo.
- `THYROX_*` (555 nombres: 505 config, 30 credential, 13 sensitive-config, 7
  secret-reference) → `KAUPAMEX_AI_*`, con el contrato canónico/legacy/iguales/
  distintos=FAIL CLOSED. Precedente en el ecosistema: `KAUPAMEX_ROOT`,
  `KAUPAMEX_DOCS_ROOT`, `KAUPAMEX_RESULTS_DIR` (prefijo por componente).
- `~/.thyrox` → candidato `~/.kaupamex/ai`: `configHome.ts` **ya** implementa
  propio→heredado como respaldo de lectura (lo dejó el renombre CLAUDE→THYROX).
- Labels `thyrox.*` / `io.thyrox.*`: lectura dual durante la transición.
- `/thyrox:*` del plugin.

### Can migrate by recreation

`thyrox-redis`; contenedores `thyrox-worker-*`, `thyrox-model-*`,
`thyrox-task-*`; imágenes `localhost/thyrox-*` (reconstruibles por definición +
commit); `.thyrox/runtime`, `.thyrox/pool-worktrees`; el socket del coordinador;
el scope `@thyrox/*` (62 paquetes, **todos** `private`, sin `publishConfig` ni
`bin`: es protocolo interno del workspace, no un contrato externo).

### Requires durable migration

- `thyrox-postgres-data` (+ `thyrox-postgres-password`): no se renombra ni se
  recrea sin prueba de preservación; db/rol `thyrox` es namespace físico y
  puede quedarse.
- `thyrox-ollama-models`: materialización reconstruible desde el artefacto
  permanente, pero cara; clasificar su lifecycle antes.
- `.thyrox/models/` (catálogo, `qualifications.json`, caché de artefactos).
- Nombres contractuales de modelo (resolver ambos prefijos, no reescribir).

### Provenance only

`source_ref`/`source_revision` históricos, los 1 010 334 de benches/jobs/
cachés, mensajes de commit, el repositorio publicado `docker.io/th3rox/
thyrox-quantization-lab-artifacts`.

### Ecosystem collision risks

| sitio | riesgo |
|---|---|
| `src/session/write-env.sh:71` — `THYROX_CLONE_PREFIX:-kaupamex-` | un clon `kaupamex-ai` se leería como consumidor `kaupamex-*` |
| `src/paths/reach.py:615`, `src/packages/paths/reach.ts:496` | el roster deriva hermanos por prefijo |
| `src/verify/thyrox-audit.sh:259` — `ls -d "$PARENT"/kaupamex-*` | contaría a kaupamex-ai entre los consumidores |
| `src/task/task_ids.py:134`, `layer_signals.tsv:7` | el modelo «los kaupamex-* son consumidores, thyrox el proveedor» deja de valer |
| `workerContainerLifecycle.ts:219` — `name=^thyrox-worker-` | el barrido de huérfanos decide pertenencia por nombre; renombrar a `kaupamex-*` lo volvería ajeno-inclusivo |
| `shared-state/redis.ts:46`, `redisCoordination.ts:111` — `keyPrefix ''` | ningún namespace de componente: chocaría con otro componente en el mismo Redis |

Ninguna regla nueva puede ser `startswith("kaupamex-")`: pertenencia = identidad
de componente (label/metadata) o un roster declarado.

### Search Existing de lo que se reutiliza

- **Esquema de labels: no hay una autoridad única.** Cuatro módulos en dos
  paquetes y dos prefijos (`io.thyrox.*` en image-registry/infra, `thyrox.*` en
  podman-execution/model-scheduling). EXTEND: un esquema en `podman-execution`
  (autoridad de la primitiva) que añada `component`, `product`,
  `identity-version`, `legacy-name`; los nombres candidatos
  `io.kaupamex.*` se fijan ahí y no antes.
- **Rename toolkit existente:** `renameEnvPrefix.ts`, `renameEnvNames.ts`,
  `renameProductInText.ts` (AST, sólo literales visibles), `check_key_rename_
  symmetry.py`, marca `thyrox-rename: keep`. Es el instrumento del cutover; un
  `s///g` global ya costó H-THYROX-171.
- **Hogares:** `configHome.ts` + `resolveDataDir` es la autoridad de rutas.

### Proposed migration DAG (no ejecutado)

```
0 AUDIT CURRENT STATE (esto)  — la auditoría funcional sigue antes del cutover
1 DECISIÓN: identidad canónica + contrato de compatibilidad
  (prefijo de ids futuros, scope npm, raíz .kaupamex/ai) — del ecosistema
2 metadata de componente: esquema único de labels (EXTEND podman-execution)
  + component=kaupamex-ai en store/corpus; GC/huérfanos por label, no por nombre
3 pertenencia sin prefijo: roster/reach/thyrox-audit/write-env por identidad
  declarada; keyPrefix de Redis derivado del componente
4 alias: CLI kaupamex-ai (+ thyrox medido), KAUPAMEX_AI_* con FAIL CLOSED,
  configHome .kaupamex/ai con .thyrox heredado — EXTEND rename toolkit
5 nombres de publicación nuevos (imágenes/artefactos permanentes) — antes de
  publicar nada nuevo
6 recursos de runtime recreables (redis, workers, units, imágenes locales)
7 durables con prueba de preservación (postgres-data, ollama-models,
  .thyrox/models)
8 paquetes @thyrox/* y rutas
9 cutover de owner/scope semántico
10 medir uso legacy → retirar alias
```
