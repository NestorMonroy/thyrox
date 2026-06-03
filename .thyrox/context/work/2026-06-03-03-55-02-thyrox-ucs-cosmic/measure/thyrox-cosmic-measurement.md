```yml
created_at: 2026-06-03 04:04:43
project: THYROX
work_package: 2026-06-03-03-55-02-thyrox-ucs-cosmic
phase: Phase 2 — MEASURE
author: NestorMonroy
status: Borrador
```

# COSMIC — Medición de THYROX (Fases B + C)

> Σ por proceso = nº de movimientos (P-GSM-8). Capas A y B son FSM separados (Principio 6).
> Movimientos: **E** Entrada · **X** Salida · **R** Lectura · **W** Escritura (1 CFP c/u).
> Fuente: `docs/requisitos/casos-uso/{interface,engine}-ucs.md` — claim **OBSERVABLE** (I-012).

## Capa A — Interfaz (FU: Ejecutor) · boundary persona↔comando

| Proceso | E | X | R (OOIs) | W (OOIs) | CFP |
|---------|---|---|----------|----------|-----|
| UC-INT-01 DISCOVER | 1 | 1 | SST, ROADMAP (2) | WP, analysis, risk-register, exit-conditions, SST, ROADMAP (6) | **10** |
| UC-INT-02 MEASURE | 1 | 1 | discover-art (1) | measure-art, SST (2) | **5** |
| UC-INT-03 DIAGNOSE | 1 | 1 | discover-art, measure-art (2) | analyze-art, SST (2) | **6** |
| UC-INT-04 CONSTRAINTS | 1 | 1 | prev-art (1) | constraints-art, SST (2) | **5** |
| UC-INT-05 STRATEGY | 1 | 1 | constraints-art (1) | strategy-art, SST (2) | **5** |
| UC-INT-06 SCOPE/PLAN | 1 | 1 | strategy-art (1) | plan-art, ROADMAP (2) | **5** |
| UC-INT-07 DESIGN/SPECIFY | 1 | 1 | plan-art (1) | spec-art, SST (2) | **5** |
| UC-INT-08 DECOMPOSE | 1 | 1 | spec-art (1) | task-plan, SST (2) | **5** |
| UC-INT-09 PILOT | 1 | 1 | plan-art, spec-art (2) | pilot-art, SST (2) | **6** |
| UC-INT-10 IMPLEMENT | 1 | 1 | task-plan (1) | Code, gitlog, ROADMAP, execution-log (4) | **7** |
| UC-INT-11 TRACK | 1 | 1 | ROADMAP, gitlog (2) | CHANGELOG (1) | **5** |
| UC-INT-12 STANDARDIZE | 1 | 1 | WP (1) | lessons, Guideline, ARCHITECTURE, decisions, SST (5) | **8** |
| UC-INT-13 AUDIT | 1 | 1 | task-plan, artefactos, gitlog (3) | audit-report (1) | **6** |
| UC-INT-14 LOOP | 1 | 1 | task-plan (1) | Code, gitlog (2) | **5** |
| UC-INT-15 INIT tech skills | 1 | 1 | config (1) | tech-skill, Guideline (2) | **5** |
| UC-INT-16 Spec-Driven | 1 | 1 | requisitos (1) | spec-art (1) | **4** |
| UC-INT-17 TDD | 1 | 1 | requisito (1) | specs-art (1) | **4** |
| UC-INT-18 DEEP-REVIEW | 1 | 1 | art-faseN, art-faseN+1 (2) | review-art (1) | **5** |
| UC-INT-19 Sugerir permisos | 1 | 1 | transcript (1) | — (0) | **3** |
| UC-INT-20 COSMIC sizing | 1 | 1 | FUR/UCs (1) | cosmic-table (1) | **4** |
| **Capa A — Σ (20 procesos)** | | | | | **108** |

## Capa B — Motor (FU: harness/runtime/git/CI) · boundary evento↔script

| Proceso | E | X | R (OOIs) | W (OOIs) | CFP |
|---------|---|---|----------|----------|-----|
| UC-ENG-01 inyectar contexto (start) | 1 | 1 | SST, ROADMAP (2) | — | **4** |
| UC-ENG-02 re-inyectar (post-compact) | 1 | 1 | SST/WP (1) | — | **3** |
| UC-ENG-03 validar commit msg | 1 | 1 | — | — | **2** |
| UC-ENG-04 gate antes de Write | 1 | 1 | invariants/estado (1) | — | **3** |
| UC-ENG-05 sync estado on Write | 1 | 0 | SST (1) | SST, phase-history (2) | **4** |
| UC-ENG-06 verificar git (Stop) | 1 | 1 | git-status (1) | — | **3** |
| UC-ENG-07 validar cierre (Stop) | 1 | 1 | SST/WP (1) | — | **3** |
| UC-ENG-08 fijar fase | 1 | 0 | SST (1) | SST (1) | **3** |
| UC-ENG-09 update project-state | 1 | 0 | ProjectState (1) | ProjectState (1) | **3** |
| UC-ENG-10 cerrar WP | 1 | 1 | SST (1) | SST, ProjectState (2) | **5** |
| UC-ENG-11 enrutar a coordinator | 1 | 1 | RoutingRules (1) | SST (1) | **4** |
| UC-ENG-12 generar agentes (bootstrap) | 1 | 1 | AgentDef-yml (1) | AgentDef-md (1) | **4** |
| UC-ENG-13 generar skills/guidelines | 1 | 1 | SkillTemplate (1) | Skill, Guideline (2) | **5** |
| **Capa B — Σ (13 procesos)** | | | | | **46** |

> Nota P-GSM/Regla conteo: en UC-ENG-12 los N `agents/*.md` comparten OOI `AgentDef` →
> 1 R + 1 W (no por archivo). UC-ENG-05/08/09 son hooks sin Salida al usuario (W es el efecto);
> cumplen ≥2 CFP por E+W/R. UC-ENG-03 = 2 CFP exactos (mínimo Regla 10c).

## Capas C y D (añadidas tras audit de cobertura — scope: producto completo)

Medidas en `docs/requisitos/casos-uso/{methodology,agent}-ucs.md`. Conteo por **patrón
homogéneo** (Average FP, MM v5.0 `estimation.md`), clasificación **INFERRED** (anclado en
skills/agentes reales leídos; admisible para gate, I-012). Ver esos archivos para el roster.

| Capa (FSM) | Procesos | CFP | Patrón | Clasificación |
|------------|----------|-----|--------|---------------|
| C — Coordinators de metodología | 62 | **372** | 6 CFP/paso | INFERRED [early sizing] |
| D — Agentes | 29 | **142** | 5 (escribe) / 4 (read-only) | INFERRED |

## Resultado (4 capas — producto completo)

| Capa (FSM) | Procesos | CFP | Clasificación |
|------------|----------|-----|---------------|
| A — Interfaz | 20 | **108** | OBSERVABLE |
| B — Motor | 13 | **46** | OBSERVABLE |
| C — Coordinators de metodología | 62 | **372** | INFERRED |
| D — Agentes | 29 | **142** | INFERRED |
| **THYROX completo (agregado)** | **124** | **668** | mixto |

**Principio 6:** las 4 capas son FSM distintos; el agregado **668 CFP** es referencia de
volumen total del producto, **no** un tamaño comparable contra una sola capa de otro sistema.
Para benchmark, comparar capa-con-capa del mismo nivel.

**Reconciliación con la estimación del audit:** el audit estimó 500-700 CFP para el producto
completo; la medición da **668**, dentro del rango. El **core (A+B) = 154 CFP es el ~23%**
del producto. La capa C (metodología) es la dominante (56%).

**Pendiente de refinamiento OBSERVABLE:** capas C y D usan Average FP. Leer los 62 SKILL +
29 agentes individualmente movería el total ≈ ±30 CFP (pasos de cierre con W a ROADMAP/CHANGELOG;
agentes con corpus multi-input). El orden de magnitud (≈670) es estable.

**Corrección del audit:** los comandos `structure` y `workflow_init` resultaron **alias** de
`design` (UC-INT-07) e `init` (UC-INT-15) — no son UCs faltantes. La capa A está completa.

## Lecturas (medias por capa)

- Capa A: 108 / 20 = **5.4 CFP/proceso** — coherente con el patrón base E+R+W+W+X (~5) que
  documentaba el propio UC; los outliers son DISCOVER (10, escribe 4 artefactos) y
  STANDARDIZE (8, propaga a 5 destinos).
- Capa B: 46 / 13 = **3.5 CFP/proceso** — coherente con hooks de bajo movimiento (E+R+X).
  Banda "Small" típica de COSMIC (cosmices §6 ≈ 3.9) → la capa motor es funcionalmente fina.

## Calibración / claims

- Todas las cifras se derivan **paso a paso del flujo** de cada UC (OBSERVABLE, I-012):
  cada movimiento corresponde a un paso nombrado en `docs/requisitos/casos-uso/`.
- **Decisiones de granularidad** documentadas (measurement-strategy.md): OOIs distintos =
  movimientos distintos; mismo OOI repetido = 1; navegación/cálculo = 0.
- Los umbrales de atomicidad/esfuerzo **no se extrapolan** entre capas (calibration.md):
  esta medición da **tamaño**, no esfuerzo.
- Re-medible sin reescribir UCs (no-intrusión): si un UC cambia, se recuenta su fila.

---

**Última actualización:** 2026-06-03 04:04:43
