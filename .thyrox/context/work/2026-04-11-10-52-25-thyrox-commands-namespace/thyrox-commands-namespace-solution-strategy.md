```yml
created_at: 2026-04-11 17:20:53
project: thyrox-framework
feature: thyrox-commands-namespace
architecture_version: 1.0
status: Aprobado — 2026-04-11
fase: FASE 31
phase: Phase 2 — SOLUTION_STRATEGY
```

# Solution Strategy — thyrox-commands-namespace (FASE 31)

## Propósito

Transformar los hallazgos de Phase 1 en decisiones arquitectónicas implementables.
Responde al problema central: cómo obtener comandos slash con namespace `/thyrox:*`
auténtico en Claude Code sin romper los workflow-* skills existentes.

---

## Key Ideas

### Idea 1 — Plugin = interfaz pública, skills = implementación

La arquitectura de plugins de Claude Code separa dos planos:

- **Interfaz pública**: los command files en `commands/` del plugin. Producen los
  comandos `/thyrox:*` que el usuario ve en el menú `/`.
- **Implementación interna**: los `workflow-*` skills existentes. Contienen toda la
  lógica de las 7 fases. No se modifican.

Los command files del plugin son thin wrappers que invocan los skills correspondientes.
Esta separación permite evolucionar la interfaz (nombres de comandos) sin tocar la
lógica de ejecución.

**Impacto:** Los `workflow-*` skills siguen siendo la fuente de verdad. El plugin
agrega una capa de namespace encima sin duplicar lógica.

---

### Idea 2 — El `:` es exclusivamente separador de namespace de plugin

El formato `/thyrox:analyze` no puede lograrse con skills standalone ni con commands
en `.claude/commands/`. El separador `:` solo existe en el contexto de plugins Claude Code.

Esta constraint arquitectónica elimina las opciones A, B y C:
- Opción A (`/thyrox-analyze` con guión) → namespace incorrecto
- Opción B (commands que delegan a skills) → inválida, skills ganan precedencia
- Opción C (instrucción de texto) → no cambia el menú `/`

Solo la **Opción D — Plugin** produce `/thyrox:*` auténtico.

**Impacto:** THYROX debe estructurarse como un plugin Claude Code distribuible.

---

### Idea 3 — Gates son instrucciones de metodología, no enforcement de plataforma

TD-036 reveló que los gates actuales de workflow-analyze/SKILL.md son texto instructivo
pero no hay ningún mecanismo que impida que el LLM cree archivos antes de que el usuario
los apruebe.

La corrección es adicionar un paso explícito de pausa (**⏸ STOP pre-WP**) en el SKILL.md,
antes de cualquier operación de escritura, que requiera confirmación explícita del usuario.
No se implementa como hook de sistema — la metodología tiene precedencia y el SKILL.md
es la autoridad para las instrucciones de Phase 1.

**Impacto:** Un paso en SKILL.md, sin cambios en hooks ni settings.json.

---

## Research — Unknowns investigados

### Unknown 1: Estructura exacta del plugin Claude Code

**Fuente:** `/tmp/reference/claude-howto/07-plugins/README.md` + ejemplo `devops-automation/`

**Hallazgos:**

```
plugin-root/
├── .claude-plugin/
│   └── plugin.json          ← manifest: name, description, version, author
├── commands/                ← command files → /plugin-name:command
│   ├── analyze.md           → /thyrox:analyze
│   └── execute.md           → /thyrox:execute
├── agents/                  ← subagentes del plugin (opcional)
├── skills/                  ← skills del plugin (opcional)
├── hooks/
│   └── hooks.json           ← hooks propios del plugin (opcional)
└── settings.json            ← settings aplicadas cuando el plugin está activo
```

**plugin.json mínimo:**

```json
{
  "name": "thyrox",
  "description": "Framework THYROX — gestión de proyectos con metodología SDLC de 7 fases",
  "version": "2.5.0",
  "author": { "name": "NestorMonroy" }
}
```

**Command file structure** (basado en `devops-automation/commands/deploy.md`):

```markdown
---
name: Analyze
description: Ejecuta Phase 1 ANALYZE del work package activo
---

# /thyrox:analyze

[instrucciones para invocar workflow-analyze skill]
```

---

### Unknown 2: ¿Autodiscovery de `.claude-plugin/` en el repo actual?

**Pregunta:** ¿Claude Code detecta automáticamente `.claude-plugin/plugin.json` en el
directorio raíz del proyecto actual, sin necesidad de `/plugin install`?

**Investigación:**

El flujo documentado en claude-howto es:
```
Usuario → /plugin install pr-review → Plugin Marketplace → Download → Install
```

No hay documentación de autodiscovery local. El mecanismo de instalación parece
requerir el comando `/plugin install`.

**Conclusión:** Dos escenarios posibles:

| Escenario | Comportamiento | Impacto en FASE 31 |
|-----------|---------------|-------------------|
| **A — Autodiscovery** | `.claude-plugin/plugin.json` en root → plugin activo automáticamente | Ideal: `/thyrox:*` disponible inmediatamente en este proyecto |
| **B — Install requerido** | Requiere `/plugin install thyrox` | Dos usos: distribución a otros proyectos + `/plugin install` en este proyecto |

**Decisión para FASE 31:** Implementar la estructura de plugin independientemente del
escenario. Si el autodiscovery existe, los comandos funcionarán al crear los archivos.
Si requiere install, el framework queda listo para distribución y se documenta el paso
`/plugin install thyrox` en el flujo de onboarding.

---

### Unknown 3: Scope de corrección de referencias (FASE 31 vs FASE 32)

**Pregunta:** ¿La corrección de los 12 archivos de referencias va en FASE 31 o es una FASE independiente?

**Análisis:**

| Factor | Incluir en FASE 31 | Separar en FASE 32 |
|--------|-------------------|-------------------|
| Coherencia temática | Media — referencias usan nombres como "workflow-analyze" que cambiarán | Alta — es refactoring de documentación independiente |
| Riesgo de scope creep | Alto — 12 archivos, varios con reescritura total | Bajo — scope bien delimitado |
| Bloqueo | Sin bloqueo — referencias no impiden el plugin | Sin bloqueo — plugin no requiere referencias corregidas |
| Tamaño del WP | FASE 31 ya es mediano; agregar referencias lo vuelve grande | FASE 32 sería pequeño/mediano |

**Decisión:** Separar en **FASE 32 — references-refactor**.

Justificación: las correcciones de referencias son trabajo de documentación ortogonal
a la implementación del plugin. FASE 31 mantiene foco en la arquitectura. El plan de
corrección (`references-correction-plan.md`) ya está documentado y puede alimentar
directamente el task-plan de FASE 32.

---

## Fundamental Decisions

### D-1: Implementar Opción D — Arquitectura de Plugin

**Alternativas consideradas:**

| Opción | Resultado | Estado |
|--------|-----------|--------|
| A — Rename skills a `thyrox-*` | `/thyrox-analyze` (guión, no colon) | Descartada |
| B — Commands en `.claude/commands/` | Skills ganan precedencia, command ignorado | Descartada (inválida) |
| C — Instrucción en CLAUDE.md | Sin cambio en menú `/` | Descartada |
| **D — Plugin Claude Code** | `/thyrox:analyze` auténtico | **ELEGIDA** |

**Justificación:** El separador `:` en los comandos slash es namespace de plugin
por diseño de la plataforma. No hay alternativa que produzca el formato correcto
sin usar la arquitectura de plugin.

**Implicaciones:**
- El repo THYROX adquiere estructura de plugin distribuible
- `commands/` al root del repo con un command file por fase
- `workflow-*` skills no se modifican (mantienen compatibilidad)
- Se puede distribuir a otros proyectos vía `/plugin install`

---

### D-2: Command files como thin wrappers sobre workflow-* skills

**Alternativas consideradas:**

| Enfoque | Descripción | Problema |
|---------|-------------|---------|
| Commands independientes | Cada command file reimplementa la fase completa | Duplicación de lógica |
| Commands que invocan skills | Command file delega al skill correspondiente | Sin problemas — es el patrón correcto |
| Commands que invocan workflow-* por ruta | `Skill tool → workflow-analyze` | Patrón limpio |

**Decisión:** Cada command file en `commands/` es un thin wrapper que:
1. Describe brevemente la fase
2. Invoca el skill correspondiente vía la instrucción de Skill tool

**Mapa de comandos:**

| Command file | Comando resultante | Skill invocado |
|-------------|-------------------|----------------|
| `commands/analyze.md` | `/thyrox:analyze` | `workflow-analyze` |
| `commands/strategy.md` | `/thyrox:strategy` | `workflow-strategy` |
| `commands/plan.md` | `/thyrox:plan` | `workflow-plan` |
| `commands/structure.md` | `/thyrox:structure` | `workflow-structure` |
| `commands/decompose.md` | `/thyrox:decompose` | `workflow-decompose` |
| `commands/execute.md` | `/thyrox:execute` | `workflow-execute` |
| `commands/track.md` | `/thyrox:track` | `workflow-track` |
| `commands/next.md` | `/thyrox:next` | meta-comando (fuera de scope FASE 31) |
| `commands/init.md` | `/thyrox:init` | skill `workflow_init` |

Los meta-comandos (`next`, `sync`, `prime`, `review`) se difieren a FASE 32+ —
UC-003 está fuera de scope de FASE 31. El entry `next.md` se elimina de la tabla
de command files de FASE 31 para evitar confusión.

**Mapa de comandos en scope de FASE 31:**

| Command file | Comando resultante | Skill invocado |
|-------------|-------------------|----------------|
| `commands/analyze.md` | `/thyrox:analyze` | `workflow-analyze` |
| `commands/strategy.md` | `/thyrox:strategy` | `workflow-strategy` |
| `commands/plan.md` | `/thyrox:plan` | `workflow-plan` |
| `commands/structure.md` | `/thyrox:structure` | `workflow-structure` |
| `commands/decompose.md` | `/thyrox:decompose` | `workflow-decompose` |
| `commands/execute.md` | `/thyrox:execute` | `workflow-execute` |
| `commands/track.md` | `/thyrox:track` | `workflow-track` |
| `commands/init.md` | `/thyrox:init` | skill `workflow_init` |

**Implicaciones:** `session-start.sh` debe actualizarse para mostrar `/thyrox:analyze`
en la opción B en lugar de `/workflow-analyze`.

---

### D-3: TD-036 — gate pre-creación WP en workflow-analyze/SKILL.md

**Alternativas consideradas:**

| Mecanismo | Descripción | Evaluación |
|-----------|-------------|-----------|
| A — Paso ⏸ STOP en SKILL.md | Instrucción explícita antes de crear archivos | Simple, en la autoridad correcta |
| B — PreToolUse hook | Hook que bloquea Write en `context/work/**` | Frágil, no distingue WP nuevo vs existente |
| C — Ambos (A + B) | Doble capa | Sobreingeniería para este problema |

**Decisión:** Solo opción A — añadir paso 1.5 en `workflow-analyze/SKILL.md`:

```markdown
### 1.5 ⏸ STOP pre-creación — Gate obligatorio

Antes de crear el directorio del WP o cualquier archivo:
Presentar al usuario el nombre propuesto del WP y el timestamp.
Esperar confirmación explícita (sí/no).
NO crear ningún archivo hasta recibir respuesta.
```

**Justificación:** Los gates son instrucciones metodológicas — su autoridad natural es
el SKILL.md. Un hook de sistema sería más frágil y no distingue el contexto (WP nuevo
vs continuar WP existente).

---

### D-4: Separar corrección de referencias en FASE 32

Ver Research — Unknown 3. Decisión ya documentada.

**Implicación directa en FASE 31:** `session-start.sh` se actualiza para mostrar el
comando correcto (`/thyrox:analyze`). Las referencias que mencionan `workflow-analyze`
no se corrigen en FASE 31 — lo hará FASE 32.

---

## Technology Stack

No se introduce tecnología nueva. El "stack" es el conjunto de componentes de la
plataforma Claude Code que se utilizan para implementar la solución:

```
Plugin manifest     → .claude-plugin/plugin.json (JSON estándar, sin dependencias)
Command interface   → commands/*.md (Markdown, frontmatter YAML)
Skills (impl.)      → .claude/skills/workflow-*/SKILL.md (existentes, sin modificar)
Shell scripts       → .claude/scripts/session-start.sh (bash, actualización de strings)
Plataforma          → Claude Code (Skills, Plugin API, Skill tool)
```

**Componentes nuevos:** `plugin.json` (1 archivo) + 8 command files Markdown.
**Componentes modificados:** `session-start.sh` (strings de display), `workflow-analyze/SKILL.md` (un paso).
**Sin dependencias externas:** todo es Markdown, JSON y bash dentro del repo.

---

## Architecture Patterns

### Plugin Facade (interfaz → implementación)

Cada command file actúa como fachada sobre el skill correspondiente.
El usuario interactúa con `/thyrox:analyze`; el skill `workflow-analyze` ejecuta
la lógica real. La interfaz pública es intercambiable sin tocar la implementación.

### Namespace Isolation

El prefijo `thyrox:` en todos los comandos los agrupa bajo un namespace único.
Ningún otro comando del sistema puede colisionar con `/thyrox:*` — el namespace
es propiedad exclusiva del plugin por diseño de la plataforma.

### Additive Extension (extensión aditiva)

La implementación solo agrega archivos nuevos. No renombra, no elimina, no modifica
los skills existentes. Los usuarios que usan `/workflow-analyze` directamente siguen
funcionando sin cambios.

### Single Authority per Concern

- **Namespace**: `plugin.json::name` es la única fuente de verdad del prefijo `thyrox:`
- **Lógica de fase**: cada `workflow-*/SKILL.md` es la única fuente de verdad de su fase
- **Display de comandos**: `session-start.sh::_phase_to_command()` es la única fuente de verdad del mapeo phase→comando

---

## Arquitectura de la solución

### Estructura de archivos a crear/modificar

```
thyrox/                              ← repo root (ya existe)
│
├── .claude-plugin/                  ← NUEVO — directorio del plugin
│   └── plugin.json                  ← NUEVO — manifest del plugin
│
├── commands/                        ← NUEVO — command files del plugin
│   ├── analyze.md                   → /thyrox:analyze
│   ├── strategy.md                  → /thyrox:strategy
│   ├── plan.md                      → /thyrox:plan
│   ├── structure.md                 → /thyrox:structure
│   ├── decompose.md                 → /thyrox:decompose
│   ├── execute.md                   → /thyrox:execute
│   ├── track.md                     → /thyrox:track
│   └── init.md                      → /thyrox:init
│
└── .claude/
    ├── scripts/
    │   └── session-start.sh         ← MODIFICAR — mostrar /thyrox:analyze en opción B
    └── skills/
        └── workflow-analyze/
            └── SKILL.md             ← MODIFICAR — añadir paso 1.5 ⏸ STOP pre-WP
```

**Sin modificar:** todos los `workflow-*` skills, `CLAUDE.md`, `settings.json`, ADRs.

---

## Atributos de calidad — cómo se alcanzan

### Descubribilidad (Alta — Phase 1 §6)

**Mecanismo:** El namespace `thyrox:` agrupa todos los comandos del framework bajo
un prefijo común. Al escribir `/thyrox:` en el menú `/`, el usuario ve los 8 comandos
de fase sin necesidad de conocer cada nombre. Esto es una mejora sobre la situación
actual donde `/workflow-*` no señala visualmente que pertenecen a THYROX.

**Verificación:** En sesión con plugin activo, escribir `/thyrox:` y confirmar que
el autocompletado muestra los 8 commands.

---

### Compatibilidad hacia atrás

**Mecanismo:** Los `workflow-*` skills NO se renombran ni modifican. Los usuarios que
usan `/workflow-analyze` directamente siguen funcionando. El plugin agrega comandos
nuevos sin eliminar los existentes.

**Verificación:** `grep -r "workflow-analyze" .claude/skills/` → debe seguir encontrando
el skill intacto. Solo `session-start.sh` cambia el texto de display.

---

### Consistencia de nomenclatura

**Mecanismo:** Todos los command files usan el mismo prefijo `thyrox:` sin excepciones.
El `plugin.json` define `"name": "thyrox"` como autoridad única del namespace.

**Verificación:** `ls commands/` → solo archivos con nombre de fase (sin prefijo `thyrox-`).

---

### Reversibilidad

**Mecanismo:** La implementación es aditiva. Para revertir: eliminar `/.claude-plugin/`
y `/commands/`. Los skills vuelven a ser la única interfaz. Dos archivos de configuración
a modificar (`session-start.sh`, `workflow-analyze/SKILL.md`) son reversibles con git.

---

## Adherence to Constraints

| Restricción (Phase 1 §7) | Cómo se respeta en Phase 2 |
|--------------------------|---------------------------|
| FASE 30 (uv-adoption) tiene gate abierto | FASE 31 no depende de FASE 30. Son paralelas e independientes. El plugin es aditivo y no toca code paths de FASE 30. |
| `workflow-*/SKILL.md` editados requieren `updated_at` automático | La única edición a un SKILL.md es el paso 1.5 en `workflow-analyze/SKILL.md`. La regla de `updated_at` automático de CLAUDE.md aplica. No requiere paso especial. |
| Artefactos WP históricos son inmutables | Opción D no toca `context/work/`. Solo agrega archivos nuevos en root y modifica scripts/skills activos. |
| ADR-016 documenta `workflow-*` como excepción a "Single skill" | Amendment planificado como ADR-019. El texto de ADR-016 no cambia — se agrega nota. |

---

## Traceabilidad

| UC / TD | Hallazgo Phase 1 (prioridad) | Decisión Phase 2 |
|---------|------------------------------|-----------------|
| UC-001 | Namespace `/thyrox:*` requiere plugin (P1) | D-1: Opción D — Plugin + 8 command files |
| UC-002 | Renombrar `/workflow_init` → `/thyrox:init` (P2) | D-2: `commands/init.md` en command files |
| UC-003 | Meta-comandos `next/sync/prime/review` sin spec (P3) | Fuera de scope FASE 31 → FASE 32+ |
| UC-004 | `session-start.sh` muestra formato incorrecto (P1) | D-2: actualizar `_phase_to_command()` + strings |
| UC-005 | TD-030 colisión IDs + TDs legacy con `/workflow_*` (P2) | Incluido en Phase 6: actualizar `technical-debt.md` como parte del rename |
| UC-006 | `skill-vs-agent.md` tiene referencias `/workflow_*` en tabla (P2) | Incluido en Phase 6: actualizar columna de tabla a `/thyrox:*` |
| UC-007 | Implementar plugin THYROX si Opción D (P1) | D-1: cubierto — `.claude-plugin/` + `commands/` |
| UC-008 | Investigar confirmación `mkdir`/`Write` pese a `acceptEdits` (P2) | Observar durante Phase 6: documentar comportamiento real en execution-log. Sin cambios de configuración hasta tener evidencia. |
| TD-036 | No existe gate pre-creación WP en workflow-analyze | D-3: paso ⏸ STOP 1.5 en `workflow-analyze/SKILL.md` |

---

## ADRs requeridos

| ADR | Tema | Acción |
|-----|------|--------|
| Nuevo ADR-019 | Arquitectura de plugin THYROX — por qué Opción D | Crear en Phase 3 |
| Amendment ADR-016 | Excepción de `workflow-*` skills — agregar nota de plugin commands | Phase 3 |

---

## Checklist de validación (TD-029)

- [x] Key Ideas claramente articuladas (3 ideas)
- [x] Research Step — unknowns investigados con evidencia (claude-howto reference)
- [x] Fundamental Decisions documentadas con alternativas y justificación (D-1..D-4)
- [x] Technology Stack documentado (componentes Claude Code, sin dependencias externas)
- [x] Architecture Patterns documentados (Facade, Namespace Isolation, Additive Extension, Single Authority)
- [x] Atributos de calidad — todos los 4 de Phase 1 §6 tienen estrategia (Descubribilidad, Compatibilidad, Consistencia, Reversibilidad)
- [x] Adherence to Constraints — las 4 restricciones de Phase 1 §7 mapeadas
- [x] Traceabilidad completa a todos los UC/TD de Phase 1 (UC-001..UC-008 + TD-036)
- [x] Scope de FASE 31 delimitado (sin meta-comandos UC-003, sin corrección de referencias UC-003bis)
- [x] ADRs identificados para Phase 3 (ADR-019 nuevo + amendment ADR-016)
