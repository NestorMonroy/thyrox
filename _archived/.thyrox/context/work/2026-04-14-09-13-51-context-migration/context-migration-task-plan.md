```yml
created_at: 2026-04-14 20:05:00
wp: 2026-04-14-09-13-51-context-migration
phase: 3 - PLAN → 5 - TASK-PLAN
status: Aprobado — pendiente ejecución
```

# Plan — Migración .claude/context/ → .thyrox/context/

## Scope Statement

**Problema:** `.claude/context/` aloja estado de sesión y work packages dentro del directorio
de configuración de Claude Code, lo que activa la safety invariant del binario en cada escritura
y es semánticamente incorrecto (`.claude/` es configuración/extensiones, no estado de trabajo).

**Criterios de éxito:**
- Todo el contenido de `.claude/context/` vive en `.thyrox/context/` sin pérdida de datos
- El WP activo en `.thyrox/context/work/` no se sobrescribe
- Cero referencias rotas en scripts, agentes y SKILL.md
- `.claude/context/` queda vacío y se elimina del repositorio
- `validate-session-close.sh` reporta limpio al finalizar

---

## Inventario pre-migración

### Origen: `.claude/context/`

| Categoría | Contenido | Acción |
|-----------|-----------|--------|
| `work/` WPs | 52 WPs + INDEX.md | `git mv` cada uno a `.thyrox/context/work/` |
| `decisions/` | 19 ADRs (adr-001 a adr-019) | `git mv` directorio completo |
| `decisions.md` | Índice de ADRs | `git mv` |
| `errors/` | 16 ERR + README.md | `git mv` directorio completo |
| `research/` | 1 sandbox (2026-04-13) | `git mv` directorio completo |
| `technical-debt.md` | TD backlog activo | `git mv` |
| `project-state.md` | Metadata del proyecto | `git mv` |
| `focus.md` | Dirección actual (archivo vivo) | `git mv` (último) |
| `now.md` | Estado de sesión (archivo vivo) | `git mv` (último) |

### Destino: `.thyrox/context/`

| Contenido ya presente | Nota |
|-----------------------|------|
| `work/2026-04-14-09-13-51-context-migration/` | **NO sobrescribir** — WP activo |

**Colisión de WPs:** ninguna (context-migration no existe en `.claude/context/work/`)

### Referencias a actualizar (22 archivos)

| Tipo | Archivos | Referencias |
|------|----------|-------------|
| Agentes | `task-executor.md`, `task-planner.md` | 1 ref c/u |
| Scripts operacionales | `close-wp.sh`, `project-status.sh`, `session-resume.sh`, `session-start.sh`, `set-session-phase.sh`, `sync-wp-state.sh`, `update-state.sh` | 1–3 refs c/u |
| Scripts (ya OK) | `validate-session-close.sh` | Ya soporta ambas rutas |
| SKILL.md | `thyrox/`, `workflow-analyze/`, `workflow-decompose/`, `workflow-execute/`, `workflow-plan/`, `workflow-strategy/`, `workflow-structure/`, `workflow-track/` | 1–4 refs c/u |
| Scripts de skills | `workflow-track/scripts/validate-session-close.sh`, `workflow-track/scripts/validate-phase-readiness.sh`, `thyrox/scripts/migrate-metadata-keys.py` | 2, 1, 9 refs |
| Templates | `workflow-track/assets/technical-debt-resolved.md.template` | 1 ref |
| Configuración | `CLAUDE.md` (estructura + adr_path) | múltiples |

---

## Tareas

### Grupo A — Pre-flight

- [x] **T-001** Verificar que no hay colisión de nombres entre `.claude/context/work/` y `.thyrox/context/work/`
  — Resultado: ninguna colisión. El único WP en `.thyrox/` (`context-migration`) no existe en `.claude/`.

### Grupo B — Mover archivos (git mv)

- [ ] **T-002** Mover 52 WPs de `.claude/context/work/` → `.thyrox/context/work/` usando loop `git mv`
  ```bash
  for wp in .claude/context/work/*/; do
    wpname=$(basename "$wp")
    [ ! -d ".thyrox/context/work/$wpname" ] && git mv ".claude/context/work/$wpname" ".thyrox/context/work/$wpname"
  done
  ```

- [ ] **T-003** Mover `INDEX.md` de work/
  ```bash
  git mv .claude/context/work/INDEX.md .thyrox/context/work/INDEX.md
  ```

- [ ] **T-004** Mover `decisions/` (19 ADRs) y `decisions.md`
  ```bash
  git mv .claude/context/decisions .thyrox/context/decisions
  git mv .claude/context/decisions.md .thyrox/context/decisions.md
  ```

- [ ] **T-005** Mover `errors/` (16 ERR + README)
  ```bash
  git mv .claude/context/errors .thyrox/context/errors
  ```

- [ ] **T-006** Mover `research/`
  ```bash
  git mv .claude/context/research .thyrox/context/research
  ```

- [ ] **T-007** Mover archivos raíz de estado del proyecto
  ```bash
  git mv .claude/context/technical-debt.md .thyrox/context/technical-debt.md
  git mv .claude/context/project-state.md  .thyrox/context/project-state.md
  ```

- [ ] **T-008** Mover archivos vivos (focus.md y now.md — al final para no romper scripts antes de actualizar referencias)
  ```bash
  git mv .claude/context/focus.md .thyrox/context/focus.md
  git mv .claude/context/now.md   .thyrox/context/now.md
  ```

### Grupo C — Actualizar referencias

- [ ] **T-009** Actualizar `CLAUDE.md`
  - Sección `## Estructura`: reemplazar bloque `.claude/context/` por `.thyrox/context/`
  - Configuración: `adr_path: .thyrox/context/decisions/`
  - Agregar sección `.thyrox/` con la nueva estructura

- [ ] **T-010** Actualizar `agents/task-executor.md` y `agents/task-planner.md`
  - `.claude/context/now-task-executor.md` → `.thyrox/context/now-task-executor.md`
  - `.claude/context/now-task-planner.md` → `.thyrox/context/now-task-planner.md`

- [ ] **T-011** Actualizar scripts operacionales (7 archivos) — sed bulk
  ```bash
  for f in .claude/scripts/close-wp.sh .claude/scripts/project-status.sh \
            .claude/scripts/session-resume.sh .claude/scripts/session-start.sh \
            .claude/scripts/set-session-phase.sh .claude/scripts/sync-wp-state.sh \
            .claude/scripts/update-state.sh; do
    sed -i 's|\.claude/context/|.thyrox/context/|g' "$f"
  done
  ```

- [ ] **T-012** Actualizar 8 SKILL.md — sed bulk
  ```bash
  for f in .claude/skills/thyrox/SKILL.md \
            .claude/skills/workflow-analyze/SKILL.md \
            .claude/skills/workflow-decompose/SKILL.md \
            .claude/skills/workflow-execute/SKILL.md \
            .claude/skills/workflow-plan/SKILL.md \
            .claude/skills/workflow-strategy/SKILL.md \
            .claude/skills/workflow-structure/SKILL.md \
            .claude/skills/workflow-track/SKILL.md; do
    sed -i 's|\.claude/context/|.thyrox/context/|g' "$f"
  done
  ```

- [ ] **T-013** Actualizar scripts y archivos en thyrox/ skill
  ```bash
  sed -i 's|\.claude/context/|.thyrox/context/|g' \
    .claude/skills/thyrox/scripts/migrate-metadata-keys.py \
    .claude/skills/thyrox/evals/multi-interaction-evals.json \
    .claude/skills/thyrox/scripts/run-functional-evals.sh \
    .claude/skills/thyrox/scripts/run-multi-evals.sh
  ```

- [ ] **T-014** Actualizar scripts en workflow-track/
  ```bash
  sed -i 's|\.claude/context/|.thyrox/context/|g' \
    .claude/skills/workflow-track/scripts/validate-session-close.sh \
    .claude/skills/workflow-track/scripts/validate-phase-readiness.sh \
    .claude/skills/workflow-track/scripts/tests/test-phase-readiness.sh
  ```

- [ ] **T-015** Actualizar template y reference en workflow-track/
  ```bash
  sed -i 's|\.claude/context/|.thyrox/context/|g' \
    .claude/skills/workflow-track/assets/technical-debt-resolved.md.template \
    .claude/skills/workflow-track/references/reference-validation.md
  ```

- [ ] **T-016** Actualizar template en workflow-analyze/
  ```bash
  sed -i 's|\.claude/context/|.thyrox/context/|g' \
    .claude/skills/workflow-analyze/assets/adr.md.template
  ```

### Grupo D — Validación y limpieza

- [ ] **T-017** Verificar que `.claude/context/` quedó vacío
  ```bash
  find .claude/context -type f | wc -l  # debe ser 0
  ```

- [ ] **T-018** Eliminar directorio vacío `.claude/context/`
  ```bash
  git rm -r .claude/context/
  ```

- [ ] **T-019** Ejecutar validate-session-close.sh y verificar limpio
  ```bash
  bash .claude/scripts/validate-session-close.sh
  ```

- [ ] **T-020** Verificar que scripts clave funcionan con las nuevas rutas
  ```bash
  bash .claude/scripts/session-start.sh 2>&1 | head -5
  bash .claude/scripts/project-status.sh 2>&1 | head -10
  ```

- [ ] **T-021** git commit — migración completa
  ```
  feat(migration): migrar .claude/context/ → .thyrox/context/ (FASE 35)

  Mueve todos los artefactos de sesión y work packages fuera del directorio
  de configuración de Claude Code hacia .thyrox/context/, alineando con la
  semántica oficial: .claude/ = configuración/extensiones, .thyrox/ = estado.

  Archivos movidos: 52 WPs, 19 ADRs, 16 ERRs, research/, technical-debt.md,
  project-state.md, focus.md, now.md

  Referencias actualizadas: 2 agentes, 7 scripts, 8 SKILL.md, 4 scripts/skill,
  3 templates/references, CLAUDE.md

  .claude/context/ eliminado — directorio vacío post-migración.
  ```

- [ ] **T-022** Actualizar `now.md` en nueva ubicación con estado final
  — Verificar que `current_work` apunta correctamente al WP activo

---

## Clasificación

- **Tamaño:** mediano (22+ archivos de referencias + movimiento de 52 WPs)
- **Fases activas:** ya en Phase 6 EXECUTE (plan aprobado como parte de FASE 35)
- **Riesgo principal:** referencias rotas si se hace parcialmente — hacerlo todo en un commit
- **Rollback:** `git revert` del commit de migración restaura el estado completo

---

## Notas de implementación

1. **Orden importa para Grupo B:** mover `work/` primero (T-002/T-003), luego directorios (T-004 a T-006), luego archivos raíz (T-007), luego archivos vivos (T-008). Los archivos vivos al final evitan que scripts fallen si se ejecutan durante la migración.

2. **sed bulk es seguro aquí:** el patrón `.claude/context/` no aparece en ningún contexto que no sea path. Verificar con grep antes de ejecutar en archivos críticos (SKILL.md, CLAUDE.md).

3. **`migrate-metadata-keys.py` tiene 9 referencias** — revisar manualmente después del sed para verificar que ninguna es un path de ejemplo/doc que no debe cambiar.

4. **`validate-session-close.sh` en `.claude/scripts/`** — ya soporta ambas rutas (actualizado en sesión anterior). No necesita sed.

5. **git mv preserva historial** — git detectará el rename y la historia de cada archivo se mantiene. Los WPs históricos conservarán su historial de commits.
