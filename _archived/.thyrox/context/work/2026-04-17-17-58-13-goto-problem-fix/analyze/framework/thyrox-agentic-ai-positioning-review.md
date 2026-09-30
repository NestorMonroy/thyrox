```yml
created_at: 2026-04-18 03:49:50
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Borrador
```

# THYROX Agentic AI Positioning Review

Análisis exhaustivo de ocurrencias de "framework" en el repositorio THYROX para identificar dónde el término describe incorrectamente al sistema, dado el reposicionamiento conceptual: THYROX no es un "framework" pasivo — es un **sistema de Agentic AI** con agentes autónomos, multi-agent coordination, HITL gates, memoria persistente (FAISS) y hooks reactivos.

---

## Definición del problema

El término "framework" en software engineering implica una estructura pasiva que el humano usa, como una librería o plantilla. THYROX no encaja en esta categoría. Encaja en la categoría **Agentic AI System** según la taxonomía SoK:

| Característica Agentic AI | Implementación en THYROX |
|---------------------------|--------------------------|
| Agentes autónomos con herramientas | 23 agentes nativos (task-executor, ba-coordinator, deep-review, etc.) |
| Multi-agent coordination | 11 coordinators + thyrox-coordinator orquestador, worktree isolation |
| HITL checkpoints | Gates Stage N→N+1, GATE OPERACIÓN en settings.json |
| Agentic decision loops | /loop command — ejecución continua autónoma |
| Memoria persistente | thyrox-memory MCP (FAISS semántico) store/retrieve |
| Tool use real | Read/Write/Bash/MCP sobre el entorno |
| Triggers reactivos | SessionStart / PostCompact / Stop hooks |
| Estado persistente entre sesiones | WP + now.md + context/ |
| Skills = políticas de comportamiento | SKILL.md define comportamiento del agente, no APIs para desarrolladores |

---

## Inventario de ocurrencias — Archivos de alta prioridad

### README.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 16 | `Framework profesional para gestión y planificación de proyectos con Claude Code` | Define THYROX como framework pasivo. Es la primera línea del propósito — alto impacto. |
| 24 | `Un framework completo para gestión y planificación de proyectos con Claude Code` | Descripción general — repite el error de posicionamiento. |
| 28 | `THYROX es un framework completo para:` | Encabezado de sección "Qué es THYROX" — define la identidad del sistema. |
| 63 | `thyrox/          # Skill principal del framework` | Comentario en árbol de estructura — uso adjetival, impacto bajo. |
| 76 | `.thyrox/registry/            # Fuente de verdad del framework` | Comentario en árbol — uso adjetival, impacto bajo. |

### ARCHITECTURE.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 13 | `THYROX es un framework de gestión de proyectos para Claude Code` | Primera línea de la Visión General — define arquitecturalmente qué es el sistema. Alto impacto. |
| 100 | `El directorio .thyrox/registry/ es la fuente de verdad del framework` | Uso adjetival — bajo impacto. |
| 121 | `## Hooks del framework` | Encabezado de sección — uso adjetival, impacto bajo. Aunque irónicamente, los hooks son evidencia de que es Agentic AI. |

### .claude/CLAUDE.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 13 | `Estas son reglas del framework de metodologia — NO son ADRs del proyecto.` | "framework de metodología" puede interpretarse como el sistema THYROX o como concepto genérico. Ambiguo pero aceptable con el contexto de "metodología". |
| 24 | `Interfaz pública del framework → /thyrox:*` | Uso adjetival posesivo — bajo impacto. |
| 35 | `Mantenedor del framework` | Uso adjetival — bajo impacto. |
| 37 | `Vive con el framework` | Uso adjetival — bajo impacto. |
| 53 | `Skills del framework (thyrox + workflow-*)` | Uso adjetival — bajo impacto. |
| 68 | `{layer}-{framework}.instructions.md` | Este es un placeholder de variable en un path — NO es "framework" describiendo a THYROX. **Correcto, no cambiar.** |
| 159 | `adr_path: .thyrox/context/decisions/ # [...] subdirectorios por capa (global/, api/, db/, ui/, deploy/, framework/)` | "framework/" es un subdirectorio de ADRs — **correcto, no cambiar.** |

### .claude/skills/thyrox/SKILL.md (descripción frontmatter)

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 3 | `"Framework de gestión THYROX con 12 fases propias..."` | La descripción del skill es lo que Claude Code usa para decidir cuándo invocar el skill. Si dice "Framework de gestión" en lugar de "sistema agentic", puede sesgar la auto-invocación. **Crítico** — impacta el triggering. |
| 9 | `Framework de gestión para organizar trabajo de cualquier tamaño con Claude Code.` | Primera línea del SKILL.md visible al agente — define la identidad operacional. |
| 58 | `Propagar aprendizajes al framework.` | Uso adjetival — bajo impacto. |
| 105 | `El framework soporta incorporar cualquier marco metodológico adicional` | Aquí "framework" describe la capacidad de extensión del sistema. Marginal — puede reemplazarse. |
| 111 | `estructura del framework; SDLC iterativo está cubierto por rup:` | Uso adjetival — bajo impacto. |
| 303 | `Trabajo de mantenimiento del framework` | Uso adjetival — bajo impacto. |
| 310 | `El framework opera en dos planos independientes.` | Uso sujeto — el sistema opera. Reemplazable. |
| 345 | `Scripts del framework` | Etiqueta en tabla — bajo impacto. |
| 349 | `Configuracion del framework` | Etiqueta en tabla — bajo impacto. |
| 397 | `Cómo escalar el framework según complejidad` | Descripción de link — bajo impacto. |

### .thyrox/context/project-state.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 15 | `Activo — framework thyrox con 14 FASEs completadas` | Estado general del sistema — uso identificador, bajo impacto directo. |
| 70 | `## Componentes del framework` | Encabezado de sección — uso adjetival, bajo impacto. |
| 73 | `thyrox/  — Framework principal 7 fases (motor del proyecto)` | Descripción del skill en tabla — el "7 fases" está desactualizado (son 12). Doble error. |

### .thyrox/context/focus.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 27 | `## Estado del framework` | Encabezado de sección — uso adjetival. |
| 30 | `meta-framework layer` | Aquí "meta-framework" es un término técnico específico para la capa de orquestación de coordinators (ADR-meta). **Correcto — conservar.** |

### DECISIONS.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 37 | `framework-evolution` | Work package name histórico — **retrocompat, no tocar.** |
| 42 | `Meta-framework Orchestration Architecture` | Nombre del ADR técnico — **correcto, no tocar.** |

### CHANGELOG.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 119 | `bash scripts del framework` | Uso adjetival en permisos — bajo impacto. |
| 120 | `configuracion del framework` | Uso adjetival — bajo impacto. |

### .claude/references/skill-vs-agent.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 20 | `dentro del framework de gestión` | Describe la ubicación de los skills como "dentro del framework de gestión" — perpetúa la identidad incorrecta. |
| 41 | `Motor del framework.` | Descripción de thyrox skill — bajo impacto. |

### .claude/references/benchmark-skill-vs-claude.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 59 | `Decisiones por criterio propio (sin framework)` | "framework" aquí como control/guía — uso adjetival correcto en contexto de benchmark. Aceptable. |
| 68 | `Total decisiones fuera del framework: 4` | Misma situación — benchmarking, contexto correcto. |
| 74, 84, 86 | `Dónde el framework ayudó / generó fricción` | Contexto de benchmark comparando "con vs sin THYROX" — uso correcto. **No cambiar.** |
| 96, 115 | `¿Era viable sin el framework?` / `Sin framework (baseline)` | Benchmark comparativo — **no cambiar.** |

### .claude/references/permission-model.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 14 | `El framework opera en dos planos de aprobacion independientes.` | "El framework" como sujeto — uso identificador. Reemplazable con "El sistema" o "THYROX". |
| 74, 77, 78 | `Scripts del framework`, `Config del framework` | Etiquetas en tablas — bajo impacto. |

### CONTRIBUTING.md

| Línea | Texto actual | Problema |
|-------|-------------|----------|
| 13 | `THYROX usa una metodología de 7 fases SDLC` | **Error mayor**: dice "7 fases SDLC" — incorrecto en dos dimensiones: (1) son 12 stages THYROX propios, no 7; (2) no es SDLC. Documento desactualizado en general. |
| 53 | `Consultar [SKILL](.claude/skills/pm-thyrox/SKILL.md)` | Path roto — `pm-thyrox` fue renombrado a `thyrox`. |

---

## Lenguaje propuesto por contexto

### Nivel de identidad del sistema (alto impacto)

Estos son los casos donde "framework" describe qué ES THYROX como sistema:

| Texto actual | Texto propuesto | Justificación |
|-------------|----------------|---------------|
| `Framework profesional para gestión...` | `Sistema de Agentic AI para gestión...` o `Sistema de automatización agentic para...` | Identidad correcta |
| `THYROX es un framework completo para:` | `THYROX es un sistema de Agentic AI que:` | Identidad correcta |
| `Un framework completo para gestión y planificación` | `Un sistema agentic para gestión y planificación` | Identidad correcta |
| `THYROX es un framework de gestión de proyectos para Claude Code` (ARCHITECTURE.md L13) | `THYROX es un sistema de Agentic AI para gestión de proyectos sobre Claude Code` | Identidad arquitectónica |
| `"Framework de gestión THYROX..."` (SKILL.md description) | `"Sistema agentic THYROX con 12 stages propios..."` | Afecta triggering de auto-invocación |
| `Framework de gestión para organizar trabajo` (SKILL.md L9) | `Sistema agentic para organizar trabajo` | Identidad operacional |

### Nivel adjetival posesivo (bajo impacto)

Casos donde "framework" funciona como adjetivo posesivo (`del framework`, `del sistema`):

| Texto actual | Texto propuesto | Observación |
|-------------|----------------|-------------|
| `Scripts del framework` | `Scripts del sistema` o `Scripts de THYROX` | Cualquiera es correcto |
| `Configuracion del framework` | `Configuración del sistema` | Cualquiera es correcto |
| `Fuente de verdad del framework` | `Fuente de verdad del sistema` | Cualquiera es correcto |
| `El framework opera en dos planos...` | `El sistema opera en dos planos...` o `THYROX opera en dos planos...` | Más preciso con sujeto explícito |
| `Hooks del framework` | `Hooks del sistema` o `Hooks de THYROX` | Correcto — los hooks son evidencia de naturaleza agentic |
| `Propagar aprendizajes al framework` | `Propagar aprendizajes al sistema` | Bajo impacto |
| `Estado del framework` | `Estado del sistema` | Bajo impacto |

### Casos correctos — NO cambiar

| Texto | Razón para conservar |
|-------|---------------------|
| `{layer}-{framework}.instructions.md` | Es un placeholder de variable en un path, no describe a THYROX |
| `framework/` en adr_path comentario | Es un subdirectorio de ADRs — nombre técnico |
| `meta-framework layer` | Término técnico específico para la capa de orquestación de coordinators (ADR-meta) |
| `framework-evolution` | Nombre de WP histórico — retrocompat |
| `Meta-framework Orchestration Architecture` | Nombre de ADR técnico — inmutable |
| `sin framework` / `¿Era viable sin el framework?` | Uso en benchmark comparativo — "framework" como shorthand de "THYROX", correcto en contexto |
| `analysis-frameworks.md`, `five-forces-guide.md` | "framework" describiendo BABOK, PMBOK, Porter — **son frameworks en sentido correcto** |
| `RUP es un framework, no una metodología rígida` | Describe a RUP — correcto |
| `framework: react` / `framework: webpack` | Campo YAML de metadata de skills de tecnología — correcto |
| `SCQA framework` | Nombra la metodología Pyramid Principle — correcto |
| `Impact measurement framework` | Término del dominio de consulting — correcto |
| `framework de capacidades estratégicas` | Término del dominio SP — correcto |

---

## Archivos de alto impacto — Orden de actualización recomendado

### Prioridad 1 — Identidad pública del sistema

**1. README.md** (líneas 16, 24, 28)
Primer contacto de cualquier usuario. Establece qué es THYROX. Las 3 ocurrencias de alto impacto están en las primeras 35 líneas. Cambiar aquí cambia la percepción de todo lo demás.

**2. ARCHITECTURE.md** (línea 13)
La "Visión General" es la descripción arquitectónica canónica. `THYROX es un framework de gestión` contradice todo lo que sigue (23 agentes, 4-layer coordinator architecture, hooks reactivos, MCP).

**3. .claude/skills/thyrox/SKILL.md** (línea 3 — description frontmatter)
La description es la señal que Claude Code usa para decidir si invocar el skill. Si dice "Framework de gestión" en lugar de señalar naturaleza agentic, puede suboptimizar el triggering. También, la línea 9 es la primera que el agente lee al ejecutar el skill.

### Prioridad 2 — Identidad operacional interna

**4. .claude/CLAUDE.md** (no hay ocurrencias de alto impacto — las 7 son adjetivales)
Las ocurrencias son todas de bajo impacto. La actualización puede hacerse como parte de una revisión mayor. Sin embargo, `Locked Decisions: Estas son reglas del framework de metodologia` podría precisarse: "Estas son reglas del sistema THYROX".

**5. .thyrox/context/project-state.md** (líneas 15, 70, 73)
Línea 73 tiene un error adicional: "7 fases" — debería ser "12 stages". Este dashboard es el estado del sistema y debe ser coherente.

### Prioridad 3 — Documentación de referencia

**6. .claude/references/skill-vs-agent.md** (líneas 20, 41)
La tabla de comparación skill vs agent define el modelo mental de cómo funciona el sistema. Describirlo como "framework de gestión" aquí confunde el propósito del documento.

**7. CONTRIBUTING.md** (múltiples)
Tiene errores mayores adicionales: path roto (`pm-thyrox`), "7 fases SDLC" incorrecto. Merece revisión completa separada del reposicionamiento.

### Prioridad 4 — Documentación de estado / histórica

**8. .thyrox/context/focus.md, CHANGELOG.md, DECISIONS.md**
Uso adjetival de bajo impacto. Pueden actualizarse en el próximo ciclo de mantenimiento.

---

## Archivos que NO necesitan cambio

| Archivo | Ocurrencia | Razón |
|---------|-----------|-------|
| `.thyrox/context/decisions/adr-meta-framework-orchestration.md` | `Meta-framework Orchestration` | Nombre del ADR — inmutable |
| `.thyrox/context/decisions/adr-workflow-commands-a-skills.md` | `framework-evolution` | Nombre de WP histórico |
| `.thyrox/context/research/methodology-frameworks-v3.1.md` | Todo el documento | El documento habla de frameworks metodológicos (BABOK, PMBOK, Lean) — todos son correctos |
| `.claude/skills/rup-inception/SKILL.md:206` | `RUP es un framework` | Describe a RUP, no a THYROX |
| `.claude/skills/sp-analysis/references/five-forces-guide.md` | `framework para analizar...` | Describe a Porter — correcto |
| `.claude/skills/cp-recommend/SKILL.md` | `SCQA framework` | Metodología de consulting — correcto |
| `.claude/skills/frontend-react/SKILL.md:5` | `framework: react` | Campo de metadata de skill de tecnología |
| `.claude/skills/python-mcp/SKILL.md:3` | `meta-framework THYROX` | "Meta-framework" tiene sentido técnico específico para la capa de orquestación |
| `.claude/references/benchmark-skill-vs-claude.md` | Todo uso de "framework" | Es un benchmark comparativo "con vs sin THYROX" — uso correcto |
| `.thyrox/guidelines/{layer}-{framework}.instructions.md` | `{framework}` en path | Placeholder de variable en nombre de archivo |
| `.claude/CLAUDE.md:159` | `framework/` en comentario | Nombre de subdirectorio de ADRs |
| `.thyrox/context/decisions/adr-meta-framework-orchestration.md` | Todo | ADR inmutable |

---

## Propuesta de descripción canónica

### Una oración

> THYROX es un sistema de Agentic AI que orquesta 23 agentes especializados con memoria persistente, gates HITL y 12 stages propios para gestión de proyectos. Implementado actualmente sobre Claude Code (Anthropic).

### Un párrafo

> THYROX es un sistema de Agentic AI para gestión de proyectos. Orquesta 23 agentes nativos especializados (task-executor, coordinators, tech-experts, deep-review) en ejecución autónoma o paralela con worktree isolation. El sistema incluye memoria persistente semántica (thyrox-memory MCP con FAISS), hooks reactivos (SessionStart / PostCompact / Stop), gates HITL en cada transición Stage N→N+1, y soporte nativo para 11 metodologías de gestión formal vía coordinators especializados. Los Skills actúan como políticas de comportamiento del agente — no como APIs para desarrolladores. Los Work Packages son el estado persistente del agente entre sesiones. Implementado actualmente sobre Claude Code (Anthropic); la naturaleza agentic del sistema es independiente de la plataforma.

### README — Propósito (reemplaza líneas 16-35)

```markdown
## Propósito

Sistema de Agentic AI para gestión y planificación de proyectos, con metodología de 12 stages propia (DISCOVER → STANDARDIZE) y soporte nativo para 11 metodologías formales.

> Implementado actualmente sobre Claude Code (Anthropic). La naturaleza agentic del sistema es independiente de la plataforma.

## Qué es THYROX

THYROX es un sistema de Agentic AI que:

- **Orquesta** 23 agentes especializados con ejecución autónoma y coordinación multi-agent
- **Automatiza** workflows con decisión autónoma en bucles agentic (/loop)
- **Persiste** estado entre sesiones via Work Packages + thyrox-memory MCP (FAISS semántico)
- **Controla** calidad con gates HITL en cada transición Stage N→N+1
- **Integra** 11 metodologías formales via coordinators especializados (DMAIC, PDCA, PMBOK, BABOK, RUP, RM, Lean, BPA, PPS, SP, CP)
- **Reacciona** a eventos con hooks (SessionStart, PostCompact, Stop)
```

---

## Resumen ejecutivo

**Total de ocurrencias analizadas:** ~55 en archivos principales

**Clasificación:**
- Ocurrencias de alto impacto (describen qué ES THYROX): **6** — en README.md (3), ARCHITECTURE.md (1), SKILL.md description (1), SKILL.md línea 9 (1)
- Ocurrencias de bajo impacto (uso adjetival posesivo): ~25 — `del framework`, `Scripts del framework`, `Hooks del framework`
- Ocurrencias correctas (no cambiar): ~24 — frameworks metodológicos, nombres de ADRs, placeholders de variables

**Archivos críticos a actualizar primero:** README.md → ARCHITECTURE.md → SKILL.md (description) → project-state.md (fix "7 fases")

**Recomendación:** Las 6 ocurrencias de alto impacto representan el 11% del total pero el 90% del daño conceptual. Actualizarlas en un commit atómico documenta el reposicionamiento. Las adjetivales pueden actualizarse en mantenimiento ordinario.
