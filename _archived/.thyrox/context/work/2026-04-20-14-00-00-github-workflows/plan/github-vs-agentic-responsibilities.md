```yml
created_at: 2026-04-20 22:15:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 6 — SCOPE (REFERENCIA)
author: NestorMonroy
status: Borrador
```

# Responsabilidades: .github/workflows vs Sistema Agentic AI

**Propósito:** Documento de referencia para aclarar qué valida cada sistema.

---

## Definiciones

### .github/workflows (GitHub Actions)

**Qué es:** Sistema de CI/CD de GitHub que ejecuta en el repositorio remoto cuando hay PRs/pushes.

**Cuándo ejecuta:** 
- En PRs (feature → develop)
- En pushes a ramas específicas
- Bajo demanda (manual trigger)

**Qué valida:** Integridad del REPOSITORIO (no del sistema interno)

**Duración:** ~1-5 minutos por workflow

**Acceso:** Lee el repo, genera reportes en comentarios de PR

---

### Sistema Agentic AI (Claude Code + Hooks)

**Qué es:** Sistema de validación INTERNO que ejecuta en sesiones de Claude Code (local).

**Cuándo ejecuta:** 
- PreToolUse hooks: antes de que Claude ejecute una herramienta
- PostToolUse hooks: después de ejecutar una herramienta
- Al inicio de sesión (SessionStart hooks)
- Al final de sesión (SessionClose hooks)
- Bajo demanda (usuario ejecuta script)

**Qué valida:** Integridad del framework THYROX (convenciones internas, WP artifacts, estructura)

**Duración:** Instantáneo (bloquea si falla)

**Acceso:** Lee .thyrox/, .claude/, valida commits en progreso

---

## Matriz de Responsabilidades

| Validación | .github/workflows | Sistema Agentic AI | Ubicación |
|---|---|---|---|
| **REPOSITORIO** | | | |
| Links rotos en .md | SÍ | — | test-markdown-links.yml |
| Archivos referenciados existen | SÍ | — | validate-references.yml |
| Secretos (API keys, tokens) | SÍ | — | detect-secrets.yml |
| Binarios grandes | NO | — | N/A |
| | | | |
| **FRAMEWORK THYROX** | | | |
| YAML sintaxis válida | — | SÍ | .claude/scripts/ (hook) |
| Metadatos completos en WP | — | SÍ | .claude/scripts/ (hook) |
| Estructura .claude/ vs .thyrox/ | — | SÍ | .claude/scripts/ (hook) |
| Archivos backup (.bak, -v2) | — | SÍ | .claude/scripts/ (hook) |
| Commits convencionales | — | SÍ | .claude/scripts/ (hook) |
| Context budget (tokens) | — | SÍ (diagnóstico) | .claude/scripts/ |
| | | | |
| **AMBOS (diferentes contextos)** | | | |
| Referencias a archivos | SÍ (repo level) | SÍ (WP level) | test-markdown-links.yml + hook |
| Documentación | SÍ (links rotos) | SÍ (metadatos) | multiple |

---

## Ejemplos Concretos

### Ejemplo 1: Link Roto en ROADMAP.md

**Escenario:** Usuario crea PR con ROADMAP.md que referencia `plan/nonexistent.md`

**Validación en .github/workflows:**
```yaml
test-markdown-links.yml ejecuta:
  detect-missing-md-links.sh
  Encuentra: [link](plan/nonexistent.md) en ROADMAP.md
  Resultado: FALLA
  PR se bloquea: "Links rotos detectados"
```

**Validación en Sistema Agentic AI:**
- NO aplica (ROADMAP.md es documentación del repo, no un WP artifact)

**Conclusión:** Solo .github/workflows lo detecta

---

### Ejemplo 2: Metadatos Incompletos en WP Artifact

**Escenario:** Usuario crea `.thyrox/context/work/2026-04-20-.../discover/analysis.md` sin `created_at` en frontmatter

**Validación en .github/workflows:**
- NO aplica (no es validación de repo)

**Validación en Sistema Agentic AI:**
```bash
PreToolUse hook intercepta: git commit
  Verifica: archivos en .thyrox/context/work/*/
  Valida metadata según template
  Encuentra: falta created_at
  Resultado: BLOQUEA commit
  Mensaje: "WP artifact: metadata incompleta. Agregá created_at"
```

**Conclusión:** Solo Sistema Agentic AI lo detecta

---

### Ejemplo 3: Secreto Committeado

**Escenario:** Usuario accidentalmente committe `AWS_SECRET_KEY=xxx` en archivo

**Validación en .github/workflows:**
```yaml
detect-secrets.yml ejecuta:
  git-secrets / truffleHog
  Encuentra: AWS_SECRET_KEY
  Resultado: FALLA
  PR se bloquea: "Secretos detectados"
```

**Validación en Sistema Agentic AI:**
```bash
PreToolUse hook intercepta: git commit
  Valida: no hay secretos en diff
  Encuentra: AWS_SECRET_KEY
  Resultado: BLOQUEA commit
  Mensaje: "Secreto detectado. No pushear."
```

**Conclusión:** AMBOS lo detectan (defensa en profundidad)
- Hook local: defensa local (rápida)
- GitHub workflow: defensa remota (si el hook falló)

---

### Ejemplo 4: Archivo Backup No Debería Existir

**Escenario:** Usuario accidentalmente committe `ROADMAP.md.bak` (viola I-002)

**Validación en .github/workflows:**
- NO aplica (es una convención interna de desarrollo, no del repo)

**Validación en Sistema Agentic AI:**
```bash
PreToolUse hook intercepta: git commit
  Verifica: archivos con sufijo .bak, -old, -v2
  Encuentra: ROADMAP.md.bak
  Resultado: BLOQUEA commit
  Mensaje: "Archivo backup encontrado. Usar git history, no archivos .bak (I-002)"
```

**Conclusión:** Solo Sistema Agentic AI lo detecta

---

### Ejemplo 5: Commits No Convencionales

**Escenario:** Usuario hace `git commit -m "updated stuff"`

**Validación en .github/workflows:**
- NO aplica en PRs (el commit ya está en el branch)
- GitHub Actions puede REPORTAR pero no bloquea el commit inicial

**Validación en Sistema Agentic AI:**
```bash
PreToolUse hook intercepta: git commit
  Valida: Conventional Commits format
  Encuentra: "updated stuff" (no es feat/fix/docs/etc)
  Resultado: BLOQUEA commit
  Mensaje: "Commit no convencional (I-005). Formato: type(scope): description"
```

**Conclusión:** Sistema Agentic AI lo bloquea EN ORIGEN
- GitHub workflow verifica en el PR (después del hecho)
- Hook local previene el problema antes

---

## Flujo de Validación (Completo)

```
1. USUARIO TRABAJA EN SESIÓN CLAUDE CODE
   └─ System Agentic AI monitorea (hooks)
      ├─ PreToolUse: valida antes de git commit
      ├─ Verifica: metadata, estructura, commits convencionales
      └─ Bloquea: si hay violaciones

2. USUARIO HACE GIT COMMIT
   └─ Sistema Agentic AI final check
      ├─ validate-commit-message.sh
      ├─ check-i001-prewrite.sh (invariantes)
      └─ Permite o bloquea

3. USUARIO HACE GIT PUSH → FEATURE BRANCH
   └─ GitHub.com recibe push
      └─ .github/workflows/ se dispara automáticamente

4. USUARIO ABRE PR: feature → develop
   └─ .github/workflows/ valida repositorio
      ├─ test-markdown-links.yml
      │  └─ Detecta: links rotos
      ├─ validate-references.yml
      │  └─ Detecta: archivos no existentes
      └─ detect-secrets.yml
         └─ Detecta: secretos committeados

5. RESULTADOS
   └─ Si TODAS las validaciones pasan:
      ├─ PR mergeable: SÍ
      ├─ Reviews pueden aprobar
      └─ Merge a develop: OK
   └─ Si ALGUNA validación falla:
      ├─ PR mergeable: NO
      ├─ Comentario en PR: "Fix X"
      └─ Merge bloqueado: hasta corregir
```

---

## Regla de Oro

| Pregunta | Respuesta | Sistema |
|----------|-----------|---------|
| ¿Afecta la integridad DEL REPOSITORIO (docs, código, estructura visible)? | SÍ | .github/workflows |
| ¿Afecta la integridad DEL FRAMEWORK THYROX (convenciones internas, WP format)? | SÍ | Sistema Agentic AI |
| ¿Es un secreto/credencial? | SÍ (AMBOS) | Ambos (defensa en profundidad) |
| ¿Es una convención interna de desarrollo? | SÍ | Sistema Agentic AI |
| ¿Es una característica del repo visible externamente? | SÍ | .github/workflows |

---

## Para Futuro WPs

**Cuando crees nuevos workflows en .github/workflows/:**
- Pregunta: ¿Esto valida el REPOSITORIO?
- Si NO → es responsabilidad del Sistema Agentic AI (hooks locales)
- Si SÍ → puede ir en .github/workflows

**Cuando crees nuevos hooks en .claude/scripts/:**
- Pregunta: ¿Esto valida el FRAMEWORK THYROX?
- Si NO → es responsabilidad de .github/workflows
- Si SÍ → puede ir en .claude/scripts (hook)

---

## Referencias

- Invariantes THYROX: `.claude/rules/thyrox-invariants.md`
- Scripts locales: `.claude/scripts/`
- Workflows: `.github/workflows/`
- WP artifacts: `.thyrox/context/work/`
- CLAUDE.md: Configuración Level 2 del proyecto

