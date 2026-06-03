```yml
Tipo: Requisitos — Casos de Uso (FUR)
project: THYROX
status: Borrador
version: 1.0.0
updated_at: 2026-06-03 04:24:00
```

# UCs de THYROX — Capa C: Coordinators de metodología

> FSM = capa de orquestación de metodología (11 metodologías × sus pasos = 62 procesos
> funcionales). **Usuario funcional:** Claude/contexto (el coordinator es invocado por
> señal de contexto o por el comando de fase). **Boundary:** señal de paso ↔ skill
> coordinator. **OOIs:** SessionState (`now.md::methodology_step`/`flow`), WorkPackage,
> Step-Artifact (charter, baseline, análisis, plan, …), prev-Step-Artifact (precondición),
> ROADMAP, Tollgate-result.

## Patrón homogéneo de un paso de coordinator (fundamentado)

Leído de skills reales (`dmaic-define`, `dmaic-measure`): cada paso de coordinator es un
**proceso funcional** con el mismo patrón de movimientos:

| # | Movimiento | Tipo | OOI |
|---|-----------|------|-----|
| 1 | recibe la señal "ejecutar paso X" (trigger) | **E** | señal de paso |
| 2 | lee estado de sesión / `methodology_step` | **R** | SessionState |
| 3 | lee la precondición (artefacto del paso previo; en el 1er paso: descripción del WP) | **R** | prev-Step-Artifact / WP |
| 4 | escribe el artefacto del paso (charter/baseline/…) | **W** | Step-Artifact |
| 5 | actualiza `now.md::methodology_step` | **W** | SessionState |
| 6 | emite el tollgate / siguiente paso | **X** | Tollgate-result |

→ **6 CFP por paso** (estándar). Pasos de cierre que propagan a ROADMAP/CHANGELOG pueden
añadir 1 W (refinamiento pendiente de lectura por-skill; conteo conservador = 6).

> **Granularidad / clasificación:** 62 procesos homogéneos → se aplica **Average FP**
> (early sizing del MM v5.0, `estimation.md`) = **6 CFP/paso**, anclado en los 2 coordinators
> leídos. Clasificación **INFERRED** (patrón observable + razonamiento documentado), no
> SPECULATIVE — admisible para gate (I-012). Marca **[ESTIMACIÓN TEMPRANA por patrón]**.

## Roster de pasos por metodología (62 procesos funcionales)

Cada celda = un proceso funcional (1 paso de coordinator). Trigger = "avanzar a este paso".

| Metodología | Pasos (procesos funcionales) | nº | CFP |
|-------------|------------------------------|----|----|
| **BABOK (ba)** | strategy · planning · elicitation · requirements-analysis · requirements-lifecycle · solution-evaluation | 6 | 36 |
| **BPA (bpa)** | identify · map · analyze · design · implement · monitor | 6 | 36 |
| **Consulting (cp)** | initiation · structure · diagnosis · plan · evaluate · recommend · implement | 7 | 42 |
| **DMAIC (dmaic)** | define · measure · analyze · improve · control | 5 | 30 |
| **Lean (lean)** | define · measure · analyze · improve · control | 5 | 30 |
| **PDCA (pdca)** | plan · do · check · act | 4 | 24 |
| **PMBOK (pm)** | initiating · planning · executing · monitoring · closing · pm-thyrox(routing) | 6 | 36 |
| **PPS Toyota (pps)** | clarify · target · analyze · countermeasures · implement · evaluate | 6 | 36 |
| **RM (rm)** | elicitation · analysis · specification · validation · management | 5 | 30 |
| **RUP (rup)** | inception · elaboration · construction · transition | 4 | 24 |
| **Strategic Planning (sp)** | context · analysis · gaps · formulate · plan · execute · monitor · adjust | 8 | 48 |
| **Σ Capa C** | | **62** | **372** |

## Ejemplos detallados (anclas del patrón — OBSERVABLE)

### UC-MET-DMAIC-01 — dmaic:define (primer paso)
- **FU:** Claude/contexto · **Trigger:** iniciar proyecto DMAIC
- **Flujo:** 1) señal "ejecutar Define" (E) → 2) lee `now.md`/WP (R) → 3) lee descripción
  del problema + sponsor (R) → 4) escribe `dmaic-define.md` (Charter/CTQs/SIPOC) (W) →
  5) actualiza `methodology_step=dmaic:define` (W) → 6) emite tollgate "Charter aprobado?" (X).
- **CFP:** 6 (OBSERVABLE — leído de `dmaic-define/SKILL.md`).

### UC-MET-DMAIC-02 — dmaic:measure (paso medio con precondición)
- **FU:** Claude/contexto · **Trigger:** Charter aprobado
- **Flujo:** 1) señal "ejecutar Measure" (E) → 2) lee `now.md` (R) → 3) lee precondición
  `dmaic-define.md` (Charter/CTQs/SIPOC) (R) → 4) escribe `dmaic-measure.md` (baseline +
  Sigma + MSA) (W) → 5) actualiza `methodology_step` (W) → 6) emite tollgate (X).
- **CFP:** 6 (OBSERVABLE — leído de `dmaic-measure/SKILL.md`, precondición explícita).

> Los 60 pasos restantes siguen este patrón (el coordinator selecciona artefacto de entrada y
> de salida según el paso). Re-medibles uno a uno leyendo su SKILL si se requiere conteo fino.

---

**Nota de medición:** Capa C = **372 CFP** [ESTIMACIÓN TEMPRANA por patrón, INFERRED].
Para convertir a conteo OBSERVABLE puro: leer los 62 SKILL y registrar W extra de pasos de
cierre. El orden de magnitud (≈370) no cambia con ese refinamiento (±1 W en ~15 pasos de
cierre ≈ +15 CFP).

**Última actualización:** 2026-06-03 04:24:00
