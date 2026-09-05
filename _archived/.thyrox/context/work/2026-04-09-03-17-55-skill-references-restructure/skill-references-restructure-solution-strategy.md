```yml
created_at: 2026-04-09 04:30:00
updated_at: 2026-04-09 05:15:00
project: THYROX
architecture_version: 2.2
architect: Claude
status: Propuesta — pendiente confirmación usuario
work_package: 2026-04-09-03-17-55-skill-references-restructure
```

# Solution Strategy: skill-references-restructure (FASE 24)

## Propósito

Definir CÓMO ejecutar la redistribución de 24 references y 20 scripts desde
`pm-thyrox/references/` y `pm-thyrox/scripts/` hacia su nivel arquitectónico correcto,
sin romper links internos, hooks, ni la funcionalidad del framework.

---

## Key Ideas

### Idea 1: Migración atómica por batch — git mv preserva historial

Cada archivo se mueve con `git mv` (no cp+rm). Esto garantiza que `git log --follow`
muestre el historial completo del archivo en su nueva ubicación.

Las migraciones se agrupan en batches homogéneos:
- **Batch A**: referencias de workflow-* (15 archivos — las más simples, sin acoplamiento externo)
- **Batch B**: referencias globales → `.claude/references/` (9 archivos — requiere crear nuevo dir)
- **Batch C**: scripts de workflow-track → `workflow-track/scripts/` (2 scripts)
- **Batch D**: scripts de infraestructura → `.claude/scripts/` (13 scripts, requiere actualizar settings.json)

Cada batch incluye en el MISMO commit: el `git mv` + la actualización de todos los links que apuntan al archivo movido.

### Idea 2: "Link budget" por archivo antes de mover

Antes de mover cada archivo, se construye un mapa de sus referencias externas:
```
archivo → [lista de archivos que lo referencian con su path]
```
Este mapa se usa para actualizar todos los links en el mismo commit de migración.

Los links viven en 3 lugares:
- **SKILL.md files** (`workflow-*/SKILL.md`, `pm-thyrox/SKILL.md`)
- **Otros reference files** (references que se cross-referencian entre sí)
- **settings.json** (solo para scripts de hooks)

### Idea 3: Validación continua con los propios scripts del framework

Después de cada batch, ejecutar `detect_broken_references.py` para verificar que
no quedaron links rotos. Los scripts de validación se mueven en el último batch
(Batch D), así siguen disponibles en su ubicación original durante toda la migración.

### Idea 4: CLAUDE.md se actualiza en el commit final — incluyendo directorios no documentados

La sección `## Estructura` de CLAUDE.md describe la anatomía del proyecto.
Se actualiza una sola vez al final, cuando la estructura nueva está estabilizada.
Esto evita que CLAUDE.md quede inconsistente en commits intermedios.

**Alcance de la actualización** (hallazgo del Phase 1 review):
CLAUDE.md actualmente omite 4 directorios que ya existen en `.claude/`:
- `.claude/guidelines/` — reglas siempre-activas por tech domain (generadas por registry)
- `.claude/registry/` — generador de skills/agentes desde templates YAML
- `.claude/commands/` — comando `workflow_init` (pendiente migración, ver TD-020)
- `.claude/memory/` — auto-creado por Claude Code Web (vacío)
- `.claude/scripts/` — NUEVO en esta FASE
- `.claude/references/` — NUEVO en esta FASE

El commit final actualiza el diagrama de estructura para reflejar la realidad completa.

---

## Fundamental Decisions

### Decisión 1: Usar `git mv` + actualización de links en el mismo commit

**Alternativas consideradas:**
- **A) `git mv` sin actualizar links** → archivos movidos pero links rotos entre commits (estado intermedio roto)
- **B) Actualizar links primero, luego mover** → links que apuntan a ubicaciones que aún no existen
- **C) `git mv` + actualización de links en el mismo commit** ← elegida

**Justificación:** La opción C garantiza que en CADA commit el repositorio está en estado
consistente (no hay links rotos). Si algo falla a mitad, el commit no se hace y el estado
anterior es recuperable.

**Implicación:** Cada commit es más grande (incluye el mv + todos los updates de links),
pero el estado del repo siempre es válido.

---

### Decisión 2: Orden de batches — references primero, scripts después

**Alternativas consideradas:**
- **A) Scripts primero** → settings.json se rompe antes de terminar; hooks fallan durante la migración
- **B) Todo en un solo commit** → demasiado grande, difícil de revisar, difícil de revertir
- **C) Referencias primero, scripts al final** ← elegida

**Justificación:** Las referencias son más simples (solo links en markdown) y no tienen
efectos en tiempo de ejecución. Los scripts tienen acoplamiento con settings.json y hooks;
moverlos al final reduce el tiempo en que los hooks están en estado transitorio.

**Orden definitivo:**
1. Crear directorios vacíos (workflow-*/references/, .claude/references/, .claude/scripts/, workflow-track/scripts/)
2. Batch A: 15 referencias de fase → workflow-*/references/
3. Batch B: 9 referencias globales → .claude/references/
4. Eliminar pm-thyrox/references/ (verificado vacío)
5. Batch C: 2 scripts de Phase 7 → workflow-track/scripts/
6. Batch D: 13 scripts de infraestructura → .claude/scripts/ + actualizar settings.json
7. Actualizar CLAUDE.md (nueva estructura completa incluyendo `.claude/commands/` y los 4 dirs faltantes) + pm-thyrox/SKILL.md — este commit también cierra TD-020
8. Crear ADR-017
9. (eliminado — TD-020 se resuelve en Paso 7, no requiere entrada en technical-debt.md)

---

### Decisión 3: Crear ADR-017 para los dos nuevos directorios

La creación de `.claude/references/` y `.claude/scripts/` como niveles de primer orden
en el proyecto THYROX es una decisión arquitectónica permanente. Merece un ADR.

**Justificación:**
- ADR-015 documentó la arquitectura de 5 capas; este addendum estructura los artefactos de Capa 0 y Capa 2
- Los proyectos de referencia muestran que `.claude/scripts/` es un patrón establecido
- La decisión es irreversible en la práctica (renombrar paths rompe workflows de otros usuarios)

**Alternativa descartada:** No crear ADR → la decisión queda implícita. Rechazado: va contra
el principio "ANALYZE first" — las decisiones permanentes se documentan.

---

### Decisión 4: pm-thyrox/references/ se elimina; pm-thyrox/scripts/ se conserva

**pm-thyrox/references/** → eliminar (todos los 24 archivos tienen destino verificado)

**pm-thyrox/scripts/** → conservar con contenido:
- `run-functional-evals.sh`, `run-multi-evals.sh` (evals del framework sin owner de fase)
- `migrate-metadata-keys.py`, `verify-skill-mapping.sh` (legacy — valor histórico)
- `tests/test-skill-mapping.sh`, `tests/run-all-tests.sh` (tests del framework)

**Alternativa descartada:** Eliminar pm-thyrox/scripts/ → los scripts legacy y evals se
perderían sin destino claro. El principio "No eliminar sin antes decidir" aplica.

---

## Technology Stack / Herramientas

```
Migración:         git mv (preserva historial)
Validación links:  detect_broken_references.py (ya en el repo)
Links markdown:    Grep + Edit (búsqueda exacta por path)
Settings.json:     Edit (JSON, actualización de 3 paths)
Verificación:      detect_broken_references.py post-batch
```

---

## Architecture Patterns

### Patrón de migración: Atomic Batch Commit

```
Por cada batch:
  1. git mv [archivos del batch] [destinos]
  2. Grep → localizar todos los links que apuntan a esos archivos
  3. Edit → actualizar cada link al nuevo path
  4. git add -A
  5. git commit -m "refactor(fase-24): [descripción del batch]"
  6. detect_broken_references.py  ← verificación
```

### Patrón de enlace relativo en skills

Dentro de un `SKILL.md`, los links a sus propias references usan path relativo:
```markdown
[scalability](references/scalability.md)          ← dentro de workflow-analyze/SKILL.md
```

Desde `pm-thyrox/SKILL.md`, links a workflow-* references:
```markdown
[scalability](../workflow-analyze/references/scalability.md)
```

Desde cualquier skill, links a `.claude/references/`:
```markdown
[skill-vs-agent](../../references/skill-vs-agent.md)   ← desde dentro de skills/
```
O simplemente usar paths absolutos desde la raíz del proyecto en docs:
```
.claude/references/skill-vs-agent.md
```

---

## How We Achieve Quality Goals

### Cohesión (cada skill autocontenido)

- Cada `workflow-*/SKILL.md` tendrá su propio `references/` con los archivos que necesita
- No dependerá de paths en otro skill para funcionar
- `.claude/references/` → docs de plataforma accesibles desde cualquier skill

### Riesgo cero en hooks

- Los scripts de hooks se mueven en el ÚLTIMO batch (Batch D)
- El commit de Batch D incluye: git mv de scripts + actualización de settings.json en la misma operación
- Después del commit, se verifica manualmente que los hooks responden correctamente

### Trazabilidad completa

- Tabla 24/24 en `analysis/references-classification.md` — ningún archivo sin destino
- Tabla 20/20 en `analysis/scripts-pending-decisions-v2.md` — ningún script sin destino
- ADR-017 documenta la decisión permanente

---

## Adherence to Constraints

### Restricción: settings.json con paths hard-coded (R-03 del risk register)

**Cómo se respeta:** El Batch D actualiza settings.json en el MISMO commit que mueve los scripts.
El tiempo en que los hooks apuntan a una ruta inexistente es cero (no hay estado intermedio).

### Restricción: pm-thyrox/SKILL.md "References por dominio" (R-01)

**Cómo se respeta:** Se actualiza en el commit del Batch B (cuando las referencias globales ya
existen en `.claude/references/`). Los paths relativos cambian de:
`[conventions](references/conventions.md)` → `[conventions](../../references/conventions.md)`

### Restricción: Links dentro de reference files que se cross-referencian (R-06)

**Cómo se respeta:** El "link budget" por archivo incluye referencias entre archivos del mismo
batch. Por ejemplo, `validate-missing-md-links.sh` referencia `detect-missing-md-links.sh` —
ambos se mueven en el mismo batch, por lo que el link relativo entre ellos se mantiene válido.

---

## Traceability to Analysis

- Batch A ← `analysis/references-classification.md` tabla fila 2-11 (15 files workflow-fase)
- Batch B ← `analysis/references-classification.md` tabla filas 1,3,8,9,12,13,18,19,23 (9 files global)
- Batch C ← `analysis/scripts-pending-decisions-v2.md` filas 14-15 (validate-phase-readiness, validate-session-close)
- Batch D ← `analysis/scripts-pending-decisions-v2.md` filas 1-13 (13 infraestructura)
- ADR-017 ← decisión `D1-B` confirmada en `scripts-pending-decisions-v2.md`

---

## ADR a crear

**ADR-017**: "Tres niveles de artefactos: `.claude/references/`, `.claude/scripts/`, y `workflow-*/references/`"

Documenta:
- Por qué se crea `.claude/references/` (global — plataforma Claude Code y patrones reutilizables)
- Por qué se crea `.claude/scripts/` (infraestructura Claude Code del proyecto)
- Por qué `.claude/guidelines/` es diferente (siempre-cargado, generado por registry — nivel distinto)
- Por qué se elimina pm-thyrox/references/ y se conserva pm-thyrox/scripts/
- Evidencia de 6 proyectos reales que confirman el patrón `.claude/scripts/`

## Tareas técnicas identificadas

**TD-020** (hallazgo Phase 1 review — SE RESUELVE en commit final de FASE 24):
> ~~Migrar `.claude/commands/workflow_init.md` → `.claude/skills/workflow_init/SKILL.md`~~
> **Revisado**: NO migrar — `.claude/commands/` es el mecanismo correcto para workflow_init.
> `workflow_init` es un procedimiento one-time de bootstrapping; requiere que Claude ejecute
> lógica de detección (no es un prompt puro). `disable-model-invocation: true` no aplica.
> Los commands siguen siendo válidos y soportados (no deprecated).
> **Acción real de TD-020**: Documentar `.claude/commands/` en `## Estructura` de CLAUDE.md
> con descripción: "Comandos de setup one-time — distinto de skills, sin frontmatter, sin
> disparo automático". Se hace en el commit final (Paso 7). TD-020 se cierra en FASE 24.
> Ver análisis completo: `analysis/commands-vs-skills-analysis.md`

## Backlog — FASE 25 candidato

**session-compressor** (patrón de claude-compress):
> Adaptar `ccomp_chat.py` como `.claude/scripts/compress-session.py` con defaults THYROX:
> `--focus "Phase context, work package progress, ADR decisions, ROADMAP tasks"`.
> Depende de FASE 24 (`.claude/scripts/` debe existir primero).

---

## Validation Checklist

- [x] Key ideas claramente articuladas
- [x] Decisiones fundamentales documentadas con alternativas y justificación
- [x] Restricciones respetadas (settings.json, links cruzados)
- [x] Patrones de migración definidos
- [x] Trazabilidad a Phase 1 (tablas 24/24 y 20/20)
- [x] ADR identificado
- [x] Phase 1 review completo — 4 directorios no inventariados evaluados
- [x] Adaptaciones de ejemplos externos evaluadas (ccomp → FASE 25, resto descartado)
- [x] TD-020 revisado y reclasificado — documentar .claude/commands/ en FASE 24, no migrar
- [x] Backlog FASE 25 candidato documentado
- [ ] Usuario confirma explícitamente esta estrategia

---

## Siguiente Paso

Una vez aprobada esta Phase 2 →
`/workflow-plan` para Phase 3: PLAN (scope + task list en ROADMAP)
