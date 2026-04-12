```yml
type: Registro de Deuda Técnica
created_at: 2026-04-03
updated_at: 2026-04-11 22:20:00
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

## TD-027: Criterio de auto-write vs validación humana no implementado en thyrox

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

---

## TD-028: Sin mecanismo para detectar reclasificacion de tamano de WP entre fases

```
Severidad: media
Origen: FASE 28 — WP reclasificado de pequeno a mediano en Phase 2 (2026-04-09)
Fase afectada: Phase 2 SOLUTION STRATEGY — transition 2→3
Estado: [ ] Pendiente
```

**Problema:**

La clasificacion de tamano del WP (micro / pequeno / mediano / grande) ocurre en Phase 1
ANALYZE y determina que fases son obligatorias. El framework no tiene mecanismo para
re-evaluar el tamano cuando el scope real se descubre en fases posteriores.

Ejemplo concreto en FASE 28:
- Phase 1 clasifico el WP como "pequeno" (3 archivos → fases 1, 2, 6, 7)
- Phase 2 (deep review) revelo que el scope real es 11 archivos → clasificacion "mediano"
- Claude propuso saltar a Phase 5 directamente, omitiendo Phase 3 y Phase 4
- El usuario tuvo que corregir manualmente

**Root cause:**

`workflow-strategy/SKILL.md` no tiene instruccion para re-evaluar el tamano del WP
al terminar la estrategia. La clasificacion de Phase 1 se trata como definitiva, pero
el scope real solo se conoce despues de disenar la solucion.

**Impacto:**

Cuando el scope se expande en Phase 2, Claude salta fases obligatorias para WPs medianos
(Plan, Structure, Decompose), produciendo ejecucion sin especificacion formal.

**Resolucion propuesta:**

Agregar al final de `workflow-strategy/SKILL.md` una seccion de re-evaluacion:

```
## Re-evaluacion de tamano post-estrategia

Antes de proponer la siguiente fase, comparar el scope de la estrategia con la
clasificacion inicial de Phase 1:

| Si el scope cambio a... | Siguiente fase | Fases a agregar |
|------------------------|----------------|-----------------|
| Sigue siendo micro     | Phase 6        | Ninguna |
| Sigue siendo pequeno   | Phase 6        | Ninguna |
| Paso a mediano/grande  | Phase 3 PLAN   | 3, 4, 5 |

Si el tamano subio, actualizar exit-conditions.md con las fases adicionales.
```

**Criterio de cierre:**

`workflow-strategy/SKILL.md` tiene seccion de re-evaluacion de tamano. En una sesion
de prueba donde el scope se expande, Claude detecta el cambio y propone Phase 3 en
lugar de saltar a Phase 5/6.

---

## TD-030: Impacto de renombrar "Phase N" a nomenclatura alineada con workflow-*

```
Severidad: baja
Origen: Sugerencia de usuario (2026-04-09)
Fase afectada: Cross-phase (nomenclatura global del framework)
Estado: [ ] Pendiente — requiere analisis de impacto antes de decidir
```

**Problema / Motivacion:**

La nomenclatura actual usa "Phase 1" ... "Phase 7" para las etapas internas del SDLC.
Las alternativas propuestas son:

| Opcion | Ejemplo | Alineacion con skills |
|--------|---------|----------------------|
| Actual | `Phase 1`, `Phase 2`, ..., `Phase 7` | No alineada (numerica) |
| A — kebab numerico | `phase-1`, `phase-2`, ..., `phase-7` | Parcial (kebab-case) |
| B — semantic | `workflow-analyze`, `workflow-strategy`, ..., `workflow-track` | Total (igual que skills) |

**Preguntas a responder en el analisis:**

1. **Frecuencia de uso**: En cuantos archivos aparece "Phase N" con numero?
   (SKILL.md x7, CLAUDE.md, now.md, exit-conditions, plan, task-plan, execution-log, etc.)
2. **Costo de migracion**: Cuantos archivos tendrian que actualizarse?
3. **Beneficio de Opcion B**: "workflow-analyze" es mas semantico que "Phase 1" — pero
   tambien es mas largo. Al escribir `now.md::phase: workflow-execute` vs `phase: Phase 6`,
   cual es mas legible?
4. **Consistencia con glosario**: El glosario en CLAUDE.md distingue FASE (numero global)
   de Phase (etapa interna). Cambiar Phase a workflow-* podria confundir los dos planos.
5. **Impacto en hooks**: Los UserPromptSubmit hooks en workflow-*/SKILL.md actualmente
   ejecutan `set-session-phase.sh "Phase N"`. Con Opcion B seria `set-session-phase.sh "workflow-execute"`.
   El campo `now.md::phase` contendria el nombre semantico — mas legible pero mas largo.
6. **Retrocompatibilidad**: ADRs existentes, artefactos WP y contexto de sesion usan
   "Phase N". Una migracion requeriria sed masivo o convivencia de dos nomenclaturas.

**Beneficio potencial:**

Opcion B elimina la necesidad de memorizar que Phase 6 = EXECUTE. El nombre del skill
invocado y el valor en now.md serian identicos. Reduce friccion cognitiva.

**Criterio de cierre:**

Analisis de impacto completado con:
- Conteo de archivos afectados por opcion
- Decision documentada en ADR (adoptar A, B, o mantener actual)
- Si se adopta cambio: plan de migracion con sed commands y criterio de validacion

**Addendum FASE 31:** La interfaz pública del usuario es ahora `/thyrox:*` — no `/workflow-*`. La opción B (renombrar `Phase N` a nombres semánticos `workflow-*`) pierde relevancia dado que el usuario final no ve `/workflow-*` en el menú. Análisis deferred: evaluar si este TD sigue siendo necesario con el nuevo namespace de plugin.

---

## TD-034: CHANGELOG.md supera límite de lectura del Read tool

```yml
id: TD-034
severidad: alta
estado: "[ ] Pendiente"
detectado_en: FASE 29
area: CHANGELOG
```

`CHANGELOG.md` tiene 38,566 bytes (~11,866 tokens) — supera el límite de 10,000 tokens
del Read tool. No se puede leer en una sola llamada. Es el tercer archivo crítico después
de `technical-debt.md` (TD-026-B) y `ROADMAP.md` (TD-026).

**Root cause:** Keep a Changelog no tiene convención de split — el archivo crece
indefinidamente con cada versión publicada. Con 20 versiones a 1,928 bytes/versión,
ya superó el límite en la versión ~17.

**Fix:**
- Crear `CHANGELOG-archive.md` con versiones v0.x + v1.x (13 versiones históricas)
- `CHANGELOG.md` mantiene solo versiones v2.x en adelante
- Agregar regla: al publicar nueva major version → archivar major anterior completa

**Criterio de cierre:**
- `CHANGELOG.md` ≤ 25,000 bytes (margen de seguridad)
- `CHANGELOG-archive.md` existe y contiene versiones archivadas
- SKILL.md actualizado con regla de archivado

---

## TD-035: Sin regla de longevidad para archivos vivos (REGLA-LONGEV-001)

```yml
id: TD-035
severidad: media
estado: "[ ] Pendiente"
detectado_en: FASE 29
area: conventions
```

El framework no tiene ninguna convención que prevenga la acumulación indefinida de
contenido en archivos vivos (archivos que se editan en cada FASE). Esto causó que
`technical-debt.md`, `ROADMAP.md` y `CHANGELOG.md` superaran el límite del Read tool
sin que nadie lo detectara ni previniera.

**Root cause:** `conventions.md` no documenta un umbral de tamaño máximo para archivos
vivos, ni un proceso de archivado/purga periódico.

**Fix — Agregar REGLA-LONGEV-001 en conventions.md:**

```
REGLA-LONGEV-001: Archivos vivos con umbral de tamaño
- Si un archivo vivo (que se edita cada FASE) supera 25,000 bytes:
  → Crear archivo de archivo (nombre-archive.md o nombre-history.md)
  → Mover contenido histórico/cerrado al archivo de archivo
  → El archivo original mantiene solo estado activo/reciente
- Trigger de revisión: cada 5 FASEs, ejecutar wc -c en archivos vivos clave
  Archivos a monitorear: ROADMAP.md, CHANGELOG.md, technical-debt.md
```

**Criterio de cierre:**
- `conventions.md` contiene la regla REGLA-LONGEV-001
- `project-status.sh` o script equivalente alerta si archivo vivo supera 25,000 bytes

---
