---
created_at: 2026-04-15 11:00:00
project: THYROX
topic: Deep-review — JSONL y .claude/worktrees/ aplicados a THYROX plugin-distribution
author: NestorMonroy
status: Borrador
---

# Deep-review: JSONL y `.claude/worktrees/` — THYROX FASE 39

Sub-análisis para FASE 39 (plugin-distribution). Cubre dos herramientas de la plataforma Claude Code que no fueron consideradas en el análisis previo de `plugin-distribution-analysis.md`.

---

## Sección 1: JSONL en Claude Code — hallazgos del deep-review

Claude Code usa JSONL nativamente en múltiples capas del sistema. Cada uso documentado a continuación incluye su fuente de referencia.

### Session Transcripts (primario)

- **Path:** `~/.claude/projects/{encoded-path}/{session_id}.jsonl`
- **Subagentes:** `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`
- **Fuente:** `claude-code-ultimate-guide/guide/ultimate-guide.md:10856`

Cada sesión genera un archivo JSONL append-only. Los subagentes heredan la convención con su propio archivo bajo el directorio de sesión padre.

### Activity Logs (rotativo por fecha)

- **Path:** `~/.claude/logs/activity-YYYY-MM-DD.jsonl`
- **Limpieza:** `find "$LOG_DIR" -name "activity-*.jsonl" -mtime +7 -delete`
- **Fuente:** `claude-code-ultimate-guide/examples/hooks/bash/session-logger.sh`

Rotación diaria automática. La limpieza por antigüedad (`-mtime +7`) mantiene el footprint controlado.

### Sessions Index

- **Path:** `~/.claude/sessions-index.jsonl` (~360KB para 1300 sesiones)
- **Uso:** Navegación rápida de sesiones custom (`/resume` compatibility)
- **Fuente:** `claude-code-ultimate-guide/examples/scripts/cc-sessions.py:72`

El índice centralizado permite lookups O(n) sin abrir los transcripts individuales. El tamaño (~280 bytes por sesión) confirma que JSONL escala bien para índices de búsqueda.

### Analytics Metrics

- **Path:** `.claude/logs/analytics-metrics.jsonl`
- **Formato:** `{"event": "tool_execution", "tool": "Bash", "duration_ms": 1234}`
- **Fuente:** `claude-code-ultimate-guide/examples/agents/analytics-with-eval/README.md`

Eventos de métricas estructuradas. El formato plano por línea permite `grep`, `jq` y análisis con herramientas estándar sin parsing complejo.

### Calibration/Learning (patrón más relevante para THYROX)

- **Path:** `.caliber/learning/session.jsonl`
- **Ciclo:** `eventos via hooks → session.jsonl → análisis LLM cada 50 eventos → CALIBER_LEARNINGS.md`
- **Fuente:** `claude-code-ultimate-guide/docs/resource-evaluations/caliber-config-quality-tool.md:74`

Este es el patrón más relevante para THYROX. El ciclo de retroalimentación `eventos → JSONL → análisis → Markdown` demuestra cómo JSONL actúa como capa intermedia entre la recolección de datos brutos y la síntesis en memoria persistente.

### Hook I/O nativo en JSON

- **stdin de hook:**
  ```json
  {
    "transcript_path": "/path/to/transcript.jsonl",
    "hook_event_name": "PreToolUse"
  }
  ```
- **stdout de hook:**
  ```json
  {
    "hookSpecificOutput": {
      "hookEventName": "PostToolUse",
      "additionalContext": "..."
    }
  }
  ```
- **Fuente:** `claude-howto/06-hooks/README.md:437`

Los hooks reciben el `transcript_path` en su stdin — esto significa que cualquier hook puede leer el historial completo de la sesión en curso.

### Conclusión clave

JSONL es el formato nativo de eventos de Claude Code. Usar JSONL en THYROX para `phase-history` y transition logs está alineado con los patrones nativos de la plataforma. No introduce una dependencia nueva — refuerza una que ya existe en el ecosistema.

---

## Sección 2: `.claude/worktrees/` — hallazgos del deep-review

### Estructura física

- **Ubicación:** `<repo>/.claude/worktrees/<name>`
- **Creación:** `claude --worktree` o `claude -w`
- **Fuente:** `claude-howto/09-advanced-features/README.md:1521`

### Hooks específicos de worktrees (HALLAZGO CRÍTICO — no documentado en análisis previo)

| Hook | Cuándo se ejecuta | Capacidad |
|------|-------------------|-----------|
| `WorktreeCreate` | Al crear un worktree | Puede retornar path → permite inicialización |
| `WorktreeRemove` | Al destruir un worktree | Para limpieza de recursos |
| `ExitWorktree` | Tool para salida manual | Control explícito del ciclo de vida |

- **Fuente:** `claude-howto/06-hooks/README.md:179`

Estos hooks no estaban contemplados en el análisis anterior de `plugin-distribution-analysis.md`. Abren la posibilidad de que THYROX inicialice y limpie estado automáticamente cuando un subagente entra o sale de un worktree.

### CLAUDE.md en worktrees — compartido (HALLAZGO CRÍTICO)

> "All worktrees and subdirectories within the same git repository share a single auto memory directory. This means switching between worktrees or working in different subdirectories of the same repo will read and write to the same memory files"

**Fuente:** `claude-howto/02-memory/README.md:481`

**Implicación directa para FASE 39:** No hay CLAUDE.md aislado por worktree. El THYROX CLAUDE.md está automáticamente disponible en todos los worktrees del repo — esto es DESEABLE. Los subagentes de metodología que operen en worktrees separados heredarán las convenciones y reglas de THYROX sin configuración adicional.

### `isolation: worktree` en subagentes (mecanismo correcto para paralelismo)

Configuración en el agente YAML:

```yaml
---
name: feature-builder
isolation: worktree
description: Implements features in an isolated git worktree
---
```

**Comportamiento:**
- El subagente opera en un worktree separado con rama diferente
- Si no hay cambios al terminar: auto-cleanup del worktree
- Si hay cambios: retorna path + branch name al agente principal para review/merge

**Fuente:** `claude-howto/04-subagents/README.md:497`

### Sparse Checkout para monorepo

```json
{
  "worktree": {
    "sparsePaths": ["packages/my-package", "shared/"]
  }
}
```

**Fuente:** `claude-howto/09-advanced-features/README.md:1526`

Relevante si THYROX evoluciona hacia un monorepo con múltiples metodologías como paquetes separados.

### Limpieza automática

> "If no changes are made in the worktree, it is automatically cleaned up when the session ends"

**Fuente:** `claude-howto/09-advanced-features/README.md:1546`

El comportamiento por defecto ya incluye cleanup. La limpieza explícita vía `WorktreeRemove` hook es un complemento, no un requerimiento para el caso base.

---

## Sección 3: Structured data patterns — resumen del ecosistema

Claude Code opera con una arquitectura de 4 capas de datos. THYROX hereda esta arquitectura y puede completarla:

| Capa | Formato | Propósito | Ejemplo |
|------|---------|-----------|---------|
| Configuración hermética | JSON | settings.json, permisos | `.claude/settings.json` |
| Memoria viva | Markdown | CLAUDE.md, reglas, context | `CLAUDE.md`, `.thyrox/guidelines/` |
| Governance/Registry | YAML | Registros semi-estructurados, aprobaciones | `registry/methodologies/*.yml` |
| Eventos raw | JSONL | Logs, transcripts, transiciones | `phase-history.jsonl` |

**Para THYROX:** Las tres primeras capas ya están implementadas. El único gap es la capa JSONL de eventos. Completar las 4 capas no es una adición cosmética — es lo que habilita observabilidad real del ciclo de vida del framework.

---

## Sección 4: Aplicaciones concretas para THYROX

### Adoptar — alta prioridad

**1. `phase-history.jsonl` — log de transiciones de estado**

- **Ubicación:** `.thyrox/context/phase-history.jsonl` (o por-WP: `work/{wp}/phase-history.jsonl`)
- **Formato:**
  ```json
  {"timestamp": "...", "from": "sdlc-analyze", "to": "sdlc-strategy", "wp": "...", "fase": 39}
  ```
- **Implementación:** extensión de ~5 líneas en `sync-wp-state.sh` (ya existe)
- **Habilitaría:** detección de stalls, tiempo por fase, validación de Markov chain

Este es el cambio de menor esfuerzo y mayor retorno. El script `sync-wp-state.sh` ya conoce el estado actual y el anterior — solo necesita hacer append al JSONL en cada transición.

**2. WorktreeCreate hook para testing de `thyrox-init.sh`**

El `WorktreeCreate` hook puede inicializar estado THYROX en worktrees de testing, permitiendo simular una "primera instalación" (worktree limpio sin `.thyrox/`).

Implementación para R-001 (idempotency):

```bash
# .claude/hooks/hooks.json → WorktreeCreate
# Script: verifica si .thyrox/ existe → si no, ejecuta thyrox-init.sh
if [ ! -d ".thyrox" ]; then
  bash .thyrox/registry/bootstrap.sh --init
fi
```

**3. `isolation: worktree` para subagentes de metodología**

En lugar de un subagente global, cada metodología puede tener su subagente con worktree propio:

- Desarrollo paralelo: DMAIC en worktree A, RUP en worktree B, sin interferencia
- El CLAUDE.md compartido garantiza que ambos operen bajo las mismas convenciones THYROX
- El auto-cleanup elimina el overhead de gestión de worktrees efímeros

### Adoptar — baja prioridad (después de Phase 6)

**4. session-JSONL para auditoría de framework**

Patrón caliber: `session.jsonl → análisis LLM periódico → CLAUDE.md`

Habilitaría aprendizaje continuo sobre qué metodologías funcionan mejor por tipo de proyecto. Requiere más infraestructura — diferir a versión 2.0 del plugin.

### Descartar

| Opción descartada | Razón |
|-------------------|-------|
| Registry en JSONL | YAML es superior para grafos jerárquicos declarativos |
| CLAUDE.md separado por worktree | No es posible — son compartidos por diseño de la plataforma |
| JSONL para artefactos WP | La estructura de carpetas ya resuelve el problema de organización |

---

## Sección 5: GAPs nuevos identificados para plugin.json

El deep-review reveló capacidades no consideradas en el análisis previo de `plugin-distribution-analysis.md`:

| GAP | Descripción | Impacto |
|-----|-------------|---------|
| GAP-007 | `WorktreeCreate`/`WorktreeRemove` hooks no están en `hooks.json` | THYROX no puede inicializar/limpiar estado en worktrees |
| GAP-008 | `transcript_path` en hooks no está siendo usado | Hooks de THYROX no leen el contexto de la sesión actual |
| GAP-009 | `isolation: worktree` en agentes de metodología no está configurado | Subagentes de metodología no tienen aislamiento real |
| GAP-010 | `.claude/worktrees/` no está en `.gitignore` | Worktrees de testing podrían commitearse accidentalmente |

GAP-007 y GAP-010 son los más urgentes: GAP-007 porque bloquea el testing de idempotencia, GAP-010 porque es un riesgo de contaminación de repo sin costo de remediación.

---

## Sección 6: Conclusión — arquitectura recomendada con JSONL + worktrees

Para Phase 2 SOLUTION STRATEGY, los hallazgos sugieren la siguiente arquitectura de ciclo de vida del plugin:

### THYROX plugin — lifecycle con JSONL + worktrees

```
Plugin lifecycle (Session):
1. SessionStart hook     → leer registry YAML → determinar metodología activa
2. WorktreeCreate hook   → inicializar .thyrox/ si primer uso
3. PreToolUse/PostToolUse → registrar transiciones en phase-history.jsonl
4. Stop hook             → actualizar now.md + append a phase-history.jsonl

Worktrees para desarrollo:
- isolation: worktree en subagentes de metodología (DMAIC, RUP, etc.)
- WorktreeCreate → auto-init de estado THYROX por metodología
- WorktreeRemove → cleanup + registro de outcome en JSONL de analytics

JSONL como capa de observabilidad:
- .thyrox/context/phase-history.jsonl  → transiciones de estado (append-only)
- Formato alineado con claude nativo: ~/.claude/logs/activity-*.jsonl
```

### Ecuación completa del stack

```
THYROX = YAML(registry) + Markdown(artefactos) + JSON(settings) + JSONL(events) + worktrees(isolation)
```

Esta ecuación completa las 4 capas del ecosistema Claude Code y añade `worktrees` como mecanismo de aislamiento de ejecución. Cada capa tiene un rol no solapado:

- **YAML** — declara estructura y relaciones (registry de metodologías)
- **Markdown** — persiste memoria y artefactos legibles por humanos
- **JSON** — configura comportamiento hermético (settings, permisos)
- **JSONL** — registra eventos raw append-only (observabilidad)
- **worktrees** — aísla ejecución paralela sin contaminar el repo principal
