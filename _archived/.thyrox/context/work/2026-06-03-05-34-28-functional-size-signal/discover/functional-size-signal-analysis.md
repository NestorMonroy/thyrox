```yml
created_at: 2026-06-03 05:34:28
project: THYROX
work_package: 2026-06-03-05-34-28-functional-size-signal
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# DISCOVER — Señal funcional de tamaño en DISCOVER (anti ERR-002/006)

## Problema (de la revisión de errores, ÉPICA 46)

`workflow-discover/SKILL.md:24-31` clasifica el tamaño del WP **solo por Duración**
(`<30min` / `<2h` / `2-8h` / `>8h`) para decidir qué fases activar/omitir. Esa estimación es
subjetiva ("¿cuánto creo que tardaré?") y es la **causa raíz documentada de ERR-002 y su
reincidencia ERR-006**: subestimar el tamaño → saltar fases → trabajo sin estructura.

> ERR-002: "se evaluó la tarea aislada en vez del contexto completo" (93 archivos, 30+ commits
> clasificados como "proyecto pequeño <2h").

## Evidencia (OBSERVABLE)

- `workflow-discover/SKILL.md:21-32` — tabla de escalabilidad por Duración, único criterio.
- `references/scalability.md` — detalla por horas; además contiene estructura obsoleta
  (epics/, work-logs/, project.json — pre-THYROX actual). Fuera de scope arreglar eso aquí.
- `errors/project-size-misclassified.md` (ERR-002) + `errors/skipping-phases.md` (ERR-006).
- `research/errors-cosmic-relevance-review.md` (ÉPICA 46) — recomendación #1.

## Diseño de la solución — señal funcional objetiva (complemento, no reemplazo)

Añadir un **segundo eje objetivo** a la clasificación: ¿cuántos **procesos funcionales**
(UCs / componentes / capas) crea o modifica el WP? Es COSMIC aplicado al propio scoping: el
tamaño funcional no depende de "cuánto tardaré".

**Heurística (NO calibrada — marcada como tal, igual que calibration.md):**

| Tamaño | Duración (subjetiva) | Señal funcional (objetiva) |
|--------|----------------------|----------------------------|
| Micro | <30 min | 1 proceso funcional, 1 archivo, 1 capa |
| Pequeño | 30 min–2h | 2–3 procesos, pocos archivos, 1 capa |
| Mediano | 2h–8h | ~4–10 procesos, o toca 2+ capas/componentes |
| Grande | >8h | >10 procesos, o múltiples capas/features |

**Regla de desempate (lo que previene ERR-002/006):**
> Si la Duración y la señal funcional **discrepan**, usar la clasificación **MAYOR**.
> Nunca saltar fases por subestimar horas cuando el conteo funcional dice que es grande.

**Caveat (de calibration.md):** esto usa **conteo de procesos** (objetivo, disponible en
DISCOVER), NO CFP→horas (que requiere histórico de esfuerzo que THYROX no tiene). Es señal de
tamaño **relativo**, no estimación de cronograma.

## Scope

IN: añadir el eje "señal funcional" + regla de desempate a `workflow-discover/SKILL.md` y a
`references/scalability.md`; referenciar ERR-002/006 y COSMIC.
OUT: calibrar umbrales con datos (no hay aún); reescribir la estructura obsoleta de
scalability.md (deuda aparte); convertirlo en check de script duro (sin umbral calibrado).

## Gate / claims

OBSERVABLE (mecanismo actual leído; errores citados). La heurística de bandas es **INFERRED**
(derivada del baseline propio + ERR-002), marcada como no calibrada. No SPECULATIVE.

## Plan

DISCOVER (este) → IMPLEMENT (editar SKILL.md + scalability.md) → STANDARDIZE (lessons).
Cambio de guía, no de regla dura → no recorre todas las fases.

**Última actualización:** 2026-06-03 05:34:28
