```yml
Fecha creación: 2026-03-27
Fecha última actualización: 2026-03-27
Proyecto: THYROX
Versión requisitos: 1.0
Responsable análisis: Claude Code + Human
Estado: Borrador
Requisitos totales: 8
```

# Requirements Analysis: THYROX

## Propósito

Documentar QUÉ debe hacer THYROX como framework de gestión de proyectos.

> Objetivo: Especificar de forma clara y verificable qué funcionalidades debe proporcionar el template.

---

## Requisitos Generales (Level 1)

| ID  | Requirement | Explanation |
|-----|-------------|-------------|
| R-1 | Metodología SDLC | Proporcionar flujo de 7 fases con entradas/salidas claras por fase |
| R-2 | Documentación por fase | Cada fase produce artefactos documentados en ubicaciones definidas |
| R-3 | Persistencia entre sesiones | Contexto del proyecto se mantiene entre sesiones de Claude Code |
| R-4 | Templates reutilizables | Assets listos para copiar y llenar por cada tipo de documento |
| R-5 | Scripts de validación | Herramientas para detectar, convertir y validar integridad del proyecto |
| R-6 | Trazabilidad de decisiones | ADRs documentan el por qué de cada decisión arquitectónica |
| R-7 | Escalabilidad por complejidad | Proyectos pequeños usan fases mínimas, grandes usan las 7 |
| R-8 | Anatomía de skill estándar | Seguir la estructura oficial de Anthropic (SKILL.md + scripts/ + references/ + assets/) |

---

## Requisitos Específicos (Level 2)

### Para R-1: Metodología SDLC

- **7 fases definidas**
  ANALYZE → SOLUTION_STRATEGY → PLAN → STRUCTURE → DECOMPOSE → EXECUTE → TRACK

- **Orden canónico consistente**
  El mismo orden en SKILL.md, CLAUDE.md, README.md, project-state.md y todos los references

- **Exit conditions por fase**
  Cada fase tiene criterios claros para saber cuándo avanzar a la siguiente

- **Transitions documentadas**
  Cada reference indica a qué fase se sale y de cuál se entra

### Para R-2: Documentación por fase

- **Tabla de outputs**
  SKILL.md documenta qué produce cada fase y dónde se guarda

- **Ubicaciones definidas**
  analysis/ para diagnósticos, epics/ para planes, work-logs/ para bitácora, decisions/ para ADRs

- **Naming conventions**
  Epics: YYYY-MM-DD-nombre/, work-logs: YYYY-MM-DD-HH-MM-desc.md, ADRs: adr-NNN.md

### Para R-3: Persistencia entre sesiones

- **CLAUDE.md como puente**
  Contiene metodología, estructura de carpetas, checklist de sesión, y links al SKILL

- **project-state.md**
  Estado actual del proyecto, fase en curso, métricas

- **ROADMAP.md como fuente de verdad**
  Estado de progreso con convenciones [ ] [-] [x]

### Para R-4: Templates reutilizables

- **1 template por tipo de documento**
  introduction, requirements-analysis, quality-goals, stakeholders, etc.

- **Templates de tracking**
  AD_HOC_TASKS, REFACTORS, epic, EXIT_CONDITIONS, project.json

- **Templates de commits**
  feature, bugfix, refactor, documentation, task-completion, multiple-files

### Para R-5: Scripts de validación

- **Patrón detect/convert/validate**
  Cada herramienta tiene 3 scripts con responsabilidad única

- **md-links suite (Bash)**
  detect-missing-md-links.sh, convert-missing-md-links.sh, validate-missing-md-links.sh

- **broken-references suite (Python)**
  detect_broken_references.py, convert-broken-references.py, validate-broken-references.py

### Para R-6: Trazabilidad de decisiones

- **ADR format**
  Cada decisión tiene context, decisión, consecuencias, alternativas

- **Índice en decisions.md**
  Lista todas las ADRs con estado (aprobado/pendiente)

- **Decisiones en cualquier fase**
  Los ADRs pueden crearse en Phase 1 (análisis) o Phase 2 (arquitectura)

### Para R-7: Escalabilidad por complejidad

- **Proyectos pequeños (<2h)**
  Solo work-log + documento simple. Fases 1, 2, 6, 7

- **Proyectos medianos (2-8h)**
  Work-logs + epics/ con estructura. Todas las fases

- **Proyectos grandes (8h+)**
  Full structure con EXIT_CONDITIONS, project.json, sub-agents

### Para R-8: Anatomía de skill estándar

- **SKILL.md < 500 líneas (ideal)**
  Contenido esencial + navegación a references

- **references/ para documentación**
  Cargada en contexto cuando Claude la necesita

- **scripts/ para código ejecutable**
  Token efficient, deterministic, ejecutable sin cargar en contexto

- **assets/ para output**
  Templates que se copian, no se cargan en contexto

---

## Matriz de Trazabilidad

| Requisito | Stakeholder | Priority | Status | Quality Goal |
|-----------|-------------|----------|--------|-------------|
| R-1 | Developer, PM | Critical | Implementado | Correctness |
| R-2 | Developer | High | Implementado | Traceability |
| R-3 | Developer | Critical | Implementado | Persistence |
| R-4 | Developer | High | Implementado | Reusability |
| R-5 | Developer, CI/CD | Medium | Implementado | Reliability |
| R-6 | Architect, PM | High | Implementado | Traceability |
| R-7 | Developer | Medium | Implementado | Flexibility |
| R-8 | Developer | High | Implementado | Standards |

---

## Validación Checklist

- [x] Todos los requisitos tienen ID único
- [x] Nombres breves y claros
- [x] Explicaciones concisas
- [x] Dos niveles de detalle
- [x] Cada requisito es verificable
- [x] Orientado al negocio/usuario
- [x] Conectado a Stakeholders (siguiente documento)
- [x] Conectado a Quality Goals (siguiente documento)

---

## Siguiente Paso

→ Pasar a [use-cases](use-cases.md)
