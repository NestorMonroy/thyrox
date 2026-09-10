```yml
created_at: 2026-04-20 19:15:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
investigation_depth: Initial
```

# Problem Understanding — GitHub Workflows CI/CD Gaps

## Preguntas investigativas

### 1. Origen & Historia

**Pregunta:** ¿Cuándo y por qué se creó `validate.yml` con scope mínimo?

**Investigación requerida:**
- Revisar git log de `.github/workflows/validate.yml` (primer commit, autor)
- Identificar si fue creación deliberada o punto de partida
- Verificar si hay branches abandonadas con workflows removidos

**Hipótesis inicial:** `validate.yml` fue creado para validar SKILL.md específicamente (ÉPICA 29+), nunca se extendió a coverage general.

**Status:** PENDIENTE INVESTIGACIÓN

---

**Pregunta:** ¿Hubo intentos previos de agregar tests/lint workflows?

**Investigación requerida:**
- Buscar en git history: referencias a "test", "lint", "workflow" en commits/PRs cerrados
- Revisar ROADMAP.md histórico (si existe)
- Buscar en issues/PRs cerrados con etiqueta "ci" o "automation"

**Hipótesis inicial:** No hay evidencia de intentos fallidos; la brecha fue ignorada, no bloqueada.

**Status:** PENDIENTE INVESTIGACIÓN

---

### 2. Impacto Real — Incidentes Concretos

**Pregunta:** ¿Ha habido bugs que no fueron detectados porque no hay tests en CI?

**Investigación requerida:**
- Revisar PRs mergeadas en último mes — ¿tenían cambios potencialmente rompebles?
- Preguntar a mantenedor: ¿ha habido "sorpresas" post-merge?
- Revisar branches cerradas: ¿por qué se cerraron? (conflictos no resueltos, cambios incompatibles?)

**Hipótesis inicial:** Sí ha habido bugs silenciosos (ej: WP-ERR-001 fue detectado después, no en CI)

**Status:** PARCIALMENTE CONFIRMADO (WP-ERR-001 como evidencia)

---

**Pregunta:** ¿Cuántos PRs se han mergeado sin pasar status checks?

**Investigación requerida:**
- Revisar branch protection settings en GitHub
- Contar PRs en main en último mes
- Verificar si alguno mergeó sin green checks

**Hipótesis inicial:** Dado que no hay branch protection visible, probablemente todos los PRs podrían mergearse sin checks.

**Status:** PENDIENTE INVESTIGACIÓN (requiere acceso GitHub UI)

---

### 3. Restricciones Ocultas

**Pregunta:** ¿Hay limitaciones de GitHub Actions que bloqueaban automatización?

**Investigación requerida:**
- Revisar límites de minutos gratuitos de GitHub Actions
- Verificar si hay workflows lentos que causarían timeout
- Comprobar si hay dependencias de runners (ubuntu-latest vs. self-hosted)

**Hipótesis inicial:** No hay limitaciones conocidas; GitHub Actions free tier debería ser suficiente para este proyecto.

**Status:** PENDIENTE INVESTIGACIÓN

---

**Pregunta:** ¿Qué herramientas externas ya están disponibles en el proyecto?

**Investigación requerida:**
- Revisar `package.json` (¿existe?) — eslint, prettier instalados?
- Revisar `pyproject.toml` o `requirements.txt` — pytest, black disponibles?
- Revisar scripts en `bin/` y `.thyrox/scripts/` — ¿cuáles son críticos?

**Hipótesis inicial:** Herramientas estándar (eslint, prettier, markdownlint) podrían instalarse fácilmente.

**Status:** REQUIERE EXPLORACIÓN

---

### 4. Patrones Transversales

**Pregunta:** ¿Es la "validación mínima" una decisión arquitectónica deliberada o deuda técnica?

**Investigación requerida:**
- Revisar CLAUDE.md para decisiones sobre CI/CD
- Buscar en ADRs si hay decisión documentada
- Revisar .claude/rules/ para invariantes sobre testing

**Hipótesis inicial:** No hay decisión arquitectónica explícita — es deuda técnica acumulada.

**Status:** PENDIENTE INVESTIGACIÓN

---

**Pregunta:** ¿Este patrón (mínimo CI/CD) aparece en otros sistemas o métodos?

**Investigación requerida:**
- Revisar si otros workflow-* skills tienen validación propia
- Revisar si coordinators tienen sus propios checks
- Comparar con metodologías externas (PMBOK, BABOK) — ¿cómo manejan CI?

**Hipótesis inicial:** Cada sistema mantiene su propio nivel de validación; no hay estándar unificado.

**Status:** REQUIERE EXPLORACIÓN

---

### 5. Dependencias Externas

**Pregunta:** ¿Qué componentes críticos del proyecto deben ser validados en CI?

**Investigación requerida:**
- Mapear scripts críticos: `bin/`, `.thyrox/scripts/`, `.claude/scripts/`
- Identificar cuáles rompen el sistema si fallan
- Estimar el costo de validarlos

**Componentes críticos identificados:**
- `.claude/skills/workflow-*` — si se rompen, fases enteras fallan
- `.thyrox/scripts/` — si fallan, estado de WP se corrompe
- `CLAUDE.md` — si se rompe, onboarding falla
- ADRs en `decisions/` — si son inconsistentes, decisiones se contradicen

**Status:** PARCIALMENTE MAPEADO

---

## Síntesis de hallazgos

| Pregunta | Status | Confianza | Acción requerida |
|----------|--------|-----------|-----------------|
| ¿Cuándo y por qué se creó validate.yml mínimo? | Pendiente | Baja | Git history + análisis |
| ¿Intentos previos de CI/CD? | Pendiente | Baja | Git log + issues |
| ¿Bugs silenciosos por falta de tests? | Parcial | Media | WP-ERR-001 es evidencia |
| ¿PRs mergeadas sin checks? | Pendiente | Baja | GitHub UI inspection |
| ¿Restricciones GitHub Actions? | Pendiente | Media | Documentación oficial |
| ¿Herramientas disponibles? | Requerida | Baja | Explorar dependencies |
| ¿Decisión deliberada o deuda? | Pendiente | Media | Revisar ADRs |
| ¿Patrón transversal? | Requerida | Baja | Explorar workflow-* |
| ¿Componentes críticos? | Parcial | Media | Mapeo incompleto |

---

## Próximos pasos

1. **Exploración inmediata:** Revisar git history de `.github/workflows/`
2. **Mapeo de dependencias:** Listar scripts críticos en `.thyrox/scripts/`
3. **Investigación de incidentes:** Buscar en git log bugs que pasaron CI
4. **Decisiones registradas:** Revisar ADRs para CI/CD

---

## Notas para análisis posterior

Este documento captura PREGUNTAS sin respuestas. Cada respuesta debería documentarse en un sub-análisis (ej: `discover/ci-cd-history-analysis.md`, `discover/scripts-criticality-analysis.md`). No mezclar preguntas con respuestas aquí.
