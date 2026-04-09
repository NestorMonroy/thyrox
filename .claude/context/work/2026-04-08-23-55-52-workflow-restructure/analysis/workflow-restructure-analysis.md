```yml
type: Análisis
work_package: 2026-04-08-23-55-52-workflow-restructure
created_at: 2026-04-08 23:55:52
updated_at: 2026-04-08 23:55:52
phase: Phase 1 — ANALYZE
reversibility: reversible
```

# Análisis: workflow-restructure (FASE 23)

## Objetivo

Convertir los 7 `workflow_*.md` flat files en `.claude/skills/` a subdirectorios con `SKILL.md` (TD-019: Option B). Simultáneamente, resolver TD-020..TD-023 (contenido faltante) y ejecutar T-027 (reducción SKILL.md a catálogo).

---

## Estado actual

### Estructura actual

```
.claude/skills/
├── backend-nodejs/SKILL.md     ← subdirectorio ✓
├── db-mysql/SKILL.md           ← subdirectorio ✓
├── db-postgresql/SKILL.md      ← subdirectorio ✓
├── frontend-react/SKILL.md     ← subdirectorio ✓
├── frontend-webpack/SKILL.md   ← subdirectorio ✓
├── pm-thyrox/SKILL.md          ← subdirectorio ✓
├── python-mcp/SKILL.md         ← subdirectorio ✓
├── sphinx/SKILL.md             ← subdirectorio ✓
├── workflow_analyze.md         ← flat file ✗ (inconsistente)
├── workflow_decompose.md       ← flat file ✗
├── workflow_execute.md         ← flat file ✗
├── workflow_plan.md            ← flat file ✗
├── workflow_strategy.md        ← flat file ✗
├── workflow_structure.md       ← flat file ✗
└── workflow_track.md           ← flat file ✗
```

**Convención observable:** todos los skills establecidos son subdirectorios kebab-case (hyphen).
Los 7 workflow_* son la excepción — creados en FASE 22 como flat files por error de secuenciación (L-093).

---

## DA-001: Naming del directorio — underscore vs hyphen

**Esta es la decisión más impactante del WP.**

### Opción A: underscore (`workflow_analyze/SKILL.md`)
- `/<name>` = `/workflow_analyze` — sin breaking change
- `session-start.sh` no necesita actualización
- Pero: **inconsistente** con convención del proyecto (todos los otros skills usan hyphen)
- El patrón `workflow_*` del frontmatter (ej. `ls .claude/skills/workflow_*.md`) deja de funcionar

### Opción B: hyphen (`workflow-analyze/SKILL.md`)
- `/<name>` = `/workflow-analyze` — **breaking change** en invocación
- `session-start.sh` debe actualizarse (7 referencias de `/workflow_analyze` → `/workflow-analyze`)
- `CLAUDE.md` Addendum #5 debe actualizarse
- `description:` en frontmatter de cada SKILL.md debe actualizarse
- `commands/workflow_init.md` referencia `/workflow_*` — revisar impacto
- **Consistente** con convención del proyecto (kebab-case como todos los demás skills)
- El usuario dijo explícitamente "workflow-analyze/SKILL.md" → preferencia indicada

### Recomendación

Opción B (hyphen). Razones:
1. El usuario lo indicó explícitamente.
2. Consistencia con todos los demás skills (kebab-case).
3. Mejor legibilidad: `workflow-analyze/` vs `workflow_analyze/`.
4. Las actualizaciones de referencia son mecánicas y atómicas (T-NNN por archivo).

**Impacto en invocación:** `/workflow_analyze` → `/workflow-analyze`. El usuario debe ajustar su muscle memory al escribir el comando, pero session-start.sh le recordará la opción correcta.

---

## DA-002: Contenido a agregar (TD-020, TD-022)

### TD-020: Tabla de escalabilidad

La tabla escalabilidad de SKILL.md (`| Tamaño | Duración | Fases activas | Qué omitir |`) no está en ningún `workflow_*.md`. El END USER que invoca `/workflow_analyze` no tiene visibilidad de si debe ejecutar las 7 fases o puede saltar algunas.

**Fix:** Añadir referencia a escalabilidad en `workflow_analyze/SKILL.md` (Phase 1 es donde se decide el tamaño del WP). Los demás workflows no necesitan la tabla completa — solo analyze.

### TD-022: Limitaciones conocidas (triggering probabilístico)

La sección "Limitaciones conocidas" de SKILL.md no está en los workflow_* skills. El contenido es relevante para el contexto de sesión, no para la ejecución de la fase. No es necesario duplicarlo en cada workflow.

**Fix:** Ninguno — las limitaciones aplican a la activación del SKILL pm-thyrox, no a la ejecución de una fase concreta. El END USER que invoca `/workflow-analyze` ya está pasando por alto el triggering probabilístico (invocó directamente). Documentar solo en SKILL.md es suficiente.

---

## DA-003: References/ ownership (TD-023)

`pm-thyrox/references/` contiene 14 archivos de referencia. Ninguno tiene owner asignado. Con la migración a subdirectorios, cada `workflow-*/` podría tener sus propias referencias específicas de fase.

**Propuesta:** No migrar references/ por ahora. El ownership se puede asignar como metadato en cada archivo de referencia (frontmatter `owner: workflow-analyze`) sin mover los archivos. Esto desbloquea TD-023 sin requerir reestructuración de references/.

---

## DA-004: Reducción SKILL.md (T-027)

SKILL.md tiene ~450 líneas con toda la lógica de las 7 fases. La arquitectura objetivo (ADR-015 D-02) es ~40 líneas de catálogo + referencias a `/workflow_*`.

**Contenido que SÍ puede eliminarse** (ya está en workflow_* skills):
- Lógica detallada de cada fase (Phase 1..7 con steps, gates, calibración)

**Contenido que NO puede eliminarse** (solo en SKILL.md):
- Tabla de escalabilidad (Micro/Pequeño/Mediano/Grande) → mover a `workflow-analyze/SKILL.md` primero
- "Dónde viven los artefactos" (tabla de 30 filas) → mantener en SKILL.md o crear references/artifacts.md
- "Estructura de un work package" (árbol de directorios) → ídem
- Naming conventions (tabla kebab-case etc.) → mantener
- Limitaciones conocidas → mantener

**Reducción realista:** de ~450 líneas a ~120-150 líneas (catálogo + nomenclatura + artefactos). No es posible llegar a ~40 líneas sin perder información que no está en ningún otro lugar. El objetivo de ~40 líneas de ADR-015 D-02 asumía que TODO estaría en workflow_* — eso no se cumplió en FASE 22 (TD-020..TD-023).

---

## Hallazgos — 8 aspectos

**Objetivo/Por qué:** Resolver TD-019 (inconsistencia estructural flat vs subdirectorio) + TDs asociados para dejar el framework limpio antes de nuevas FASEs. Mejora mantenibilidad a largo plazo.

**Stakeholders:** Desarrollador que usa `/workflow-*` en sesiones activas (END USER). Claude (el modelo) que procesa el contenido del skill.

**Uso operacional:** El developer escribe `/workflow-analyze` al inicio de la sesión. Claude carga `workflow-analyze/SKILL.md` y ejecuta la fase. Ningún cambio observable en el comportamiento — solo en la estructura de archivos y el nombre del comando.

**Atributos de calidad:** Consistencia > Velocidad. Es preferible tomar el tiempo para hacer la migración bien (con actualizaciones de todas las referencias) que hacerla rápido y dejar referencias rotas.

**Restricciones:**
- `commands/workflow_init.md` usa `/<name>` convention — revisar si necesita actualización.
- `session-start.sh` hardcodea los 7 nombres — REQUERIDO actualizar.
- `CLAUDE.md`, `ADR-016`, `technical-debt.md` referencian los nombres — REQUERIDO actualizar.

**Contexto/sistemas vecinos:**
- `pm-thyrox/SKILL.md` es el "mapa" — se reduce en esta FASE.
- `session-start.sh` es el punto de entrada — muestra opciones de ejecución al usuario.
- Los 7 workflow_* son "herramientas de ejecución" — su contenido no cambia, solo su ubicación.

**Fuera de alcance:**
- Cambios al contenido de las fases (solo estructura y referencias).
- Migración de `references/` a subdirectorios de workflow — diferir (TD-023 se resuelve con frontmatter owner, no con movimiento de archivos).
- Nuevas fases o nuevos workflow_* skills.

**Criterios de éxito:**
- `ls .claude/skills/` muestra solo subdirectorios (ningún `.md` suelto excepto posibles templates)
- `/workflow-analyze` funciona en Claude Code (session-start.sh muestra el nombre correcto)
- `SKILL.md` reducido a ~120-150 líneas con catálogo + artefactos + naming
- TD-019, TD-021, TD-023 cerrados. TD-020 parcialmente cerrado (escalabilidad en workflow-analyze). TD-022 cerrado (no requiere cambio). T-027 completado.

---

## Riesgos identificados

| ID | Riesgo | Prob | Impacto |
|----|--------|------|---------|
| R-01 | Cambio de `_` a `-` rompe referencias no detectadas | Media | Medio |
| R-02 | SKILL.md reducción elimina secciones que tienen dependencias | Media | Alto |
| R-03 | `workflow_init.md` en commands/ referencia `/workflow_*` con underscore | Baja | Bajo |
| R-04 | Context overflow por volumen de cambios (7 migrados + referencias + reducción) | Alta | Bajo |

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis completo, DA-001 decidido | Confirmación explícita del usuario + DA-001 resuelto |
| SP-02 | 2→3 | gate-fase | Strategy con scope de reducción SKILL.md definido | Confirmación explícita |
| SP-03 | 4→5 | gate-fase | Spec completa y checklist al 100% | Confirmación explícita |
| SP-04 | 5→6 | gate-fase | Task-plan aprobado | Confirmación explícita |
| SP-05 | 6→7 | gate-fase | Validación pre-Phase 7 pasada | Confirmación explícita |
