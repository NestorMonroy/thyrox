```yml
type: Analysis Sub-document
work_package: 2026-04-09-03-17-55-skill-references-restructure
created_at: 2026-04-09 03:45:00
updated_at: 2026-04-09 03:45:00
purpose: Clasificar cada script por nivel arquitectónico y determinar si pm-thyrox/scripts/ puede eliminarse
```

# Clasificación de Scripts — pm-thyrox/scripts/

---

## Inventario completo (20 items)

### Acoplamiento externo (hard constraints)

| Script | Referenciado en | Tipo de acoplamiento |
|--------|----------------|---------------------|
| `session-start.sh` | `settings.json` línea 8 | **Hard** — path literal en hook SessionStart |
| `session-resume.sh` | `settings.json` línea 28 | **Hard** — path literal en hook PostCompact |
| `stop-hook-git-check.sh` | `settings.json` línea 18 | **Hard** — path literal en hook Stop |
| `commit-msg-hook.sh` | (git hook del repo, no settings.json) | **Medio** — no verificado ref externa |
| `project-status.sh` | `workflow-track/SKILL.md` líneas 22, 58 | **Medio** — path completo en instrucción |
| `validate-phase-readiness.sh` | `workflow-track/SKILL.md` línea 25; `tests/test-phase-readiness.sh` | **Medio** — path completo + test lo llama |
| `validate-session-close.sh` | `workflow-track/SKILL.md` línea 57; `state-management.md` línea 17 | **Medio** — 2 referencias externas |
| `update-state.sh` | `workflow-track/SKILL.md` línea 67; `state-management.md` líneas 28-30, 69, 78-81 | **Medio** — 5 referencias (2 docs diferentes) |
| `detect_broken_references.py` | `reference-validation.md` (5 refs) | **Medio** — doc que describe su uso |
| `lint-agents.py` | `agent-spec.md` líneas 132, 138, 141 | **Medio** — 3 paths literales en doc |
| `migrate-metadata-keys.py` | `conventions.md` línea 201 | **Bajo** — referencia documental |
| `validate-phase-readiness.sh` | `error-report.md.template` (ejemplo) | **Bajo** — solo como ejemplo |

Scripts sin referencias externas encontradas: `convert-broken-references.py`,
`validate-broken-references.py`, `validate-missing-md-links.sh`, `detect-missing-md-links.sh`,
`convert-missing-md-links.sh`, `run-functional-evals.sh`, `run-multi-evals.sh`,
`verify-skill-mapping.sh`.

---

## Clasificación por naturaleza y destino propuesto

### Grupo 1 — Infraestructura de proyecto → candidatos a `.claude/scripts/`

**Naturaleza**: hooks que ejecuta Claude Code al iniciar/cerrar sesión. Pertenecen
conceptualmente al proyecto (`.claude/settings.json` los invoca), no a pm-thyrox.
Paralelo exacto con referencias: así como `skill-vs-agent.md` no es de pm-thyrox sino
de la plataforma, los hooks de sesión no son de pm-thyrox sino del proyecto.

| Script | Hook event | Si se mueve: actualizar |
|--------|-----------|------------------------|
| `session-start.sh` | SessionStart | `settings.json` línea 8 |
| `session-resume.sh` | PostCompact | `settings.json` línea 28 |
| `stop-hook-git-check.sh` | Stop | `settings.json` línea 18 |
| `commit-msg-hook.sh` | git commit-msg | git hooks config |

**Destino propuesto**: `.claude/scripts/` (nuevo nivel global, paralelo a `.claude/references/`).
**Alternativa**: quedan en pm-thyrox/scripts/ — settings.json no cambia, menor riesgo.

**Decisión pendiente** — ver sección GAP al final.

---

### Grupo 2 — Scripts de Phase 7 → `workflow-track/scripts/`

**Naturaleza**: scripts invocados exclusivamente durante la ejecución de Phase 7 (TRACK).
`workflow-track/SKILL.md` los referencia directamente con paths completos.
Si se mueven, solo hay que actualizar ese SKILL.md.

| Script | Función | Referencias externas |
|--------|---------|---------------------|
| `project-status.sh` | Muestra estado del proyecto | workflow-track/SKILL.md ×2 |
| `validate-phase-readiness.sh` | Gate soft Phase 7 | workflow-track/SKILL.md ×1; test interno |
| `validate-session-close.sh` | Valida cierre correcto de sesión | workflow-track/SKILL.md ×1; state-management.md ×1 |

Nota: `state-management.md` también referencia `validate-session-close.sh`, pero
ese doc se mueve a `.claude/references/` — la referencia allí también se actualizaría.

---

### Grupo 3 — Estado del proyecto → ambiguo (workflow-track O `.claude/scripts/`)

| Script | Análisis |
|--------|---------|
| `update-state.sh` | Invocado en workflow-track/SKILL.md (Phase 7) Y en state-management.md para cualquier cambio de agente/versión (cross-phase). No es exclusivo de Phase 7. |

**Opciones:**
- **C1**: `workflow-track/scripts/` — sigue al grupo de Phase 7; los 2 docs que lo mencionan
  actualizan su path.
- **C2**: `.claude/scripts/` — es una herramienta de mantenimiento del proyecto, como los hooks.

---

### Grupo 4 — Validación de referencias → `workflow-track/scripts/`

**Naturaleza**: herramientas de salud del proyecto. `detect_broken_references.py` está
explícitamente documentado en `reference-validation.md` (que migra a `workflow-track/references/`).
Los demás scripts del grupo son sus compañeros funcionales.

| Script | Grupo funcional |
|--------|----------------|
| `detect_broken_references.py` | Detecta referencias rotas (documentado en reference-validation.md) |
| `validate-broken-references.py` | Valida referencias |
| `convert-broken-references.py` | Convierte/repara referencias |
| `validate-missing-md-links.sh` | Valida links Markdown faltantes |
| `detect-missing-md-links.sh` | Detecta links faltantes |
| `convert-missing-md-links.sh` | Convierte links faltantes |

Estos 6 son un toolkit cohesivo. `reference-validation.md` migra a `workflow-track/references/`,
por lo que tiene sentido que los scripts que documenta migren a `workflow-track/scripts/`.

---

### Grupo 5 — Agent tooling → `.claude/scripts/`

| Script | Análisis |
|--------|---------|
| `lint-agents.py` | Valida formato de agentes en `.claude/agents/`. `agent-spec.md` lo documenta con path completo (agent-spec.md migra a `.claude/references/`). Lógicamente co-ubicado con los agentes que valida. |

**Destino propuesto**: `.claude/scripts/lint-agents.py`
Si se mueve: actualizar 3 paths literales en `agent-spec.md`.

---

### Grupo 6 — Framework evals → quedan en `pm-thyrox/scripts/`

| Script | Razón para quedarse |
|--------|-------------------|
| `run-functional-evals.sh` | Sin referencias externas. Son evals del framework pm-thyrox específicamente. No hay motivo claro de moverlos. |
| `run-multi-evals.sh` | Ídem. |

---

### Grupo 7 — Legacy → quedan en `pm-thyrox/scripts/` (archivar)

| Script | Estado | Refs |
|--------|--------|------|
| `migrate-metadata-keys.py` | Migración one-off ya ejecutada | `conventions.md` menciona el KEY_MAP |
| `verify-skill-mapping.sh` | Validación de estructura de skills | Solo en tests internos |

No se eliminan — tienen valor histórico y tests asociados. Se archivan en pm-thyrox/scripts/.

---

### Grupo 8 — Tests → siguen a sus scripts

| Test | Script que testea | Destino si el script se mueve |
|------|-----------------|------------------------------|
| `tests/test-phase-readiness.sh` | `validate-phase-readiness.sh` | `workflow-track/scripts/tests/` |
| `tests/test-skill-mapping.sh` | `verify-skill-mapping.sh` | queda en pm-thyrox (legacy) |
| `tests/run-all-tests.sh` | runner general | revisar qué llama — actualizar paths |

---

## GAP de decisión — Crear `.claude/scripts/` como nivel global

Los grupos 1 (hooks) y 5 (lint-agents.py) son candidatos a un nivel `.claude/scripts/`.

**¿Tiene sentido crear `.claude/scripts/`?**

| Argumento | A favor | En contra |
|-----------|---------|----------|
| Coherencia con `.claude/references/` | Si existe nivel global para docs, tiene sentido para scripts | `.claude/scripts/` no es un concepto en los docs oficiales de Claude Code |
| Propiedad conceptual | Los hooks son del proyecto, no de pm-thyrox | settings.json ya tiene paths concretos — cambiar solo agrega trabajo |
| lint-agents.py | Valida `.claude/agents/` (nivel proyecto) | Funciona igual donde esté |

**Alternativa**: mantener hooks en pm-thyrox/scripts/ con documentación que aclare que
son infraestructura del proyecto, no del framework. Bajo riesgo, cero cambios en settings.json.

---

## Trazabilidad completa — 20 scripts con destino propuesto

| # | Script | Destino propuesto | Si se mueve: actualizar |
|---|--------|------------------|------------------------|
| 1 | `session-start.sh` | `.claude/scripts/` ó `pm-thyrox/scripts/` | settings.json |
| 2 | `session-resume.sh` | `.claude/scripts/` ó `pm-thyrox/scripts/` | settings.json |
| 3 | `stop-hook-git-check.sh` | `.claude/scripts/` ó `pm-thyrox/scripts/` | settings.json |
| 4 | `commit-msg-hook.sh` | `.claude/scripts/` ó `pm-thyrox/scripts/` | git hooks config |
| 5 | `project-status.sh` | `workflow-track/scripts/` | workflow-track/SKILL.md ×2 |
| 6 | `validate-phase-readiness.sh` | `workflow-track/scripts/` | workflow-track/SKILL.md ×1; test path |
| 7 | `validate-session-close.sh` | `workflow-track/scripts/` | workflow-track/SKILL.md ×1; state-management.md ×1 |
| 8 | `update-state.sh` | `workflow-track/scripts/` ó `.claude/scripts/` | workflow-track/SKILL.md ×1; state-management.md ×3 |
| 9 | `detect_broken_references.py` | `workflow-track/scripts/` | reference-validation.md ×5 |
| 10 | `validate-broken-references.py` | `workflow-track/scripts/` | sin refs externas |
| 11 | `convert-broken-references.py` | `workflow-track/scripts/` | sin refs externas |
| 12 | `validate-missing-md-links.sh` | `workflow-track/scripts/` | sin refs externas |
| 13 | `detect-missing-md-links.sh` | `workflow-track/scripts/` | interno (validate-missing) |
| 14 | `convert-missing-md-links.sh` | `workflow-track/scripts/` | interno (validate-missing) |
| 15 | `lint-agents.py` | `.claude/scripts/` ó `pm-thyrox/scripts/` | agent-spec.md ×3 |
| 16 | `run-functional-evals.sh` | `pm-thyrox/scripts/` (queda) | sin refs externas |
| 17 | `run-multi-evals.sh` | `pm-thyrox/scripts/` (queda) | sin refs externas |
| 18 | `migrate-metadata-keys.py` | `pm-thyrox/scripts/` (archivar) | conventions.md ×1 |
| 19 | `verify-skill-mapping.sh` | `pm-thyrox/scripts/` (archivar) | tests/test-skill-mapping.sh |
| 20 | `tests/` | dividir: track → workflow-track; legacy → pm-thyrox | paths internos de los tests |

---

## Conclusión: ¿se elimina pm-thyrox/scripts/?

**No se elimina.** Siempre quedan al menos:
- `run-functional-evals.sh` y `run-multi-evals.sh` (evals del framework)
- `migrate-metadata-keys.py` y `verify-skill-mapping.sh` (legacy + tests)
- `tests/test-skill-mapping.sh` y `tests/run-all-tests.sh` (parcial)

Si los hooks se quedan (alternativa conservadora), también quedan los 4 del Grupo 1.

**Estado final de pm-thyrox/scripts/ según decisiones:**

| Escenario | Contenido que queda en pm-thyrox/scripts/ |
|-----------|------------------------------------------|
| Conservador (hooks no se mueven) | Grupos 1 + 6 + 7 + tests parciales (8 scripts + tests) |
| Moderado (hooks a .claude/scripts/, todo lo demás según clasificación) | Grupos 6 + 7 + tests parciales (4 scripts + tests) |

En ambos escenarios **pm-thyrox/scripts/ existe y tiene contenido**.

---

## Preguntas pendientes de decisión

1. **¿Crear `.claude/scripts/` como nivel global?** → afecta hooks (Grupo 1) y lint-agents.py (Grupo 5)
2. **¿`update-state.sh` a workflow-track o a .claude/scripts/?** → cross-phase vs Phase 7
