```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis comparativo (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/spec-kit/
Principio: Aprender de errores comparando con proyecto de referencia
```

# Análisis Comparativo: spec-kit vs THYROX

## Resumen

spec-kit es más preciso en workflow (templates que fuerzan calidad, gates que bloquean malas decisiones, checklists que validan specs). THYROX es más transparente en proceso (work-logs, ADRs, error tracking, progressive disclosure).

Ninguno es completo solo. THYROX debería adoptar lo mejor de spec-kit sin perder sus fortalezas.

---

## Lo que spec-kit tiene y THYROX no

### 1. Constitution (Principios inmutables)

spec-kit tiene `memory/constitution.md` con principios que se APLICAN mediante gates en los templates. Si violas un principio, el template te bloquea.

THYROX tiene principios en solution-strategy.md pero no se aplican. Puedes violarlos sin consecuencia.

**Error de THYROX:** Principios sin enforcement son sugerencias, no leyes.

### 2. Checklists como "unit tests para specs"

spec-kit valida cada spec contra un checklist antes de avanzar. Si hay items fallidos, itera (máx 3 veces). Si persisten, advierte al usuario.

THYROX no tiene validación de specs. Specs malas avanzan a implementación sin ser detectadas.

**Error de THYROX:** No hay control de calidad entre fases.

### 3. Slash commands como archivos independientes

spec-kit tiene 8 archivos de comando (specify.md, plan.md, tasks.md, implement.md, analyze.md, clarify.md, checklist.md, constitution.md). Cada uno documenta paso a paso qué hacer en esa fase.

THYROX tiene ~40 líneas por fase en SKILL.md. No hay guía paso a paso ejecutable.

**Error de THYROX:** Las fases son descripciones, no instrucciones ejecutables.

### 4. Research Phase (Phase 0)

spec-kit investiga antes de planificar: benchmarks, compatibilidad, implicaciones de seguridad. Output: research.md con evidencia.

THYROX salta de ANALYZE a SOLUTION_STRATEGY sin investigación explícita.

**Error de THYROX:** Decisiones arquitectónicas sin evidencia.

### 5. Contracts y data-model separados

spec-kit produce contracts/ (qué ven los sistemas externos) y data-model.md (representación interna) como artefactos separados.

THYROX no tiene este concepto.

### 6. Quality gates entre fases

spec-kit tiene Phase -1 gates que bloquean si se violan principios (simplicity, anti-abstraction, integration-first).

THYROX tiene exit conditions pero son checklists informativos, no gates bloqueantes.

---

## Lo que THYROX tiene y spec-kit no

### 1. Error tracking (context/analysis/errors/)

THYROX documenta errores del proceso para aprender. spec-kit no tiene equivalente.

### 2. Work-logs (bitácora de sesiones)

THYROX registra qué pasó en cada sesión. spec-kit solo muestra el output final.

### 3. ADR system (decisions/)

THYROX tiene un sistema formal de Architecture Decision Records. spec-kit documenta decisiones solo cuando hay violaciones.

### 4. Progressive disclosure (SKILL < 500 líneas)

THYROX usa 3 niveles: SKILL.md → references/ → assets/. spec-kit tiene documentos monolíticos.

### 5. Detect/convert/validate scripts

THYROX tiene 6 scripts con responsabilidad única. spec-kit no tiene herramientas de auto-corrección.

### 6. Covariancia (consistencia entre archivos)

THYROX verifica que las mismas reglas se expresen igual en todos los archivos. spec-kit no tiene este concepto.

---

## Errores de THYROX detectados

| # | Error | Severidad | Qué hace spec-kit | Acción para THYROX |
|---|-------|-----------|-------------------|-------------------|
| ERR-003 | Sin validación de specs | Alta | Checklists + iteración | Crear checklist template |
| ERR-004 | Sin constitution/gates | Alta | Phase -1 gates | Crear constitution + gates |
| ERR-005 | Fases descritas, no ejecutables | Media | Slash commands separados | Crear command files por fase |
| ERR-006 | Sin research phase | Media | Phase 0 con research.md | Agregar research al flujo |
| ERR-007 | ROADMAP sin links a epics | Media | Feature branch = spec dir | Agregar links epic → ROADMAP |
| ERR-008 | Exit conditions informativas | Media | Gates bloqueantes | Hacer exit conditions mandatorias |

---

## Errores de Claude detectados (autocrítica)

| # | Error | Cuándo ocurrió | Lección |
|---|-------|---------------|---------|
| ERR-001 | No documenté análisis | Al hacer covariance analysis | Siempre guardar output en context/analysis/ |
| ERR-002 | Clasifiqué mal tamaño | Al proponer saltar fases | Evaluar proyecto completo, no tarea individual |
| ERR-009 | Creé templates genéricos | Al hacer Phase 1 ANALYZE docs | Debí usar templates más precisos como spec-kit |
| ERR-010 | No validé specs antes de avanzar | Al pasar de Phase 4 a 5 | Debí crear y usar checklist |
| ERR-011 | No investigué antes de decidir | Al elegir "architecture docs" para reemplazar arc42 | Debí documentar alternativas y justificación |

---

## Plan de acción (para siguiente sesión)

### Prioridad 1: Adoptar de spec-kit
1. Crear `assets/spec-quality-checklist.md.template`
2. Crear `assets/constitution.md.template`
3. Agregar gates a EXIT_CONDITIONS.md.template

### Prioridad 2: Mejorar fases
4. Crear command files por fase en references/ (como spec-kit commands/)
5. Agregar research phase entre ANALYZE y SOLUTION_STRATEGY
6. Hacer exit conditions mandatorias (no informativas)

### Prioridad 3: Integrar
7. Vincular ROADMAP.md → epics/ programáticamente
8. Crear validate-consistency.py (trazabilidad requirements → tasks)

---

**Última actualización:** 2026-03-28
