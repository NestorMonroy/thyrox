```yml
created_at: 2026-04-20 21:15:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 1 — DISCOVER (EXIT CONDITIONS)
author: NestorMonroy
status: Borrador
```

# WP Exit Conditions — github-workflows

## Scope Decidido: B) Scaffolding

**Objetivo:** Crear estructura modular de `.github/` con templates y stubs — sin implementar lógica completa.

---

## IN-SCOPE: Lo que se implementa en ESTE WP

### Directorios a crear:
```
.github/
├── ISSUE_TEMPLATE/
├── actions/
├── scripts/
└── workflows/  (ya existe)
```

### Componentes a crear:

#### 1. Issue Templates (`.github/ISSUE_TEMPLATE/`)
- [ ] `bug.yml` — Template para reportar bugs
- [ ] `enhancement.yml` — Template para feature requests
- [ ] `config.yml` — Configuración de templates

#### 2. GitHub Actions (`.github/actions/`)
- [ ] `run-claude/action.yml` — Stub para ejecutar análisis con Claude
- [ ] `run-pytest/action.yml` — Stub para ejecutar tests
- [ ] `setup-uv/action.yml` — Stub para setup de ambiente

#### 3. Support Scripts (`.github/scripts/`)
- [ ] `mention/` — Scripts para menciones en reviews
- [ ] `pr-review/` — Scripts para automatizar revisión de PRs
- [ ] `workflows/` — Scripts de utilidad para workflows

#### 4. Configuration Files (raíz de `.github/`)
- [ ] `.github/pull_request_template.md` — Template de PR
- [ ] `.github/dependabot.yml` — Configuración de dependencias
- [ ] `.github/release.yml` — Configuración de releases

#### 5. Workflows Enhancement
- [ ] Documentar estructura esperada de futuros workflows
- [ ] NO implementar nuevos workflows en este WP

---

## OUT-OF-SCOPE: Lo que NO se hace en ESTE WP

### Problemas documentados pero DIFERIDO:

**De project-validation-gaps.md:**
- P-1: WP structure validation (→ futuro WP)
- P-2: Evidence classification enforcement (→ futuro WP)
- P-3 a P-10: Validación de metadatos, ADRs, referencias (→ futuro WP)

**De github-infrastructure-analysis.md:**
- G-4 (Workflows implementation) → Múltiples workflows en futuro WPs
- Lógica completa de issues, actions, scripts → Futuros WPs

**Decisión:** Crear estructura, NO implementar lógica de validación en CI.

---

## Exit Criteria (Self-Validating)

Gate para aprobación de Phase 1 DISCOVER → Phase 2+ (MEASURE/PLAN):

```bash
# Verificable con bash
✓ Directorio .github/ISSUE_TEMPLATE/ existe AND contiene 3 .yml files
✓ Directorio .github/actions/ existe AND contiene 3 subdirectories (run-claude, run-pytest, setup-uv)
✓ Directorio .github/scripts/ existe AND contiene 3 subdirectories (mention, pr-review, workflows)
✓ Archivo .github/pull_request_template.md existe AND > 50 lines
✓ Archivo .github/dependabot.yml existe AND > 10 lines
✓ Archivo .github/release.yml existe AND > 10 lines
✓ Documento exit-conditions.md ESTE DOCUMENTO existe con status='Aprobado'
```

---

## Próxima Fase

DISCOVER completado con:
- ✓ 2 análisis de gaps (project-validation-gaps.md + github-infrastructure-analysis.md)
- ✓ Scope decidido (Scaffolding)
- ✓ IN-SCOPE definido (estructura + templates)
- ✓ OUT-OF-SCOPE documentado (validación → futuro)

**Siguiente:** Pasar a Phase 6 PLAN (o equivalente) para crear task-plan.md con tareas específicas de scaffolding.

