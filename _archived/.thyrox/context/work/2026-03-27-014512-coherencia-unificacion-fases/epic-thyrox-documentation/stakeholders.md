```yml
Fecha: 2026-03-27
Proyecto: THYROX
Versión análisis: 1.0
Autor: Claude Code + Human
Estado: En progreso
```

# Stakeholders: THYROX

## Propósito

Identifica y documenta los stakeholders del proyecto THYROX. Define quiénes interactúan con el framework, qué necesitan, y cómo sus intereses se alinean o entran en conflicto.

---

## Tabla de Stakeholders

| Rol | Descripción | Objetivo/Intención |
|-----|-------------|-------------------|
| Solo Developer | Usa Claude Code para construir proyectos | Workflow claro, menos carga cognitiva, decisiones documentadas |
| Team Lead | Coordina múltiples desarrolladores usando THYROX | Metodología consistente en el equipo, progreso trackeable |
| Claude Code Agent | AI que sigue la metodología del SKILL | Instrucciones claras, references bien estructurados, scripts determinísticos |
| New Contributor | Se incorpora a un proyecto ya gestionado con THYROX | Entender el estado del proyecto rápido, saber en qué trabajar |
| Architect | Toma y revisa decisiones técnicas | ADRs documentados, decisiones de arquitectura trazables |

---

## Descripción Detallada

### Solo Developer

**Perfil:** Desarrollador individual que trabaja con Claude Code como su principal herramienta de desarrollo. Puede estar construyendo side-projects, MVPs, o manteniendo aplicaciones propias.

**Necesidades:**
- Un flujo de trabajo que no requiera memorizar pasos complejos
- Documentación que se genere como subproducto del trabajo, no como tarea extra
- Capacidad de retomar el proyecto después de días o semanas sin perder contexto
- Commits y changelog automáticos que reflejen el progreso real

**Interacción con THYROX:** Usa el framework en modo Quick (fases 1, 2, 6, 7) para tareas pequeñas y modo Standard para features más grandes. Lee CLAUDE.md al inicio de sesión y confía en ROADMAP.md para saber dónde retomar.

**Métrica de éxito:** Tiempo desde "abrir terminal" hasta "estar produciendo código útil" < 2 minutos.

---

### Team Lead

**Perfil:** Persona responsable de coordinar a varios desarrolladores (humanos o agentes AI) que trabajan en el mismo proyecto. Necesita visibilidad del progreso sin micromanagement.

**Necesidades:**
- Vista unificada del estado del proyecto (ROADMAP.md como fuente de verdad)
- Convenciones de commits que permitan generar changelogs automáticos
- Estructura de epics/tasks que permita asignar trabajo de forma clara
- Work-logs que documenten qué se hizo en cada sesión

**Interacción con THYROX:** Revisa ROADMAP.md y work-logs periódicamente. Define epics y prioridades. Usa las 7 fases completas para features significativas.

**Métrica de éxito:** Puede responder "en qué estado está el proyecto" en < 30 segundos mirando ROADMAP.md.

---

### Claude Code Agent

**Perfil:** La instancia de Claude Code que ejecuta el trabajo. Necesita instrucciones precisas y determinísticas para cada fase del proceso.

**Necesidades:**
- CLAUDE.md como punto de entrada con contexto completo del proyecto
- SKILL.md con fases definidas, entradas esperadas, y outputs requeridos
- References que proporcionen guías detalladas por fase
- Scripts ejecutables para validación y detección automática
- Assets/templates con formato predefinido para cada tipo de documento

**Interacción con THYROX:** Lee CLAUDE.md al iniciar. Consulta SKILL.md para determinar la fase actual. Carga references según necesidad. Produce artefactos en las ubicaciones correctas (context/analysis, context/epics, etc.).

**Métrica de éxito:** Produce outputs consistentes y correctamente ubicados sin necesidad de corrección manual.

---

### New Contributor

**Perfil:** Desarrollador que se une a un proyecto ya gestionado con THYROX. No conoce la historia del proyecto ni las decisiones previas.

**Necesidades:**
- README.md y docs/ que expliquen el proyecto y cómo contribuir
- ROADMAP.md que muestre el estado actual y qué falta
- Decisions.md (ADRs) que expliquen el por qué de decisiones arquitectónicas
- CONTRIBUTING.md con convenciones claras (commits, branches, testing)
- Epics con tasks descompuestas que permitan tomar una tarea y empezar

**Interacción con THYROX:** Lee documentación pública (docs/) primero. Luego revisa ROADMAP.md para contexto. Toma tasks de epics/ existentes.

**Métrica de éxito:** Puede hacer su primer commit útil en < 1 hora de incorporarse.

---

### Architect

**Perfil:** Persona (humana o AI) responsable de las decisiones técnicas de alto nivel. Revisa que la arquitectura sea coherente y sostenible.

**Necesidades:**
- ADRs (Architecture Decision Records) en context/decisions.md
- ARCHITECTURE.md actualizado con las decisiones vigentes
- Trazabilidad desde decisión hasta implementación (ADR → epic → task → commit)
- Capacidad de revisar y cuestionar decisiones previas con contexto completo

**Interacción con THYROX:** Opera principalmente en Phase 2 (SOLUTION_STRATEGY). Documenta decisiones en context/decisions.md. Revisa que la implementación (Phase 6) sea coherente con las decisiones tomadas.

**Métrica de éxito:** Cada decisión técnica significativa tiene un ADR con contexto, alternativas consideradas, y justificación.

---

## Conexión con Quality Goals

| Quality Goal | Stakeholders Beneficiados | Impacto |
|-------------|--------------------------|---------|
| **Reutilización** — El SKILL y assets se copian a cualquier proyecto | Solo Developer, Team Lead | Reduce setup time de proyectos nuevos |
| **Trazabilidad** — Cada decisión y cambio rastreado | Architect, New Contributor | Permite entender el "por qué" de cada decisión |
| **Consistencia** — Misma metodología para proyectos de cualquier tamaño | Team Lead, Claude Code Agent | Elimina ambigüedad en el proceso |
| **Documentación automática** — Generada como subproducto del trabajo | Solo Developer, New Contributor | Reduce esfuerzo de documentación manual |
| **Escalabilidad** — Quick/Standard/Full modes según tamaño | Solo Developer, Team Lead | No over-engineering para tareas pequeñas |

---

## Análisis de Conflictos

### Simplicidad vs Rigor

**Partes:** Solo Developer vs Architect

**Conflicto:** El Solo Developer quiere un flujo mínimo que no interrumpa su trabajo. El Architect quiere documentación exhaustiva de decisiones y arquitectura formal.

**Resolución en THYROX:** Los modos de operación (Quick/Standard/Full) permiten escalar la rigurosidad según el tamaño del proyecto. Un fix de 30 minutos usa solo fases 1, 2, 6, 7 sin ADRs formales. Un feature de semanas usa las 7 fases con ADRs completos.

---

### Velocidad vs Onboarding

**Partes:** Solo Developer vs New Contributor

**Conflicto:** El Solo Developer quiere avanzar rápido y no quiere documentar para otros. El New Contributor necesita documentación clara para entender el proyecto.

**Resolución en THYROX:** La documentación se genera como subproducto natural del workflow (ROADMAP.md actualizado, commits convencionales, work-logs). El Solo Developer no hace trabajo extra — la estructura del framework produce la documentación que el New Contributor necesita.

---

### Determinismo vs Flexibilidad

**Partes:** Claude Code Agent vs Team Lead

**Conflicto:** Claude Code necesita instrucciones determinísticas y paths claros. El Team Lead necesita flexibilidad para adaptar el proceso a diferentes situaciones.

**Resolución en THYROX:** El SKILL define fases con EXIT_CONDITIONS claras (determinismo), pero cada fase permite diferentes niveles de profundidad según el modo de operación (flexibilidad). Los references proporcionan guías detalladas sin ser prescriptivas.

---

## Tabla de Alineación

| Stakeholder | Fase(s) Principal(es) | Artefactos que Produce | Artefactos que Consume |
|-------------|----------------------|----------------------|----------------------|
| Solo Developer | 1, 6 | Code, commits, docs | CLAUDE.md, ROADMAP.md |
| Team Lead | 3, 5, 7 | Epics, tasks, prioridades | ROADMAP.md, work-logs, changelog |
| Claude Code Agent | 1-7 (todas) | Todos los artefactos | CLAUDE.md, SKILL.md, references |
| New Contributor | 6 | Code, commits | README.md, docs/, epics/tasks |
| Architect | 1, 2 | ADRs, ARCHITECTURE.md | decisions.md, analysis/ |

---

## Siguiente Paso

Continuar con [basic-usage.md](basic-usage.md) para documentar cómo funciona THYROX operacionalmente: flujo de trabajo, modos de operación, y resultados observables.
