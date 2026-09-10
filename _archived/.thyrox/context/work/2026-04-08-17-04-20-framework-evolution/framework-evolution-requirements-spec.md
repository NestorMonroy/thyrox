```yml
type: Especificación de Requisitos
work_package: 2026-04-08-17-04-20-framework-evolution
created_at: 2026-04-08 20:00:00
phase: Phase 4 — STRUCTURE
status: Draft — awaiting approval
```

# Especificación de Requisitos — FASE 22: Framework Evolution

## Resumen Ejecutivo

FASE 22 integra la nueva documentación oficial de Claude Code con 5 deudas técnicas prioritarias del proyecto. Los cambios abarcan la capa de hooks (Capa 0), la documentación arquitectónica (ADR-015), y la Capa 3 completa (migración commands→skills).

**Objetivo:** Corregir R-05 (riesgo activo), alinear ADR-015 con la realidad documentada, y ejecutar TD-008 con estrategia ampliada (skills hidden + hooks automáticos).

---

## Mapeo Plan → Especificación

| Bloque | TD | ID Spec | Descripción técnica |
|--------|-----|---------|-------------------|
| E | TD-013 | SPEC-E01 | Crear `stop-hook-git-check.sh` con verificación `stop_hook_active` |
| E | TD-012 | SPEC-E02 | Crear `session-resume.sh` — hook PostCompact condicional |
| E | TD-012 | SPEC-E03 | Registrar hooks `Stop` y `PostCompact` en `settings.json` |
| B | TD-011 | SPEC-B01 | Añadir checklist de atomicidad en SKILL.md Phase 5 |
| A | — | SPEC-A01 | ADR-015 Addendum: 5 correcciones |
| A | — | SPEC-A02 | `skill-vs-agent.md`: 3 actualizaciones |
| A | — | SPEC-A03 | ADR-016: decisión commands → skills hidden |
| C | TD-008 | SPEC-C01 | Spike: verificar invocación `/<name>` desde skill con `disable-model-invocation: true` |
| C | TD-008 | SPEC-C02 | Migrar 7 `/workflow_*` a `.claude/skills/` con frontmatter correcto |
| C | TD-008 | SPEC-C03 | Sincronizar contenido de los 7 skills con lógica actual de SKILL.md |
| C | TD-008 | SPEC-C04 | Reducir `pm-thyrox SKILL` a catálogo ~40 líneas |
| C | TD-008 | SPEC-C05 | Eliminar los 7 archivos de `.claude/commands/` |
| C | TD-008 | SPEC-C06 | Actualizar `session-start.sh`: `COMMANDS_SYNCED=true` |
| C | TD-008 | SPEC-C07 | Documentar sinergia `/loop` + `/workflow_*` en skill migrado |
| D | TD-007 | SPEC-D01 | Añadir Step 0 en Phase 1 de SKILL.md |
| D | TD-007 | SPEC-D02 | Crear template `[nombre]-context.md` en `assets/` |

---

## SPEC-E01: Crear stop-hook-git-check.sh

**ID:** SPEC-E01 | **Prioridad:** Critical | **Bloque:** E

### Descripción

Crear el script `stop-hook-git-check.sh` que se ejecuta como hook `Stop` después de cada respuesta de Claude. El script verifica si hay cambios sin commitear y emite un recordatorio. Debe verificar `stop_hook_active` para evitar loop infinito.

El archivo **no existe** actualmente — es una creación nueva.

### Criterios de Aceptación

```
Given el hook Stop dispara (Claude termina una respuesta)
  AND el input JSON contiene "stop_hook_active": true
When el script se ejecuta
Then el script sale con código 0 sin producir ningún output
  AND no dispara una nueva respuesta de Claude

Given el hook Stop dispara
  AND el input JSON contiene "stop_hook_active": false (o ausente)
  AND hay cambios uncommitted en git
When el script se ejecuta
Then el script imprime un recordatorio visible sobre los cambios pendientes
  AND sale con código 0

Given el hook Stop dispara
  AND "stop_hook_active": false
  AND no hay cambios uncommitted
When el script se ejecuta
Then el script sale silenciosamente con código 0
```

### Consideraciones Técnicas

- El hook recibe JSON por stdin: `{"hook_event_name": "Stop", "stop_hook_active": true|false, "last_assistant_message": "..."}`
- Parsear con `python3 -c` o `jq` si disponible — fallback a `grep` si ninguno está disponible
- El script debe ser permisivo: si el parse de JSON falla, continuar (no abortar) asumiendo `stop_hook_active: false`
- `last_assistant_message` no se usa en v1 — reservado para mejora futura (TD-013 v2)

### Implementación

**Archivos a crear:**
- `.claude/skills/pm-thyrox/scripts/stop-hook-git-check.sh`

**Esfuerzo estimado:** 1 tarea | **Complejidad:** Baja

---

## SPEC-E02: Crear session-resume.sh

**ID:** SPEC-E02 | **Prioridad:** High | **Bloque:** E

### Descripción

Crear `session-resume.sh`, hook `PostCompact` que se ejecuta después de que Claude compacta el contexto. Re-inyecta el WP activo, fase actual, y próxima tarea — pero solo si el `compact_summary` generado no los menciona ya.

### Criterios de Aceptación

```
Given el hook PostCompact dispara
  AND el input JSON contiene compact_summary con el path del WP activo
When el script se ejecuta
Then el script sale silenciosamente (no re-inyecta, el summary ya tiene el contexto)

Given el hook PostCompact dispara
  AND el compact_summary NO menciona el path del WP activo
  AND existe un WP activo en context/work/
When el script se ejecuta
Then el script imprime: nombre del WP activo, fase actual (de now.md), próxima tarea pendiente
  AND el output es conciso (≤5 líneas, sin el banner completo de session-start.sh)

Given el hook PostCompact dispara
  AND no existe WP activo (o now.md está vacío/null)
When el script se ejecuta
Then el script sale silenciosamente con código 0

Given el parse de compact_summary falla (JSON malformado)
When el script se ejecuta
Then el script re-inyecta siempre (comportamiento permisivo — mejor redundante que silencioso)
```

### Consideraciones Técnicas

- El hook recibe JSON por stdin: `{"hook_event_name": "PostCompact", "compact_summary": "..."}`
- El check de WP activo usa la misma lógica que `session-start.sh` (leer `now.md`, fallback a `ls -t`)
- El check en `compact_summary` es un `grep` del basename del WP activo — suficiente precisión
- No duplicar la lógica de detección de WP: puede hacer `source` de una función compartida o duplicar mínimamente

### Implementación

**Archivos a crear:**
- `.claude/skills/pm-thyrox/scripts/session-resume.sh`

**Esfuerzo estimado:** 2 tareas (script + test manual) | **Complejidad:** Baja-Media

---

## SPEC-E03: Registrar Stop y PostCompact en settings.json

**ID:** SPEC-E03 | **Prioridad:** Critical | **Bloque:** E

### Descripción

Actualizar `.claude/settings.json` para registrar los dos nuevos hooks. Sin este cambio, ni `stop-hook-git-check.sh` ni `session-resume.sh` dispararán nunca.

### Criterios de Aceptación

```
Given settings.json está configurado correctamente
When Claude termina cualquier respuesta
Then el hook Stop dispara stop-hook-git-check.sh

Given settings.json está configurado correctamente
When Claude compacta el contexto
Then el hook PostCompact dispara session-resume.sh

Given settings.json actualizado
When se inspecciona el archivo
Then contiene los 3 hooks: SessionStart, Stop, PostCompact
  AND el SessionStart existente no fue modificado
```

### Implementación

**Archivos a modificar:**
- `.claude/settings.json`

**Estructura objetivo:**
```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "bash .claude/skills/pm-thyrox/scripts/session-start.sh" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "bash .claude/skills/pm-thyrox/scripts/stop-hook-git-check.sh" }] }],
    "PostCompact": [{ "hooks": [{ "type": "command", "command": "bash .claude/skills/pm-thyrox/scripts/session-resume.sh" }] }]
  }
}
```

**Esfuerzo estimado:** 1 tarea (parte de TD-012) | **Complejidad:** Baja

---

## SPEC-B01: Checklist de atomicidad en SKILL.md Phase 5

**ID:** SPEC-B01 | **Prioridad:** High | **Bloque:** B

### Descripción

Añadir en SKILL.md Phase 5 DECOMPOSE una sección de checklist de atomicidad que debe verificarse antes de presentar el task-plan al usuario.

### Criterios de Aceptación

```
Given SKILL.md Phase 5 actualizado
When Claude crea un task-plan
Then aplica el checklist de atomicidad antes de presentarlo al usuario

Given una tarea describe "Actualizar X con [A, B, C]"
When se aplica el criterio de atomicidad
Then se divide en 3 tareas: una por operación

Given una tarea está en el task-plan
When se verifica atomicidad
Then cada tarea toca exactamente 1 ubicación (1 archivo O 1 sección)
  AND ninguna descripción conecta dos operaciones con "y"
  AND su commit describe exactamente un cambio
```

### Implementación

**Archivos a modificar:**
- `.claude/skills/pm-thyrox/SKILL.md` — sección Phase 5 DECOMPOSE

**Contenido a añadir:** Checklist de 3 ítems previo a la presentación del task-plan:
```
Antes de presentar el task-plan al usuario:
- [ ] Cada tarea toca exactamente 1 ubicación (1 archivo O 1 sección de 1 archivo)
- [ ] Ninguna descripción de tarea contiene "y" conectando dos operaciones distintas
- [ ] Cada tarea puede commitearse y marcarse [x] de forma independiente
```

**Esfuerzo estimado:** 1 tarea | **Complejidad:** Baja

---

## SPEC-A01: ADR-015 Addendum con 5 correcciones

**ID:** SPEC-A01 | **Prioridad:** High | **Bloque:** A

### Descripción

Añadir sección "Addendum 2026-04-08" al final de `adr-015.md` con 5 correcciones de conocimiento. El Status y las decisiones D-01..D-09 permanecen intactos.

### Criterios de Aceptación

```
Given el Addendum añadido a ADR-015
When se lee el ADR
Then contiene exactamente 5 correcciones documentadas:
  1. H1 matizado: tabla de 3 modos de triggering
  2. Capa 0 corregida: "determinístico" aplica solo a type:command (4 tipos listados)
  3. Tabla 5 capas: .claude/rules/ como sublayer path-scoped de Capa 1
  4. Tabla 5 capas: Capa 3 actualizada a "skills hidden" (refleja TD-008 completado)
  5. Tabla de mecanismos: Agent teams como 4ta categoría (peer-to-peer, experimental)
AND el Status sigue siendo "Accepted"
AND las decisiones D-01..D-09 no fueron modificadas
```

### Implementación

**Archivos a modificar:**
- `.claude/context/decisions/adr-015.md` — añadir sección Addendum al final

**Esfuerzo estimado:** 2 tareas | **Complejidad:** Baja

---

## SPEC-A02: skill-vs-agent.md — 3 actualizaciones

**ID:** SPEC-A02 | **Prioridad:** Medium | **Bloque:** A

### Descripción

Actualizar `references/skill-vs-agent.md` con 3 correcciones derivadas de la nueva documentación oficial.

### Criterios de Aceptación

```
Given skill-vs-agent.md actualizado
When se lee el documento
Then la tabla de triggering incluye los 3 modos (model-invocable / user-invocable / hidden)
  AND la sección de hooks documenta los 4 tipos (command / prompt / agent / http)
  AND existe una sección o fila para "Agent teams" como categoría peer-to-peer
```

### Implementación

**Archivos a modificar:**
- `.claude/skills/pm-thyrox/references/skill-vs-agent.md`

**Esfuerzo estimado:** 1 tarea | **Complejidad:** Baja

---

## SPEC-A03: ADR-016 — Decisión commands → skills hidden

**ID:** SPEC-A03 | **Prioridad:** High | **Bloque:** A

### Descripción

Crear `adr-016.md` documentando la decisión de migrar `/workflow_*` de `.claude/commands/` a `.claude/skills/` con `disable-model-invocation: true`.

### Criterios de Aceptación

```
Given ADR-016 creado
When se lee el ADR
Then documenta: contexto (hallazgo H-NEW-2 + H-SCHED-1)
  AND opciones consideradas (mantener commands/ vs skills hidden)
  AND decisión elegida con justificación
  AND implicación sobre tabla 5 capas de ADR-015 (Capa 3 → skills hidden)
  AND criterio de revisión (cuando /workflow_* sean obsoletos)
```

### Implementación

**Archivos a crear:**
- `.claude/context/decisions/adr-016.md`

**Esfuerzo estimado:** 2 tareas | **Complejidad:** Media

---

## SPEC-C01: Spike — verificar invocación `/<name>` desde skills hidden

**ID:** SPEC-C01 | **Prioridad:** Critical (bloqueante del resto de Bloque C) | **Bloque:** C

### Descripción

Antes de migrar los 7 archivos, verificar empíricamente que un skill con `disable-model-invocation: true` puede invocarse con `/<name>` en Claude Code Web, y que el comportamiento es idéntico a invocarlo desde commands/.

### Criterios de Aceptación

```
Given un skill de prueba creado en .claude/skills/workflow_spike_test.md
  con frontmatter: disable-model-invocation: true
When el usuario escribe /workflow_spike_test
Then Claude ejecuta el contenido del skill
  AND el comportamiento es idéntico al de un archivo en .claude/commands/

Given el spike falla (/<name> no funciona desde skills)
When se documenta el resultado
Then se activa el fallback: mantener los 7 archivos en commands/ y solo sincronizar contenido
  AND SPEC-C02 queda cancelado, SPEC-C03 adapta su alcance
```

### Consideraciones Técnicas

- El skill de prueba debe eliminarse tras el spike (no dejar artefactos)
- Registrar el resultado en el execution-log del WP

### Implementación

**Archivos temporales:**
- `.claude/skills/workflow_spike_test.md` (eliminar post-spike)

**Esfuerzo estimado:** 1 tarea | **Complejidad:** Baja (pero bloqueante)

---

## SPEC-C02: Migrar 7 `/workflow_*` a `.claude/skills/`

**ID:** SPEC-C02 | **Prioridad:** High | **Depende de:** SPEC-C01 exitoso | **Bloque:** C

### Descripción

Mover los 7 archivos de fase (`workflow_analyze.md`, `workflow_strategy.md`, `workflow_plan.md`, `workflow_structure.md`, `workflow_decompose.md`, `workflow_execute.md`, `workflow_track.md`) de `.claude/commands/` a `.claude/skills/`. Añadir frontmatter YAML con `disable-model-invocation: true` y hook de actualización de `now.md::phase` con `once: true`.

`workflow_init.md` NO se migra — es un comando de inicialización de tech skills, no un workflow de fase.

### Criterios de Aceptación

```
Given los 7 archivos migrados a .claude/skills/
When se inspecciona cada archivo
Then contiene frontmatter YAML con:
  - disable-model-invocation: true
  - hooks: [{ event: PostToolUse (o equivalente), once: true, command: actualiza now.md::phase }]
AND el contenido del body permanece (se actualiza en SPEC-C03)

Given el usuario escribe /workflow_analyze (u otro workflow)
When Claude procesa el comando
Then el skill se ejecuta con comportamiento idéntico al anterior
```

### Implementación

**Archivos a mover (de commands/ a skills/):**
- `workflow_analyze.md`, `workflow_strategy.md`, `workflow_plan.md`
- `workflow_structure.md`, `workflow_decompose.md`, `workflow_execute.md`, `workflow_track.md`

**Esfuerzo estimado:** 3 tareas (frontmatter + hooks + verificación) | **Complejidad:** Media

---

## SPEC-C03: Sincronizar contenido de los 7 skills con SKILL.md

**ID:** SPEC-C03 | **Prioridad:** High | **Bloque:** C

### Descripción

Actualizar el contenido de cada skill migrado para que refleje la lógica actual de SKILL.md: gates asíncronos, Stopping Point Manifest, calibración por tamaño de WP, state-management con `now.md`, y checklist de atomicidad (en `workflow_decompose`).

### Criterios de Aceptación

```
Given cada workflow_* skill sincronizado
When se verifica su contenido
Then cada skill incluye:
  - Contexto de sesión: cómo identificar WP activo y verificar si la fase ya completó
  - Lógica de la fase: pasos completos incluyendo gates, manifest, calibración
  - Exit criteria: condición de completitud
  - Propuesta de siguiente fase
AND workflow_decompose incluye el checklist de atomicidad (de SPEC-B01)
AND cada skill tiene updated_at en su frontmatter
```

### Implementación

**Archivos a modificar:** Los 7 skills en `.claude/skills/workflow_*.md`

**Esfuerzo estimado:** 7 tareas (1 por skill) | **Complejidad:** Media-Alta (requiere leer SKILL.md completo)

---

## SPEC-C04: Reducir pm-thyrox SKILL a catálogo ~40 líneas

**ID:** SPEC-C04 | **Prioridad:** High | **Depende de:** SPEC-C03 completado | **Bloque:** C

### Descripción

Reducir el contenido de `pm-thyrox SKILL.md` de ~430 líneas a ~40 líneas. La lógica de fase se eliminó y vive ahora en los 7 skills de workflow (SPEC-C03). El SKILL pasa a ser un catálogo de activación y referencia.

### Criterios de Aceptación

```
Given pm-thyrox SKILL.md reducido
When se inspecciona el archivo
Then contiene: descripción de activación (~5 líneas)
  AND tabla de /workflow_* con fase → skill name
  AND referencia a ADR-015 como arquitectura
  AND NOT contiene lógica detallada de fases (esa vive en los skills de workflow)
AND tiene ≤80 líneas totales
```

### Implementación

**Archivos a modificar:**
- `.claude/skills/pm-thyrox/SKILL.md`

**Esfuerzo estimado:** 2 tareas | **Complejidad:** Media

---

## SPEC-C05: Eliminar los 7 archivos de `.claude/commands/`

**ID:** SPEC-C05 | **Prioridad:** High | **Depende de:** SPEC-C02, SPEC-C03 | **Bloque:** C

### Descripción

Eliminar los 7 archivos de workflow de `.claude/commands/`. `workflow_init.md` permanece en commands/ — no se elimina.

### Criterios de Aceptación

```
Given los 7 archivos eliminados de .claude/commands/
When se lista .claude/commands/
Then solo contiene workflow_init.md (y cualquier otro comando no-workflow)
AND los 7 skills en .claude/skills/ están funcionando (verificado en SPEC-C01)
```

### Implementación

**Archivos a eliminar:**
- `.claude/commands/workflow_analyze.md`
- `.claude/commands/workflow_strategy.md`
- `.claude/commands/workflow_plan.md`
- `.claude/commands/workflow_structure.md`
- `.claude/commands/workflow_decompose.md`
- `.claude/commands/workflow_execute.md`
- `.claude/commands/workflow_track.md`

**Esfuerzo estimado:** 1 tarea | **Complejidad:** Baja

---

## SPEC-C06: Actualizar session-start.sh — COMMANDS_SYNCED=true

**ID:** SPEC-C06 | **Prioridad:** High | **Depende de:** SPEC-C02, SPEC-C03 | **Bloque:** C

### Descripción

Cambiar `COMMANDS_SYNCED=false` a `COMMANDS_SYNCED=true` en `session-start.sh` para que el hook ya no muestre la etiqueta `[outdated — esperar TD-008]` en la Ruta B.

### Criterios de Aceptación

```
Given session-start.sh con COMMANDS_SYNCED=true
When se inicia una sesión Claude Code
Then el hook muestra "B (determinístico): /workflow_analyze" sin etiqueta [outdated]
  AND el mensaje de la Ruta A refleja que ambas rutas son de calidad equivalente
```

### Implementación

**Archivos a modificar:**
- `.claude/skills/pm-thyrox/scripts/session-start.sh` — cambiar línea 13

**Esfuerzo estimado:** 1 tarea | **Complejidad:** Baja

---

## SPEC-C07: Documentar sinergia /loop + /workflow_*

**ID:** SPEC-C07 | **Prioridad:** Low | **Bloque:** C

### Descripción

Añadir una nota de diseño en al menos uno de los skills migrados (preferiblemente `workflow_execute`) documentando que la sinergia `/loop 10m /workflow_execute` es posible una vez migrados los skills.

### Criterios de Aceptación

```
Given workflow_execute.md (skill) actualizado
When se lee el contenido
Then contiene una nota sobre la sinergia: "/loop 10m /workflow_execute — posible gracias a skills hidden"
```

### Implementación

**Archivos a modificar:**
- `.claude/skills/workflow_execute.md` — añadir nota al final

**Esfuerzo estimado:** incluido en SPEC-C03 (tarea 6 de 7) | **Complejidad:** Trivial

---

## SPEC-D01: Step 0 en SKILL.md Phase 1

**ID:** SPEC-D01 | **Prioridad:** Medium | **Bloque:** D

### Descripción

Añadir Step 0 al inicio de Phase 1 ANALYZE en SKILL.md. Step 0 establece el END USER CONTEXT antes de cualquier análisis técnico.

### Criterios de Aceptación

```
Given SKILL.md con Step 0 en Phase 1
When Claude ejecuta Phase 1
Then el primer paso es identificar y documentar:
  - Quién es el END USER real (no el implementador)
  - La cadena de traducción de requisitos (END USER → App → Framework → Platform → Hardware)
  - Restricciones de bajo nivel que afectan al END USER
AND Step 0 precede al análisis de los 8 aspectos actuales
AND Step 0 incluye referencia al template *-context.md (SPEC-D02)
```

### Implementación

**Archivos a modificar:**
- `.claude/skills/pm-thyrox/SKILL.md` — sección Phase 1 ANALYZE

**Esfuerzo estimado:** 1 tarea | **Complejidad:** Baja

---

## SPEC-D02: Template *-context.md

**ID:** SPEC-D02 | **Prioridad:** Medium | **Bloque:** D

### Descripción

Crear template `context.md.template` en `assets/` para documentar el END USER CONTEXT al inicio de cada WP.

### Criterios de Aceptación

```
Given el template assets/context.md.template creado
When Claude ejecuta Step 0 de Phase 1
Then usa el template para crear [nombre-wp]-context.md en el WP
  AND el template incluye secciones: END USER, cadena de requisitos, restricciones relevantes
```

### Implementación

**Archivos a crear:**
- `.claude/skills/pm-thyrox/assets/context.md.template`

**Esfuerzo estimado:** 1 tarea | **Complejidad:** Baja

---

## Dependencias Entre Specs

```
SPEC-E01 → SPEC-E03 (E03 registra E01 en settings.json)
SPEC-E02 → SPEC-E03 (E03 registra E02 en settings.json)
SPEC-C01 → SPEC-C02 (C02 solo si spike exitoso)
SPEC-C02 → SPEC-C03 (sincronizar después de migrar)
SPEC-C03 → SPEC-C04 (reducir SKILL solo cuando workflows están sincronizados)
SPEC-C03 → SPEC-C05 (eliminar commands solo cuando skills están listos)
SPEC-C02 → SPEC-C06 (flag solo cuando migración completa)
SPEC-A01 → SPEC-A03 (ADR-016 referencia el Addendum de ADR-015)
SPEC-B01 → SPEC-C03 (workflow_decompose incluye checklist de B01)
SPEC-D01 → SPEC-D02 (Step 0 referencia el template)
```

## Plan de Implementación (orden por bloques)

### Bloque E — Sesión 1
- SPEC-E01 → SPEC-E02 → SPEC-E03

### Bloque B — Sesión 1 (misma que E)
- SPEC-B01

### Bloque A — Sesión 2
- SPEC-A01 → SPEC-A02 → SPEC-A03

### Bloque C — Sesiones 3-5 (batch 2-3 specs/sesión)
- Sesión 3: SPEC-C01 (spike) → SPEC-C02
- Sesión 4: SPEC-C03 (7 skills, batch)
- Sesión 5: SPEC-C04 → SPEC-C05 → SPEC-C06 → SPEC-C07

### Bloque D — Sesión 6
- SPEC-D01 → SPEC-D02
