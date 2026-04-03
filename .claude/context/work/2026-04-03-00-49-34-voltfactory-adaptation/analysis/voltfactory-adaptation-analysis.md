```yml
Fecha: 2026-04-03-00-49-34
WP: voltfactory-adaptation
Fase: 1 - ANALYZE
Fuente: github.com/JohnVoltTech/ClaudeTest (Volt Factory)
Estado: Completo
```

# Análisis: Adaptación Volt Factory → PM-THYROX

## Propósito

Identificar qué flujos, patrones y estructuras del framework **Volt Factory**
(JohnVoltTech/ClaudeTest) son aplicables a PM-THYROX, y qué brechas cierran.

---

## Qué es Volt Factory

Framework de desarrollo AI-driven para Microsoft Dynamics 365 Business Central.
**6 fases** completamente automatizadas, desde requisitos empresariales hasta
documentación publicada, ejecutadas por **7 agentes especializados** + sub-agentes.

### Pipeline Volt Factory

```
Research → Functional Design → Technical Design → Development → Testing → Docs
  (1)            (2)               (3)              (4)           (5)      (6)

factory/1research/   factory/2functional/   factory/3technical/
factory/4development/   factory/5unit_test/   docs/
```

---

## Hallazgos: Mapa de equivalencias

### H-001: Pipeline con carpetas numeradas por fase

**Volt Factory:** `factory/1research/`, `factory/2functional/`, `factory/3technical/`…  
**PM-THYROX actual:** `context/work/YYYY-MM-DD-HH-MM-SS-nombre/` (flat)  
**Brecha:** No hay visibilidad visual del progreso de fase dentro de un WP  
**Adaptable:** Bajo — nuestro naming ya distingue artefactos por tipo (`*-analysis.md`,
`*-task-plan.md`). La carpeta numerada es estética, no funcional para nosotros.

### H-002: Comandos slash por flujo de trabajo

**Volt Factory:** `/workflow_01_business_research`, `/workflow_02_functional_design`…
28 comandos organizados por responsabilidad.  
**PM-THYROX actual:** Sin comandos slash para fases.  
**Brecha:** Para iniciar una fase hay que invocar el SKILL y recordar qué fase seguir.  
**Adaptable:** ALTO — crear `/workflow_01_analyze`, `/workflow_02_solution`, etc.
como atajos que pre-cargan contexto de la fase correspondiente.

### H-003: Agentes especializados por fase

**Volt Factory:** `bc-al-developer`, `bc-functional-designer`, `bc-test-runner`…
Cada agente tiene responsabilidades únicas y no se solapan.  
**PM-THYROX actual:** Un único skill `pm-thyrox` cubre las 7 fases.  
**Brecha:** Contexto del skill crece en sesiones largas. Agentes especializados
mantienen contexto corto y enfocado.  
**Adaptable:** MEDIO — para proyectos grandes, agentes por fase evitan que Claude
mezcle instrucciones de fases distintas. Candidatos: `analyze-agent`, `execute-agent`.

### H-004: Sub-agentes dentro de una fase (orquestación)

**Volt Factory:** `bc-functional-designer` orquesta 11 sub-agentes en secuencia:
Business Requirements → Data Model → User Stories → UI/UX → Test Specs → Setup…  
**PM-THYROX actual:** Phase 1 ANALYZE lista 8 aspectos pero sin sub-agentes.  
**Brecha:** Análisis complejo (proyectos grandes) se hace en una sola pasada lineal.  
**Adaptable:** ALTO — para Phase 1, crear sub-análisis opcionales (ya tenemos los
templates: stakeholders, use-cases, quality-goals…). El patrón de orquestación
ya existe en nuestros sub-documentos de `analysis/`. Solo falta activarlo explícitamente.

### H-005: Documento HANDOFF entre fases

**Volt Factory:** `HANDOFF_TO_DEVELOPMENT.md` en Phase 3 → Phase 4.
Contiene: resumen de decisiones, IDs asignados, dependencias, contexto para dev.  
**PM-THYROX actual:** Sin documento de transición formal entre fases.  
**Brecha:** Al retomar trabajo en sesión nueva, el agente debe leer múltiples
artefactos para reconstruir el contexto. Un HANDOFF lo concentra.  
**Adaptable:** ALTO — agregar `{nombre-wp}-handoff.md` como artefacto opcional
en Phase 5 → Phase 6 (antes de EXECUTE). Altamente valioso para proyectos medianos/grandes.

### H-006: Test specifications en la fase de diseño

**Volt Factory:** En Phase 2 (Functional Design), se crean unit test specifications
ANTES de implementar. Los tests se diseñan con los requisitos funcionales.  
**PM-THYROX actual:** Tests se conciben en Phase 5/6 durante implementación.  
**Brecha:** Tests de aceptación no se definen junto a los criterios de aceptación.  
**Adaptable:** ALTO — agregar sección "Test Specifications" a
`requirements-specification.md.template` (Phase 4). Criterios de aceptación → test cases.

### H-007: Investigación externa en Phase 1 (business research)

**Volt Factory:** `bc-business-research` hace 20+ búsquedas web, analiza capacidades
del sistema, identifica 8-12 journeys empresariales, produce 5,000+ palabras.  
**PM-THYROX actual:** Phase 1 pregunta 8 aspectos al usuario, pero no enforcea
investigación externa ni profundidad mínima.  
**Brecha:** Para proyectos que requieren investigar tecnologías o mercados,
no hay guía de qué investigar ni checklist de completitud.  
**Adaptable:** MEDIO — agregar "Research Checklist" a Phase 1 para proyectos
donde el análisis requiere investigación externa (no solo preguntar al usuario).

### H-008: Generación de documentación como fase final

**Volt Factory:** Phase 6 dedicada a GitBook: screenshots, setup guides, docs
para consultants. Salida: `/docs/` con estructura completa.  
**PM-THYROX actual:** Phase 7 TRACK produce lessons-learned + changelog, pero
no genera documentación de usuario/producto.  
**Brecha:** No hay fase ni template para documentación de producto.  
**Adaptable:** BAJO/MEDIO — Solo relevante para proyectos que requieren docs
publicadas. `final-report.md.template` ya cubre parte de esto.

### H-009: Naming con sufijos semánticos

**Volt Factory:** Labels con sufijos: `CustomerNameLbl`, `CustomerNotFoundErr`,
`PostingCompletedMsg`, `ApiEndpointTok`, `DeleteRecordQst`.  
**PM-THYROX actual:** `{nombre-wp}-{tipo}.md` — tipo es funcional, no semántico.  
**Brecha:** Ninguna real — nuestros tipos (`analysis`, `task-plan`, etc.) ya son semánticos.  
**Adaptable:** NO — ya tenemos convención equivalente y más simple.

### H-010: Jerarquía de tracking Azure DevOps

**Volt Factory:** Epic → Feature → Story → Task (jerarquía obligatoria).  
**PM-THYROX actual:** ROADMAP.md con items y WPs. Sin jerarquía formal.  
**Brecha:** Para proyectos grandes con muchas features, ROADMAP.md se vuelve plano.  
**Adaptable:** MEDIO — `epic.md.template` ya existe. Documentar jerarquía
Epic → Feature → WP → Tarea como convención en ROADMAP para proyectos grandes.

### H-011: Enforced standards con archivos de instrucciones

**Volt Factory:** `.claude/al_guidelines/` con 11 archivos `.instructions.md`
cargados automáticamente. Estándares de code style, naming, performance, testing.  
**PM-THYROX actual:** Referencias en `references/` (carga bajo demanda).  
**Brecha:** Nuestras referencias se leen solo cuando se invoca la fase. Los
`.instructions.md` se aplican a CADA interacción automáticamente.  
**Adaptable:** ALTO — crear `.claude/guidelines/` con archivos `.instructions.md`
para convenciones críticas que deben aplicarse siempre (naming, commits, WP structure).

### H-012: settings.local.json con permisos explícitos

**Volt Factory:** `settings.local.json` con lista de comandos permitidos (allow list).  
**PM-THYROX actual:** `settings.json` solo tiene hooks SessionStart.  
**Brecha:** Sin permisos explícitos, Claude puede ejecutar comandos no deseados.  
**Adaptable:** MEDIO — agregar sección `permissions.allow` a nuestro settings.json.

---

## Resumen de adaptaciones por prioridad

### PRIORIDAD ALTA (cierran brechas reales del flujo)

| ID | Adaptación | Esfuerzo | Impacto |
|----|-----------|---------|---------|
| A-001 | Slash commands por fase (`/workflow_01_analyze`…) | Bajo | Alto |
| A-002 | Documento HANDOFF Phase 5→6 (`{nombre}-handoff.md`) | Bajo | Alto |
| A-003 | Test specs en Phase 4 (sección en requirements-spec template) | Bajo | Alto |
| A-004 | `.claude/guidelines/` con `.instructions.md` automáticos | Medio | Alto |

### PRIORIDAD MEDIA

| ID | Adaptación | Esfuerzo | Impacto |
|----|-----------|---------|---------|
| A-005 | Research checklist en Phase 1 (para análisis externos) | Bajo | Medio |
| A-006 | Jerarquía Epic→Feature→WP documentada en ROADMAP | Bajo | Medio |
| A-007 | Agentes especializados por fase (para proyectos grandes) | Alto | Medio |

### PRIORIDAD BAJA (no aplica o ya cubierto)

| ID | Adaptación | Razón |
|----|-----------|------|
| A-008 | Factory folder structure numerada | Ya cubierto con naming `{tipo}` |
| A-009 | GitBook documentation phase | Solo si se publican docs |
| A-010 | Naming con sufijos AL | Específico de Dynamics 365 |
| A-011 | Object ID allocation | Específico de BC/AL |

---

## Lo que NO se adapta (BC-specific)

- AL code guidelines (Dynamics 365)
- PowerShell scripts (bc-compile, bc-publish, etc.)
- Object ID ranges y allocación
- LinterCop rules (AL linting)
- BCContainerHelper / Docker BC
- Azure DevOps MCP
- Playwright para BC web client

---

## Conclusión

**4 adaptaciones de alto impacto y bajo esfuerzo** identificadas:

1. **Slash commands** por fase — acelera el inicio de cada fase
2. **HANDOFF document** — resuelve pérdida de contexto entre sesiones
3. **Test specs en Phase 4** — conecta criterios de aceptación con tests
4. **`.instructions.md` automáticos** — enforcea convenciones sin depender de que Claude lea referencias

Volt Factory valida que nuestra estructura de 7 fases es sólida.
Su principal aporte es en **automatización de activación** (commands, instructions)
y en **documentos de transición entre fases** (handoff).
