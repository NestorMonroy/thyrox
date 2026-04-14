```yml
type: Registro de Deuda Técnica
created_at: 2026-04-03
updated_at: 2026-04-13 19:42:39
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
Estado: [x] Resuelto — FASE 34 (2026-04-14) — validate-session-close.sh + integración stop-hook
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
Estado: [x] Resuelto — FASE 34 (2026-04-14) — 4 templates a legacy/, ad-hoc-tasks mapeado en workflow-execute/SKILL.md
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

**Evaluación FASE 33 (2026-04-13):**
THYROX completó FASE 33 con éxito usando el framework (18 archivos, 4 agentes paralelos,
múltiples sesiones). La evidencia observacional apoya que el framework mejora organización
y trazabilidad en proyectos de documentación a gran escala. El trigger original (decisión
arquitectónica pendiente) no se activó — el benchmark formal sigue pendiente para cuando
haya una pregunta concreta que requiera datos empíricos propios.

**Criterio de cierre:**
Benchmark ejecutado con ≥3 tareas reales. Resultados en `references/benchmark-skill-vs-claude.md`.
ADR-015 actualizado si los datos contradicen los hallazgos externos.

---

## TD-009: Patrón now-{agent-name}.md no implementado en definiciones de agentes nativos

```
Severidad: media
Origen: FASE 21 — skill-architecture-review (ADR-015 D-08)
Fase afectada: Capa 4 — Agentes nativos (.claude/agents/)
Estado: [x] Resuelto — FASE 34 (2026-04-14) — state_file en agent-spec.md + now-{agent-name}.md en task-executor y task-planner
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
Estado: [x] Resuelto — FASE 34 (2026-04-14) — timestamp corregido a 2026-04-08 17:04:20
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

## TD-025: skill-authoring.md desactualizado — pre-docs oficiales Claude Code

```
Severidad: baja
Origen: Revisión FASE 23 — análisis docs oficiales (2026-04-09)
Fase afectada: .claude/skills/pm-thyrox/references/skill-authoring.md
Estado: [x] Cerrado — FASE 33 (2026-04-13)
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

## TD-027: Criterio de auto-write vs validación humana no implementado en thyrox

```
Severidad: alta
Origen: FASE 25 — comportamiento inconsistente en gates de escritura (2026-04-09)
Fase afectada: Todas — especialmente Phase 3 PLAN, Phase 5 DECOMPOSE, Phase 7 TRACK
Estado: [x] Resuelto — FASE 34 (2026-04-14) — tabla completa (References/ADRs/Scripts), Write(/.claude/references/**) en allow
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
Estado: [x] Resuelto — FASE 34 (2026-04-14) — sección Re-evaluación con tabla micro/pequeño→Phase 6, mediano/grande→Phase 3
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

## TD-035: Sin regla de longevidad para archivos vivos (REGLA-LONGEV-001)

```yml
id: TD-035
severidad: media
estado: "[x] Resuelto — FASE 34 (2026-04-14) — bloque REGLA-LONGEV-001 agregado en project-status.sh"
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
