```yml
Tipo: Plan Maestro
Categoría: Gestión de Proyecto
Versión: 0.2.0
Propósito: Plan maestro de trabajo y tracking de progreso
Objetivo: Documentar fases, epics, y estado actual del proyecto
Fecha actualización: 2026-03-27
```

# ROADMAP - THYROX

## Propósito

Plan maestro del proyecto THYROX. Fuente única de verdad para el estado del trabajo.

---

## Convenciones

- `[ ]` = Pendiente
- `[-]` = En Progreso
- `[x]` = Completado (YYYY-MM-DD)

---

## FASE 1: Framework Base (v0.1.0)

### Estructura del proyecto

- [x] Crear estructura de directorios (2026-03-25)
- [x] Inicializar repositorio Git (2026-03-25)
- [x] Crear README.md, ROADMAP.md, CHANGELOG.md (2026-03-25)
- [x] Crear ARCHITECTURE.md, CONTRIBUTING.md (2026-03-25)
- [x] Crear docs/API.md, docs/BUILD.md (2026-03-25)
- [x] Crear api/README.md, build/README.md (2026-03-25)

### Skill pm-thyrox

- [x] SKILL.md con 7 fases SDLC (2026-03-25)
- [x] 20 references de documentación por fase (2026-03-25)
- [x] 30 assets/templates para output (2026-03-25)
- [x] ADRs iniciales (9 decisiones documentadas) (2026-03-25)

---

## FASE 2: Consolidación y Coherencia (v0.2.0) — Sesión 2026-03-27

### Limpieza de contenido

- [x] Eliminar referencias arc42 — 85 ocurrencias en 16 archivos (2026-03-27)
- [x] Convertir backtick refs a markdown links — 37 refs en 8 archivos (2026-03-27)
- [x] Limpiar .md del texto visible de links — 63 links en 19 archivos (2026-03-27)

### Unificación de fases

- [x] Análisis de coherencia del proyecto completo (2026-03-27)
- [x] Análisis detallado de 20 references (2026-03-27)
- [x] Unificar orden de fases: ANALYZE primero en todos los archivos (2026-03-27)
- [x] Corregir numeración en SKILL.md tabla, exit conditions, project-state.md (2026-03-27)
- [x] Corregir phase headers en solution-strategy, spec-driven-dev, incremental-correction, context (2026-03-27)
- [x] Eliminar residuos de renombrado (requirements.md, requirements.md.template) (2026-03-27)

### Integración y flujo

- [x] Integrar use-cases.md al flujo de Phase 1 (8 subsecciones) (2026-03-27)
- [x] Actualizar metadata genéricos Anthropic: ADT → THYROX (2026-03-27)
- [x] Conectar CLAUDE.md y README.md al SKILL (jerarquía SKILL > CLAUDE > README) (2026-03-27)
- [x] Corregir links rotos en decisions.md y docs/BUILD.md (2026-03-27)

### Reorganización según anatomía oficial

- [x] templates/ → assets/ (30 archivos) (2026-03-27)
- [x] Crear scripts/ en pm-thyrox (mover scripts desde raíz y utils) (2026-03-27)
- [x] tracking/ → assets/ (AD_HOC_TASKS, REFACTORS como .template) (2026-03-27)
- [x] Mover epic example y templates sueltos a assets/ (2026-03-27)
- [x] Eliminar utils/ (reportes obsoletos), START-HERE.md (2026-03-27)
- [x] Mover validation guide a references/reference-validation.md (2026-03-27)

### Scripts con responsabilidad única

- [x] detect/convert/validate para md-links (3 scripts Bash) (2026-03-27)
- [x] detect/convert/validate para broken-references (3 scripts Python) (2026-03-27)

### Estructura context/

- [x] Crear context/analysis/ y mover análisis existentes (2026-03-27)
- [x] Crear context/epics/ para trabajo planificado (2026-03-27)
- [x] Documentar "Where Outputs Live" por fase en SKILL.md (2026-03-27)
- [x] Agregar `<br>` consistentes en metadata blocks (2026-03-27)

### Documentación Phase 1-2

- [x] Phase 1: ANALYZE — 8 documentos completos (2026-03-27)
- [x] Phase 2: SOLUTION_STRATEGY — solution-strategy.md (2026-03-27)
- [x] Phase 3: PLAN — ROADMAP.md reescrito (2026-03-27)

---

## FASE 3: Completar documentación del framework

### SKILL.md optimización

- [x] Reducir SKILL.md a <500 líneas — 1084 → 246 (2026-03-27)
- [x] Mover contenido extenso a references/scalability.md (2026-03-27)

### Documentación pública

- [x] Reescribir ARCHITECTURE.md reflejando estado real (2026-03-27)
- [x] Reescribir CONTRIBUTING.md con flujo actualizado (2026-03-27)
- [x] Actualizar CHANGELOG.md con trabajo real v0.1.0 y v0.2.0 (2026-03-27)

### Covariancia — Consistencia entre archivos

- [x] Análisis de covariancia: 5 leyes verificadas en 9 archivos (2026-03-28)
- [x] Solution strategy: fuente canónica + referencia (2026-03-28)
- [x] LAW 4: Jerarquía — Level 1/2/3 en SKILL, CLAUDE, README (2026-03-28)
- [x] LAW 2: Estructura — scripts/ en SKILL.md, prds/ eliminado de CLAUDE.md (2026-03-28)
- [x] LAW 3: Naming — convenciones explícitas en SKILL.md (2026-03-28)
- [x] LAW 2: conventions.md — estructura actualizada (2026-03-28)
- [x] Verificación: 5 leyes invariantes confirmadas por grep (2026-03-28)

### Validación final

- [x] Ejecutar detect_broken_references.py — 0 links rotos en core (422 son menciones textuales/documentales) (2026-03-28)
- [x] Ejecutar validate-missing-md-links.sh — 134 backtick refs en análisis, core files OK (2026-03-28)
- [x] Verificar covariancia: 5 leyes, 1 gap corregido (assets/ en SKILL.md) (2026-03-28)

### Tracking de errores

- [x] ERR-001: Análisis no documentado en context/analysis/ (2026-03-28)
- [x] ERR-002: Clasificación incorrecta de tamaño del proyecto (2026-03-28)
- [x] ERR-006: Saltar fases de nuevo — reincidencia de ERR-002 (2026-03-28)

---

## FASE 3b: Adopción de conceptos spec-kit

**Epic:** context/analysis/spec-kit-adoption-solution-strategy.md

### Nuevos templates

- [x] Crear `assets/spec-quality-checklist.md.template` (ERR-003) (2026-03-28)
- [x] Crear `assets/constitution.md.template` (ERR-004) (2026-03-28)

### Mejorar artefactos existentes

- [x] `assets/EXIT_CONDITIONS.md.template` — gates mandatorios + constitution check (ERR-008) (2026-03-28)
- [x] `references/solution-strategy.md` — Research Step explícito (ERR-006) (2026-03-28)
- [x] `references/conventions.md` — convención ROADMAP → epic link (ERR-007) (2026-03-28)
- [x] `SKILL.md` — constitution y checklist en flujo de fases (ERR-003, ERR-004) (2026-03-28)

### Enriquecer fases con pasos ejecutables

- [x] Phase 3 (PLAN): pasos numerados en SKILL.md (ERR-005) (2026-03-28)
- [x] Phase 5 (DECOMPOSE): pasos numerados en SKILL.md (ERR-005) (2026-03-28)
- [x] Phase 6 (EXECUTE): pasos numerados en SKILL.md (ERR-005) (2026-03-28)

### Tracking de errores (spec-kit adoption)

- [x] ERR-003: Sin validación de specs → checklist template creado (2026-03-28)
- [x] ERR-004: Sin constitution → constitution template creado (2026-03-28)
- [x] ERR-005: Fases no ejecutables → pasos numerados en SKILL.md (2026-03-28)
- [x] ERR-006: Saltar fases de nuevo → documentado como reincidencia (2026-03-28)
- [x] ERR-007: ROADMAP sin links a epics → convención agregada (2026-03-28)
- [x] ERR-008: Exit conditions informativas → gates mandatorios (2026-03-28)

---

## FASE 3c: Adopción profunda de spec-kit (mecanismos de calidad)

**Epic:** context/analysis/spec-kit-deep-adoption-strategy.md

### Script nuevo

- [x] Crear `scripts/validate-phase-readiness.sh` — verifica artefactos por fase (D4) (2026-03-28)

### Mejorar templates existentes

- [x] `assets/tasks.md.template` — traceability T-NNN → R-N (D3) (2026-03-28)
- [x] `assets/spec-quality-checklist.md.template` — [NEEDS CLARIFICATION] check + [Spec §] refs (D1, D3) (2026-03-28)
- [x] `assets/EXIT_CONDITIONS.md.template` — double constitution check + markers gate (D2) (2026-03-28)

### Mejorar references

- [x] `references/conventions.md` — priority mapping + traceability IDs table (D5) (2026-03-28)

### SKILL.md updates

- [x] Phase 2: double constitution check pre + post design (D2) (2026-03-28)
- [x] Phase 4: zero [NEEDS CLARIFICATION] markers gate (D1) (2026-03-28)
- [x] Phase 5: task traceability T-NNN → R-N (D3) (2026-03-28)

### Tracking de errores (deep analysis)

- [x] ERR-012: No hay cadena input/output entre fases → validate-phase-readiness.sh (2026-03-28)
- [x] ERR-013: No hay [NEEDS CLARIFICATION] mechanism → checklist + convención (2026-03-28)
- [x] ERR-016: No hay double constitution check → pre + post design (2026-03-28)
- [x] ERR-017: No hay priority→phase mapping → convención documentada (2026-03-28)
- [x] ERR-018: No hay trazabilidad req→task→checklist → IDs en templates (2026-03-28)

---

## FASE 3d: Resolver riesgos de referencia (anti-patterns de 14 proyectos)

**Work package:** context/work/2026-03-28-15-51-08-reference-errors-analysis/
**Análisis:** 12 anti-patterns identificados, 6 riesgos activos, 4 requieren acción

### Enforcement ejecutable (AP-01 + AP-09)

- [x] Crear validate-session-close.sh (hard gate) (2026-03-28)
- [x] Documentar en SKILL.md cómo usar validate-phase-readiness.sh como gate soft (2026-03-28)

### Error-to-prevention feedback loop (AP-06)

- [x] Crear template ERR mejorado con campo "Prevención" obligatorio (2026-03-28)
- [x] Actualizar convenciones de error tracking en conventions.md (2026-03-28)

### Handoff humano persistente (AP-04)

- [x] Documentar convención: blockers en now.md + sección en focus.md (2026-03-28)

### Token efficiency (AP-10)

- [x] Crear scripts/project-status.sh — resumen <50 líneas del estado (2026-03-28)

### No requiere acción

- [x] AP-05: SKILL.md mezcla capas — 191 líneas es manejable, no separar (2026-03-28)

---

## FASE 4: Template listo para reutilización

### Generalización

- [x] Análisis de contenido THYROX-específico vs genérico (85-90% genérico) (2026-03-28)
- [x] Crear setup-template.sh — script interactivo de personalización (2026-03-28)
- [x] Actualizar README.md con Quick Start usando setup-template.sh (2026-03-28)
- [x] Testear copiando repo a directorio limpio y ejecutando script (2026-03-28)

### CI/CD

- [x] GitHub Actions workflow validate.yml (skill integrity + conventional commits) (2026-03-28)
- [x] Pre-commit hook commit-msg-hook.sh para conventional commits (2026-03-28)
- [x] Documentar setup de hooks en CONTRIBUTING.md (2026-03-28)
- [x] Automatización de changelog — excluido del template: depende del tipo de proyecto destino (2026-03-28)

---

## FASE 5: Compatibilidad multi-modelo (Haiku + activación automática)

**Work package:** context/work/2026-04-01-18-39-56-skill-activation-failure/

### Activación automática del SKILL (D1)

- [x] [T-001] CLAUDE.md — flujo de sesión obligatorio + Skill tool + fallback inline — 2026-04-01
- [x] [T-002] Crear session-start.sh — startup hook de sesión — 2026-04-01
- [x] [T-003] Configurar SessionStart hook en settings.json — 2026-04-01

### SKILL.md — gates Baja Libertad por fase (D2)

- [x] [T-004] Phase 1: 8 aspectos + decisión arquitectónica + REQUERIDO template + exit criteria — 2026-04-01
- [x] [T-005] Phase 2: PASO 0 REQUERIDO solution-strategy + Key Ideas desde analysis/ — 2026-04-01
- [x] [T-006] Phase 3: verificación WP explícita — 2026-04-01
- [x] [T-007] Phase 4: checklist REQUERIDO + exit criteria verificable — 2026-04-01
- [x] [T-008] Phase 5: WP activo = más reciente en context/work/ — 2026-04-01
- [x] [T-009] Phase 6: fuente de tareas + ERR-NNN con template + renumerar pasos — 2026-04-01
- [x] [T-010] Escalabilidad: tabla explícita tamaño → fases activas — 2026-04-01

### Verificación (no degradación)

- [x] [T-011] Re-ejecutar evals — 14/14 (100%) — 2026-04-01

### Deuda técnica

- [ ] [T-DT-001] examples.md — actualizar nomenclatura de fases (fuera de scope FASE 5)

---

## FASE 6: Integración de templates por fase (Reveal Intent + contrato fase→template→output)

**Work package:** context/work/2026-04-01-22-15-43-template-phase-integration/

### Templates faltantes (PM perspective)

- [x] lessons-learned.md.template — Phase 7 — 2026-04-01
- [x] changelog.md.template — Phase 7 — 2026-04-01
- [x] risk-register.md.template — Phase 1 — 2026-04-01

### SKILL.md — contrato fase→template→output

- [x] Referenciar templates existentes por fase (Phase 2, 4, 5, 6, 7) — 2026-04-01
- [x] Reveal Intent en output filenames: patrón {nombre-wp}-{tipo}.md — 2026-04-01
- [x] Detección de fases via glob *-{tipo}.md — 2026-04-01

### Templates — estandarización

- [x] Timestamps YYYY-MM-DD-HH-MM-SS en todos los templates (19 archivos) — 2026-04-01

### Formalización del patrón (D3 + D4)

- [x] [T-001] SKILL.md sección Naming — regla explícita del patrón {nombre-wp}-{tipo}.md (D3) — 2026-04-02
- [x] [T-002] SKILL.md — nota de compatibilidad WPs históricos (D4) — 2026-04-02

---

## Métricas de Progreso

```
FASE 1: Framework Base       — 100% ✓
FASE 2: Consolidación        — 100% ✓
FASE 3: Completar docs       — 100% ✓
FASE 3b: spec-kit adoption   — 100% ✓
FASE 3c: spec-kit deep       — 100% ✓
FASE 3d: Riesgos referencia  — 100% ✓
FASE 4: Template reutilizable — 100% ✓
FASE 5: Compatibilidad multi-modelo  — 0% [-]

Sesión 2026-03-27: ~30 cambios implementados, 20+ commits
Sesión 2026-03-28 (s2): SKILL.md rewrite + 54 evals + corrections
Sesión 2026-03-28 (s3): 5 corrections + reference errors analysis
```

---

**Última actualización:** 2026-03-28
