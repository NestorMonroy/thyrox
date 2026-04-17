```yml
created_at: 2026-04-17 18:40:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
```

# Deep-Review: Referencias `.claude/references/` — Relevancia para ÉPICA 41

## Objetivo

Analizar las 47 referencias disponibles en `.claude/references/` para identificar cuáles
aportan conocimiento directo a los 2 clusters de ÉPICA 41:

- **Cluster A:** Bugs en scripts de sesión (`session-start.sh`, `session-resume.sh`, `close-wp.sh`)
- **Cluster B:** README desactualizado (v0.1.0 → v2.8.0 con coordinators)

---

## Tier 1 — Leer ANTES de tocar código (directamente relevantes)

### `hooks.md` — 🔴 CRÍTICO para Cluster A

**Por qué:** `session-start.sh` y `stop-hook-git-check.sh` son hooks de Claude Code.
Cualquier modificación debe respetar la semántica del framework de hooks.

**Qué aporta:**
- Tabla de 26 eventos — confirma que `SessionStart` tiene matchers: `startup`, `resume`, `clear`, `compact`
- `SessionStart` NO puede bloquear (no hay exit code 2 posible) — solo inyecta contexto
- `Stop` (StopHook) SÍ puede bloquear con exit 2
- Input JSON de `SessionStart`: campos `session_id`, `cwd`, `hook_event_name`, `permission_mode`
- `once: true` en frontmatter de skill — relevante si se agrega lógica de sesión a skills

**Aplicación concreta para ÉPICA 41:**
- Al eliminar el fallback de `session-start.sh`: el hook puede emitir "Sin WP activo" y
  `exit 0` sin bloquear — correcto según la semántica SessionStart
- El campo `matcher: "resume"` en SessionStart puede usarse para diferenciar comportamiento
  en restart vs resume si fuera necesario

---

### `hook-output-control.md` — 🔴 CRÍTICO para Cluster A

**Por qué:** Define exactamente qué puede salir de un hook y cómo Claude Code lo interpreta.

**Qué aporta:**
- `suppressOutput` controla el stdout del hook en el debug log — NO el tool result
  (relevante si `session-start.sh` produce output que no queremos en debug)
- `additionalContext` en PostToolUse permite inyectar contexto después de un tool — pattern
  que podría usarse en `sync-wp-state.sh` para enricher el contexto de Claude
- Exit 0 + stdout JSON → Claude Code parsea la respuesta
- Exit 2 + stderr → bloquea y muestra error a Claude
- SessionStart NO tiene `permissionDecision` ni `updatedInput` (solo los tiene PreToolUse)

**Aplicación concreta:**
- El fix de `session-start.sh`: output a stdout (Claude lo ve) sin JSON especial → exit 0 normal
- Si se quiere que Claude NO vea un mensaje del hook: `suppressOutput: true` en JSON output

---

### `hook-authoring.md` — 🟠 ALTO para Cluster A

**Por qué:** Guía de authoring de hooks — cuándo hook es la solución correcta vs SKILL vs Agent.

**Qué aporta:**
- Tabla "cuando un hook NO es la solución correcta": si necesitas que Claude *razone*, es SKILL
- Pattern `SessionStart` para cargar estado: exactamente lo que hace `session-start.sh`
- Anti-patrón documentado: no leer de argumentos del comando, siempre de stdin (JSON)
- Debugging: `claude --debug` para ver logs de ejecución de hooks
- `once: true` en component hooks — relevante si se considera mover lógica a skill frontmatter

**Aplicación concreta:**
- Confirma que `session-start.sh` como SessionStart hook es el pattern correcto
- El fix es quirúrgico (eliminar bloque else), no un rediseño arquitectónico

---

### `state-management.md` — 🔴 CRÍTICO para Cluster A

**Por qué:** Define la fuente de verdad de `now.md` y cuándo actualizarla.

**Qué aporta:**
- **Regla de oro documentada:** "`now.md` es la fuente de verdad para `session-start.sh`.
  Si `now.md::current_work` es incorrecto, el hook arranca con el WP equivocado."
- `current_work` debe ser relativo a `.thyrox/context/` — `work/TIMESTAMP-nombre/`
  NO `context/work/TIMESTAMP-nombre/` (path duplicado)
- Tabla de triggers: Phase 7 WP cerrado → `current_work: null`, `phase: null`
- `now.md` body text: no documentado explícitamente — es el gap que causa el stale body

**Gap identificado:** `state-management.md` documenta el schema YAML de `now.md` pero
NO documenta el cuerpo markdown (`# Contexto`). Esto es exactamente el gap que causa el
problema A-4: `close-wp.sh` limpia el YAML pero no el body.

**Aplicación concreta:**
- El fix de `close-wp.sh` debe limpiar TANTO el YAML (ya hace) COMO el cuerpo `# Contexto`
- Referencia confirma que `stage:` (no `phase:`) es el campo correcto en `now.md`

---

### `memory-patterns.md` — 🟡 MEDIO para Cluster A

**Por qué:** Explica el patrón `now.md / focus.md / project-state.md` de estado de sesión.

**Qué aporta:**
- Diferencia clara: `CLAUDE.md` = instrucciones universales; `now.md` = estado efímero
- `now.md` debe actualizarse: al inicio de sesión, al cambiar de tarea, al cerrar
- Pattern de @imports: cómo CLAUDE.md puede referenciar docs externos

**Aplicación para README (Cluster B):**
- El README no debería importar estado de sesión — debe describir el framework
- La sección de Quick Start del README tiene que referenciar correctamente
  `bin/thyrox-init.sh` (no `setup-template.sh`) y la nueva estructura

---

### `memory-hierarchy.md` — 🟡 MEDIO para Cluster B

**Por qué:** Describe los 8 niveles de memoria y cómo CLAUDE.md se carga.

**Qué aporta:**
- Nivel 3 (Project Memory `CLAUDE.md`) es la fuente universal del proyecto
- @imports desde CLAUDE.md cargan automáticamente — relevante para el fix de guidelines
- La jerarquía explica por qué cambiar CLAUDE.md tiene efecto inmediato en Claude

**Aplicación para Cluster B:**
- README no es memoria de Claude — es documentación pública. Su desactualización no
  afecta al LLM directamente pero sí a usuarios humanos que lo leen

---

## Tier 2 — Leer DURANTE implementación (apoyo técnico)

### `settings-reference.md` — 🟡 MEDIO para Cluster A

**Por qué:** Referencia completa de `settings.json` — donde viven los hooks.

**Qué aporta:**
- Confirma que hooks están bajo `settings.hooks.{EventName}`
- `disableAllHooks: false` por defecto — no hay riesgo de que el fix desactive hooks
- Estructura correcta de hook arrays con `matcher` y `hooks[]`

**Cuándo leer:** Si se modifica `settings.json` como parte del fix (ej: agregar matcher
a SessionStart hook para diferenciar `startup` vs `resume`).

---

### `known-issues.md` — 🟠 ALTO (contexto importante)

**Por qué:** Documenta bugs activos de Claude Code que pueden interactuar con el fix.

**Qué aporta:**
- **Bug de cache rebuild en --resume**: cada `--resume` hace full cache rebuild. RELEVANTE
  porque el GO-TO problem hace que Claude use `--resume` innecesariamente cuando el hook
  muestra WP activo incorrecto → más --resume → más costo de tokens.
  **El fix de ÉPICA 41 reduce indirectamente el impacto del Bug de cache rebuild.**
- Bug de GitHub issue en repo incorrecto — no relevante para ÉPICA 41 directamente
  pero importante para cualquier interacción con GitHub durante el WP

**Aplicación:** Documentar en lessons learned que el GO-TO fix tiene beneficio secundario
en reducción de cache rebuilds.

---

### `production-safety.md` — 🟡 MEDIO (Cluster A preventivo)

**Por qué:** Best practices para operaciones en producción — relevante al modificar scripts
que corren como hooks en cada sesión.

**Qué aporta (esperado):** Validaciones antes de deployar hooks, testing de scripts,
manejo de errores.

**Cuándo leer:** Antes de commitear los scripts modificados.

---

### `checkpointing.md` — 🟡 MEDIO (awareness)

**Por qué:** Documenta que cambios hechos por scripts de hooks NO son revertibles via `/rewind`.

**Qué aporta:**
- Cambios de bash en hooks no capturados por checkpointing
- Si `session-start.sh` modifica un archivo → no hay rollback automático

**Aplicación:** El fix de `close-wp.sh` que limpia `now.md` body es irreversible
(no hay /rewind para esto). Confirma que el fix debe ser correcto la primera vez.

---

### `subagent-patterns.md` — 🟡 MEDIO (context relevante)

**Por qué:** Documenta isolation patterns y cómo agents corren en worktrees separados.

**Qué aporta:**
- Worktree isolation: coordinators corren en worktrees separados — esto explica por qué
  no pueden modificar `now.md` del repo principal directamente
- Persistent memory entre agents: cómo `now.md` es la fuente de verdad compartida

**Aplicación:** Si en fases futuras se propone mover el session tracking a un agente,
este reference documenta los patterns.

---

## Tier 3 — No relevantes directamente para ÉPICA 41

| Referencia | Por qué no relevante |
|-----------|---------------------|
| `advanced-features.md` | Planning Mode, Extended Thinking, Sandboxing — ninguno aplica a fix de scripts |
| `agent-authoring.md` | Crear agentes — ÉPICA 41 modifica scripts, no agentes |
| `agent-spec.md` | Spec de agentes nativos — no aplica |
| `benchmark-skill-vs-claude.md` | Benchmark de skills — no aplica |
| `cli-reference.md` | Flags CLI — no aplica al fix |
| `claude-authoring.md` | Crear CLAUDE.md — no aplica |
| `claude-code-components.md` | Descripción general — no necesario |
| `command-execution-model.md` | Slash commands — no aplica |
| `component-decision.md` | SKILL vs Agent vs Hook — no aplica (decisión ya tomada) |
| `context-engineering.md` | Ingeniería de contexto — no aplica |
| `conventions.md` | Convenciones de archivos — consultar para README fix si necesario |
| `development-methodologies.md` | Descripción de metodologías — no aplica |
| `examples.md` | Casos de uso — no aplica |
| `github-actions.md` | CI/CD — no aplica |
| `glossary.md` | Glosario — consultar si necesario |
| `long-context-tips.md` | Tips de contexto largo — no aplica |
| `long-running-calls.md` | Llamadas largas — no aplica |
| `mcp-integration.md` | Servidores MCP — no aplica |
| `multimodal.md` | Imágenes, PDFs — no aplica |
| `multi-instance-workflows.md` | Multi-instancia — no aplica |
| `output-formats.md` | Formatos de output — no aplica |
| `permission-model.md` | Permisos de herramienta — consultar si el fix requiere cambiar settings.json |
| `plugins.md` | Plugin architecture — no aplica |
| `prompting-tips.md` | Tips de prompting — no aplica |
| `scheduled-tasks.md` | Tareas programadas — no aplica |
| `sdd.md` | Spec-Driven Development — no aplica |
| `security-hardening.md` | Hardening — no aplica directamente |
| `skill-authoring.md` | Crear skills — solo si se propone mover lógica a skill |
| `skill-vs-agent.md` | SKILL vs agente — no aplica |
| `slash-commands-reference.md` | Comandos slash — no aplica |
| `stream-resilience.md` | Resiliencia de streaming — no aplica |
| `streaming-errors.md` | Errores de streaming — no aplica |
| `testing-patterns.md` | Patrones de testing — útil si se agregan tests a scripts |
| `tool-execution-model.md` | Modelo de ejecución de tools — no aplica |
| `tool-patterns.md` | Patrones de tools — no aplica |
| `visual-reference.md` | Referencia visual — no aplica |

---

## Hallazgos no esperados (insight de este review)

### Insight 1: Gap documentado en state-management.md

`state-management.md` documenta el schema YAML de `now.md` pero NO menciona el cuerpo
markdown (`# Contexto`). Esto implica que el body es:
1. Gestionado exclusivamente por el LLM (no por scripts)
2. No tiene una "especificación" formal de cuándo debe limpiarse

**Recomendación para ÉPICA 41:** Al crear el fix de `close-wp.sh`, también actualizar
`state-management.md` para documentar que al cerrar un WP el cuerpo `# Contexto` debe
sobreescribirse con el template vacío.

### Insight 2: El GO-TO fix tiene beneficio secundario (cache)

`known-issues.md` documenta que `--resume` causa full cache rebuild (Bug 2 de cache).
Cuando el GO-TO problem muestra un WP cerrado como activo, Claude puede intentar retomarlo
y el usuario hace `--resume` innecesariamente. El fix de ÉPICA 41 reduce este riesgo.

**Recomendación:** Mencionar en lessons learned de ÉPICA 41.

### Insight 3: SessionStart hook no puede bloquear

`hooks.md` confirma que `SessionStart` NO puede usar exit 2 para bloquear. Esto es
consistente con el diseño actual de `session-start.sh` que solo inyecta contexto.
El fix (eliminar fallback) mantiene este comportamiento: siempre exit 0.

### Insight 4: `hook-output-control.md` documenta `additionalContext`

`sync-wp-state.sh` (PostToolUse Write hook) podría usar `additionalContext` para enriquecer
el contexto que Claude recibe después de escribir `now.md`. Actualmente solo actualiza el
YAML — podría también inyectar contexto de confirmación.

**Esto no es parte de ÉPICA 41** (fuera de scope) pero es una mejora futura para ÉPICA 42+.

---

## Resumen ejecutivo: lista de lectura para ÉPICA 41

**Leer antes de tocar scripts (Cluster A):**
1. `state-management.md` — reglas de `now.md` y cuándo limpiar
2. `hooks.md` — eventos, exit codes, matchers
3. `hook-output-control.md` — qué puede salir de un hook y cómo

**Leer durante implementación:**
4. `hook-authoring.md` — debugging de hooks, validación
5. `known-issues.md` — bugs activos que interactúan
6. `settings-reference.md` — si se modifica `settings.json`

**Leer para README fix (Cluster B):**
7. `memory-patterns.md` — diferencia entre CLAUDE.md y README
8. `conventions.md` — convenciones de archivos si se crean secciones nuevas

**No leer para ÉPICA 41** (los 38 restantes son fuera de scope).
