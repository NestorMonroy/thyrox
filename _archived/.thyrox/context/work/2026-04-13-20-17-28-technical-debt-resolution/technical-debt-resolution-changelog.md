```yml
created_at: 2026-04-14 00:00:00
wp: 2026-04-13-20-17-28-technical-debt-resolution
fase: FASE 34
phase: 7 — TRACK
```

# WP Changelog — technical-debt-resolution (FASE 34)

## Commits

| Hash | Descripción | TD |
|------|-------------|-----|
| `e2a5a47` | fix(framework): completar tabla auto-write en SKILL.md + allow references en settings.json | TD-027 |
| `92d7004` | fix(workflow): agregar re-evaluación de tamaño WP en workflow-strategy/SKILL.md | TD-028 |
| `baddfea` | fix(agents): agregar state_file en agent-spec + now-{agent-name} en task-executor y task-planner | TD-009 |
| `14571ec` | fix(scripts): detectar timestamps sin hora en validate-session-close.sh | TD-001 |
| `b34d593` | fix(templates): mapear ad-hoc-tasks a Phase 6 + mover 4 templates huérfanos a legacy/ | TD-003 |
| `b84ae02` | fix(artefactos): corregir timestamp en framework-evolution-execution-log.md | TD-018 |
| `4e71ca8` | fix(scripts): agregar alerta REGLA-LONGEV-001 en project-status.sh | TD-035 |
| `50f2865` | chore(technical-debt): marcar 7 TDs resueltos [x] en technical-debt.md | cierre |
| `9928fdb` | fix(templates): registrar eliminación de 4 templates movidos a legacy/ | corrector L-001 |

## Archivos modificados

| Archivo | TD | Cambio |
|---------|-----|--------|
| `.claude/skills/thyrox/SKILL.md` | TD-027 | +3 filas tabla Plano B (References, ADRs, Scripts operacionales edición) |
| `.claude/settings.json` | TD-027 | +`Write(/.claude/references/**)` en allow list |
| `.claude/skills/workflow-strategy/SKILL.md` | TD-028 | +sección Re-evaluación de tamaño post-estrategia con tabla |
| `.claude/references/agent-spec.md` | TD-009 | +campo `state_file` en tabla de campos |
| `.claude/agents/task-executor.md` | TD-009 | +sección Estado de sesión con instrucción now-task-executor.md |
| `.claude/agents/task-planner.md` | TD-009 | +sección Estado de sesión con instrucción now-task-planner.md |
| `.claude/scripts/validate-session-close.sh` | TD-001 | CREADO — detecta created_at sin hora |
| `.claude/scripts/stop-hook-git-check.sh` | TD-001 | +llamada a validate-session-close.sh |
| `.claude/skills/workflow-execute/SKILL.md` | TD-003 | +referencia a ad-hoc-tasks.md.template en paso 7 |
| `workflow-track/assets/legacy/analysis-phase.md.template` | TD-003 | MOVIDO desde assets/ |
| `workflow-decompose/assets/legacy/categorization-plan.md.template` | TD-003 | MOVIDO desde assets/ |
| `workflow-structure/assets/legacy/document.md.template` | TD-003 | MOVIDO desde assets/ |
| `workflow-analyze/assets/legacy/project.json.template` | TD-003 | MOVIDO desde assets/ |
| `context/work/.../framework-evolution-execution-log.md` | TD-018 | created_at: `2026-04-08` → `2026-04-08 17:04:20` |
| `.claude/scripts/project-status.sh` | TD-035 | +bloque REGLA-LONGEV-001 (wc -c para 4 archivos vivos) |
| `.claude/context/technical-debt.md` | cierre | 7 TDs marcados `[x]` |
