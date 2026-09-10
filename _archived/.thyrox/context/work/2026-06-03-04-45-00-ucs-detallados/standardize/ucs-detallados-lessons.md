```yml
created_at: 2026-06-03 05:05:00
project: THYROX
work_package: 2026-06-03-04-45-00-ucs-detallados
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Lessons learned — ucs-detallados

## Resultado

Los **123 procesos funcionales** de THYROX llevados de "granularidad COSMIC" a **UC formal
completo** (actor+secundarios/trigger/precondición/flujo principal con E·X·R·W/flujo alterno/
flujo de excepción/postcondición/datos/criterios de aceptación Given-When-Then). 86 UCs nuevos
(59 metodología + 27 agentes) + profundización de los 37 existentes. Product docs durables:
`docs/requisitos/casos-uso/{interface,engine,methodology,agent}-ucs.md` (v3.0.0).

CFP por capa conservados y verificados: A 108 · B 46 · C 376 · D 145 = **675 CFP**.

## Lecciones

### L-1 — Profundizar destapó un error aritmético del baseline
Escribir los UCs formales obligó a re-sumar capa C: RUP era **25** (6+6+6+7), no 27 — el conteo
ÉPICA 44 tenía un error de subtotal. Total real **675**, no 677. **Lección:** los CFP por-paso
eran correctos; el fallo estuvo en la agregación. Verificar subtotales con `paste -sd+ | bc`,
no a mano. (La regla calibration-verified-numbers aplica también a sumas internas.)

### L-2 — Fan-out con CFP bloqueado + QA de reconciliación
Se delegaron 90 UCs (C 61 + D 29) a 4 agentes en paralelo, pasándoles el **CFP por-proceso
bloqueado** del baseline (no recalcular). Dos agentes reportaron mal su *subtotal* (lote1 dijo
110, real 116; D dijo 144, real 145) pero los valores **por-UC** eran correctos. **Lección:** al
consolidar output de agentes, re-derivar los totales desde las líneas por-ítem (`grep COSMIC`),
nunca confiar en el resumen que el agente reporta.

### L-3 — Ensamblar por slicing evita arrastrar ruido del agente
Cada borrador traía su propia tabla-resumen (con el subtotal erróneo). Ensamblar tomando solo
de la 1ª `## UC-` a la última `COSMIC:` (descartando encabezados y resúmenes del agente) +
añadir un resumen propio correcto, mantuvo limpio el doc final. **Lección:** los agentes
producen contenido; el orquestador controla la estructura y los agregados.

### L-4 — El detalle se calibra al propósito (dos niveles legítimos)
ÉPICA 44 produjo UCs a granularidad de *sizing* (suficiente y correcta para CFP). ÉPICA 45 los
llevó a granularidad de *especificación* (precond/postcond/acceptance). Ambos niveles son
válidos para su fin. **Lección:** declarar el propósito del artefacto antes de juzgar si "está
con detalle" — la pregunta correcta es "¿con detalle para qué?".

## Propagación

- `docs/requisitos/casos-uso/*-ucs.md` → v3.0.0 (123 UCs formales).
- Corrección 677→675 / capa C 378→376 propagada a: ARCHITECTURE.md (ADR-009 + sección),
  ROADMAP.md (ÉPICA 44+45), focus.md, y addenda en WP44 (measurement + adr-cosmic-baseline).
- ADR aprobado NO reescrito (inmutable) → addendum de corrección.

## Pendiente

- Cierre del WP: requiere orden explícita del Ejecutor (I-011).
- UC-ENG-14 (SubagentStop) tras merge PR #4 → +1 UC capa B, re-medir.

**Última actualización:** 2026-06-03 05:05:00
