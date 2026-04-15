```yml
created_at: 2026-04-15 09:30:00
project: THYROX
topic: Deep-review de patrones viables para multi-metodología
author: NestorMonroy
status: Borrador
```

# Deep-review: Patrones viables para meta-framework multi-metodología

## Metodologías en scope

| Metodología | Tipo de flujo | Pasos | Skills |
|-------------|--------------|-------|--------|
| **SDLC** (existente) | Secuencial estricto | 7 fases | analyze, strategy, plan, structure, decompose, execute, track |
| **PMBOK 8** | Secuencial con solapamiento | 5 process groups | pm-init, pm-plan, pm-execute, pm-monitor, pm-close |
| **RUP** | Iterativo secuencial | 5 fases | rup-inception, rup-elaboration, rup-construction, rup-transition |
| **RM** | Secuencial con feedback | 7 pasos | rm-inception, rm-elicitation, rm-elaboration, rm-negotiation, rm-specification, rm-validation, rm-management |
| **BA/BABOK** | **No-secuencial (task-driven)** | 6 áreas | ba-planning, ba-elicitation, ba-lifecycle, ba-strategy, ba-analysis, ba-evaluation |

`requirements` es transversal a RUP y RM — skill independiente (ver análisis anterior).

---

## Hallazgos del deep-review (claude-howto + ultimate-guide)

| Hallazgo | Dato | Fuente |
|----------|------|--------|
| `skills:` inyecta contenido completo | Full content, no lazy loading | `claude-howto/04-subagents:96` + `ultimate-guide:6496` |
| Cada skill up to 5k tokens | SKILL.md < 500 líneas / < 5k tokens | `claude-howto/03-skills:59,578` |
| Límite de skills por agente | **No documentado** | — |
| No nested spawning | max depth=1 | `claude-howto/04-subagents:823` |
| Selección de agente | `description:` matching + `@name` explícito | `claude-howto:326-356` |
| Budget global Level 1 | 1% contexto ≈ 8,000 chars, 250 chars/skill | `claude-howto/03-skills:103` |
| Flujos no-secuenciales/DAG | **No documentado** — Agent Teams (experimental) es lo más cercano | `claude-howto/04-subagents:572-695` |
| BMAD implementación | **No documentada** en referencias | `competitive-analysis:15` |

**Cálculo de impacto en contexto (200k tokens):**

| Escenario | Skills cargados | Tokens usados | % contexto |
|-----------|----------------|---------------|-----------|
| Un coordinator global (todos) | ~25 skills × 5k | ~125k tokens | ~62% |
| Un coordinator por metodología | 5-7 skills × 5k | ~25-35k tokens | ~12-17% |
| Skill individual sin coordinator | 1 skill | ~5k tokens | ~2.5% |

**Conclusión crítica:** Un solo coordinator con todos los skills es inviable — consume 62% del contexto en carga inicial.

---

## Análisis de los 4 patrones

### Patrón 1 — Skills independientes (sin delegación)

**Estructura:**
```
.claude/skills/
├── pm-init/SKILL.md       ← instrucciones PMBOK Initiating completas
├── pm-plan/SKILL.md       ← instrucciones PMBOK Planning completas
├── rup-inception/SKILL.md ← instrucciones RUP Inception completas
├── ba-planning/SKILL.md   ← instrucciones BA Planning completas
└── ...                    ← cada skill: autónomo, sin dependencias
```

**Pros:**
- Máxima simplicidad — cada skill es una unidad independiente
- Context: solo 1 skill activo a la vez (~2.5% del contexto)
- Fácil de agregar nuevas metodologías — un SKILL.md nuevo es suficiente
- Backward compatible con el sistema actual de `phase == skill name`

**Contras:**
- Duplicación: "analizar antes de planificar" se repite en 25+ SKILL.md
- Sin coordinación metodológica — Claude no sabe qué skill viene después
- Para BA/BABOK (no-secuencial): el flujo queda completamente en manos del usuario saber qué invocar

**Fit por metodología:**
- SDLC: ✅ Excelente (ya funciona así)
- PMBOK: ✅ Bueno (5 pasos secuenciales, fácil de seguir)
- RUP: ✅ Bueno (5 fases claras)
- RM: ✅ Bueno (7 pasos secuenciales)
- BA/BABOK: ⚠️ Pobre — el usuario debe saber qué knowledge area invocar

**Veredicto: Viable para SDLC/PMBOK/RUP/RM. Insuficiente para BA/BABOK.**

---

### Patrón 2 — Agente coordinator global (todos los flujos)

**Estructura:**
```
.claude/agents/
└── thyrox-coordinator.md
    skills: pm-init, pm-plan, pm-execute, pm-monitor, pm-close,
            rup-inception, requirements, rup-elaboration, rup-construction, rup-transition,
            rm-inception, rm-elicitation, ...,
            ba-planning, ba-elicitation, ba-lifecycle, ba-strategy, ba-analysis, ba-evaluation
```

**Pros:**
- Un único punto de entrada
- El coordinator puede leer `now.md::phase` y saber cuál flujo está activo
- Puede hacer routing entre metodologías

**Contras (críticos):**
- **Context fatal:** 25 skills × 5k tokens = 125k tokens ≈ 62% del contexto en arranque
- Los skills en `skills:` se inyectan COMPLETOS al contexto inicial (confirmado)
- Con 62% del contexto ocupado por skills, queda poco espacio para el trabajo real
- No hay lazy loading — no se puede cargar "solo el skill que se necesita" dinámicamente

**Veredicto: Inviable por consumo de contexto.**

---

### Patrón 3 — Un agente coordinator por metodología ✓ Recomendado

**Estructura:**
```
.claude/agents/
├── sdlc-coordinator.md    (skills: analyze, strategy, plan, structure, decompose, execute, track)
├── pmbok-coordinator.md   (skills: pm-init, pm-plan, pm-execute, pm-monitor, pm-close)
├── rup-coordinator.md     (skills: rup-inception, requirements, rup-elaboration, rup-construction, rup-transition)
├── rm-coordinator.md      (skills: rm-inception, rm-elicitation, rm-elaboration, rm-negotiation,
│                                   rm-specification, rm-validation, rm-management)
└── ba-coordinator.md      (skills: ba-planning, ba-elicitation, ba-lifecycle,
                                    ba-strategy, ba-analysis, ba-evaluation)
```

**Pros:**
- **Context controlado:** Solo el coordinator activo carga sus skills (~12-17% del contexto)
- Selección explícita: `@pmbok-coordinator` o via `description:` matching
- Cada coordinator puede tener instrucciones específicas para su metodología
- BA-coordinator puede implementar lógica de routing no-secuencial (ver sección BA)
- Extensible: añadir Scrum, Kanban = añadir un coordinator + sus skills

**Contras:**
- 5 agentes adicionales en `.claude/agents/`
- El usuario necesita saber qué coordinator invocar (o que Claude lo detecte por `description:`)
- Max depth=1: el coordinator no puede lanzar sub-coordinators

**Fit para BA/BABOK:**
El `ba-coordinator` puede implementar routing no-secuencial:

```markdown
# ba-coordinator
Lee .thyrox/context/now.md::phase y .thyrox/context/focus.md.
Si la tarea del usuario es estratégica → invocar ba-strategy
Si la tarea es de elicitación → invocar ba-elicitation
Si no hay fase activa → preguntar cuál knowledge area abordar
No hay orden fijo — BA puede empezar con cualquier área.
```

**Veredicto: Patrón óptimo. Contexto controlado + soporte para no-secuencial.**

---

### Patrón 4 — Composición por referencia documental (complemento, no patrón principal)

**Estructura:** Dentro del SKILL.md de cualquier skill de metodología:

```markdown
# pm-init/SKILL.md

## Instrucciones

Seguir el proceso de workflow-analyze/SKILL.md con estas adaptaciones PMBOK:
- Artefacto principal: {wp}-project-charter.md (no {wp}-analysis.md)
- Los "8 aspectos SDLC" se mapean a: Business Case, Feasibility, Stakeholder Register...
- Gate obligatorio: Project Charter aprobado por sponsor antes de continuar
```

**Pros:**
- Sin overhead de contexto — no carga workflow-* completo
- Claude puede seguir "sigue X con adaptaciones Y" si el SKILL.md está bien escrito
- Permite reusar principios de workflow-* sin duplicar texto completo

**Contras:**
- Probabilístico — depende de que Claude interprete correctamente la referencia
- Si workflow-analyze/SKILL.md cambia, la referencia puede quedar desactualizada
- No es composición técnica — es instrucción en lenguaje natural

**Veredicto: Usar como complemento del Patrón 1 o 3, no como patrón principal.**

---

## BA/BABOK — Las 6 Knowledge Areas

Business Analysis según BABOK v3 — el diferenciador clave: **no hay orden prescrito**.

| Skill | Knowledge Area | Descripción |
|-------|---------------|-------------|
| `ba-planning` | Business Analysis Planning & Monitoring | Organizar esfuerzos BA, outputs como inputs a otras tareas |
| `ba-elicitation` | Elicitation & Collaboration | Actividades de elicitación, confirmar resultados, comunicación con stakeholders |
| `ba-lifecycle` | Requirements Life Cycle Management | Mantener requirements desde inception hasta retirement, traceability |
| `ba-strategy` | Strategy Analysis | Identificar business need, habilitar cambio, alinear estrategia |
| `ba-analysis` | Requirements Analysis & Design Definition | Estructurar requirements, modelar, validar, identificar opciones de solución |
| `ba-evaluation` | Solution Evaluation | Evaluar performance del sistema en uso, recomendar mejoras |

**Técnicas transversales (no son skills separados — se usan dentro de cada área):**
- Use Case Modeling (Jacobson/UML)
- Business Process Modeling
- Data Dictionary
- Decision Analysis

**Diferencia crítica frente a otras metodologías:**

> *"Business analysts perform tasks from all knowledge areas sequentially, iteratively, or simultaneously. The BABOK® Guide does not prescribe a process or an order in which tasks are performed."*

Esto rompe el modelo `phase == skill name` de `now.md`. En BA, el "estado" no es una fase lineal sino qué knowledge areas han sido tocadas y cuáles tienen outputs listos como inputs para otras.

**Tarea de entrada sugerida:**
> *"Although a business analysis initiative may start with any task, likely candidates are Analyze Current State or Measure Solution Performance."*

Esto mapea a `ba-strategy` (Analyze Current State) o `ba-evaluation` (Measure Solution Performance).

### `now.md` extendido para BA

En lugar de `phase: ba-planning` (implica secuencia), usar estado de áreas completadas:

```yaml
flow: ba
# En BA, el "phase" es la tarea activa, no la fase en secuencia
phase: ba-elicitation
# Estado de knowledge areas completadas
ba_areas_touched: [ba-planning, ba-strategy]
ba_areas_pending: [ba-elicitation, ba-lifecycle, ba-analysis, ba-evaluation]
```

O más simple: `phase: ba-elicitation` funciona igual — indica la tarea activa sin prescribir lo que viene antes/después.

---

## Recomendación final: Patrón 3 + Patrón 4 como complemento

```
Arquitectura recomendada:
├── Patrón 1 (skills independientes) → implementación de cada skill
├── Patrón 3 (un coordinator por metodología) → orquestación y dispatch
└── Patrón 4 (referencia documental) → dentro de cada skill, referenciar workflow-*
```

**Por qué Patrón 3:**
1. Context controlado: un coordinator activo = 5-7 skills × 5k = 25-35k tokens (~15%)
2. BA-coordinator maneja la no-secuencialidad nativamente
3. Cada coordinator puede tener lógica de "qué sigue" específica a su metodología
4. Extensible sin tocar session-start.sh (solo añadir coordinator + skills)

**Para BA específicamente:**
El `ba-coordinator` es el único que necesita lógica de routing inteligente.
Los otros coordinators (PMBOK, RUP, RM) son simples dispatchers secuenciales.

---

## Impacto en infraestructura existente

| Componente | Cambio con Patrón 3 |
|-----------|---------------------|
| `now.md` | Agregar campo `flow:` opcional para BA (fase sigue siendo el skill activo) |
| `session-start.sh` | `_phase_to_command()` ya funciona con `phase == skill name` |
| `_phase_to_display()` | Agregar display names para los ~25 nuevos skills |
| `workflow-*/SKILL.md` | Sin cambios |
| `.claude/agents/` | +5 coordinators (pmbok, rup, rm, ba, sdlc) |
| `.claude/skills/` | +25 nuevos SKILL.md de metodología |
| `plugin.json` | Listado de todos los skills |
