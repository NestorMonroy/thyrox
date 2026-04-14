```yml
type: Analysis
created_at: 2026-04-14 09:13:51
project: thyrox-framework
feature: context-migration
fase: FASE 35
wp_size: mediano
```

# Analysis — context-migration (FASE 35)

## Problema

Desde FASE 34, se detectó que operaciones `Edit` sobre archivos en `.claude/context/`
siempre solicitan confirmación manual, incluso con:
- `defaultMode: acceptEdits` en `settings.json`
- Reglas explícitas `Edit(/.claude/context/now.md)` en `allow`

El primer síntoma fue reportado en la sesión de FASE 34 al ejecutar la prueba de
permisos: el asistente afirmó "funciona" basándose en que los `Edit` completaron
exitosamente, sin poder distinguir entre aprobación automática y manual.

---

## Cronología de la investigación

### Fase 1 — Hipótesis de formato de glob

**Observación inicial:** `Edit(/.claude/context/work/**)` no hacía match.

**Fix aplicado:** Cambiar bare `**` a `**/*.md` (commit `e477135`):
- `Edit(/.claude/context/work/**)` → `Edit(/.claude/context/work/**/*.md)`
- Agregar `Edit(/.claude/context/now.md)` explícito
- Agregar `Edit(/.claude/context/focus.md)` explícito

**Resultado:** Sigue prompting después de reinicio de sesión. Hipótesis incorrecta.

### Fase 2 — Hipótesis de herencia de settings

**Observación:** `~/.claude/settings.json` (user-level) no tiene `defaultMode`.
**Hipótesis:** Settings de usuario podrían override project-level `defaultMode`.

**Descubrimiento adicional:** Existe `.claude/settings.local.json` con reglas `Bash`
legacy (operaciones puntuales de FASEs anteriores).

**Resultado:** No es la causa — CHANGELOG.md (sin allow explícito) es automático.
`acceptEdits` sí funciona para archivos fuera de `.claude/`.

### Fase 3 — Test comparativo

Tests con método cancel-para-detectar:

| Archivo | Tiene allow explícito | Resultado |
|---------|----------------------|-----------|
| `ROADMAP.md` | Sí (`Edit(/ROADMAP.md)`) | ✅ Auto |
| `CHANGELOG.md` | No | ✅ Auto (`acceptEdits`) |
| `.claude/context/now.md` | Sí | ❌ Prompt |
| `.claude/context/focus.md` | Sí | ❌ Prompt |
| `.claude/context/work/**/*.md` | Sí | ❌ Prompt |

**Patrón:** Todo lo que está bajo `.claude/` → siempre prompt.

### Fase 4 — Investigación en documentación

**Fuente:** `/tmp/reference/claude-code-ultimate-guide/guide/ultimate-guide.md` L1077-1088

**Hallazgo confirmado:**

> "Safety invariant — some paths always prompt, even in `bypassPermissions` mode"

Rutas protegidas hardcodeadas:
- `.git/` directory
- `.claude/` directory — **except `.claude/worktrees/`**
- Shell config files (`.bashrc`, `.zshrc`)
- `.gitconfig`, `.mcp.json`, `.claude.json`

> "This safety invariant holds **regardless of permission mode**, preventing accidental
> or malicious modification of the configuration layer itself."

**Origen:** Introducida como security fix en v2.1.78 (2026-03-18).

**Conclusión:** Las reglas `allow` en `settings.json` son filtros adicionales, NO
overrides de la invariant. No existe mecanismo documentado para deshabilitar esta
protección.

### Fase 5 — Test de excepción `.claude/worktrees/`

Confirmado empíricamente: `Edit` en `.claude/worktrees/test.md` → automático.
La excepción documentada funciona. Sin embargo, `.claude/worktrees/` es
infraestructura interna de Claude Code (creada por `claude --worktree`), con
auto-limpieza al cierre de sesión. No es viable para archivos de proyecto.

### Fase 6 — Test de directorio alternativo

Creado `.thyrox/test.md`:
- `Write` → automático ✅
- `Edit` → automático ✅

**Confirmación:** La protección es específica de `.claude/`. Cualquier otro
directorio (incluso hidden como `.thyrox/`) respeta `acceptEdits` normalmente.

---

## Causa raíz

**Safety invariant de Claude Code v2.1.78:** El directorio `.claude/` tiene
protección hardcodeada en el núcleo del motor de permisos. Esta protección aplica
a TODOS los modos de permisos y no puede ser overrideada por reglas de usuario.

Los archivos de contexto que el framework modifica frecuentemente:
- `now.md` — actualizado en cada transición de fase
- `focus.md` — actualizado en cierre de cada FASE
- `context/work/**/*.md` — artefactos WP durante Phase 6 EXECUTE

Están en `.claude/context/` y por tanto siempre requerirán confirmación manual.

---

## Solución propuesta

Mover la estructura `context/` a `.thyrox/context/` a nivel raíz del proyecto.

```
Antes:  .claude/context/
Después: .thyrox/context/
```

Archivos afectados por la migración:
- `now.md` → `.thyrox/context/now.md`
- `focus.md` → `.thyrox/context/focus.md`
- `work/` → `.thyrox/context/work/`
- `decisions/` → `.thyrox/context/decisions/`
- `project-state.md` → `.thyrox/context/project-state.md`
- `technical-debt.md` → `.thyrox/context/technical-debt.md`

Referencias a actualizar:
- `CLAUDE.md` — estructura del proyecto + paths
- `scripts/*.sh` — todos los scripts que referencian `context/`
- `skills/thyrox/SKILL.md` — paths de artefactos
- `settings.json` — reglas `Write`/`Edit` para nuevos paths
- `references/*.md` — documentación de paths

---

## Scope out

- `decisions/` puede permanecer en `.claude/context/decisions/` si los ADRs
  no requieren edición frecuente (solo se crean, no se modifican).
- `memory/`, `guidelines/`, `registry/` — permanecen en `.claude/`.
- Los skills y agents — permanecen en `.claude/`.
- `research/` — si existe, permanece en `.claude/context/research/` (no es live).

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Referencias rotas en scripts | Alta | Alto | grep exhaustivo antes de migrar |
| Hook sync-wp-state.sh apunta a path viejo | Alta | Alto | Actualizar en mismo commit |
| session-start.sh no encuentra now.md | Alta | Alto | Actualizar antes de primer uso |
| `.thyrox/` no está en .gitignore | Baja | Medio | Verificar .gitignore |
| git history de archivos se corta | Media | Bajo | Usar `git mv` |
