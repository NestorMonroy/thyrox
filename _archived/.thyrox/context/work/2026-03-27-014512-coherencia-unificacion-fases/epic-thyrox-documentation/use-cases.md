```yml
Fecha: 2026-03-27
Proyecto: THYROX
Versión: 1.0
Autor: Claude Code + Human
Estado: Borrador
Fase: Phase 1 - ANALYZE
Documento: Use Cases
Casos totales: 6
```

# Use Cases: THYROX

## Propósito

Documentar los casos de uso principales del framework THYROX, describiendo cómo los actores interactúan con el sistema para lograr sus objetivos.

> Objetivo: Especificar flujos de interacción concretos que validen los requisitos funcionales del framework.

---

## Actores

| Actor | Descripción | Interacción principal |
|-------|-------------|----------------------|
| **Developer** | Desarrollador que usa THYROX para gestionar su proyecto | Configura, ejecuta tareas, hace commits |
| **Claude Code** | Agente AI que sigue la metodología SKILL | Analiza, planifica, implementa, documenta |
| **PM/Architect** | Revisa planes y aprueba decisiones arquitectónicas | Valida análisis, aprueba ADRs, revisa ROADMAP |

---

## UC-001: Iniciar nuevo proyecto con THYROX

**Actor principal:** Developer

**Precondiciones:**
- Developer tiene acceso a un repositorio Git
- Template THYROX disponible (clonable o copiable)
- Claude Code instalado y configurado

**Flujo principal:**

1. Developer clona o copia el template THYROX a un nuevo directorio
2. Developer revisa la estructura generada (`CLAUDE.md`, [ROADMAP](ROADMAP.md), `.claude/`)
3. Developer actualiza `CLAUDE.md` con nombre, descripción y objetivo del nuevo proyecto
4. Developer actualiza [ROADMAP](ROADMAP.md) con las fases y milestones iniciales
5. Developer configura [project-state](.claude/context/project-state.md) con el estado inicial
6. Developer hace commit inicial: `feat(init): initialize project with THYROX template`
7. Claude Code valida que la estructura cumple con la anatomía de skill estándar

**Flujos alternativos:**
- **1a.** Si el proyecto ya tiene código existente, Developer integra THYROX sobre la estructura existente, adaptando carpetas sin sobreescribir
- **4a.** Para proyectos pequenos (<2h), Developer marca solo fases 1, 2, 6, 7 en ROADMAP.md

**Postcondiciones:**
- Repositorio con estructura THYROX completa
- `CLAUDE.md` configurado para el nuevo proyecto
- [ROADMAP](ROADMAP.md) con plan inicial
- Commit inicial registrado

**Notas:** Este caso de uso es el punto de entrada para todo proyecto nuevo. La calidad de la configuracion inicial impacta todas las fases posteriores.

**Prioridad:** Critical

---

## UC-002: Analizar un proyecto (Phase 1)

**Actor principal:** Claude Code

**Precondiciones:**
- Proyecto inicializado con THYROX (UC-001 completado)
- Developer solicita analisis o Claude Code detecta que Phase 1 no se ha completado
- Acceso a codigo fuente y documentacion existente

**Flujo principal:**

1. Claude Code lee `CLAUDE.md` y [ROADMAP](ROADMAP.md) para entender el estado actual
2. Claude Code ejecuta las 8 subsecciones de Phase 1 ANALYZE:
   - 1.1 Introduction and Goals (contexto general, vision, objetivo)
   - 1.2 Requirements Analysis (requisitos funcionales R-1 a R-8)
   - 1.3 Use Cases (casos de uso y flujos de interaccion)
   - 1.4 Quality Goals (metas de calidad priorizadas)
   - 1.5 Stakeholders (actores y sus intereses)
   - 1.6 Constraints (limitaciones tecnicas, organizacionales)
   - 1.7 Risks (riesgos identificados y mitigaciones)
   - 1.8 Context and Scope (boundaries del sistema)
3. Claude Code genera documentos en `.claude/context/epics/{epic-name}/`
4. Claude Code actualiza [ROADMAP](ROADMAP.md) marcando subsecciones completadas
5. PM/Architect revisa los documentos generados
6. Claude Code ajusta documentos segun feedback

**Flujos alternativos:**
- **2a.** Para proyectos pequenos, Claude Code ejecuta solo subsecciones 1.1, 1.2, y 1.4 (minimo viable)
- **5a.** Si PM/Architect no esta disponible, Developer revisa y aprueba
- **6a.** Si no hay feedback, Claude Code avanza a Phase 2

**Postcondiciones:**
- Documentos de analisis generados en el epic correspondiente
- [ROADMAP](ROADMAP.md) actualizado con progreso de Phase 1
- Comprension clara del problema antes de planificar

**Notas:** La fase de analisis es obligatoria. No se debe avanzar a planificacion sin completar al menos las subsecciones minimas. Los references en `references/` contienen guias detalladas para cada subseccion.

**Prioridad:** Critical

---

## UC-003: Planificar una feature (Phase 3)

**Actor principal:** Claude Code (con input de Developer)

**Precondiciones:**
- Phase 1 (ANALYZE) completada
- Phase 2 (SOLUTION_STRATEGY) completada o no requerida (proyecto pequeno)
- Feature o trabajo identificado y priorizado

**Flujo principal:**

1. Developer describe la feature a implementar
2. Claude Code revisa el contexto actual en `project-state.md` y `decisions.md`
3. Claude Code realiza brainstorm de enfoque tecnico y alternativas
4. Claude Code define scope: que incluye y que queda fuera
5. Claude Code crea epic en `.claude/context/epics/YYYY-MM-DD-feature-name/`
6. Claude Code actualiza [ROADMAP](ROADMAP.md) con los items del plan
7. PM/Architect revisa y aprueba el scope propuesto
8. Claude Code ajusta plan segun feedback

**Flujos alternativos:**
- **3a.** Si la feature es simple, Claude Code omite brainstorm y va directo a scope
- **5a.** Para proyectos pequenos, Claude Code documenta el plan solo en [ROADMAP](ROADMAP.md) sin crear epic
- **7a.** Si PM/Architect rechaza el scope, volver a paso 3 con restricciones adicionales

**Postcondiciones:**
- Epic creado con estructura de carpetas
- [ROADMAP](ROADMAP.md) actualizado con items planificados
- Scope definido y aprobado
- Listo para Phase 4 (STRUCTURE) o Phase 5 (DECOMPOSE)

**Notas:** La planificacion debe ser proporcional a la complejidad. Un fix de 30 minutos no necesita epic completo. Una feature de 2 semanas si.

**Prioridad:** High

---

## UC-004: Ejecutar una tarea (Phase 6)

**Actor principal:** Claude Code

**Precondiciones:**
- Tarea definida y descompuesta (Phase 5 completada o tarea ad-hoc identificada)
- Codigo fuente accesible
- Branch de trabajo creado (`feature/*` o `bugfix/*`)

**Flujo principal:**

1. Claude Code identifica la siguiente tarea del backlog o `AD_HOC_TASKS.md`
2. Claude Code lee los archivos relevantes al cambio
3. Claude Code implementa el cambio siguiendo los estandares del proyecto
4. Claude Code verifica que tests pasan (si aplica)
5. Claude Code hace commit atomico con Conventional Commits: `feat(scope): descripcion`
6. Claude Code actualiza [ROADMAP](ROADMAP.md) marcando la tarea como completada `[x]`
7. Claude Code registra progreso en work-log si la sesion es extensa
8. Claude Code verifica el checklist de sesion antes de continuar

**Flujos alternativos:**
- **3a.** Si el cambio requiere decision arquitectonica, Claude Code crea ADR primero (UC-006)
- **4a.** Si los tests fallan, Claude Code corrige antes de hacer commit
- **5a.** Si el cambio toca multiples conceptos, dividir en commits separados
- **7a.** Para tareas rapidas (<30 min), omitir work-log

**Postcondiciones:**
- Cambio implementado y commiteado
- Tests pasando
- [ROADMAP](ROADMAP.md) actualizado
- Branch listo para merge o PR

**Notas:** Cada commit debe representar un concepto atomico. Si un cambio toca validacion y UI, son dos commits separados. El mensaje debe explicar el "por que", no solo el "que".

**Prioridad:** Critical

---

## UC-005: Validar integridad del proyecto

**Actor principal:** Developer (o Claude Code automaticamente)

**Precondiciones:**
- Proyecto con estructura THYROX
- Scripts de validacion disponibles en `.claude/skills/pm-thyrox/scripts/`

**Flujo principal:**

1. Developer solicita validacion o Claude Code la ejecuta como parte de Phase 7
2. Claude Code ejecuta `detect-missing-md-links.sh` para encontrar links rotos en markdown
3. Claude Code ejecuta `detect_broken_references.py` para verificar referencias entre archivos
4. Claude Code analiza los resultados y categoriza problemas encontrados
5. Claude Code ejecuta scripts de conversion (`convert-*`) para corregir problemas automaticamente
6. Claude Code ejecuta scripts de validacion (`validate-*`) para confirmar que las correcciones son validas
7. Claude Code reporta resultados: problemas encontrados, corregidos, y pendientes

**Flujos alternativos:**
- **2a.** Si un script no existe, Claude Code reporta y sugiere crearlo
- **4a.** Si no hay problemas, Claude Code confirma integridad y termina
- **5a.** Si la correccion automatica no es posible, Claude Code lista los problemas para correccion manual

**Postcondiciones:**
- Informe de integridad generado
- Links y referencias corregidos donde fue posible
- Lista de issues pendientes documentada
- Proyecto en estado consistente

**Notas:** Sigue el patron detect/convert/validate con responsabilidad unica por script. Cada suite (md-links en Bash, broken-references en Python) opera independientemente.

**Prioridad:** Medium

---

## UC-006: Crear un ADR (Architectural Decision Record)

**Actor principal:** Claude Code (con aprobacion de PM/Architect)

**Precondiciones:**
- Decision arquitectonica identificada durante cualquier fase
- Alternativas evaluadas o evaluables
- Acceso a [decisions](.claude/context/decisions.md)

**Flujo principal:**

1. Claude Code identifica una decision arquitectonica que necesita documentacion
2. Claude Code crea documento `adr-NNN.md` siguiendo el formato estandar
3. Claude Code documenta: contexto, decision tomada, alternativas consideradas, consecuencias
4. Claude Code agrega entrada al indice en `decisions.md` con estado "pendiente"
5. PM/Architect revisa el ADR
6. PM/Architect aprueba o solicita cambios
7. Claude Code actualiza estado en `decisions.md` a "aprobado"
8. Claude Code hace commit: `docs(adr): add ADR-NNN description-breve`

**Flujos alternativos:**
- **1a.** Developer solicita documentar una decision ya tomada retroactivamente
- **5a.** Si PM/Architect no esta disponible, Developer aprueba
- **6a.** Si se solicitan cambios, volver a paso 3 con feedback incorporado
- **6b.** Si se rechaza, documentar como "rechazado" con razon y alternativa elegida

**Postcondiciones:**
- ADR creado y archivado en contexto
- `decisions.md` actualizado con nueva entrada
- Decision documentada con trazabilidad completa
- Commit registrado

**Notas:** Los ADRs pueden crearse en cualquier fase, pero son mas comunes en Phase 1 (analisis) y Phase 2 (arquitectura). El formato debe incluir siempre las alternativas consideradas para entender el "por que" de la decision.

**Prioridad:** High

---

## Relacion con Requisitos

| Use Case | Requisitos relacionados | Justificacion |
|----------|------------------------|---------------|
| UC-001 | R-4, R-8 | Usa templates reutilizables y sigue anatomia de skill estandar |
| UC-002 | R-1, R-2, R-3 | Ejecuta metodologia SDLC, produce documentacion por fase, persiste entre sesiones |
| UC-003 | R-1, R-2, R-7 | Sigue flujo de fases, documenta outputs, escala por complejidad |
| UC-004 | R-1, R-2, R-6 | Ejecuta dentro del flujo SDLC, documenta cambios, traza decisiones |
| UC-005 | R-5 | Usa scripts de validacion con patron detect/convert/validate |
| UC-006 | R-6, R-2 | Documenta decisiones con trazabilidad, produce artefactos por fase |

**Cobertura:** Todos los requisitos R-1 a R-8 estan cubiertos por al menos un caso de uso.

| Requisito | Cubierto por |
|-----------|-------------|
| R-1 Metodologia SDLC | UC-002, UC-003, UC-004 |
| R-2 Documentacion por fase | UC-002, UC-003, UC-004, UC-006 |
| R-3 Persistencia entre sesiones | UC-002 |
| R-4 Templates reutilizables | UC-001 |
| R-5 Scripts de validacion | UC-005 |
| R-6 Trazabilidad de decisiones | UC-004, UC-006 |
| R-7 Escalabilidad por complejidad | UC-003 |
| R-8 Anatomia de skill estandar | UC-001 |

---

## Validacion Checklist

- [x] Todos los casos de uso tienen actor principal
- [x] Precondiciones claras y verificables
- [x] Flujos principales con pasos numerados
- [x] Flujos alternativos documentados
- [x] Postcondiciones verificables
- [x] Prioridades asignadas
- [x] Todos los requisitos R-1 a R-8 cubiertos
- [x] Los 3 actores participan en al menos un caso de uso

---

## Siguiente Paso

-> Pasar a [quality-goals](quality-goals.md)
