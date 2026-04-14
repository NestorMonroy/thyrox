```yml
type: Pre-WP Investigation Log
created_at: 2026-04-14 09:30:00
project: thyrox-framework
feature: context-migration
fase: FASE 35
nota: Investigación realizada ANTES de crear el WP formal. Capturada retroactivamente.
```

# Investigación Pre-WP — Permisos Edit en .claude/ (sesión anterior)

Registro de la investigación que derivó en la creación de FASE 35.
Ejecutada durante las sesiones de cierre de FASE 34.

---

## Hallazgos del agente Explore sobre WPs anteriores

### H-1: CRÍTICO — Edit/Write requieren aprobación explícita

**Fuentes:**
- `write-gates-lessons-learned.md:19-31` — L-106
- `tool-execution-model.md:194-196`

Edit/Write requieren aprobación por defecto SIEMPRE. `defaultMode: acceptEdits`
cambia Edit/Write, NOT Bash. Bash permanece con prompt por defecto.

Adicionalmente — `tool-execution-model.md L84`:
> "Con `defaultMode: acceptEdits`, las reglas `Edit(...)` en `allow` son redundantes
> — ya están cubiertas por el defaultMode."

**Implicación:** Agregar `Edit(/ROADMAP.md)` al allow list fue innecesario.
Si promtea de todas formas, el problema está en otra capa.

### H-2: Sub-agentes en background no pueden escribir en referencias/

**Fuentes:**
- `skill-authoring-modernization-lessons-learned.md:96-112` — L-005
- `technical-debt-resolution-analysis.md:84-89` — TD-027

Los agentes en background no tienen UI para solicitar permisos interactivos.
El allow list original tenía `Write(/.claude/context/work/**)` pero le faltaba
`Write(/.claude/references/**)`. Resuelto en FASE 34 (C1).

### H-3: C-04 — Primera invocación en sesión nueva puede generar prompt único

**Fuente:** `thyrox-commands-namespace/analysis/claude-howto-reference-analysis.md:153-181`

| Causa | Descripción | Probabilidad |
|-------|-------------|-------------|
| C-01 | `acceptEdits` no cubre Bash — `mkdir` sigue siendo Bash | Media |
| C-02 | Pattern `Bash(mkdir *)` no hace match con paths absolutos | Media |
| C-04 | **Primera invocación de Write en sesión nueva genera prompt único** | **Alta** |
| C-05 | `ask` rules para `Edit(/.claude/skills/*/SKILL.md)` activan confirmación intencional | Alta |

### H-4: ~/.claude/settings.json existe — reportado incorrectamente en sesión anterior

El agente Explore reportó que `~/.claude/settings.json` no tenía `defaultMode`.
Confirmado via Bash:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": { "Stop": [...] },
  "permissions": { "allow": ["Skill"] }
}
```

Sin `defaultMode`. Hipótesis planteada: si user-level settings reemplaza
project-level, el `allow: ["Skill"]` podría sobrescribir toda la lista del proyecto.

---

## Tests ejecutados en sesión anterior

El asistente ejecutó 6 Edit en secuencia (3 con test + 3 revert):

| Archivo | Resultado reportado |
|---------|-------------------|
| `.claude/context/now.md` | Edit completó |
| `ROADMAP.md` | Edit completó |
| `context/work/**/exit-conditions.md` | Edit completó |

**Problema detectado por el usuario:** El asistente reportó "funciona" sin poder
distinguir si los Edit fueron auto-aprobados o aprobados manualmente.

**Limitación confirmada:** Desde la perspectiva del LLM, el resultado de un Edit
es idéntico tanto si fue auto-aprobado como si el usuario lo aprobó manualmente.
No existe metadato en el tool result que indique cuál ocurrió.

---

## Método de detección usado (cancel-to-detect)

El usuario instruyó: "manda las pruebas y yo los voy a cancelar para que los detectes
cuales yo cancele".

Resultados del cancel test (nueva sesión post-reinicio):

| Archivo | Regla en allow | Resultado |
|---------|---------------|-----------|
| `ROADMAP.md` | `Edit(/ROADMAP.md)` (sesión anterior) | ✅ Auto |
| `CHANGELOG.md` | ninguna (solo acceptEdits) | ✅ Auto |
| `.claude/context/now.md` | `Edit(/.claude/context/now.md)` | ❌ Usuario canceló |
| `.claude/context/focus.md` | `Edit(/.claude/context/focus.md)` | ❌ Usuario canceló |
| `.claude/context/work/**/*.md` | `Edit(/.claude/context/work/**/*.md)` | ❌ Usuario canceló |

---

## Conclusión de la investigación

La causa raíz NO era el formato de glob ni la herencia de settings.
Es una **safety invariant hardcodeada** en Claude Code v2.1.78.

Ver: `context-migration-analysis.md` en este mismo WP para el análisis completo.

---

## Diagnóstico intermedio (sesión 2 — mismo día)

Antes de descubrir la safety invariant, se hizo un diagnóstico adicional en otra
sesión que planteó la hipótesis de formato de glob:

> "Edit(/ROADMAP.md) → funciona (la regla que agregué sí aplica)
> Edit(/.claude/context/now.md) y Edit(/.claude/context/work/**) → siguen pidiendo confirmación.
> El problema está en que Edit(/.claude/context/work/**) en allow no está haciendo match.
> El defaultMode: acceptEdits tampoco los cubre automáticamente para paths bajo .claude/.
> Probablemente el formato del glob ** o la ruta con .claude/ tiene un problema de matching."

Esta hipótesis derivó en el commit `e477135` (glob fix: `**` → `**/*.md`) que
resultó igualmente inefectivo.

### Stop hook feedback detectado en esa sesión

```
⚠ TD-001: timestamps incompletos encontrados (fecha sin hora):
  .claude/context/work/2026-04-11-10-52-25-thyrox-commands-namespace/analysis/edit-tool-silent-mode-finding.md
  .claude/context/work/2026-04-12-10-10-50-skill-authoring-modernization/analysis/stream-timeout-root-cause.md
  .claude/context/work/2026-04-05-01-09-22-thyrox-capabilities-integration/thyrox-capabilities-integration-task-plan.md
  [... 9 archivos más]
```

TD-001 sigue detectando artefactos con `created_at: YYYY-MM-DD` sin hora.
Son artefactos de FASEs anteriores (2026-04-05 a 2026-04-12). Pendiente de
resolución fuera del scope de FASE 35.

### Incidente ROADMAP.md test2

Durante las pruebas de esa sesión, quedó un `# test2` en `ROADMAP.md` sin
commitear. El stop hook lo detectó. El revert ya estaba aplicado — `git diff`
mostró el archivo limpio, no hubo commit necesario.

---

## Fix inútil aplicado (a limpiar en Phase 6)

Las siguientes reglas en `.claude/settings.json` fueron agregadas como intento de
fix, pero son inefectivas contra la safety invariant y deben removerse:

```json
"Edit(/.claude/context/now.md)",
"Edit(/.claude/context/focus.md)",
"Edit(/.claude/context/work/**/*.md)"
```

Commit: `e477135` — "fix(permissions): corregir glob Edit en settings.json"
