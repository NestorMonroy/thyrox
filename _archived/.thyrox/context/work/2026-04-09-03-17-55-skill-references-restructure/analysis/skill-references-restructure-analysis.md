```yml
type: Analysis
work_package: 2026-04-09-03-17-55-skill-references-restructure
created_at: 2026-04-09 03:17:55
updated_at: 2026-04-09 03:17:55
phase: Phase 1 — ANALYZE
status: En análisis
reversibility: reversible
```

# Análisis: skill-references-restructure (FASE 24)

## Objetivo / Por qué

Alinear la anatomía de los 7 `workflow-*` skills con la estructura oficial de Claude Code:
cada skill debe ser **autocontenido** con su propio `references/` y `scripts/` cuando aplica.
Actualmente todos los recursos viven centralizados en `pm-thyrox/references/` (24 archivos) y
`pm-thyrox/scripts/` (20 scripts), independientemente del skill al que pertenecen.

La motivación adicional del usuario: `skill-vs-agent.md` y otros documentos de nivel
infraestructura no pertenecen a `pm-thyrox` — son referencias del sistema Claude Code mismo.

---

## Inventario del estado actual

### Referencias por owner declarado (24 archivos en `pm-thyrox/references/`)

| Owner | Archivos |
|-------|---------|
| `workflow-analyze` (9) | basic-usage, constraints, context, introduction, quality-goals, requirements-analysis, scalability, stakeholders, use-cases |
| `workflow-execute` (2) | commit-convention, commit-helper |
| `workflow-strategy` (1) | solution-strategy |
| `workflow-structure` (1) | spec-driven-development |
| `workflow-track` (2) | incremental-correction, reference-validation |
| `pm-thyrox (cross-phase)` (7) | agent-spec, examples, long-context-tips, prompting-tips, skill-authoring, skill-vs-agent, state-management |
| `pm-thyrox` (1) | claude-code-components |
| `NO_OWNER` (1) | conventions |

### Scripts (20 en `pm-thyrox/scripts/`)

| Categoría | Scripts | Acoplamiento |
|-----------|---------|-------------|
| Hooks de sesión | session-start.sh, session-resume.sh, stop-hook-git-check.sh, commit-msg-hook.sh | **settings.json** — rutas absolutas hard-coded |
| Validación workflow-track | validate-session-close.sh, validate-phase-readiness.sh, project-status.sh, update-state.sh | `workflow-track/SKILL.md` los referencia con path completo |
| Validación de referencias | validate-broken-references.py, detect_broken_references.py, convert-broken-references.py, validate-missing-md-links.sh, detect-missing-md-links.sh, convert-missing-md-links.sh | uso manual / CI |
| Agent tooling | lint-agents.py | `agent-spec.md` lo referencia con path completo |
| Evaluaciones | run-functional-evals.sh, run-multi-evals.sh | uso manual |
| Estado del proyecto | update-state.sh, project-status.sh | `workflow-track/SKILL.md` |
| Migración legacy | migrate-metadata-keys.py, verify-skill-mapping.sh | uso puntual pasado |
| Tests | `tests/` (directorio) | interno |

---

## Los 8 aspectos

### 1. Objetivo / Por qué

- **Problema inmediato**: workflow-analyze tiene 9 references en `pm-thyrox/references/` cuando
  debería tenerlas en `workflow-analyze/references/`. Lo mismo para execute, strategy, structure,
  track. El skill no es autocontenido.
- **Problema declarado por el usuario**: `skill-vs-agent.md` (y por extensión `agent-spec.md`,
  `claude-code-components.md`) son documentación del sistema Claude Code, no de pm-thyrox.
  Merecen un nivel superior — candidato: `.claude/references/`.

### 2. Stakeholders

- **Framework maintainer (usuario)**: quiere estructura coherente con anatomía oficial.
- **Claude Code invocando skills**: beneficio directo — cuando `/workflow-analyze` carga, solo
  necesita contexto de `workflow-analyze/references/`, no los 24 archivos de pm-thyrox.
- **Claude leyendo pm-thyrox/SKILL.md**: la sección `## References por dominio` linkea a todos;
  esos links deben actualizarse.

### 3. Uso operacional

Al invocar `/workflow-analyze`, Claude seguirá el SKILL.md y accederá a references con rutas
relativas como `references/scalability.md`. Hoy usa `../../pm-thyrox/references/scalability.md`.
Después de la migración usará `references/scalability.md` (relativa al propio skill).

Las referencias cross-phase (`pm-thyrox/references/examples.md`, etc.) seguirán siendo accedidas
desde `pm-thyrox/SKILL.md` o desde los skills que las necesiten.

### 4. Atributos de calidad

- **Cohesión**: cada skill encapsula sus recursos (principio de anatomía oficial).
- **Descubribilidad**: al abrir `workflow-analyze/`, el desarrollador ve directamente sus refs.
- **Bajo acoplamiento**: pm-thyrox deja de ser un megahub de referencias.

### 5. Restricciones

- **settings.json**: 3 scripts de hooks tienen rutas hard-coded. Si los scripts se mueven, se
  debe actualizar `settings.json`. **Alto riesgo de romper hooks**.
- **workflow-track/SKILL.md**: referencia 4 scripts con path completo. Si se mueven, hay que
  actualizar esos paths en el SKILL.md.
- **agent-spec.md**: referencia `lint-agents.py` con path completo.
- **SCOPE SCRIPTS**: mover scripts de infraestructura (hooks) es más riesgoso que mover
  references. Los hooks que fallan silenciosamente son difíciles de detectar.

### 6. Contexto / Sistemas vecinos

- FASE 23 acaba de crear los 7 subdirectorios `workflow-*/SKILL.md`. La infraestructura ya
  existe — ahora falta poblarla con `references/`.
- `pm-thyrox/SKILL.md` (148 líneas) tiene `## References por dominio` que linkea todos los
  archivos de referencias con rutas relativas a `pm-thyrox/references/`. Debe actualizarse.
- Locked Decision #2 de CLAUDE.md: "Anatomía oficial — SKILL.md + scripts/ + references/ +
  assets/". Esta migración **cumple** esa decisión, no la contradice.

### 7. Fuera de alcance

- **Contenido de los archivos de referencia** — no se cambia, solo se mueve.
- **assets/** — los templates pertenecen a pm-thyrox porque son generados desde cualquier fase;
  no se mueven.
- **Convenciones de commits o ADRs** — no aplica.
- **Tech skills** (backend-nodejs, react, etc.) — no están en scope.

### 8. Criterios de éxito

1. Cada `workflow-*` tiene su propio `references/` con los archivos que le pertenecen.
2. Los links internos en cada `workflow-*/SKILL.md` usan rutas relativas locales.
3. `pm-thyrox/references/` queda solo con cross-phase + global references.
4. `pm-thyrox/SKILL.md` `## References por dominio` apunta a las nuevas ubicaciones.
5. Los hooks de settings.json siguen funcionando (si scripts se mueven, se actualiza settings).
6. `agent-spec.md` y `skill-vs-agent.md` tienen un destino definido (ver decisión pendiente abajo).

---

## Decisión pendiente — GAP de alcance [NEEDS CLARIFICATION]

**Pregunta A — Destino de referencias cross-phase:**

Las 7 referencias con `owner: pm-thyrox (cross-phase)` (agent-spec, examples, long-context-tips,
prompting-tips, skill-authoring, skill-vs-agent, state-management) + claude-code-components:

| Opción | Descripción | Pro | Contra |
|--------|-------------|-----|--------|
| **A1** | Quedan en `pm-thyrox/references/` | Sin cambio de nivel, pm-thyrox las custodia | pm-thyrox sigue siendo hub |
| **A2** | Se mueven a `.claude/references/` (nuevo nivel global) | Verdaderamente global, no acoplado a pm-thyrox | Nuevo concepto a documentar; links rompen en todos los skills |
| **A3** | Se distribuyen a los skills que las consumen (ej. skill-vs-agent → workflow-analyze y pm-thyrox) | Máxima cohesión | Duplicación; incongruente |

El usuario mencionó `skill-vs-agent.md` como "global". **¿Confirma A2 (nuevo `.claude/references/`)
o prefiere A1 (quedan en pm-thyrox/references/)?**

**Pregunta B — Alcance de scripts:**

Los 20 scripts tienen acoplamiento con settings.json (hooks). Moverlos es posible pero riesgoso.

| Opción | Descripción |
|--------|-------------|
| **B1** | Solo mover references; scripts quedan en pm-thyrox/scripts/ | Bajo riesgo, scope acotado |
| **B2** | Mover también los scripts que tienen owner claro (ej. validate-session-close → workflow-track/scripts/) + actualizar paths | Completo pero más riesgo |
| **B3** | Mover todos: referencias + scripts + actualizar settings.json | Máxima coherencia, máximo riesgo |

**¿Cuál opción B prefiere?**

---

## Riesgos identificados

| ID | Riesgo | Prob | Impacto |
|----|--------|------|---------|
| R-01 | Links rotos en pm-thyrox/SKILL.md tras mover references | Alta | Medio — referencias no encontradas |
| R-02 | Links rotos en workflow-*/SKILL.md que hoy apuntan a ../../pm-thyrox/references/ | Alta | Medio — ya hay 1 ref en workflow-analyze |
| R-03 | Hooks de sesión dejan de funcionar si scripts se mueven sin actualizar settings.json | Media | Alto — sesiones sin contexto |
| R-04 | agent-spec.md referencia lint-agents.py con path que cambia si script se mueve | Baja | Bajo — solo docs |
| R-05 | conventions.md sin owner — destino ambiguo | Baja | Bajo |

---

## Sizing preliminar

- **Referencias**: 24 archivos, 15 son skill-específicas (fácil), 9 son cross-phase (decisión pendiente).
- **Scripts (si B2/B3)**: 20 scripts + settings.json + 3 SKILL.md con paths hard-coded.
- **Estimación**: Mediano (~3-5h). 7 fases completas.

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis presentado | Usuario confirma hallazgos + responde Pregunta A y B |
| SP-02 | 2→3 | gate-fase | Estrategia de solución presentada | Usuario aprueba decisiones de reorganización |
| SP-03 | 4→5 | gate-fase | Spec presentada | Usuario aprueba spec antes de descomponer |
| SP-04 | 5→6 | gate-fase | Task plan presentado | Usuario aprueba tareas antes de ejecutar |
| SP-05 | 6→7 | gate-fase | Ejecución completa | Usuario confirma cierre |
