```yml
Tipo: Contexto Persistente
Versión: 3.0
Fecha actualización: 2026-03-28
```

# CLAUDE.md — THYROX

**Level 2 — Puente entre [SKILL](skills/pm-thyrox/SKILL.md) (Level 1) y proyecto.**

## Locked Decisions (no revisitar)

1. **ANALYZE first** — No planificar sin entender primero (ADR-010)
2. **Anatomía oficial** — SKILL.md + scripts/ + references/ + assets/ (ADR-011)
3. **Git as persistence** — Zero archivos backup, historial en git (ADR-008)
4. **Markdown only** — Sin bases de datos, sin formatos propietarios (ADR-001)
5. **Single skill** — Un pm-thyrox con references, no 15 skills separados (ADR-004)
6. **Work packages with timestamp** — context/work/YYYY-MM-DD-HH-MM-SS-nombre/
7. **Conventional Commits** — `type(scope): description` (ADR-003)

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

## Para más contexto

- Metodología completa: [SKILL](skills/pm-thyrox/SKILL.md)
- Estado del proyecto: [project-state](context/project-state.md)
- Decisiones: [decisions](context/decisions.md)
- Convenciones: [conventions](skills/pm-thyrox/references/conventions.md)
