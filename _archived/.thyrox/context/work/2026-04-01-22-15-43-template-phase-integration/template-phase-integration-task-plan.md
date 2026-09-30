```yml
Fecha creación tareas: 2026-04-02-00-00-00
Proyecto: thyrox / pm-thyrox SKILL
Feature: Template Phase Integration — Formalización naming
Versión breakdown: 1.0
Total tareas: 3
Dependencias críticas: 1
Fecha inicio prevista: 2026-04-02-00-00-00
Fecha fin prevista: 2026-04-02-00-00-00
```

# Task Plan: Template Phase Integration

## Tareas

- [x] [T-001] SKILL.md sección Naming: agregar regla `{nombre-wp}-{tipo}.md` con ejemplo concreto (R-1) [P]
  - **Archivo:** [SKILL](.claude/skills/pm-thyrox/SKILL.md)
  - **Done cuando:** sección Naming contiene el patrón, los tipos válidos y un ejemplo con WP real

- [x] [T-002] SKILL.md sección Naming: agregar nota de WPs legacy (R-2) [P]
  - **Archivo:** [SKILL](.claude/skills/pm-thyrox/SKILL.md)
  - **Done cuando:** existe nota que menciona `spec.md`, `plan.md`, `lessons.md` como legacy

- [x] [T-003] Verificar SKILL.md < 500 líneas (RNF-1) — resultado: 263 líneas
  - **Comando:** `wc -l .claude/skills/pm-thyrox/SKILL.md`
  - **Done cuando:** resultado < 500
  - **Depende de:** T-001, T-002

---

## Checkpoints

**CP-1** (post T-001 + T-002):
```bash
grep -A5 "nombre-wp" .claude/skills/pm-thyrox/SKILL.md
grep "legacy\|spec\.md.*plan\.md" .claude/skills/pm-thyrox/SKILL.md
```

**CP-2** (post T-003):
```bash
wc -l .claude/skills/pm-thyrox/SKILL.md  # debe ser < 500
```
