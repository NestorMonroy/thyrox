```yml
created_at: 2026-06-03 04:14:00
project: THYROX
work_package: 2026-06-03-03-55-02-thyrox-ucs-cosmic
phase: Phase 11 — TRACK/EVALUATE
author: NestorMonroy
status: Borrador
```

# Audit-report — Cobertura de UCs vs superficie funcional real de THYROX

> Disparado por el ejecutor: «considero que THYROX tiene muchos más UCs». Auditoría de
> **completitud del inventario de UCs**, no de ejecución del WP. Regla del auditor:
> verificar, no inferir — todo conteo abajo es OBSERVABLE (comandos `ls`/`grep` en el repo).

## Veredicto

**PARTIAL — GRADE C.** Los 33 UCs son correctos pero cubren un **scope estrecho**
(framework core: interfaz + motor). La superficie funcional real de THYROX incluye **dos
capas más sin UCs** (coordinators de metodología + agentes) y **2 comandos de interfaz no
mapeados**. La medición COSMIC de 154 CFP es válida **solo para ese scope estrecho**.

## Evidencia — superficie funcional real (verificada)

| Superficie | Cant. | Cubierto por 33 UCs | Gap |
|------------|-------|---------------------|-----|
| Comandos `/thyrox:*` (`.claude/commands/*.md`) | **21** | 19 | `structure`, `workflow_init` sin UC |
| Skills `workflow-*` (motor de 12 fases) | 13 | sí (UC-INT + UC-ENG) | — |
| **Coordinators de metodología** (ba6·bpa6·cp7·dmaic5·lean5·pdca4·pm6·pps6·rm5·rup4·sp8) | **62** | **0** | **capa entera sin UCs** |
| **Agentes** (`.claude/agents/*.md`) | **29** | **0** | sin UCs (deep-dive, pattern-harvester, task-planner, gate-evaluator, etc.) |
| Skills tech/dominio (nodejs, react, mysql, …, cosmic, thyrox) | 9 | n/a | contenido, no proceso del framework |
| Scripts/hooks (`.claude/scripts/`) | 23 archivos | parcial (13 UC-ENG) | utilidades sin UC propio |

Comandos: `ls .claude/commands/*.md | wc -l` → 21.
Skills: `ls -d .claude/skills/*/ | wc -l` → 84 (13 workflow + 62 metodología + 9 otros).
Agentes: `ls .claude/agents/*.md | wc -l` → 29.

## Hallazgo sistémico (PAT-001)

La `measurement-strategy.md` declaró explícitamente fuera de scope «coordinators de
metodología … son contenido, no procesos del framework core». **Esa decisión de scope es la
causa raíz del under-count**, no un error de conteo. Es defendible para medir *el core*,
pero **no** para responder «cuántos UCs tiene THYROX como producto».

## Re-encuadre: THYROX tiene (al menos) 4 capas funcionales (FSM)

| Capa (FSM) | Procesos | Estado UC | CFP |
|------------|----------|-----------|-----|
| A — Interfaz (comandos/skills) | ~21 | 20 escritos (falta `structure`) | 108 (medido) |
| B — Motor (hooks/generadores) | 13 | 13 escritos | 46 (medido) |
| **C — Coordinators de metodología** | **62** | **0** | **pendiente** |
| **D — Agentes** | **29** | **0** | **pendiente** |

> Capa C es la de mayor volumen: 11 metodologías × sus pasos. Cada paso de coordinator es un
> proceso funcional (recibe contexto del WP → lee templates/estado → escribe artefacto de
> fase + actualiza `methodology_step` → emite siguiente paso). Patrón homogéneo ≈ 4-6 CFP.

## Estimación temprana de las capas faltantes [ESTIMACIÓN TEMPRANA]

Marcada **SPECULATIVE** (I-012) — no es medición, es encuadre con early-sizing (banda media
COSMIC ≈ 4-6 CFP/proceso, calibration.md):

- Capa C (62 procesos × ~4-6 CFP) ≈ **250-370 CFP**.
- Capa D (29 agentes × ~4-6 CFP) ≈ **115-175 CFP**.
- **THYROX completo (4 capas)** ≈ orden de **500-700 CFP**, no 154. La cifra de 154 CFP es
  el **core** (A+B), ~25-30% del total. No usar para decisiones hasta medir C y D.

## Action plan (ordenado por prioridad)

1. **[ALTA] Decisión de scope del ejecutor** — ¿«UCs de THYROX» = core (A+B) o producto
   completo (A+B+C+D)? Determina si 154 CFP es la respuesta o un subconjunto. (BLOQUEANTE)
2. **[ALTA] UC-INT-21 STRUCTURE** — falta el comando `structure`/`workflow-structure` en
   `interface-ucs.md`. Gap dentro del scope ya aceptado → corregir aunque se mantenga estrecho.
3. **[MEDIA] Capa C — UCs de coordinators** — escribir UCs (1 por paso o 1 por metodología
   con sub-pasos) en `docs/requisitos/casos-uso/methodology-ucs.md` y medir.
4. **[MEDIA] Capa D — UCs de agentes** — UCs de los 29 agentes en `agent-ucs.md` y medir.
5. **[BAJA] `workflow_init`** — decidir si es UC público o utilidad de bootstrap (¿no-UC?).

## Score

| Dimensión | Peso | Resultado |
|-----------|------|-----------|
| Conteo de los 33 UCs correcto y trazable | 30% | PASS |
| Cobertura de la superficie funcional total | 40% | PARTIAL (A+B sí; C+D no) |
| Scope declarado explícitamente | 15% | PASS (estaba en strategy) |
| CFP no sobre-aplicado fuera de scope | 15% | PASS (capas C/D marcadas pendientes) |

**Score = (0.30 + 0.5×0.40 + 0.15 + 0.15) / 1.0 = 65% → GRADE C.**

---

⏸ **Gate Stage 11→12:** el ejecutor decide el scope (action item 1) antes de cerrar el WP.
Si se elige producto completo, el WP vuelve a DISCOVER/MEASURE para capas C y D.

**Última actualización:** 2026-06-03 04:14:00
