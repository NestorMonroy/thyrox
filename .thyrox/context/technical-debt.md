```yml
type: Registro de Deuda Técnica
created_at: 2026-04-03
updated_at: 2026-04-20 13:47:30
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

## TD-010: Benchmark empírico — SKILL vs CLAUDE.md vs baseline sin framework

```
Severidad: baja
Origen: FASE 21 — skill-architecture-review (ADR-015 H1/H2/H3)
Fase afectada: Metodología general (decisión de arquitectura)
Estado: [-] En progreso — FASE 35 (2026-04-14) — trigger activado: migración context/ es el caso de uso real
```

**Problema original:**
ADR-015 documenta hallazgos de terceros sobre SKILL vs CLAUDE.md (H1: triggering probabilístico,
H2: prompt injection, H3: CLAUDE.md alternativa más confiable). Sin embargo, no existe evidencia
empírica propia del proyecto THYROX que compare las tres opciones en condiciones equivalentes.

**Trigger activado — FASE 35:**
La migración `.claude/context/` → `.thyrox/context/` es el caso de uso real que activa el
benchmark. Cumple los criterios: ≥1 semana de trabajo, decisión arquitectónica real con
consecuencias permanentes.

**Cambio de formato — de sintético a instrumentación real:**
El benchmark 3×3 original (3 tareas × 3 condiciones) no es aplicable a la migración en
curso (ya está en condición A). En su lugar se instrumenta la migración misma:

- Registrar cuántas decisiones fueron guiadas por el SKILL vs por CLAUDE.md vs por criterio propio
- Registrar dónde el framework ayudó y dónde generó fricción
- Registrar si la migración habría sido viable sin el framework, o con solo CLAUDE.md
- Capturar evidencia de activación real del SKILL durante la FASE

**Artefacto de salida:**
`references/benchmark-skill-vs-claude.md` — se escribe al cerrar FASE 35, con datos
reales de la migración como caso de estudio.

**Criterio de cierre:**
`references/benchmark-skill-vs-claude.md` existe con evidencia empírica de la migración.
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

## TD-037: agents/*.yml tienen campo `model:` prohibido por README del registry

```
Severidad: media
Origen: FASE 36 — análisis registry (2026-04-14)
Fase afectada: .thyrox/registry/agents/
Estado: [ ] Pendiente
```

**Problema:**
El README de `registry/agents/` declara `model` como campo **PROHIBIDO** en los YMLs:
> "model: PROHIBIDO — bootstrap.py no lo propaga a agentes nativos"

Sin embargo, todos los YMLs de tech-experts tienen `model: claude-sonnet-4-6`.
Hay divergencia entre la spec del registry y los archivos actuales.

**Archivos afectados:**
`nodejs-expert.yml`, `react-expert.yml`, `webpack-expert.yml`,
`postgresql-expert.yml`, `mysql-expert.yml`, `task-executor.yml`

**Criterio de cierre:**
Campo `model:` eliminado de todos los YMLs, o README actualizado si la prohibición
fue revertida (con justificación en ADR).

---

## TD-038: webpack-expert no tiene .yml en registry (agente existe en .claude/agents/)

```
Severidad: media
Origen: FASE 36 — análisis registry (2026-04-14)
Fase afectada: .thyrox/registry/agents/
Estado: [ ] Pendiente
```

**Problema:**
El README de `registry/agents/` lista `webpack-expert` en la tabla de tech-experts
como si fuera generado por `bootstrap.py`, pero el archivo `agents/webpack-expert.yml`
existe directamente y no sigue el flujo de generación. El agente `.claude/agents/webpack-expert.md`
fue creado manualmente, no mediante `bootstrap.py`.

**Criterio de cierre:**
Decidir: (A) crear `webpack-expert.yml` formal en registry para generación consistente,
o (B) documentar en README que webpack-expert es un agente manual (fuera del flujo A).

---

## TD-039: Sin mecanismo de sincronización entre Flow A (agents) y Flow B (templates)

```
Severidad: baja
Origen: FASE 36 — análisis registry (2026-04-14)
Fase afectada: .thyrox/registry/
Estado: [ ] Pendiente
```

**Problema:**
`nodejs-expert.yml` (Flujo A) y `backend/nodejs.template.md` (Flujo B) describen
el mismo dominio tecnológico (Node.js) pero son artefactos independientes con
convenciones distintas. Un cambio en el template no actualiza el agente, y viceversa.

Si el sistema escala (10+ stacks), la divergencia entre las convenciones del agente
y las del template se vuelve un problema de mantenimiento.

**Criterio de cierre:**
Definir regla explícita: ¿deben estar sincronizados? ¿El agent YML debería importar
las convenciones del template como sección? Documentar en `registry/README.md`.

---

## TD-041: 16 reference gaps de impacto medio — FASE 37 out-of-scope

```
Severidad: media
Origen: FASE 37 — deep-review claude-code-ultimate-guide + claude-howto (2026-04-15)
Fase afectada: .claude/references/
Estado: [ ] Pendiente — diferido a FASE 38
```

**Problema:**
El deep-review de `claude-code-ultimate-guide` y `claude-howto` identificó 16 gaps
de impacto medio que no fueron cubiertos en FASE 37 (que se focalizó en los 10 gaps
de impacto alto). Estos gaps requieren nuevos reference files o actualizaciones
a archivos existentes.

**Gaps pendientes (fuente: `research/claude-platform-deep-review/`):**

| # | Tema | Tipo | Fuente |
|---|------|------|--------|
| 1 | enterprise-governance | Nuevo archivo | ultimate-guide |
| 2 | session-observability | Nuevo archivo | ultimate-guide |
| 3 | devops-sre | Nuevo archivo | ultimate-guide |
| 4 | team-metrics | Nuevo archivo | ultimate-guide |
| 5 | adoption-approaches | Nuevo archivo | ultimate-guide |
| 6 | context-optimization-tools | Nuevo archivo | ultimate-guide |
| 7 | event-driven-automation | Nuevo archivo | howto |
| 8 | settings-reference | Nuevo archivo | howto |
| 9 | agent-evaluation | Nuevo archivo | howto |
| 10 | code-quality-rules | Nuevo archivo | howto |
| 11 | refactoring-patterns | Nuevo archivo | howto |
| 12 | mcp-integration-updates | Actualizar existente | ultimate-guide + howto |
| 13 | plugins-updates | Actualizar existente | howto |
| 14 | advanced-features-updates | Actualizar existente | howto |
| 15 | long-context-tips-updates | Actualizar existente | ultimate-guide |
| 16 | agent-teams (experimental) | Diferido — feature inestable | ultimate-guide |

**Criterio de cierre:**
Los 16 gaps documentados tienen su reference file o actualización correspondiente
en `.claude/references/`. Agent-teams puede cerrarse cuando el feature salga de
experimental.

---

## TD-040: .instructions.md en .thyrox/guidelines/ no cargadas por mecanismo verificado

```
Severidad: alta
Origen: FASE 36 — análisis de carga de guidelines (2026-04-14)
Fase afectada: .thyrox/guidelines/ + .claude/CLAUDE.md
Estado: [-] En progreso — @imports agregados en CLAUDE.md (FASE 36), verificación pendiente
```

**Problema:**
Los archivos `{layer}-{framework}.instructions.md` en `.thyrox/guidelines/` están
diseñados como "directivas siempre activas". Sin embargo, nunca se verificó que
el mecanismo de carga funcione en sesiones reales.

Con la migración de FASE 36 se agregaron `@imports` explícitos en CLAUDE.md.
Pero el comportamiento de `@path` para `.instructions.md` no está documentado
en las referencias de plataforma como "verificado en producción".

**Trabajo requerido:**
1. Verificar en una sesión real que los `@imports` en CLAUDE.md activan las guidelines
2. Confirmar que Claude aplica las reglas de Node.js/React/etc. sin ser instruido
3. Si `@imports` no funciona para `.instructions.md`, migrar a `.claude/rules/` (mecanismo oficial de Project Rules)

**Criterio de cierre:**
En una sesión de prueba, Claude aplica reglas de las guidelines (ej: "no lógica de negocio
en handlers") sin instrucción explícita. O las guidelines se mueven a `.claude/rules/`
con el mecanismo oficial verificado.

---

## TD-042: validate-session-close.sh sin verificación PAT-004

```
Severidad: media
Origen: ÉPICA 41 — analyze/process/task-plan-sync-root-cause.md Fix 3 (2026-04-17)
Fase afectada: .claude/scripts/validate-session-close.sh + cierre de WP
Estado: [ ] Pendiente
```

**Problema:**
`validate-session-close.sh` no verifica si los checkboxes del task-plan están sincronizados
con los commits del WP antes de cerrar. Es posible cerrar un WP con T-NNN marcados `[x]`
sin evidencia en git, o con implementación sin checkbox (PAT-004 sistémico silencioso).

**Impacto:**
El task-plan queda como fuente de verdad falsa — indica estado que no refleja la realidad.
El audit posterior encuentra el drift pero no puede prevenirlo.

**Solución propuesta:**
Agregar en `validate-session-close.sh` una verificación opcional:
1. Extraer T-NNN marcados `[x]` del task-plan activo
2. Para cada T-NNN, verificar que existe al menos un commit con ese ID en `git log`
3. Si hay discrepancias: emitir advertencia (no bloquear — es validación soft)

Requiere análisis de `git log` con grep sobre mensajes de commit.

**Criterio de resolución:**
`validate-session-close.sh` emite advertencia cuando detecta T-NNN marcados `[x]` sin
commit correspondiente, o commits con T-NNN sin `[x]` en el task-plan.

---

## TD-043: 6 tecnologías en bootstrap.py sin template en registry

```
Severidad: media
Origen: ÉPICA 42 — cluster-i (H-07) — registry-adr-gaps
Fase afectada: .thyrox/registry/ + bootstrap.py
Estado: [ ] Pendiente
```

**Descripción:**
`bootstrap.py` declara techs en `TECH_CATEGORIES` que no tienen template en el directorio correspondiente del registry. Cuando `install_tech_agent()` no encuentra el template, usa solo el `system_prompt` del YML — el agente generado carece de las instrucciones específicas de stack que provee el template.

**Detectado:** 2026-04-20 — ÉPICA 42 cluster-i (H-07)

**Impacto:**
Skills generados para estas techs no tienen instrucciones específicas de convenciones — reducen la calidad del output agentic para esas tecnologías. El problema es silencioso: `bootstrap.py` no advierte que el template no existe y reporta el agente como instalado correctamente.

**Techs afectadas:**
`TECH_CATEGORIES` en `bootstrap.py` mapea tech → categoría. La ruta esperada es `registry/{categoría}/{tech}.skill.template.md`. Techs sin template:
- `python` → `registry/backend/python.template.md` — no existe
- `fastapi` → `registry/backend/fastapi.template.md` — no existe
- `django` → `registry/backend/django.template.md` — no existe
- `mongodb` → `registry/database/mongodb.template.md` — no existe
- `redis` → `registry/database/redis.template.md` — no existe

Adicionalmente: `postgresql` y `mysql` tienen templates en `registry/db/` pero `TECH_CATEGORIES` usa `"database"` como categoría — `bootstrap.py` busca en `registry/database/` que no existe. Los YMLs de ambos tech-experts tienen `system_prompt` extenso que suple parcialmente el template, pero la inconsistencia de categoría sigue siendo deuda.

**Resolución propuesta:**
Opción A: Crear template en `registry/backend/` o `registry/database/` para cada tech faltante.
Opción B: Agregar advertencia en `bootstrap.py` al detectar tech sin template:
```python
if not template_path.exists():
    print(f"  [WARN] {tech}: no template found at {template_path} — using system_prompt only")
```
Ver T-066 (verificación de dependencias MCP) como referencia de patrón de advertencia en bootstrap.py.

**Prioridad:** MEDIO
**Estado:** Abierto
