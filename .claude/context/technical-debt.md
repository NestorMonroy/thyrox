```yml
type: Registro de Deuda Técnica
created_at: 2026-04-03
updated_at: 2026-04-09 10:30:00
```

# Deuda Técnica — THYROX

Registro de problemas conocidos que no se corrigen inmediatamente pero deben
ser atendidos. Cada ítem tiene un ID, descripción, impacto, y criterio de resolución.

## Convenciones

- `[ ]` = Pendiente
- `[-]` = En progreso
- `[x]` = Resuelto (YYYY-MM-DD)
- Severidad: alta | media | baja
- Origen: error registrado (ERR-NNN) o identificado en revisión

---

## TD-001: Timestamps incompletos en metadatos de artefactos

```
Severidad: media
Origen: Revisión 2026-04-03
Fase afectada: Todas (al crear artefactos desde templates)
Estado: [ ] Pendiente
```

**Problema:**
Los templates definen `Fecha: [YYYY-MM-DD-HH-mm-ss]` pero al instanciar artefactos
se usa con frecuencia solo la fecha (`YYYY-MM-DD`) sin el componente de hora.

Ejemplo detectado:
- `voltfactory-adaptation-analysis.md` → `Fecha: 2026-04-03-00-49-34` (correcto)
- `voltfactory-adaptation-solution-strategy.md` → `Fecha: 2026-04-03` (incompleto)

**Impacto:**
Sin el timestamp completo no es posible ordenar artefactos creados el mismo día ni
reconstruir el orden de creación dentro de una sesión. Rompe la trazabilidad temporal.

**Resolución:**
- Corregir todos los artefactos existentes con fecha incompleta
- Agregar regla explícita en `conventions.md`: el campo `Fecha:` en artefactos WP
  debe usar siempre `YYYY-MM-DD-HH-MM-SS` (timestamp real, no estimado)
- Agregar validación en `validate-session-close.sh`: detectar `Fecha: \d{4}-\d{2}-\d{2}$`
  (fecha sin hora) en archivos dentro de `context/work/`

**Criterio de cierre:**
Todos los artefactos en WPs activos tienen timestamp completo. Validación automática
en place.

---

## TD-003: Templates huérfanos en assets/ no referenciados en ningún flujo

```
Severidad: baja
Origen: Auditoría 2026-04-03
Fase afectada: Cross-phase (confusión al buscar templates)
Estado: [ ] Pendiente
```

**Problema:**
Seis templates en `.claude/skills/pm-thyrox/assets/` no están referenciados en
SKILL.md ni en ningún reference activo del flujo. Generan ruido y confusión:
- `ad-hoc-tasks.md.template` — tracking de tareas ad-hoc sin WP formal
- `analysis-phase.md.template` — duplica funcionalidad de `introduction.md.template`
- `categorization-plan.md.template` — no corresponde a ninguna fase del SKILL
- `document.md.template` — template genérico sin fase asignada
- `project.json.template` — metadata de proyecto en JSON (no Markdown)
- `refactors.md.template` — tracking de refactors (podría ser útil en Phase 6)

Nota: `bugfix`, `feature`, `refactor`, `documentation`, `multiple-files`,
`task-completion`, `commit-message-main` son templates de commit — sí están
referenciados en `references/commit-helper.md`.

**Impacto:**
Cuando alguien busca "qué template usar para X", encuentra templates huérfanos
que no tienen instrucciones de uso. Aumenta la fricción y la incertidumbre.

**Resolución:**
Para cada template huérfano, decidir uno de:
1. Mapear a una fase en SKILL.md (si tiene uso legítimo)
2. Mover a `assets/legacy/` con un README explicando que están deprecados
3. Eliminar si no tienen valor (ADR-008: Git as persistence, el historial preserva)

Candidato a mapear: `ad-hoc-tasks.md.template` → Phase 6 para tareas fuera del
task-plan. Candidato a eliminar: `analysis-phase.md.template` (duplica introduction),
`categorization-plan.md.template`, `document.md.template`.

**Criterio de cierre:**
Cero templates en `assets/` sin referencia en SKILL.md o en un reference activo.
Cada template tiene una fase asignada o está en `assets/legacy/`.

---

## TD-002: Phase 3 (PLAN) no produce artefacto en el WP

```
Severidad: alta
Origen: Revisión 2026-04-03
Fase afectada: Phase 3 (PLAN)
Estado: [ ] Pendiente
```

**Problema:**
Phase 3 solo actualiza [ROADMAP](ROADMAP.md) (archivo global) pero no crea ningún artefacto
dentro del WP. Esto rompe la trazabilidad: al revisar el WP en el futuro no hay
registro de qué scope fue decidido en Phase 3, qué quedó dentro, qué quedó fuera,
ni por qué.

Ejemplo concreto: el WP `voltfactory-adaptation` tiene `analysis/`, `risk-register.md`
y `solution-strategy.md`, pero no hay ningún documento que capture el scope
aprobado en Phase 3.

**Impacto:**
- Un PM que revisa el WP meses después no puede reconstruir qué scope fue aprobado
- No hay forma de detectar scope creep durante Phase 4-6 (no hay baseline documentado)
- El ROADMAP.md agrega items pero no explica el razonamiento detrás de qué quedó fuera

**Resolución:**
1. Crear template `assets/plan.md.template` con:
   - Scope statement (qué problema, quiénes son usuarios, qué es éxito)
   - In-scope: lista de features/componentes aprobados
   - Out-of-scope: lista explícita de lo que NO se hace y por qué
   - Criterios de éxito medibles
   - Link a ROADMAP.md para tracking
2. Actualizar SKILL.md Phase 3: agregar paso para crear `{nombre-wp}-plan.md`
3. Actualizar tabla de artefactos en SKILL.md: agregar Phase 3 → `{nombre-wp}-plan.md`
4. Actualizar estructura de WP en SKILL.md: agregar `{nombre}-plan.md`
5. Crear artefacto retroactivo en WP `voltfactory-adaptation`

**Criterio de cierre:**
SKILL.md Phase 3 produce `{nombre-wp}-plan.md`. Template existe. WP activo tiene el
artefacto. validate-phase-readiness.sh Phase 3 verifica que el archivo existe.

---

## TD-004: SKILL.md supera el límite de tamaño efectivo (~700 líneas)

```
Severidad: alta
Origen: Observación 2026-04-08 (async-gates WP)
Fase afectada: Todas (SKILL.md es el motor de la metodología)
Estado: [ ] Pendiente
```

**Problema:**
SKILL.md crece con cada FASE. El límite efectivo para que un SKILL se ejecute de
forma confiable es ~700 líneas. Por encima de ese umbral:
- El contexto compacta el SKILL antes de que Claude lo aplique completo
- Las instrucciones al final del archivo (Phase 6, 7) se ignoran con mayor frecuencia
- Gates y convenciones añadidos en FASEs recientes son los más vulnerables

**Impacto:**
El framework crece en instrucciones pero su confiabilidad de ejecución cae.

**Resolución candidata:**
SKILL.md = instrucciones ejecutables mínimas por fase (~1 pantalla por fase).
Detalle extenso → `references/` consultable bajo demanda.
Evaluar si SKILL.md debe invocar references específicos por fase en lugar de
contener todo el texto inline.

**Criterio de cierre:**
SKILL.md ≤ 700 líneas. Instrucciones críticas (gates, pre-flight, task-notification)
verificadas como aplicadas en sesiones reales.

---

## TD-005: Arquitectura monolítica — evaluar evolución a orquestador + agentes por fase

```
Severidad: media
Origen: Observación estratégica 2026-04-08 (async-gates WP)
Fase afectada: Arquitectura general de pm-thyrox
Estado: [ ] Pendiente — requiere WP propio
```

**Problema:**
Diseño actual: "un SKILL que hace todo" (monolítico). A medida que el framework
crece (7 fases, paralelo, gates, agentes especializados), la brecha entre lo que
SKILL.md instruye y lo que los agentes hacen crece también.

Anti-patrones activos:
- **Monolithic SKILL**: crece sin control, no escala a 10+ agentes en paralelo
- **Lógica de coordinación inline**: SKILL contiene lógica que debería estar en agentes especializados
- **Paralelismo sin coordinación formal**: N agentes sin state compartido explícito

**Alternativas a evaluar en WP propio:**
```
A) Todo en 1 SKILL (actual)                → no escala
B) SKILL = orquestador + agentes por fase  → separación de concerns
C) SKILL = solo entrada + agentes todo     → máximo desacoplamiento
D) Hybrid: Agent & Repository + CSP        → decisiones dinámicas con backtracking
E) Event-Driven                            → descartado (no disponible en Claude Code)
```

**Agentes especializados candidatos (si se elige B o D):**
- `Agent-Phase1` — ANALYZE + Stopping Point Manifest
- `Agent-Phase2-3` — SOLUTION_STRATEGY + PLAN
- `Agent-Phase4-5` — STRUCTURE + DECOMPOSE
- `Agent-Phase6` — EXECUTE + manejo de gates async
- `Agent-Phase7` — TRACK + actualización de context files

**Constraint clave:** Solo Claude Code. Coordinación vía `context/now.md` + git.

**Criterio de cierre:**
WP propio analiza 5 alternativas, decide arquitectura, produce ADR permanente.
No implementar sin análisis — este ítem registra la deuda, no la resuelve.

---

## TD-006: pm-thyrox debe ser thin orchestrator — mover lógica de fases a workflow_* commands

```
Severidad: media
Origen: Análisis SKILL vs AGENTE 2026-04-08 (context-hygiene WP)
Fase afectada: Arquitectura del SKILL principal
Estado: [ ] Pendiente — trigger: pm-thyrox llega a ~600 líneas
```

**Problema:**
pm-thyrox SKILL viola la definición de SKILL (unidad atómica, una responsabilidad) porque
contiene la lógica completa de las 7 fases. Un SKILL debería ser un thin orchestrator;
la lógica de cada fase debería vivir en su propio command atómico.

**Hallazgo:** Los commands `/workflow_analyze`, `/workflow_plan`, `/workflow_execute`, etc.
ya existen en `.claude/commands/` — la arquitectura correcta está 70% implementada.
Falta: hacer pm-thyrox delgado y sincronizar workflow_* commands con la lógica actual de SKILL.md.

**Cambio concreto:**
- pm-thyrox SKILL: ~50 líneas (descripción, principios core, tabla escalabilidad, refs a workflow_*)
- workflow_analyze.md: contiene lógica completa de Phase 1 (actualmente en pm-thyrox)
- workflow_plan.md: contiene lógica completa de Phase 3 (actualmente en pm-thyrox)
- ... etc. (un command por fase)

**Trigger correcto:** pm-thyrox llega a ~600 líneas O agregar instrucción de fase causa conflicto de contexto.
No antes — workflow_* commands están desactualizados (no tienen gates, Stopping Point Manifest, etc.)
y sincronizarlos requiere un WP formal.

**Criterio de cierre:**
pm-thyrox SKILL ≤ 80 líneas. Cada workflow_* command contiene la lógica de su fase.
workflow_* están sincronizados con todas las instrucciones actuales (gates, manifest, calibración).

### Corrección 2026-04-08 (FASE 21 — skill-architecture-review)

El análisis original (context-hygiene WP, FASE 20) tenía 3 errores de framing:

1. **"SKILL única opción viable"** → Falso. CLAUDE.md es una alternativa más confiable (siempre cargada, sin triggering probabilístico). Ignorar CLAUDE.md fue un error de framing del análisis original.
2. **"Limitación arquitectónica"** → Falso. Es un tradeoff de producto (Anthropic eligió no incluir PTC en Claude Code). La arquitectura de 5 capas es viable y robusta — el límite es de producto, no de diseño.
3. **"Trigger por tamaño (~600 líneas)"** → Incorrecto. El trigger real es confiabilidad: reducir pm-thyrox SKILL a catálogo SIN haber sincronizado los /workflow_* commands produce un sistema peor (Ruta 1 sin lógica + Ruta 2 outdated). El trigger correcto es: **TD-008 completado**.

**Trigger actualizado:** cuando TD-008 esté completo (sync /workflow_* commands), no antes.
**ADR de referencia:** [adr-015.md](decisions/adr-015.md) — documentación completa de la decisión.

---

## TD-007: Phase 1 carece de Step 0 — END USER CONTEXT antes del análisis técnico

```
Severidad: media
Origen: Análisis de cadena de requisitos 2026-04-08 (context-hygiene WP)
Fase afectada: Phase 1 ANALYZE (y por cascada, todas las demás)
Estado: [ ] Pendiente — requiere WP propio
```

**Problema:**
Phase 1 (ANALYZE) incluye "Stakeholders" como el segundo ítem de una lista de 8.
No establece explícitamente quién es el END USER real ni mapea la cadena de traducción
de requisitos entre niveles (END USER → App Programmer → Framework Dev → Platform → Hardware).
Resultado: análisis técnicamente correcto pero desconectado del beneficiario real.

**Las restricciones de bajo nivel afectan al END USER pero no se mapean:**
- "Sin memoria nativa en Claude" → "Phase 7 DEBE actualizar archivos de estado" →
  "El desarrollador puede continuar sin reconstruir contexto"
- Sin el mapa, TD-004/TD-005 fueron identificados como "deuda técnica técnica" en lugar
  de "restricción de plataforma que afecta directamente la experiencia del END USER"

**Solución candidata (Opción B):**
Añadir Step 0 dentro de Phase 1, escalado según tamaño del WP:
- Micro: identificar END USER en una línea
- Pequeño: END USER + restricción principal que sube
- Mediano: cadena completa de traducción + restricciones que suben
- Grande: cadena completa + artefacto separado `*-context.md`

**Criterio de cierre:**
SKILL.md Phase 1 tiene Step 0 explícito. Para WPs Mediano/Grande existe template
`*-context.md` con: END USER, cadena de traducción por niveles, mapa de restricciones,
promesas que podemos y no podemos hacer al END USER.

---

## TD-011: Task-plan sin granularidad atómica — las tareas no son independientemente verificables

```
Severidad: alta
Origen: FASE 21 — error detectado en Phase 5 DECOMPOSE (task-plan de 8 tareas → corregido a 16)
Fase afectada: Phase 5 DECOMPOSE (al crear task-plans)
Estado: [ ] Pendiente — requiere instrucción explícita en SKILL.md Phase 5
Prioridad: alta (se repite en cada WP)
```

**Problema:**
Una tarea del task-plan debe poder commitearse y verificarse de forma **independiente**.
Si una tarea contiene N operaciones distintas en el mismo archivo o N archivos distintos,
una falla parcial no puede marcarse `[x]` — el commit es ambiguo y la trazabilidad se rompe.

**Síntoma concreto detectado en FASE 21:**
- T-004 original: "Actualizar technical-debt.md" → contenía 4 operaciones (TD-006 + TD-008 + TD-009 + TD-010)
- T-007 original: "Actualizar skill-vs-agent.md" → contenía 4 secciones distintas
- T-001 original: "Crear ADR con todo el contenido" → contenía 3 bloques independientes

**Regla faltante en SKILL.md Phase 5:**
> Una tarea atómica = 1 operación en 1 ubicación. Si la descripción dice "actualizar X con [A, B, C]",
> dividir en 3 tareas: una por cada operación. Si dice "crear Y con secciones [1, 2, 3]", dividir en 3.

**Criterio de atomicidad:**
Una tarea es atómica si: (a) puede fallar sin afectar otras tareas, (b) su commit describe
exactamente un cambio, (c) puede marcarse `[x]` con certeza cuando esa única operación completa.

**Solución:**
Añadir en SKILL.md Phase 5 DECOMPOSE: checklist de atomicidad antes de presentar el task-plan al usuario:
- [ ] Cada tarea toca exactamente 1 ubicación (1 archivo O 1 sección de 1 archivo)
- [ ] Ninguna descripción de tarea contiene "y" conectando dos operaciones distintas
- [ ] Cada tarea puede fallar de forma independiente sin bloquear otras

**Criterio de cierre:**
SKILL.md Phase 5 incluye el checklist de atomicidad. El siguiente WP tiene tareas atómicas desde el inicio.

---

## TD-008: /workflow_* commands desactualizados — sync con lógica actual de SKILL.md

```
Severidad: alta
Origen: FASE 21 — skill-architecture-review (ADR-015)
Fase afectada: Capa 3 — /workflow_* commands (todas las fases)
Estado: [ ] Pendiente — prerequisito bloqueante para TD-006 (reducir pm-thyrox SKILL)
Prioridad: alta
```

**Problema:**
Los 7 commands `/workflow_analyze`, `/workflow_strategy`, `/workflow_plan`, `/workflow_structure`,
`/workflow_decompose`, `/workflow_execute`, `/workflow_track` existen en `.claude/commands/` pero
están desactualizados: no contienen gates async, Stopping Point Manifest, calibración por tamaño,
state-management con `now.md`, ni instrucciones de granularidad atómica añadidas desde su creación.

**Impacto:**
- Ruta B (determinística) del hook está marcada `[outdated]` — no se puede recomendar
- ADR-015 establece que /workflow_* son la "única fuente de verdad de lógica de fase" (D-03) — hoy eso es falso
- Sin TD-008 completado, no se puede reducir pm-thyrox SKILL a catálogo (D-02)

**Trabajo requerido:**
Sincronizar cada command con la lógica actual de SKILL.md:
- Gates async y Stopping Point Manifest (de Phase 1, Phase 6)
- Calibración por tamaño WP (micro/pequeño/mediano/grande)
- State-management: actualizar `now.md` al inicio/fin de cada phase
- Granularidad atómica de tasks (TD-011)
- Añadir `updated_at` en frontmatter de cada command

**Trigger para ejecutar:**
Abrir WP formal dedicado a sync de /workflow_* commands.
Flag `COMMANDS_SYNCED=false` en `session-start.sh` → cambiar a `true` cuando esté completo.

**Criterio de cierre:**
Los 7 /workflow_* commands tienen la lógica completa y actualizada de su fase.
`COMMANDS_SYNCED=true` en `session-start.sh`. pm-thyrox SKILL reducido a catálogo (≤80 líneas).

---

## TD-010: Benchmark empírico — SKILL vs CLAUDE.md vs baseline sin framework

```
Severidad: baja
Origen: FASE 21 — skill-architecture-review (ADR-015 H1/H2/H3)
Fase afectada: Metodología general (decisión de arquitectura)
Estado: [ ] Pendiente — trigger: caso de uso real que justifique el tiempo
```

**Problema:**
ADR-015 documenta hallazgos de terceros sobre SKILL vs CLAUDE.md (H1: triggering probabilístico,
H2: prompt injection, H3: CLAUDE.md alternativa más confiable). Sin embargo, no existe evidencia
empírica propia del proyecto THYROX que compare las tres opciones en condiciones equivalentes.

Las decisiones actuales se basan en evidencia externa (artículo Mar 2026: 40/47 skills empeoran
output, 0/20 disparos en prueba controlada). Un benchmark propio validaría o refutaría esos datos
en el contexto específico de pm-thyrox y el stack de THYROX.

**Benchmark propuesto:**
- 3 tareas equivalentes de gestión PM (analyze, plan, execute)
- 3 condiciones: (A) pm-thyrox SKILL activo, (B) solo CLAUDE.md, (C) sin framework
- Métricas: calidad de output (rubrica 1-5), tasa de activación, líneas de instrucción seguidas

**Trigger para ejecutar:**
Cuando haya caso de uso real que justifique el tiempo (≥1 semana de trabajo).
No ejecutar como ejercicio académico — solo si hay decisión arquitectónica pendiente
que requiera datos propios.

**Criterio de cierre:**
Benchmark ejecutado con ≥3 tareas reales. Resultados en `references/benchmark-skill-vs-claude.md`.
ADR-015 actualizado si los datos contradicen los hallazgos externos.

---

## TD-009: Patrón now-{agent-name}.md no implementado en definiciones de agentes nativos

```
Severidad: media
Origen: FASE 21 — skill-architecture-review (ADR-015 D-08)
Fase afectada: Capa 4 — Agentes nativos (.claude/agents/)
Estado: [ ] Pendiente — trigger: al abrir WP de agentes
```

**Problema:**
ADR-015 D-08 define la convención de naming para state files en ejecución multi-agent:
- `now-{agent-name}.md` para agentes nativos en ejecución (e.g. `now-task-executor.md`)
- `now-{skill-name}-{wp-id}.md` para skills especializados

Sin embargo, ninguna de las 9 definiciones en `.claude/agents/` ni `agent-spec.md` documenta
esta convención ni instruye a los agentes a crear/actualizar su `now-{agent-name}.md`.
Resultado: en ejecución paralela, no hay forma de saber qué agente está activo ni en qué estado.

**Trabajo requerido:**
1. Actualizar `references/agent-spec.md` — añadir campo `state_file` en la spec formal
2. Actualizar las definiciones de agentes que hacen trabajo de ejecución larga:
   - `task-executor.md` — crear `now-task-executor.md` al inicio, actualizar por tarea
   - `task-planner.md` — crear `now-task-planner.md` al inicio
3. Documentar la convención en `references/conventions.md` (TD relacionado: T-011 de FASE 21)

**Trigger para ejecutar:**
Al abrir WP formal de agentes (agent-format-spec o similar).

**Criterio de cierre:**
`agent-spec.md` incluye `state_file` como campo. Los agentes de ejecución larga crean y
actualizan su `now-{agent-name}.md`. La convención está documentada en `conventions.md`.

---

## TD-016: Phase 3 PLAN no verifica existencia de archivos antes de planificar cambios

```
Severidad: alta
Origen: FASE 22 — framework-evolution (Phase 4 STRUCTURE detectó stop-hook-git-check.sh inexistente)
Fase afectada: Phase 3 PLAN (al listar tareas de modificación/eliminación)
Estado: [ ] Pendiente — requiere instrucción en SKILL.md Phase 3
```

**Problema:**
Durante Phase 3 PLAN (y Phase 4 STRUCTURE), se asumió que `stop-hook-git-check.sh` existía
y requería modificación. En Phase 4 se descubrió que el archivo no existe — la tarea correcta
es "crear", no "modificar". Esta contradicción, si no se detecta, puede generar tareas imposibles
en el task-plan de Phase 5 (e.g. T-001: "editar archivo que no existe").

**Síntoma concreto:**
- FASE 22 Phase 3 PLAN: `TD-013: Añadir verificación stop_hook_active en stop-hook-git-check.sh`
  → implica que el archivo existe
- FASE 22 Phase 4 STRUCTURE: verificación revela que `.claude/skills/pm-thyrox/scripts/stop-hook-git-check.sh`
  **no existe** → la tarea correcta es "crear el archivo con la verificación", no "añadir a un existente"

**Regla faltante en SKILL.md Phase 3:**
> Al listar tareas de "modificar" o "eliminar" archivos, verificar que existen antes de incluirlos
> en el In-Scope. Si no existen, cambiar a "crear". Comando de validación:
> `[ -f "path/archivo" ] && echo "existe" || echo "CREAR"`

**Impacto:**
- Contradicciones entre plan y ejecución
- Tareas de ejecución que fallan con "file not found"
- Trazabilidad rota (task-plan describe una operación diferente a la real)

**Solución:**
Añadir en SKILL.md Phase 3 PLAN, antes de cerrar el In-Scope:

> **Validación de existencia de archivos (obligatoria):**
> Para cada archivo listado como "modificar" o "eliminar":
> - Verificar que existe con `ls path/archivo`
> - Si no existe: cambiar la descripción de la tarea a "crear"
> - Si existe: confirmar que la modificación descrita es coherente con su contenido actual

**Trigger para ejecutar:**
WP de correcciones a SKILL.md (puede añadirse al WP de TD-007 o como FASE 23).

**Criterio de cierre:**
SKILL.md Phase 3 incluye el paso de validación de existencia. El siguiente WP que use Phase 3
no presenta contradicciones entre In-Scope y el estado real del sistema.

---

## TD-017: Criterios de cambio de FASE no están documentados en CLAUDE.md ni SKILL.md

```
Severidad: media
Origen: FASE 22 — pregunta explícita del usuario durante Phase 4 STRUCTURE
Fase afectada: Phase 7 TRACK (cierre de FASE) y Phase 1 ANALYZE (apertura de nueva FASE)
Estado: [ ] Pendiente — requiere clarificación en CLAUDE.md y/o SKILL.md
```

**Problema:**
CLAUDE.md y SKILL.md definen el glosario FASE vs Phase, pero no documentan:
1. **Cuándo se cierra una FASE**: ¿cuando Phase 7 TRACK completa?, ¿cuando el usuario aprueba?, ¿automáticamente?
2. **Cuándo empieza una nueva FASE**: ¿cuando hay una nueva solicitud del usuario?, ¿cuando se abre un nuevo WP?
3. **Qué determina el número de FASE**: ¿secuencial global?, ¿quién asigna el número?
4. **FASE 22 específicamente**: ¿en qué condición se cierra y se pasa a FASE 23?

**Estado actual de FASE 22:**
FASE 22 está en Phase 4 STRUCTURE (aprobación pendiente). Para cerrar FASE 22 se necesita:
- Completar Phase 5 DECOMPOSE → Phase 6 EXECUTE → Phase 7 TRACK
- Phase 7 TRACK produce: lecciones aprendidas, CHANGELOG entry, ROADMAP actualizado, now.md → null

**Regla faltante:**
> Una FASE cambia cuando:
> 1. Phase 7 TRACK completa para el WP activo (lecciones + changelog + ROADMAP)
> 2. El WP activo se marca como `status: complete` en su plan
> 3. `now.md` se actualiza a `phase: complete` y `current_work: null`
> Una nueva FASE empieza cuando se crea un nuevo WP (nuevo directorio en `context/work/`)

**Solución:**
Añadir en CLAUDE.md (sección Glosario) una nota sobre el ciclo de vida de FASE:
> Una FASE = un WP. Se cierra al completar Phase 7 TRACK del WP. La siguiente solicitud
> de trabajo abre una nueva FASE (nuevo WP con timestamp).

Y en SKILL.md Phase 7 TRACK: añadir instrucción explícita de "marcar FASE como cerrada".

**Trigger para ejecutar:**
WP de correcciones a CLAUDE.md/SKILL.md (puede combinarse con TD-016 o TD-007).

**Criterio de cierre:**
CLAUDE.md Glosario incluye nota sobre ciclo de vida. SKILL.md Phase 7 incluye
instrucción de cierre de FASE. El usuario puede determinar en qué FASE está
y cuándo cambia sin necesidad de preguntar.

---

## TD-018: execution-log no respeta formato de timestamp completo

```
Severidad: baja
Origen: Revisión FASE 22 — Phase 6 EXECUTE (2026-04-08)
Fase afectada: Phase 6 EXECUTE (al crear execution-log)
Estado: [ ] Pendiente
```

**Problema:**

Al crear `framework-evolution-execution-log.md` en T-011 se usaron dos formatos incorrectos:

1. **Frontmatter `created_at`:** se usó `2026-04-08` (solo fecha) en lugar del timestamp completo `YYYY-MM-DD HH:MM:SS` que establece la convención del proyecto (TD-001).

2. **Headers de sesión:** se usó `## Sesión N — Bloque X (YYYY-MM-DD)` (solo fecha) en lugar de `## Sesión N — Bloque X (YYYY-MM-DD HH:MM:SS)` con timestamp completo.

**Impacto:**

Inconsistencia con el resto de artefactos del proyecto que usan `created_at: YYYY-MM-DD HH:MM:SS`. Dificulta ordenamiento y correlación temporal de sesiones cuando más de una ocurre en el mismo día.

**Solución:**

1. Al crear un `*-execution-log.md`, el frontmatter debe tener `created_at: YYYY-MM-DD HH:MM:SS` (con hora).
2. Los headers de sesión deben incluir timestamp completo: `## Sesión N — Bloque X (YYYY-MM-DD HH:MM:SS)`.
3. Si no se conoce la hora exacta de inicio de la sesión, usar `$(date '+%Y-%m-%d %H:%M:%S')` al crear el archivo.

**Trigger para ejecutar:**

Corrección al crear el próximo execution-log, o como parte de un WP de limpieza de convenciones.

**Criterio de cierre:**

Todos los execution-log nuevos usan timestamp completo en frontmatter y en headers de sesión. El execution-log de FASE 22 puede corregirse retroactivamente como parte del cierre de FASE.

---

## TD-019: Nomenclatura de workflow_*.md — ¿flat file o subdirectorio?

```
Severidad: alta
Origen: Revisión FASE 22 — Sesión 6 (2026-04-08)
Fase afectada: SKILL design (pre-TD-027)
Estado: [-] En progreso — resuelto en FASE 23 (workflow-restructure)
```

**Problema:**

Los 7 skills migrados en T-012..T-018 son archivos planos:
```
.claude/skills/workflow_analyze.md
.claude/skills/workflow_strategy.md
...
```

La anatomía oficial del framework (CLAUDE.md Locked Decision #2) define:
```
skills/{nombre}/SKILL.md   ← subdirectorio + SKILL.md
```

pm-thyrox sigue esta convención. Los workflow_* no. Esto tiene dos implicaciones:

1. **Conflicto con Locked Decision #5** — "Un pm-thyrox con references, no 15 skills separados". Los 7 workflow_*.md crean efectivamente 7 skills adicionales. ¿Violan esta decisión o son un tipo diferente de mecanismo (commands en Capa 3, no skills en Capa 2)?

2. **References y assets no tienen hogar** — Si los workflow_* tuvieran estructura de subdirectorio, cada uno podría tener `references/` y `assets/` propios. Con flat files, no pueden.

**Pregunta a resolver:**
¿Son los workflow_*.md "skills" (Capa 2) o "commands con frontmatter" (Capa 3 en nueva forma)? La respuesta determina si necesitan subdirectorios o si flat file es correcto.

**Opciones:**
- A) Mantener flat files — son Capa 3 (commands modernizados), no skills. Locked Decision #5 no aplica.
- B) Convertir a subdirectorios — son skills reales. Requiere mover a `workflow-analyze/SKILL.md` etc. ← **Opción B elegida en FASE 23**

**Trigger para ejecutar:**
Antes de TD-027 (reducción SKILL.md). Resolverlo desbloquea TD-020, TD-022, TD-023.

**Criterio de cierre:**
Decisión documentada en ADR (¿flat file Capa 3 o subdirectorio Capa 2?). Estructura aplicada consistentemente a los 7 archivos.

---

## TD-020: Escalabilidad (micro/pequeño/mediano/grande) no distribuida en workflow_* skills

```
Severidad: media
Origen: Revisión FASE 22 — Sesión 6 (2026-04-08)
Fase afectada: Todos los workflow-* (especialmente workflow-analyze)
Estado: [-] En progreso — resuelto en FASE 23 (T-013: tabla añadida a workflow-analyze/SKILL.md)
```

**Problema:**

La tabla de escalabilidad de pm-thyrox SKILL.md (qué fases activar según tamaño del WP) solo vive en pm-thyrox. Cuando el usuario invoca `/workflow_analyze` sin pasar por pm-thyrox primero, no tiene visibilidad de qué fases son opcionales para un WP micro o pequeño.

**Solución:**

Incluir en `workflow-analyze/SKILL.md` (o en todos los workflow-*) una referencia a la tabla de escalabilidad o una versión condensada: si el WP es micro, proponer saltar a `/workflow-execute` directamente.

**Trigger para ejecutar:**
Después de TD-019 (resolución de estructura). Aplicar al skill que corresponda según la arquitectura.

**Criterio de cierre:**
Cualquier usuario que invoque `/workflow-analyze` recibe orientación sobre qué fases son opcionales según el tamaño del WP.

---

## TD-021: Terminología Phase N debe mapear explícitamente a /workflow_* en pm-thyrox

```
Severidad: media
Origen: Revisión FASE 22 — Sesión 6 (2026-04-08)
Fase afectada: pm-thyrox SKILL.md (catálogo post-TD-027)
Estado: [ ] Pendiente — bloqueado por TD-019 y TD-027
```

**Problema:**

Hay 3 conceptos que ahora coexisten sin distinción clara:

| Concepto | Nivel | Ejemplo |
|----------|-------|---------|
| FASE N | Proyecto global (WP#) | FASE 22: framework-evolution |
| Phase N | Etapa SDLC dentro de un WP | Phase 6: EXECUTE |
| /workflow_* | Skill de ejecución que implementa una Phase | /workflow_execute |

Actualmente pm-thyrox usa "Phase 1: ANALYZE", "Phase 6: EXECUTE" etc. sin referenciar `/workflow_*`. Después de TD-008, el usuario que lee pm-thyrox debe saber:
- Concepto: "Phase 1" = qué es
- Ejecución: "/workflow_analyze" = cómo ejecutarlo

**Solución:**

Actualizar pm-thyrox catálogo (post-TD-027) para mapear explícitamente:
```
| Phase | Concepto | Ejecutar con |
|-------|---------|-------------|
| Phase 1 | ANALYZE | /workflow-analyze |
| Phase 2 | SOLUTION_STRATEGY | /workflow-strategy |
...
```

Y actualizar el glosario de CLAUDE.md para incluir la tercera categoría: `/workflow-*`.

**Trigger para ejecutar:**
Después de TD-019 y TD-027 (reducción SKILL.md).

---

## TD-022: Limitaciones conocidas (triggering probabilístico) no integradas en workflow_* skills

```
Severidad: baja
Origen: Revisión FASE 22 — Sesión 6 (2026-04-08)
Fase afectada: workflow-* skills (todos)
Estado: [ ] Pendiente — la sección "Limitaciones conocidas" fue eliminada de pm-thyrox/SKILL.md en FASE 23 (D-04). Revisar si es necesario integrar en workflow-* skills.
```

**Problema:**

La sección "Limitaciones conocidas y arquitectura objetivo" de pm-thyrox SKILL.md documenta que el triggering de skills es probabilístico (H1/H3). Esta información debe estar en cada workflow_* para que el usuario que llegue directamente a `/workflow_analyze` comprenda el contexto arquitectónico.

La sección también menciona "Arquitectura objetivo (post-TD-008)" que ya fue completado — este texto debe actualizarse.

**Solución:**
1. Integrar en cada workflow_* una nota breve sobre la arquitectura de capas (opcional) y referencia a ADR-015.
2. Actualizar la sección en pm-thyrox para reflejar que TD-008 está completo.

**Trigger para ejecutar:**
Después de TD-019 (estructura definida).

---

## TD-023: References de pm-thyrox sin asignación de propietario — bloqueado por TD-019

```
Severidad: media
Origen: Revisión FASE 22 — Sesión 6 (2026-04-08)
Fase afectada: .claude/skills/pm-thyrox/references/
Estado: [-] En progreso — resuelto en FASE 23 (T-014: owner añadido a 24 archivos de references/)
```

**Problema:**

La carpeta `.claude/skills/pm-thyrox/references/` contiene archivos que son utilizados por fases específicas:

| Referencia | Fase que la usa |
|-----------|----------------|
| solution-strategy.md | Phase 2 → /workflow-strategy |
| spec-driven-development.md | Phase 4 → /workflow-structure |
| conventions.md | Phase 5-6 → /workflow-decompose, /workflow-execute |
| state-management.md | Phase 6-7 → /workflow-execute, /workflow-track |
| scalability.md | Phase 1 → /workflow-analyze |

Los workflow-* son subdirectorios (Opción B de TD-019, resuelta en FASE 23). Las referencias permanecen en pm-thyrox/references/ con campo `owner:` en frontmatter indicando el skill propietario.

**La tabla "Dónde viven los artefactos"** de SKILL.md tiene el mismo problema — referencia paths de assets y templates que actualmente están solo en pm-thyrox.

**Trigger para ejecutar:**
Después de TD-019 (arquitectura decidida).

**Criterio de cierre:**
Cada referencia tiene un propietario claro. Las rutas en los workflow-* apuntan correctamente a donde vive cada referencia.

---

## TD-024: agent-spec.md desactualizado — conflictos con docs oficiales Claude Code

```
Severidad: media
Origen: Revisión FASE 23 — análisis docs oficiales (2026-04-09)
Fase afectada: .claude/skills/pm-thyrox/references/agent-spec.md
Estado: [-] En progreso — resuelto en FASE 23 (T-015: model Opcional, tools Opcional, nota corrección)
```

**Problema:**

`agent-spec.md` (creado 2026-04-07) tiene reglas que contradicen la documentación oficial de Claude Code:

| Campo | agent-spec.md dice | Docs oficiales dicen |
|-------|-------------------|---------------------|
| `model` | PROHIBIDO | Válido — `sonnet\|opus\|haiku\|inherit` (default: inherit) |
| `tools` | REQUERIDO | Opcional — hereda todos si omitido |

Las reglas de `agent-spec.md` eran basadas en inferencia del comportamiento observado, no en documentación oficial. Con los docs oficiales disponibles, las reglas incorrectas deben corregirse.

**Impacto:**

Los agentes creados siguiendo `agent-spec.md` podrían no usar `model` (beneficioso para cost/speed optimization), y podrían incluir `tools` innecesariamente cuando heredar todo es lo correcto.

**Criterio de cierre:**

`agent-spec.md` actualizado para reflejar docs oficiales: `model` es válido y opcional, `tools` es opcional (con nota sobre cuándo usarlo).

---

## TD-025: skill-authoring.md desactualizado — pre-docs oficiales Claude Code

```
Severidad: baja
Origen: Revisión FASE 23 — análisis docs oficiales (2026-04-09)
Fase afectada: .claude/skills/pm-thyrox/references/skill-authoring.md
Estado: [ ] Pendiente
```

**Problema:**

`skill-authoring.md` es de 2026-03-25, antes de la documentación oficial de Claude Code. Puede contener convenciones desactualizadas o incompletas respecto a:
- Campo `name` (hyphens only — no underscores)
- `disable-model-invocation: true` como optimización de context budget (no solo invocación)
- `user-invocable: false` como opción disponible
- Substituciones: `$ARGUMENTS[N]`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_SESSION_ID}`
- `context: fork` + `agent:` field

**Referencia:** `references/claude-code-components.md` (creado FASE 23) contiene la información correcta y actualizada.

**Criterio de cierre:**

`skill-authoring.md` actualizado o deprecado con referencia a `claude-code-components.md`.

---

## TD-026: ROADMAP.md supera el límite del Read tool (10000 tokens)

```
Severidad: media
Origen: FASE 25 Phase 7 — error al leer ROADMAP.md completo (2026-04-09)
Fase afectada: Phase 3 PLAN y Phase 7 TRACK (requieren leer/actualizar ROADMAP.md)
Estado: [ ] Pendiente
```

**Problema:**

ROADMAP.md supera los 10000 tokens que el Read tool puede leer en una sola llamada. El error obliga a usar `offset` + `limit` para navegar el archivo por partes, lo que fragmenta el contexto y aumenta el riesgo de omitir secciones relevantes.

Error observado:
```
File content (15204 tokens) exceeds maximum allowed tokens (10000).
Use offset and limit parameters to read specific portions of the file.
```

**Causa raíz:**

ROADMAP.md acumula todo el historial de FASEs en un único archivo flat. Con 25+ FASEs el archivo seguirá creciendo indefinidamente.

**Opciones de resolución (a evaluar en Phase 1 del WP correspondiente):**

1. **Archivo de resumen + archivo de historial**: `ROADMAP.md` contiene solo FASEs activas/pendientes + próximos pasos. `ROADMAP-history.md` (o `context/roadmap-history.md`) acumula FASEs completadas. Read tool puede leer cada parte independientemente.
2. **Secciones por era**: `ROADMAP-v1.md` (FASEs 1-15), `ROADMAP-v2.md` (FASEs 16-30), etc. Rotación cada ~15 FASEs.
3. **ROADMAP.md como índice + archivos por FASE**: Cada WP tiene su sección en `context/work/TIMESTAMP-nombre/FASE-roadmap-entry.md`. ROADMAP.md apunta a ellos. Más fragmentado pero elimina el problema de raíz.

**Criterio de cierre:**

ROADMAP.md (o su reemplazo) puede leerse en una sola llamada sin `offset`/`limit`. El flujo Phase 7 TRACK actualiza el archivo sin errores de token.

---

## TD-027: Criterio de auto-write vs validación humana no implementado en pm-thyrox

```
Severidad: alta
Origen: FASE 25 — comportamiento inconsistente en gates de escritura (2026-04-09)
Fase afectada: Todas — especialmente Phase 3 PLAN, Phase 5 DECOMPOSE, Phase 7 TRACK
Estado: [ ] Pendiente
```

**Problema:**

El skill pm-thyrox no tiene un criterio explícito y aplicado consistentemente para decidir cuándo Claude puede crear/modificar un archivo de forma autónoma vs cuándo debe esperar confirmación humana. En la práctica:

- Archivos de estado operacional (`now.md`, `focus.md`) se actualizan sin gate — correcto.
- Artefactos del WP (análisis, plan, task-plan) se crean sin gate — correcto en fases de exploración.
- Archivos de configuración del framework (`SKILL.md`, `CLAUDE.md`, `ADR-*.md`) se modifican sin confirmación explícita en algunos flujos — riesgo alto.
- El Stopping Point Manifest define SPs pero no los traduce en gates de escritura de archivo de forma sistemática.

**Dimensiones del criterio faltante:**

| Categoría de archivo | Auto-write | Gate humano |
|---------------------|------------|-------------|
| Artefactos WP (`context/work/`) | Siempre | Nunca |
| Estado sesión (`now.md`, `focus.md`) | Siempre | Nunca |
| Referencias (`references/*.md`) | Solo correcciones | Si cambia semántica |
| Configuración framework (`SKILL.md`, `CLAUDE.md`) | Nunca | Siempre |
| ADRs (`decisions/*.md`) | Draft | Aprobación explícita |
| Archivos del proyecto (`ROADMAP.md`, `CHANGELOG.md`) | Phase 7 post-validate | Gate SP-06 |
| Scripts operacionales (`.claude/scripts/*.sh`) | Nunca | Siempre |

**Causa raíz:**

El SKILL.md define Stopping Points (SP-NNN) para gates de fase, pero no los vincula a categorías específicas de archivos. La implementación depende del juicio del LLM en cada sesión, lo que genera inconsistencia.

**Resolución propuesta:**

1. Agregar sección `## Gates de escritura por tipo de archivo` en `pm-thyrox/SKILL.md` con la tabla anterior como regla explícita.
2. Vincular cada SP en el Stopping Point Manifest a la categoría de archivo que desbloquea.
3. Considerar un ADR si la decisión implica cambiar la arquitectura del Stopping Point Manifest.

**Criterio de cierre:**

`pm-thyrox/SKILL.md` tiene sección explícita de gates de escritura. En una sesión de prueba, Claude aplica los gates correctamente sin instrucción adicional del usuario.

