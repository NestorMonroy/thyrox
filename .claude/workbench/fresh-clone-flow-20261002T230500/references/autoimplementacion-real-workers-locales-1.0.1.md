
# La autoimplementación real de Thyrox con workers locales - 1.0.1



Tienes que darle una instrucción que marque **el momento exacto en que termina el bootstrap y empieza la autoimplementación**, y que además impida que el controlador vuelva a escribir código directamente.

Yo le diría esto:

A partir de este punto quiero cerrar el bootstrap y comenzar la **autoimplementación real de Thyrox con workers locales**.

El objetivo ya no es seguir preparando infraestructura. El objetivo es demostrar y después usar de forma normal este flujo:

```
TASK
→ Search Existing
→ REUSE / EXTEND / MISSING
→ planner / dependencies
→ local model selection
→ managed worker
→ ExecutionAuthorization
→ PodmanExecutionPrimitive
→ ExecutionUnit
→ isolated worktree
→ qwen3-4b
→ Read / Edit / Bash / tests
→ GREEN
→ verifier
→ integration
→ durable evidence
→ semantic ingestion
```

El controlador principal deja de ser el implementador.

## 1. Cierra únicamente los prerequisitos que están abiertos

No abras más infraestructura ni nuevos mecanismos salvo que Search Existing demuestre que son estrictamente necesarios.

Termina en este orden:

### E0

Corrige el falso positivo del clasificador:

- heredoc usado como datos → no es payload;
    
- texto citado → no es payload;
    
- heredoc entregado a `bash/sh` → sí se analiza porque se ejecuta.
    

Haz:

`RED → GREEN → annulment → suites → real hook`

y publica E0.

### task

Espera el resultado gestionado de:

`qwen3-4b → batch-worker-mecanica@1`.

Si pasa, registra la qualification mediante la autoridad existente.

Si falla, no uses provider fallback: registra la incapacidad medida y continúa con la siguiente transición segura.

## 2. Repite A6 inmediatamente después

Cuando `qwen3-4b` tenga qualification vigente para `mecanica`, ejecuta A6 otra vez por la ruta real:

```
headless-pool
→ task-class mecanica
→ versioned execution policy
→ agent-recommend
→ qwen3-4b
→ ExecutionUnit
→ thyrox -p
→ local proxy
→ model coordinator
→ managed Ollama
```

No uses:

- Claude;
    
- Agent;
    
- Explore;
    
- provider remoto;
    
- `--model` manual para saltar el recomendador;
    
- ejecución directa fuera del ledger.
    

El criterio de A6 es:

```
selected runtime = local Ollama
selected model = qwen3-4b
fallback = none
ExecutionUnit = managed
result = correct
```

La respuesta `42` sólo demuestra routing. No cierres el bootstrap todavía.

## 3. La siguiente prueba debe ser una modificación REAL de Thyrox

Después de A6, no sigas ampliando benchmarks sintéticos.

Selecciona una TASK pequeña, real, pendiente y de clase compatible con la qualification de `qwen3-4b`.

Debe ser suficientemente pequeña para el contexto medido y debe requerir al menos:

```
Search Existing
→ localizar autoridad existente
→ leer archivos
→ modificar código
→ ejecutar prueba RED/GREEN
→ verificar resultado
```

No inventes una tarea artificial si existe una TASK real adecuada.

El controlador sólo:

- selecciona la TASK;
    
- prepara contexto;
    
- despacha;
    
- observa;
    
- verifica;
    
- integra.
    

El **worker local** debe hacer la implementación.

## 4. La primera autoimplementación debe correr en aislamiento gestionado

Quiero esta forma:

```
TASK-THYROX-XXXX
        ↓
headless-pool
        ↓
managed ExecutionUnit
        ↓
isolated worktree
        ↓
qwen3-4b
        ↓
Search Existing
        ↓
Edit / Bash / tests
        ↓
GREEN
        ↓
snapshot / lifecycle
        ↓
verifier
        ↓
integration
```

No permitas:

```
controller → Edit
controller → Write
controller → sed -i
controller → replace_literal
controller → implementación directa
```

para esa tarea.

## 5. Demuestra explícitamente actor ownership

Antes de pasar la política a `managed-only`, prueba los dos lados.

### Controller

```
actor = controller
controller.implementation = managed-only
Edit src/... 
→ DENY
```

### Managed worker

Usa la identidad real existente del worker, no un fake:

- `THYROX_POOL_ITEM`;
    
- `THYROX_EXECUTION_ENTRY`;
    
- o la autoridad canónica que Search Existing determine.
    

Debe resultar:

```
actor = managed worker
Edit en su isolated worktree
→ ALLOW
```

El gate no puede distinguir sólo por path o por regex del comando.

Debe distinguir **quién posee la ejecución**.

Si `managed-only` también bloquea al worker local, no cierres la excepción: corrige primero la autoridad de ownership.

## 6. Criterio para terminar bootstrap-exception

No termina cuando:

- Qwen pasa tool calling;
    
- Qwen pasa `mecanica`;
    
- A6 responde `42`.
    

Termina sólo cuando exista evidencia de:

```
real TASK
→ Search Existing
→ qwen3-4b selected locally
→ managed worker
→ isolated worktree
→ real code modification
→ tests GREEN
→ verifier PASS
→ integrated result
```

sin Claude ni provider remoto.

Cuando esa prueba pase:

```
controller.implementation:
bootstrap-exception
→ managed-only
```

Haz ese cambio como transición explícita, versionada y probada.

Después ejecuta una nueva invocación del hook para demostrar:

```
Controller mutation → DENY
Managed worker mutation → ALLOW
Agent / Explore → DENY
Unmanaged payload → DENY
Remote fallback → DENY
```

## 7. Desde ese momento, la autoimplementación es el modo normal

Una vez `managed-only` esté activo, no vuelvas a implementar TASKs desde el controlador.

Para cada nueva tarea:

```
TASK
→ Search Existing
   → lexical mechanisms
   → findings/store
   → semantic retrieval cuando A8b exista
→ REUSE / EXTEND / MISSING
→ dependency resolution
→ choose eligible local model
→ managed worker
→ implementation
→ verification
→ integration
→ knowledge ingestion
```

Si una TASK excede la capacidad del modelo local:

1. descomponla;
    
2. reduce el contexto;
    
3. ejecuta partes independientes en paralelo;
    
4. usa el modelo sólo sobre los mecanismos relevantes.
    

No actives automáticamente un provider remoto.

Si no existe un modelo local elegible:

```
TASK = UNSCHEDULABLE
```

y continúa con otras TASKs runnable.

`blocked(branch) != blocked(global)`.

## 8. Continúa con la cola existente

Después de cerrar la primera autoimplementación local, continúa con los nodos existentes, no inventes una nueva arquitectura:

```
P2e
→ P3

A8a implementation
→ A2 embeddings
→ A8b semantic Search Existing

después
→ A9 self-implementation workers
```

Cada uno debe entrar por el mismo flujo local gestionado.

## 9. Search Existing es obligatorio para el worker local

Antes de modificar código, el worker debe producir una clasificación:

```
capability
existing authority
consumers
tests
current health
decision = REUSE | EXTEND | MISSING
```

Reglas:

- REUSE → cablea lo existente;
    
- EXTEND → modifica la autoridad canónica;
    
- MISSING → sólo entonces crea mecanismo nuevo.
    

No quiero que un modelo local compense su menor contexto creando arquitecturas paralelas.

## 10. Empieza ahora

No me preguntes si debes empezar la autoimplementación.

La transición ya está autorizada.

Haz ahora:

```
finish E0
+
finish task:mecanica
        ↓
rerun A6
        ↓
select smallest real runnable Thyrox TASK
        ↓
dispatch to qwen3-4b as managed worker
        ↓
real code change + GREEN
        ↓
verify/integrate
        ↓
switch controller.implementation to managed-only
```

Sólo detente si aparece uno de estos casos:

- no existe transición segura;
    
- admission refusal;
    
- riesgo de pérdida/destrucción;
    
- conflicto entre autoridades arquitectónicas;
    
- no existe ninguna TASK localmente schedulable.
    

En cualquier otro caso, continúa automáticamente con el siguiente nodo runnable.

La parte más importante es esta secuencia:

```
Qwen responde
    ↓
Qwen queda task-qualified
    ↓
A6 demuestra routing local
    ↓
Qwen modifica una TASK REAL
    ↓
verifier acepta
    ↓
managed-only
    ↓
Claude/controller deja de implementar
```

Hasta ahora estabas construyendo **la infraestructura para autoimplementarse**. Con esa instrucción le estás diciendo exactamente cuándo debe dejar de prepararla y **empezar a utilizarla para implementar Thyrox**.