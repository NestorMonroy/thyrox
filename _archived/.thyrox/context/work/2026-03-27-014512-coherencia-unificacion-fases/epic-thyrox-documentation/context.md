```yml
Fecha: 2026-03-27
Proyecto: THYROX
Versión contexto: 1.0
Autor: Claude Code + Human
Estado: Borrador
Sistemas externos: 4
```

# Context: THYROX

## Propósito

Documentar DÓNDE se inserta THYROX en el ecosistema. Define límites y conexiones con sistemas externos.

> Objetivo: Que todos entiendan qué es parte de THYROX y qué es externo.

---

## Scope / Boundaries

### Dentro del Sistema

- Metodología SDLC de 7 fases (SKILL.md)
- 20 references de documentación por fase
- 30 assets/templates para generar output
- 6 scripts de validación (detect/convert/validate)
- Estructura context/ (analysis, epics, work-logs, decisions)
- Documentación de proyecto (README, ROADMAP, CHANGELOG, ARCHITECTURE, CONTRIBUTING)
- Convenciones (Conventional Commits, naming, branches)

### Fuera del Sistema (Dependencias Externas)

- **Claude Code** — Runtime de AI que ejecuta el SKILL
- **Git/GitHub** — Version control y hosting del repositorio
- **Código del proyecto destino** — api/, build/, docs/ (el software que se gestiona)
- **CI/CD** — GitHub Actions u otros pipelines (opcional)

---

## Business Context

| Sistema Externo | Datos Intercambiados | Valor |
|-----------------|---------------------|-------|
| Claude Code | Lee CLAUDE.md, SKILL.md, references; produce artefactos | Motor de ejecución del framework |
| Git/GitHub | Commits, branches, PRs, historial | Persistencia y colaboración |
| Proyecto destino | Código fuente, tests, configuración | Lo que THYROX gestiona |
| CI/CD (opcional) | Scripts validate-*, exit codes | Validación automatizada |

---

## Technical Context

| Sistema Externo | Interfaz | Tecnología | Dirección |
|-----------------|----------|-----------|-----------|
| Claude Code | CLI / SKILL.md | Markdown, Bash, Python | Bidireccional |
| Git | CLI | git protocol, SSH/HTTPS | Bidireccional |
| GitHub | API / Web UI | REST API, Webhooks | Bidireccional |
| CI/CD | Scripts | Bash exit codes (0/1) | Outbound |

---

## Diagrama de Contexto

```
                    ┌─────────────────────────┐
                    │        THYROX            │
                    │                          │
                    │  SKILL.md (motor)        │
                    │  references/ (guías)     │
                    │  scripts/ (validación)   │
                    │  assets/ (templates)     │
                    │  context/ (artefactos)   │
                    │                          │
                    └────────┬────────────────┘
                             │
            ┌────────────────┼────────────────┐
            ↓                ↓                ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Claude Code  │ │   Git/GitHub │ │ Proyecto     │
    │              │ │              │ │ Destino      │
    │ Lee SKILL.md │ │ Commits,     │ │              │
    │ Lee refs     │ │ branches,    │ │ api/         │
    │ Ejecuta      │ │ PRs, history │ │ build/       │
    │ scripts      │ │              │ │ docs/        │
    │ Genera output│ │              │ │              │
    └──────────────┘ └──────────────┘ └──────────────┘
            ↓
    ┌──────────────┐
    │   CI/CD      │
    │ (opcional)   │
    │              │
    │ validate-*   │
    │ exit 0/1     │
    └──────────────┘
```

---

## Data Flows

### Inbound (hacia THYROX)

- Developer describe intención → Claude Code interpreta usando SKILL.md
- Git history → informa estado del proyecto (commits recientes, branches)
- Código existente → Claude Code analiza para tomar decisiones

### Outbound (desde THYROX)

- Artefactos → context/ (analysis, epics, work-logs, decisions)
- Commits → Git repository (conventional commits)
- ROADMAP.md updates → progreso del proyecto
- Validation results → CI/CD (exit codes 0/1)

### Bidireccional

- Claude Code ↔ SKILL.md: lee metodología, produce artefactos según fase
- Developer ↔ Claude Code: instrucciones naturales, resultados documentados
- Git ↔ proyecto: push/pull, merge, branch management

---

## Validación Checklist

- [x] Scope/boundaries claramente definidos
- [x] Business context identificado
- [x] Technical context identificado
- [x] Sistemas externos específicos (no genéricos)
- [x] Datos intercambiados claros
- [x] Protocolos documentados
- [x] Direcciones de flujo claras
- [x] Diagrama de contexto visual

---

## Siguiente Paso

Phase 1: ANALYZE completada.
→ Pasar a **PHASE 2: SOLUTION_STRATEGY**
