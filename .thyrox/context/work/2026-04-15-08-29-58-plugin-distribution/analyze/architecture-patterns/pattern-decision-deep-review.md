---
created_at: 2026-04-15 12:00:00
project: THYROX
topic: Deep-review — Corrección crítica: lazy-load de skills + arquitectura correcta para Phase 2
author: NestorMonroy
status: Validado
---

# Deep-review — Corrección crítica: lazy-load de skills + arquitectura correcta para Phase 2

## Sección 1: El supuesto incorrecto que afectó todos los análisis previos

Los documentos `multi-methodology-patterns-analysis.md` (original y v2.0), `universal-pattern-methodology-landscape.md`, y otros usaban este cálculo como base de la decisión arquitectónica:

```
73 skills × 5,000 tokens = 365,000 tokens = 182% del context window (200k) → OVERFLOW
```

**Este cálculo es INCORRECTO.** Asumía que los skills se cargan TODOS en el contexto al startup. Los docs de referencia dicen lo contrario.

---

## Sección 2: El modelo real de carga de skills — 3 niveles

**Fuente:** `claude-howto/03-skills/README.md`, líneas 56-60

Cita textual:
```
| Level 1: Metadata    | Always (at startup)       | ~100 tokens per Skill | name and description from YAML frontmatter |
| Level 2: Instructions | When Skill is triggered   | Under 5k tokens       | SKILL.md body with instructions and guidance |
| Level 3+: Resources  | As needed                 | Effectively unlimited | Bundled files executed via bash without loading |
```

**Lo que esto significa:**
- Nivel 1 (metadata): ~100 tokens por skill, cargado al startup → 73 skills = **~7,300 tokens** (3.6% del context window)
- Nivel 2 (instrucciones): ~5k tokens, cargado SOLO cuando el skill se invoca
- En cualquier momento solo hay 1-2 skills activos → máximo ~10k tokens en instrucciones

**Cálculo correcto:**
```
Startup:         73 skills × 100 tokens metadata = 7,300 tokens   (3.6%)
Skill activo:    1 skill × 5,000 tokens instrucciones = 5,000 tokens (2.5%)
Coordinator:     ~5,000 tokens                                      (2.5%)
Conversación:    ~10,000-30,000 tokens típicos                      (5-15%)
─────────────────────────────────────────────────────────────────────────
Total típico:    ~27,300-47,300 tokens                              (13.6-23.7%)
Context disponible para trabajo real: ~150,000-170,000 tokens       (75-85%)
```

---

## Sección 3: Impacto en la evaluación de patrones

Con el modelo correcto de carga:

| Patrón | Evaluación anterior | Evaluación correcta |
|--------|--------------------|--------------------|
| **Patrón 1** (skills independientes) | Viable | Viable — sin cambio |
| **Patrón 2** (coordinator global con TODOS los skills) | ❌ INVIABLE (365k overflow) | ⚠️ **RECONSIDERAR** — el metadata de 73 skills son solo 7.3k tokens. El problema no es de tokens sino de arquitectura: ¿tiene sentido un solo coordinator para 6 tipos de flujo? |
| **Patrón 3** (un coordinator por metodología) | ✅ Recomendado por contexto controlado | La razón original ya no aplica. Se debe evaluar por criterios arquitectónicos, no de tokens |
| **Patrón 4** (referencia documental) | Complemento | Sin cambio |
| **Patrón 5** (State Machine + Registry) | Recomendado para largo plazo | ✅ **SIGUE SIENDO CORRECTO** pero por las razones correctas: flexibilidad, extensibilidad, correctitud arquitectónica — NO por restricción de tokens |

---

## Sección 4: Nuevos mecanismos descubiertos que cambian el diseño

### `context: fork` en skills

**Fuente:** `claude-howto/03-skills/README.md`, líneas 153-154 y 288

Cita:
> Add `context: fork` to run a skill in an isolated subagent context. The skill content becomes the task for a dedicated subagent with its own context window, keeping the main conversation uncluttered.

Implicación para THYROX: cada skill de metodología puede ejecutarse en su propio context window aislado. El coordinator principal no se contamina con el contexto de ejecución del skill.

```yaml
# En SKILL.md frontmatter:
context: fork
agent: Explore  # o cualquier tipo especializado
```

### `Agent(agent_type)` syntax en `tools:` — routing explícito

**Fuente:** `claude-howto/04-subagents/README.md`, líneas 534-548

Cita:
> You can control which subagents a given subagent is allowed to spawn by using the `Agent(agent_type)` syntax in the `tools` field. This provides a way to allowlist specific subagents for delegation.

```yaml
---
name: thyrox-coordinator
tools: Agent(dmaic-define, dmaic-measure, pdca-plan, pdca-do, ...), Read, Bash
---
```

Implicación: el coordinator tiene una **allowlist explícita** de skills que puede invocar. Esto es routing determinístico, no LLM probabilístico.

### Hooks leen archivos del proyecto (incluyendo YAML del registry)

**Fuente:** `claude-howto/06-hooks/README.md`, líneas 199 y 775-795

Los hooks tienen acceso a `$CLAUDE_PROJECT_DIR` y pueden leer cualquier archivo. Un hook puede:
1. Leer `now.md::phase`
2. Cargar el YAML del registry correspondiente
3. Pasar esa información como `additionalContext` al coordinator

### `memory: project` en subagentes — persistencia cross-session

**Fuente:** `claude-howto/04-subagents/README.md`, líneas 415-430

Cita:
> The `memory` field gives subagents a persistent directory that survives across conversations.

Los coordinators de metodología pueden mantener estado entre sesiones usando `memory: project`.

---

## Sección 5: La arquitectura correcta para Phase 2

Con la información real de los docs, la arquitectura óptima es:

```
.claude/agents/
└── thyrox-coordinator.md
    ---
    name: thyrox-coordinator
    description: "Coordinator del meta-framework THYROX. Lee now.md::phase y registry para determinar flujo activo."
    tools: Agent(dmaic-define, dmaic-measure, dmaic-analyze, dmaic-improve, dmaic-control,
                 pdca-plan, pdca-do, pdca-check, pdca-act,
                 sdlc-analyze, sdlc-strategy, ...,
                 cp-initiation, cp-diagnosis, ...),
           Read, Bash
    memory: project
    ---
    
    Lee .thyrox/context/now.md::phase.
    Lee .thyrox/registry/methodologies/{methodology}.yml.
    Basado en el type del flujo:
    - sequential: propón el siguiente paso
    - adaptive: pregunta qué se completó, qué sigue
    - cyclic: determina si ciclo completo o continúa
    Invoca el skill correspondiente de la allowlist.
```

**Razones por las que Patrón 5 es correcto (reales, no las erróneas):**
1. **Extensibilidad**: agregar metodología = crear YAML + skills. No tocar el coordinator.
2. **Correctitud arquitectónica**: el coordinator no necesita conocer cada metodología. Lee el registry.
3. **Mantenibilidad**: 6 tipos de flujo en la lógica del coordinator vs 12 metodologías hardcodeadas.
4. **Flexibilidad adaptativa**: el YAML define `type: adaptive` → el coordinator sabe que debe preguntar, no prescribir.
5. **No por restricción de tokens**: 73 skills × 100 tokens = 7.3k — perfectamente manejable.

---

## Sección 6: Correcciones pendientes en documentos del WP

Estos documentos contienen el cálculo incorrecto y deben actualizarse:

| Documento | Qué dice (incorrecto) | Corrección necesaria |
|-----------|----------------------|---------------------|
| `multi-methodology-patterns-analysis.md` (v2.0) | "73 skills × 5k = 365k = 182% overflow → Patrón 2 físicamente imposible" | El overflow es del cálculo de Level 2 eager. Con lazy-load: 73 × 100 = 7.3k. Patrón 2 reconsiderable por razones arquitectónicas, no de tokens |
| `universal-pattern-methodology-landscape.md` | Misma tabla de impacto con 62%/overflow | Actualizar con números correctos |
| `multi-flow-detection-analysis.md` (original) | Tabla con % de contexto basados en 5k/skill | Actualizar |

---

## Sección 7: Lo que no cambia

A pesar de la corrección del cálculo de tokens, las conclusiones arquitectónicas principales **siguen siendo válidas**:

1. **Patrón 5 sigue siendo la arquitectura correcta** — pero por razones de diseño, no de tokens
2. **Un coordinator por tipo de flujo** (no por metodología) es mejor que un coordinator global — la complejidad del tipo `adaptive` vs `sequential` justifica coordinators distintos
3. **El registry YAML es necesario** — independientemente de los tokens, el hardcoding de 12 metodologías en un coordinator no escala
4. **`now.md::phase`** sigue siendo la variable de estado correcta
5. **Hooks para state transitions** siguen siendo el mecanismo correcto
