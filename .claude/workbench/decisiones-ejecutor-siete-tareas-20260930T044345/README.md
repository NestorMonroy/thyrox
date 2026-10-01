# Decisiones del ejecutor sobre siete tareas bloqueadas — 2026-09-30T04:43:45

Origen: mensaje del ejecutor en la sesión efec8688-6a45-5d65-b899-cd988aa8816f,
en respuesta a la lista de tareas que esperaban su decisión. Se transcribe el
contrato de cada una; cada tarea queda desbloqueada y su implementación parte
de este contrato.

| Ordinal | Cita | Tarea |
|---|---|---|
| 56 | TASK-THYROX-0261 | Consumidor por defecto de `user_wiring.declared_wiring` |
| 201 | TASK-THYROX-0453 | Datos D3 — opción A |
| 203 | TASK-THYROX-0455 | Datos D5 — qué vectorizar |
| 245–249 | TASK-THYROX-0496 … 0500 | Credenciales C3–C7 |
| 296 | TASK-THYROX-0539 | Hueco sospechoso de migraciones |
| 313 | TASK-THYROX-0556 | Podman como frontera de ejecución |
| 350 | TASK-THYROX-0627 | Datos D4-B — autoridad durable compartida |

Las dos más delicadas, por integridad de datos y topología compartida, son
TASK-THYROX-0539 y TASK-THYROX-0627.

## TASK-THYROX-0261 — consumidor por defecto de `user_wiring`

No se introduce un consumidor hardcodeado como nueva fuente de verdad.
`user_wiring` resuelve el consumidor por el mecanismo existente de
`reach`/contexto declarado.

```text
consumidor explícito            -> se usa
si no, por reach/contexto       -> se usa si es único
ambiguo o ausente               -> REHÚSA; exige consumidor explícito
```

No se añade otra variable ni otro default independiente que pueda divergir de
`reach`.

## TASK-THYROX-0453 — Datos D3, opción A

Se aprueba la opción A: `runMigrationsSync` para los stores sobre `bun:sqlite`.
No se convierten `mitm`, `task`, `provider` ni `observability` a async o
multimotor sólo para uniformarlos.

```text
store bun:sqlite -> runMigrationsSync -> schema listo -> arranca el consumidor
```

El soporte específico de PostgreSQL aparece donde haya una necesidad de dominio
real; no fuerza a los stores SQLite existentes a cambiar su contrato.

## TASK-THYROX-0455 — Datos D5, qué vectorizar

La primera implementación se acota a los dos consumidores ya declarados:

```text
1. findings: un hallazgo nuevo encuentra hallazgos semánticamente similares
2. errors:   un error nuevo encuentra errores históricos similares
```

No se vectoriza en esta fase: tasks, agent_sessions, cleared_tool_results,
estado de pool/runtime, leases/cooldowns ni telemetría general.

Antes de fijar modelo, dimensiones o índice, D5 mide para findings y errors:
N actual, crecimiento esperado, tasa de escritura, tasa de consulta, `top_k`,
recall objetivo, latencia objetivo y presupuesto de almacenamiento/VRAM.

Reparto: `SemanticSearchStore` posee pgvector, ANN y rerank exacto en la base;
el `semantic_search_worker` posee embeddings y reranking por modelo;
`@thyrox/store` aporta sólo la infraestructura PostgreSQL común. El corpus no
se amplía hasta que estos dos casos estén medidos y en verde.

## TASK-THYROX-0496 … 0500 — Credenciales C3–C7

La fuente durable de la credencial es el store de conexiones/credenciales que
ya usa `resolveCredential`. No se declara en el pool, y `.env` no es la fuente
de verdad del secreto.

```text
store de conexiones/credenciales -> resolveCredential -> Proxy -> Anthropic / upstream claude-cli
```

`THYROX_STORAGE_ENCRYPTION_KEY` puede seguir en `.env` como material para
proteger y descifrar el store; no representa la credencial Anthropic.

```text
headless-pool -> thyrox -p -> Proxy local -> resolveCredential -> store de credenciales
```

La elección de fuente ocurre en el Proxy y en la resolución de la credencial,
no repartiendo tokens a cada ítem del pool. La verdad durable de la credencial
queda fuera de Redis; Redis sólo participa en coordinación efímera
(leases/cooldowns) si corresponde.

## TASK-THYROX-0539 — hueco sospechoso de migraciones

Se trata como inconsistencia, no como algo que se repare en silencio.

```text
ledger de migraciones -> hueco / secuencia imposible / migración desconocida -> se DETIENE la migración automática
```

Prohibido: rellenar el hueco, marcarlo aplicado, ignorarlo y continuar,
reordenar en silencio.

El diagnóstico dice qué versión falta, qué migraciones están presentes, qué
schema se observa realmente y qué operación se intentaba. Antes de una
reparación destructiva o de una reconciliación fuera de Git se conserva un
backup, conforme a la política pendiente del store (TASK #295). La reparación es
explícita y versionada: una migración o reconciliación conocida, no una
heurística automática. Hasta resolver el hueco no se admiten escrituras que
dependan de suponer el schema bien migrado.

## TASK-THYROX-0556 — Podman como frontera de ejecución

Se aprueba Podman como frontera de aislamiento y ejecución, no como dueño de
política.

```text
Daemon (scheduling / restart / admisión de GPU) -> PodmanWorkerManager -> Podman -> worker especializado
```

Daemon decide; PodmanWorkerManager materializa la decisión; Podman aísla y
ejecuta; el worker hace el trabajo de dominio y no conoce Podman.

Rama aparte, sin mezclar:

```text
InfrastructureBootstrap -> Podman -> PostgreSQL + pgvector, Redis
```

PostgreSQL y Redis son infraestructura gestionada, no workers especializados.
El ciclo de vida de `headless-pool` y de los trabajos de repositorio conserva su
propio ownership, RuntimeWorkspace, SnapshotStore, RecoveryController y
`.closed`. No se asumen límites de memoria, PIDs, CDI/GPU o CUDA sin medirlos
en el host real.

## TASK-THYROX-0627 — autoridad durable compartida

Los datos que son verdad durable compartida tienen una única autoridad lógica.
Si D4-B adopta PostgreSQL, la forma válida es un PostgreSQL común alcanzable por
todas las sesiones:

```text
session A ─┐
session B ─┼──► PostgreSQL autoritativo
session C ─┘
```

Un PostgreSQL por sesión no es una autoridad compartida y reproduce la
divergencia que D4 intenta eliminar. Ese PostgreSQL vive en un alcance de
infraestructura superior al ciclo de vida efímero de una sesión; no se cambia el
`InfrastructureBootstrap` local fingiendo que ya cumple esa función.

Mientras la autoridad común no exista, SQLite + Git sigue siendo el mecanismo, y
D4-A lo hace correcto con merge de tres vías. Cuando exista, los dominios que
necesiten compartir durablemente —primero `agent_sessions` y `tasks`;
`findings_history` sólo mientras no sea reconstruible del todo— migran por un
puerto/adaptador definido.

Sin fallback silencioso:

```text
modo compartido configurado + PostgreSQL compartido no disponible -> no se escribe en local fingiendo éxito
```

SQLite sigue como modo local explícito; PostgreSQL es modo compartido sólo con
una autoridad común real. Redis queda fuera de esta decisión: PostgreSQL es la
verdad durable compartida; Redis, coordinación efímera compartida.

No hace falta decidir hoy dónde se hospeda físicamente ese PostgreSQL común
para fijar la arquitectura.
