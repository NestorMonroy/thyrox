```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Meta-análisis de los 14 proyectos
Tema: Cómo cada proyecto implementa constitution, CLAUDE.md, y SKILL/instructions
```

# Meta-patrones: Constitution, CLAUDE.md, SKILL.md en 14 proyectos

## 1. Constitution / Principios — ¿Quién lo tiene y cómo?

| # | Proyecto | Tiene constitution? | Nombre del archivo | Contenido | Enforcement |
|---|----------|--------------------|--------------------|-----------|-------------|
| 1 | spec-kit | Sí | memory/constitution.md | 9 "Articles" inmutables, gates en plan-template | Phase -1 gates bloquean si se violan |
| 2 | claude-pipe | No | — | — | — |
| 3 | claude-mlx-tts | No | — | — | — |
| 4 | oh-my-claude | Parcial | decision-gate.md | Switching cost tiers (tiny/small/medium/large) | Integrado en orchestrator workflow |
| 5 | conv-temp | No | — | — | — |
| 6 | clawpal | No | — | — | — |
| 7 | Cortex-Template | Sí | brain-constitution.md | Invariantes de identidad, halt conditions, degradation matrix, autonomy rules | Layer 0, cargado ANTES de todo, violación = HALT |
| 8 | trae-agent | Parcial | System prompt (agent_prompt.py) | 7-step methodology, absolute paths rule, TDD mandatory | Embebido en el prompt, no en archivo separado |
| 9 | build-ledger | Parcial | SWARM_LAUNCH_PLAN.md + research "truths" | 5 reglas de swarm, 6 truths verificadas | Manual (Shane como Tier 3 arbiter) |
| 10 | agentic-framework | Sí | CLAUDE.md + conventions.md | Session start protocol, quality gates, code standards | 16 pre-commit gates + cursor hooks |
| 11 | almanack | Parcial | CLAUDE.md | "Every time I correct you, add a rule" | Auto-creciente por correcciones |
| 12 | ClaudeViewer | Parcial | CLAUDE.md | "Do not prepare fallbacks. Make errors instead." | Reglas en CLAUDE.md leídas por Claude Code |
| 13 | cc-warp | Parcial | foco_atual.md | Filosofía de "primitivos", 3 pilares | Conceptual, no enforcement |
| 14 | valet | Sí | CLAUDE.md (9 locked decisions) | "Decided and locked in. Do not revisit." | En CLAUDE.md, Claude Code no cuestiona |

### Patrones de constitution

**Formato corto (lo que funciona):**
- valet: 9 decisiones locked en CLAUDE.md (10 líneas)
- ClaudeViewer: 2 reglas de error handling (3 líneas)
- almanack: Reglas que crecen con cada corrección
- trae-agent: 7 pasos en system prompt

**Formato largo (overhead alto):**
- spec-kit: Constitution completa con Articles + gates + versioning
- Cortex-Template: Layer 0 con halt conditions + degradation matrix + autonomy rules

**Lo que funciona mejor:** Principios CORTOS e INMUTABLES en CLAUDE.md. No un archivo separado gigante. Los proyectos más efectivos (valet, ClaudeViewer, almanack) ponen los principios DENTRO de CLAUDE.md, no en constitution.md separado.

---

## 2. CLAUDE.md — ¿Qué contiene cada proyecto?

| # | Proyecto | Tiene CLAUDE.md? | Líneas aprox | Qué contiene |
|---|----------|-----------------|-------------|-------------|
| 1 | spec-kit | No (usa agents/) | — | — |
| 2 | claude-pipe | No | — | — |
| 3 | claude-mlx-tts | Sí | ~80 | Arquitectura, dev workflow, release process, gotchas |
| 4 | oh-my-claude | No (usa plugins/) | — | — |
| 5 | conv-temp | No | — | — |
| 6 | clawpal | Sí (cc.md) | ~200 | Referencia universal de Claude Code optimization |
| 7 | Cortex-Template | Sí (ejemplo) | ~50 | Bootstrap: paths, MCP config, agent detection |
| 8 | trae-agent | No (system prompt) | — | — |
| 9 | build-ledger | No | — | — |
| 10 | agentic-framework | Sí | <100 (L-0002) | Session start protocol, workflow, core rules, multi-agent safety |
| 11 | almanack | Sí | ~40 | Spec-Test-Lint cycle, development guidelines, language-specific standards |
| 12 | ClaudeViewer | Sí | ~60 | Error handling philosophy, dev commands, architecture overview |
| 13 | cc-warp | Sí (cc.md) | ~300 | Referencia completa (too long) |
| 14 | valet | Sí | ~150 | Project context, architecture map, locked decisions, code conventions, common patterns |

### Patrones de CLAUDE.md

**Lo que funciona (<100 líneas):**
- almanack (~40): Reglas de calidad + tooling por lenguaje
- ClaudeViewer (~60): Filosofía de error handling + commands + overview
- Cortex (~50): Bootstrap puro (paths, config, triggers)
- agentic-framework (<100): Protocol + workflow + rules (L-0002 learned this the hard way)

**Lo que NO funciona (>150 líneas):**
- cc-warp (~300): Demasiado — se convierte en referencia, no en instructions
- valet (~150): Casi demasiado pero compensa con locked decisions
- THYROX actual (~200): Demasiado

**El contenido ideal de CLAUDE.md (destilado de los 14 proyectos):**

```
1. Identidad del proyecto (1-2 líneas)
2. Locked decisions (5-10 reglas que NO se cuestionan)
3. Dónde encontrar más contexto (links a SKILL, focus.md, project-state)
4. Convenciones de commit (1-2 líneas)
5. Reglas de error (qué hacer cuando algo falla)
```

**Total: 30-50 líneas máximo.**

---

## 3. SKILL.md / Instructions — ¿Cómo lo implementa cada proyecto?

| # | Proyecto | Tiene SKILL? | Nombre | Líneas | Qué contiene |
|---|----------|-------------|--------|--------|-------------|
| 1 | spec-kit | No (usa commands/) | templates/commands/*.md | 800+ por command | Workflow detallado por fase |
| 2 | claude-pipe | No | — | — | — |
| 3 | claude-mlx-tts | No | — | — | — |
| 4 | oh-my-claude | Sí | plugins/stv/skills/*.md | 12 skills | Un SKILL.md por habilidad |
| 5 | conv-temp | No | — | — | — |
| 6 | clawpal | No | — | — | — |
| 7 | Cortex-Template | Parcial | agents/*.md | 90+ agentes | Un .md por agente/rol |
| 8 | trae-agent | Parcial | prompt/agent_prompt.py | ~100 | System prompt con metodología |
| 9 | build-ledger | No | — | — | — |
| 10 | agentic-framework | Sí | specs/ + instructions/ + skills/ | Distribuido | Three-layer (Constitution→Playbooks→State) |
| 11 | almanack | No | prompts/*.md | 2 prompts | Herramientas cognitivas reutilizables |
| 12 | ClaudeViewer | No | — | — | — |
| 13 | cc-warp | Parcial | sistema-otimizado/.claude/ | Distribuido | Agents + commands + modelos |
| 14 | valet | Parcial | packages/plugin-*/skills/*.md | 8 skills | Un skill por plugin |

### Patrones de SKILL

**Monolítico (un archivo grande):**
- THYROX actual: SKILL.md (288 líneas) — todo el workflow en un archivo
- trae-agent: System prompt (~100 líneas) — 7 pasos en un prompt

**Distribuido (múltiples archivos pequeños):**
- spec-kit: 9 command files (800+ líneas cada uno, cargados por fase)
- oh-my-claude: 12 SKILL.md (uno por habilidad)
- agentic-framework: Three-layer architecture (constitution → playbooks → state)
- valet: 8 skills (uno por plugin)
- Cortex: 90+ agents (uno por rol)

**Lo que funciona mejor:**

Los proyectos con SKILL distribuido (spec-kit, agentic-framework, valet) son más maduros que los monolíticos. Pero THYROX está en una fase temprana donde un SKILL monolítico reducido es apropiado.

**El SKILL ideal para THYROX ahora:**
- <100 líneas en SKILL.md (flujo esencial + links a references)
- Las 7 fases como resumen (2-3 líneas por fase)
- Links a references/ para detalles de cada fase
- Session artifacts table
- Naming conventions (link a conventions.md)
- Where outputs live table

**Cuando THYROX madure:** Distribuir en commands/ o skills/ por fase.

---

## 4. Relación CLAUDE.md ↔ SKILL.md — ¿Cómo se conectan?

| Patrón | Proyectos que lo usan | Cómo funciona |
|--------|----------------------|---------------|
| **CLAUDE.md = reglas, SKILL.md = workflow** | agentic-framework, THYROX | CLAUDE.md dice QUÉ reglas seguir. SKILL.md dice CÓMO trabajar. |
| **CLAUDE.md = todo, no hay SKILL** | almanack, ClaudeViewer, valet | CLAUDE.md contiene tanto reglas como workflow. No necesitan SKILL separado. |
| **CLAUDE.md = bootstrap, SKILL = agents** | Cortex-Template | CLAUDE.md solo bootstrappea. El trabajo lo definen los agents/ files. |
| **No hay CLAUDE.md, todo en commands/** | spec-kit | Los command files SON las instrucciones. No hay CLAUDE.md ni SKILL.md. |
| **System prompt = todo** | trae-agent | La metodología está en el system prompt de Python, no en archivos .md. |

### Para THYROX:

El patrón que mejor encaja es el de **agentic-framework** (CLAUDE.md = reglas, SKILL.md = workflow) porque:

1. THYROX ES un skill — necesita SKILL.md por definición de Anthropic
2. CLAUDE.md es el file que Claude Code lee SIEMPRE — debe ser corto
3. La separación reglas/workflow es clara y no se mezcla

Pero con la lección de L-0002: **ambos deben ser CORTOS.**

---

## 5. Constitution — ¿Archivo separado o dentro de CLAUDE.md?

| Patrón | Proyectos | Pros | Cons |
|--------|----------|------|------|
| **Constitution separada** | spec-kit, Cortex | Cambio formal requiere proceso | Otro archivo que mantener, puede no leerse |
| **Principios en CLAUDE.md** | valet (locked), almanack, ClaudeViewer | Siempre visible, siempre cargado | CLAUDE.md crece, mezcla niveles |
| **Sin constitution explícita** | claude-pipe, clawpal, conv-temp | Simple | Principios son implícitos, se olvidan |

### Para THYROX:

**Los principios van DENTRO de CLAUDE.md como "locked decisions."** No como constitution.md separada.

Razón: CLAUDE.md es lo que Claude Code lee SIEMPRE. Si los principios están en un archivo separado, Claude puede no leerlos. Si están en CLAUDE.md, los lee cada sesión.

La sección se llama "Locked Decisions" (como valet) o "Principles" (como almanack). 5-7 reglas máximo. No más.

---

## 6. Síntesis: Los 3 archivos de THYROX

### CLAUDE.md (<50 líneas)

**Contenido (destilado de los 14 proyectos):**
```
Línea 1-3:   Identidad (qué es THYROX, Level 2 bridge)
Línea 4-20:  Locked Decisions / Principles (5-7 reglas inmutables)
Línea 21-30: Estructura (dónde encontrar cada cosa)
Línea 31-40: Flujo de sesión (4 pasos: inicio, contexto, trabajo, cierre)
Línea 41-45: Links (SKILL.md, focus.md, now.md, project-state.md)
Línea 46-50: Convenciones mínimas (commits, naming)
```

### SKILL.md (<100 líneas)

**Contenido (destilado de los 14 proyectos):**
```
Línea 1-10:  Frontmatter + identidad (Level 1 motor)
Línea 11-15: Cuándo usar este skill (triggers)
Línea 16-50: 7 fases (3-5 líneas por fase: goal, pasos, gate, exit)
Línea 51-60: Session artifacts table (work-log, ADRs, epics — cuándo se crean)
Línea 61-70: Where outputs live table
Línea 71-80: File structure diagram
Línea 81-90: Naming conventions
Línea 91-95: Advanced references (links a references/)
Línea 96-100: Troubleshooting + key principles
```

### constitution.md → NO como archivo separado

Los principios van como "Locked Decisions" en CLAUDE.md. No se necesita constitution.md separado. Si algún principio necesita explicación extensa, va en references/conventions.md.

**El template constitution.md.template se mantiene en assets/** para cuando usuarios creen sus propios proyectos con THYROX. Pero THYROX mismo no necesita instanciar uno — sus principios van en CLAUDE.md.

---

**Última actualización:** 2026-03-28
