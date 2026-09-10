```yml
Fecha: 2026-03-27
Proyecto: THYROX
Versión flujo: 1.0
Autor: Claude Code + Human
Estado: Borrador
```

# Basic Usage: THYROX

## Propósito

Documentar CÓMO funciona THYROX operacionalmente desde la perspectiva del usuario.

> Objetivo: Que cualquier developer entienda cómo es una sesión típica de trabajo con THYROX.

---

## Descripción Narrativa

THYROX es un framework que se activa al iniciar Claude Code dentro de un proyecto configurado. Claude Code lee CLAUDE.md para entender el contexto, consulta SKILL.md para saber qué metodología seguir, y usa references/ cuando necesita profundizar en algún tema.

El developer interactúa con Claude Code en lenguaje natural. Describe qué quiere hacer y Claude Code identifica en qué fase del SDLC se encuentra, consulta la referencia apropiada, y produce artefactos que se guardan en ubicaciones definidas (context/analysis/, context/epics/, context/work-logs/, etc.).

Todo el trabajo se versiona con git usando Conventional Commits. ROADMAP.md refleja el progreso. Los ADRs documentan las decisiones. Los scripts validan la integridad.

---

## Flujo Principal de Operación

1. **Developer abre terminal y ejecuta `claude`**
   Claude Code se inicia en el directorio del proyecto

2. **Claude Code lee CLAUDE.md**
   Entiende: qué es el proyecto, su estructura, convenciones, y link al SKILL

3. **Developer describe qué quiere hacer**
   "Quiero analizar este proyecto", "planifica feature X", "qué sigue?"

4. **Claude Code identifica la fase actual**
   Consulta ROADMAP.md y project-state.md para saber dónde estamos

5. **Claude Code consulta SKILL.md**
   Identifica qué fase aplica y qué proceso seguir

6. **Claude Code carga references según necesidad**
   Solo lee los archivos de referencia relevantes para la fase actual

7. **Trabajo se produce**
   Código, documentación, análisis, planes — según la fase

8. **Artefactos se guardan en ubicaciones definidas**
   analysis/ para diagnósticos, epics/ para planes, work-logs/ para bitácora

9. **Commits con Conventional Commits**
   `feat(scope):`, `fix(scope):`, `docs(scope):`, etc.

10. **ROADMAP.md se actualiza**
    `[ ]` → `[-]` → `[x]` con fecha de completado

---

## Modos de Operación

### Modo Quick (< 30 minutos)

**Descripción:**
Para fixes rápidos, tareas ad-hoc, pequeñas mejoras.

**Cuándo usar:**
Cuando el scope es claro y no necesita planificación formal.

**Fases activas:** 1 (ANALYZE) → 2 (SOLUTION_STRATEGY) → 6 (EXECUTE) → 7 (TRACK)

**Estructura:**
```
Solo work-log + commits
```

### Modo Standard (2-8 horas)

**Descripción:**
Para features medianas que necesitan planificación y descomposición.

**Cuándo usar:**
Cuando hay múltiples tasks, dependencias, o decisiones arquitectónicas.

**Fases activas:** Las 7 fases completas

**Estructura:**
```
context/epics/YYYY-MM-DD-nombre/
  epic.md + specs/ + tasks.md
context/work-logs/
  YYYY-MM-DD-HH-MM-desc.md (por sesión)
```

### Modo Full (8+ horas)

**Descripción:**
Para proyectos complejos multi-sesión con múltiples stakeholders.

**Cuándo usar:**
Cuando hay riesgo de regresiones, necesidad de validación formal, o múltiples aprobaciones.

**Fases activas:** Las 7 con rigor completo

**Estructura:**
```
context/epics/YYYY-MM-DD-nombre/
  epic.md + specs/ + tasks.md
  EXIT_CONDITIONS.md + project.json
context/work-logs/
  Múltiples work-logs granulares
context/decisions/
  ADRs que surjan durante el proceso
```

---

## Diagrama de Flujo

```
Developer → `claude` → CLAUDE.md
                           ↓
                       SKILL.md (identifica fase)
                           ↓
                ┌──────────┼──────────┐
                ↓          ↓          ↓
          references/   scripts/   assets/
          (lee guías)   (ejecuta)  (copia templates)
                ↓          ↓          ↓
                └──────────┼──────────┘
                           ↓
                    context/ (guarda artefactos)
                    ├── analysis/
                    ├── epics/
                    ├── work-logs/
                    └── decisions/
                           ↓
                    git commit + ROADMAP.md update
```

---

## Resultados Observables

El usuario observa:
- Documentos de análisis creados en context/analysis/
- Epics con plans, specs y tasks en context/epics/
- Work-logs documentando cada sesión
- ADRs en context/decisions/
- ROADMAP.md actualizado con progreso [ ] → [x]
- Commits convencionales en el historial de git
- CHANGELOG.md generado desde commits

---

## Validación Checklist

- [x] Descripción narrativa clara
- [x] Pasos numerados y secuenciales
- [x] Cada paso es observable
- [x] Flujo completo documentado
- [x] Modos de operación descritos
- [x] Resultados observables documentados
- [x] Lenguaje simple (no técnico)

---

## Siguiente Paso

→ Pasar a [constraints](constraints.md)
