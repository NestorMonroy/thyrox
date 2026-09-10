```yml
type: Deep-Review Artifact
created_at: 2026-04-14 16:59:23
source: /tmp/reference/claude-code-ultimate-guide/
topic: comportamiento de agentes en background, notificaciones y compactación de sesión
fase: FASE 35
```

# background-agents-deep-review-ultimate-guide.md

Deep-review Modo 2 (exploración sin sesgo de hipótesis previa).
31 patrones en 6 categorías. Fuente: repositorio `claude-code-ultimate-guide`.

---

## Patrones identificados: 31 (en 6 categorías)

---

### Categoría 1: Arquitectura de Background Agents

- **Patrón 1.1:** Los background subagents son una variante del Task tool donde el agente padre continúa sin esperar resultado. El modo por defecto bloquea al padre; el modo background es "fire-and-forget".
  Fuente: `guide/ultimate-guide.md:6662-6669`

- **Patrón 1.2:** Background agents introducidos en v2.0.60 (2025-12-18). En v2.0.64 (2025-12-22) se añadieron "async agents and bash commands with wake-up messages", distinguiendo background (siempre activo) de async (con mensajes de reactivación).
  Fuente: `guide/core/claude-code-releases.md:1131, 1139`

- **Patrón 1.3:** Agentes de fondo declarables permanentes con `background: true` en el frontmatter (introducido en v2.1.49, 2026-02-20).
  Fuente: `guide/core/claude-code-releases.md:679`

- **Patrón 1.4:** Sub-agentes tienen profundidad máxima 1 (depth=1): un subagente no puede lanzar sub-subagentes. Cada subagente recibe su propia context window fresca.
  Fuente: `guide/core/architecture.md:496-538`

- **Patrón 1.5:** ESC y Ctrl+C cancelan solo el hilo principal; los background agents siguen corriendo. Ctrl+X Ctrl+K abre el overlay de gestión y los mata todos.
  Fuente: `guide/core/claude-code-releases.md:347`, `guide/ultimate-guide.md:6671-6680`

- **Patrón 1.6:** Al matar un background agent, sus resultados parciales se preservan en el contexto de conversación (mejora añadida en v2.1.75).
  Fuente: `guide/core/claude-code-releases.md:468`

- **Patrón 1.7:** Los tokens de background agents se incluyen en el conteo total de tokens de la sesión.
  Fuente: `guide/core/claude-code-releases.md:701`

---

### Categoría 2: Comportamiento de Compactación

- **Patrón 2.1:** Auto-compact se dispara entre 75% y 95% del contexto según la fuente. La guía usa 80% como valor de referencia principal.
  Fuente: `guide/core/architecture.md:393-405`

- **Patrón 2.2:** Durante la compactación: los turnos más antiguos se resumen, los resultados de tools se condensan, el contexto reciente se preserva completo, y el modelo recibe una señal "context was compacted".
  Fuente: `guide/core/architecture.md:407-413`

- **Patrón 2.3:** LLM performance cae 50-70% en tareas complejas al crecer de 1K a 32K tokens. 11 de 12 modelos caen por debajo del 50% de su rendimiento en contexto corto al llegar a 32K tokens.
  Fuente: `guide/core/architecture.md:415-423`

- **Patrón 2.4:** Compaction drift: un agente de equipo que marcaba mensajes con `DEVELOPER:` deja de hacerlo después de compactación porque la transcripción ya no contiene las instrucciones originales.
  Fuente: `guide/ultimate-guide.md:10969-10973`

- **Patrón 2.5:** Bug activo: full cache rebuild en cada `--resume` (87-118K tokens reconstruidos) relacionado con pérdida de `deferred_tools_delta` en session JSONL.
  Fuente: `guide/core/known-issues.md:39-65`

- **Patrón 2.6:** `/compact` puede fallar cuando la conversación en sí es demasiado grande para la request de compactación (fixed en v2.1.85).
  Fuente: `guide/core/claude-code-releases.md:272`

- **Patrón 2.7:** Issues activos: #41607 (duplicate compaction subagents), #41767 (auto-compact loops v2.1.89), #41750 (context management fires every turn).
  Fuente: `guide/core/known-issues.md:138`

---

### Categoría 3: La Intersección Background Agents + Compactación — Bugs Documentados

- **Patrón 3.1 (CRÍTICO):** "Background subagents becoming invisible after context compaction (could cause duplicate agents)" — bug confirmado, **corregido en v2.1.83 (2026-03-25)**.
  Fuente: `guide/core/claude-code-releases.md:338`

  Cuando la sesión se compacta mientras un background agent está corriendo, el agente se vuelve invisible para la sesión padre. El padre puede relanzarlo (duplicado) porque ya no lo ve en su estado. La "promesa" de notificación se pierde porque el agente desaparece del estado de la sesión.

- **Patrón 3.2:** "Race condition where background agent task output could hang indefinitely when task completed between polling intervals" — bug confirmado, **corregido en v2.1.81**.
  Fuente: `guide/core/claude-code-releases.md:363`

  Si el agente termina exactamente entre dos intervalos de polling y la sesión se compacta en ese intervalo, el output cuelga indefinidamente. La notificación de completion simplemente no llega.

- **Patrón 3.3:** "Background task notifications not delivered in streaming Agent SDK mode" — bug confirmado, corregido en versión posterior.
  Fuente: `guide/core/claude-code-releases.md:771`

  En modo SDK con streaming (que es el caso del uso via Agent tool), las notificaciones de background tasks directamente no se entregaban. Tercer vector independiente de pérdida de notificaciones.

- **Patrón 3.4:** "Worktree isolation: Task tool resume not restoring cwd, background task notifications missing worktreePath/worktreeBranch" — bug confirmado, **corregido en v2.1.63**.
  Fuente: `guide/core/claude-code-releases.md:538`

---

### Categoría 4: El Hook Notification y su Alcance

- **Patrón 4.1:** Hook event `Notification` existe. Se dispara cuando Claude envía una notificación. No puede bloquear. Caso de uso: alertas de sonido, notificaciones customizadas.
  Fuente: `guide/ultimate-guide.md:9501`

- **Patrón 4.2:** El hook `Notification` es diferente de las notificaciones de completion de background agents — es un evento del ciclo de hooks (PreToolUse, PostToolUse, Stop, SubagentStop, Notification).
  Fuente: `guide/ultimate-guide.md:9496-9503`

- **Patrón 4.3:** Los hooks `Stop` y `SubagentStop` tienen `last_assistant_message` (v2.1.47+) — acceso al último mensaje sin parsear transcript files.
  Fuente: `guide/ultimate-guide.md:9505-9511`

- **Patrón 4.4:** Hooks async (`async: true`) corren en background y su exit code/stdout NO están disponibles para Claude.
  Fuente: `guide/ultimate-guide.md:9557-9562`

- **Patrón 4.5:** Variables del hook Notification: `.title`, `.message`, `.notification_type`.
  Fuente: `guide/ultimate-guide.md:9984-9994`

---

### Categoría 5: Patrones de Mitigación Documentados

- **Patrón 5.1:** Re-inyección de identidad post-compactación: hook `UserPromptSubmit` verifica si el último mensaje del asistente incluye el marcador esperado. Si no, inyecta el archivo de identidad como `additionalContext`.
  Fuente: `guide/ultimate-guide.md:10973`

- **Patrón 5.2 (CLAVE):** "The state file is the key innovation here. It survives context resets, /compact operations, and even full session restarts." — El estado escrito a disco es el único mecanismo robusto documentado para tareas de larga duración.
  Fuente: `guide/workflows/iterative-refinement.md:542`

- **Patrón 5.3:** Manual `/compact` en puntos lógicos antes de que el auto-compact se dispare, para controlar qué se preserva y qué se resume.
  Fuente: `guide/core/architecture.md:423-433`

- **Patrón 5.4:** Para pipelines multi-fase, usar `/clear` entre fases. El archivo de plan en disco es el artefacto de handoff, no el contexto en memoria.
  Fuente: `guide/workflows/plan-pipeline.md:312-314`

- **Patrón 5.5:** Sub-agents como herramienta de preservación de contexto del principal.
  Fuente: `guide/core/architecture.md:435-443`

---

### Categoría 6: Comportamiento de Sesión y Persistencia

- **Patrón 6.1:** El historial de conversación NO se restaura entre sesiones. Solo persiste lo que está en CLAUDE.md. La sesión nueva arranca de cero.
  Fuente: `guide/diagrams/02-context-and-sessions.md:184`

- **Patrón 6.2:** `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` — variable para deshabilitar background tasks completamente.
  Fuente: `guide/core/settings-reference.md:1130`

- **Patrón 6.3:** Auto-compact instantáneo y async agents con wake-up messages se introdujeron en el mismo release (v2.0.64, 2025-12-22) — interacción intencionada entre ambas features.
  Fuente: `guide/core/claude-code-releases.md:1130-1131`

- **Patrón 6.4:** `Ctrl+B` es el shortcut UI para "background a running task, keeping it alive while you continue other work in the session".
  Fuente: `guide/core/glossary.md:62`

- **Patrón 6.5:** Issue #41607 (duplicate compaction subagents) en tracker de bugs activos, confirmando que el problema era un issue activo conocido.
  Fuente: `guide/core/known-issues.md:138`

---

## Hallazgo sobre el comportamiento investigado

El repo documenta el comportamiento de manera directa, distribuida en tres entradas de release notes:

**Bug 1 — Invisibilidad post-compactación** (`claude-code-releases.md:338`, corregido v2.1.83):
"Background subagents becoming invisible after context compaction." Cuando la compactación ocurre mientras el background agent corre, la sesión padre pierde el registro del agente. La notificación de completion nunca llega porque el agente ya no existe en el estado de la sesión padre.

**Bug 2 — Race condition en polling** (`claude-code-releases.md:363`, corregido v2.1.81):
"Race condition where background agent task output could hang indefinitely when task completed between polling intervals." Si el agente termina entre polls y la sesión se compacta, el output cuelga indefinidamente.

**Bug 3 — Notificaciones no entregadas en streaming SDK** (`claude-code-releases.md:771`):
"Background task notifications not delivered in streaming Agent SDK mode." Aplica directamente al caso del Agent tool vía SDK. Vector independiente de pérdida de notificaciones.

**Lo que el repo NO documenta:**
No hay una sección que advierta proactivamente sobre la interacción `run_in_background=true` + compactación como escenario de riesgo. Los tres bugs están documentados como "fixed" — se asume que en versiones ≥ v2.1.83 el problema principal está resuelto.

**Implicación para THYROX:**
Si la versión en uso es ≥ v2.1.83, el bug de invisibilidad está corregido. Sin embargo, el patrón de mitigación recomendado por el repo (Patrón 5.2) sigue siendo válido independientemente de la versión: escribir resultado a un state file en disco, no confiar en la notificación in-session.

---

## Recomendación

El repo recomienda explícitamente `run_in_background=true` **solo para casos "fire-and-forget"** (tests, linting, alertas) — tareas donde perder la señal de completion es tolerable. Para tareas donde el resultado importa:

1. **El agente background escribe su resultado a un archivo en el WP** antes de terminar.
2. **El orquestador lee el archivo** en el siguiente turno — independiente de si la notificación llegó.
3. **La notificación verbal** ("te aviso cuando complete") es un complemento, no la fuente de verdad.

Documentar como anti-patrón en `references/background-agents-patterns.md`: "No usar la notificación in-session como única señal de completación. La ruta del artefacto de resultado es la fuente de verdad."
