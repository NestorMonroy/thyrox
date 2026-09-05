```yml
type: Sub-análisis
work_package: 2026-04-09-10-25-55-write-gates
fase: FASE 26
sub-tema: Sistema de permisos de Claude Code — documentación oficial
created_at: 2026-04-09 10:45:00
source: https://code.claude.com/docs — sección "Configure permissions"
```

# Sub-análisis: Sistema de Permisos de Claude Code

Análisis de la documentación oficial aplicado al problema de write-gates. Este documento reemplaza
las suposiciones del análisis inicial con evidencia técnica concreta.

---

## 1. La tabla de aprobaciones — lo que realmente ocurre

La documentación oficial define tres categorías con comportamientos distintos:

| Tipo de herramienta | Ejemplos | Aprobación requerida | "Yes, don't ask again" |
|---------------------|----------|---------------------|------------------------|
| Read-only | File reads, Grep | **No** — auto-aprobado | N/A |
| Bash commands | Shell execution | **Sí** — prompt siempre | Permanente por directorio + comando |
| File modification | Edit/Write files | **Sí** — prompt siempre | Solo hasta fin de sesión |

**Implicación crítica:** Esto explica exactamente el comportamiento observado en FASE 25 Phase 7:

- Leer archivos (Read, Grep, Glob) → sin prompt — correcto
- Editar `now.md` y `focus.md` (Edit tool) → prompt (File modification)
- `bash update-state.sh` (Bash) → prompt (Bash command)
- `bash validate-session-close.sh` (Bash) → prompt (Bash command)
- `git add/commit/push` (Bash) → prompt por cada uno (Bash command)

**Total de prompts en Phase 7 sin configuración:** 7+ prompts después del gate Phase 6→7.

**Hallazgo nuevo vs análisis inicial:** El análisis inicial asumió que Edit tool no necesitaba
aprobación. La documentación oficial lo desmiente: Edit/Write SÍ requieren aprobación, con
"don't ask again" solo hasta fin de sesión (no permanente). Esto explica el prompt en los 2
archivos de estado.

---

## 2. Modos de permisos — el espacio de soluciones

La documentación define 6 modos configurables vía `defaultMode` en settings.json:

| Modo | Comportamiento | Aplicabilidad para write-gates |
|------|---------------|-------------------------------|
| `default` | Prompt en primer uso de cada herramienta | Estado actual — máxima fricción |
| `acceptEdits` | Auto-acepta ediciones de archivos + comandos filesystem (mkdir, touch, mv, cp) | **Candidato principal** — elimina prompts de Edit/Write |
| `plan` | Solo análisis, no puede modificar ni ejecutar | No aplica — necesitamos ejecutar |
| `auto` | Auto-aprueba con clasificador de seguridad (preview) | Interesante a largo plazo |
| `dontAsk` | Deniega todo a menos que esté pre-aprobado | Inverso a lo que necesitamos |
| `bypassPermissions` | Salta todos los prompts excepto dirs protegidos | Demasiado permisivo — riesgo |

### `acceptEdits` — análisis detallado

**Qué aprueba automáticamente:**
- Edit/Write/Read tools para archivos en el directorio de trabajo
- Comandos filesystem básicos: `mkdir`, `touch`, `mv`, `cp`

**Qué SIGUE requiriendo aprobación:**
- Bash commands que no sean los filesystem básicos mencionados
- Esto incluye: `bash script.sh`, `git add`, `git commit`, `git push`, `python script.py`

**Conclusión:** `acceptEdits` resuelve el problema de los 2 archivos (Edit tool) pero NO resuelve
los prompts de Bash (scripts de validación, git operations). Es condición necesaria pero no suficiente.

### `bypassPermissions` — análisis de excepciones

La documentación documenta una excepción crítica y reveladora:

> Writes to `.git`, `.claude`, `.vscode`, `.idea`, and `.husky` directories **still prompt** for
> confirmation to prevent accidental corruption.
> 
> Writes to `.claude/commands`, `.claude/agents`, and `.claude/skills` are **EXEMPT** and do not
> prompt, because Claude routinely writes there when creating skills, subagents, and commands.

**Esto revela el modelo mental de los diseñadores de Claude Code:**
- `.claude/settings.json` → protegido (prompt siempre) — configuración de plataforma
- `.claude/skills/` → libre (sin prompt) — outputs normales de Claude durante su trabajo
- `.git/` → protegido (prompt siempre) — historial inmutable

Esto confirma nuestra Categoría 7 (framework config siempre gate), pero con un matiz:
los SKILL.md files dentro de `.claude/skills/` son considerados output normal, no config protegida.
El diseño de Claude Code asume que los skills son escritos/editados por Claude frecuentemente.

---

## 3. El sistema de reglas — `permissions.allow/deny/ask`

La documentación define reglas de permiso con sintaxis de wildcard:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git commit *)",
      "Bash(git * main)"
    ],
    "deny": [
      "Bash(git push *)"
    ]
  }
}
```

**Precedencia: deny → ask → allow** (el primer match gana, deny siempre primero)

### Patrones Bash relevantes para este proyecto

La documentación explica el comportamiento del wildcard `*` con espacios:

- `Bash(ls *)` → matches `ls -la` pero NO `lsof` (word boundary por el espacio antes de `*`)
- `Bash(ls*)` → matches ambos (sin word boundary)
- Wildcards pueden estar en cualquier posición: inicio, medio, final

**Advertencia importante de la documentación:**
> Claude Code is aware of shell operators (like `&&`) so a prefix match rule like `Bash(safe-cmd *)`
> won't give it permission to run the command `safe-cmd && other-cmd`.

Esto es importante: `Bash(bash .claude/scripts/*)` pre-aprueba solo scripts individuales de ese directorio,
no permite `bash script.sh && rm -rf important-data`.

### Reglas que necesitamos para este proyecto

**Para eliminar la fricción en fases de ejecución:**

```json
{
  "permissions": {
    "allow": [
      "Bash(bash .claude/scripts/*)",
      "Bash(bash .claude/skills/*/scripts/*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git commit -m *)",
      "Bash(git status)",
      "Bash(git log *)",
      "Bash(git diff *)",
      "Bash(git fetch *)",
      "Bash(git branch *)",
      "Bash(date *)",
      "Bash(mkdir *)",
      "Bash(ls *)",
      "Bash(echo *)"
    ],
    "deny": [
      "Bash(git push --force *)",
      "Bash(git reset --hard *)",
      "Bash(rm -rf *)",
      "Bash(git push --force-with-lease *)"
    ]
  }
}
```

**`git push` — caso especial:**
Dejarlo en `ask` (ni en allow ni en deny) → prompt UNA VEZ por sesión para el push de Phase 7.
Esto satisface tanto la necesidad de reducir fricción como el gate para operación externa.

---

## 4. `allowed-tools` en frontmatter de skills — rol secundario

La documentación de settings.json confirma que `allowed-tools` en el frontmatter del skill
pre-aprueba herramientas **mientras el skill está activo**. Pero esto es secundario respecto a
`permissions.allow` en settings.json porque:

1. `permissions.allow` aplica siempre, independientemente del skill activo
2. `allowed-tools` en frontmatter solo aplica durante la invocación del skill
3. En Phase 6/7 Claude trabaja con múltiples herramientas sin que el skill esté "activo" constantemente

**Conclusión:** `allowed-tools` en SKILL frontmatter es una optimización complementaria, no la
solución principal. La solución principal es `permissions.allow` en settings.json.

---

## 5. PreToolUse hooks — extensión del sistema de permisos

La documentación revela un mecanismo avanzado que no habíamos considerado:

> Claude Code hooks provide a way to register custom shell commands to perform permission
> evaluation at runtime. When Claude Code makes a tool call, PreToolUse hooks run before
> the permission prompt. The hook output can deny the tool call, force a prompt, or skip
> the prompt to let the call proceed.

**Comportamiento:**
- Hook retorna 0 (`"allow"`) → skip prompt, pero deny/ask rules se evalúan igualmente
- Hook retorna 2 → bloquea la llamada ANTES de evaluar permission rules (incluso allow rules)

**Aplicación para este proyecto:**
Un hook PreToolUse podría:
- Inspeccionar el comando Bash antes de ejecutar
- Permitir comandos confiables del framework sin prompt
- Bloquear comandos destructivos (rm -rf, force push) incluso si alguien los agregó a allow

Esto es más preciso que wildcard rules para el control de seguridad. Ejemplo:

```bash
#!/bin/bash
# .claude/scripts/pre-tool-use-bash.sh
# Bloquea comandos destructivos, permite comandos confiables del framework

COMMAND="$1"

# Bloquear siempre
if echo "$COMMAND" | grep -qE "^git push --force|^rm -rf|^git reset --hard"; then
  echo '{"decision": "block", "reason": "Operación destructiva — requiere gate explícito"}'
  exit 2
fi

# Permitir scripts del framework
if echo "$COMMAND" | grep -qE "^bash \.claude/(scripts|skills)/"; then
  echo '{"decision": "allow"}'
  exit 0
fi
```

**Trade-off hooks vs rules:**
- Hooks: más expresivos, pueden inspeccionar contenido complejo, mejor auditoría
- Rules: más simples de mantener, declarativas, visibles en `/permissions`
- Para este proyecto: rules son suficientes dado que los comandos del framework son predecibles

---

## 6. `defaultMode: acceptEdits` — análisis de impacto real

Si configuramos `defaultMode: acceptEdits` en settings.json:

**Operaciones que se vuelven automáticas:**
- Edit `now.md` → auto
- Edit `focus.md` → auto
- Edit `CHANGELOG.md` → auto
- Edit `ROADMAP.md` → auto
- Write nuevos artefactos WP → auto
- `mkdir` para nuevos directorios → auto

**Operaciones que SIGUEN requiriendo aprobación:**
- `bash .claude/scripts/update-state.sh` → prompt
- `bash validate-session-close.sh` → prompt
- `git add`, `git commit`, `git push` → prompt

**Conclusión:** `acceptEdits` + `permissions.allow` para scripts confiables = solución completa
para eliminar la fricción de Phase 6 y Phase 7.

---

## 7. Análisis de settings precedence — dónde colocar las reglas

La documentación establece:

1. Managed settings (no override posible)
2. Command line arguments (temporales)
3. Local project settings (`.claude/settings.local.json`) — gitignored
4. **Shared project settings (`.claude/settings.json`)** ← nuestro objetivo
5. User settings (`~/.claude/settings.json`)

**Para THYROX:** Las reglas van en `.claude/settings.json` (shared project settings).
Esto las distribuye a todos los colaboradores y las mantiene en git.

**Excepción:** Si un desarrollador quiere restricciones personales adicionales, puede usar
`.claude/settings.local.json` (gitignored) sin afectar el equipo.

---

## 8. El modelo mental correcto — dos planos, dos soluciones

### Plano A: Gates de decisión del SKILL (metodológico) — SIN CAMBIOS

Los stops del SKILL (Phase 1→2, 5→6, 6→7) son correctos. Responden a:
*"¿El humano aprueba el resultado de esta fase antes de proceder?"*

Son gates de **governance**, no de ejecución. Deben mantenerse.

### Plano B: Permisos de ejecución de Claude Code (sistema) — REQUIERE CONFIGURACIÓN

El sistema de permisos de Claude Code funciona por **tool call**, no por gate de fase.
Sin configuración, cada herramienta genera prompt independientemente de los gates del SKILL.

La solución es configurar el sistema de permisos para que esté alineado con los gates:
- Después de que el humano dice "SI" al gate de Phase 6→7 (Plano A)
- El Plano B ya no debería generar fricción para operaciones confiables dentro de Phase 7

---

## 9. Hallazgos nuevos vs análisis inicial

| Aspecto | Análisis inicial | Análisis corregido con docs |
|---------|-----------------|----------------------------|
| Edit tool requiere aprobación | Asumí que no | SÍ requiere (hasta fin de sesión) |
| `allowed-tools` en SKILL frontmatter | Solución principal | Complementaria — `permissions.allow` es la solución principal |
| Bash siempre requiere aprobación | Correcto | Correcto — wildcards en allow lo resuelven |
| `acceptEdits` mode | No conocíamos | Resuelve Edit/Write, no Bash |
| PreToolUse hooks | No considerados | Mecanismo avanzado para lógica compleja |
| `bypassPermissions` y `.claude/skills/` | No conocíamos | .claude/skills/ es EXEMPT — interesante para el diseño |

---

## 10. Solución técnica definitiva

**Dos cambios en `.claude/settings.json`:**

```json
{
  "defaultMode": "acceptEdits",
  "permissions": {
    "allow": [
      "Bash(bash .claude/scripts/*)",
      "Bash(bash .claude/skills/*/scripts/*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git commit -m *)",
      "Bash(git status)",
      "Bash(git log *)",
      "Bash(git diff *)",
      "Bash(git fetch *)",
      "Bash(git branch *)",
      "Bash(date *)",
      "Bash(mkdir *)",
      "Bash(ls *)",
      "Bash(echo *)"
    ],
    "deny": [
      "Bash(git push --force *)",
      "Bash(git push --force-with-lease *)",
      "Bash(git reset --hard *)",
      "Bash(rm -rf *)"
    ]
  },
  "hooks": {
    "SessionStart": [...],
    "Stop": [...],
    "PostCompact": [...]
  }
}
```

**`git push` permanece en ask (no en allow ni deny)** → prompt una vez al cerrar WP = gate Phase 7.

**Un cambio en `pm-thyrox/SKILL.md`:**
Agregar sección `## Modelo de permisos` que documente:
- Los dos planos (gates de decisión vs permisos de herramienta)
- Tabla de categorías con política auto vs gate
- Referencia a la configuración en settings.json

---

## 11. Reducción de prompts proyectada

**Phase 7 actual (sin configuración):**
- Edit now.md → prompt 1
- Edit focus.md → prompt 2
- bash update-state.sh → prompt 3
- bash validate-session-close.sh → prompt 4
- git add → prompt 5
- git commit → prompt 6
- git push → prompt 7

Total: **7 prompts** después del gate Phase 6→7.

**Phase 7 con `acceptEdits` + `permissions.allow`:**
- Edit now.md → **auto** (acceptEdits)
- Edit focus.md → **auto** (acceptEdits)
- bash update-state.sh → **auto** (allow: `Bash(bash .claude/scripts/*)`)
- bash validate-session-close.sh → **auto** (allow: `Bash(bash .claude/skills/*/scripts/*)`)
- git add → **auto** (allow: `Bash(git add *)`)
- git commit → **auto** (allow: `Bash(git commit *)`)
- git push → **1 prompt** (ask — gate intencional para operación externa)

Total: **1 prompt** (el gate correcto — operación que afecta el remoto).
