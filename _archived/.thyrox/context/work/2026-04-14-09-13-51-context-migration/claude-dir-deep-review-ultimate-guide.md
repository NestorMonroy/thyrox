```yml
type: Deep-Review Artifact
created_at: 2026-04-14 17:52:19
source: /tmp/reference/claude-code-ultimate-guide/
topic: qué va en .claude/ y qué no — estructura canónica del directorio
fase: FASE 35
```

# claude-dir-deep-review-ultimate-guide.md

Deep-review Modo 2 (exploración sin sesgo de hipótesis previa).
18 patrones en 6 categorías. Fuente: repositorio `claude-code-ultimate-guide`.

---

## Patrones identificados: 18 (en 6 categorías)

---

### Categoría 1: Contenido canónico de `.claude/` — lo que SÍ pertenece ahí

- **Patrón 1.1:** La estructura canónica incluye exactamente estos subdirectorios: `agents/`, `commands/`, `hooks/`, `rules/`, `skills/`, `plans/`, y los archivos `CLAUDE.md`, `settings.json`, `settings.local.json`.
  Fuente: `guide/ultimate-guide.md:5400-5430`

- **Patrón 1.2:** `.claude/rules/*.md` son los únicos cargados automáticamente en cada sesión al arrancar (session-start auto-load). Carga universal.
  Fuente: `guide/ultimate-guide.md:5338`, `guide/core/context-engineering.md:1457`

- **Patrón 1.3:** `.claude/agents/` y `.claude/commands/` son lazy-loaded — no consumen tokens hasta que se invocan.
  Fuente: `guide/core/context-engineering.md:1454-1457`

- **Patrón 1.4:** `.claude/memory/MEMORY.md` (v2.1.59+) — el único subdirectorio de `.claude/` cuyo contenido es generado automáticamente por Claude, no por el humano.
  Fuente: `guide/ultimate-guide.md:5118`

- **Patrón 1.5:** `.claude/agent-memory/<agent-name>/` (scope `project`) — memoria persistente de agentes compartida vía git.
  Fuente: `guide/ultimate-guide.md:6708-6709`

- **Patrón 1.6:** `.claude/plans/` — directorio por defecto para archivos de plan generados por `/plan`. Sobreridable vía `plansDirectory` en `settings.json`.
  Fuente: `guide/core/settings-reference.md:236-241`, `guide/ultimate-guide.md:5482`

---

### Categoría 2: Protección del binario — la safety invariant

- **Patrón 2.1 (CRÍTICO):** `.claude/` completo está protegido por una safety invariant a nivel de binario. Claude Code **siempre muestra un prompt de confirmación** antes de modificar cualquier archivo en `.claude/`, incluso en modo `bypassPermissions`. No se puede desactivar vía configuración.
  Fuente: `guide/ultimate-guide.md:1077-1084`

  > | `.claude/` directory | agents, skills, hooks, settings — except `.claude/worktrees/` |

- **Patrón 2.2:** Esta protección fue un fix de seguridad introducido en una release específica. Antes del fix, `.git`, `.claude` y otros directorios eran escribibles sin prompt en `bypassPermissions`.
  Fuente: `guide/core/claude-code-releases.md:416`

- **Patrón 2.3:** La única excepción documentada es `.claude/worktrees/`, explícitamente excluida de la invariant.
  Fuente: `guide/ultimate-guide.md:1084`

---

### Categoría 3: Lo que NO debería ir en `.claude/`

- **Patrón 3.1:** **Secretos y credenciales** nunca en `.claude/`. El mecanismo `permissions.deny` tiene una limitación conocida que puede exponer contenido vía background indexing antes de aplicar permission checks.
  Fuente: `guide/ultimate-guide.md:5824`

- **Patrón 3.2:** **Session history** (`projects/`) está en el gitignore recomendado para `~/.claude/` — contenido personal grande que no debe versionarse.
  Fuente: `guide/ultimate-guide.md:5527`

- **Patrón 3.3 (CLAVE):** **Documentos de trabajo efímeros** (handoffs, templates de prompts, análisis en progreso, borradores) van en `claudedocs/` en la raíz del proyecto, **no en `.claude/`**. El repo del guide usa este patrón: `claudedocs/handoffs/`, `claudedocs/templates/`, `claudedocs/resource-evaluations/`. Gitignoreado.
  Fuente: `CLAUDE.md:47-49` del repo, `guide/ultimate-guide.md:2722`, `:3943`

- **Patrón 3.4 (CLAVE):** **Estado de sesión transitorio** (`TASK.md`, `PROGRESS.md`, archivos de progreso en curso) vive en la raíz del proyecto o en directorios propios (`tasks/`), no en `.claude/`. Patrón "Ralph Loop": `TASK.md`, `PROGRESS.md` en raíz, `tasks/lessons.md` en subdirectorio.
  Fuente: `guide/ultimate-guide.md:1974-1980`

- **Patrón 3.5:** **Personal preferences** van en `CLAUDE.md` y `settings.local.json` de `.claude/`, pero ambos deben estar en `.gitignore`.
  Fuente: `guide/ultimate-guide.md:5476-5482`, tabla en `:5434-5442`

- **Patrón 3.6:** **`autoMemoryDirectory`** no está permitido en `.claude/settings.json` de proyecto para evitar que repos compartidos redirijan escrituras de memoria a ubicaciones sensibles. Solo válido en user/local/managed scope.
  Fuente: `guide/core/settings-reference.md:250-255`

---

### Categoría 4: Separación git-tracked vs gitignored dentro de `.claude/`

- **Patrón 4.1:** Separación explícita dentro de `.claude/`:

  | Commiteado (equipo) | Gitignoreado (personal) |
  |---------------------|------------------------|
  | `settings.json` | `CLAUDE.md` |
  | `agents/` | `settings.local.json` |
  | `commands/` | `plans/` (opcional) |
  | `hooks/` | `memory/` (auto-memories) |
  | `rules/` | `agent-memory-local/` |
  | `skills/` | |

  Fuente: `guide/ultimate-guide.md:5434-5492`

- **Patrón 4.2:** El `.gitignore` del repo del guide gitignora `.claude/` completo excepto `.claude/commands/` y `.claude/agents/` vía excepciones `!`.
  Fuente: `.gitignore:8-11`

---

### Categoría 5: Directorios alternativos para contenido de sesión

- **Patrón 5.1:** `claudedocs/` (raíz del proyecto, no dentro de `.claude/`) — patrón recomendado para documentos de trabajo de sesión que no son configuración: handoffs, templates, análisis privados. Gitignoreado.
  Fuente: `guide/ultimate-guide.md:2722`, `CLAUDE.md:47-49`

- **Patrón 5.2:** `TASK.md`, `PROGRESS.md` en raíz del proyecto, `tasks/todo.md`, `tasks/lessons.md` en subdirectorio `tasks/`. Ninguno dentro de `.claude/`.
  Fuente: `guide/ultimate-guide.md:1968-1988`

- **Patrón 5.3:** Para worktrees en paralelo, `.worktrees/` en la raíz del proyecto (gitignoreado). Cada worktree puede tener su propio `.claude/`.
  Fuente: `guide/ultimate-guide.md:17130-17143`, `.gitignore:62`

---

### Categoría 6: Semántica de `.claude/` — es configuración, no estado de trabajo

- **Patrón 6.1 (DEFINICIÓN OFICIAL):** "The `.claude/` folder is your project's Claude Code directory for **memory, settings, and extensions**." Las tres categorías son memoria persistente (instrucciones), configuración (hooks, permisos), y extensiones (agents, commands, skills). Estado de sesión transitorio no aparece.
  Fuente: `guide/ultimate-guide.md:5395`

- **Patrón 6.2:** Tres tipos de "memoria" con ubicaciones distintas: Session memory (RAM, no persistida), Auto-memory en `.claude/memory/MEMORY.md` (cross-session, gitignoreada), y CLAUDE.md (equipo, versionada). El estado de sesión activa no tiene hogar natural dentro de `.claude/`.
  Fuente: `guide/ultimate-guide.md:1880-1927`

- **Patrón 6.3 (DEFINICIÓN SEMÁNTICA):** "CLAUDE.md contains rules. `docs/solutions/` contains solved problems. `docs/brainstorms/` contains thinking. The separation matters because an AI reading CLAUDE.md expects constraints, not a log of past decisions."
  Fuente: `guide/ultimate-guide.md:4950`

---

## Hallazgo sobre el contexto investigado

**Los archivos `now.md`, `focus.md` y `context/work/YYYY-MM-DD-*/` no pertenecen en `.claude/` según la documentación oficial, por tres razones convergentes:**

1. **Safety invariant intencional:** La protección de `.claude/` fue un fix de seguridad explícito (releases.md:416), no un efecto secundario. El binario trata `.claude/` como zona de configuración crítica que requiere supervisión humana en cada escritura. El prompt de confirmación es el comportamiento correcto — la solución es mover los archivos que generan escrituras frecuentes fuera del directorio protegido.

2. **Estructura canónica no los incluye:** La lista oficial de `guide/ultimate-guide.md:5400-5430` no incluye directorios de estado de sesión activa. Todos los patrones documentados para estado transitorio (`TASK.md`, `PROGRESS.md`, `claudedocs/`) viven fuera de `.claude/`.

3. **Semántica incompatible:** El guide es explícito: `.claude/` contiene "constraints, not a log of past decisions" (ultimate-guide.md:4950). `now.md` y los work packages son exactamente logs de estado y decisión — mezclar las dos semánticas va contra el diseño documentado.

## Qué debe permanecer en `.claude/` — tabla definitiva

| Contenido | Committed | Fuente |
|-----------|-----------|--------|
| `CLAUDE.md` — instrucciones del proyecto | ✅ Sí | ultimate-guide.md:5395 |
| `rules/*.md` — reglas auto-cargadas | ✅ Sí | ultimate-guide.md:5338 |
| `agents/*.md` — subagentes del proyecto | ✅ Sí | ultimate-guide.md:5403 |
| `skills/*/SKILL.md` — skills del proyecto | ✅ Sí | ultimate-guide.md:5404 |
| `commands/*.md` — slash commands legacy | ✅ Sí | ultimate-guide.md:5405 |
| `settings.json` — configuración del proyecto | ✅ Sí | settings-reference.md |
| `hooks/` — scripts de hooks | ✅ Sí | ultimate-guide.md:5407 |
| `agent-memory/<name>/` — memoria de agentes (equipo) | ✅ Sí | ultimate-guide.md:6708 |
| `plans/` — archivos de plan (opcional) | Opcional | settings-reference.md:236 |
| `memory/MEMORY.md` — auto-memory de Claude | ❌ Gitignored | ultimate-guide.md:5118 |
| `settings.local.json` — overrides locales | ❌ Gitignored | ultimate-guide.md:5476 |
| `agent-memory-local/<name>/` — memoria local de agentes | ❌ Gitignored | subagents README |

## Recomendación

La migración a `.thyrox/context/` tiene respaldo en tres dimensiones:
- **Semántica:** `.claude/` es configuración/extensiones; `.thyrox/context/` es estado de trabajo
- **Safety invariant:** El prompt es el comportamiento correcto del binario; mover los archivos es la solución correcta
- **Patrón comunitario:** `claudedocs/`, `tasks/`, `TASK.md` — todos los patrones de estado de sesión viven fuera de `.claude/`
