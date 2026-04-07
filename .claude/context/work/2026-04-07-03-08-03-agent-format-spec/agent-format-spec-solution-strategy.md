```yml
type: Estrategia de Solución
work_package: 2026-04-07-03-08-03-agent-format-spec
created_at: 2026-04-07 03:32:14
status: Borrador
phase: Phase 2 — SOLUTION_STRATEGY
```

# Estrategia de Solución: agent-format-spec

## Key Ideas

1. **`description` es el campo de routing** — es el único campo que Claude Code usa para seleccionar un agente automáticamente. Un `description: >` vacío (como en `nodejs-expert` y `react-expert`) hace al agente invisible para el routing.

2. **Registry YML y agente nativo son formatos distintos con propósitos distintos** — el registry es un schema amplio de configuración; el agente nativo es el subconjunto mínimo que Claude Code interpreta. El generador debe transformar, no copiar.

3. **Un agente bien formado es legible por humanos y por el sistema de routing** — los 4 agentes de workflow son el benchmark de calidad. La spec codifica lo que hacen implícitamente.

---

## Research por GAP

### GAP-1: Sin spec formal de campos

**Alternativa A — Reference markdown en `references/agent-spec.md`**
- Pros: sigue la anatomía del framework (references/ = documentación bajo demanda), editable como markdown, referenciable desde SKILL.md
- Contras: no es ejecutable (no valida automáticamente)

**Alternativa B — Schema YAML formal en `registry/`**
- Pros: potencialmente validable con jsonschema
- Contras: rompe la anatomía del framework, introduce un formato nuevo, requiere tooling adicional

**Decisión: Alternativa A.** La spec vive en `references/agent-spec.md`. La validación ejecutable la hace el linter (GAP-3).

---

### GAP-2: Sin convención para `description` de calidad

**Alternativa A — Patrón obligatorio `{qué hace}. Usar cuando {condición}.`**
- Pros: claro, reproduce lo que los 4 buenos agentes ya hacen, fácil de enseñar
- Contras: puede ser demasiado rígido para casos edge

**Alternativa B — Longitud mínima + prohibición de `>`**
- Pros: flexible, fácil de validar en linter
- Contras: permite descriptions largas pero inútiles

**Decisión: Ambas combinadas.** El patrón es la guía; la longitud mínima (≥20 chars) + prohibición de bloque vacío `>` es la regla del linter.

---

### GAP-3: Sin linter

**Alternativa A — Script Python**
- Pros: parsing YAML nativo (`pyyaml`), consistente con `migrate-metadata-keys.py` ya existente, extensible
- Contras: requiere Python instalado (ya se asume en el proyecto)

**Alternativa B — Script Bash**
- Pros: sin dependencias
- Contras: parsing YAML en bash es frágil, propenso a falsos positivos

**Decisión: Python.** Consistente con el ecosistema de scripts del proyecto. Path: `scripts/lint-agents.py`.

---

### GAP-5: Campo `model` en generador

**Alternativa A — Filtrar `model` en el generador (`skill-generator.md`)**
- Pros: el registry conserva `model` como metadata de bootstrap, el agente nativo sale limpio
- Contras: requiere actualizar el generador y sus instrucciones

**Alternativa B — Eliminar `model` del registry también**
- Pros: una sola fuente de verdad
- Contras: el registry necesita `model` para saber con qué modelo bootstrappear — es metadata de generación, no de runtime

**Decisión: Alternativa A.** El registry conserva `model`; el generador lo filtra. Son dos formatos con propósitos diferentes.

---

### GAP-6: Sin convención de naming

**Alternativa A — Patrón `{dominio}-{rol}.md` universal**
- Pros: consistente, predecible
- Contras: no encaja bien con `tech-detector.md` ni `skill-generator.md`

**Alternativa B — 3 patrones documentados con guía de cuándo usar cada uno**
- Pros: refleja la realidad de los agentes existentes, flexible para casos nuevos
- Contras: requiere decisión en cada caso nuevo

**Decisión: Alternativa B.** 3 patrones con ejemplos.

---

## Decisiones Fundamentales

| ID | Decisión | Justificación |
|----|----------|---------------|
| D-01 | Spec en `references/agent-spec.md` | Sigue anatomía del framework; el linter hace la validación ejecutable |
| D-02 | Linter Python en `scripts/lint-agents.py` | Consistente con migrate-metadata-keys.py; YAML parsing robusto |
| D-03 | Generador filtra `model`, registry lo conserva | Dos formatos, dos propósitos; no eliminar metadata de bootstrap |
| D-04 | Patrón `{qué hace}. Usar cuando {condición}.` + mínimo 20 chars | Codifica calidad implícita de los 4 buenos agentes |
| D-05 | 3 patrones de naming documentados | Refleja realidad existente; flexible para extensión |

---

## Spec Formal Propuesta — Tabla de Campos

| Campo | Estado | Descripción |
|-------|--------|-------------|
| `name` | REQUERIDO | Kebab-case. Debe coincidir con el nombre del archivo sin extensión. |
| `description` | REQUERIDO | Campo de routing. Patrón: `{qué hace}. Usar cuando {condición}.` Mínimo 20 chars. No puede ser bloque vacío `>`. |
| `tools` | REQUERIDO | Lista de herramientas. Al menos una. |
| `model` | PROHIBIDO | Metadata del registry. No debe aparecer en agentes nativos. |
| `category` | PROHIBIDO | Metadata del registry. No debe aparecer en agentes nativos. |
| `skill_template` | PROHIBIDO | Metadata del generador. No debe aparecer en agentes nativos. |
| `system_prompt` | PROHIBIDO | El system prompt va en el cuerpo markdown, no en el frontmatter. |

---

## Convención de Naming — 3 Patrones

| Patrón | Formato | Cuándo usar | Ejemplos |
|--------|---------|-------------|---------|
| Tech-expert | `{tech}-expert.md` | Agente de conocimiento de tecnología específica | `nodejs-expert.md`, `react-expert.md` |
| Workflow | `{tarea}-{rol}.md` | Paso del flujo pm-thyrox | `task-executor.md`, `task-planner.md` |
| Utility | `{dominio}-{función}.md` | Utilidad de propósito específico | `tech-detector.md`, `skill-generator.md` |

---

## Mapa GAP → Entregable

| GAP | Entregable | Path |
|-----|-----------|------|
| GAP-1: Sin spec formal | Spec de campos | `references/agent-spec.md` |
| GAP-2: Sin convención description | Patrón en spec + regla en linter | `references/agent-spec.md` + `scripts/lint-agents.py` |
| GAP-3: Sin linter | Script de validación | `scripts/lint-agents.py` |
| GAP-4: Sin reference SKILL vs Agente | Documento de distinción | `references/skill-vs-agent.md` |
| GAP-5: `model` en generador | Actualizar generador | `.claude/agents/skill-generator.md` |
| GAP-6: Sin naming convention | Tabla de 3 patrones | `references/agent-spec.md` |

---

## Gate que desbloquea para WP-1

Cuando el usuario apruebe la tabla de campos (spec formal), WP-1 (`parallel-agent-conventions`) puede modificar `task-executor.md` y `task-planner.md` sabiendo exactamente qué campos puede agregar, cuáles son prohibidos, y qué patrón debe seguir el `description`.

**Gate output:** spec en `references/agent-spec.md` aprobada por el usuario.
