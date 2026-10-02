# Batch Thryrox - llenar PostgresSQL y liberar espacio
Sí. Te conviene convertir lo que quieres hacer en un **batch declarativo**, no en una instrucción libre. El documento que subiste exige que las N tareas estén declaradas antes de empezar, que cada una tenga dependencias, archivos permitidos, criterios de aceptación y evidencia; además, toda ejecución gestionada debe pasar por `ExecutionAuthorization -> PodmanExecutionPrimitive -> ExecutionUnit`. :chatgpt-content-reference{index="0"} También establece que las tareas independientes pueden usar `headless-pool`/GNU Parallel, pero sin construir otro scheduler. :chatgpt-content-reference{index="1"}

Yo usaría esta instrucción completa:

# Ejecución de batch: persistir corpus semántico en PostgreSQL y liberar disco

Ejecuta este batch completo sin detenerte entre tareas salvo que aparezca un `hard_block` sin transición segura declarada.

No inventes tareas nuevas. La lista T001–T007 incluida aquí es la única fuente de trabajo.

El objetivo global es:

```text
1. comprobar que PostgreSQL + pgvector está correctamente materializado
2. ingerir el corpus durable de findings
3. demostrar que el corpus sobrevive a la recreación del contenedor
4. ingerir errors
5. medir qué espacio local puede recuperarse
6. eliminar únicamente datos temporales/reconstruibles autorizados
7. demostrar que semantic search y PostgreSQL siguen íntegros después de liberar disco
```

No sacrifiques fuentes de verdad, evidencia durable ni datos necesarios para reconstrucción sólo para recuperar espacio.

---

# 1. Estado inicial

Repositorio principal:

```text
/home/user/thyrox
```

Repositorio documental:

```text
/home/user/kaupamex-docs
```

Branch:

```text
usar el branch actualmente activo del trabajo
```

Commit base:

```text
medir y registrar antes del primer cambio
```

Tarea global:

```text
POSTGRES-CORPUS-DISK-RECLAIM
```

Workbench:

```text
.claude/workbench/postgres-corpus-disk-reclaim-<timestamp>/
```

El workbench debe contener como mínimo:

```text
template.md
batch.json
tasks/
probes/
tests/
outputs/
manifest.jsonl
```

Si el workbench no existe, créalo también como trabajo gestionado:

```text
ExecutionAuthorization
→ PodmanExecutionPrimitive
→ ExecutionUnit
→ bin/manifest scaffold
```

No materialices el payload directamente desde el host.

---

# 2. Regla fundamental de ejecución

Toda ejecución gestionada de este batch pasa obligatoriamente por:

```text
managed task
→ ExecutionAuthorization
→ PodmanExecutionPrimitive
→ ExecutionUnit
```

`podman-execution-primitive` es la vía obligatoria.

Esto incluye:

```text
probes
tests
typecheck
semantic-search ingestion
verificaciones contra PostgreSQL
recreación de contenedores
mediciones de disco
mutaciones de archivos
git mutation cuando corresponda
```

No uses como ruta alternativa:

```text
podman run ...
podman create ...
podman start ...
```

desde el payload o desde scripts paralelos si la operación corresponde a un recurso Podman gestionado por Thyrox.

Para infraestructura:

```text
bin/infrastructure_ensure
        ↓
InfrastructureBootstrap
        ↓
PodmanExecutionPrimitive
        ↓
Podman
```

Debe mantenerse esa ruta.

El control plane del host sólo puede:

```text
seleccionar tareas declaradas
despachar
observar
verificar evidencia
reconciliar
seleccionar la siguiente transición
```

---

# 3. Estado que ya debe respetarse

La arquitectura vigente es:

```text
Podman workers
→ efímeros

PostgreSQL + pgvector
→ persistencia durable compartida
→ fuera del lifecycle de workers

Redis
→ coordinación / shared state efímero

SemanticSearchStore
→ corpus durable + índices vectoriales

semantic_search_worker
→ embeddings / retrieval / reranking por modelo
```

Para PostgreSQL:

```text
owner.kind = infrastructure
owner.id   = infrastructure-bootstrap
```

La contraseña no debe estar en environment como valor.

Debe utilizarse el mecanismo declarado basado en archivo/secreto:

```text
POSTGRES_PASSWORD_FILE
```

Nunca imprimas ni registres el valor de:

```text
THYROX_INFRA_POSTGRES_PASSWORD
```

ni de ningún otro secreto.

---

# 4. Invariantes globales

Durante todo el batch deben mantenerse estas propiedades.

## Ejecución

```text
todo recurso Podman gestionado
→ PodmanExecutionPrimitive
```

## PostgreSQL

```text
contenedor recreable
+
volumen durable conservado
```

El corpus no puede depender de la capa writable del contenedor.

## Semantic Search

Después de ingerir un documento:

```text
source_ref
≠
source dependency
```

Una búsqueda debe poder obtener el texto desde PostgreSQL aunque la fuente temporal original ya no exista.

## Corpus

Distinguir:

```text
fuente de verdad del dominio
≠
snapshot durable para semantic search
≠
embedding derivado
≠
resultado histórico de análisis
```

## Disco

No borrar automáticamente:

```text
.git/
repositorios canónicos
ADRs canónicos
documentación canónica
volumen thyrox-postgres-data
datos aún no ingeridos
evidencia requerida por análisis persistidos
secretos/configuración necesaria
```

## Seguridad

No registrar valores de secretos en:

```text
prompt
transcript
argv
logs
workbench
Git
podman inspect
```

---

# 5. Batch DAG

Usa exactamente este DAG:

```text
T001
  │
  ▼
T002
  │
  ▼
T003
  ├───────────┐
  ▼           ▼
T004         T005
  │           │
  └─────┬─────┘
        ▼
       T006
        │
        ▼
       T007
```

Interpretación:

```text
T001 → verificar infraestructura PostgreSQL
T002 → ingerir findings
T003 → demostrar durabilidad
T004 → ingerir errors
T005 → inventariar espacio recuperable
T006 → liberar únicamente espacio autorizado
T007 → verificación final integral
```

T004 y T005 pueden ejecutarse concurrentemente después de T003.

Usa `headless-pool`/GNU Parallel únicamente si ambas están `runnable`.

No construyas otro scheduler.

---

# 6. T001 — Preflight de PostgreSQL

## Objetivo

Demostrar que `thyrox-postgres` está correctamente materializado y listo para recibir el corpus.

## Dependencias

```text
[]
```

## Medir primero

Registrar:

```text
estado del contenedor
owner labels
container id
imagen
named volume
mount destination
puerto declarado
health
pg_isready
versión PostgreSQL
versión pgvector
base destino
espacio libre del filesystem
espacio utilizado por el volumen
```

No imprimir secretos.

## Verificaciones requeridas

Debe comprobarse:

```text
thyrox-postgres
→ running

owner.kind
→ infrastructure

owner.id
→ infrastructure-bootstrap

volume
→ thyrox-postgres-data

PostgreSQL
→ ready

THYROX_SEMANTIC_SEARCH_DATABASE_URL
→ conecta correctamente

pgvector
→ habilitado

pgvector version
→ compatible con el contrato actual

POSTGRES_PASSWORD_FILE
→ presente como mecanismo

password literal
→ ausente de podman inspect
```

Comprueba además que un segundo:

```text
bin/infrastructure_ensure thyrox-postgres
```

sobre un recurso correcto produce:

```text
kept
```

y no recreación innecesaria.

## RED / control causal

El control debe demostrar que una declaración deliberadamente incorrecta de volumen es detectada como drift.

No destruyas el volumen durable.

## Criterio de cierre

T001 sólo es `accepted` si PostgreSQL está sano, correctamente montado y listo para ingestión.

---

# 7. T002 — Ingestar findings

## Objetivo

Ingerir en PostgreSQL el corpus durable de findings ya declarado.

## Dependencias

```text
[T001]
```

## Fuente

```text
/home/user/kaupamex-docs
```

Usar el mecanismo existente:

```text
bin/semantic-search-ingest finding --root /home/user/kaupamex-docs
```

pero ejecutado dentro de la ruta gestionada del batch, no como payload arbitrario del host.

## Antes de ingerir

Registrar conteos iniciales:

```text
documents
document versions
document_chunks
embedding_spaces
embeddings
analysis_runs
analysis_candidates
```

## Ejecutar

Ingerir findings.

## Verificar

Debe demostrarse:

```text
findings declarados
→ documents

contenido
→ document_chunks.text

identidad
→ metadata/source identity

content hash
→ persistido

embedding
→ espacio activo

retrieval
→ devuelve texto desde PostgreSQL
```

## Idempotencia

Volver a ingerir el mismo corpus.

Debe resultar:

```text
mismo content_hash
→ 0 versiones nuevas
→ 0 chunks duplicados
→ 0 embeddings duplicados
```

No basta con que el comando salga 0.

## Evidence

Guardar:

```text
conteos before/after
logs
queries de verificación
retrieval sample
idempotency result
```

sin secretos.

## Criterio de cierre

Findings recuperables desde PostgreSQL y reingesta idempotente.

---

# 8. T003 — Durabilidad real

## Objetivo

Demostrar que PostgreSQL, y no el contenedor, posee el corpus durable.

## Dependencias

```text
[T002]
```

## Estado inicial

Elegir una muestra determinista de findings ya ingeridos.

Guardar:

```text
document ids
chunk ids
content hashes
texto esperado
embedding space
conteos
```

## Recreación

Forzar de manera declarada una recreación válida del contenedor mediante:

```text
bin/infrastructure_ensure
→ InfrastructureBootstrap
→ PodmanExecutionPrimitive
```

Nunca eliminar el volumen:

```text
thyrox-postgres-data
```

No ejecutar `podman rm/create` directamente.

## Después de recrear

Comprobar desde una unidad/proceso nuevo:

```text
mismos documents
mismos chunks
mismos hashes
mismo texto
embedding space disponible
retrieval funcional
```

## Annulment/control

La prueba debe ser capaz de fallar si el volumen correcto no está montado o si las escrituras hubieran ido a la capa efímera del contenedor.

## Criterio de cierre

Debe quedar probado:

```text
container identity cambió
+
volume identity permaneció
+
corpus permaneció
```

Sólo entonces pueden ejecutarse las tareas destinadas a liberar espacio.

---

# 9. T004 — Ingestar errors

## Objetivo

Ingerir el corpus durable de errores mediante el ingester existente.

## Dependencias

```text
[T003]
```

## Reglas

Aplicar exactamente las mismas propiedades de T002:

```text
durabilidad
content_hash
versionado
chunks
embedding space
retrieval
idempotencia
```

## No hacer

No inventes un ingester nuevo si el mecanismo ya existe.

Si se descubre una carencia no bloqueante:

```text
persist finding
→ continuar
```

## Criterio de cierre

Errors recuperables desde PostgreSQL y segunda ingestión idempotente.

---

# 10. T005 — Inventario de espacio recuperable

## Objetivo

Medir qué consume disco y clasificar qué puede eliminarse de forma segura.

## Dependencias

```text
[T003]
```

## Sólo medir

En esta tarea no borres nada.

Inventariar como mínimo:

```text
filesystem raíz
Podman graph root
Podman volumes
thyrox-postgres-data
Ollama model volume
.claude/worktrees/
.claude/workbench/
pool outputs
job logs
temporary execution data
build caches
package caches
TMPDIRs conocidos
imágenes OCI
contenedores detenidos
archivos grandes
```

## Clasificación

Cada candidato debe quedar en una de estas clases:

```text
A. canonical
   → no borrar

B. durable infrastructure
   → no borrar

C. required evidence
   → no borrar

D. already-ingested but still canonical
   → no borrar automáticamente

E. reconstructible cache
   → candidato

F. stale execution artifact
   → candidato si no está referenciado

G. abandoned worktree
   → candidato sólo si su trabajo durable está preservado

H. unknown
   → no borrar
```

## Worktrees

No asumir:

```text
“PostgreSQL tiene el texto”
→ “puedo borrar cualquier worktree”
```

Primero verificar:

```text
trabajo útil committed/archive/persistido
+
no existe estado exclusivo sin preservar
```

## Output

Crear una tabla:

```text
path/resource
bytes
class
reason
safe_to_delete
expected_reclaim_bytes
references
```

## Criterio de cierre

Inventario completo y lista cerrada de candidatos seguros.

---

# 11. T006 — Liberar espacio

## Objetivo

Eliminar únicamente candidatos aprobados por T005.

## Dependencias

```text
[T004, T005]
```

## Regla

No uses objetivos vagos como:

```text
“libera todo lo posible”
```

Sólo elimina recursos que T005 haya marcado:

```text
safe_to_delete = true
```

## Antes de cada clase de borrado

Registrar:

```text
espacio libre antes
identidad del recurso
razón de eliminación
evidencia que demuestra que es reconstruible/no canónico
```

## Después

Registrar:

```text
espacio libre después
bytes recuperados
resultado
```

## Nunca eliminar

```text
thyrox-postgres-data
repos Git
documentos fuente de verdad
.env
secrets
datos no ingeridos
analysis evidence requerida
recursos de estado desconocido
```

## Podman

Si se eliminan recursos Podman gestionados por Thyrox, respetar la arquitectura vigente.

No usar una vía alternativa de materialización.

Las operaciones administrativas de limpieza que estén fuera del alcance de Rule 4 deben estar expresamente justificadas como tales.

## Criterio de cierre

Espacio recuperado sin pérdida de corpus, fuentes canónicas ni infraestructura durable.

---

# 12. T007 — Verificación integral después de liberar disco

## Objetivo

Probar que la liberación de disco no rompió el sistema.

## Dependencias

```text
[T006]
```

## Verificar infraestructura

```text
thyrox-postgres
→ healthy

thyrox-postgres-data
→ montado

pgvector
→ compatible

DB
→ accesible
```

## Verificar corpus

Comprobar conteos y muestras de:

```text
findings
errors
documents
document_chunks
embedding spaces
embeddings
```

## Verificar retrieval

Ejecutar consultas deterministas sobre:

```text
finding conocido
error conocido
```

y comprobar:

```text
candidate ids
texto recuperado
source identity
scores/orden cuando corresponda
```

No dependas del filesystem original para recuperar el texto ya ingerido.

## Reingesta final

Ejecutar una reingesta pequeña/idempotente sobre corpus sin cambios.

Esperado:

```text
0 versiones innecesarias
0 chunks duplicados
0 embeddings duplicados
```

## Disco

Reportar:

```text
free_before_batch
free_before_cleanup
free_after_cleanup
reclaimed_bytes
postgres_volume_bytes
```

## Criterio de cierre

Sólo aceptar si:

```text
PostgreSQL sano
+
corpus intacto
+
retrieval verde
+
idempotencia verde
+
espacio recuperado medido
+
ningún recurso prohibido eliminado
```

---

# 13. Provider/model selection

Toda tarea que realmente necesite juicio se ejecuta mediante:

```text
ExecutionUnit
→ thyrox -p
→ candidate permitido
```

Usa únicamente providers/modelos permitidos por la política actual del batch.

Como candidatos iniciales, si siguen declarados y disponibles:

```text
qwen3.8-flash
deepseek-v4.1-flash
```

Claude queda deshabilitado para este batch.

No ejecutar:

```text
claude -p
--runner claude
Agent/subagent
fallback implícito a claude-cli
```

Un fallo de provider nunca implica:

```text
provider failure
→ Claude
```

Las operaciones puramente deterministas no necesitan modelo:

```text
SQL queries
filesystem measurement
hashing
conteos
tests
typecheck
disk accounting
verifier
```

Ejecútalas como procesos deterministas dentro de la unidad autorizada.

---

# 14. Secrets

Usa allowlist mínima por tarea.

Ejemplo conceptual:

```text
T001/T002/T003/T004/T007
→ sólo nombres de secretos estrictamente necesarios para acceder al PostgreSQL de prueba/infraestructura
```

No heredar `.env` completo.

Nunca exponer:

```text
THYROX_INFRA_POSTGRES_PASSWORD
Docker Hub PAT
Anthropic keys
registry credentials
otros secretos no declarados
```

Registrar sólo:

```text
secret_name
present/absent
```

Nunca el valor.

---

# 15. Retry policy

Cada tarea:

```yaml
max_attempts: 4
```

Para tareas con provider:

```text
provider_transient
→ retry según presupuesto
→ cambiar a otro provider permitido
→ nunca Claude
```

Para:

```text
502
timeout
rate limit
provider connection transient
```

registrar evidencia y continuar según presupuesto.

No loops infinitos.

---

# 16. Continuation Controller

Estados:

```text
RUNNABLE
→ DISPATCHED
→ RUNNING
→ VERIFYING
```

Aceptación:

```text
tests green
+ invariants green
+ annulment válido
+ allowed diff
+ secret boundary
+ outputs presentes
```

Entonces:

```text
ACCEPTED
→ commit si hubo cambio versionable
→ push
→ satisfacer dependencias
→ siguiente runnable
```

Un proceso muerto sin resultado aceptado:

```text
frontier no avanza
→ reanudar la misma tarea
```

No interpretar output vacío como stall.

Usar:

```text
process liveness
transcript
children
filesystem evidence
timeout
heartbeat
```

---

# 17. Hard blocks

Sólo detener el batch si:

```text
PostgreSQL no puede arrancar mediante la primitive
volumen durable está corrupto/no disponible
credencial requerida no está disponible
la ingestión no puede verificarse
la persistencia no sobrevive la recreación
la operación necesaria sería irreversible y no autorizada
el contrato se contradice
no existe transición segura
```

Un finding no relacionado que no impida la tarea:

```text
persist finding
→ continuar
```

No secuestres el batch para arreglarlo.

---

# 18. Deterministic verifier

El worker no se acepta a sí mismo.

Orden obligatorio:

```text
1. scope / diff
2. architecture gates
3. RED
4. GREEN
5. typecheck
6. annulment
7. secret boundary
8. required outputs
9. container/volume identity
10. PostgreSQL durability
11. disk accounting
```

Sólo entonces:

```text
accepted = true
```

---

# 19. Telemetría

Por intento registrar:

```json
{
  "task": "T00X",
  "attempt": 1,
  "provider": "...",
  "model": "...",
  "executionId": "...",
  "containerId": "...",
  "inputTokens": 0,
  "outputTokens": 0,
  "cachedTokens": 0,
  "elapsedMs": 0,
  "exit": 0,
  "verdict": "accepted"
}
```

Para procesos sin modelo:

```text
inputTokens = 0
outputTokens = 0
cachedTokens = 0
```

Añadir referencias a:

```text
transcript
RED
GREEN
annulment
diff
SQL evidence
disk measurement
commit
```

No secretos.

---

# 20. Reporting

No reportes narrativos entre T001–T007.

Persistir evidence sí es obligatorio.

No:

```text
T001
→ explicar
→ esperar

T002
→ explicar
→ esperar
```

Sí:

```text
T001
→ T002
→ T003
→ {T004,T005}
→ T006
→ T007
→ final report
```

Sólo interrumpir ante `hard_block`.

---

# 21. Resultado final

Al terminar entrega un único reporte con:

```text
7 total
N accepted
N failed
N blocked/skipped
```

Por tarea:

```text
id
attempts
provider/model o deterministic
tests
annulment
commit
tokens
elapsed
verdict
```

Añadir:

```text
PostgreSQL container id final
PostgreSQL volume
pgvector version
findings documents/chunks/embeddings
errors documents/chunks/embeddings
reingest duplicates = 0/valor
free disk before
free disk after
bytes reclaimed
resources deleted
resources deliberately preserved
non-blocking findings
incidents/recovery
branch final
local/remote equality
```

Y una comprobación final explícita:

```text
¿puede desaparecer/recrearse el contenedor PostgreSQL
sin perder el corpus?

YES / NO
```

junto con la evidencia determinista que sustenta el resultado.

Hasta completar T007, continúa automáticamente.

Esta instrucción sigue la estructura del documento: tarea declarada + contrato + autorización + evidencia, que el propio archivo define como la unidad fundamental de ejecución. :chatgpt-content-reference{index="2"} También mantuve el verifier separado del modelo, porque el documento especifica que el modelo implementa pero **no decide si su propio trabajo está aceptado**. :chatgpt-content-reference{index="3"}
---

# 22. Enmienda 2026-10-02T06:38:07 — preservar antes de liberar

Directiva del ejecutor 2026-10-02. **Sustituye** el DAG de §5, amplía §10
(T005) y restituye la dependencia de §11 (T006). El `dependencyOverride` de
T006 en `plan.jsonl` («T006 exige sólo que los errors estén ingeridos») queda
**retirado**: el corpus que T004 modelaba era demasiado pequeño, no la
dependencia innecesaria.

```text
liberar disco ≠ borrar primero y vectorizar después
primero preservar conocimiento, después liberar almacenamiento
```

## 22.1 Universo de corpus

Además de findings y errors, son fuentes candidatas del corpus semántico:

```text
.claude/workbench/**
.claude/build-logs/**
.claude/cache/**
.claude/logs/**
.thyrox/**
```

Candidata no es «insertar todos los bytes». La retención se decide por
**contenido y ownership**, nunca por el nombre del directorio.

## 22.2 T005b — inventario de corpus (sólo medir)

Recorre los cinco árboles y clasifica cada elemento en exactamente una clase:

```text
semantic_content | durable_evidence | execution_state | reconstructible_cache |
secret_sensitive | binary_non_indexable | duplicate
```

Produce **dos inventarios relacionados** en `outputs/T005b-corpus-inventory.json`:
A (corpus pendiente de preservación) y B (espacio potencialmente recuperable).
Cada fila: `path, bytes, content_class, semantic_value, canonical_owner,
ingested, document_id, content_hash, safe_to_delete, reason`.

Reglas, comprobadas por el verificador sobre cada fila:

```text
semantic_value = true AND ingested != true  → safe_to_delete = false
content_class = secret_sensitive            → nunca se lee su valor; se clasifica
                                              por nombre/ownership vía
                                              src/verify/env_sensitivity.tsv;
                                              safe_to_delete = false
content_class desconocido                   → safe_to_delete = false
```

El texto de un secreto nunca entra al inventario, al corpus ni a la evidencia.

## 22.3 D5 — productor de embeddings (decisión del ejecutor)

Antes de cualquier ingesta con embeddings se fijan: productor, modelo,
dimensiones y representación (`vector`/`halfvec`/`bit`). T005c mide el
**espacio mínimo** que exige materializar cada candidato declarado y lo
publica en `outputs/T005c-embedding-requirement.json`. Sin D5 decidido,
T008 rehúsa.

## 22.4 T005a — headroom previo (no es T006)

Sólo si `T005c` mide que el disco libre no alcanza. Elimina **únicamente**
recursos que T005 y T005b demuestran a la vez reconstruibles y ajenos al
corpus (hoy: imagen llama.cpp `9ace0117e8ff…` y `/root/.npm/_cacache`, si
T005b no los reclasifica). Mismas reglas de registro que §11. Nunca toca los
cinco árboles de 22.1.

## 22.5 Ingesta

```text
T002  findings          T004  errors
T004a workbench         T004b build-logs        T004c logs
T004d .thyrox           T004e contenido semántico de cache
```

Cada rama ingiere sólo filas de T005b con `semantic_value = true` o
`durable_evidence` recuperable, por el ingester existente
(`bin/semantic-search-ingest`) con su reconocedor por dominio; un dominio sin
reconocedor se **extiende** ahí, no se construye otro ingester. Las ramas
independientes corren por `headless-pool`/GNU Parallel cuando T008 esté
aceptada. El controlador no crea ramas: sólo las declaradas en `plan.jsonl`.

Por documento se persiste: identidad, `source_ref` lógico, tipo de fuente,
versión, `content_hash`, timestamps, texto y posición de cada chunk, metadata,
espacio de embeddings y embedding. `source_ref ≠ dependencia de runtime`.

## 22.6 T009 — invariante de borrado

Para cada `source_path` candidato a borrar:

```text
existe document/version correspondiente
→ content_hash coincide con el archivo
→ chunks persistidos
→ embeddings presentes en el espacio activo
→ retrieval devuelve el texto esperado
→ con el archivo ausente (renombrado fuera del árbol, no borrado), retrieval sigue devolviéndolo
```

Sólo entonces `safe_to_delete = true`, y además el elemento no es fuente
canónica ni evidencia raw que deba conservarse. Salida:
`outputs/T009-deletion-proofs.jsonl`, una fila por `source_path`.

## 22.7 DAG vigente

```text
T001 PostgreSQL ready
  ↓
T005 inventario de disco (aceptada) → T005b inventario de corpus → T005c requisito del embedding producer
  ↓
T005a headroom seguro (sólo si T005c lo exige)
  ↓
T008 embedding producer disponible (exige D5 decidido)
  ↓
T002 · T004 · T004a · T004b · T004c · T004d · T004e   (independientes)
  ↓
T009 durabilidad + retrieval + pruebas de borrado
  ↓
T006 cleanup final (sólo filas con prueba T009)
  ↓
T007 verificación final
```

## 22.8 Fuera de esta enmienda

ADR-008 1.6.0 fijó como corpus inicial findings y errors. Ampliar el universo
exige su enmienda en `kaupamex-docs`; hasta entonces esta enmienda gobierna el
batch y declara la divergencia.

---

# 23. Enmienda 2026-10-02T06:46:41 — D5 decidida, capacidad y calificación

Directiva del ejecutor 2026-10-02. El mismo mensaje traía dos versiones de D5:
la primera fijaba `embeddinggemma:300m-qat-q4_0` servido por `thyrox-ollama`;
la segunda **la sustituye** por un modelo abierto con licencia permisiva,
producido en el propio worker. Rige la segunda. Se conserva de la primera todo
lo que no contradice: la representación persistida, los agregados de T005b, el
cálculo de T005c, el invariante de T009 y el trato de los trabajos vivos.

## 23.1 D5

```text
producer        = semantic_search_worker, runtime local gestionado
model           = nomic-ai/nomic-embed-text-v1.5
license         = Apache-2.0
dimensions      = 768
stored vector   = halfvec(768)          (durable; rerank exacto, medición, comparación)
ANN             = binary_quantize(embedding)::bit(768), HNSW, bit_hamming_ops
exact rerank    = distancia coseno sobre el halfvec original
GPU             = no requerida; CPU soportada
```

Recuperación: consulta → embedding 768 → binary_quantize → HNSW/Hamming → N
candidatos → coseno exacto sobre halfvec → K. **Nunca se almacena sólo el
bit(768).** Ollama puede seguir existiendo para generación/RAG; la búsqueda
semántica no depende de él. Un segundo runtime se admite sólo si es el que
ejecuta este modelo en el worker; se mide en T008, no se elige aquí.

El espacio de embeddings registra como mínimo: producer, model, revisión o
digest exacto del artefacto, licencia, dimensions = 768, representación
almacenada = halfvec, representación ANN = bit, distancia = coseno, prefijos de
tarea del modelo (`search_document:` / `search_query:`), created_at y state
(building|active|retired). **Medido hoy** en `corpusSql.ts:60-68`: la tabla
`embedding_spaces` guarda model, dimensions, representation, state y
created_at; faltan producer, revisión/digest, licencia, representación ANN,
distancia y prefijos. Se **extienden** ahí (EXTEND), no en otra tabla.

## 23.2 T005b — agregados además del inventario por archivo

`total_bytes_scanned, semantic_bytes, durable_evidence_bytes,
reconstructible_bytes, excluded_secret_bytes, excluded_binary_bytes,
duplicate_bytes`, más la estimación de documentos y chunks. Los tamaños de §22
son el **universo de entrada**, no el corpus final.

Un elemento con escritor u ownership vivo (hoy: `mechanism-registry-run3` y el
WIP de P2d en TASK-THYROX-0743) es `execution_state` con `live_owner` y
`safe_to_delete = false` mientras el ownership exista. Este batch no lee,
commitea ni limpia esos archivos.

`secret_sensitive` nunca llega al embedding producer.

## 23.3 T005c — capacidad

```text
required = embedding_model_bytes          (de T008 si ya midió, si no la cota del artefacto declarado)
         + runtime_bytes                  (el runtime local del worker)
         + estimated_new_postgres_text_bytes
         + estimated_embedding_bytes      (chunks × 768 × 2 B, halfvec)
         + estimated_index_bytes          (HNSW sobre bit(768) + índices de texto/metadata)
         + postgres_operational_headroom  (MVCC, páginas, WAL)
         + ingestion_temporary_headroom
```

comparado con `free_after_T005a`. Cada término lleva su fórmula y su fuente.
Si no cabe, se registra el **déficit** y sólo se busca headroom adicional en
filas de T005b clasificadas como reconstruibles y ajenas al corpus. Ninguna
ingesta llena el disco hasta el 100 %: el plan para antes del umbral declarado.

Nota: la imagen llama.cpp es hoy candidata de T005a. Si T008 midiera un
runtime GGUF para este modelo, T005a la reclasifica antes de borrarla.

## 23.4 T008 — calificación del artefacto concreto

Antes de la ingesta masiva, T008 mide sobre CPU: bytes del artefacto, pico de
RAM, latencia por lote, throughput, calidad mínima de retrieval y headroom de
disco requerido; registra la revisión/digest exacta. Si la versión completa no
cabe, evalúa una variante cuantizada **del mismo modelo** y la compara en
retrieval contra la base antes de adoptarla; el tamaño solo no la adopta.
T008 extiende `embedding_spaces` (23.1) y deja el espacio en `building`; pasa
a `active` sólo con la calificación aceptada.

## 23.5 T009 — invariante, completo

Para cada path que vaya a desaparecer: hash de la fuente = hash de la
document/version persistida; chunks persistidos; embeddings presentes en el
espacio activo; retrieval sin el filesystem de la fuente pasa. Además:
fuente canónica = no; evidencia raw requerida = no; secret_sensitive = no;
ownership vivo = no. Sólo entonces `safe_to_delete = true`.

## 23.6 ADR-008

Se enmienda a 1.7.0 en `kaupamex-docs`: universo de corpus de §22.1 con
«estar en el árbol ≠ ser corpus», clases de T005b, ingesta sólo de las clases
que declare la corpus policy, D5 de 23.1. Cierra la divergencia de §22.8.

---

# 24. Enmienda 2026-10-02T08:50:49 — forma de la evidencia que consume P0 del lote A1–A7

Directiva del ejecutor 2026-10-02: «copiado» no equivale a «reemplazable». El
lote A1–A7 (`ollama-artifact-acceptance-20261002T081928`, §8) sólo arranca si
este banco termina y su evidencia tiene esta forma; el verify de cada ítem
sigue siendo el suyo.

- `T009-deletion-proofs.jsonl`: una fila por `source_path` con
  `document_present`, `content_hash_match`, `chunks_persisted`,
  `embeddings_present`, `retrieval_ok`, `retrieval_ok_with_source_absent`
  (booleanos) y `safe_to_delete`, que sólo vale `true` si todos lo son y la
  ruta no es fuente canónica ni evidencia raw que deba conservarse.
- `T006-reclaim.json`: `freeBytesBefore` y `freeBytesAfter` **medidos** con
  el mismo instrumento, `reclaimedBytesObserved = after − before`, y
  `deleted`: lista de `{path, bytes, replacedBy}`, con `replacedBy` la
  autoridad PostgreSQL (documento y versión) y `path` presente en T009 con
  `safe_to_delete`. Se borra **sólo** lo que figura ahí.
- `T007-verify.json`: `postgresReady`, `vectorExtension`, `schemaPresent`,
  `countsMatch`, `retrievalPass`, todos medidos después del borrado.
