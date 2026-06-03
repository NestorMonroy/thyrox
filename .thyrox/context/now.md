```yml
type: Estado de Sesión
version: 1.4
updated_at: 2026-06-03 02:14:47
cold_boot: false
last_session: 2026-06-03
current_work: .thyrox/context/work/2026-06-03-02-13-59-cosmic-sizing
stage: Phase 5 — STRATEGY (COSMIC skill design)
flow: null
methodology_step: null
blockers: []
coordinators: {}
```

# Contexto

**WP activo: COSMIC sizing** (skill THYROX de dimensionamiento funcional + piloto e-comerce
buy-flow). Fase **DISCOVER** — recolección de información.

Recolectado:
- `discover/cosmic-method.md` — método COSMIC (ISO 19761): 4 movimientos de datos E/X/R/W,
  reglas de conteo, procedimiento de 3 fases.
- `discover/ecommerce-pilot-scope.md` — ~24 procesos funcionales del buy-flow, functional
  users, data groups; gap = data movements (bloqueado por submódulos e-comerce inaccesibles).
- risk-register + exit-conditions.

Próximo (requiere aprobación): STRATEGY (diseño del skill COSMIC) → MEASURE (CFP real del piloto).


## Actualización STRATEGY (2026-06-03)

**Hallazgo clave:** las referencias COSMIC de e-comerce SÍ son accesibles — `e-comerce-docs` (`jcg-admin/e-comerce-docs`) se clona directo de GitHub (el `.gitmodules` apuntaba a un proxy local caído). Contiene los **manuales COSMIC oficiales** (`source/referencias/cosmic/*.txt`) + la iniciativa calibrada `adoptar-cosmic-dimensionamiento` (metodología, plantilla COSMIC Format, calibración CFP, guía de estimación). Solo el **código** de las capas (api/ui/server) para los data movements exactos seguiría en repos aparte (`e-comerce-api`, etc.).

**Diseño del skill `cosmic` listo** en `strategy/cosmic-skill-design.md`: skill standalone de medición (fase BASELINE), 3 fases COSMIC (Strategy/Mapping/Measurement), references + assets + plan de build T-001..T-006. Fiel a e-comerce, generalizado para THYROX.

## WP en paralelo (NO cerrado — I-011)

ÉPICA 43 **github-workflows** quedó en **Phase 8 PLAN EXECUTION** (task-plan de 12 tareas
T-001..T-012, awaiting approval). Sigue abierto; se retoma cuando se ordene explícitamente.
