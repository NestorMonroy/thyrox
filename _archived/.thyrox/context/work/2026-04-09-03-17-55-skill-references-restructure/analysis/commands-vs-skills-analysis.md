```yml
type: Analysis Sub-document
work_package: 2026-04-09-03-17-55-skill-references-restructure
created_at: 2026-04-09 06:00:00
purpose: Analizar el mecanismo oficial de .claude/commands/ vs skills, y su impacto en TD-020 (workflow_init.md)
```

# Commands vs Skills — Análisis para TD-020

---

## 1. Mecanismo oficial de `.claude/commands/`

### Cómo funcionan los custom commands

Los custom slash commands (`.claude/commands/*.md`) son archivos Markdown **sin frontmatter YAML**.
Cuando el usuario escribe `/command-name` en la sesión de Claude Code, el contenido del archivo
se inyecta como instrucciones en el contexto de la conversación actual.

**Características del mecanismo:**
- Disparo: solo el usuario puede invocarlos explícitamente (escribe `/command-name`)
- Sin frontmatter — no tienen `name:`, `description:`, `hooks:`, ni flags especiales
- El archivo es literalmente el "prompt a seguir" cuando se invoca el comando
- No aparecen en el Skill tool de Claude — solo en el menú de `/` del usuario
- Mecanismo simple: inyección de texto como contexto adicional

### Comandos built-in vs custom commands

| Tipo | Ejemplos | Ubicación |
|------|----------|-----------|
| Built-in | `/help`, `/clear`, `/compact`, `/exit`, `/cost`, `/status` | Internos de Claude Code |
| Custom (usuario) | `/workflow_init`, cualquier comando del proyecto | `.claude/commands/*.md` |
| Skill (nuevo) | `pm-thyrox`, `workflow-analyze`, … | `.claude/skills/*/SKILL.md` |

Los built-in no pueden ser sobreescritos ni reemplazados. Los custom commands siguen siendo
**un mecanismo válido y soportado**, no deprecated.

---

## 2. Skills — el mecanismo nuevo

### Anatomía de un skill en THYROX

```yaml
---
name: workflow-analyze
description: Phase 1 ANALYZE — inicia o retoma el análisis del work package activo.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 1' >> .claude/context/now.md"
updated_at: 2026-04-09 00:00:00
---

# /workflow-analyze — Phase 1: ANALYZE
...
```

**Características del mecanismo:**
- Frontmatter YAML obligatorio: `name`, `description`, y flags opcionales
- `description`: usado por Claude para decidir CUÁNDO invocar el skill automáticamente
- `disable-model-invocation: true`: el skill actúa como prompt puro (sin sub-llamada a modelo)
- `hooks`: permite registrar acciones side-effect al invocar el skill
- Aparece en el **Skill tool** — Claude puede invocarlo proactivamente según su descripción
- El usuario también puede invocarlo con `/skill-name`

### Diferencia conceptual commands vs skills

| Dimensión | `.claude/commands/` | `.claude/skills/*/SKILL.md` |
|-----------|--------------------|-----------------------------|
| Quién puede invocar | Solo el usuario (escribe `/cmd`) | Claude (vía Skill tool) + usuario |
| Frontmatter | Ninguno | YAML requerido |
| Disparo automático | No | Sí — Claude lo dispara por descripción |
| Side effects al invocar | No | Sí — via `hooks:` |
| Metadata para Claude | No — Claude no "conoce" el comando a priori | Sí — `description:` informa a Claude |
| Uso ideal | Procedimientos que el usuario INICIA manualmente | Expertise/procedimientos que Claude activa por contexto |

---

## 3. Estado actual de `workflow_init.md`

### Análisis del archivo `.claude/commands/workflow_init.md`

```
Formato:     Markdown sin frontmatter — formato command clásico
Invocación:  Solo el usuario (escribe /workflow_init)
Naturaleza:  Procedimiento de bootstrapping de 7 pasos
Frecuencia:  "Ejecutar UNA SOLA VEZ por proyecto"
Interacción: Requiere confirmación del usuario en Paso 4 (lista de techs detectadas)
Condicional: Paso 1 verifica si ya existen skills (evita re-ejecución accidental)
Salida:      Genera archivos + git commit
```

### Comparación con los workflow-* skills

Los 7 skills de workflow (`workflow-analyze`, …, `workflow-track`) tienen SKILL.md frontmatter
con `disable-model-invocation: true`. Esto los hace skills que actúan como "prompts inyectados"
cuando Claude los invoca vía Skill tool, O cuando el usuario los invoca con `/workflow-analyze`.

`workflow_init`, en cambio:
- No necesita ser invocado automáticamente por Claude (es bootstrapping, no SDLC recurrente)
- No necesita `hooks:` — no actualiza now.md ni necesita side effects al invocar
- Sí necesita interacción con el usuario (confirmación en Paso 4)
- Es una **herramienta de setup**, no una **fase del ciclo de vida**

---

## 4. ¿Por qué no fue migrado en FASE 23?

FASE 23 migró los 7 `workflow-*` skills porque forman el **ciclo SDLC recurrente** del framework.
`workflow_init` es diferente en naturaleza:

| Aspecto | workflow-analyze/plan/… | workflow_init |
|---------|------------------------|---------------|
| Cuándo se usa | En cada WP (recurrente) | Una sola vez por proyecto |
| Quién lo invoca | Claude (automático) + usuario | Solo el usuario (setup consciente) |
| Parte del SDLC | Sí — las 7 fases | No — bootstrapping previo |
| Necesita Skill tool | Sí (Claude lo activa por contexto) | No (el usuario lo inicia deliberadamente) |

**Conclusión**: La no-migración en FASE 23 fue probablemente **intencional** (o un olvido menor),
no una omisión crítica. `workflow_init` encaja naturalmente en `.claude/commands/`.

---

## 5. Análisis de opciones para TD-020

### Opción A: Mantener en `.claude/commands/workflow_init.md` (status quo)

**Pros:**
- Mecanismo correcto para su naturaleza (procedimiento iniciado por usuario)
- Cero trabajo — no requiere migración
- El mecanismo de commands sigue siendo válido y soportado

**Contras:**
- Inconsistencia visual: todos los workflow-* en `.claude/skills/`, solo este en `.claude/commands/`
- `.claude/commands/` es un directorio "huérfano" con un solo archivo
- No documentado en CLAUDE.md (brecha identificada en Phase 1 review supplement)

### Opción B: Migrar a `.claude/skills/workflow-init/SKILL.md` como skill hidden

**Pros:**
- Consistencia total: todos los workflow-* en mismo lugar
- Permite añadir `description:` para que Claude lo sugiera cuando detecte proyecto sin skills
- CLAUDE.md puede documentarlo como parte de la suite workflow

**Contras:**
- `disable-model-invocation: true` no aplica bien — workflow_init necesita que Claude ejecute
  la lógica de detección, no solo inyectar texto
- La `description:` podría causar que Claude lo invoque de forma inapropiada
- Complejidad añadida para algo que es bootstrapping de setup

### Opción C: Migrar como skill hidden sin `disable-model-invocation`

**Pros:**
- Aprovecha el SKILL.md frontmatter para `description:` útil
- Claude puede sugerirlo en context apropiado: "No veo tech skills — ¿quieres inicializar?"
- Consistencia de ubicación con workflow-*

**Contras:**
- Skill sin `disable-model-invocation` implica sub-llamada al modelo — mayor costo
- Para un procedimiento one-time, la complejidad extra no está justificada

---

## 6. Recomendación

### Para FASE 24: No migrar — `.claude/commands/` es el lugar correcto

`workflow_init.md` pertenece en `.claude/commands/` porque:

1. **Es un comando de setup, no un skill de expertise**: El mecanismo de commands fue diseñado
   exactamente para esto — procedimientos manuales iniciados por el usuario.

2. **`disable-model-invocation: true` no aplica**: Los workflow-* skills son prompts puros.
   workflow_init necesita que Claude detecte, analice y tome decisiones — no puede ser un prompt puro.

3. **No necesita ser invocado automáticamente por Claude**: La `description:` de un skill
   es para que Claude lo active en contexto. Un bootstrapping one-time no debe ser auto-activado.

4. **El directorio `.claude/commands/` tiene su razón de ser en THYROX**: Aunque tenga
   un solo archivo, ese archivo es exactly el tipo de cosa que un command maneja.

### Para TD-020: Reclasificar y cerrar como "no aplicable"

TD-020 fue registrado como: "Migrar `.claude/commands/workflow_init.md` → `.claude/skills/workflow_init/SKILL.md`"

**Revisión**: Después de este análisis, TD-020 no debería ser "migrar" sino **documentar**.

TD-020 se resuelve así:
1. CLAUDE.md `## Estructura` debe incluir `.claude/commands/` en el diagrama (commit final de FASE 24)
2. El archivo permanece donde está — `.claude/commands/workflow_init.md` es correcto
3. Agregar una nota en `## Estructura`: ".claude/commands/ — comandos de setup one-time (no skills)"

**TD-020 modificado:**
```
TD-020 (revisado): Documentar .claude/commands/ en CLAUDE.md
Estado: Se resuelve en FASE 24 (commit final — update de CLAUDE.md)
Acción: Añadir .claude/commands/ al diagrama de estructura con descripción
Migración a skill: NO recomendada — commands es el mecanismo correcto para workflow_init
```

---

## 7. Impacto en la Solution Strategy de FASE 24

### Sin cambios en los 4 batches

Los batches A, B, C, D no cambian. `workflow_init.md` no se mueve.

### Adición al commit final (Paso 7 del orden)

El commit de actualización de CLAUDE.md incluye:

```diff
## Estructura

 .claude/
 ├── CLAUDE.md              ← Este archivo (Level 2)
 ├── agents/                ← Agentes nativos Claude Code (6 agentes, spec: agent-spec.md)
+├── commands/              ← Comandos de setup one-time (/workflow_init)
 ├── context/
 │   ├── project-state.md   ← Metadata del proyecto
 ...
+├── guidelines/            ← Reglas siempre activas por tech domain (generadas por registry)
+├── memory/                ← Auto-creado por Claude Code Web (vacío)
+├── references/            ← Referencias globales bajo demanda (NUEVO — FASE 24)
+├── registry/              ← Generador de skills/agentes desde templates YAML
+├── scripts/               ← Scripts de infraestructura Claude Code del proyecto (NUEVO — FASE 24)
 └── skills/pm-thyrox/      ← El SKILL (Level 1)
```

### Descripción adecuada de `.claude/commands/`

> **commands/**: Slash commands de setup — procedimientos one-time que el usuario invoca
> manualmente. Distinto de skills: sin frontmatter, sin disparo automático, sin hooks.
> `workflow_init` es el único comando activo: detecta el stack y genera tech skills desde el registry.

---

## 8. Tabla resumen de directorios `.claude/` — estado final FASE 24

| Directorio | Estado | Descripción |
|-----------|--------|-------------|
| `agents/` | Existente | Agentes nativos Claude Code (6 agentes) |
| `commands/` | Existente — documentar en FASE 24 | Comandos setup one-time (workflow_init) |
| `context/` | Existente | ADRs, WPs, estado de proyecto |
| `guidelines/` | Existente — documentar en FASE 24 | Tech rules siempre-activas (generadas) |
| `memory/` | Existente — documentar en FASE 24 | Auto-creado por Claude Code Web |
| `references/` | **NUEVO en FASE 24** | Referencias globales on-demand |
| `registry/` | Existente — documentar en FASE 24 | Generador de skills desde templates |
| `scripts/` | **NUEVO en FASE 24** | Scripts de infraestructura Claude Code |
| `skills/` | Existente | pm-thyrox + 7 workflow-* skills |

---

## 9. Validación

- [x] Mecanismo de commands analizado — sigue siendo válido y soportado
- [x] Diferencia conceptual commands vs skills documentada con tabla
- [x] workflow_init.md analizado — correcto en su ubicación actual
- [x] TD-020 reclasificado: no migrar, sino documentar
- [x] Impacto en Solution Strategy: zero cambios en batches, adición al commit final
- [x] Diagrama diff de CLAUDE.md preparado
