```yml
created_at: 2026-04-15 09:15:00
project: THYROX
topic: Restricciones de composición — implicaciones para multi-metodología
author: NestorMonroy
status: Borrador
```

# Sub-análisis: Restricciones de composición de skills/agentes

## Hallazgos del deep-review (validados)

**Fuentes:** `/tmp/reference/claude-howto/` y `/tmp/reference/claude-code-ultimate-guide/`

| Capacidad | Soportada | Fuente |
|-----------|-----------|--------|
| Skill invoca a otro skill | **NO** | No documentado en ningún archivo |
| Agente pasa `skills:` a subagente | **SÍ** | `claude-howto/04-subagents/README.md:96` |
| Subagente lanza sub-subagente | **NO** | `max depth=1` — `llms-full.txt:45` |
| Coordinador delega a workers | **SÍ** | `04-subagents/README.md:402` |
| Commands pueden invocar skills | **NO** | Commands = Skills (fusionados) `01-slash-commands:132` |

**Cita exacta sobre el límite:**
> *"Sub-agents: isolated context, max depth=1"*
> — `llms-full.txt:45`

> *"No nested spawning — Subagents cannot spawn other subagents"*
> — `04-subagents/README.md:823`

---

## Lo que invalida del análisis anterior

El sub-análisis `multi-flow-detection-analysis.md` propuso que los skills de
metodología (pm-*, rup-*, rm-*) fueran **"thin wrappers que delegan a workflow-*"**.

**Esto no es posible.** Un SKILL.md no puede invocar programáticamente a otro
SKILL.md. Los skills son instrucciones inyectadas al contexto — no tienen
capacidad de llamada entre sí.

El patrón propuesto era:
```
/thyrox:pm-init → (delegated to) → workflow-analyze
```
Esto NO funciona como delegación técnica. Lo que sí funciona es que
`pm-init/SKILL.md` contenga instrucciones en lenguaje natural que le digan
a Claude "sigue la misma metodología de workflow-analyze con estas adaptaciones".
Es composición por referencia documental, no por invocación de código.

---

## `requirements` como flujo independiente completo

El usuario identificó correctamente que `/thyrox:requirements` tiene sus propios
pasos detallados (Requirements Management — RM), no es solo una fase de RUP.

**Los 7 pasos del flujo RM:**

| Paso | Skill | Descripción |
|------|-------|-------------|
| 1 | `rm-inception` | Context-free problem framing, stakeholder identification |
| 2 | `rm-elicitation` | Meetings, facilitador, objects/services/constraints lists |
| 3 | `rm-elaboration` | Analysis model, technical specification del software |
| 4 | `rm-negotiation` | Priority points entre stakeholders, resolución de conflictos |
| 5 | `rm-specification` | SRS: written doc, UML models, prototypes, formal models |
| 6 | `rm-validation` | Quality standards: abstraction level, necessity, unambiguity |
| 7 | `rm-management` | Change control, traceability matrix (requirement × aspect) |

**Técnica transversal:** Use Case Modeling (Jacobson 1991, UML) — aplica en
elicitation, elaboration y specification. No es un paso sino una herramienta.

**`requirements` no puede ser un skill único** que ejecute los 7 pasos —
la plataforma no tiene loops o sub-invocaciones dentro de un SKILL.md.
Debe ser una **serie de skills independientes** con su propio flujo de sesión.

---

## Dos patrones viables para multi-metodología

### Patrón 1 — Skills independientes (sin delegación)

Cada skill de metodología es completamente autónomo. Contiene sus propias
instrucciones sin depender de `workflow-*`.

```
pm-init/SKILL.md        ← instrucciones PMBOK completas (no referencia workflow-analyze)
pm-plan/SKILL.md        ← instrucciones PMBOK Planning completas
rup-inception/SKILL.md  ← instrucciones RUP Inception completas
rm-inception/SKILL.md   ← instrucciones RM Inception completas
...
```

**Pros:** Simple, sin dependencias entre skills.
**Contras:** Duplicación — los principios de "analizar antes de planificar"
se repiten en múltiples SKILL.md. Mantenibilidad baja.

### Patrón 2 — Agente coordinator con skills por metodología ✓ Recomendado

Un agente `.claude/agents/` con `skills:` puede precargar el skill correcto
según el flujo activo. El agente actúa como dispatcher de metodología.

```yaml
# .claude/agents/thyrox-coordinator.md
---
name: thyrox-coordinator
description: "Dispatch al flujo de metodología correcto según now.md::phase"
tools: Agent, Read, Bash
skills: thyrox
---

Lee .thyrox/context/now.md::phase y activa el skill de metodología correcto.
Si phase == "pm-init": ejecutar workflow PMBOK Initiating
Si phase == "rup-inception": ejecutar workflow RUP Inception
Si phase == "rm-inception": ejecutar workflow RM Inception
```

O más granular — un agente por metodología:

```yaml
# .claude/agents/pmbok-coordinator.md
---
skills: pm-init, pm-plan, pm-execute, pm-monitor, pm-close
---
```

```yaml
# .claude/agents/rup-coordinator.md
---
skills: rup-inception, requirements, rup-elaboration, rup-construction, rup-transition
---
```

**Pros:** Composición real vía `skills:` en agentes. Skills ligeros.
**Contras:** Añade una capa de agentes. Max depth=1 sigue siendo un límite.

### Patrón 3 — Composición por referencia documental (fallback)

Dado el límite de profundidad, los skills de metodología pueden referenciar
`workflow-*` en lenguaje natural en sus instrucciones:

```markdown
# pm-init/SKILL.md
...
## Instrucciones

Seguir el proceso de Phase 1 ANALYZE de workflow-analyze/SKILL.md con estas adaptaciones:
- El artefacto principal es `{wp}-project-charter.md` (no `{wp}-analysis.md`)
- Los "8 aspectos" se mapean a los 40 procesos del grupo Initiating de PMBOK 8
```

**Funciona porque:** Claude Code inyecta el contenido del SKILL.md al contexto.
Claude (el LLM) puede seguir instrucciones que digan "sigue tal metodología".
No es delegación técnica — es instrucción documental.

**Pros:** Sin cambios de arquitectura, sin agentes adicionales.
**Contras:** Depende de que Claude interprete la referencia correctamente.
No hay garantía de ejecución — es probabilístico.

---

## Implicación para el diseño de `requirements`

Dado que RM tiene 7 pasos y skills no pueden delegarse entre sí, las opciones son:

**Opción A:** 7 skills `rm-*` independientes con flujo propio
→ `/thyrox:rm-inception` → `/thyrox:rm-elicitation` → … → `/thyrox:rm-management`

**Opción B:** 1 skill `requirements` con instrucciones que guíen los 7 pasos
en la misma sesión (como workflow-analyze que cubre todos sus sub-aspectos en una)

**Opción C:** Agente `requirements-manager` con `skills: rm-inception, rm-elicitation, ...`
que orquesta el flujo completo

La decisión entre A, B o C afecta si `/thyrox:requirements` es:
- Un **entry point** que lanza el flujo de 7 pasos (Opción A)
- Un **skill monolítico** que guía todo en una sesión (Opción B)
- Un **agente coordinator** para RM (Opción C)

---

## Qué corregir en el análisis anterior

En `multi-flow-detection-analysis.md` — sección "Mapa de delegación":

| Antes (incorrecto) | Ahora (correcto) |
|-------------------|-----------------|
| `pm-init` → delega a `workflow-analyze` | `pm-init` contiene instrucciones PMBOK completas **o** referencia documental a workflow-analyze |
| thin wrapper técnico | skill autónomo o referencia por instrucción |

La infraestructura de detección (`now.md::phase`, `session-start.sh`) sigue siendo
válida. Lo que cambia es el contenido interno de los skills.

---

## Resumen

**Confirmado:** Skills no pueden invocar skills. Subagentes max depth=1.

**`requirements` es un flujo completo de 7 pasos**, no una fase de RUP.
Requiere su propia serie de skills (`rm-*`) o un skill monolítico guiado.

**Patrón recomendado para meta-framework:**
- Skills de metodología: **autónomos** (Patrón 1) con **referencia documental** a workflow-* (Patrón 3)
- Para coordinación compleja: **agente coordinator** con `skills:` preloaded (Patrón 2)
- La detección de flujo (`phase == skill name`) sigue siendo la solución correcta
