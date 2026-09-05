```yml
created_at: 2026-04-15 09:30:00
project: THYROX
topic: Deep-review v2.0 de patrones viables para meta-framework multi-metodología
author: NestorMonroy
status: Validado v2.0
```

# Deep-review v2.0: Patrones viables para meta-framework multi-metodología

> Actualizado con hallazgos de sub-análisis 2-9 (universal-pattern, markov-registry, jsonl-worktrees, frameworks cat1-6, técnicas)

---

## Scope de metodologías — v2.0

El análisis original cubría 5 metodologías. El scope ampliado es:

| Bloque | Metodologías / Técnicas | Skills propuestos |
|--------|------------------------|-------------------|
| **Cat 1 — Software Dev** | SDLC (1 marco) | 7 existentes |
| **Cat 2 — Mejora Calidad** | PDCA (4) + DMAIC (5) + Lean Six Sigma (5) | 14 nuevos |
| **Cat 3 — Resolución Problemas** | Problem Solving 8-step (8) + VACANTE | 8 nuevos |
| **Cat 4 — Planeación Estratégica** | Strategic Planning (5) + Strategic Management (4) | 9 nuevos |
| **Cat 5 — Consultoría** | Consulting General (5) + Consulting Thoucentric (7) | 12 nuevos |
| **Cat 6 — Análisis de Negocios** | Business Analysis Process (7) + BPA (6) | 13 nuevos |
| **BA/BABOK** | 6 knowledge areas (fuera de taxonomía de 12, dentro de scope THYROX) | 6 skills |
| **PMBOK / RUP / RM** | De análisis multi-flow previo | 17 skills |
| **Técnicas (T1-T3)** | RCA + Framework Analysis + NASA Logical Decomposition | 0 skills independientes |

**Total en registry post-FASE 39: ~73 skills** (66 Cat1-6 + 7 SDLC ya existente) o ~86 si incluyes PMBOK/RUP/RM de análisis anterior.

**BA/BABOK nota:** No pertenece a la taxonomía de 12 marcos (el usuario la excluyó del conteo final), pero sigue siendo relevante para THYROX como flujo no-secuencial con comportamiento especial. Ver sección BA/BABOK más adelante.

---

## Hallazgos del deep-review (claude-howto + ultimate-guide)

| Hallazgo | Dato | Fuente |
|----------|------|--------|
| `skills:` inyecta contenido completo | Full content, no lazy loading | `claude-howto/04-subagents:96` + `ultimate-guide:6496` |
| Cada skill hasta 5k tokens | SKILL.md < 500 líneas / < 5k tokens | `claude-howto/03-skills:59,578` |
| Límite de skills por agente | No documentado | — |
| No nested spawning | max depth=1 | `claude-howto/04-subagents:823` |
| Selección de agente | `description:` matching + `@name` explícito | `claude-howto:326-356` |
| Budget global Level 1 | 1% contexto ≈ 8,000 chars, 250 chars/skill | `claude-howto/03-skills:103` |
| Flujos no-secuenciales/DAG | No documentado — Agent Teams (experimental) es lo más cercano | `claude-howto/04-subagents:572-695` |
| JSONL nativo en Claude Code | Session transcripts, activity logs, analytics metrics | `ultimate-guide:10856` + hooks |
| WorktreeCreate/WorktreeRemove hooks | Hooks para ciclo de vida de worktrees | `claude-howto/06-hooks:179` |
| CLAUDE.md en worktrees | Compartido automáticamente en todos los worktrees del repo | `claude-howto/02-memory:481` |
| `isolation: worktree` en agentes | Subagente opera en branch aislada, auto-cleanup si sin cambios | `claude-howto/04-subagents:497` |
| transcript_path en hooks | Hooks reciben path del JSONL de la sesión actual en stdin | `claude-howto/06-hooks:437` |

---

## Tabla de impacto en contexto — v3.0 (200k tokens, modelo lazy-load corregido)

⚠️ **CORRECCIÓN v3.0:** El análisis v2.0 asumía carga eager de skills (Level 2 completo en arranque).
Confirmado en `claude-howto/03-skills/README.md:56-60`: los skills usan **3 niveles de carga**:
- **Level 1** (metadata): ~100 tokens/skill en startup — siempre en contexto
- **Level 2** (instructions): ~5k tokens — SOLO cuando el skill es invocado/activado
- **Level 3** (references): carga on-demand adicional

Con el scope actualizado de ~73 skills (vs ~25 del análisis original):

| Escenario | Skills en contexto | Tokens (Level 1 startup) | Tokens (Level 2 cuando activo) | % contexto arranque | Viable |
|-----------|-------------------|--------------------------|-------------------------------|--------------------|----|
| Coordinator global con 73 skills | 73 × Level 1 | **~7.3k tokens** | +5k por skill activo | **~3.6%** | ✅ Tokens OK |
| Coordinator global (análisis v2.0 — INCORRECTO) | ~~73 × 5k~~ | ~~365k~~ | — | ~~182%~~ | ❌ Cálculo inválido |
| Coordinator por metodología (4-8 skills) | 4-8 × Level 1 | ~400-800 tokens | +5k por skill activo | ~0.2-0.4% | ✅ Óptimo |
| State Machine + Registry (Pattern 5) | 1 coordinator + registry | ~500 tokens | +5k skill activo | ~0.25% | ✅ Óptimo |

**Conclusión corregida:** El Patrón 2 NO es inviable por tokens. Los 73 skills consumen solo ~7.3k tokens en Level 1 (3.6%). La razón para no usar Patrón 2 es **arquitectónica**: un solo coordinator para 6 tipos de flujo distintos (sequential, cyclic-adaptive, adaptive, non-sequential, etc.) produce lógica de routing compleja e imposible de mantener. Ver `pattern-decision-deep-review.md` para análisis completo.

---

## Análisis de los 5 patrones

### Patrón 1 — Skills independientes (sin delegación)

**Estructura:**
```
.claude/skills/
├── pdca-plan/SKILL.md     ← instrucciones PDCA Plan completas
├── dmaic-define/SKILL.md  ← instrucciones DMAIC Define completas
├── ba-context/SKILL.md    ← instrucciones BA Context & Understanding
└── ...                    ← cada skill: autónomo, sin dependencias
```

**Pros:**
- Máxima simplicidad — cada skill es una unidad independiente
- Context: solo 1 skill activo a la vez (~2.5% del contexto)
- Fácil de agregar nuevas metodologías — un SKILL.md nuevo es suficiente
- Backward compatible con el sistema actual de `phase == skill name`

**Contras:**
- Duplicación: "analizar antes de planificar" se repite en 73+ SKILL.md
- Sin coordinación metodológica — Claude no sabe qué skill viene después
- Para BA/BABOK (no-secuencial): el flujo queda en manos del usuario
- No escala documentalmente: 73 SKILL.md sin conexión entre ellos

**Fit por bloque:**
- Cat 1-3 (SDLC, PDCA, DMAIC, LSS, PS8): ✅ Bueno (flujos secuenciales, fácil de seguir)
- Cat 4-5 (Strategic Planning, Consulting): ✅ Bueno (secuenciales, aunque más complejos)
- Cat 6 BA/BPA: ⚠️ Limitado (el usuario debe saber qué área invocar en BA)
- BA/BABOK no-secuencial: ⚠️ Pobre — sin routing inteligente

**Veredicto: Viable como capa de implementación de cada skill. Insuficiente como arquitectura completa.**

---

### Patrón 2 — Agente coordinator global (todos los flujos)

**Estructura:**
```
.claude/agents/
└── thyrox-coordinator.md
    skills: pdca-plan, pdca-do, pdca-check, pdca-act,
            dmaic-define, dmaic-measure, dmaic-analyze, dmaic-improve, dmaic-control,
            lss-define, lss-measure, ...,
            ps-identify, ps-clarify, ...,
            sp-identify, sp-prioritize, ...,
            sm-scan, sm-formulate, ...,
            cp-initiation, cp-diagnosis, ...,
            ct-understand, ct-scope, ...,
            ba-context, ba-elicitation, ...,
            bpa-identify, bpa-map, ...,
            ... (~73 skills total)
```

**Contras (críticos):**
- **Context fatal:** ~73 skills × 5k tokens = ~365k tokens ≈ 182% del contexto en arranque
- Los skills en `skills:` se inyectan COMPLETOS al contexto inicial (confirmado)
- El desbordamiento es físico — la ventana de 200k no puede contener 365k de skills
- No hay lazy loading en Claude Code — no se puede cargar "solo el skill que se necesita"

**Veredicto: Inviable por overflow real del context window. Con 73 skills es matemáticamente imposible, no solo ineficiente.**

---

### Patrón 3 — Un agente coordinator por metodología ✓ Recomendado (corto plazo)

**Estructura:**
```
.claude/agents/
├── sdlc-coordinator.md     (skills: analyze, strategy, plan, structure, decompose, execute, track)
├── pdca-coordinator.md     (skills: pdca-plan, pdca-do, pdca-check, pdca-act)
├── dmaic-coordinator.md    (skills: dmaic-define, dmaic-measure, dmaic-analyze, dmaic-improve, dmaic-control)
├── lss-coordinator.md      (skills: lss-define, lss-measure, lss-analyze, lss-improve, lss-control)
├── ps-coordinator.md       (skills: ps-identify, ps-clarify, ps-target, ps-analyze, ps-implement, ps-check, ps-standardize, ps-reflect)
├── sp-coordinator.md       (skills: sp-identify, sp-prioritize, sp-develop, sp-implement, sp-update)
├── sm-coordinator.md       (skills: sm-scan, sm-formulate, sm-implement, sm-evaluate)
├── cp-coordinator.md       (skills: cp-initiation, cp-diagnosis, cp-planning, cp-implementation, cp-evaluation)
├── ct-coordinator.md       (skills: ct-understand, ct-scope, ct-analyze, ct-solutions, ct-plan, ct-implement, ct-monitor)
├── ba-coordinator.md       (skills: ba-context, ba-elicitation, ba-analysis, ba-design, ba-implementation, ba-testing, ba-evaluation)
├── bpa-coordinator.md      (skills: bpa-identify, bpa-map, bpa-analyze, bpa-improve, bpa-implement, bpa-monitor)
└── babok-coordinator.md    (skills: ba-planning, ba-elicitation, ba-lifecycle, ba-strategy, ba-analysis, ba-evaluation)
```

**Pros:**
- Context controlado: Solo el coordinator activo carga sus skills (~10-20% del contexto)
- Selección explícita: `@pdca-coordinator` o via `description:` matching
- Cada coordinator puede tener instrucciones específicas para su metodología
- BA/BABOK coordinator puede implementar lógica de routing no-secuencial
- Extensible: añadir metodología = añadir un coordinator + sus skills

**Contras con 12+ metodologías:**
- ~12 coordinators en `.claude/agents/` — mantenimiento no trivial
- ~73 skills nuevos en `.claude/skills/`
- Cada coordinator hardcodea la lista de skills de su metodología
- Agregar metodología nueva requiere modificar la lista de coordinators conocidos
- Mantenimiento de 12 coordinators × múltiples skills = acoplamiento fuerte

**Veredicto: Patrón óptimo a corto plazo (5-6 metodologías prioritarias). No escala a 12+ sin el Patrón 5.**

---

### Patrón 4 — Composición por referencia documental (complemento, no patrón principal)

**Estructura:** Dentro del SKILL.md de cualquier skill de metodología:

```markdown
# pdca-plan/SKILL.md

## Instrucciones

Seguir el proceso de workflow-analyze/SKILL.md con estas adaptaciones PDCA:
- Artefacto principal: {wp}-pdca-problem.md (no {wp}-analysis.md)
- El "problema" se identifica y planifica en esta fase, no se resuelve
- Gate obligatorio: Problema articulado y plan de mejora documentado antes de continuar
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

### Patrón 5 — State Machine genérica con Methodology Registry ✓ Objetivo largo plazo

**Motivación:** El Patrón 3 con 12+ coordinators hardcodeados es mantenimiento exponencial.
La solución correcta es una State Machine configurable basada en el fundamento de Markov chains.

**Fundamento teórico (de markov-probabilistic-registry-design.md):**

Un LLM es formalmente equivalente a una cadena de Markov de orden k (k = tamaño del context window):
- Sin THYROX: transiciones probabilísticas, memoria efímera, sin garantía de orden
- Con THYROX Registry: transiciones determinísticas via YAML, estado persistido en `now.md::phase`, memoria externa en git

```
LLM (cadena Markov probabilística)
  + Registry YAML (matriz de transición determinística)
  + now.md::phase (variable de estado en git)
  + Artefactos WP (memoria externa ilimitada)
  = Sistema determinístico con LLM como motor de ejecución
```

**Estructura:**
```
.thyrox/registry/methodologies/
├── sdlc.yml               # type: sequential, 7 steps
├── pdca.yml               # type: cyclic, 4 steps
├── dmaic.yml              # type: sequential, 5 steps
├── lean-six-sigma.yml     # type: sequential, 5 steps (Lean + DMAIC)
├── problem-solving-8.yml  # type: conditional, 8 steps
├── strategic-planning.yml # type: sequential, 5 steps
├── strategic-mgmt.yml     # type: cyclic, 4 steps
├── consulting-general.yml # type: sequential, 5 steps (alta flexibilidad)
├── consulting-thoucentric.yml  # type: sequential, 7 steps
├── business-analysis.yml  # type: sequential, 7 steps
├── bpa.yml                # type: iterative, 6 steps
└── babok.yml              # type: non-sequential, 6 knowledge areas

.claude/agents/
└── thyrox-coordinator.md  # UN SOLO coordinator genérico — lee el registry
```

**El coordinator genérico:**
```
1. Lee now.md::phase → estado actual (ej: "pdca-do")
2. Extrae prefijo → "pdca"
3. Carga .thyrox/registry/methodologies/pdca.yml
4. Busca step con id = "pdca-do" → next = ["pdca-check"]
5. Para type: conditional → evalúa condición del WP actual
6. Muestra estado actual + siguiente válido
7. Al confirmar → actualiza now.md::phase
```

El coordinator NO hardcodea ninguna metodología. Todo el conocimiento de flujo vive en los YAMLs.

**Agregar metodología #16:** crear 1 archivo YAML. Zero cambios en infraestructura.

---

## Los 5 tipos de flujo documentados

Identificados en el análisis de 12 marcos metodológicos:

| Tipo | Característica | Ejemplo | Patrón en Markov |
|------|---------------|---------|-----------------|
| **Secuencial** | A→B→C siempre, sin retorno | SDLC, DMAIC, LSS, PMBOK | Cadena lineal con estado absorbente al final |
| **Cíclico** | A→B→C→A, sin fin | PDCA, Strategic Management | Cadena recurrente, sin estado absorbente |
| **Iterativo** | Puede repetir fases o reiniciar ciclo | BPA, RUP | Estados recurrentes + posibles loops hacia atrás |
| **No-secuencial** | Cualquier orden válido | BA/BABOK | Grafo completo (todas las transiciones posibles) |
| **Condicional** | Siguiente depende de resultado | Problem Solving 8-step | Transiciones con condiciones de guardia (`on_success`/`on_failure`) |

**Schema YAML por tipo:**

```yaml
# Tipo: condicional (PS8 — si verificación falla, regresa a root cause)
- id: ps8-verify
  display: "PS8 — Verify & Validate"
  next:
    on_success: [ps8-prevent]
    on_failure: [ps8-rootcause]  # regresa si no resuelve

# Tipo: no-secuencial (BA/BABOK — todas las áreas son accesibles desde cualquier otra)
- id: ba-planning
  display: "BABOK — BA Planning & Monitoring"
  next: [ba-elicitation, ba-lifecycle, ba-strategy, ba-analysis, ba-evaluation]
```

---

## BA/BABOK — Flujo no-secuencial especial

Business Analysis según BABOK v3 — el diferenciador clave: **no hay orden prescrito**.

| Skill | Knowledge Area | Descripción |
|-------|---------------|-------------|
| `ba-planning` | BA Planning & Monitoring | Organizar esfuerzos BA, outputs como inputs a otras tareas |
| `ba-elicitation` | Elicitation & Collaboration | Actividades de elicitación, confirmar resultados, comunicación con stakeholders |
| `ba-lifecycle` | Requirements Life Cycle Management | Mantener requirements desde inception hasta retirement, traceability |
| `ba-strategy` | Strategy Analysis | Identificar business need, habilitar cambio, alinear estrategia |
| `ba-analysis` | Requirements Analysis & Design Definition | Estructurar requirements, modelar, validar, identificar opciones de solución |
| `ba-evaluation` | Solution Evaluation | Evaluar performance del sistema en uso, recomendar mejoras |

**Diferencia crítica frente a otras metodologías:**

> *"Business analysts perform tasks from all knowledge areas sequentially, iteratively, or simultaneously. The BABOK® Guide does not prescribe a process or an order in which tasks are performed."*

Esto rompe el modelo `phase == skill name` lineal de `now.md`. En BA/BABOK, el "estado" no es una fase en secuencia sino qué knowledge areas han sido tocadas y cuáles tienen outputs listos como inputs para otras.

**Implicación para el coordinator:**

El `babok-coordinator` es el único que necesita lógica de routing inteligente:
```markdown
Lee .thyrox/context/now.md::phase y .thyrox/context/focus.md.
Si la tarea del usuario es estratégica → invocar ba-strategy
Si la tarea es de elicitación → invocar ba-elicitation
Si no hay fase activa → preguntar cuál knowledge area abordar
No hay orden fijo — BA puede empezar con cualquier área.
```

Con Patrón 5, el type `non-sequential` en el YAML maneja esto automáticamente: el coordinator presenta todas las áreas disponibles y el usuario elige.

**`now.md` extendido para BA/BABOK:**
```yaml
flow: babok
phase: ba-elicitation          # tarea activa actual
ba_areas_touched: [ba-planning, ba-strategy]
ba_areas_pending: [ba-elicitation, ba-lifecycle, ba-analysis, ba-evaluation]
```

---

## Nueva infraestructura: JSONL + worktrees

### JSONL para observabilidad

Claude Code usa JSONL nativamente (session transcripts, activity logs, analytics metrics, calibration/learning). Adoptar JSONL en THYROX está alineado con los patrones nativos de la plataforma.

**`phase-history.jsonl` — log de transiciones de estado:**
```json
{"timestamp": "2026-04-15T09:30:00Z", "from": "sdlc-analyze", "to": "sdlc-strategy", "wp": "2026-04-15-...", "fase": 39}
```

- **Ubicación:** `.thyrox/context/phase-history.jsonl`
- **Implementación:** ~5 líneas adicionales en `sync-wp-state.sh` (ya existe y conoce el estado)
- **Habilitaría:** detección de stalls, tiempo por fase, validación de transiciones válidas
- **Patrón caliber:** `eventos → JSONL → análisis LLM periódico → CLAUDE.md` para aprendizaje continuo

**Arquitectura completa de capas de datos:**

| Capa | Formato | Propósito |
|------|---------|-----------|
| Configuración hermética | JSON | `settings.json`, permisos |
| Memoria viva | Markdown | `CLAUDE.md`, artefactos WP, ADRs |
| Governance/Registry | YAML | `registry/methodologies/*.yml` |
| Eventos raw | JSONL | `phase-history.jsonl`, transiciones |

Las tres primeras capas ya están implementadas. La capa JSONL es el gap que completa la arquitectura.

### `isolation: worktree` en subagentes

```yaml
---
name: dmaic-coordinator
isolation: worktree
description: "Coordinador DMAIC. Sigue Define→Measure→Analyze→Improve→Control."
---
```

- Cada metodología coordinator opera en su propio worktree (rama aislada)
- Auto-cleanup si sin cambios al terminar
- Si hay cambios: retorna path + branch name al agente principal para review/merge
- **CLAUDE.md compartido:** todos los worktrees del repo comparten el CLAUDE.md automáticamente — las convenciones THYROX están disponibles en todos los worktrees sin configuración adicional

**WorktreeCreate hook para testing:**
```bash
# .claude/hooks/hooks.json → WorktreeCreate
if [ ! -d ".thyrox" ]; then
  bash .thyrox/registry/bootstrap.sh --init
fi
```

Permite simular "primera instalación" en cada worktree de testing — habilita el testing de idempotencia de `thyrox-init.sh` sin contaminar el repo principal.

---

## GAPs identificados — tabla completa

| GAP | Descripción | Origen | Urgencia |
|-----|-------------|--------|----------|
| GAP-001 | plugin.json no soporta 73+ skills en `content` | plugin-distribution-analysis.md | Alta |
| GAP-002 | No hay coordinator para PMBOK/RUP/RM | análisis multi-flow | Alta |
| GAP-003 | `_phase_to_display()` no tiene display names para ~73 nuevos skills | session-start.sh | Media |
| GAP-004 | `now.md` no tiene campo `flow:` para metodologías no-SDLC | now.md structure | Media |
| GAP-005 | No hay registry de metodologías en `.thyrox/registry/methodologies/` | — | Media (largo plazo) |
| GAP-006 | SDLC skills existentes no tienen prefijo de metodología (`analyze` vs `sdlc-analyze`) | naming consistency | Baja |
| **GAP-007** | `WorktreeCreate`/`WorktreeRemove` hooks no están en `hooks.json` | jsonl-worktrees-analysis.md | Alta (bloquea testing) |
| **GAP-008** | `transcript_path` en hooks no está siendo usado por THYROX | jsonl-worktrees-analysis.md | Media |
| **GAP-009** | `isolation: worktree` en agentes de metodología no configurado | jsonl-worktrees-analysis.md | Media |
| **GAP-010** | `.claude/worktrees/` no está en `.gitignore` | jsonl-worktrees-analysis.md | Alta (riesgo de repo) |

**GAP-010** es el más urgente por ser riesgo de contaminación de repo sin ningún costo de remediación (una línea en `.gitignore`). **GAP-007** bloquea el testing de idempotencia.

---

## Recomendación final — arquitectura v2.0

```
Arquitectura para Phase 2 SOLUTION STRATEGY:

Corto plazo (FASE 39, Phase 6 EXECUTE):
├── Patrón 3: 4-5 coordinators para metodologías prioritarias
│   SDLC existente + PMBOK + RUP + DMAIC + BA/BABOK
├── Patrón 4: referencia documental dentro de cada skill
│   (reducir duplicación de workflow-* en phase-skills)
├── JSONL: phase-history.jsonl como infraestructura base
│   (~5 líneas en sync-wp-state.sh → observabilidad desde el inicio)
└── GAP-010: agregar .claude/worktrees/ a .gitignore (zero costo)

Largo plazo (FASE 40+):
├── Patrón 5: State Machine con Registry
│   Un coordinator genérico + YAML por metodología
│   Agregar metodología = crear 1 YAML, zero cambios de infraestructura
├── isolation: worktree para coordinators de metodología
│   Desarrollo paralelo real (DMAIC en worktree A, RUP en B)
├── WorktreeCreate hook → auto-init de estado THYROX (GAP-007)
└── Patrón caliber: JSONL → análisis periódico → CLAUDE.md learning
    (aprendizaje continuo sobre qué metodologías funcionan por tipo de proyecto)
```

**Consideración de compatibilidad crítica:**
El diseño del Registry (Patrón 5) debe comenzar durante la implementación del Patrón 3.
Los coordinators del Patrón 3 deben ser diseñados para ser reemplazables por el coordinator
genérico del Patrón 5 sin cambios en los skills. La interfaz `now.md::phase = "{metodologia}-{step}"`
es el contrato que hace compatible la transición Patrón 3 → Patrón 5.

---

## Impacto en infraestructura existente — v2.0

| Componente | Cambio con Patrón 3 (corto plazo) | Cambio con Patrón 5 (largo plazo) |
|-----------|----------------------------------|----------------------------------|
| `now.md` | Agregar campo `flow:` para metodologías no-SDLC | Sin cambio adicional |
| `session-start.sh` `_phase_to_command()` | Agregar prefijos de las 4-5 metodologías prioritarias | Reemplazar por `resolve-phase.py` que lee registry |
| `_phase_to_display()` | +display names para ~30-40 skills de corto plazo | Leer `display:` del YAML directamente |
| `sync-wp-state.sh` | +5 líneas para append a `phase-history.jsonl` | Sin cambio adicional |
| `workflow-*/SKILL.md` | Sin cambios | Sin cambios |
| `.claude/agents/` | +4-5 coordinators (PMBOK, RUP, DMAIC, BABOK) | Reemplazar por 1 coordinator genérico |
| `.claude/skills/` | +30-40 SKILL.md prioritarios | +73 total o incremental |
| `.thyrox/registry/methodologies/` | No existe → crear para diseño inicial | Poblar con YAML por metodología |
| `plugin.json` | Actualizar listado de skills | Dinámico desde registry |
| `.gitignore` | Agregar `.claude/worktrees/` (GAP-010) | Sin cambio adicional |

---

## Patrón universal de 9 pasos — implicación para THYROX SDLC

El sub-análisis `universal-pattern-methodology-landscape.md` confirmó que todos los marcos
metodológicos siguen el mismo patrón universal:

```
1. IDENTIFY / RECOGNIZE / INITIATE  — detectar necesidad o problema
2. DEFINE / CLARIFY                 — precisar scope, propósito
3. UNDERSTAND CONTEXT              — historia, stakeholders, sistemas
4. MEASURE / ASSESS                — cuantificar estado actual
5. ANALYZE                         — causas raíz, dinámicas
6. PLAN / STRATEGY / PRIORITIZE    — diseñar solución
7. EXECUTE / IMPLEMENT             — poner en acción
8. MONITOR / TRACK / CHECK         — evaluar resultados
9. STANDARDIZE / UPDATE / SUSTAIN  — hacer permanente
```

**La Phase 1 ANALYZE de THYROX ya implementa los pasos 1-3 implícitamente.** Los 8 aspectos
del análisis incluyen Objetivo, Stakeholders, Uso operacional, Restricciones y Contexto.
El nombre "ANALYZE" es impreciso para lo que realmente hace — debería llamarse "UNDERSTAND"
o "DISCOVER", pero es un cambio de naming que requiere su propia FASE y ADR.

**Esto valida que todos los flujos son instancias del mismo meta-proceso.** La State Machine
del Patrón 5 con un SKILL.md genérico por tipo de paso (identify, define, analyze, plan, execute,
monitor) inyectando el contexto de la metodología via registry es arquitectónicamente coherente
con este hallazgo.
