```yml
type: Analysis Supplement
work_package: 2026-04-09-03-17-55-skill-references-restructure
created_at: 2026-04-09 05:00:00
purpose: Revisión de completitud de Phase 1 — directorios no inventariados + adaptaciones de ejemplos externos
```

# Phase 1 Review Supplement — Brechas e impacto en estrategia

---

## 1. Directorios .claude/ no inventariados en Phase 1

La Phase 1 analizó `pm-thyrox/references/` y `pm-thyrox/scripts/` pero perdió de vista que
`.claude/` ya tiene más estructura de la que CLAUDE.md describe:

```
.claude/                        ← Lo que CLAUDE.md documenta:
├── CLAUDE.md
├── agents/
├── context/
└── skills/pm-thyrox/

.claude/                        ← Lo que REALMENTE existe:
├── CLAUDE.md
├── agents/                     ✓ documentado
├── commands/                   ← NO documentado
│   └── workflow_init.md
├── context/                    ✓ documentado
├── guidelines/                 ← NO documentado
│   ├── backend-nodejs.instructions.md
│   ├── db-mysql.instructions.md
│   ├── db-postgresql.instructions.md
│   ├── frontend-react.instructions.md
│   ├── frontend-webpack.instructions.md
│   └── python-mcp.instructions.md
├── memory/                     ← NO documentado (vacío, auto-creado)
├── registry/                   ← NO documentado
│   ├── README.md
│   ├── bootstrap.py
│   ├── _generator.sh
│   ├── agents/     (YAML specs)
│   ├── backend/    (templates)
│   ├── db/         (templates)
│   ├── frontend/   (templates)
│   └── mcp/        (MCP server code)
└── skills/                     ✓ documentado (parcialmente)
```

---

## 2. Análisis de cada directorio no inventariado

### `.claude/guidelines/` — SIEMPRE cargado, generado por registry

**Qué es**: Archivos `*.instructions.md` que Claude Code descubre y carga automáticamente
en cada sesión. Son las "reglas siempre activas" por dominio tecnológico.

**Generado por**: `registry/_generator.sh` desde templates en `registry/backend/`, `registry/db/`, etc.
**Ciclo de vida**: Se genera una vez con `/workflow_init`, se regenera con `--force`.

**Relación con `.claude/references/`** (la nueva propuesta):
| Nivel | Directorio | Cuándo se carga | Quién escribe |
|-------|-----------|----------------|---------------|
| Siempre activo | `.claude/guidelines/` | Automático (Claude Code los descubre) | `registry/_generator.sh` |
| Bajo demanda | `.claude/references/` (NUEVO) | Cuando un skill lo lee explícitamente | Mantenedor del framework |

**NO hay conflicto**. Son niveles complementarios con mecanismos distintos.
El `.claude/guidelines/` del Go project es el equivalente de nuestro `.claude/guidelines/`.
**La Phase 1 no creó ninguna confusión aquí — son independientes.**

---

### `.claude/registry/` — Generador de skills y agentes

**Qué es**: Sistema de plantillas + scripts para generar tech skills y agentes desde specs YAML.
- `bootstrap.py` → genera agentes nativos en `.claude/agents/` desde YAML + actualiza `.mcp.json`
- `_generator.sh` → genera tech skills en `.claude/skills/` desde templates + guidelines en `.claude/guidelines/`
- `agents/*.yml` → specs de los agentes (nodejs-expert, postgresql-expert, etc.)
- `backend|db|frontend/*.template.md` → templates de tech skills

**Impacto en FASE 24**: Ninguno. El registry genera artefactos en otros directorios pero no
es en sí mismo un artefacto que deba restructurarse.
**Buen candidato para documentar en un ADR o en CLAUDE.md para hacerlo visible.**

---

### `.claude/commands/workflow_init.md` — Comando no migrado

**Qué es**: Slash command `/workflow_init` que detecta el stack tecnológico y genera tech skills.
Es el punto de entrada para inicializar un proyecto THYROX con su stack.

**Problema**: FASE 23 migró todos los `workflow_*` commands a skills hidden. Pero
`workflow_init` **no fue migrado** — sigue en `.claude/commands/` (formato antiguo).

**¿Por qué no migrado?**: `workflow_init` tiene una naturaleza diferente a los `workflow-*`
de fases (analyze, plan, execute…). Es un comando de bootstrapping de "una sola vez",
no parte del ciclo SDLC de fases. Pero aun así debería estar en `.claude/skills/` como
skill hidden si queremos consistencia.

**Impacto en FASE 24**: Fuera de scope. Es una brecha de FASE 23 no capturada.
**Acción recomendada**: Crear task técnica TD-020: migrar `workflow_init` a `.claude/skills/workflow_init/SKILL.md`.

---

### `.claude/memory/` — Vacío, auto-creado

**Qué es**: Directorio creado automáticamente por Claude Code Web (auto-memory feature).
Actualmente vacío. No requiere acción.

---

## 3. Revisión de adaptaciones de proyectos externos

### Proyecto analizado: claude-compress (ccomp)

**Qué hace**: Comprime sesiones de Claude Code leyendo los JSONL de `~/.claude/projects/`
y usando la API de Claude para reducir cada mensaje a ~30% de su longitud. Configurable
con `--focus` para preservar ciertos tipos de contenido.

**Por qué es relevante para THYROX**:
- Las sesiones de THYROX son largas (multi-phase work packages)
- El contexto de framework tiene keywords específicos que preservar: "Phase N", "WP", "SP-NNN", "now.md"
- Un compressor con `--focus` podría preservar automáticamente el contexto del framework

**Adaptación propuesta para THYROX**:
```
.claude/scripts/compress-session.py    ← adaptación de ccomp_chat.py
```
Con defaults de THYROX:
```bash
--focus "preserve: Phase N, work package, SP-NNN, ADR references, ROADMAP tasks, WP context"
--target 30
```

Y un wrapper:
```bash
# .claude/scripts/compress-session.sh
python3 "$(dirname "$0")/compress-session.py" --cwd "$(pwd)" \
  --focus "Phase context, work package progress, ADR decisions, ROADMAP tasks" "$@"
```

**Veredicto: FUERA DE SCOPE para FASE 24 — candidato a FASE 25.**
Razón: FASE 24 restructura artefactos existentes. Añadir ccomp es funcionalidad nueva.

---

### Proyecto analizado: clickhouse-cs — `--changed` flag en scripts de validación

**Qué hace**: `coverage-summary.py --changed` muestra solo archivos modificados en el
working tree, no toda la cobertura. Muy útil en PRs grandes.

**Adaptación para THYROX**: 
`detect_broken_references.py --changed` → validar solo referencias en archivos modificados desde último commit.
Reduce tiempo de validación en batches parciales.

**Veredicto: FUERA DE SCOPE para FASE 24 — mejora incremental de FASE 26 o posterior.**

---

### Proyecto analizado: claude-cognitive — keywords.json para context routing

**Qué hace**: Define qué archivos son "hot" (siempre en contexto) vs "cold" (cargados bajo demanda),
con co-activation rules.

**Adaptación para THYROX**: 
THYROX ya maneja esto con session-start.sh (carga now.md, focus.md) y skills bajo demanda.
La complejidad de keywords.json > valor incremental para un framework de PM.

**Veredicto: NO APLICABLE. THYROX ya tiene un mecanismo más simple que funciona.**

---

### Proyecto analizado: Go project — `.claude/docs/`

**Qué hace**: Documentación de estilo, commits, estructura → vinculada desde CLAUDE.md.
Permite que CLAUDE.md sea conciso mientras los detalles viven en `.claude/docs/`.

**Diferencia con THYROX**: THYROX ya tiene `.claude/guidelines/` para las instrucciones
siempre activas (generadas por el registry). Y `.claude/references/` (nuevo) para referencias
on-demand de skills.

Para THYROX, el patrón del Go project podría ser útil para **CLAUDE.md imports**:
```markdown
# En CLAUDE.md (con @ imports):
See @.claude/references/conventions.md for naming conventions.
```

Esto haría que `conventions.md` se cargue en contexto cuando CLAUDE.md lo menciona.
**Pero conventions.md tiene 718 líneas** — mejor dejarla como referencia on-demand.

**Veredicto: NO aplicar en FASE 24. El concepto ya está cubierto con .claude/references/.**

---

## 4. Impacto en la Solution Strategy

### ¿Necesita cambios la estrategia actual?

**Estrategia principal**: NO cambia. Los 4 batches atómicos y las decisiones D1-B/D2-B siguen siendo correctos.

**Adiciones necesarias al plan:**

1. **Actualizar CLAUDE.md `## Estructura`**: El diagrama de estructura en CLAUDE.md debe actualizarse para incluir los 4 directorios faltantes: `.claude/guidelines/`, `.claude/registry/`, `.claude/commands/`, `.claude/memory/`. Esto se hace en el commit final (ya previsto).

2. **TD-020 — workflow_init.md sin migrar**: Registrar como task técnica. NO bloquea FASE 24 pero sí debe quedar documentado.

3. **FASE 25 candidate — ccomp**: Registrar en backlog para considerar en siguiente planificación.

---

## 5. Tarea técnica identificada: TD-020

```
TD-020: Migrar .claude/commands/workflow_init.md → .claude/skills/workflow_init/SKILL.md
Estado: Abierto
Bloqueado por: Nada (independiente)
Prioridad: Baja (funciona en su ubicación actual)
Contexto: workflow_init usa formato antiguo de command; debería ser skill hidden
  para consistencia con los 7 workflow-* skills de FASE 23.
```

---

## 6. FASE 25 candidato — session compressor

```
FASE 25 candidate: claude-compress adaptation para THYROX
Descripción: Adaptar ccomp_chat.py como .claude/scripts/compress-session.py
  con defaults específicos para preservar contexto de work packages.
Valor: Gestión de context window en sesiones largas (multi-phase WPs).
Dependencia: FASE 24 debe completar primero (.claude/scripts/ debe existir).
```
