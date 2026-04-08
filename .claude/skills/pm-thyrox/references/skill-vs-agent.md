```yml
type: Reference
title: SKILL vs Agente — Distinción y regla de decisión
work_package: 2026-04-07-03-08-03-agent-format-spec
created_at: 2026-04-07 05:22:12
status: Activo
covers: R-006
```

# SKILL vs Agente — Distinción y regla de decisión

---

## Tabla comparativa

| Dimensión | SKILL | Agente |
|-----------|-------|--------|
| **Qué es** | Documento de metodología que define cómo trabajar en un dominio. Instrucciones que Claude lee y sigue en la sesión activa. | Subagente nativo de Claude Code con identidad, tools propios y scope de ejecución acotado. Se invoca en paralelo o como especialista puntual. |
| **Dónde vive** | `.claude/skills/{nombre}/SKILL.md` — dentro del framework de gestión | `.claude/agents/{nombre}.md` — directorio de agentes nativos de Claude Code |
| **Cómo se activa** | Invocando el `Skill` tool con el nombre del skill, o leyendo el archivo SKILL.md directamente | Claude Code lo selecciona automáticamente por `description` (routing), o el usuario lo invoca explícitamente |
| **Acceso a tools** | No declara tools propios — usa los del contexto de la sesión principal | Declara su propio conjunto de `tools` en el frontmatter; solo tiene acceso a esos tools |
| **Ejecución en paralelo** | No — es metodología que el agente principal integra en su razonamiento | Sí — Claude Code puede lanzar múltiples agentes en paralelo con el `Task` tool |
| **Formato del archivo** | Markdown con secciones estructuradas (fases, checklists, decisiones). Sin frontmatter obligatorio. | Frontmatter YAML con `name`, `description`, `tools` + cuerpo markdown con instrucciones del sistema |
| **Cuándo modificar** | Solo si cambia la metodología general de gestión | Cuando cambia el scope, las tools disponibles, o el routing del agente |

---

## Regla de decisión

**Crear un SKILL** cuando lo que quieres codificar es una metodología reutilizable de trabajo (un proceso, un conjunto de fases, una forma de pensar un dominio); **crear un agente** cuando quieres un especialista autónomo con tools acotadas que puede ejecutarse en paralelo o ser seleccionado por routing automático para una tarea específica.

---

## Ejemplos del proyecto THYROX

### SKILLs activos

| Nombre | Path | Propósito |
|--------|------|-----------|
| `pm-thyrox` | `.claude/skills/pm-thyrox/SKILL.md` | Metodología de gestión de proyectos en 7 fases (ANALYZE → TRACK). Motor del framework. |
| `python-mcp` | `.claude/skills/python-mcp/SKILL.md` | Guía para implementar servidores MCP en Python: estructura, registro de tools, patrones de testing. |

### Agentes activos

| Nombre | Path | Propósito |
|--------|------|-----------|
| `task-executor` | `.claude/agents/task-executor.md` | Ejecuta tareas atómicas de un task-plan.md. Usar cuando hay checkboxes T-NNN pendientes y se quiere implementar la siguiente tarea sin contexto de gestión. |
| `task-planner` | `.claude/agents/task-planner.md` | Descompone un work package en tareas atómicas. Usar cuando se tiene una solution-strategy aprobada y se necesita el task-plan. |
| `tech-detector` | `.claude/agents/tech-detector.md` | Detecta el stack tecnológico de un proyecto. Usar cuando se inicia un work package y se necesita saber qué skills activar. |
| `skill-generator` | `.claude/agents/skill-generator.md` | Genera agentes nativos desde un registry YML. Usar cuando se quiere crear un nuevo agente tech-expert a partir de un template. |

---

## Las 5 capas y sus rutas de ejecución

Arquitectura de 5 capas de pm-thyrox (ADR-015). Cada capa tiene un mecanismo de triggering distinto.

### Tabla de capas

| Capa | Nombre | Triggering | Overhead sesiones no-PM | Actualizable sin migración |
|------|--------|-----------|------------------------|--------------------------|
| 0 — Hooks | shell scripts (harness) | 100% determinístico | Negligible | ✓ Sí |
| 1 — CLAUDE.md | system prompt declarativo | Siempre cargado | Bajo (~80 líneas) | ✓ Sí |
| 2 — SKILLs (N) | text injection on-demand | Probabilístico | Bajo (solo si se invocan) | ✓ Sí |
| 3 — /workflow_* | slash commands | Determinístico (usuario lo invoca) | Bajo (solo si se usan) | ✓ Sí (independiente por fase) |
| 4 — Agentes nativos | subprocesos Claude | Determinístico (una vez lanzados) | 0 (contexto propio) | ✓ Sí |

### Tabla de rutas (hoy vs objetivo)

| Ruta | Mecanismo | Calidad HOY | Confiabilidad HOY | Criterio de uso |
|------|-----------|-------------|-------------------|----------------|
| A — pm-thyrox SKILL | Capa 2, probabilístico | Alta (lógica completa) | Media (puede no disparar) | Usar HOY cuando se necesita calidad máxima |
| B — /workflow_* commands | Capa 3, determinístico | Baja (desactualizados) | Alta (si el usuario los invoca) | No recomendar hasta TD-008 completado |
| C — /workflow_* post-TD-008 | Capa 3, determinístico | Alta (sincronizados) | Alta | Ruta preferida cuando TD-008 esté completo |

**session-start.sh** (Capa 0) muestra las opciones A y B al inicio de cada sesión con etiqueta `[outdated]` en B mientras TD-008 no esté completo.

---

## 5 hallazgos externos sobre SKILLs

Evidencia recopilada en FASE 21 que impacta las decisiones arquitectónicas de pm-thyrox.
Fuentes: artículo "The Ultimate Guide to Claude Code Skills" (Mar 2026) + análisis FASE 21.

| ID | Hallazgo | Evidencia | Fuente |
|----|----------|-----------|--------|
| H1 | **Triggering probabilístico** — Un SKILL perfectamente escrito puede no dispararse. | 0 de 20 prompts que deberían activar una CPO review skill → 0 disparos. | Artículo Mar 2026 |
| H2 | **PTC es ortogonal a hooks y commands** — PTC mejora eficiencia interna de agentes (Capa 4), no reemplaza la arquitectura de capas. | PTC disponible en API, no en Claude Code Web. /workflow_* y hooks no cambian cuando PTC llegue. | Análisis FASE 21 |
| H3 | **Truncación de descripciones al escalar** — El budget de context para SKILL descriptions es ~1% del context window. Con 16 skills activos, la truncación de keywords reduce la tasa de disparo. | THYROX: 16 skills activos → rango donde la truncación ya puede ocurrir. | Análisis FASE 21 |
| H4 | **SKILLs son prompt injection** — No hay magia arquitectónica. 40 de 47 skills probados empeoraron el output. | "Skills are prompt injections. That's it. Nothing more magical than that." | Artículo Mar 2026 |
| H5 | **CLAUDE.md como alternativa más simple** — Siempre cargado, sin triggering probabilístico, sin riesgo de truncación. | "Why not just stick with a well-written system prompt in your CLAUDE.md? It's simpler, always loads..." | Artículo Mar 2026 |

**Implicación para pm-thyrox:** Los hallazgos H1/H3/H4 justifican la arquitectura de 5 capas (ADR-015):
Hooks (100% determinísticos) + CLAUDE.md (siempre cargado) compensan la confiabilidad media del SKILL.

---

## Señales de confusión frecuente

- Si el archivo necesita `tools` para hacer su trabajo → es un agente, no un SKILL.
- Si el archivo define fases o un proceso de pensamiento → es un SKILL, no un agente.
- Si quieres que se ejecute en paralelo con otros → definitivamente un agente.
- Si quieres que cambie cómo Claude razona en una sesión entera → definitivamente un SKILL.
