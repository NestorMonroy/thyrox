```yml
type: ADR
estado: Aprobado
created_at: 2026-06-03T04:28:08Z
```

# ADR — Baseline COSMIC de THYROX: 677 CFP en 4 capas FSM

## Contexto

Tras crear el skill `cosmic` (ver `adr-cosmic-skill.md`) y validarlo en un piloto, se midió el
**tamaño funcional del propio THYROX** como primer baseline del producto. El WP
`2026-06-03-03-55-02-thyrox-ucs-cosmic` documentó los Functional User Requirements en
`docs/requisitos/casos-uso/` y aplicó COSMIC v5.0 (ISO/IEC 19761).

Un audit de cobertura reveló que un primer alcance (solo interfaz + motor = 154 CFP) cubría
~23% del producto: faltaban la capa de coordinators de metodología y la de agentes.

## Decisión

Se adopta como **baseline funcional de THYROX = 677 CFP (OBSERVABLE)**, medido en **4 capas
tratadas como FSM independientes (Principio 6 COSMIC — no se suman como tamaño comparable)**:

| Capa FSM (COSMIC) | Procesos | CFP | Fuente FUR |
|-------------------|----------|-----|------------|
| A — Interfaz (comandos/skills) | 20 | 108 | `interface-ucs.md` |
| B — Motor (hooks/generadores) | 13 | 46 | `engine-ucs.md` |
| C — Coordinators de metodología | 61 | 378 | `methodology-ucs.md` |
| D — Agentes | 29 | 145 | `agent-ucs.md` |
| **THYROX completo (agregado)** | **123** | **677** | — |

> **Nota de desambiguación:** estas capas FSM (A/B/C/D) son del modelo COSMIC y **no** son las
> "4 capas de coordinators" (Intake/Routing/Coordinators/Signals) de la sección *Arquitectura
> de Coordinators*. Son ejes distintos: una mide tamaño funcional, la otra describe routing.

## Consecuencias

- **Trazabilidad:** los FUR viven en `docs/requisitos/casos-uso/` como product docs durables;
  re-medibles sin reescribir (no-intrusión). Cada cifra es OBSERVABLE (cada movimiento mapea a
  un paso del UC o a una sección del SKILL/agente leído).
- **Benchmark:** comparar siempre **capa-con-capa del mismo nivel**, nunca el agregado contra
  una sola capa de otro sistema (Principio 6). El core (A+B = 154) es ~23%; la capa C
  (metodología) es la dominante (56%).
- **Mantenimiento:** al añadir un comando, hook, paso de coordinator o agente, sumar su CFP a
  la capa correspondiente (medición de cambio COSMIC = movimientos añadidos+modificados+borrados).
- **Hallazgos del conteo OBSERVABLE** (correcciones permanentes):
  - `pm-thyrox` no tiene SKILL.md → no es proceso funcional (la capa C son 61, no 62, pasos).
  - `structure`/`workflow_init` son alias de `design`/`init` → no son UCs adicionales.
  - `deep-review` tenía `tools:` sin Write pese a persistir hallazgos → corregido (TD-044).

## Estado de claims

OBSERVABLE — todas las cifras derivan de lectura directa de comandos, SKILLs y agentes del repo
(verificado con `ls`/`grep`/lectura una-a-una en 4 lotes de agentes con regla de conteo idéntica).
El early-sizing previo (668 CFP) reconcilió con el conteo OBSERVABLE (677) a +9 CFP (~1.3%).

## Referencias

- `docs/requisitos/casos-uso/{interface,engine,methodology,agent}-ucs.md`
- WP `2026-06-03-03-55-02-thyrox-ucs-cosmic/measure/thyrox-cosmic-measurement.md`
- `adr-cosmic-skill.md` (decisión del skill `cosmic`)
