```yml
created_at: 2026-04-20 21:30:00
wp: 2026-04-20-14-00-00-github-workflows
phase: Phase 6 — SCOPE
status: Aprobado — 2026-04-20
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

**Total:** 18 items (estructura + templates + workflows que reutilizan scripts existentes)

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

### Workflows para feature → develop (3 archivos)

Validación a nivel de REPOSITORIO — NO del Sistema Agentic AI

- [ ] `workflows/test-markdown-links.yml` — Detectar links rotos en documentación (reutilizar detect-missing-md-links.sh)
- [ ] `workflows/validate-references.yml` — Validar referencias a archivos no existentes
- [ ] `workflows/detect-secrets.yml` — Detectar secretos committeados (API keys, tokens, credenciales)

---

## Out-of-Scope

| Excluido | Razón | Responsable |
|---|---|---|
| Validación de YAML sintaxis | Diferentes formatos: Claude Code skills vs THYROX internos | Sistema Agentic AI |
| Validación de metadatos completos en WP artifacts | Requiere conocimiento de templates por tipo de archivo | Sistema Agentic AI |
| Validación de estructura interna (.claude/ vs .thyrox/) | Depende de convenciones del sistema THYROX | Sistema Agentic AI |
| Implementación de lógica en GitHub Actions | Acciones son stubs, se implementan en futuro WP | Futuro WP |
| Scripts funcionales (mention, pr-review) | Los directorios se crean pero scripts están vacíos/documentados | Futuro WP |
| Workflows complejos (develop → main) | main es producción, no en scope actual | Futuro WP |
| Tests de funcionalidad (pytest, testing) | Se comienza con validaciones de repo, no lógica | Futuro WP |
| Integración con servicios externos | Ej: Slack, Discord — fuera de alcance | Out of scope |
| Automatización de issue triage (bots) | Ej: marvin-*, auto-close-* — futuro WP | Futuro WP |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas | Esfuerzo |
|---|---|---|
| Crear directorios (3) | 3 | 1 tarea |
| Issue templates (3) | 3 | 2 tareas |
| GitHub Actions (3 stubs) | 3 | 2 tareas |
| Scripts directories (3) | 3 | 2 tareas |
| Config files (3) | 3 | 2 tareas |
| Workflows para feature → develop (3) | 3 | 2 tareas |
| Documentación + commits | — | 1 tarea |
| **Total** | **21 componentes** | **12 tareas** |

**Clasificación:** Pequeño (12 tareas, work estructurado + reutilización de scripts)
**Fases activas:** 1 (DISCOVER) + 6 (SCOPE) + 7 (DESIGN) + 8 (PLAN EXECUTION)

**Dependencias:**
- test-markdown-links.yml reutiliza detect-missing-md-links.sh
- detect-secrets.yml puede usar herramientas estándar (git secrets, truffleHog, etc.)
- validate-references.yml es logic nueva (verificar archivos referenced existen)

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

- [x] Scope aprobado por usuario — 2026-04-20
- [x] Decisiones finales documentadas en scope-decisions-final.md
- [x] Separación de responsabilidades clara

Listo para: Phase 7 DESIGN/SPECIFY

