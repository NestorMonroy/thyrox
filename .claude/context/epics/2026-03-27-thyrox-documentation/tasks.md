```yml
Fecha: 2026-03-27
Proyecto: THYROX
Tipo: Tasks (Phase 5: DECOMPOSE)
Autor: Claude Code + Human
Estado: Borrador
Tasks totales: 9
```

# Tasks: Completar documentación THYROX

## Task Order

```
TASK-001 → TASK-002 → TASK-003 (SKILL.md optimization)
TASK-004 (ARCHITECTURE.md, independiente)
TASK-005 (CONTRIBUTING.md, independiente)
TASK-006 (CHANGELOG.md, independiente)
TASK-007 → TASK-008 → TASK-009 (Validación final)
```

Tasks 004-006 pueden ejecutarse en paralelo.
Task 007-009 dependen de que 001-006 estén completadas.

---

## TASK-001: Identificar contenido a mover de SKILL.md

**Fase:** Phase 6: EXECUTE<br>
**Estimación:** 15 min<br>
**Archivos:** SKILL.md

**Qué hacer:**
- Contar líneas actuales de SKILL.md
- Identificar secciones >500 líneas que pueden moverse a references/
- Candidatos: Example Workflow, Recursos Avanzados, Escalabilidad, Sub-Agents, Tracking & Metrics

**Done cuando:**
- Lista clara de qué mover y a qué reference

---

## TASK-002: Mover contenido de SKILL.md a references/

**Fase:** Phase 6: EXECUTE<br>
**Estimación:** 30 min<br>
**Archivos:** SKILL.md, references/ (archivos nuevos o existentes)<br>
**Depende de:** TASK-001

**Qué hacer:**
- Mover secciones identificadas a references/
- Dejar resumen de 2-3 líneas + link en SKILL.md
- Verificar que SKILL.md ≤500 líneas

**Done cuando:**
- SKILL.md ≤500 líneas
- Referencias correctamente enlazadas
- Contenido movido sin pérdida

---

## TASK-003: Verificar SKILL.md post-optimización

**Fase:** Phase 6: EXECUTE<br>
**Estimación:** 10 min<br>
**Archivos:** SKILL.md<br>
**Depende de:** TASK-002

**Qué hacer:**
- Verificar que las 7 fases siguen completas (al menos resumen)
- Verificar que la tabla de comandos está intacta
- Verificar que exit conditions están completas
- Verificar que "Where Outputs Live" está intacto

**Done cuando:**
- SKILL.md funcional, lean, y completo

---

## TASK-004: Reescribir ARCHITECTURE.md

**Fase:** Phase 6: EXECUTE<br>
**Estimación:** 20 min<br>
**Archivos:** ARCHITECTURE.md

**Qué hacer:**
- Eliminar secciones aspiracionales (Node.js, PostgreSQL, Docker, CI/CD pipeline)
- Documentar arquitectura real: pm-thyrox/ con scripts/references/assets
- Documentar decisiones reales: Markdown only, git only, single skill, ANALYZE first
- Referenciar solution-strategy.md del epic

**Done cuando:**
- ARCHITECTURE.md refleja el proyecto real, no el ideal

---

## TASK-005: Reescribir CONTRIBUTING.md

**Fase:** Phase 6: EXECUTE<br>
**Estimación:** 20 min<br>
**Archivos:** CONTRIBUTING.md

**Qué hacer:**
- Eliminar prerrequisitos aspiracionales (npm, jest, prettier)
- Documentar flujo real: 7 fases SDLC, conventional commits
- Referenciar SKILL.md como guía principal
- Simplificar a lo que realmente necesita un contributor

**Done cuando:**
- CONTRIBUTING.md describe cómo contribuir realmente al proyecto

---

## TASK-006: Actualizar CHANGELOG.md

**Fase:** Phase 6: EXECUTE<br>
**Estimación:** 15 min<br>
**Archivos:** CHANGELOG.md

**Qué hacer:**
- Eliminar entries placeholder de v0.1.0
- Documentar v0.1.0 con el trabajo real de FASE 1
- Documentar v0.2.0 con todo el trabajo de esta sesión (FASE 2)
- Basarse en git log para accuracy

**Done cuando:**
- CHANGELOG.md refleja historial real del proyecto

---

## TASK-007: Ejecutar detect scripts

**Fase:** Phase 7: TRACK<br>
**Estimación:** 5 min<br>
**Archivos:** Ninguno (solo lectura)<br>
**Depende de:** TASK-001 a TASK-006

**Qué hacer:**
- Ejecutar `detect-missing-md-links.sh`
- Ejecutar `python3 detect_broken_references.py`
- Documentar hallazgos

**Done cuando:**
- Reporte de estado de integridad generado

---

## TASK-008: Ejecutar convert scripts si hay issues

**Fase:** Phase 7: TRACK<br>
**Estimación:** 10 min<br>
**Archivos:** Los que tengan issues<br>
**Depende de:** TASK-007

**Qué hacer:**
- Si detect reportó issues, ejecutar convert scripts
- Corregir manualmente lo que convert no pueda

**Done cuando:**
- Todos los issues corregidos

---

## TASK-009: Ejecutar validate scripts (pass/fail)

**Fase:** Phase 7: TRACK<br>
**Estimación:** 5 min<br>
**Archivos:** Ninguno (solo lectura)<br>
**Depende de:** TASK-008

**Qué hacer:**
- Ejecutar `validate-missing-md-links.sh` → debe retornar exit 0
- Ejecutar `python3 validate-broken-references.py` → debe retornar exit 0

**Done cuando:**
- Ambos scripts retornan exit 0
- Proyecto validado

---

## Resumen

| Task | Descripción | Estimación | Dependencia |
|------|-------------|-----------|-------------|
| 001 | Identificar contenido a mover | 15 min | - |
| 002 | Mover contenido de SKILL.md | 30 min | 001 |
| 003 | Verificar SKILL.md | 10 min | 002 |
| 004 | Reescribir ARCHITECTURE.md | 20 min | - |
| 005 | Reescribir CONTRIBUTING.md | 20 min | - |
| 006 | Actualizar CHANGELOG.md | 15 min | - |
| 007 | Ejecutar detect scripts | 5 min | 001-006 |
| 008 | Ejecutar convert scripts | 10 min | 007 |
| 009 | Ejecutar validate scripts | 5 min | 008 |

**Total estimado:** ~130 min (~2h)

---

## Siguiente Paso

→ Pasar a Phase 6: EXECUTE
