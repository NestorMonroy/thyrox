---
description: /workflow_track — Phase 7: TRACK. Documenta lecciones aprendidas, genera changelog, y cierra el work package activo.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 7' >> .claude/context/now.md"
updated_at: 2026-04-08
---

# /workflow_track — Phase 7: TRACK

Documenta lecciones aprendidas, genera changelog, y cierra el work package activo.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Revisar progreso: `bash .claude/skills/pm-thyrox/scripts/project-status.sh`
3. Verificar que todas las tareas están `[x]` en `*-task-plan.md`
4. Ejecutar gate soft: `bash .claude/skills/pm-thyrox/scripts/validate-phase-readiness.sh 7`

---

## Fase a ejecutar: Phase 7 TRACK

**REQUERIDO — Artefactos a crear:**

1. `[nombre-wp]-lessons-learned.md` usando `assets/lessons-learned.md.template`
   - Qué salió bien, qué salió mal, qué haría diferente
   - Patrones reutilizables identificados
   - Errores encontrados y cómo se resolvieron

2. [CHANGELOG](CHANGELOG.md) — actualizar desde los commits del WP
   - Formato Keep a Changelog
   - Agrupar por tipo: Added, Changed, Fixed, Removed

3. Actualizar `*-risk-register.md`:
   - Cerrar riesgos que no se materializaron
   - Documentar los que sí ocurrieron con su impacto real

4. Para proyectos grandes: crear `[nombre-wp]-final-report.md`
   - Resumen ejecutivo, estimado vs real, métricas

**Validaciones de cierre:**
```bash
bash .claude/skills/pm-thyrox/scripts/validate-session-close.sh
bash .claude/skills/pm-thyrox/scripts/project-status.sh
```

---

## Exit criteria

Phase 7 completa cuando:
- `*-lessons-learned.md` existe
- [CHANGELOG](CHANGELOG.md) actualizado
- `validate-session-close.sh` pasa sin errores
- No quedaron archivos temporales fuera de `context/work/`

Al terminar: actualizar `context/now.md::phase` a `complete`. La FASE cierra cuando Phase 7 TRACK completa.
