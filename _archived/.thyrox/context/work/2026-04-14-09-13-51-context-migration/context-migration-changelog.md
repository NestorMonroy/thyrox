```yml
work_package_id: 2026-04-14-09-13-51-context-migration
closed_at: 2026-04-14 22:38:05
type: WP Changelog
```

# WP Changelog: context-migration (FASE 35)

## Resumen ejecutivo

Migración de `.claude/context/` → `.thyrox/context/` para separar el estado de trabajo del
proyecto de la zona de configuración de Claude Code. Adicionalmente: 13 deep-reviews de refs,
knowledge base creada, nomenclatura estándar aplicada, hooks de calidad implementados.

---

## Cambios por área

### Migración de directorios

- **`.claude/context/` → `.thyrox/context/`** — todo el estado de sesión y artefactos de trabajo
  - 52 WPs (via `git mv`, historial preservado)
  - 19 ADRs
  - 16 ERRs
  - `research/`, `focus.md`, `now.md`, `project-state.md`, `technical-debt.md`
  - `.claude/context/` eliminado del repositorio

### Nomenclatura estándar (sin números, kebab-case)

- **19 ADRs renombrados**: `adr-001.md` → `adr-{tema-descriptivo}.md`
- **18 errores renombrados**: `ERR-NNN-desc.md` → `{descripcion}.md`
- `decisions.md` completamente reescrito con índice actualizado
- `adr.md.template` actualizado a naming sin números

### Knowledge Base

Nueva estructura en `.thyrox/context/`:
- `knowledge-base.md` — índice maestro del sistema de conocimiento
- `lessons/README.md` + 4 lecciones promovidas (L-001..L-004)
- `patterns/README.md` + 3 patrones formalizados (P-001..P-003)
- `lesson.md.template` y `pattern.md.template` en `workflow-track/assets/`

### Referencias de plataforma (13 deep-reviews)

Actualizados con hallazgos de `/tmp/reference/claude-howto/` y `/tmp/reference/claude-code-ultimate-guide/`:
- `hooks.md`: 309 → 592 líneas (timeout correcto 60s, 26 eventos, debugging)
- `memory-hierarchy.md`: 157 → 261 líneas
- `plugins.md`: 305 → 567 líneas
- `mcp-integration.md`: 344 → 538 líneas
- `subagent-patterns.md`: 329 → 613 líneas
- `advanced-features.md`: 584 → 1065 líneas
- `cli-reference.md`: 511 → 652 líneas
- `sdd.md`: 553 → 794 líneas
- `tool-execution-model.md`, `scheduled-tasks.md`, `command-execution-model.md` (+300 líneas total)
- `hook-authoring.md` — **pendiente** (2 intentos fallaron por stream idle timeout)

### Hooks y automatización

- **`validate-session-close.sh`** registrado en Stop hook (`settings.json`)
- **`bound-detector.py`** creado e implementado como PreToolUse hook sobre Agent tool
  - 3-tier detection: UNBOUNDED / DIFFUSE / BOUND signals
  - ADR documentado: `adr-bound-detector-preToolUse.md`
- **`CLAUDE_STREAM_IDLE_TIMEOUT_MS`**: 120 000 → 420 000 ms
- **`diagrama-ishikawa.md`**: Paso 8 agregado (salida markdown obligatoria)
  - `Write` agregado a tools del agente

### Análisis y documentación

- **Ishikawa** `hook-authoring-timeout-ishikawa.md` persistido en WP
- **ADR** `adr-bound-detector-preToolUse.md` creado
- **Correcciones de referencias rotas** en patterns/ y lessons/ (3 archivos)

---

## Archivos clave modificados

| Archivo | Tipo de cambio |
|---------|----------------|
| `.claude/CLAUDE.md` | Estructura actualizada (v3.4 → paths .thyrox/) |
| `.claude/settings.json` | Stop hook + PreToolUse + CLAUDE_STREAM_IDLE_TIMEOUT_MS |
| `.claude/scripts/bound-detector.py` | Nuevo |
| `.thyrox/context/knowledge-base.md` | Nuevo |
| `.thyrox/context/lessons/` | 4 lecciones + README |
| `.thyrox/context/patterns/` | 3 patrones + README |
| `.thyrox/context/decisions.md` | Reescrito completamente |
| 19 ADRs | Renombrados con git mv |
| 18 errores | Renombrados con git mv |
| 11 referencias `.claude/references/` | Complementadas |

---

## TDs cerrados en esta FASE

Ninguno formalmente asignado — FASE 35 abrió nuevos TDs (TD-037..TD-040).

## TDs abiertos por esta FASE

Ver `context-migration-lessons-learned.md` sección "Deuda pendiente".
