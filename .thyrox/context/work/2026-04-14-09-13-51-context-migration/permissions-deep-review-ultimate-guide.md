```yml
type: Deep-Review Artifact
created_at: 2026-04-14 16:53:33
source: /tmp/reference/claude-code-ultimate-guide/
topic: sistema de permisos de Claude Code
fase: FASE 35
```

# permissions-deep-review-ultimate-guide.md

Deep-review Modo 2 (exploración sin sesgo de hipótesis previa).
31 patrones en 7 categorías. Fuente: repositorio `claude-code-ultimate-guide`.

---

## Patrones identificados: 31 (en 7 categorías)

---

### Categoría 1: Modelo de permisos — estructura jerárquica

- **Patrón 1.1:** Cinco scopes de configuración con precedencia decreciente: Managed > Command-line > Local > Project > User. Los arrays (allow, deny) se concatenan y deduplicán entre scopes, no se reemplazan.
  Fuente: `guide/core/settings-reference.md:19-26`

- **Patrón 1.2:** `permissions.deny` tiene precedencia absoluta sobre `allow` y `ask` en cualquier scope. No puede ser anulado.
  Fuente: `guide/core/settings-reference.md:28`

- **Patrón 1.3:** Managed settings se pueden distribuir vía Server (admin console), MDM (macOS plist), Windows Registry, archivo `managed-settings.json`, o directorio drop-in `managed-settings.d/*.json` con merge alfabético.
  Fuente: `guide/core/settings-reference.md:30-36`

- **Patrón 1.4:** `permissions.defaultMode` es un sub-campo del objeto `permissions`, no un campo raíz. Valores válidos: `"default"` | `"acceptEdits"` | `"plan"` | `"bypassPermissions"`. En entornos Remote, solo `"acceptEdits"` y `"plan"` son respetados.
  Fuente: `guide/core/settings-reference.md:295-301`

- **Patrón 1.5:** El ejemplo canónico muestra `defaultMode` dentro de `permissions`:
  ```json
  { "permissions": { "allow": [...], "deny": [...], "defaultMode": "acceptEdits" } }
  ```
  Fuente: `guide/core/settings-reference.md:345-354` y `:1229-1244`

---

### Categoría 2: Modos de permiso — cinco modos documentados

- **Patrón 2.1:** El sistema tiene **cinco** modos: `default`, `acceptEdits`, `plan`, `dontAsk`, `bypassPermissions`. El campo `permissions.defaultMode` acepta cuatro (`default`, `acceptEdits`, `plan`, `bypassPermissions`) — `dontAsk` se menciona en CLI y agent frontmatter pero no figura como valor válido de `permissions.defaultMode`.
  Fuente: `guide/ultimate-guide.md:1031-1103`, `guide/core/settings-reference.md:299`

- **Patrón 2.2:** `dontAsk` auto-deniega herramientas no pre-aprobadas sin prompt. Se diferencia de `default` (que pregunta) y de `bypassPermissions` (que aprueba todo).
  Fuente: `guide/ultimate-guide.md:1065-1069`

- **Patrón 2.3:** `bypassPermissions` tiene un **safety invariant** que persiste: `.git/`, `.claude/` (excepto `.claude/worktrees/`), shell config files (`.bashrc`, `.zshrc`) y VCS configs (`.gitconfig`, `.mcp.json`) siempre requieren prompt.
  Fuente: `guide/ultimate-guide.md:1077-1086`

- **Patrón 2.4:** Las reglas de contenido en `settings.json` (como `Bash(npm publish:*)`) sobreviven a `bypassPermissions` — se aplican como filtros adicionales.
  Fuente: `guide/ultimate-guide.md:1088`

- **Patrón 2.5:** `disableAutoMode: "disable"` elimina `auto` del ciclo `Shift+Tab`.
  Fuente: `guide/core/settings-reference.md:179-185`

- **Patrón 2.6:** `permissions.disableBypassPermissionsMode: "disable"` deshabilita el flag `--dangerously-skip-permissions`. Útil en managed settings.
  Fuente: `guide/core/settings-reference.md:303-309`

---

### Categoría 3: Sintaxis de reglas allow/ask/deny

- **Patrón 3.1:** Orden de evaluación: deny primero, luego ask, luego allow. El primer match gana.
  Fuente: `guide/core/settings-reference.md:320`

- **Patrón 3.2:** Prefijos de path para Read/Edit: `//` = absoluto desde raíz del filesystem, `~/` = relativo a home, `/` = relativo a project root, `./` o sin prefijo = relativo al directorio actual.
  Fuente: `guide/core/settings-reference.md:334-341`

- **Patrón 3.3:** `Bash(ls *)` con espacio antes del `*` matches `ls -la` pero NO `lsof`. El sufijo legacy `:*` (ej: `Bash(npm:*)`) está deprecado.
  Fuente: `guide/core/settings-reference.md:343`

- **Patrón 3.4:** MCP tools se pueden expresar como `mcp__server__tool` o `MCP(server:tool)`. Wildcards funcionales: `mcp__memory__*`.
  Fuente: `guide/core/settings-reference.md:332`

- **Patrón 3.5:** `allowManagedPermissionRulesOnly: true` (managed scope) ignora todas las reglas de user y project. Solo reglas managed aplican.
  Fuente: `guide/core/settings-reference.md:311-316`

---

### Categoría 4: Sandbox — cuarto layer de seguridad

- **Patrón 4.1:** Cuatro capas de seguridad: (1) prompts interactivos, (2) allow/deny en settings.json, (3) hooks pre/post-ejecución, (4) sandbox nativo (opcional).
  Fuente: `guide/core/architecture.md:561-606`

- **Patrón 4.2:** El sandbox usa Seatbelt (macOS) o bubblewrap (Linux/WSL2). En sandbox, comandos bash corren sin prompt incluso en `default` mode.
  Fuente: `guide/security/sandbox-native.md:335`

- **Patrón 4.3:** `sandbox.filesystem.allowWrite` se merge con paths de reglas `Edit(...)` allow.
  Fuente: `guide/core/settings-reference.md:585`

- **Patrón 4.4:** `sandbox.failIfUnavailable: true` falla el startup si el sandbox no puede iniciar.
  Fuente: `guide/core/settings-reference.md:483-487`

---

### Categoría 5: Sistema de Skills — carga y auto-invocación

- **Patrón 5.1:** `.claude/skills/*.md` carga **solo por invocación**, nunca en el startup de sesión. Comportamiento oficial: "Invocation only — Only when invoked".
  Fuente: `guide/ultimate-guide.md:6041`

- **Patrón 5.2:** Excepción introducida en v2.1.32 (2026-02-05): "Skills from `.claude/skills/` in `--add-dir` directories auto-load." Aplica **solo a directorios pasados con `--add-dir`**, no al directorio de proyecto por defecto.
  Fuente: `guide/core/claude-code-releases.md:830`

- **Patrón 5.3:** Hot-reload automático desde v2.1.0: skills modificadas en `~/.claude/skills` o `.claude/skills` quedan disponibles inmediatamente sin reiniciar.
  Fuente: `guide/core/claude-code-releases.md:1071`

- **Patrón 5.4:** El campo `skills:` en frontmatter de agentes inyecta el contenido completo del skill en el contexto del agente al startup.
  Fuente: `guide/ultimate-guide.md:6496`

- **Patrón 5.5:** `.claude/rules/*.md` se auto-carga en TODOS los archivos en cada sesión. La confusión entre `rules/` y `skills/` es el error de configuración más frecuente.
  Fuente: `guide/ultimate-guide.md:6038-6043`, `guide/core/glossary.md:111`

---

### Categoría 6: Seguridad del directorio `.claude/`

- **Patrón 6.1:** Repositorios con `.claude/` embebido cargan automáticamente su configuración al abrir el repo — vector de supply chain.
  Fuente: `guide/security/security-hardening.md:278`

- **Patrón 6.2:** `.claude/` está en la safety invariant de `bypassPermissions`: escribir en él siempre genera prompt, independientemente del modo.
  Fuente: `guide/ultimate-guide.md:1084`

- **Patrón 6.3:** CVE-2026-25725 — código malicioso dentro del sandbox crea `.claude/settings.json` con SessionStart hooks que ejecutan con privilegios del host al restart.
  Fuente: `guide/security/security-hardening.md:68`

---

### Categoría 7: Agente frontmatter — permissionMode por agente

- **Patrón 7.1:** `permissionMode` en frontmatter de agentes acepta: `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`. `dontAsk` es válido en agent frontmatter aunque no en `permissions.defaultMode`.
  Fuente: `guide/ultimate-guide.md:6494`

- **Patrón 7.2:** Agentes pueden tener `tools`, `disallowedTools`, y `skills` pre-inyectadas — cada agente tiene su propio micro-modelo de permisos.
  Fuente: `guide/ultimate-guide.md:6486-6501`

---

## Gaps vs permission-model.md existente

| Tema | Estado en permission-model.md | Estado en ultimate-guide |
|------|-------------------------------|--------------------------|
| `defaultMode` dentro de `permissions` | **FIJADO** en commit 80d1bd3 — movido a posición correcta | Confirmado en 3 fuentes independientes: settings-reference.md:295, :345-354, :1229-1244 |
| 5 modos (falta `dontAsk`) | Solo 4 modos en tabla — falta `dontAsk` | `dontAsk` es el quinto modo, válido en agent frontmatter |
| `.claude/skills/` auto-load | "comportamiento empírico sin respaldo documental" | Auto-load documentado SOLO para `--add-dir` directories (v2.1.32). Caso base: invocation-only |
| Safety invariant scope | Incertidumbre sobre qué subdirectorios | Explícito: `.claude/` entero excepto `.claude/worktrees/` |
| CVEs relacionados | No documentados | CVE-2026-25725 y otros directamente relacionados |
| `disableBypassPermissionsMode` | No documentado | Campo managed para deshabilitar `--dangerously-skip-permissions` |
| `allowManagedPermissionRulesOnly` | No documentado | Campo managed que ignora todas las reglas user/project |
| Sandbox interacción con allow rules | No documentado | `sandbox.filesystem.allowWrite` se merge con `Edit(...)` rules |
| `dontAsk` en agent `permissionMode` | No documentado | Agentes pueden tener `permissionMode: dontAsk` en frontmatter |

---

## Hallazgos relevantes para D3.1 y D3.2

### D3.1 — `.claude/skills/` se observó como automático pero no hay regla documentada

**Evidencia encontrada:**
- Comportamiento base documentado: skills en `.claude/skills/` son **invocation-only** (`guide/ultimate-guide.md:6041`)
- Excepción documentada (v2.1.32): auto-load para directorios pasados via `--add-dir` (`claude-code-releases.md:830`)

**Conclusión:** La observación empírica del proyecto puede explicarse por el uso de `--add-dir`. Si el proyecto no usa `--add-dir`, el comportamiento observado no tiene respaldo documental. La afirmación actual en `permission-model.md` ("sin respaldo documental conocido") es correcta para el caso base pero incompleta — el caso `--add-dir` sí está documentado.

### D3.2 — `defaultMode` dentro vs fuera de `permissions`

**Evidencia encontrada (3 fuentes independientes):**
1. Definición del campo como `permissions.defaultMode` — `settings-reference.md:295`
2. Ejemplo canónico en Permission Rule Syntax — `settings-reference.md:345-354`
3. Ejemplo completo "Complete Example" — `settings-reference.md:1229-1244`

**Conclusión:** Posición correcta confirmada sin ambigüedad. Fix ya aplicado en commit 80d1bd3.

---

## Fixes pendientes en permission-model.md

| # | Línea | Cambio | Prioridad |
|---|-------|--------|-----------|
| F1 | ✅ FIJADO (commit 80d1bd3) | `defaultMode` movido dentro de `permissions` | — |
| F2 | tabla ~L158 | Agregar `dontAsk` como quinto modo (válido en agent frontmatter) | Media |
| F3 | ~L167-172 | Aclarar safety invariant: `.claude/` entero (excepto `.claude/worktrees/`) — explícito en ultimate-guide | Alta |
| F4 | ~L167 | Agregar nota sobre `--add-dir` como única vía documentada de auto-load de skills | Baja |
