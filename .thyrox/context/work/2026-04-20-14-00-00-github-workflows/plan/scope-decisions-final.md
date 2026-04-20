```yml
created_at: 2026-04-20 22:00:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 6 — SCOPE (DECISIONES FINALES)
author: NestorMonroy
status: Aprobado
```

# Decisiones Finales — Workflows para feature → develop

## Separación de Responsabilidades

### .github/workflows/ — Validación a Nivel de Repositorio

**Propósito:** Validar integridad del repositorio en PRs de feature → develop

**3 Workflows Implementados:**

1. **test-markdown-links.yml**
   - Detecta links rotos en documentación
   - Reutiliza: detect-missing-md-links.sh
   - Bloqueador: SÍ (PR no se puede mergear si hay links rotos)

2. **validate-references.yml**
   - Valida que archivos referenciados en código existan
   - Lógica nueva (verificar existence de archivos mencionados)
   - Bloqueador: SÍ

3. **detect-secrets.yml**
   - Detecta secretos committeados (API keys, tokens, credenciales)
   - Herramientas: git-secrets, truffleHog, o pattern matching
   - Bloqueador: SÍ

**Scope:** feature → develop (solo en PRs)

---

### Sistema Agentic AI — Validación del Sistema

**Propósito:** Validar integridad INTERNA del framework THYROX

**Responsabilidades (NO en .github/workflows):**

1. **Validación de YAML**
   - Claude Code skills: `name:`, `description:`, `allowed-tools:`, `updated_at:`
   - THYROX internos: `Tipo:`, `Categoría:`, `Versión:`, `Propósito:`, `Fecha actualización:`
   - Depende: hooks PreToolUse (validate-commit-message.sh, etc.)
   - Dónde: `.claude/scripts/` (local hooks, no GitHub workflows)

2. **Validación de Metadatos en WP Artifacts**
   - Verifica `created_at`, `project`, `author`, `status` en archivos `.thyrox/context/work/`
   - Depende: templates específicos por fase (discover, analyze, plan, etc.)
   - Dónde: Sistema Agentic AI / hooks locales

3. **Validación de Estructura**
   - Detecta violaciones: `.claude/context/` vs `.thyrox/context/` (WP-ERR-001)
   - Detecta archivos backup: `.bak`, `-old`, `-v2` (viola I-002)
   - Dónde: Hooks PreToolUse / PostToolUse en Claude Code

4. **Auditoría de Contexto (context-audit.sh)**
   - Verifica que WPs no excedan presupuesto de tokens
   - Es diagnóstico interno, NO bloqueador de PR
   - Dónde: `.claude/scripts/` (ejecutado en sesión, no en GitHub)

---

## Protocolo para Errores en Scripts Existentes

### Si se encuentran bugs durante implementación:

1. **Errores triviales** (typos, lógica simple):
   - Arreglar en-place en `.claude/scripts/`
   - Crear commit de fix
   - Documentar en `.thyrox/context/errors/script-bugs-found.md`

2. **Errores complejos** (requieren refactoring):
   - Documentar el bug
   - Continuar WP sin fix
   - Defer a technical-debt.md

3. **Errores high-impact** (afectan múltiples workflows):
   - Arreglar en-place
   - Documentar cambio

---

## Matriz de Validaciones

| Validación | .github/workflows | Sistema Agentic AI | Branch |
|---|---|---|---|
| Links rotos (test-markdown-links) | SÍ bloqueador | — | feature → develop |
| Referencias a archivos (validate-references) | SÍ bloqueador | — | feature → develop |
| Secretos committeados (detect-secrets) | SÍ bloqueador | — | feature → develop |
| YAML sintaxis | — | SÍ (hooks locales) | Sessions |
| Metadatos en WP artifacts | — | SÍ (hooks locales) | Sessions |
| Estructura .claude/ vs .thyrox/ | — | SÍ (hooks locales) | Sessions |
| Context audit (tokens) | — | SÍ (diagnóstico) | Sessions |
| Commits convencionales | — | SÍ (hook local) | Sessions |
| Archivos backup (.bak, -v2) | — | SÍ (detect) | Sessions |

---

## Scope Final de ESTE WP

**IN-SCOPE (21 componentes):**
- 3 directorios scaffolding (ISSUE_TEMPLATE, actions, scripts)
- 3 archivos de templates de issue
- 3 GitHub Actions (stubs)
- 3 directorios de scripts (estructurados, sin lógica)
- 3 archivos de config (.github/)
- 3 workflows para feature → develop (test-markdown-links, validate-references, detect-secrets)

**OUT-OF-SCOPE (Sistema Agentic AI):**
- Validación YAML
- Metadatos WP
- Estructura interna
- Context audit
- Commits convencionales
- Archivos backup

---

## Estado: Scope Aprobado

- [x] Scope aprobado por usuario — 2026-04-20
- [x] Decisiones finales documentadas
- [x] Separación de responsabilidades clara
- [x] Protocolo para errores definido

Listo para: Phase 7 DESIGN/SPECIFY

