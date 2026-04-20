```yml
created_at: 2026-04-20 21:30:00
wp: 2026-04-20-14-00-00-github-workflows
phase: Phase 6 — SCOPE
status: Pendiente aprobación
```

# Plan — Crear Infraestructura Modular de .github/

## Scope Statement

**Problema:** THYROX carece de estructura modular en `.github/` — solo existe `.github/workflows/validate.yml` (70 líneas). Faltan 14+ componentes de infraestructura (issue templates, actions reutilizables, scripts, configuración) que son estándar en proyectos maduros.

**Usuarios:** 
- Desarrolladores que crean issues: necesitan templates para estruturar problemas
- Mantenedores de CI/CD: necesitan acciones reutilizables y scripts de utilidad
- Equipos que hacen releases: necesitan configuración de dependabot y releases automáticas
- Reviewers de PRs: necesitan template de PR para contexto claro

**Criterios de éxito:**
- ✓ Estructura de `.github/` alcanza 50%+ de cobertura (de 14+ a 7+)
- ✓ 3 directorios creados: ISSUE_TEMPLATE, actions, scripts
- ✓ 6 archivos de configuración creados: templates, action.ymls, PR template, dependabot.yml, release.yml
- ✓ Scripts tienen estructura clara (directorios, nombres coherentes)
- ✓ Cada componente tiene descripción de propósito (comentarios/README)

---

## In-Scope

**Total:** 13 items de scaffolding (estructura + templates básicos, sin lógica completa)

### Directorios (3)
- [ ] `.github/ISSUE_TEMPLATE/` — Templates de issues
- [ ] `.github/actions/` — Acciones reutilizables
- [ ] `.github/scripts/` — Scripts de utilidad

### Issue Templates (3 archivos)
- [ ] `ISSUE_TEMPLATE/bug.yml` — Template para reportar bugs
- [ ] `ISSUE_TEMPLATE/enhancement.yml` — Template para feature requests
- [ ] `ISSUE_TEMPLATE/config.yml` — Configuración de templates

### GitHub Actions (3 archivos)
- [ ] `actions/run-claude/action.yml` — Stub para ejecutar análisis con Claude
- [ ] `actions/run-pytest/action.yml` — Stub para ejecutar tests
- [ ] `actions/setup-uv/action.yml` — Stub para setup de ambiente

### Support Scripts Directories (3)
- [ ] `scripts/mention/` — Scripts para menciones en reviews
- [ ] `scripts/pr-review/` — Scripts para automatizar revisión de PRs
- [ ] `scripts/workflows/` — Scripts de utilidad para workflows

### Config Files (3)
- [ ] `.github/pull_request_template.md` — Template de PR
- [ ] `.github/dependabot.yml` — Configuración de actualizaciones de deps
- [ ] `.github/release.yml` — Configuración de releases automáticas

---

## Out-of-Scope

| Excluido | Razón |
|---|---|
| Implementación de lógica en GitHub Actions | Trabajo mecánico — las acciones son stubs, se implementan en futuro WP |
| Scripts funcionales (mention, pr-review) | Los directorios se crean pero scripts están vacíos/documentados |
| Workflows adicionales en `.github/workflows/` | Solo mantener y documentar `validate.yml` existente |
| Validación de WP artifacts en CI | Diferido: problemas P-1 a P-10 van a futuro WP |
| Integración con herramientas externas | Ej: Slack, Discord, servicios — fuera de alcance |
| Automatización de issue triage (bots) | Ej: marvin-*, auto-close-* — futuro WP |
| Documentación completa de cada componente | Crear comentarios de propósito, no documentación extensiva |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas | Esfuerzo |
|---|---|---|
| Crear directorios (3) | 3 | 1 tarea |
| Issue templates (3) | 3 | 2 tareas |
| GitHub Actions (3 stubs) | 3 | 2 tareas |
| Scripts directories (3) | 3 | 2 tareas |
| Config files (3) | 3 | 2 tareas |
| Documentación + commits | — | 1 tarea |
| **Total** | **18 componentes** | **10 tareas** |

**Clasificación:** Pequeño (10 tareas, work estructurado)
**Fases activas:** 1 (DISCOVER) + 6 (SCOPE) + 8 (PLAN EXECUTION)

---

## Validación pre-gate

- ✓ DISCOVER completado: `discover/project-validation-gaps.md`, `discover/github-infrastructure-analysis.md`, `discover/exit-conditions.md`
- ✓ Scope refleja gaps identificados: 13 items mapean a 8 problemas (G-1 a G-8)
- ✓ IN-SCOPE vs OUT-OF-SCOPE claro: no hay ambigüedad
- ✓ Este plan.md existe y está bien-formado

---

## Link ROADMAP

Ver tracking: [ROADMAP.md](../../../../../ROADMAP.md)

---

## Estado de aprobación

- [ ] Scope aprobado por usuario — PENDIENTE

Esperando confirmación de scope statement + in-scope + out-of-scope antes de pasar a Phase 7 (DESIGN/SPECIFY).

