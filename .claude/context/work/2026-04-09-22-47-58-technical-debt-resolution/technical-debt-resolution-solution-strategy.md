```yml
created_at: 2026-04-10 00:00:00
project: technical-debt-resolution
architecture_version: 1.0
status: Propuesta — pendiente Gate 2→3
```

# Solution Strategy: technical-debt-resolution (FASE 29)

## Propósito

Transformar los hallazgos de Phase 1 en decisiones implementables para resolver la deuda
técnica del framework THYROX: renombrado del skill orquestador, corrección de SKILL.md de
las 7 fases, redefinición de artefactos de WP, y control de crecimiento de archivos vivos.

---

## Key Ideas

### Idea 1: thyrox como identidad del framework (no "pm-thyrox")

El skill orquestador no es un "project manager" en el sentido PMI (persona con autoridad
organizacional, liderazgo de equipos, gestión de presupuesto). Es una **metodología de
desarrollo de 7 fases** para trabajo asistido por AI. El nombre correcto es el nombre del
framework: `thyrox`.

**Impacto:** El renombrado es la única decisión de esta FASE que afecta archivos de
configuración activos (CLAUDE.md, scripts, workflow-*/SKILL.md). Los archivos históricos
(WPs anteriores, ADRs) no se tocan — son registros inmutables.

---

### Idea 2: Dos ciclos de vida de artefactos — desarrollo vs producción

Los archivos en la raíz del repositorio (`ROADMAP.md`, `CHANGELOG.md`) son artefactos de
**producción** — se actualizan cuando algo llega a `main`. Todo lo que sucede durante el
desarrollo de un WP vive **dentro del WP**.

```
context/work/WP-X/
├── {wp}-execution-log.md      ← sesiones (tiempo, lotes) — Phase 6
├── {wp}-changelog.md          ← cambios del WP (feat, fix, refactor) — Phase 7 [NUEVO]
└── {wp}-technical-debt-resolved.md  ← TDs cerrados en este WP — Phase 7 [NUEVO]

root/
├── CHANGELOG.md               ← solo en releases a main [Unreleased] hasta entonces
└── ROADMAP.md                 ← plan de alto nivel del producto
```

**Impacto:** Phase 7 TRACK deja de escribir en root CHANGELOG.md. En cambio genera
`{wp}-changelog.md`. Root CHANGELOG.md solo se toca en merges a producción.

---

### Idea 3: Technical debt como ciclo cerrado

Los TDs no son permanentes. Cuando se implementa el fix de un TD, ese TD se mueve del
registro activo (`technical-debt.md`) al WP que lo implementó (`{wp}-technical-debt-resolved.md`).
La "deuda" se salda en el WP que la resolvió — no desaparece en el aire.

**Impacto:** `technical-debt.md` en raíz mantiene solo TDs `[ ]` pendientes.
Los TDs `[x]` se mueven al WP que los cerró. El archivo raíz se mantiene legible
(≤ 32,500 bytes = 10,000 tokens) de forma estructural, no por purga periódica.

---

### Idea 4: Archivos vivos con umbral de tamaño (REGLA-LONGEV-001)

El crecimiento indefinido de archivos vivos es anti-pattern. La solución no es hacer
splits reactivos (como se hizo con ROADMAP en FASE 26) sino tener una regla preventiva:
cuando un archivo vivo supera 25,000 bytes, mover su contenido histórico/cerrado a un
archivo de archivo.

---

## Fundamental Decisions

### Decision 1: Renombrar `pm-thyrox` → `thyrox`

**Alternatives Considered:**
- Mantener `pm-thyrox` — Pros: sin costo de migración. Cons: nombre incorrecto según PMI, confunde el rol del skill
- `thyrox-sdlc` — Pros: más descriptivo. Cons: verboso, innecesario (THYROX ya implica SDLC)
- `thyrox-framework` — Pros: preciso. Cons: redundante con el concepto de "framework"
- `thyrox` — Pros: nombre del proyecto = nombre del framework, limpio, resuelve también el namespace de comandos

**Justification:**
El skill no gestiona personas, presupuestos ni stakeholders (PMI PM). Es la metodología THYROX
en sí misma. Llamarlo `thyrox` es correcto: el skill IS el framework. Además unifica la respuesta
a dos preguntas simultáneas: "¿cómo se llama el skill?" y "¿cuál es el namespace de comandos?".

**Implications:**
- Directorio: `.claude/skills/pm-thyrox/` → `.claude/skills/thyrox/`
- CLAUDE.md: actualizar 6 referencias
- Scripts: actualizar ~5 archivos (session-start, session-resume, update-state, project-status, commit-msg-hook)
- workflow-*/SKILL.md: actualizar grep filter en 3 archivos
- references/*.md: actualizar `owner:` frontmatter en ~10 archivos
- Archivos históricos (WPs anteriores, ADRs): NO se tocan
- Comando namespace: `/thyrox:*` (consecuencia directa)

---

### Decision 2: `{wp}-changelog.md` como nuevo artefacto WP creado en Phase 7

**Alternatives Considered:**
- Mantener root CHANGELOG.md por WP — Cons: sobrecarga el archivo de producción, ya supera el límite
- Usar solo `execution-log.md` — Cons: execution-log es temporal/sesiones, no semántico (feat/fix/refactor)
- Archivo global `changelog-dev.md` — Cons: crecimiento idéntico al problema actual
- Por-WP `{wp}-changelog.md` en Phase 7 — Pros: autónomo, no crece la raíz, semántico, limpiable

**Justification:**
El `execution-log.md` trackea tiempo y sesiones. El `{wp}-changelog.md` trackea QUÉ cambió
en el código (desde git commits del WP). Son complementarios. El changelog por WP cumple
exactamente el propósito de "Keep a Changelog" sin contaminar el archivo de producción.

**Implications:**
- Crear template: `workflow-track/assets/wp-changelog.md.template`
- Actualizar `workflow-track/SKILL.md`: crear `{wp}-changelog.md` en lugar de root CHANGELOG.md
- Actualizar `pm-thyrox/SKILL.md` (→ `thyrox/SKILL.md`): agregar artefacto a tabla de Phase 7
- Root `CHANGELOG.md`: agregar sección `[Unreleased]`, documentar que solo se actualiza en releases

---

### Decision 3: `{wp}-technical-debt-resolved.md` vive en el WP que implementó el TD

**Alternatives Considered:**
- TD `[x]` permanece en `technical-debt.md` — Cons: archivo crece indefinidamente, ya al 176% del límite
- Mover TDs cerrados a `technical-debt-resolved.md` global — Cons: mismo problema de crecimiento, sin provenance
- Eliminar el TD cuando se cierra — Cons: pierde historial, no hay trazabilidad
- Mover TD cerrado al WP que lo implementó — Pros: trazabilidad exacta, el WP que resolvió el TD lo documenta

**Justification:**
"El WP X resolvió el TD Y" es información valiosa. Vivir en el WP da trazabilidad sin inflar
archivos globales. Cada WP documenta qué deuda técnica saldó — parte de su historia.

**Implications:**
- Crear template: `workflow-track/assets/technical-debt-resolved.md.template`
- Actualizar `workflow-track/SKILL.md`: agregar paso "mover TDs cerrados a `{wp}-technical-debt-resolved.md`"
- Actualizar `pm-thyrox/SKILL.md` (→ `thyrox/SKILL.md`): agregar artefacto a tabla de Phase 7
- Actualizar `technical-debt.md`: agregar procedimiento de cierre en convenciones

---

### Decision 4: Fixes de SKILL.md y scripts — Plano A (instrucciones + scripts) sin Plano B (hooks nuevos)

**Alternatives Considered:**
- Solo Plano B (hooks automáticos nuevos) — Pros: determinístico. Cons: más complejo, side effects, fuera de scope
- Plano A + Plano B — Cons: desborda scope, riesgo R-05 (scope creep)
- Solo Plano A (instrucciones SKILL.md + mejoras a scripts existentes) — Pros: costo bajo, suficiente

**Justification:**
Plano A es la intervención correcta para TDs de "instrucción débil". Hooks NUEVOS son para
automatización de operaciones repetitivas — no para guiar análisis. Pero B-08 y B-09 (Phase 1
sección 5) son mejoras a scripts YA EXISTENTES (`project-status.sh`, `session-start.sh`), no
hooks nuevos. Se incluyen en Plano A por su bajo costo.

**Implications:**
- 7 archivos `workflow-*/SKILL.md`: secciones de validación pre-gate (TD-029)
- `workflow-execute/SKILL.md`: deep review pre-gate explícito (TD-031) + pre-flight checklist mejorado (TD-032)
- Todos `workflow-*/SKILL.md`: instrucción `git add now.md` antes de commits y gates (TD-033)
- `workflow-execute/SKILL.md`: criterio granular de auto-write vs validación humana (TD-027 Plano A)
- `project-status.sh`: alerta si ROADMAP no tiene entry del WP activo (B-08)
- `session-start.sh`: alerta si execution-log falta cuando Phase 6 está activa (B-09)
- Hooks nuevos: sin cambios en esta FASE

**Nota TD-027:** Solo Plano A (instrucción en SKILL.md). Plano B (hook automático) → FASE 30.
**Nota TD-011:** Checklist de atomicidad ya existe (PARCIAL). No requiere acción adicional en FASE 29
— se marca como implementado suficiente. Solo si hay evidencia de fallas reales se escala.

---

### Decision 5: Splits de archivos sobredimensionados — ahora, no después

**Alternatives Considered:**
- Esperar más FASEs — Cons: problema ya activo (176%, 140%, 119%), cada FASE empeora
- Split solo technical-debt.md (el más urgente) — Cons: ROADMAP y CHANGELOG también fallan ya
- Split los 3 + agregar REGLA-LONGEV-001 — Pros: resuelve el problema estructuralmente

**Justification:**
Los 3 archivos ya superan el límite. El análisis de Phase 1 mostró que superaron el límite
hace 5-10 FASEs sin que nadie lo detectara. Actuar ahora evita que el problema empeore.
La REGLA-LONGEV-001 previene que el próximo archivo supere el límite sin alerta.

**Implications:**
- `ROADMAP.md`: mover FASEs 1-26 a `ROADMAP-history.md`
- `CHANGELOG.md`: convertir a `[Unreleased]` only, archivar versiones en `CHANGELOG-archive.md`
- `technical-debt.md`: mover TDs resueltos (TD-002, TD-004, TD-016, TD-017, TD-019..TD-021, TD-023, TD-024) a un archivo temporal mientras se crean los WP-level resolved
- `references/conventions.md`: agregar REGLA-LONGEV-001

---

## Scope — Qué entra y qué no en esta FASE

### IN SCOPE

| Grupo | TDs cubiertos | Archivos afectados |
|-------|--------------|-------------------|
| Renombrado `pm-thyrox` → `thyrox` | TD-030 (parcial) | ~20 archivos activos |
| Validación pre-gate (instrucciones) | TD-029, TD-031, TD-033 | 7 workflow-*/SKILL.md |
| Pre-flight checklist execute + criterio auto-write | TD-032, TD-027 Plano A | workflow-execute/SKILL.md |
| WP size re-evaluation | TD-028 | workflow-strategy/SKILL.md |
| Step 0 END USER CONTEXT | TD-007 | workflow-analyze/SKILL.md |
| Timestamps en artefactos y execution-log | TD-001, TD-018 | conventions.md, validate-session-close.sh |
| Mejoras a scripts existentes (B-08, B-09) | TD-032-B | project-status.sh, session-start.sh |
| Templates faltantes | — | 2 nuevos templates |
| Artefacto {wp}-changelog.md | TD-034 (parcial) | workflow-track/SKILL.md, thyrox/SKILL.md |
| Artefacto {wp}-technical-debt-resolved.md | — | workflow-track/SKILL.md, thyrox/SKILL.md |
| Splits de archivos sobredimensionados | TD-026, TD-034 | ROADMAP.md, CHANGELOG.md, technical-debt.md |
| REGLA-LONGEV-001 | TD-035 | conventions.md |
| Cerrar TDs ya implementados | TD-002, TD-004, TD-011, TD-016, TD-017, TD-021 | technical-debt.md |

### OUT OF SCOPE (próximas FASEs)

| TD | Razón |
|----|-------|
| TD-003 | Templates huérfanos — baja prioridad, FASE 31+ |
| TD-005, TD-006 | Investigación arquitectónica — FASE 31+ |
| TD-008 | WP propio — FASE 30 |
| TD-009 | now-{agent-name} — scope separado |
| TD-010 | Benchmark empírico — FASE 31+ |
| TD-022, TD-025 | Baja severidad — FASE 31+ |
| TD-027 Plano B | Hook de auto-write — FASE 30+ |
| TD-030 meta-comandos | /thyrox:next, :sync, :prime, :review → FASE 30 (junto con TD-008 commands) |

---

## Adherence to Constraints

**Constraint: Locked Decisions en CLAUDE.md no se revisan**
→ "Single skill" sigue vigente. `workflow-*` siguen siendo la excepción documentada (ADR-016).
El renombrado de `pm-thyrox` → `thyrox` no viola este constraint — sigue siendo un único
skill orquestador. Actualizar Addendum en Locked Decision #5.

**Constraint: Git as persistence**
→ Todos los cambios van en commits convencionales. Los archivos históricos (WPs previos,
ADRs) no se modifican — se preservan en git tal como están.

**Constraint: Markdown only**
→ Sin bases de datos. Todos los nuevos artefactos son `.md`.

**Constraint: SKILL.md limit ~200 líneas**
→ Verificar `wc -l` antes y después de cada edición. Si algún SKILL.md supera 200 líneas,
mover detalle a una referencia y dejar solo el checklist en el SKILL.

---

## Traceability to Analysis

- TD-007 → Decision 4 (Step 0 en workflow-analyze/SKILL.md)
- TD-001, TD-018 → Decision 4 + Decision 5 (regla en conventions.md)
- TD-027 Plano A → Decision 4 (criterio en workflow-execute/SKILL.md)
- TD-028 → Decision 4 (re-evaluación en workflow-strategy/SKILL.md)
- TD-029, TD-031, TD-033 → Decision 4 (validación pre-gate en 7 SKILL.md)
- TD-032 + B-08 + B-09 → Decision 4 (SKILL.md + scripts existentes)
- TD-026, TD-034, TD-035 → Decision 5 (splits + REGLA-LONGEV-001)
- TD-030 (renombrado) → Decision 1
- TD-030 (meta-comandos) → OUT OF SCOPE, FASE 30
- R-01 → mitigado: editar SKILL.md en secuencia, 1 commit por archivo
- R-02 → mitigado: medir wc -l antes y después, extraer a references/ si supera 200 líneas
- R-03 → mitigado: grep recursivo de ROADMAP.md antes del split
- R-04 → mitigado: verificar grep de TD-019..TD-024 en Phase 4 STRUCTURE
- R-05 (scope creep TD-008) → mitigado por tabla OUT OF SCOPE
- R-06, R-07, R-08 → Decision 5 (splits)
- SP-01 → Gate actual (Phase 2→3)
- SP-02 → Gate Phase 5→6 (GATE OPERACION): requerirá aprobación explícita antes de editar SKILL.md
- SP-03 → Gate Phase 6→7: confirmar que todos los cambios son correctos

---

## Validation Checklist

- [x] Key ideas identificadas (4 ideas centrales)
- [x] Decisiones fundamentales documentadas (5 decisiones)
- [x] Alternativas consideradas para cada decisión
- [x] Justificaciones claras con referencia a análisis Phase 1
- [x] Scope delimitado — IN y OUT OF SCOPE explícito (todos los TDs clasificados)
- [x] Constraints respetados
- [x] Trazabilidad a TDs de Phase 1 — incluyendo R-01..R-08 y SP-01..SP-03
- [x] B-08, B-09 correctamente clasificados como mejoras a scripts (no hooks)
- [x] TD-001, TD-018 incluidos en scope (eran categoría 2 en Phase 1)
- [x] TD-011 PARCIAL resuelto — implementado suficiente, sin acción adicional
- [x] TD-027 Plano A incluido, Plano B diferido a FASE 30
- [x] TD-030 meta-comandos diferidos a FASE 30 (junto con TD-008 commands)
- [x] Deep review Phase 1 → Phase 2 completado (8 gaps identificados y corregidos)
- [x] Clara guía para Phase 3 PLAN
