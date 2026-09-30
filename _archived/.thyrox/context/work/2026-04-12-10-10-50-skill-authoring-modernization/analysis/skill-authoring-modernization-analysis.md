```yml
type: Análisis de Work Package
created_at: 2026-04-12 10:15:00
wp: 2026-04-12-10-10-50-skill-authoring-modernization
fase: FASE 33
reference_repo: /tmp/reference/claude-howto (luongnv89/claude-howto)
tds_objetivo: TD-010, TD-025
```

# Análisis — skill-authoring-modernization (FASE 33)

## 1. Objetivo

Actualizar `skill-authoring.md` con los 15 gaps identificados respecto a la documentación oficial post-2026-03-25 (TD-025), y evaluar si el repositorio `claude-howto` activa el trigger del benchmark SKILL vs CLAUDE.md (TD-010).

## 2. Stakeholders

| Rol | Interés |
|-----|---------|
| Desarrollador THYROX | Guía actualizada para crear skills y agentes correctamente |
| Framework (THYROX) | Referencias internas no contradictorias (skill-authoring.md coherente con claude-code-components.md) |

## 3. Uso operacional

`skill-authoring.md` se usa cuando:
- Se crea un skill nuevo (cualquier tech skill o workflow-*)
- Se mejora un skill existente
- Se decide entre SKILL vs CLAUDE.md vs Agente vs Hook
- Se revisa si un artefacto sigue las mejores prácticas

Actualmente está referenciado en `thyrox/SKILL.md` sección "Avanzado" → se carga bajo demanda.

## 4. Hallazgos — TD-010: ¿Se activa el trigger?

**Veredicto: NO.**

El trigger dice "ejecutar cuando haya caso de uso real que justifique el benchmark". El repo `claude-howto` (119 artefactos, material educativo) aporta patrones valiosos pero NO es el tipo de caso de uso que el benchmark requiere.

**Por qué no activa:**
- El repo es material educativo, no datos de ejecución real. Los skills no incluyen métricas de invocación automática vs manual, ni comparaciones de output con/sin skill.
- El benchmark requiere 3 tareas × 3 condiciones = 9 ejecuciones comparables y medibles. No hay tarea de THYROX identificada donde exista hipótesis concreta.
- El artículo Mar 2026 ("40/47 skills empeoran output") aplica a un dominio diferente al de THYROX.

**Qué faltaría para activar el trigger:**
Identificar una tarea recurrente de THYROX (e.g., "escribir un commit message", "crear un ADR") donde exista hipótesis medible de que SKILL vs CLAUDE.md produce output diferente. El repo no provee esa tarea en el contexto de THYROX.

**Acción sobre TD-010:** Mantener activo. La condición del trigger sigue sin cumplirse. Este análisis se registra como evidencia de evaluación.

## 5. Hallazgos — SKILL vs CLAUDE.md vs Agente (del repo)

### Regla de decisión emergente

| Criterio clave | SKILL | CLAUDE.md | Agente | Hook |
|----------------|-------|-----------|--------|------|
| Aplica a TODA sesión sin excepción | No | **Sí** | No | N/A |
| Tiene side effects que el usuario controla | **Sí** | No | Con permissionMode | No |
| Requiere argumentos por invocación | **Sí** ($ARGUMENTS) | No | No | No |
| Workflow multi-paso con aprobaciones | **Sí** | No | Sí | No |
| Necesita allowlist de tools específico | No | No | **Sí** | No |
| Output verboso que contamina context | Con context:fork | No | **Sí** | No |
| Ejecución en paralelo | No | No | **Sí** | No |
| Acción determinística ante evento | No | No | No | **Sí** |

### Casos concretos del repo

**SKILL correcto — `refactor/SKILL.md`:** 6 fases con aprobaciones humanas, scripts de soporte, metodología Fowler especializada. Solo aplica cuando el usuario pide refactorizar. En CLAUDE.md sería 427 líneas de metodología que 95% del tiempo no aplican.

**CLAUDE.md correcto — `directory-api-CLAUDE.md`:** Reglas que aplican a TODAS las sesiones en `/src/api/` (response format, Zod validation, JWT, paginación). Nunca cambia por invocación. Contexto permanente.

**Agente correcto — `secure-reviewer.md`:** `tools: Read, Grep` — no puede modificar archivos aunque quiera. Restricción de tools que es imposible de replicar con un SKILL. Beneficio no es solo el prompt, es la restricción física.

**Caso ambiguo — `brand-voice/SKILL.md`:** Si el equipo usa Claude principalmente para marketing → CLAUDE.md. Si es uso ocasional → SKILL. La distinción es frecuencia y universalidad de aplicación, no el contenido.

## 6. Hallazgos — TD-025: 15 Gaps en skill-authoring.md

`skill-authoring.md` (`updated_at: 2026-03-25`) está bien en: principios semánticos (concisión, grados de libertad), naming, descriptions, progressive disclosure, workflows, feedback loops, evaluación iterativa.

**Ausente completamente:**

| Gap | Descripción | Prioridad |
|-----|-------------|-----------|
| GAP-001 | Frontmatter completo de Skills (campos post-2026-03-25) | alta |
| GAP-002 | Tres modos de control de invocación (default / disable-model-invocation / user-invocable) | alta |
| GAP-003 | Context budget optimization con disable-model-invocation | alta |
| GAP-004 | Variables de sustitución ($ARGUMENTS, ${CLAUDE_SKILL_DIR}, ${CLAUDE_SESSION_ID}) | alta |
| GAP-005 | Inyección dinámica de context con `!` backtick syntax | media |
| GAP-006 | context: fork + agent: field | media |
| GAP-007 | Sección completa de Subagents authoring (frontmatter + naming + dónde viven) | alta |
| GAP-008 | Skills preloaded en subagents (skills: field — inyecta contenido completo) | alta |
| GAP-009 | memory: en subagents (3 scopes: user/project/local) | media |
| GAP-010 | background: true en subagents | baja |
| GAP-011 | isolation: worktree | baja |
| GAP-012 | Permission modes de subagents (6 modos) | media |
| GAP-013 | Cuándo SKILL vs CLAUDE.md vs Agente vs Hook (tabla de decisión) | alta |
| GAP-014 | Description budget y truncación (250 chars, 1% context window) | media |
| GAP-015 | paths: field para activación condicional por archivos | media |

**Gaps de alta prioridad: 7** (GAP-001, 002, 003, 004, 007, 008, 013)
**Total estimado: ~355 líneas adicionales** → documento llegaría a ~1,196 líneas

## 7. Restricciones

- `skill-authoring.md` actualmente ~841 líneas. Al agregar ~355 líneas → ~1,196 líneas. Excede el propio principio del documento ("SKILL.md < 500 líneas"). Solución: split.
- No modificar `skill-vs-agent.md` (ya existe y está correcto) — agregar referencia cruzada.
- No contradecir ADR-015 (arquitectura 5 capas) ni ADR-016 (excepción workflow-*).

## 8. Contexto y sistemas vecinos

| Archivo | Relación |
|---------|----------|
| `claude-code-components.md` | Fuente canónica para todos los campos nuevos. Creada 2026-04-09. |
| `skill-vs-agent.md` | Ya documenta SKILL vs Agente. No duplicar, referenciar. |
| `agent-spec.md` | Spec formal de agentes. Coherencia necesaria (GAP-007/008). |
| `thyrox/SKILL.md` | Referencia skill-authoring.md en sección Avanzado. |

## 9. Decisión de estructura — Opción B + Expansión (aprobada SP-01 + scope ampliado 2026-04-12)

**12 archivos** en total — 5 de componentes + 2 referencias avanzadas + 5 guías de patrones/referencia + 2 actualizaciones:

### Grupo A — Authoring por tipo de componente (5 archivos)

| Archivo | Tipo | Estado |
|---------|------|--------|
| `skill-authoring.md` | SKILL best practices | Actualizar (15 gaps, parte de ellos) |
| `agent-authoring.md` | AGENT/Subagent best practices | Crear nuevo |
| `claude-authoring.md` | CLAUDE.md best practices | Crear nuevo |
| `hook-authoring.md` | HOOK best practices | Crear nuevo |
| `component-decision.md` | Cuándo usar cada tipo | Crear nuevo (absorbe GAP-013) |

### Grupo B — Referencias de plataforma (2 archivos nuevos)

| Archivo | Tipo | Estado |
|---------|------|--------|
| `advanced-features.md` | Features avanzadas Claude Code | Crear nuevo — 12 features sin cobertura (Planning Mode, Extended Thinking, Git Worktrees, Sandboxing, Agent Teams, Remote Control, Web Sessions, Desktop App, Channels, Voice Dictation) |
| `cli-reference.md` | Referencia CLI completa | Crear nuevo — 30+ flags, 30+ env vars, patterns de auth/auto-mode |

### Grupo C — Guías de patrones (5 archivos nuevos)

| Archivo | Tipo | Estado |
|---------|------|--------|
| `memory-patterns.md` | Patrones de memoria y estado | Crear nuevo — user/project/local memory, now.md patterns, persistent state |
| `tool-patterns.md` | Patrones de uso de herramientas | Crear nuevo — tool selection, parallel calls, error handling, tool restrictions |
| `testing-patterns.md` | Patrones de testing con Claude | Crear nuevo — SDD, TDD integration, test amplification, assertion patterns |
| `multimodal.md` | Capacidades multimodales | Crear nuevo — image reading, PDF, notebook, screenshots |
| `output-formats.md` | Formatos de output | Crear nuevo — JSON mode, streaming, print mode (-p), structured output |

### Grupo D — Actualizaciones de existentes (2 archivos)

| Archivo | Actualización | Estado |
|---------|---------------|--------|
| `mcp-integration.md` | + patrón code-execution-with-MCP (98.7% token reduction), `claude mcp serve`, env var expansion | Actualizar |
| `plugins.md` | + restricciones de seguridad para subagentes en plugins (hooks/mcpServers/permissionMode bloqueados), directorio `bin/` | Actualizar |

**Razón de la expansión:** Segunda deep-review del repo `claude-howto` identificó gaps significativos en áreas de plataforma (features avanzadas, CLI) y patrones de uso (memory, tools, testing, multimodal, output) que no tienen un archivo natural en THYROX.

## 10. Fuera de alcance

- Ejecutar el benchmark TD-010 (trigger no activado)
- Modificar los 10 agentes existentes (pertenece a TD-009)
- Actualizar templates de skills existentes
- Modificar `agent-spec.md` (pertenece a TD-009)

## 11. Criterios de éxito

- 12 archivos creados/actualizados cubriendo componentes, features avanzadas y patrones
- Ningún campo documentado contradice `claude-code-components.md`
- `thyrox/SKILL.md` referencias actualizadas con los nuevos archivos
- TD-025 marcado `[x]` en `technical-debt.md`
- TD-010 mantiene estado `[ ]` con nota de evaluación

## 12. Stopping Point Manifest

| SP | Momento | Descripción |
|----|---------|-------------|
| SP-01 | Phase 1 → 2 | Usuario aprueba hallazgos, veredicto TD-010 y estructura Opción B ← **aprobado 2026-04-12** |
| SP-02 | Phase 2 → 3 | Usuario aprueba estrategia de contenido (qué va en cada archivo) |
| SP-03 | Phase 3 → 4 | Usuario aprueba plan y scope |
| SP-04 | Phase 4 → 5 | Usuario aprueba requirements spec |
| SP-05 | Phase 5 → 6 | Usuario aprueba task-plan |
| SP-06 | Phase 6 → 7 | Usuario confirma resultado de los 12 archivos |
