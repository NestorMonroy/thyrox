```yml
created_at: 2026-06-03T02:34:13
project: THYROX
work_package: 2026-06-03-02-13-59-cosmic-sizing
phase: Phase 5 — STRATEGY
author: NestorMonroy
status: Borrador
```

# Diseño del skill COSMIC (THYROX)

> Basado en la metodología COSMIC v5.0 calibrada de **e-comerce** (`e-comerce-docs:
> source/gestion/pm/docs/iniciativas/adoptar-cosmic-dimensionamiento/`), que adopta los
> manuales oficiales en `source/referencias/cosmic/` (cosmicv402, cosmicp1-3, cosmices…).
> Generalizado para que cualquier proyecto THYROX pueda dimensionar funcionalmente.

## 1. Decisión de diseño

**Skill standalone `cosmic`** (método de medición de tamaño funcional), invocable desde la
fase **MEASURE/BASELINE** (Stage 2). No es un coordinator de metodología de gestión: es una
**capacidad de medición** que `workflow-baseline` puede usar, análoga a cómo `dmaic-measure`
mide proceso — pero `cosmic` mide **tamaño funcional del software** (CFP, ISO 19761).

Ubicación: `.claude/skills/cosmic/` (SKILL.md + references/ + assets/).

## 2. Frontmatter del SKILL.md

```yml
name: cosmic
description: "Dimensionamiento funcional COSMIC v5.0 (ISO/IEC 19761). Usar cuando se
  quiera medir el tamaño funcional de software en CFP: mapear procesos funcionales y sus
  movimientos de datos (Entry/Exit/Read/Write), estimar esfuerzo desde FUR/casos de uso, o
  calibrar benchmarks. Encaja en la fase MEASURE/BASELINE."
allowed-tools: Read Glob Grep Bash
```
(Respeta I-007 allowed-tools, I-008 description "Usar cuando…".)

## 3. Estructura del SKILL.md (las 3 fases del procedimiento COSMIC)

El SKILL guía el **procedimiento de 3 fases** (no inventado — es el de COSMIC v5.0):

### Fase A — Measurement Strategy
Definir: **propósito**, **scope** y **functional users** y la **boundary**. Regla clave
(Principio 6): **una medición FSM se limita a UNA sola capa** (UI, API, DB, server son
capas separadas → mediciones independientes). Fijar el **nivel de granularidad** (no
mezclar niveles de descomposición — Principio de comparabilidad).

### Fase B — Mapping
De los **FUR** (fuente exclusiva, Regla 3 — en THYROX: los casos de uso / requirements-spec
del WP), derivar:
- **Procesos funcionales** (1 por **evento desencadenante** único — P-GSM-6).
- **Data groups** (un grupo por **object of interest**).
- **Movimientos de datos** por proceso: **Entry / Exit / Read / Write** (P-GSM-3).
- Excluir NFR (no cuentan CFP).

### Fase C — Measurement
- Tamaño del proceso = nº de movimientos (P-GSM-8). **Mínimo 2 CFP** (Regla 10c: 1 Entry +
  1 Exit o Write).
- Un (tipo, data group) se cuenta **una vez por proceso**.
- Tamaño total = Σ procesos dentro del scope/capa.
- Registrar en la **tabla COSMIC Format** (ver assets).

## 4. references/ (cargadas bajo demanda)

| Reference | Contenido | Fuente |
|-----------|-----------|--------|
| `principles.md` | Los 17 principios (7 Contexto + 10 Genérico) condensados, con los que más pesan (P6, P-GSM-2/3/6/8, Reglas 3 y 10c) | cosmicp1/p2 |
| `data-movements.md` | E/X/R/W con criterios de identificación + casos límite (navegación/cómputo = 0 CFP) | cosmicv402 |
| `layers.md` | Capas como FSM separados (UI/API/DB/server); cómo decidir la boundary y functional users por capa | DEC-COSMIC-001/006 e-comerce |
| `estimation.md` | Aproximación temprana cuando falta detalle (Average FP, Equal-size bands) + benchmarks calibrados vs genéricos (cosmices §6: Small≈3.9, Medium≈6.9) | cosmices + guia-estimacion e-comerce |
| `calibration.md` | Cómo calibrar umbrales de atomicidad por capa (e-comerce: api=8 CFP, UC-INV-02=7, UC-AUTH-02=8) — **calibrar por proyecto, no extrapolar** | calibracion-*-cfp e-comerce |

> Los manuales completos (`cosmicv402.txt`, etc., ~860KB) **NO se vendorizan** (I-002/peso):
> se citan; el proyecto que los necesite los referencia desde su propia copia.

## 5. assets/ (templates de output)

- `cosmic-format-table.md.template` — la tabla de medición (no-intrusiva, se añade al UC/FUR):
  columnas **Paso · Sub-proceso (FUR) · FU · OOI · Tipo (E/X/R/W) · CFP · FUR-fuente** + total.
- `measurement-strategy.md.template` — propósito/scope/functional users/boundary/granularidad.

## 6. Integración con THYROX

- **Fase:** se invoca en **BASELINE** (Stage 2) como medición de tamaño funcional del software
  a construir/medir. Entrada: los FUR/UCs de DISCOVER/DESIGN. Salida: CFP por proceso + total
  por capa.
- **Registry:** añadir `cosmic` a `.thyrox/registry/` (no es metodología de gestión → no
  `methodologies/*.yml`; es skill de medición). Documentar en ARCHITECTURE.
- **No-intrusión:** la anotación COSMIC se añade como sección al final del UC, sin modificar
  sus partes (principio e-comerce).

## 7. Qué se adopta vs se generaliza

| e-comerce (específico) | THYROX (generalizado) |
|------------------------|------------------------|
| Capas = sus 4 submódulos (api/ui/db/server) | "Capa = un FSM; identifícalas por proyecto" |
| Umbral atomicidad api = 8 CFP | "Calibra el umbral por capa con tus datos" |
| FUR = `source/requisitos/casos-uso/` (UC PARTE 1-7) | FUR = casos de uso / requirements-spec del WP |
| Anotación en `.rst` | Anotación en `.md` (I-003) |

## 8. Plan de build (siguiente fase — PLAN EXECUTION)

T-001 `SKILL.md` (3 fases + reglas) · T-002 references/principles+data-movements · T-003
references/layers+estimation+calibration · T-004 assets/2 templates · T-005 registrar en
registry + ARCHITECTURE · T-006 piloto: medir 1 proceso del buy-flow end-to-end (cuando haya
acceso/insumo) como validación.

## Gate / claims

Todo en este diseño es **OBSERVABLE** (leído de e-comerce-docs + manuales COSMIC). La
estimación de CFP del buy-flow sigue **SPECULATIVE** hasta el piloto (I-012).

---

**Última actualización:** 2026-06-03T02:34:13
