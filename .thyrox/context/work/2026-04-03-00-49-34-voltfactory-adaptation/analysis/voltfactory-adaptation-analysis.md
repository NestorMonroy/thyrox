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
**Adaptable:** ALTO — crear `/workflow_analyze`, `/workflow_solution`, etc.
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
| A-001 | Slash commands por fase (`/workflow_analyze`…) | Bajo | Alto |
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

## Hallazgos Profundizados — Lectura de archivos reales

### H-013: Agent frontmatter como contrato de capacidades

**Volt Factory:** Cada agente tiene YAML frontmatter nativo de Claude Code:
```yaml
---
name: bc-al-developer
description: Use this agent when... <example>...</example>
tools: Bash, Glob, Read, Edit, mcp__objid__allocate_id, ...  ← lista explícita
model: sonnet
color: cyan
---
```
Y dentro del agente: secciones **CAN / CANNOT** que definen límites exactos:
- CAN: Leer specs técnicas, implementar AL, invocar sub-agentes
- CANNOT: Compilar directamente, crear diseños técnicos, correr tests  

**PM-THYROX actual:** El skill no tiene frontmatter de agente, no tiene CAN/CANNOT.  
**Adaptable:** ALTO — Cuando creemos skills de tech-layer, usar este formato exacto.
La descripción con `<example>` tags es clave: Claude Code usa eso para decidir cuándo invocar el agente automáticamente.

### H-014: LA VISIÓN CENTRAL — Framework generativo auto-adaptable

Esta es la brecha más grande que no existía en el análisis inicial.

**Volt Factory:** Hardcodeado a BC/AL. Para usarlo con otra tecnología habría que
reescribir todo desde cero. Es un framework **estático** para un dominio específico.

**La nueva visión (meta-framework):** PM-THYROX debe ser capaz de **generar su
propio stack de skills** basado en el proyecto detectado.

```
Usuario dice: "Proyecto React + Node.js + PostgreSQL"
                        ↓
        PM-THYROX Phase 1: Tech Detection
                        ↓
    Auto-genera:
    .claude/skills/react-frontend/SKILL.md
    .claude/skills/nodejs-backend/SKILL.md
    .claude/skills/postgresql-db/SKILL.md
    .claude/guidelines/react.instructions.md
    .claude/guidelines/nodejs.instructions.md
    .claude/guidelines/project-conventions.instructions.md
```

**Cómo funciona Volt Factory vs cómo funcionaría nuestro framework:**

| Aspecto | Volt Factory | Meta-Framework |
|---------|-------------|----------------|
| Tech scope | BC/AL (hardcoded) | Cualquier tecnología |
| Skills | Pre-escritos a mano | Auto-generados desde registry |
| Guidelines | Hand-written por tech | Generados desde templates |
| Adaptación | Fork + reescribir | Scan + generate |
| Aprender tech nueva | Imposible sin reescribir | Agregar template al registry |
| Agentes | 7 fijos | 3 core + N generados |

**La arquitectura completa del meta-framework:**
```
.claude/
├── CLAUDE.md                         ← 15 líneas, imperativo
├── skills/
│   ├── pm-thyrox/                    ← Core orchestrator (existe)
│   └── {tech-layer}/                 ← Auto-generado por tech detector
│       ├── SKILL.md                  ← Guía phase-by-phase para esa tech
│       └── references/               ← Patterns, convenciones de esa tech
├── guidelines/                       ← Auto-generados, always-on
│   ├── {tech-frontend}.instructions.md
│   ├── {tech-backend}.instructions.md
│   └── project-conventions.instructions.md
├── agents/                           ← Sub-agentes especializados
│   ├── tech-detector.md              ← Detecta stack del proyecto
│   └── skill-generator.md            ← Genera SKILL.md desde templates
└── commands/                         ← Entry points de fase
    ├── workflow_analyze.md
    └── workflow_track.md

registry/                             ← Fuente de verdad (templates)
├── frontend/react.template.md
├── frontend/vue.template.md
├── backend/nodejs.template.md
├── backend/django.template.md
└── database/postgresql.template.md
```

### H-015: Tech Skill Registry — catálogo de templates

**Volt Factory:** No tiene registry. Todo está hardcoded en los agentes.

**Nueva necesidad:** Un directorio `registry/` con templates por tecnología.
Cada template sabe cómo guiar el desarrollo en esa tech para cada fase del SDLC:

```markdown
# Registry Template: React Frontend

## Phase 1: ANALYZE — qué investigar en un proyecto React
- Versión de React (18.x hooks vs class components)
- State management: Redux, Zustand, Context API...
- Testing: Jest + RTL, Cypress, Playwright

## Phase 4: STRUCTURE — qué incluir en requirements-spec
- Component hierarchy diagram
- State flow design
- API contract (inputs/outputs por componente)

## Phase 6: EXECUTE — convenciones obligatorias
- Naming: PascalCase para componentes, camelCase para hooks
- File structure: feature-based, no type-based
- Testing: cada componente tiene su .test.tsx
```

**Contenido del registry** (candidatos iniciales):
- Frontend: `react`, `vue`, `nextjs`, `angular`, `svelte`
- Backend: `nodejs-express`, `nodejs-fastify`, `django`, `rails`, `fastapi`, `laravel`
- Database: `postgresql`, `mongodb`, `mysql`, `redis`, `sqlite`
- Infra: `docker`, `kubernetes`, `terraform`, `github-actions`
- Mobile: `react-native`, `flutter`

### H-016: .instructions.md auto-generados (not hand-written)

**Volt Factory:** `al-naming-conventions.instructions.md` — 200 líneas escritas
a mano con Reglas + Intent + Ejemplos Buenos/Malos. Cargadas automáticamente
en CADA sesión que involucra código AL.

**Patrón que tomamos:** La estructura de las instructions es universal:
```markdown
# {Tech} Conventions

## Rule 1: {Nombre de la regla}
### Intent
{Por qué esta regla existe}
### Examples
```{lang}
// GOOD
...
// BAD
...
```
```

**Generación automática:** Cuando `skill-generator` crea un skill para `react`,
también genera `.claude/guidelines/react.instructions.md` con las reglas
críticas de ese tech. El registry template incluye tanto el SKILL.md como
el .instructions.md correspondiente.

**Efecto:** Desde el momento en que se detecta React en el proyecto, Claude
aplica automáticamente: naming conventions, component structure, testing patterns,
sin que el usuario tenga que pedirlo.

### H-017: CLAUDE.md imperativo — patrón Volt Factory

**Volt Factory CLAUDE.md** (15 líneas, cero teoría):
```
When developing AL code, MANDATORY follow:
1. Use bc-al-developer + al-guidelines
2. Compile with bc-app-compiler (fix errors if any)
3. Publish to BC
4. Create automated tests, compile Test app
5. Run tests with bc-test-runner
6. ONLY done when ALL tests pass
```
Sin explicaciones. Sin contexto histórico. Solo: haz esto, luego esto.

**Nuestro CLAUDE.md actual:** Más descriptivo, tiene historia, locked decisions,
estructura. Funciona bien como Level 2 (puente).

**Adaptable:** Para proyectos de desarrollo (no solo gestión), el CLAUDE.md
del proyecto debería ser un checklist de 10-15 líneas que enforcea el flujo.
Los projects generados por el meta-framework tendrían un CLAUDE.md auto-generado
corto e imperativo específico al stack detectado.

### H-018: Commands como entry points con success criteria

**Volt Factory workflow commands** (~30 líneas cada uno):
```markdown
# Workflow 01: Business Research

Required: INDUSTRY_NAME
Optional: FOCUS_AREAS

I will launch bc-business-research to:
- 20+ web searches
- 8-12 business journeys
- 30-50 features

Success Criteria:
- Research docs in factory/1research/[Feature]/
- 5,000+ words per feature

Next Stage: /workflow_02_functional_design
```

**Patrón clave:** Cada command tiene:
1. Parámetros requeridos/opcionales
2. Qué agente invoca
3. Success criteria medibles
4. Referencia al siguiente command

**Adaptable:** Nuestros workflow commands para las 7 fases deberían seguir
exactamente este patrón. El usuario escribe `/workflow_analyze` y el command
le pide: WP name, descripción del problema, tech stack (si aplica).

### H-019: Layer-based skill architecture — skills por capa, no por fase

**Volt Factory:** Un agente por responsabilidad técnica (`bc-al-developer`,
`bc-app-compiler`, `bc-test-runner`). Cada uno maneja una fase o concern.

**Nuestra arquitectura:** Dividir skills en dos ejes ortogonales:

**Eje 1 — Gestión (pm-thyrox):** Fases 1-7, agnóstico de tech.
**Eje 2 — Tecnología (tech skills):** Específico por layer, cubre todas las fases.

```
Phase 4 STRUCTURE para un proyecto React + Node:
  → pm-thyrox dice: "crear requirements-spec.md"
  → react-frontend dice: "incluir component hierarchy + state flow"
  → nodejs-backend dice: "incluir API contracts + middleware design"
  → postgresql-db dice: "incluir schema + migration plan"

Phase 6 EXECUTE para el mismo proyecto:
  → pm-thyrox dice: "implementar según task-plan, commit convencional"
  → react-frontend dice: "naming PascalCase, tests con RTL, feature-based folders"
  → nodejs-backend dice: "async/await, error middleware, input validation"
  → postgresql-db dice: "usar migrations, no SQL raw, indexes explícitos"
```

**La composición:** pm-thyrox es el director. Los tech skills son los expertos.
En cada fase, pm-thyrox invoca los tech skills relevantes para la capa que se está trabajando.

### H-020: Tech skills como artefactos persistentes — bootstrap once, use forever

**El punto clave que cambia la arquitectura:**

La detección y generación de tech skills **NO ocurre en cada sesión**.
Ocurre **una sola vez** (bootstrap) y el resultado vive en git permanentemente.

```
SESIÓN 1 — Bootstrap (solo si no existen tech skills):
  /workflow_init → tech-detector → skill-generator
  → crea .claude/skills/react-frontend/SKILL.md
  → crea .claude/guidelines/react.instructions.md
  → git commit "feat(skills): bootstrap React + Node + Postgres skills"
  → FIN. Ya no se vuelve a detectar.

SESIÓN 2, 3, N — Normal:
  session-start.sh detecta que .claude/skills/react-frontend/ existe
  → lo menciona en el startup: "Tech skills activos: react-frontend, nodejs-backend"
  → Claude los usa automáticamente
  → ZERO re-detección
```

**Por qué esto es correcto:**  
Alinea con nuestro ADR-008 — **Git as persistence**. Los skills generados
son archivos en git. La "memoria" del stack tecnológico ES el filesystem.
No hay diferencia entre un skill generado y uno escrito a mano — ambos
son archivos `.md` commiteados.

**Cuándo SÍ se re-ejecuta detección:**
- Usuario agrega una tech nueva explícitamente (`/workflow_add_tech vue`)
- Usuario hace refactor del stack (`/workflow_update_stack`)
- El proyecto cambia (detect stale: tech en `.claude/skills/` ya no existe en el proyecto)

**Implicación para session-start.sh:**  
El hook ya conoce el WP activo desde `now.md`. También debería listar
los tech skills activos desde `.claude/skills/` para que Claude sepa
qué contexto tech-específico aplicar en la sesión.

```bash
# En session-start.sh — nuevo bloque:
TECH_SKILLS=$(find .claude/skills -mindepth 1 -maxdepth 1 -type d \
  ! -name "pm-thyrox" 2>/dev/null | xargs -I{} basename {} | tr '\n' ', ')
if [ -n "$TECH_SKILLS" ]; then
  echo "Tech skills activos: $TECH_SKILLS"
fi
```

**Implicación para ADR-004 (Single skill):**  
ADR-004 dice "Un pm-thyrox, no 15 skills separados". Esto no se viola porque:
- pm-thyrox sigue siendo el único **skill de gestión** (Phase 1-7)
- Los tech skills son una **categoría nueva**: skills de tecnología, no de gestión
- La distinción: pm-thyrox dice QUÉ hacer en cada fase; tech skills dicen CÓMO hacerlo en esa tech
- ADR-004 necesita actualizarse para reconocer las dos categorías

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

## Resumen actualizado de adaptaciones

### PRIORIDAD ALTA — meta-framework generativo (visión central)

| ID | Adaptación | Esfuerzo | Impacto |
|----|-----------|---------|---------|
| A-001 | Commands `/workflow_analyze`…`/workflow_track` con success criteria | Bajo | Alto |
| A-002 | Documento HANDOFF Phase 5→6 (`{nombre}-handoff.md`) | Bajo | Alto |
| A-003 | Test specs en Phase 4 (sección en requirements-spec template) | Bajo | Alto |
| A-004 | `.claude/guidelines/` con `.instructions.md` always-on | Medio | Alto |
| **A-012** | **Tech Skill Registry** — templates por tecnología en `registry/` | Alto | Crítico |
| **A-013** | **Tech Detector** — agente que escanea stack del proyecto | Medio | Crítico |
| **A-014** | **Skill Generator** — genera SKILL.md + .instructions.md desde registry | Alto | Crítico |
| **A-015** | **Agent frontmatter** — formato nativo Claude Code para tech skills | Bajo | Alto |

### PRIORIDAD MEDIA

| ID | Adaptación | Esfuerzo | Impacto |
|----|-----------|---------|---------|
| A-005 | Research checklist en Phase 1 | Bajo | Medio |
| A-006 | Jerarquía Epic→Feature→WP en ROADMAP | Bajo | Medio |
| A-007 | CLAUDE.md imperativo auto-generado por proyecto | Medio | Medio |

---

## Conclusión

Volt Factory **valida** nuestra estructura de 7 fases. Su aporte inmediato son
4 mejoras concretas (commands, handoff, test specs, instructions).

Pero la visión que el usuario describe va más lejos: un **meta-framework generativo**.

**El salto arquitectónico:**
- Volt Factory: pipeline estático para BC/AL
- Nuestro objetivo: framework que se **auto-configura** para cualquier stack

**Ciclo de vida correcto (H-020):**

```
BOOTSTRAP (una sola vez, la primera vez):
  Usuario: "proyecto React + Node + Postgres"
  → /workflow_init o Phase 1 ANALYZE detecta que no hay tech skills
  → tech-detector escanea el proyecto
  → skill-generator crea los skills + guidelines
  → git commit → quedan como artefactos permanentes del proyecto

CADA SESIÓN (sin detección):
  session-start.sh:
  → WP activo: voltfactory-adaptation (desde now.md)
  → Tech skills activos: react-frontend, nodejs-backend, postgresql (desde .claude/skills/)
  → Claude aplica sus convenciones automáticamente

CAMBIO DE STACK (explícito):
  → /workflow_add_tech vue  ← agrega nuevo skill
  → /workflow_update_stack  ← re-detecta cambios
```

**En Phase 4, los tech skills enriquecen el requirements-spec automáticamente.
En Phase 6, las instructions enforcan las convenciones sin que el usuario las pida.
Sin re-detección. Sin re-generación. El filesystem ES la memoria.**

**Lo que PM-THYROX aporta que Volt Factory no tiene:**
- Tecnología-agnóstico (funciona con cualquier stack)
- Auto-generativo (no requiere reescribir para nueva tech)
- Composable (React + Node + Postgres funciona simultáneamente)
- Extensible (agregar una tech = agregar un template al registry)
