```yml
created_at: 2026-04-17 02:37:50
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Análisis: Origen de los methodology skills y landscape completo

## Propósito

Conectar la investigación fundacional de THYROX (V3.1 + análisis crítico del flujo) con el plan de actualización del SKILL.md para asegurar que la arquitectura documentada sea correcta y extensible.

---

## Los dos documentos fundacionales

### Documento 1 — V3.1: Compilación de marcos metodológicos

Identificó **15 estructuras metodológicas** distribuidas en:
- 12 marcos metodológicos (procesos completos)
- 3 frameworks/técnicas (estructuras de análisis)

**Hallazgo universal confirmado:** todos los marcos comienzan con Identify/Define/Understand ANTES de Analyze — sin excepciones. Este hallazgo validó el ordenamiento del ciclo THYROX.

### Documento 2 — Análisis crítico del flujo universal

Derivó el flujo corregido de **14 pasos** que se convirtió en las 12 fases THYROX mediante merges:

| Paso original | → | Stage THYROX |
|--------------|---|-------------|
| DISCOVER | → | Stage 1 DISCOVER |
| DEFINE METRICS | → | Stage 2 BASELINE (absorbido) |
| MEASURE | → | Stage 2 BASELINE |
| ANALYZE | → | Stage 3 DIAGNOSE |
| DEFINE CONSTRAINTS | → | Stage 4 CONSTRAINTS |
| STRATEGY | → | Stage 5 STRATEGY |
| PLAN | → | Stage 6 SCOPE |
| DESIGN/SPECIFY | → | Stage 7 DESIGN/SPECIFY |
| PLAN EXECUTION | → | Stage 8 PLAN EXECUTION |
| PILOT/VALIDATE | → | Stage 9 PILOT/VALIDATE |
| EXECUTE | → | Stage 10 IMPLEMENT |
| MONITOR | → | Stage 10 IMPLEMENT (paralelo) |
| TRACK/EVALUATE | → | Stage 11 TRACK/EVALUATE |
| STANDARDIZE | → | Stage 12 STANDARDIZE |

Los bucles de retroalimentación (PILOT falla → ANALYZE, TRACK falla → ANALYZE) se mapearon a los gates del modelo de permisos (Plano A).

---

## De 15 frameworks a 6 methodology skills — la selección de ÉPICA 40

ÉPICA 40 implementó **6 de los 12 marcos metodológicos** del V3.1 como methodology skills:

| Marco V3.1 | Implementado | Namespace |
|------------|-------------|-----------|
| PDCA | ✅ | `pdca:` (4 skills) |
| DMAIC / Six Sigma | ✅ | `dmaic:` (5 skills) |
| RUP / SDLC iterativo | ✅ | `rup:` (4 skills) |
| Business Analysis | ✅ | `ba:` (6 skills) |
| Strategic Planning / Strategic Management | ✅ (parcial) | `pm:` (5 skills — PMBOK) |
| Requirements Management (derivado de BA) | ✅ | `rm:` (5 skills) |

**Total implementado: 29 skills en 6 namespaces**

---

## Marcos del V3.1 no implementados como methodology skills

| Marco V3.1 | Razón probable de no implementación | Posible namespace futuro |
|------------|-------------------------------------|--------------------------|
| SDLC | Cubierto parcialmente por RUP (iterativo); waterfall fuera de foco THYROX | `sdlc:` |
| Lean Six Sigma | Combina Lean + DMAIC; DMAIC ya implementado; Lean como extensión | `lean:` o extensión de `dmaic:` |
| Problem Solving 8-step (Toyota) | Cubierto por PDCA + DMAIC en su intersección | `ps8:` |
| Strategic Planning | Parcialmente cubierto por `pm:` (PMBOK) | `sp:` |
| Strategic Management | No es marco de proyecto — es gestión continua | — |
| Consulting Process (General) | Framework genérico, superpuesto con THYROX mismo | — |
| Consulting Process (Thoucentric) | Variante del anterior | — |
| Business Process Analysis (BPA) | Cubierto parcialmente por `ba:` y `dmaic:` (VSM) | `bpa:` |

**Técnicas (no marcos completos):**
| Técnica V3.1 | Estado | Relación |
|-------------|--------|---------|
| Root Cause Analysis (RCA) | Como herramienta dentro de skills (fishbone en pdca, dmaic) | No requiere skill propio |
| Framework Analysis | Investigación cualitativa — fuera del scope THYROX actual | — |
| NASA Logical Decomposition | Técnica de ingeniería — fuera del scope actual | — |

---

## Implicación para el SKILL.md

El plan actual (`plan/thyrox-skill-update-plan.md`) define la sección "Methodology skills" como una tabla de **6 namespaces fijos**. Esto es arquitecturalmente incorrecto: el framework fue diseñado desde V3.1 para soportar cualquiera de los 15 estructuras investigadas.

**Lo que el SKILL.md debe comunicar:**

```
NO:  "Los methodology skills disponibles son: pdca, dmaic, rup, rm, pm, ba"
     (implica: conjunto cerrado y completo)

SÍ:  "Los methodology skills actualmente implementados son 6; el framework
      soporta incorporar cualquier marco metodológico adicional siguiendo
      el patrón {metodología}-{paso} + declaración de THYROX Stage"
     (implica: conjunto abierto y extensible)
```

**Mecanismo de extensión** — cualquier nuevo methodology skill debe:
1. Nombre: `{metodología}-{paso}` (ej: `lean-map`, `bpa-identify`)
2. Declarar `**THYROX Stage:**` en su SKILL.md
3. Declarar `flow:` y `methodology_step:` en su sección `## Estado en now.md`
4. Tener anatomía completa: SKILL.md + assets/ + references/

---

## Gap adicional identificado para el plan

El `plan/thyrox-skill-update-plan.md` debe incorporar una **Adición 7**:

**A7 — Nota de extensibilidad en sección "Methodology skills"**

Agregar después de la tabla de 6 metodologías:

```markdown
> **El framework es extensible.** Los 6 namespaces listados son los methodology skills
> implementados actualmente. Cualquier marco metodológico puede incorporarse siguiendo
> el patrón `{metodología}-{paso}` con declaración de `THYROX Stage:` en su SKILL.md.
> Ver [anatomy guide] para crear un nuevo methodology skill.
```

---

## Validez de los documentos fundacionales

| Documento | Estado | Observación |
|-----------|--------|-------------|
| V3.1 — Compilación de marcos | ✅ Válido | Base de selección de los 6 namespaces; 8 marcos sin implementar son candidatos futuros |
| Análisis crítico del flujo | ✅ Válido | El flujo de 14 pasos → 12 stages THYROX es correcto; los bucles están en el modelo de permisos |
| Hallazgo universal (Identify before Analyze) | ✅ Válido | Justifica el orden DISCOVER → DIAGNOSE en el ciclo THYROX |
