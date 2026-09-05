```yml
created_at: 2026-04-18 07:48:45
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
fuente: Capítulo 6 — "What makes an AI system an Agent?" (libro agentic design patterns)
```

# Input: Capítulo 6 — Características de un sistema agente

## Texto fuente (transcripción fiel)

> An Agentic AI system is characterized by:
>
> 1. **Autonomy** — The system can make decisions and take actions based on its understanding of the objective and the current state of the environment, without requiring explicit instructions for each action step.
> 2. **Perception** — The system can receive and process information from its environment, including text, data, or other inputs that provide context about the current state.
> 3. **Action** — The system can take actions that affect the environment. These actions might include making API calls, reading files, writing outputs, or interacting with other systems.
> 4. **Goal-orientation** — The system operates with a clear understanding of the desired outcome and can work towards achieving that objective over multiple steps or interactions.
> 5. **Reasoning** — The system can reason about the information it receives, make inferences, and plan its actions based on that reasoning.
> 6. **Adaptation** — The system can learn from the outcomes of its actions and adjust its behavior accordingly. This doesn't necessarily mean machine learning in the traditional sense, but rather the ability to modify its approach based on feedback.

> The distinction between a traditional chatbot and an agent is the level of autonomy and the ability to take actions.

> Agents are not just reactive systems that respond to immediate inputs. They can plan sequences of actions, evaluate the effectiveness of those plans, and adjust them as needed.

---

## Conexiones con el problema del WP (realismo performativo)

### Característica 6 — Adaptation: la más relevante para calibración

El capítulo define adaptation como "modify its approach based on feedback" — sin feedback real, la adaptation se convierte en **adaptación simulada**: el sistema ajusta su comportamiento basado en afirmaciones propias, no en evidencia observable del entorno.

Este es exactamente el realismo performativo: **Autonomy + Reasoning sin Adaptation calibrada** produce artefactos que afirman calidad sin derivarla.

### Tabla de riesgo por característica

| Característica | Cómo contribuye al realismo performativo |
|----------------|------------------------------------------|
| Autonomy | Toma decisiones sin validación externa en cada paso |
| Perception | Si el input es el propio output anterior → feedback loop cerrado |
| Action | Escribe artefactos sin gate que verifique calidad |
| Goal-orientation | El "objetivo" puede ser "producir artefacto bien formateado" en lugar de "producir artefacto correcto" |
| **Reasoning** | Genera justificaciones para cualquier output — sin ancla empírica |
| **Adaptation** | Sin métricas observables, el sistema "adapta" hacia lo plausible, no hacia lo verdadero |

### Implicación directa para el WP

La solución de calibración debe intervenir específicamente en **Perception** y **Adaptation**:
- **Perception:** los gates de stage deben inyectar evidencia externa observable (no solo output del agente)
- **Adaptation:** el sistema debe tener feedback loop cerrable: predicción → observación → delta

El capítulo provee el vocabulario para formular el problema: THYROX opera con los 6 atributos excepto **Adaptation calibrada** — tiene autonomy, perception, action, goal-orientation, reasoning, pero su adaptation loop está cerrado sobre sí mismo.

---

## Pendiente para Stage 3 ANALYZE

- Operacionalizar "adaptation loop calibrado" como mecanismo concreto en stages THYROX
- Definir qué cuenta como "observación externa" en el contexto de un WP (vs output del propio agente)
- Conectar esta taxonomía con los 7 gaps identificados en `references-calibration-coverage.md`
