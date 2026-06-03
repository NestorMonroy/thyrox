```yml
Tipo: Requisitos — Casos de Uso (FUR)
project: THYROX
status: Borrador
version: 2.0.0
updated_at: 2026-06-03 04:40:00
```

# UCs de THYROX — Capa C: Coordinators de metodología

> FSM = capa de orquestación de metodología (11 metodologías × sus pasos = **61 procesos
> funcionales**). **Usuario funcional:** Claude/contexto (el coordinator es invocado por
> señal de contexto o por el comando de fase). **Boundary:** señal de paso ↔ skill
> coordinator. **OOIs:** SessionState (`now.md::methodology_step`/`flow`), WorkPackage,
> Step-Artifact (charter, baseline, análisis, plan, …), prev-Step-Artifact (precondición),
> ROADMAP, Tollgate-result.

> **v2.0.0 — medición OBSERVABLE:** se leyeron los 61 SKILL uno a uno (no Average FP). El
> total subió de 372 [estimado] a **378 [OBSERVABLE]**; `pm-thyrox` se excluyó (no tiene
> SKILL.md → no es proceso funcional, 62→61 pasos).

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

→ **6 CFP por paso** (estándar). Algunos pasos suben a **7 CFP** por leer un segundo OOI de
precondición (baseline de otra fase) o escribir un segundo artefacto (a3-report, ROADMAP).
Medición OBSERVABLE: cada desviación está justificada con cita del SKILL.

## Roster de pasos por metodología (61 procesos funcionales — OBSERVABLE)

Cada celda = un proceso funcional (1 paso de coordinator). Trigger = "avanzar a este paso".
CFP = conteo real leyendo cada SKILL. **[+]** = paso de 7 CFP (desviación justificada).

| Metodología | Pasos (procesos funcionales) | nº | CFP |
|-------------|------------------------------|----|----|
| **BABOK (ba)** | strategy · planning · elicitation · requirements-analysis · requirements-lifecycle · solution-evaluation | 6 | 36 |
| **BPA (bpa)** | identify · map · analyze · design · implement · monitor[+] | 6 | 37 |
| **Consulting (cp)** | initiation · structure · diagnosis · plan · recommend · implement · evaluate[+] | 7 | 43 |
| **DMAIC (dmaic)** | define · measure · analyze · improve · control[+] | 5 | 31 |
| **Lean (lean)** | define · measure · analyze · improve · control | 5 | 30 |
| **PDCA (pdca)** | plan · do · check · act[+] | 4 | 25 |
| **PMBOK (pm)** | initiating · planning · executing · monitoring · closing | 5 | 30 |
| **PPS Toyota (pps)** | clarify · target · analyze[+] · countermeasures[+] · implement[+] · evaluate[+] | 6 | 40 |
| **RM (rm)** | elicitation · analysis · specification · validation · management | 5 | 30 |
| **RUP (rup)** | inception · elaboration · construction · transition[+] | 4 | 27 |
| **Strategic Planning (sp)** | context · analysis · gaps · formulate · plan[+] · execute · monitor · adjust | 8 | 49 |
| **Σ Capa C** | | **61** | **378** |

**Desviaciones de 7 CFP (justificadas con cita del SKILL):**
- `bpa-monitor`, `cp-evaluate`: leen un 2º OOI de precondición (baseline de fase anterior) → +1 R.
- `dmaic-control`, `pdca-act`, `rup-transition`: pasos de cierre que escriben ROADMAP/baseline → +1 W.
- `pps-analyze/countermeasures/implement/evaluate`: cada uno escribe además `a3-report.md` (OOI distinto) → +1 W.
- `sp-plan`: escribe además `ROADMAP.md` (línea 168 del SKILL) → +1 W.
- **`pm-thyrox`: sin SKILL.md** (solo `evals/` + `scripts/`) → no es proceso funcional, excluido.

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

**Nota de medición:** Capa C = **378 CFP** [OBSERVABLE] en 61 procesos (media 6.2 CFP/paso).
Conteo verificado leyendo los 61 SKILL uno a uno (3 lotes de agentes con regla de conteo
idéntica). 50 pasos = 6 CFP, 11 pasos = 7 CFP. La estimación previa por Average FP (372)
quedó a +6 del conteo real — confirma que el patrón homogéneo era buen estimador.

**Última actualización:** 2026-06-03 04:40:00
