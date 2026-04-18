```yml
created_at: 2026-04-18 08:36:06
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
fuente: Capítulo 2 — "Enrutamiento" (libro agentic design patterns)
```

# Input: Capítulo 2 — Enrutamiento como mecanismo de adaptación condicional

## Texto fuente — síntesis de conceptos clave

> "Routing introduces conditional logic into the operational framework of an agent, enabling a shift from a fixed execution path to a model where the agent **dynamically evaluates specific criteria** to select from a set of possible subsequent actions."

> "Routing enables agents to make dynamic decisions about the next step in a workflow based on conditions."

> Métodos de implementación:
> - **LLM-based routing:** el modelo analiza la entrada y emite un identificador de ruta — probabilístico
> - **Rule-based routing:** if-else basado en patrones o palabras clave — determinístico
> - **Embedding-based routing:** similaridad semántica — probabilístico
> - **ML classifier routing:** modelo discriminativo entrenado — determinístico post-entrenamiento

---

## Conexión con el problema del WP

### El patrón de enrutamiento es el mecanismo faltante en los gates THYROX

Combinando los tres capítulos:
- **Cap. 1 (Chaining):** THYROX tiene la cadena secuencial — le falta validación en cada eslabón
- **Cap. 6 (Agente):** THYROX tiene 5/6 características — le falta Adaptation calibrada
- **Cap. 2 (Routing):** el mecanismo que habilita tanto la validación como la adaptation es **enrutamiento en los gates**

Sin routing, cada gate THYROX tiene una sola ruta: avanzar. Con routing, un gate puede tener tres rutas:

```
Gate Stage N → Stage N+1
  │
  ├─ evidencia suficiente  → avanzar a Stage N+1
  ├─ evidencia insuficiente → regresar a Stage N (rework)
  └─ bloqueante crítico     → escalar a ejecutor humano (SP)
```

Este es exactamente el "Adaptation loop" que faltaba: el gate evalúa el artefacto y enruta en función de evidencia observable, no de afirmación.

### LLM-based vs Rule-based routing — el mismo dilema del corpus

`production-safety.md` ya documentó esto sin nombrarlo como routing:
- `CLAUDE.md rules` = ~70% adherencia → **LLM-based routing** (probabilístico)
- `PreToolUse hook` = 100% → **Rule-based routing** (determinístico)

El corpus demuestra empíricamente que los gates actuales de THYROX son LLM-based (el modelo decide si avanzar). Para calibración, los gates críticos deben ser rule-based: predicados verificables con salida booleana.

### El coordinador y los sub-agentes como arquitectura de verificación

El ejemplo del capítulo (Coordinator → Booker/Info) es isomórfico a la arquitectura de calibración necesaria:

```
Gate Coordinator
  ├─ "evidencia observable presente"  → advance-handler
  ├─ "afirmación sin respaldo"         → rework-handler
  └─ "bloqueo por invariante crítica"  → human-escalation-handler
```

El `coordinator_router_chain` del capítulo usa un prompt que fuerza salida exacta (`'booker'`, `'info'`, `'unclear'`). Aplicado a calibración: el gate debe producir exactamente `'pass'`, `'rework'`, o `'escalate'` — no prosa justificativa.

### Routing semántico vs routing por reglas en THYROX

| Tipo de gate | Routing apropiado | Justificación |
|-------------|-------------------|---------------|
| Evidencia cuantitativa (métricas, datos) | Rule-based | Umbral objetivo: >N% cumplimiento |
| Completitud de artefacto estructural | Rule-based | Checklist verificable |
| Calidad de análisis cualitativo | LLM-based + embedding | Requiere juicio semántico |
| Decisión arquitectónica | Human escalation (SP) | Irreducible a predicado automático |

---

## Síntesis acumulada de los tres capítulos

| Capítulo | Principio | Aplicación a THYROX |
|----------|-----------|---------------------|
| Cap. 1 — Chaining | Output de N → input de N+1; validar cada eslabón | Los 12 stages son la cadena; los gates son los puntos de validación |
| Cap. 6 — Agente | 6 características; Adaptation requiere feedback observable | Sin routing en gates → adaptation ciega → realismo performativo |
| Cap. 2 — Routing | Lógica condicional; múltiples rutas basadas en criterios | El gate debe tener al menos 3 rutas: advance / rework / escalate |

**Convergencia:** los tres capítulos señalan el mismo mecanismo faltante — un gate con routing condicional basado en evidencia observable, no en afirmación del agente.

---

## Implicaciones de diseño para Stage 3 ANALYZE

1. **Estructura del gate calibrado:**
   - Input: artefacto del stage + criterios de evidencia (checklist derivado)
   - Router: predicado booleano (rule-based para estructural, LLM-based para semántico)
   - Output: `pass` | `rework` | `escalate` — no prosa

2. **Nivel de determinismo por tipo de gate:**
   - Artefactos estructurales (risk-register, exit-conditions): rule-based → determinístico
   - Síntesis de análisis: LLM-based con ancla empírica → probabilístico con umbral

3. **Naturaleza del rework loop:**
   - Rework no es repetir el stage — es regresar con el delta específico que faltó
   - El routing debe pasar el diagnóstico al stage previo como contexto de rework

4. **Escalate vs human SP:**
   - Stopping Point (SP) ya existe en THYROX — el routing `escalate` se mapea directamente a SP
   - No crear nuevo mecanismo: refinar los SP existentes con criterios de disparo explícitos
