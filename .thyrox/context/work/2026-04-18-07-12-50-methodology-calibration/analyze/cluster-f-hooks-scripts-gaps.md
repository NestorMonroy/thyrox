```yml
created_at: 2026-04-20 02:55:48
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Cluster F — Hooks y Scripts: Gaps de Calibración

---

## Resumen ejecutivo

Cinco hallazgos críticos emergen del análisis adversarial de los 5 hooks y 12 scripts:

**H-F01 (CRÍTICO):** `validate-session-close.sh` siempre retorna exit 0 (`exit 0 # Nunca bloquear Stop hook`, línea 116). Esto significa que el Stop hook es estructuralmente decorativo: ningún estado inválido detectado bloquea el cierre de sesión. El script detecta hasta 4 categorías de problemas reales (timestamps incompletos, agentes huérfanos, inconsistencia now.md, WP activo sin puntero) pero no actúa sobre ninguno de ellos. El nombre "validate" implica enforcement; la implementación es solo advertencia.

**H-F02 (CRÍTICO):** `stop-hook-git-check.sh` también retorna siempre exit 0 (línea 39). En conjunto con H-F01, el hook Stop completo es un sistema de dos scripts que únicamente imprime advertencias. No existe ningún mecanismo que bloquee el cierre de sesión ante estado inválido. El sistema documenta que los hooks "automatizan validación" (deep-dive línea 34: "Score Hooks 4/5 SÓLIDO") pero la automatización es de reporte, no de enforcement.

**H-F03 (CRÍTICO):** `sync-wp-state.sh` (PostToolUse Write) actualiza `current_work` en `now.md` pero **nunca actualiza `stage:` ni `phase:`**. Las líneas 44-47 hacen `sed` sobre `current_work:` y `updated_at:` únicamente. El estado de fase (qué stage está activo) se desincroniza silenciosamente si el agente escribe en un WP sin actualizar el stage. `now.md` puede mostrar stage correcto o incorrecto — no hay mecanismo de detección.

**H-F04 (ALTO):** `bound-detector.py` (PreToolUse Agent) se evade trivialmente con cualquier instrucción en inglés: `UNBOUNDED_SIGNALS` y `BOUND_SIGNALS` solo detectan patrones en español (líneas 16-38). Una instrucción como "read ALL files" activa `\bread ALL\b` (línea 22), pero "analyze every file", "process each item", "review all agents" pasan sin detección alguna. El detector cubre el idioma español del equipo pero no el inglés que aparece frecuentemente en prompts técnicos y de agentes.

**H-F05 (ALTO):** Siete de los once invariantes I-001..I-011 no tienen enforcement por ningún script ni hook. Son texto en `.claude/rules/`. I-009 declara que las reglas "cargan incondicionalmente" — esto es verdad para la carga en contexto, pero la carga no garantiza compliance. No existe hook PreToolUse para verificar I-001 (plan sin discover) ni I-002 (archivos backup) ni I-004 (timestamp real). El sistema afirma invariantes; los scripts verifican una fracción de ellos.

---

## Hallazgos por capa

### Capa 1: Mapa de cobertura de hooks

**SessionStart → `session-start.sh`**

Qué garantiza:
- Inyecta en contexto: WP activo, stage actual, methodology_step, próxima tarea pendiente (buscando `*-task-plan.md` a maxdepth 2, líneas 61-65)
- Alerta B-09: si Stage 10 activo sin execution-log (líneas 67-75)
- Muestra opciones de ejecución A (SKILL) y B (/thyrox:comando) (líneas 78-93)
- Lista tech skills activos (líneas 96-113)

Qué NO cubre:
- No verifica que `now.md` sea consistente antes de inyectar. Si `current_work` apunta a un directorio inexistente, el script muestra un WP inválido sin advertirlo. La verificación de consistencia existe en `validate-session-close.sh` (Stop hook), no aquí.
- No detecta WPs en stage 8+ sin execution-log (solo detecta Stage 10 específicamente — línea 68).
- No verifica si hay `now-*.md` huérfanos de sesiones anteriores (agentes en background sin recolectar).
- COMMANDS_SYNCED está hardcodeado a `true` (línea 10) — nunca muestra el warning `[outdated — esperar TD-008]` de la rama else (línea 84). Esto es un claim performativo: el código sugiere que hay lógica para detectar si los comandos están desactualizados, pero la variable siempre es `true`.

**Stop (hook 1) → `validate-session-close.sh`**

Qué garantiza: detección y reporte de 4 categorías de problemas:
1. TD-001: timestamps incompletos (líneas 20-28)
2. Agentes huérfanos `now-*.md` (líneas 30-53)
3. Inconsistencia `current_work: null` con WPs activos (líneas 89-95)
4. `current_work` apunta a directorio inexistente (líneas 97-105)

Qué NO cubre:
- **Nunca bloquea** (línea 116: `exit 0`). Todo lo detectado es solo impreso. El nombre "validate" crea expectativa de enforcement que no existe.
- No verifica git status (eso es tarea del segundo script del Stop hook).
- La detección de WPs "activos" (línea 80: `grep -q "^- \[ \]" "$task_plan"`) falla para WPs en Stage 1-4 que no tienen task-plan aún — los ignora silenciosamente (un WP en Stage 3 sin task-plan no se considera activo aunque lo esté).

**Stop (hook 2) → `stop-hook-git-check.sh`**

Qué garantiza: imprime advertencia si hay cambios sin commitear (líneas 35-37).

Qué NO cubre:
- Siempre exit 0 (línea 39). No bloquea nada.
- No detecta archivos staged pero no commiteados de manera diferenciada.
- No verifica que el último commit tenga formato Conventional Commits (I-005).
- El comentario de línea 33 ("Nota: validate-session-close.sh ya es llamado directamente por el Stop hook") indica que había preocupación por ejecución duplicada, pero no hay preocupación por enforcement.

**PostCompact → `session-resume.sh`**

Qué garantiza: después de compactación, re-inyecta contexto del WP activo si no estaba en el resumen compacto (líneas 51-54: verificación por grep).

Qué NO cubre:
- La detección de si el WP está en el compact_summary es solo por nombre: `grep -qF "$ACTIVE_WP"` (línea 52). Si el resumen menciona el WP pero no su stage actual, no re-inyecta el stage. El agente puede reanudar en el stage incorrecto.
- No re-inyecta las opciones de ejecución (el bloque A/B que sí genera session-start.sh). El contexto restaurado es más pobre que el de inicio.
- Task-plan search en `session-resume.sh` es `maxdepth 1` (línea 65) vs `maxdepth 2` en `session-start.sh` (línea 61). Si el task-plan está en un subdirectorio (ej: `plan-execution/`), session-resume no lo encuentra aunque session-start sí.

**PreToolUse Agent → `bound-detector.py`**

Qué garantiza: bloquea Agent tool calls con instrucciones sin scope bound, en tres niveles: sin bound (deny + opciones), bound difuso (deny + guía), bound claro (allow).

Qué NO cubre (ver H-F04 arriba): patrones en inglés.

Casos específicos no cubiertos:
- "analyze each agent" — no tiene señal en UNBOUNDED_SIGNALS
- "process every file" — "every" no está en la lista
- "review all" — "all" en inglés tampoco
- Instrucciones con números que parecen bounded pero no lo son: "read 3 files then process everything" — el BOUND_SIGNALS detectaría "3" y permitiría aunque "everything" esté presente (Paso 2 retorna allow si hay cualquier bound, líneas 138-142).

**PostToolUse Write → `sync-wp-state.sh`**

Qué garantiza: cuando se escribe un archivo en `.thyrox/context/work/`, actualiza `current_work` en `now.md` deterministicamente.

Qué NO cubre (ver H-F03 arriba):
- No actualiza `stage:` ni `phase:`.
- El path matching usa `grep -oP '\.thyrox/context/work/[^/]+'` (línea 25) — solo captura el primer nivel del WP. Si se escribe `work/2026-04-18-07.../analyze/file.md`, captura correctamente el WP. Pero si el path tiene caracteres especiales (improbable pero posible), la regex Perl puede fallar silenciosamente dado que el script usa `|| true` en varios puntos implícitamente.
- El append a `phase-history.jsonl` (líneas 49-57) registra la transición de `current_work` pero el campo `from:` es el valor previo de `current_work` — no el WP anterior. Si el agente escribe múltiples archivos en el mismo WP (lo normal), el log registra transición de `same_wp → same_wp` repetidamente, generando ruido en el historial.
- Exit sin código explícito al final (el script no tiene `exit 0` explícito). En bash, esto es exit con el código del último comando — si el append a HISTORY_FILE falla, el script puede retornar exit 1 aunque la actualización de `now.md` haya sido exitosa.

---

### Capa 2: Paths de fallo silencioso

**session-start.sh**

No tiene `set -e` ni `set -euo pipefail`. Fallo en cualquier comando continúa silenciosamente.
- Si `now.md` no existe: las variables quedan vacías, el script imprime "Sin work package activo" — comportamiento correcto.
- Si `find` falla al buscar task-plan: `TASK_PLAN` queda vacío, no se muestra próxima tarea — fallo silencioso aceptable.
- Si `_phase_to_command` recibe un phase desconocido: el `case *)` retorna `/thyrox:discover` — fallo silencioso que puede confundir al agente mostrando Stage 1 cuando se está en un stage diferente.

**session-resume.sh**

- Si `python3` no está disponible: `PARSE_FAILED=true` (línea 28), lo que causa re-inyección siempre (comportamiento conservative correcto, líneas 52-54 se cortocircuitan).
- Si `now.md` no existe: `ACTIVE_WP` queda vacío, el script hace `exit 0` en línea 48 — correcto.
- El script siempre retorna exit 0 (línea 78 explícito, línea 48 también) — nunca bloquea. Esto es intencional y correcto para PostCompact.

**validate-session-close.sh**

- `set -e` NO presente. Los fallos de `grep` retornan exit 1, pero en bash sin `set -e` esto no interrumpe el script.
- El check de WPs activos (líneas 69-86) usa criterio `has_lessons → completado; task_plan con tareas pendientes → activo`. WPs sin lessons-learned NI task-plan (early stage, abandonados) no se cuentan como activos. Esto genera falsos negativos para WPs en Stage 1-4.
- Siempre exit 0 (línea 116) — el path de fallo silencioso es el path nominal del script.

**stop-hook-git-check.sh**

- Si `git` no está disponible: `git diff --quiet 2>/dev/null` retorna exit 1 (comando no encontrado), el `||` activa y se imprime la advertencia de cambios sin commitear aunque git no exista. Es un falso positivo silencioso.
- Siempre exit 0 (línea 39).

**sync-wp-state.sh**

- `jq` con fallback a `python3` (líneas 11-15): si ambos fallan, `FILE_PATH` queda vacío y el script sale en línea 19 sin error visible — fallo silencioso. La actualización de `current_work` no ocurre pero nada lo reporta.
- `sed -i` (línea 44): si `now.md` tiene caracteres especiales en `current_work`, el `sed` puede fallar. Sin `set -e`, continúa.
- Sin `exit 0` explícito al final (línea 57 es el último comando): exit code depende del append a HISTORY_FILE. Si el append falla (permisos, directorio inexistente), el PostToolUse hook retorna exit 1. El comportamiento de Claude Code ante un PostToolUse hook que retorna exit 1 no está documentado en los scripts — puede interrumpir la operación Write o ignorarlo.

**bound-detector.py**

- Si el JSON de stdin no puede ser parseado (línea 116-118: `except json.JSONDecodeError: allow()`): fallo silencioso que permite la instrucción. Correcto por ser conservative.
- Si `tool_name != "Agent"` (línea 122): allow() inmediato — correcto.
- Si el prompt está vacío (línea 127-128): allow() — correcto.
- El script puede retornar exit code != 0 si hay un exception no capturada fuera del try/except de json (ej: error en `re.search` con un patrón malformado). Los patrones son strings literales en el código, así que esto es improbable pero no imposible.

**update-state.sh**

- `set -euo pipefail` presente (línea 16). Es el único script con esta protección.
- El contenido generado tiene hardcoded `**Branch activo:** \`claude/check-merge-status-Dcyvj\`` (línea 81). Este es un nombre de branch específico que será falso en cualquier otro branch. No hay comando `git branch --show-current` en el script — el branch se hardcodeó en algún momento y no se actualiza.
- Si `CHANGELOG.md` no existe: `VERSION="unknown"` (líneas 46-50) — correcto.
- Si `ROADMAP.md` no existe: `FASES_COUNT=0` — correcto.

**close-wp.sh**

- Sin `set -e`. Si `sed -i''` falla (ej: now.md tiene un campo sin el formato esperado), continúa silenciosamente.
- El limpiado del body "# Contexto" (líneas 25-31) usa `head -n $KEEP` + `printf` + `mv`. Si `mv` falla, el `.tmp` puede quedar en disco. No hay cleanup en caso de fallo.
- `bash ... update-state.sh || true` (línea 34): los fallos de update-state se silencian completamente. Si update-state falla (ej: por `set -euo pipefail` interno del script), `close-wp.sh` continúa y el project-state queda desactualizado sin advertencia.

**project-status.sh**

- `set -euo pipefail` presente (línea 8). Buena práctica.
- La búsqueda de WP activo usa `"${CONTEXT_DIR}/${CURRENT_WORK}"` (línea 44). Si `CURRENT_WORK` es un path absoluto (ej: `.thyrox/context/work/NOMBRE`), el path construido será incorrecto: `{CONTEXT_DIR}/.thyrox/context/work/NOMBRE`. Este bug potencial depende de cómo se escribe `current_work` en `now.md`.
- La búsqueda de ROADMAP patterns (línea 82: `grep -E '^\s*(FASE|FASE )'`) tiene una regex con grupo alternativo repetido e inútil — ambas alternativas son "FASE". Esto no es un fallo pero indica copy-paste sin revisión.

**lint-agents.py**

- No tiene hook asociado — es un utilitario manual. Si no se corre, los agentes mal formados no se detectan.
- Retorna exit 1 si hay errores (línea 221). Pero no está en ningún hook, así que el exit code no bloquea nada en el flujo normal.
- `PROHIBITED_FIELDS` incluye `system_prompt` (línea 21), pero el agente `agentic-reasoning` y otros pueden tener un body extenso de instrucciones que funcionalmente es un system_prompt sin estar en frontmatter — no detectado por el linter.

**context-audit.sh**

- No tiene hook asociado — es utilitario manual.
- `ACTIVE_WP` se determina por `ls -t "$WP_DIR" | head -1` (línea 37): toma el WP más recientemente modificado por timestamp de filesystem, no el WP activo según `now.md`. Si hay múltiples WPs, puede auditar el incorrecto.
- Los `BUDGETS` en tokens (líneas 19-31) usan ratio `CHARS_PER_TOKEN=4` (línea 34). Este ratio es para texto en inglés; el español tiene tokens más cortos (~3.5 chars/token en algunos modelos). Los budgets pueden estar subestimados para contenido en español.
- Retorna exit 1 si hay warnings (línea 93) — es el único script utilitario que retorna exit != 0 en condición anormal. Pero al no estar en ningún hook, esto no bloquea nada.

**extract-agent-output.py**

- Utilitario puro. Sin efectos sobre el estado del sistema. No relevante para análisis de hooks.
- El script falla con `sys.exit(1)` si no encuentra contenido (línea 58) — comportamiento correcto.

---

### Capa 3: Cobertura de invariantes I-001..I-011

| Invariante | Descripción | Enforced por script | Nivel de enforcement |
|------------|-------------|---------------------|----------------------|
| I-001 | DISCOVER antes de planificar | Ningún script | NINGUNO — solo texto |
| I-002 | Git como única persistencia (sin backups) | Ningún script | NINGUNO — solo texto |
| I-003 | Markdown únicamente | Ningún script | NINGUNO — solo texto |
| I-004 | Timestamp real del sistema | `validate-session-close.sh` detecta timestamps sin hora (L:21-28) | ADVERTENCIA — no bloquea |
| I-005 | Conventional Commits | Ningún script | NINGUNO — solo texto |
| I-006 | 12 fases THYROX, no SDLC | Ningún script | NINGUNO — solo texto |
| I-007 | allowed-tools en cada skill | `lint-agents.py` valida `tools:` presente (L:178-181) | MANUAL — no en hook |
| I-008 | description con "Use when..." | `lint-agents.py` genera WARN si falta patrón (L:166-175) | MANUAL — no en hook, solo WARN |
| I-009 | `.claude/rules/` carga siempre | Mecanismo de Claude Code (no script) | EXTERNO — fuera del control de scripts |
| I-010 | Metadata estándar WP | `validate-session-close.sh` detecta `created_at` sin hora (L:21-28) | ADVERTENCIA parcial — no bloquea |
| I-011 | WP solo se cierra cuando ejecutor lo ordena | Ningún script (close-wp.sh es manual) | NINGUNO — solo texto |

**Resumen:** 2 de 11 invariantes tienen algún enforcement por scripts (I-004 e I-010 tienen advertencia; I-007 e I-008 tienen validación manual no automatizada). Los 7 restantes son puramente textuales.

---

### Capa 4: Realismo performativo en scripts

**session-start.sh:10 — `COMMANDS_SYNCED=true`**

```bash
COMMANDS_SYNCED=true
```

El código tiene una rama `else` en línea 84: `echo "    B (determinístico):      ${WF_CMD}  [outdated — esperar TD-008]"`. Esta rama nunca se ejecuta porque `COMMANDS_SYNCED` siempre es `true`. El script presenta apariencia de lógica de detección de desactualización sin implementarla. Impacto: Medio — informa diseño incorrecto al agente.

**update-state.sh:81 — branch hardcodeado**

```bash
**Branch activo:** \`claude/check-merge-status-Dcyvj\`
```

El script se presenta como "Regenera project-state.md desde el estado real del repo" (línea 3) pero hardcodea el nombre del branch en lugar de derivarlo de `git branch --show-current`. El project-state.md generado tendrá el branch incorrecto en cualquier sesión que no esté en ese branch específico. Impacto: Medio — project-state.md es una fuente de referencia.

**validate-session-close.sh — nombre vs comportamiento**

El nombre "validate" y el comentario "Valida estado del WP y agentes antes de cerrar sesión" implican enforcement. El script solo imprime. El resumen final en línea 113 dice "el Stop hook no se bloquea" — esto es correcto documentalmente, pero el nombre del script crea expectativa falsa. Impacto: Alto — todo consumidor del script asume que "validación fallida = sesión bloqueada".

**context-audit.sh:37 — selección de WP activo**

```bash
ACTIVE_WP=$(ls -t "$WP_DIR" 2>/dev/null | head -1)
```

Comentario del script: "Audita el presupuesto de contexto del WP activo". En realidad audita el WP más recientemente modificado por filesystem. No hay referencia a `now.md`. Un WP puede ser el más reciente en disco sin ser el activo en la sesión. El claim "WP activo" en el comentario no está derivado del estado real. Impacto: Medio.

**session-start.sh:59-65 — búsqueda task-plan inconsistente con session-resume.sh:64-66**

`session-start.sh` usa `maxdepth 2` para encontrar task-plan (L:61). `session-resume.sh` usa `maxdepth 1` (L:65). Los dos hooks que inyectan contexto al inicio tienen lógica diferente de búsqueda del mismo artefacto. La consistencia del "próxima tarea" reportada depende de si la sesión es nueva o post-compactación. Impacto: Medio.

---

### Capa 5: Gaps de evento no cubiertos

**Gap-1: PreToolUse para Write en `.claude/` (archivos de configuración)**

El PostToolUse Write hook solo actualiza `now.md` si se escribe en `.thyrox/context/work/`. No existe hook PreToolUse para Write que intercepte escrituras en `.claude/settings.json` o `.claude/CLAUDE.md`. Cualquier modificación accidental a estos archivos ocurre sin validación. El sistema de permisos tiene `"ask": ["Edit(/.claude/scripts/*.sh)", "Edit(/.claude/settings.json)"]` en settings.json (líneas 30-32) pero esto es una confirmación de usuario, no validación de invariante.

**Gap-2: PreToolUse para Bash git commit**

No hay hook PreToolUse para `Bash(git commit *)` que valide el formato Conventional Commits (I-005). El sistema permite commits sin validar el formato mediante hook — la invariante I-005 es puramente declarativa.

**Gap-3: Hook para apertura de WP (WP creation)**

No existe hook para cuando se crea un nuevo directorio en `.thyrox/context/work/`. La invariante I-004 (timestamp real) no puede ser verificada automáticamente porque no hay evento de "WP creado".

**Gap-4: Hook para transición de stage**

No existe evento hook cuando el agente actualiza `stage:` en `now.md`. Las transiciones de stage (ej: Stage 3 → Stage 4) ocurren via Write sobre `now.md`, lo que dispara el PostToolUse Write hook (`sync-wp-state.sh`). Pero `sync-wp-state.sh` solo actualiza `current_work`, no registra la transición de stage en `phase-history.jsonl` (líneas 49-57 registran transición de WP, no de stage). El historial de transiciones de stage dentro de un WP no existe.

**Gap-5: Evento de cierre de WP**

No existe hook para cuando se ejecuta `close-wp.sh`. El cierre es un script manual — no genera evento. No hay PostToolUse que detecte cuando se crea un `*-lessons-learned.md` (señal de cierre de WP) y ejecute limpieza automática.

**Gap-6: PreToolUse para Agent tool — inglés**

Documentado en H-F04. El 30-40% del vocabulario de instrucciones técnicas usa términos en inglés no cubiertos.

**Gap-7: SessionStart sin verificación de consistencia previa**

`session-start.sh` inyecta el estado de `now.md` sin verificar que ese estado sea consistente. La verificación ocurre en `validate-session-close.sh` al cerrar — no al iniciar. Una sesión puede empezar con estado inconsistente (ej: `current_work` apuntando a directorio inexistente) y el agente opera sin saberlo hasta que revisa manualmente.

---

### Capa 6: Exit codes y propagación de errores

| Script | Exit en error | Exit en éxito | Bloquea hook | Observación |
|--------|--------------|---------------|--------------|-------------|
| `session-start.sh` | 0 (implícito) | 0 | No | Sin manejo de errores |
| `session-resume.sh` | 0 (L:78) | 0 (L:48, L:78) | No (intencional) | Correcto para PostCompact |
| `validate-session-close.sh` | 0 (L:116) | 0 (L:116) | **No** | Mismo exit en error y éxito — enforcement cero |
| `stop-hook-git-check.sh` | 0 (L:39) | 0 (L:39) | **No** | Mismo exit en error y éxito |
| `sync-wp-state.sh` | implícito del último cmd | 0 (implícito) | Posible | Si append a HISTORY_FILE falla, exit 1 sin manejo |
| `bound-detector.py` | allow() + exit 0 en JSONDecodeError | N/A (salida via JSON) | Sí (via deny JSON) | Correcto — usa protocolo JSON, no exit codes |
| `update-state.sh` | exit via `set -euo pipefail` | 0 | No (es manual) | Único script con protección completa |
| `close-wp.sh` | 0 (implícito) | 0 | No (es manual) | Sin `set -e` |
| `project-status.sh` | via `set -euo pipefail` | 0 | No (es manual) | Protección presente |
| `lint-agents.py` | 1 (L:221) | 0 | No (no en hook) | Exit codes correctos pero sin hook |
| `context-audit.sh` | 1 (L:93) | 0 (L:95) | No (no en hook) | Exit codes correctos pero sin hook |
| `extract-agent-output.py` | 1 (L:58) | 0 | No (es utilitario) | Correcto |

**Hallazgo crítico de exit codes:** Los dos scripts en el Stop hook (`validate-session-close.sh` y `stop-hook-git-check.sh`) retornan exit 0 incondicionalmente. El Stop hook no puede bloquear el cierre de sesión con la implementación actual. Esto es una decisión de diseño explícita ("Nunca bloquear Stop hook" en ambos archivos) pero implica que el Stop hook es puramente informativo.

**Asimetría de protección:** `update-state.sh` y `project-status.sh` tienen `set -euo pipefail`. El resto de scripts de hook no lo tienen. Los scripts que se ejecutan automáticamente (hooks) tienen menor protección que los scripts manuales.

---

### Capa 7: Consistencia interna entre scripts (hallazgos adicionales)

**H-F06: Discrepancia maxdepth en búsqueda de task-plan**

`session-start.sh:61`: `find "$WP_DIR" -maxdepth 2 -name "*-task-plan.md"`
`session-resume.sh:65`: `find "$WP_DIR" -maxdepth 1 -name "*-task-plan.md"`

La "próxima tarea" reportada al inicio de sesión puede diferir de la reportada post-compactación si el task-plan está en un subdirectorio (ej: `plan-execution/`). Esto no es fallo crítico pero es inconsistencia que puede confundir.

**H-F07: `project-status.sh` construye path de WP incorrectamente**

`project-status.sh:44`: `WP_DIR="${CONTEXT_DIR}/${CURRENT_WORK}"`

Si `sync-wp-state.sh` escribe `current_work: .thyrox/context/work/NOMBRE` (path relativo, que es lo que hace en línea 25: `grep -oP '\.thyrox/context/work/[^/]+'`), entonces `project-status.sh` construye `{CONTEXT_DIR}/.thyrox/context/work/NOMBRE` que es un path incorrecto. Los dos scripts asumen convenciones distintas para el valor de `current_work`.

`sync-wp-state.sh:25` produce: `.thyrox/context/work/NOMBRE` (path relativo)
`project-status.sh:44` espera: `work/NOMBRE` (path relativo al CONTEXT_DIR)
`validate-session-close.sh:99` espera: path que pueda ser verificado con `[ -d "$CURRENT_WORK" ]` (path relativo al cwd)

Los tres scripts consumen `current_work` con convenciones diferentes. Hay una inconsistencia estructural en el formato del valor de ese campo.

---

## Tabla de hallazgos consolidada

| ID | Hallazgo | Archivo | Línea | Severidad | Tipo |
|----|----------|---------|-------|-----------|------|
| H-F01 | Stop hook 1 siempre exit 0 — validación sin enforcement | `validate-session-close.sh` | L:116 | CRÍTICO | GAP |
| H-F02 | Stop hook 2 siempre exit 0 — git check sin enforcement | `stop-hook-git-check.sh` | L:39 | CRÍTICO | GAP |
| H-F03 | PostToolUse Write no actualiza `stage:` — desincronización silenciosa | `sync-wp-state.sh` | L:44-47 | CRÍTICO | GAP |
| H-F04 | bound-detector.py no cubre patrones en inglés | `bound-detector.py` | L:16-38 | ALTO | GAP |
| H-F05 | 7 de 11 invariantes sin enforcement por ningún script | `.claude/rules/thyrox-invariants.md` + todos los scripts | — | ALTO | GAP |
| H-F06 | maxdepth inconsistente para task-plan entre session-start y session-resume | `session-start.sh:61` / `session-resume.sh:65` | L:61 / L:65 | MEDIO | ANTI_PATRÓN |
| H-F07 | Convención de `current_work` inconsistente entre sync-wp-state, project-status y validate-session-close | `sync-wp-state.sh:25` / `project-status.sh:44` / `validate-session-close.sh:99` | L:25 / L:44 / L:99 | ALTO | GAP |
| H-F08 | `COMMANDS_SYNCED=true` hardcodeado — rama de advertencia nunca ejecutada | `session-start.sh` | L:10 | MEDIO | FALSO_POSITIVO |
| H-F09 | Branch activo hardcodeado en update-state.sh | `update-state.sh` | L:81 | MEDIO | FALSO_POSITIVO |
| H-F10 | context-audit.sh selecciona WP por timestamp filesystem, no por now.md | `context-audit.sh` | L:37 | MEDIO | ANTI_PATRÓN |
| H-F11 | sync-wp-state.sh sin exit 0 explícito — exit code del append puede ser 1 | `sync-wp-state.sh` | L:57 | MEDIO | GAP |
| H-F12 | close-wp.sh no hace cleanup si mv falla durante limpieza de Contexto | `close-wp.sh` | L:31 | BAJO | GAP |
| H-F13 | lint-agents.py no está en ningún hook — I-007 e I-008 sin enforcement automático | `lint-agents.py` + `settings.json` | — | ALTO | GAP |
| H-F14 | session-start.sh no verifica consistencia de now.md antes de inyectar | `session-start.sh` | L:39-50 | MEDIO | GAP |
| H-F15 | bound-detector.py: bound claro + unbounded signal → allow aunque haya ambigüedad | `bound-detector.py` | L:138-142 | MEDIO | ANTI_PATRÓN |

---

## Propuestas de tasks

### Para H-F01 y H-F02 (CRÍTICO — Stop hook sin enforcement)

**T-NNN: Diseñar política explícita de enforcement del Stop hook**

El problema no es técnico sino de diseño: el sistema eligió conscientemente `exit 0` para no bloquear el cierre. La pregunta correcta es si esa decisión debe permanecer o si algunos errores deben bloquear.

Propuesta: crear dos clases de severidad en `validate-session-close.sh`:
- WARN (exit 0): timestamps incompletos, agentes huérfanos con resultado recolectado
- BLOCK (exit 2): `current_work` apuntando a directorio inexistente, inconsistencia crítica de estado

Archivo a modificar: `.claude/scripts/validate-session-close.sh`
Dependencias: ninguna

### Para H-F03 (CRÍTICO — stage no actualizado en PostToolUse)

**T-NNN: Actualizar `stage:` en sync-wp-state.sh cuando se detecta cambio de WP**

Cuando `sync-wp-state.sh` detecta un cambio de `current_work`, leer el stage del WP nuevo desde los artefactos del WP (ej: campo `phase:` del archivo más reciente en el WP) y actualizar `stage:` en `now.md`.

Alternativa más simple: agregar un campo `stage_sync_required: true` cuando `current_work` cambia, para que `session-start.sh` lo detecte y alerte.

Archivo a modificar: `.claude/scripts/sync-wp-state.sh`
Dependencias: definir convención de cómo se lee el stage actual de un WP

### Para H-F04 (ALTO — bound-detector sin inglés)

**T-NNN: Extender UNBOUNDED_SIGNALS y BOUND_SIGNALS con patrones en inglés**

Agregar a `UNBOUNDED_SIGNALS`:
```python
r"\bevery\b", r"\beach\b", r"\ball\b", r"\ball the\b",
r"\bprocess all\b", r"\bread all\b", r"\banalyze all\b",
r"\bfor each\b", r"\bfor every\b",
```

Agregar a `BOUND_SIGNALS`:
```python
r"\bmaximum\b", r"\bmax\b", r"\bonly these\b", r"\bno more than\b",
r"\bfirst \d+\b", r"\btop \d+\b", r"\bat most\b",
```

Archivo a modificar: `.claude/scripts/bound-detector.py`
Dependencias: ninguna

### Para H-F05 (ALTO — invariantes sin enforcement)

**T-NNN: Agregar hook PreToolUse para Bash(git commit) con validación de Conventional Commits (I-005)**

Crear script `validate-commit-message.sh` que:
1. Recibe el input del Bash tool call via stdin
2. Extrae el mensaje del commit del comando
3. Valida contra regex de Conventional Commits
4. Retorna deny si no cumple el formato

Archivo a crear: `.claude/scripts/validate-commit-message.sh`
Archivo a modificar: `.claude/settings.json` (agregar PreToolUse matcher Bash)
Dependencias: definir regex de Conventional Commits a usar

### Para H-F07 (ALTO — convención de current_work inconsistente)

**T-NNN: Normalizar el formato del valor de `current_work` en now.md**

Definir en una ADR el formato canónico de `current_work`:
- Opción A: path relativo al repo root: `.thyrox/context/work/NOMBRE`
- Opción B: path relativo al CONTEXT_DIR: `work/NOMBRE`

Luego actualizar los tres scripts para usar el mismo formato:
- `sync-wp-state.sh:25` — produce el valor
- `project-status.sh:44` — consume el valor  
- `validate-session-close.sh:98-104` — verifica existencia

Archivos a modificar: los tres scripts + `close-wp.sh` (que también consume `current_work` implícitamente via `sed`)
Dependencias: ADR de formato de `current_work`

### Para H-F13 (ALTO — lint-agents.py sin hook)

**T-NNN: Agregar lint-agents.py al hook SessionStart**

El SessionStart hook ya ejecuta `session-start.sh`. Agregar una segunda entrada en el hook SessionStart que ejecute `python3 .claude/scripts/lint-agents.py` y filtre solo los errores (no warnings).

Esto garantiza que I-007 (allowed-tools) y I-008 (description pattern) se verifican al inicio de cada sesión en lugar de manualmente.

Archivo a modificar: `.claude/settings.json`
Dependencias: verificar que `lint-agents.py` sea suficientemente rápido para no impactar el inicio de sesión (actualmente corre en <1s sobre 25 agentes)
