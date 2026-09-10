```yml
Tipo: Documentación Principal
Categoría: Introducción al Proyecto
Versión: 2.8.0
Propósito: Presentación y descripción del proyecto THYROX
Objetivo: Proporcionar visión general, características, estructura, y quick start
Fecha actualización: 2026-04-17
```

# THYROX

**Tracking Hierarchy Yield Roadmap Organization eXecution**

## Propósito

Sistema de Agentic AI para gestión y planificación de proyectos, con metodología de 12 stages propia (DISCOVER → STANDARDIZE) y soporte nativo para 11 metodologías formales.

> Implementado actualmente sobre Claude Code (Anthropic). La naturaleza agentic del sistema es independiente de la plataforma.

> Objetivo: Que nuevos usuarios comprendan qué es THYROX, cómo funciona, y cómo comenzar a usarlo.

---

## Descripción General

Un sistema de Agentic AI para gestión y planificación de proyectos, con 28 agentes especializados, memoria persistente, gates HITL y coordinators para metodologías formales (DMAIC, PDCA, PMBOK, BABOK, RUP, RM, Lean, BPA, PPS, SP, CP). Implementado actualmente sobre Claude Code (Anthropic).

## Qué es THYROX

THYROX es un sistema de Agentic AI que:

- **Orquesta** 28 agentes especializados con ejecución autónoma y coordinación multi-agent
- **Automatiza** workflows con decisión autónoma en bucles agentic (/loop)
- **Persiste** estado entre sesiones via Work Packages + thyrox-memory MCP (FAISS semántico)
- **Controla** calidad con gates HITL en cada transición Stage N→N+1
- **Integra** 11 metodologías formales via coordinators especializados (DMAIC, PDCA, PMBOK, BABOK, RUP, RM, Lean, BPA, PPS, SP, CP)
- **Reacciona** a eventos con hooks (SessionStart, PostCompact, Stop)

## Características

- **Metodología de 12 stages THYROX** (DISCOVER → STANDARDIZE) integrada en un SKILL reutilizable
- **11 coordinators** para metodologías formales — cada uno gestiona su flujo y artefactos
- ROADMAP.md como plan maestro
- Changelog automático desde commits
- Conventional Commits integrado
- CLAUDE.md como memoria persistente del proyecto
- 47 referencias de metodología + 28 agentes nativos listos para usar

## Estructura

```
thyrox/
├── README.md                 # Este archivo
├── ROADMAP.md               # Plan maestro del proyecto
├── CHANGELOG.md             # Historial de cambios
├── DECISIONS.md             # Índice de ADRs
├── ARCHITECTURE.md          # Arquitectura y decisiones técnicas
│
├── .claude/                 # Configuración y extensiones de Claude Code
│   ├── CLAUDE.md            # Contexto persistente (Level 2)
│   ├── agents/              # Agentes nativos Claude Code (28 agentes)
│   ├── references/          # 47 referencias de metodología y plataforma
│   ├── scripts/             # Scripts de infraestructura (hooks, utilidades)
│   └── skills/
│       └── thyrox/          # Skill principal del sistema
│           ├── SKILL.md     # Motor — 12 stages THYROX (Level 1)
│           ├── references/  # Guías de metodología
│           └── assets/      # Templates de artefactos
│
├── .thyrox/                 # Estado de trabajo + tooling
│   ├── context/             # Estado de sesión y artefactos
│   │   ├── project-state.md # Metadata del proyecto
│   │   ├── focus.md         # Dirección actual
│   │   ├── now.md           # Estado de sesión (YAML)
│   │   ├── decisions/       # ADRs
│   │   ├── errors/          # Error tracking
│   │   └── work/            # Work packages (YYYY-MM-DD-HH-MM-SS-nombre/)
│   └── registry/            # Fuente de verdad del sistema
│       ├── agents/          # Definiciones YML de agentes
│       ├── methodologies/   # 11 YAMLs de metodologías
│       ├── bootstrap.py     # Genera .claude/agents/ desde agents/*.yml
│       └── _generator.sh    # Genera skills + guidelines desde templates
```

## Inicio Rápido

1. **Clonar el template:**
   ```bash
   git clone https://github.com/NestorMonroy/thyrox mi-proyecto
   cd mi-proyecto
   ```

2. **Inicializar el proyecto:**
   ```bash
   # Opción B — manual:
   # Editar ROADMAP.md, CLAUDE.md y .thyrox/context/now.md con el nombre de tu proyecto
   ```

   > **Nota de migración:** `setup-template.sh` fue reemplazado por el flujo manual (Opción B).
   > El registry en `.thyrox/registry/` genera los componentes dinámicamente vía `bootstrap.py`.

3. **Commit inicial:**
   ```bash
   git add -A && git commit -m "feat: initialize from thyrox template"
   ```

4. **Abrir Claude Code y empezar:**
   ```bash
   claude
   # Di: "Quiero empezar a planificar mi proyecto"
   # El skill thyrox te guiará desde Stage 1: DISCOVER
   ```

## Metodología

El motor de THYROX es el **[SKILL](.claude/skills/thyrox/SKILL.md)**, que define 12 stages propios:

```
Stage 1  — DISCOVER          → Entender el problema, WP, análisis inicial
Stage 2  — BASELINE          → Medir estado actual, métricas base
Stage 3  — DIAGNOSE          → Análisis causal, identificar problemas raíz
Stage 4  — CONSTRAINTS       → Restricciones técnicas y de negocio
Stage 5  — STRATEGY          → Plan arquitectónico, decisiones técnicas
Stage 6  — SCOPE             → Scope, brainstorm, actualizar ROADMAP.md
Stage 7  — DESIGN/SPECIFY    → PRDs o Spec-Driven docs
Stage 8  — PLAN EXECUTION    → Descomponer en tasks atómicas (T-NNN)
Stage 9  — PILOT/VALIDATE    → Validar enfoque con piloto
Stage 10 — IMPLEMENT         → Implementar + commits convencionales
Stage 11 — TRACK/EVALUATE    → Monitorear, changelog, cierre
Stage 12 — STANDARDIZE       → Documentar lecciones, codificar mejoras
```

**Siempre empezar por DISCOVER.** Para proyectos pequeños: stages 1, 5, 10, 11.

### Jerarquía de archivos

| Level | Archivo | Función |
|-------|---------|---------|
| Level 1 | [SKILL](.claude/skills/thyrox/SKILL.md) | Motor — define metodología y stages |
| Level 2 | [CLAUDE](.claude/CLAUDE.md) | Puente — contexto persistente entre sesiones |
| Level 3 | README.md | Presentación — entrada para humanos |

### Workflow diario

1. **Inicio:** `claude` → revisar ROADMAP.md, identificar stage actual
2. **Trabajo:** Seguir el stage correspondiente del SKILL
3. **Cierre:** Commits convencionales, actualizar ROADMAP.md

## Coordinators

THYROX incluye 11 coordinators especializados para metodologías formales. Cada coordinator gestiona su propio flujo, artefactos y transitions.

| Coordinator | Metodología | Tipo de flujo | Cuándo usar |
|-------------|-------------|---------------|-------------|
| `dmaic-coordinator` | DMAIC (Six Sigma) | Secuencial | Reducción de defectos, variación de procesos |
| `pdca-coordinator` | PDCA (Deming) | Cíclico | Mejora continua iterativa |
| `pmbok-coordinator` | PMBOK (PMI) | Secuencial | Gestión formal de proyectos |
| `babok-coordinator` | BABOK v3 | No-secuencial | Análisis de negocio (6 knowledge areas sin orden fijo) |
| `rup-coordinator` | RUP | Iterativo | Software con milestones formales (LCO/LCA/IOC/PD) |
| `rm-coordinator` | Requirements Management | State-machine | Gestión ciclo de vida de requisitos con retornos |
| `lean-coordinator` | Lean Six Sigma | Secuencial | Eliminación de desperdicios, flujo de valor |
| `bpa-coordinator` | Business Process Analysis | Secuencial | Análisis y rediseño de procesos BPMN |
| `pps-coordinator` | Toyota PPS | State-machine | Resolución estructurada de problemas (5 Whys, A3) |
| `sp-coordinator` | Strategic Planning | Cíclico | Planificación estratégica, BSC, OKRs |
| `cp-coordinator` | Consulting Process | Secuencial | Issue Tree, MECE, Pyramid Principle |

**Invocación:** `@dmaic-coordinator` (o el nombre del coordinator deseado)

## Convenciones

### Commits
Usa formato convencional:
```
feat(api): agregar endpoint GET /users
fix(build): resolver conflicto de dependencias
docs(readme): actualizar instrucciones
```

### ROADMAP.md
```markdown
- [ ] Tarea pendiente
- [-] Tarea en progreso
- [x] Tarea completada (YYYY-MM-DD)
```

### Work packages
```
.thyrox/context/work/YYYY-MM-DD-HH-MM-SS-nombre/
```

## Comandos Útiles

```bash
# Iniciar Claude Code
claude

# Estado del proyecto
/status

# Generar changelog
/changelog:generate

# Ver commits recientes
git log --oneline -10

# Crear nueva rama feature
git checkout -b feature/nombre
```

## Configuración Inicial

Si prefieres configurar manualmente:

1. Reemplazar "THYROX" por el nombre de tu proyecto en archivos core
2. Editar [ROADMAP](./ROADMAP.md) con tus épicas de trabajo
3. Actualizar [CLAUDE](.claude/CLAUDE.md) con contexto del proyecto
4. Configurar [project-state](.thyrox/context/project-state.md)
5. Ejecutar `python3 .thyrox/registry/bootstrap.py` para generar agentes

## Licencia

MIT

## Autor

Generado con THYROX Template + Claude Code

---

**Última actualización:** 2026-04-17
**Versión:** v2.8.0
