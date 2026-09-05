```yml
created_at: 2026-04-20 21:00:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
```

# .github/ Infrastructure — Estado Actual vs Referencia

## Estructura Actual (THYROX)

```
.github/
└── workflows/
    └── validate.yml  (70 líneas)
```

**Total:** 1 archivo de configuración

---

## Estructura de Referencia

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug.yml
│   ├── config.yml
│   └── enhancement.yml
├── actions/
│   ├── run-claude/
│   │   └── action.yml
│   ├── run-pytest/
│   │   └── action.yml
│   └── setup-uv/
│       └── action.yml
├── scripts/
│   ├── mention/
│   │   ├── gh-get-review-threads.sh
│   │   └── gh-resolve-review-thread.sh
│   ├── pr-review/
│   │   ├── pr-comment.sh
│   │   ├── pr-diff.sh
│   │   ├── pr-existing-comments.sh
│   │   ├── pr-remove-comment.sh
│   │   └── pr-review.sh
│   └── workflows/
│       ├── auto-close-duplicates.yml
│       ├── auto-close-needs-mre.yml
│       ├── martian-test-failure.yml
│       ├── martian-triage-issue.yml
│       ├── marvin-comment-on-issue.yml
│       ├── marvin-comment-on-pr.yml
│       ├── marvin-dedupe-issues.yml
│       ├── marvin-label-triage.yml
│       ├── minimize-resolved-reviews.yml
│       ├── publish.yml
│       ├── run-schema-crash-test.yml
│       ├── run-static.yml
│       ├── run-tests.yml
│       ├── run-upgrade-checks.yml
│       ├── update-config-schema.yml
│       └── update-sdk-docs.yml
├── workflows/
│   └── ... (workflows principales)
├── dependabot.yml
├── pull_request_template.md
└── release.yml
```

**Total:** 3 directorios + 6 archivos raíz = estructura modular completa

---

## Mapping: Actual vs Referencia

| Componente | THYROX | Referencia | Estado |
|-----------|--------|-----------|--------|
| **ISSUE_TEMPLATE/** | ❌ No existe | 3 templates | FALTA |
| **actions/** | ❌ No existe | 3 acciones reutilizables | FALTA |
| **scripts/** | ❌ No existe | 12 scripts de utilidad | FALTA |
| **workflows/** | ✓ Existe | 1+ workflows | MINIMAL |
| **dependabot.yml** | ❌ No existe | Configuración de deps | FALTA |
| **pull_request_template.md** | ❌ No existe | Template de PR | FALTA |
| **release.yml** | ❌ No existe | Config de releases | FALTA |

**Cobertura:** 1/7 = 14% de infraestructura implementada

---

## Problemas Específicos de .github/

### G-1: ISSUE_TEMPLATE Missing

**Lo que falta:**
- `bug.yml` — No hay template para reportar bugs
- `enhancement.yml` — No hay template para feature requests
- `config.yml` — No hay configuración de plantillas

**Impacto:**
- Issues sin estructura → análisis difícil
- Información crítica faltante (reproducción, env, versión)
- No hay estandarización en reporte de problemas

---

### G-2: GitHub Actions Not Defined

**Lo que falta:**
- `.github/actions/run-claude/` — Acción para ejecutar análisis con Claude
- `.github/actions/run-pytest/` — Acción para ejecutar tests
- `.github/actions/setup-uv/` — Acción para setup de ambiente

**Impacto:**
- Workflows repetitivos sin reutilización
- Setup de ambiente no estandarizado
- No hay abstracción de herramientas

---

### G-3: Support Scripts Missing

**Lo que falta:**
- `.github/scripts/mention/` — Scripts para menciones en reviews
- `.github/scripts/pr-review/` — Scripts para automatizar revisión de PRs
- `.github/scripts/workflows/` — Scripts de utilidad para workflows

**Impacto:**
- PR review manual y propenso a errores
- No hay automatización de tareas rutinarias
- Scripts esparcidos o no reutilizables

---

### G-4: Workflows Incomplete

**Lo que existe:**
- `validate.yml` (70 líneas) — Solo validación de skill mapping

**Lo que falta:**
- `run-tests.yml` — CI para ejecutar tests
- `run-static.yml` — Linting, format checking
- `publish.yml` — Release automation
- `auto-close-*.yml` — Automatización de issues
- `marvin-*.yml` — Bots de IA para triage
- `run-upgrade-checks.yml` — Compatibilidad de deps

**Impacto:**
- No hay CI completo en push/PR
- Releases manuales y propensos a error
- Sin automatización de issue triage

---

### G-5: Dependabot Not Configured

**Lo que falta:**
- `dependabot.yml` — Configuración de actualizaciones automáticas

**Impacto:**
- Dependencies desactualizadas
- Security vulnerabilities sin parchar automáticamente
- Merge de PRs de deps manual

---

### G-6: Pull Request Template Missing

**Lo que falta:**
- `.github/pull_request_template.md` — Estructura de PR

**Impacto:**
- PRs sin descripción clara
- Información contextual faltante
- Reviewers sin guía de qué buscar

---

### G-7: Release Automation Missing

**Lo que falta:**
- `.github/release.yml` — Configuración de releases

**Impacto:**
- Releases manuales (propenso a error)
- Changelog no generado automáticamente
- Assets no se publican automáticamente

---

### G-8: Workflow Validation Incomplete

**Estado actual:** `validate.yml` valida:
- ✓ Conventional commits
- ✓ SKILL.md structure
- ❌ **No valida:** WP artifacts (P-1 to P-10 del documento anterior)

**Impacto:**
- validate.yml solo cubre skill, no WP validation
- Errores en WPs no detectados en CI

---

## Resumen: Brecha de Infraestructura

| Área | Actual | Referencia | Brecha | Criticidad |
|------|--------|-----------|--------|-----------|
| ISSUE_TEMPLATE | 0 | 3 | 3 | MEDIA |
| GitHub Actions | 0 | 3 | 3 | ALTA |
| Scripts | 0 | 12 | 12 | MEDIA |
| Workflows | 1 | 15+ | 14+ | ALTA |
| Config (dependabot, release) | 0 | 2 | 2 | MEDIA |
| PR Template | 0 | 1 | 1 | BAJA |

**Total:** 14+ componentes faltantes

---

## Decisión de Scope para Este WP

**Pregunta clave:** ¿Qué implementar en ESTE WP?

### Opción A: Crítica Only (WP scope = P-1+P-2 del primer análisis)

Implementar SOLO validación de WP artifacts en CI:
- Extender `validate.yml` con P-1 (WP structure) + P-2 (Evidence classification)
- Git hook para validar antes de commit
- Resultado: Prevenir WP-ERR-001 en futuro

**Ventaja:** Rápido, soluciona problema inmediato
**Desventaja:** Deja infraestructura de `.github/` incompleta

### Opción B: Scaffolding (Crear estructura de `.github/`)

Crear directorios y templates:
- `.github/ISSUE_TEMPLATE/` con templates
- `.github/actions/` con stubs
- `.github/scripts/` con scaffolding
- `.github/pull_request_template.md`
- `.github/dependabot.yml`
- `.github/release.yml`

Sin implementar lógica completa — solo estructuración.

**Ventaja:** Establece arquitectura para futuros WPs
**Desventaja:** No es "completo" en este WP

### Opción C: Mínimo Viable (A + estructura)

Implementar A (validación WP) + crear directorios/templates en B
Resultado: WP artifacts validados + infraestructura lista para extensión

---

## Próximos Pasos

Esperar definición de scope para decidir:
1. ¿Cuáles componentes de `.github/` se crean?
2. ¿Qué validación se implementa en CI?
3. ¿Qué va a futuro WPs?

