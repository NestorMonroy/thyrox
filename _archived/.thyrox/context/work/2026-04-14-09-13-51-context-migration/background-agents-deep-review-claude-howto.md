```yml
type: Deep-Review Artifact
created_at: 2026-04-14 16:58:36
source: /tmp/reference/claude-howto/
topic: comportamiento de agentes en background, notificaciones y compactación de sesión
fase: FASE 35
```

# background-agents-deep-review-claude-howto.md

Deep-review Modo 2 (exploración sin sesgo de hipótesis previa).
31 patrones en 7 categorías. Fuente: repositorio `claude-howto`.

---

## Patrones identificados: 31 (en 7 categorías)

---

### Categoría 1: Background Subagents — Configuración y ciclo de vida

- **Patrón 1.1:** El campo `background: true` en el frontmatter de un agente lo hace ejecutarse siempre como tarea en background, liberando la conversación principal.
  Fuente: `04-subagents/README.md:468-471`

- **Patrón 1.2:** `Ctrl+B` envía al background un agente que ya está corriendo en foreground. `Ctrl+F` mata todos los background agents (requiere doble pulsación para confirmar).
  Fuente: `04-subagents/README.md:482-483`

- **Patrón 1.3:** Los background subagents auto-deniegan cualquier permiso que no esté pre-aprobado.
  Fuente: `04-subagents/README.md:824`

- **Patrón 1.4:** El contexto de un subagente se auto-compacta cuando alcanza ~95% de capacidad, independiente de la compactación de la sesión principal.
  Fuente: `04-subagents/README.md:827`

- **Patrón 1.5:** `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` desactiva completamente el soporte de tareas en background.
  Fuente: `04-subagents/README.md:490`

- **Patrón 1.6:** Los transcripts de subagentes se almacenan en `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl` — sobreviven al subagente y son accesibles tras la sesión.
  Fuente: `04-subagents/README.md:826`

---

### Categoría 2: Background Tasks (nivel sesión) — Modelo de notificación intra-sesión

- **Patrón 2.1:** El modelo documentado asume que la sesión sigue activa cuando el background task completa. La notificación (`📢 Background task bg-1234 completed`) aparece inline en la conversación como un turno más del flujo.
  Fuente: `09-advanced-features/README.md:508-517`

- **Patrón 2.2:** Comandos de consulta activa: `/task list`, `/task status`, `/task show`, `/task cancel`. No existe mecanismo de "push notification" fuera de sesión.
  Fuente: `09-advanced-features/README.md:519-551`

- **Patrón 2.3:** El campo `notifyOnCompletion: true` en la configuración `backgroundTasks` es explícito — la notificación ocurre dentro del contexto activo de la sesión.
  Fuente: `09-advanced-features/README.md:581-589`

- **Patrón 2.4:** Scheduled tasks son "session-scoped" — se limpian cuando la sesión termina, sin catch-up para fires perdidos: "Tasks only fire while Claude Code is running".
  Fuente: `09-advanced-features/README.md:629-631`

---

### Categoría 3: Compactación de sesión — Mecánica y hooks

- **Patrón 3.1:** Dos hooks dedicados a compactación: `PreCompact` y `PostCompact`. `SessionStart` puede dispararse con matcher `compact` cuando la sesión se inicia post-compactación.
  Fuente: `06-hooks/README.md:156-157`, `06-hooks/README.md:322-328`

- **Patrón 3.2:** `PreCompact` y `PostCompact` no pueden bloquear la operación (campo "Can Block" = No).
  Fuente: `06-hooks/README.md:155-157`

- **Patrón 3.3:** `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` — porcentaje del context window que dispara auto-compact de la sesión principal.
  Fuente: `10-cli/README.md:726`

- **Patrón 3.4:** El Task List es la **única** estructura documentada como persistente a través de compactaciones: "Tasks persist across context compactions, ensuring that long-running work items are not lost when the conversation context is trimmed."
  Fuente: `09-advanced-features/README.md:1463-1471`

- **Patrón 3.5:** `Summarize from here` comprime la conversación en un resumen IA. Los mensajes anteriores se preservan en transcript pero desaparecen del contexto activo.
  Fuente: `08-checkpoints/README.md:53`

---

### Categoría 4: Notification hook event — Alcance documentado

- **Patrón 4.1:** El evento `Notification` tiene matchers: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`. **No existe un matcher `background_task_complete`.**
  Fuente: `06-hooks/README.md:361-368`

- **Patrón 4.2:** `Notification` en CATALOG: "Notification sent / Claude sends notification" con use case "External alerts". No especifica qué eventos internos lo disparan.
  Fuente: `CATALOG.md:340`

- **Patrón 4.3:** El hook `notify-team.sh` existente es un PostToolUse sobre Bash para git pushes — no diseñado para notificaciones de completación de background agents.
  Fuente: `06-hooks/notify-team.sh:1-6`

---

### Categoría 5: Comportamiento de Agent Teams — Limitaciones de sesión

- **Patrón 5.1:** "No session resumption — In-process teammates cannot be resumed after a session ends."
  Fuente: `04-subagents/README.md:720`

- **Patrón 5.2:** "No cross-session teams: Teammates exist only within the current session."
  Fuente: `04-subagents/README.md:726`

- **Patrón 5.3:** `TeammateIdle` y `TaskCompleted` son hooks de Agent Teams para coordinación intra-sesión únicamente.
  Fuente: `04-subagents/README.md:704-707`

---

### Categoría 6: SubagentStop hook — Mecanismo de completación

- **Patrón 6.1:** `SubagentStop` corre cuando un subagente termina. Puede bloquear ("Can Block: Yes"). Recibe `last_assistant_message` con el mensaje final del subagente. **Es el único punto de intercepción documentado para "cuando un subagente completa".**
  Fuente: `06-hooks/README.md:165`, `06-hooks/README.md:270-278`

- **Patrón 6.2:** Un `Stop` hook en el frontmatter de un subagente se convierte automáticamente en `SubagentStop` scoped a ese subagente.
  Fuente: `06-hooks/README.md:393-409`

- **Patrón 6.3:** `SubagentStart` y `SubagentStop` permiten usar el nombre del agente como matcher.
  Fuente: `06-hooks/README.md:294-315`

---

### Categoría 7: Context window management — Interacción con sesión activa

- **Patrón 7.1:** Zonas de contexto (statusbar): Plan (verde), Code (amarillo), Dump (naranja). En zona Dump, el rewind es la acción recomendada.
  Fuente: `08-checkpoints/README.md:288-291`

- **Patrón 7.2:** La compactación de la sesión principal y la compactación del contexto de un subagente son procesos independientes con thresholds separados.
  Fuente: `04-subagents/README.md:827` vs `09-advanced-features/README.md:1783`

- **Patrón 7.3:** El campo `additionalContext` en la salida de un hook permite inyectar contexto de vuelta a Claude después de un tool use — mecanismo para re-hidratar contexto post-compactación.
  Fuente: `06-hooks/README.md:237-239`

---

## Hallazgo sobre el comportamiento investigado

**El repo NO documenta explícitamente el escenario de pérdida de notificación cuando la sesión se compacta antes de que el agente background termine.**

Lo que el repo sí documenta, que permite inferir el comportamiento:

1. **El modelo de notificación es intra-sesión.** El ejemplo canónico muestra la notificación como un turno más de la conversación activa. No existe queue de notificaciones pendientes ni re-entrega tras compactación.
   Fuente: `09-advanced-features/README.md:508-517`

2. **La compactación elimina el historial de mensajes.** Una promesa de notificación que vivía en el contexto compactado desaparece — el modelo ya no "recuerda" que debe notificar.
   Fuente: `09-advanced-features/README.md:1463`

3. **La única estructura compaction-safe es el Task List.** Nada más está documentado como persistente a través de compactaciones.
   Fuente: `09-advanced-features/README.md:1463-1471`

4. **SubagentStop es la única intercepción robusta documentada**, pero su entrega también depende de que la sesión esté activa.
   Fuente: `06-hooks/README.md:165`

5. **Scheduled tasks confirman el patrón general:** "no catch-up for missed fires" — por analogía, las notificaciones de background agents que completan cuando el contexto fue compactado no tienen re-entrega.
   Fuente: `09-advanced-features/README.md:631`

6. **El problema es estructural:** incluso sin compactación, si el orquestador avanza en turnos que eventualmente llenan el context window, el "turno de notificación" llega a una sesión cuyo contexto ya no incluye la promesa original.

---

## Recomendación

Crear `.claude/references/background-agents-patterns.md` con:

1. **Patrón de polling explícito:** usar Task List (`/task status`) como mecanismo de sincronización que sobrevive a compactaciones.
2. **SubagentStop + escritura a filesystem:** el hook escribe el resultado en un archivo, el orquestador lo lee en el siguiente turno — independiente del estado del contexto.
3. **Anti-patrón documentado:** "No prometer notificación verbal si hay riesgo de compactación antes de que el agente complete. Indicar siempre la ruta del artefacto de resultado."
