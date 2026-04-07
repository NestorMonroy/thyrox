```yml
type: Contexto Persistente
version: 3.0
updated_at: 2026-04-07 02:15:00
```

# CLAUDE.md — THYROX

**Level 2 — Puente entre [SKILL](skills/pm-thyrox/SKILL.md) (Level 1) y proyecto.**

## Locked Decisions (no revisitar)

Estas son reglas del framework de metodologia — NO son ADRs del proyecto.
Los ADRs del proyecto viven en el path declarado por `adr_path` en este archivo (ver sección Configuración del Proyecto).

1. **ANALYZE first** — No planificar sin entender primero
2. **Anatomía oficial** — SKILL.md + scripts/ + references/ + assets/
3. **Git as persistence** — Zero archivos backup, historial en git
4. **Markdown only** — Sin bases de datos, sin formatos propietarios
5. **Single skill** — Un pm-thyrox con references, no 15 skills separados
6. **Work packages with timestamp** — context/work/YYYY-MM-DD-HH-MM-SS-nombre/
7. **Conventional Commits** — `type(scope): description`

## SKILL vs ADR — Regla de uso

|                  | SKILL.md                                     | ADR en {adr_path}                              |
|------------------|----------------------------------------------|--------------------------------------------------------|
| Que es           | Instrucciones de metodologia (como trabajar) | Registro de decision tomada (por que se eligio X)      |
| Quien lo escribe | Mantenedor del framework                     | Claude en Phase 1-2, cuando hay decision permanente    |
| Cuando modificar | Solo si cambia la metodologia de gestion     | Al tomar una decision arquitectonica del proyecto      |
| Duracion         | Vive con el framework                        | Inmutable una vez aprobado                             |

REGLA: Si la duda es "documento esto en SKILL.md o en un ADR?":
- Cambia COMO se trabaja en general -> SKILL.md
- Registra POR QUE se eligio algo en este proyecto -> ADR en {adr_path}

## Estructura

```
.claude/
├── CLAUDE.md              ← Este archivo (Level 2)
├── context/
│   ├── project-state.md   ← Metadata del proyecto
│   ├── focus.md           ← Dirección actual
│   ├── now.md             ← Estado de sesión (YAML)
│   ├── decisions/         ← ADRs
│   └── work/              ← Paquetes de trabajo (YYYY-MM-DD-HH-MM-SS-nombre/)
└── skills/pm-thyrox/      ← El SKILL (Level 1)
    ├── SKILL.md            Motor — metodología 7 fases
    ├── references/         Documentación bajo demanda
    ├── scripts/            Código ejecutable
    └── assets/             Templates de output
```

## Flujo de sesión — OBLIGATORIO

SIEMPRE seguir este flujo. NO omitir pasos.

1. **Inicio** — Leer focus.md + now.md + ROADMAP.md.
2. **Activar SKILL** — ANTES de responder cualquier tarea: invocar Skill tool → pm-thyrox.
   Si el Skill tool no está disponible: leer [SKILL.md](skills/pm-thyrox/SKILL.md) completo y seguirlo paso a paso.
3. **Identificar fase activa** — Revisar `context/work/`:
   - Hay work package activo → continuar en la fase donde quedó.
   - No hay work package → empezar Phase 1: ANALYZE.
4. **Trabajar** — Seguir cada fase hasta su exit criteria. NO saltarse fases. Commits convencionales. Actualizar ROADMAP.md.
5. **Cierre** — Actualizar focus.md + now.md.

## Configuración del Proyecto

adr_path: .claude/context/decisions/   # THYROX: retrocompat. Nuevos proyectos: usar subdirectorios por capa (global/, api/, db/, ui/, deploy/, framework/)

## Para más contexto

- Metodología completa: [SKILL](skills/pm-thyrox/SKILL.md)
- Estado del proyecto: [project-state](context/project-state.md)
- Decisiones: [decisions](context/decisions.md)
- Convenciones: [conventions](skills/pm-thyrox/references/conventions.md)
