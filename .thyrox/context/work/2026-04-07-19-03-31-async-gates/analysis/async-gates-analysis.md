```yml
type: Análisis
work_package: 2026-04-07-19-03-31-async-gates
created_at: 2026-04-07 19:03:31
status: En progreso
phase: Phase 1 — ANALYZE
reversibility: documentation
```

# Análisis: async-gates

## Objetivo

Analizar el flujo completo de ejecución en pm-thyrox para identificar **todos** los puntos de parada (stopping points) necesarios, con énfasis especial en las tareas asíncronas ejecutadas por agentes en background.

El problema central: cuando Phase 1 (ANALYZE) inicia un work package, debe producir un artefacto que mapee dónde Claude debe detenerse durante el WP. Actualmente ese mapa no existe — los gates están codificados en SKILL.md pero no se instancian como plan de paradas para cada WP específico.

## Hallazgos del Análisis

### 1. Tipos de stopping points en el flujo actual

#### Tipo A — Gate de Fase (implementado ✓)
Transiciones entre las 7 fases del SDLC. Implementados en FASE 18 (human-gates WP).

```
Phase 1 → Phase 2  ⏸ GATE HUMANO
Phase 2 → Phase 3  ⏸ GATE HUMANO
Phase 4 → Phase 5  ⏸ GATE HUMANO
Phase 5 → Phase 6  ⏸ GATE HUMANO CRÍTICO
```

**Estado:** Implementado. El lenguaje imperativo (`⏸ STOP — presentar — esperar`) existe en SKILL.md.

#### Tipo B — Gate de Operación Destructiva (implementado parcialmente ✓)
Dentro de Phase 6, antes de operaciones irreversibles.

```
⚠ GATE OPERACIÓN — rm/force/mcp.json/git push --force
```

**Estado:** Implementado en SKILL.md Phase 6. Sin embargo, el gate es reactivo — se activa si la operación aparece. No se anticipa en Phase 1.

#### Tipo C — Gate de Completitud Asíncrona (NO implementado ✗)
Cuando Claude lanza un agente con `run_in_background: true`, el agente termina y envía `<task-notification>`. **Actualmente Claude procesa automáticamente el resultado y continúa sin parar.**

```
Claude lanza Agent(run_in_background=true)
    ↓ ... tiempo ...
<task-notification> llega
    ↓ Claude auto-procesa
    ↓ Claude continúa [← FALTA STOP AQUÍ]
```

**Gap identificado:** No existe ninguna instrucción en SKILL.md que diga "cuando llegue un `<task-notification>`, presentar los resultados al usuario y esperar antes de continuar".

#### Tipo D — Gate de Decisión Intra-fase (NO implementado ✗)
Dentro de una fase, el análisis puede descubrir que hay más de una dirección posible. Actualmente Claude elige internamente y continúa.

Ejemplo: Phase 1 descubre que el scope puede ser grande o pequeño dependiendo de cómo el usuario interprete el objetivo. Claude debería parar y preguntar antes de comprometerse con una dirección de análisis.

**Estado:** No implementado de forma estructurada. Depende del juicio de Claude en cada sesión.

---

### 2. El gap crítico: tareas asíncronas

#### ¿Cuándo se usan agentes en background?

En SKILL.md Phase 6, la ejecución paralela implica lanzar múltiples agents con `run_in_background: true`:

```python
# Patrón actual:
Agent(subagent_type="task-executor", run_in_background=True, prompt="...")
Agent(subagent_type="task-executor", run_in_background=True, prompt="...")
# Claude continúa con coordinación...
# <task-notification> llega
# Claude auto-procesa y sigue
```

#### ¿Por qué es problemático?

1. **Sin gate post-async:** Cuando un agente en background completa, Claude recibe la notificación, procesa el resultado, y puede lanzar la siguiente tarea — todo sin pausa para el usuario.

2. **Pérdida de visibilidad:** El usuario no sabe qué produjo el agente hasta que Claude ya usó ese output para continuar. Si el agente produjo algo incorrecto, el error se propagó.

3. **El "SI" inicial no cubre resultados intermedios:** Similar al problema de human-gates — el "SI" al inicio del WP no autoriza aceptar cada resultado de agente sin revisión.

4. **Agentes de investigación:** Si un agente en background hace investigación (Explore, general-purpose), sus hallazgos son inputs para decisiones. El usuario debería ver esos hallazgos antes de que Claude tome una decisión basada en ellos.

---

### 3. El Stopping Point Manifest (artefacto propuesto)

**Propuesta:** Phase 1 ANALYZE debe producir, como parte de su análisis, un **Stopping Point Manifest** — una lista explícita de todos los puntos donde Claude va a detenerse durante el WP.

#### Formato propuesto

```markdown
## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis completo | Presentar hallazgos, esperar SI |
| SP-02 | 2→3 | gate-fase | Estrategia definida | Presentar decisiones, esperar SI |
| SP-03 | P6/A1 | async-completion | Agent "investigate-X" completa | Presentar findings, esperar SI |
| SP-04 | P6/A2 | async-completion | Agent "implement-Y" completa | Presentar diff, esperar SI |
| SP-05 | P6 | gate-operacion | rm -rf legacy/ | Describir operación, esperar SI |
| SP-06 | 6→7 | gate-fase | Todas las tareas completas | Confirmar antes de TRACK |
```

#### Categorías de stopping points

| Tipo | Cuando | Quién lo define |
|------|--------|----------------|
| `gate-fase` | Transición entre fases | Siempre — fijos en SKILL.md |
| `async-completion` | Agente background termina | Phase 1 o Phase 5 al planificar paralelos |
| `gate-operacion` | Operación destructiva inminente | Phase 6 in-the-moment |
| `gate-decision` | Ambigüedad descubierta | Phase 1 al clasificar el WP |

---

### 4. Relación con tareas asíncronas

El Stopping Point Manifest resuelve el problema de async en dos niveles:

**Nivel 1 — Pre-flight (Phase 5 → Phase 6):**
Cuando SKILL.md dice "listar archivos que toca cada agente → detectar intersecciones → asignar section owners", ese mismo momento es cuando se deben registrar los `async-completion` gates en el manifest. Cada agente lanzado en background debe tener un SP-NNN correspondiente.

**Nivel 2 — Runtime (dentro de Phase 6):**
Cuando llega `<task-notification>`, Claude debe:
1. Buscar el SP correspondiente en el manifest
2. Presentar los resultados al usuario
3. STOP — esperar confirmación antes de continuar
4. Si el resultado tiene errores o desviaciones, actualizar el manifest

Este patrón convierte `<task-notification>` de un evento de "procesamiento automático" a un "trigger de gate".

---

### 5. Análisis de impacto en SKILL.md

#### Phase 1: ANALYZE

**Cambio requerido:** Añadir como paso obligatorio la creación del Stopping Point Manifest como parte del análisis inicial.

```
NUEVO PASO en Phase 1:
8. Crear Stopping Point Manifest en el análisis:
   - Listar gate-fase obligatorios (siempre aplican los de SKILL.md)
   - Identificar async-completion gates si el WP planifica agentes paralelos
   - Identificar gate-decision si hay ambigüedades en el scope
   El manifest vive en el archivo de análisis como sección obligatoria.
```

#### Phase 5: DECOMPOSE (Pre-flight paralelo)

**Cambio requerido:** Al hacer pre-flight para paralelo, actualizar el manifest con los SP concretos por agente.

```
AMPLIAR en Phase 5 Pre-flight:
- Por cada agente que se va a lanzar en background: registrar SP-NNN en el manifest
  con: qué agente, qué produce, qué acción se requiere al completar
```

#### Phase 6: EXECUTE (manejo de task-notification)

**Cambio requerido:** Añadir instrucción explícita para `<task-notification>`.

```
NUEVO en Phase 6 Step 1:
Al recibir <task-notification>:
  1. Identificar el SP correspondiente en el Stopping Point Manifest
  2. Presentar al usuario: [qué agente completó] + [resumen del resultado]
  3. ⏸ GATE ASYNC — STOP: esperar confirmación antes de procesar el resultado
     o lanzar el siguiente agente en el pipeline
  4. Si el usuario aprueba: marcar SP como ✓ y continuar
  5. Si el usuario señala un problema: regresar al agente o ajustar el plan
```

---

### 6. Casos de borde

#### ¿Todos los async-completion gates deben ser interactivos?

No necesariamente. Calibración propuesta según tipo de agente:

| Tipo de agente async | Gate requerido |
|----------------------|----------------|
| `task-executor` (implementación) | ✓ Siempre — modifica el repo |
| `Explore` / investigación | ✓ Si los hallazgos alimentan una decisión |
| `Explore` / validación mecánica | Ligero — mencionar resultado y dar opción de objetar |
| Agente de documentación | Ligero — presentar y dar 30s para objetar |

#### ¿Qué pasa si el usuario no está presente?

El manifest documenta los gates esperados. Si el usuario no responde, Claude debe esperar — no auto-continuar. Este es el mismo principio que los gates de fase: la ausencia de respuesta no es autorización.

---

### 7. Criterios de éxito

- [ ] Phase 1 produce un Stopping Point Manifest en cada WP
- [ ] Cada agente lanzado en background tiene un SP-NNN registrado antes de lanzarse
- [ ] Cuando llega `<task-notification>`, Claude presenta resultado + ⏸ STOP
- [ ] El manifest se actualiza al completar cada SP
- [ ] Los gates async respetan la misma calibración que los gates de fase (reversibility del WP)

---

### 8. Riesgos

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|------------|
| R-01 | Gates demasiado frecuentes generan fatiga de aprobación | Alto | Calibrar gates según tipo de agente y reversibilidad |
| R-02 | Manifest incompleto en Phase 1 (WP no planifica paralelos) | Medio | El manifest tiene entradas mínimas (gate-fase siempre) |
| R-03 | Claude olvida consultar el manifest en Phase 6 | Alto | Añadir instrucción explícita en Phase 6 step 1 |
| R-04 | task-notification llega mientras Claude está en otra operación | Bajo | Completar la operación actual, luego atender el gate |

---

## Stopping Point Manifest

> Este WP es `reversibility: documentation` y no lanza agentes en background.
> Solo contiene gate-fase obligatorios.

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis Phase 1 completo | Presentar hallazgos al usuario, esperar SI — ✓ Completado |
| SP-02 | 2→3 | gate-fase | Strategy Phase 2 completa | Presentar decisiones clave, esperar SI — ✓ Completado |
| SP-03 | 3→4 | gate-fase | Plan Phase 3 aprobado | Presentar scope declarado, esperar SI — ✓ Completado |
| SP-04 | 4→5 | gate-fase | Spec Phase 4 aprobada | Presentar user stories + ACs, esperar SI — ✓ Completado |
| SP-05 | 5→6 | gate-fase | Task-plan Phase 5 aprobado | Presentar 8 tareas, esperar SI — ✓ Completado |
| SP-06 | 6→7 | gate-fase | Todas las tareas completas | Presentar cambios en SKILL.md, esperar SI antes de Phase 7 — ✓ Completado |
