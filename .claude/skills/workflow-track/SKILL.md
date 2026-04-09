---
name: workflow-track
description: Phase 7 TRACK — documenta lecciones aprendidas, genera changelog y cierra el work package activo.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 7' >> .claude/context/now.md"
updated_at: 2026-04-09 00:00:00
---

# /workflow-track — Phase 7: TRACK

Documenta lecciones aprendidas, genera changelog, y cierra el work package activo.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Revisar progreso: `bash .claude/scripts/project-status.sh`
3. Verificar que todas las tareas están `[x]` en `*-task-plan.md`
4. Leer `context/now.md` — verificar `phase`
5. Gate soft: `bash .claude/skills/workflow-track/scripts/validate-phase-readiness.sh 7`

---

## Fase a ejecutar: Phase 7 TRACK

Documentar lecciones previene repetir los mismos errores.

**En ejecución paralela:** Phase 7 es single-agent por diseño. El coordinador consolida lecciones de todos los WPs, actualiza ROADMAP y CHANGELOG como único escritor, y cierra los `now-{agent-id}.md` de todos los agentes.

**REQUERIDO — Artefactos a crear:**

1. REQUERIDO: `work/../{nombre-wp}-lessons-learned.md` usando `assets/lessons-learned.md.template`
   - Nombre descriptivo: `skill-activation-lessons-learned.md`, no `lessons-learned.md`
   - Qué salió bien, qué salió mal, qué haría diferente
   - Patrones reutilizables identificados
   - Errores encontrados y cómo se resolvieron

2. REQUERIDO: Generar `CHANGELOG.md` desde commits usando `assets/changelog.md.template`
   - Formato Keep a Changelog
   - Agrupar por tipo: Added, Changed, Fixed, Removed

3. Actualizar `work/../{nombre-wp}-risk-register.md`:
   - Cerrar riesgos que no se materializaron
   - Documentar los que sí ocurrieron con su impacto real

4. Para proyectos grandes o con métricas relevantes: crear `{nombre-wp}-final-report.md` usando `assets/final-report.md.template`

5. Para deuda técnica identificada: usar `assets/refactors.md.template`

**Validaciones de cierre:**
```bash
bash .claude/skills/workflow-track/scripts/validate-session-close.sh
bash .claude/scripts/project-status.sh
```

**REQUERIDO al cerrar WP — actualizar archivos de estado:**

| Archivo | Contenido mínimo requerido |
|---------|---------------------------|
| `context/now.md` | `current_work: null` · `phase: null` · `updated_at: timestamp` |
| `context/focus.md` | `## Completado`: FASE N + WP + qué se logró. `## Sin WP activo`: versión actual + próximo en ROADMAP |
| `context/project-state.md` | Ejecutar `bash .claude/scripts/update-state.sh` |

Ver `../../references/state-management.md` para tabla de triggers completa.

---

## Exit criteria

Phase 7 completa cuando:
- `{nombre-wp}-lessons-learned.md` existe
- `CHANGELOG.md` actualizado
- `{nombre-wp}-risk-register.md` actualizado
- `validate-session-close.sh` pasa sin errores
- Archivos de estado actualizados: `now.md`, `focus.md`, `project-state.md`
- No quedaron archivos temporales fuera de `context/work/`

**La FASE cierra cuando Phase 7 TRACK completa** — `now.md::phase` → `null`, `now.md::current_work` → `null`.
Una nueva FASE empieza cuando se crea un nuevo WP (nuevo directorio en `context/work/`).
