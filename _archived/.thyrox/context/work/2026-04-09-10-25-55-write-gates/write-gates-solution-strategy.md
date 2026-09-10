```yml
type: Solution Strategy
work_package: 2026-04-09-10-25-55-write-gates
fase: FASE 26
created_at: 2026-04-09 11:10:00
```

# Solution Strategy — FASE 26: write-gates

## Problema resuelto

Phase 7 generaba 7 prompts de aprobación después del gate Phase 6→7.
La causa: `settings.json` sin configuración de permisos + `defaultMode` ausente.

## Escalabilidad

Tamaño: **pequeño** (30 min – 2h). Phases activas: 1, 2, 6, 7. Se omiten 3, 4, 5.

---

## Decisiones de diseño (fijadas en Phase 1)

| Decisión | Elección | Justificación |
|----------|---------|---------------|
| D-01: Modo base | `defaultMode: acceptEdits` | Auto-acepta Edit/Write — elimina prompts de archivos de artefactos |
| D-02: git push | `allow` (automático) | Gate Phase 6→7 es la aprobación — push es consecuencia, no nueva decisión |
| D-03: SKILL.md / CLAUDE.md | `ask` rules | Hard prompt sin bloquear uso legítimo — escala con wildcard `*` |
| D-04: Scripts del framework | `ask` rules | `.claude/scripts/*.sh` — misma categoría que SKILL.md |
| D-05: Scripts de validación | `allow` via wildcard | `bash .claude/scripts/*` y `bash .claude/skills/*/scripts/*` — determinísticos y read-safe |
| D-06: git push --force | `deny` permanente | Nunca justificado en flujo normal — destructivo sobre el remoto |
| D-07: Documentación | Sección en pm-thyrox/SKILL.md | Los dos planos (metodológico vs sistema) deben estar documentados |

---

## Arquitectura de la solución

Dos cambios independientes, en dos archivos:

### Cambio 1 — `.claude/settings.json`

Agregar `defaultMode` + `permissions` al JSON existente (que solo tiene `hooks`):

```json
{
  "defaultMode": "acceptEdits",
  "permissions": {
    "allow": [
      "Bash(bash .claude/scripts/*)",
      "Bash(bash .claude/skills/*/scripts/*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git commit -m *)",
      "Bash(git push *)",
      "Bash(git push -u *)",
      "Bash(git status)",
      "Bash(git log *)",
      "Bash(git diff *)",
      "Bash(git fetch *)",
      "Bash(git branch *)",
      "Bash(date *)",
      "Bash(mkdir *)",
      "Bash(ls *)",
      "Bash(echo *)"
    ],
    "ask": [
      "Edit(/.claude/CLAUDE.md)",
      "Edit(/.claude/skills/*/SKILL.md)",
      "Edit(/.claude/scripts/*.sh)",
      "Edit(/.claude/settings.json)"
    ],
    "deny": [
      "Bash(git push --force *)",
      "Bash(git push --force-with-lease *)",
      "Bash(git reset --hard *)",
      "Bash(rm -rf *)"
    ]
  },
  "hooks": { ... }
}
```

**Orden de evaluación por la documentación oficial: deny → ask → allow**
- `git push --force` → deny gana sobre `Bash(git push *)` en allow
- `Edit(/.claude/CLAUDE.md)` → ask overridea `acceptEdits`
- `bash .claude/scripts/update-state.sh` → allow (wildcard match)

### Cambio 2 — `.claude/skills/pm-thyrox/SKILL.md`

Agregar sección `## Modelo de permisos` que documente:
- Los dos planos: gates metodológicos vs permisos de herramienta
- La tabla de comportamiento por categoría de archivo
- Por qué los gates de fase son suficientes para las operaciones rutinarias

---

## Lo que NO cambia

- Los gates de Phase (1→2, 5→6, 6→7) — correctos e intencionales, son de Plano A
- El GATE OPERACIÓN en `workflow-execute/SKILL.md` — complementario al `deny` del sistema
- La estructura de WPs, artefactos, convenciones de commits
- Los hooks (SessionStart, Stop, PostCompact)

---

## Riesgos residuales aceptados

| Riesgo | Mitigación residual |
|--------|---------------------|
| `Bash(git push *)` permite `git push origin main` sin prompt | Aceptado — el gate Phase 6→7 fue la decisión. Si hubo un error, `git revert` lo deshace. |
| `Bash(bash .claude/scripts/*)` permite scripts nuevos sin prompt | Aceptado — los scripts requieren commit para existir. Un script malicioso requería primero un commit aprobado. |
| `ask` en SKILL.md puede bypasearse si Claude ignora el prompt | Imposible — `ask` es enforcement de sistema, no instrucción de texto. |
