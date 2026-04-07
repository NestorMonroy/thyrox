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

## Señales de confusión frecuente

- Si el archivo necesita `tools` para hacer su trabajo → es un agente, no un SKILL.
- Si el archivo define fases o un proceso de pensamiento → es un SKILL, no un agente.
- Si quieres que se ejecute en paralelo con otros → definitivamente un agente.
- Si quieres que cambie cómo Claude razona en una sesión entera → definitivamente un SKILL.
