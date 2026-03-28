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
- [-] LAW 4: Jerarquía — agregar a SKILL.md, CLAUDE.md (en progreso)
- [ ] LAW 2: Estructura — agregar scripts/ a SKILL.md, eliminar prds/ de CLAUDE.md
- [ ] LAW 3: Naming — hacer explícitas convenciones en SKILL.md
- [ ] LAW 5: Outputs — clarificar analysis/ y work-logs/ en SKILL.md
- [ ] LAW 2: conventions.md — actualizar estructura completa

### Validación final

- [ ] Ejecutar detect_broken_references.py y corregir
- [ ] Ejecutar validate-missing-md-links.sh → exit 0
- [ ] Verificar covariancia: las 5 leyes invariantes en los 9 archivos

### Tracking de errores

- [x] ERR-001: Análisis no documentado en context/analysis/ (2026-03-28)
- [x] ERR-002: Clasificación incorrecta de tamaño del proyecto (2026-03-28)

---

## FASE 4: Template listo para reutilización (futuro)

### Generalización

- [ ] Limpiar contenido específico de THYROX para hacerlo template genérico
- [ ] Crear guía de "cómo usar este template para tu proyecto"
- [ ] Testear copiando pm-thyrox/ a un proyecto nuevo

### CI/CD

- [ ] GitHub Actions con validate-* scripts
- [ ] Pre-commit hooks para conventional commits
- [ ] Automatización de changelog

---

## Métricas de Progreso

```
FASE 1: Framework Base       — 100% ✓
FASE 2: Consolidación        — 100% ✓
FASE 3: Completar docs       —   0%
FASE 4: Template reutilizable —   0%

Sesión 2026-03-27: ~30 cambios implementados, 20+ commits
```

---

**Última actualización:** 2026-03-27
