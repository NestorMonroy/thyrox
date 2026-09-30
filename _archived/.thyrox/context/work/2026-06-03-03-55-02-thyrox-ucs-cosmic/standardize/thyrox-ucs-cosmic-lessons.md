```yml
created_at: 2026-06-03 04:28:08
project: THYROX
work_package: 2026-06-03-03-55-02-thyrox-ucs-cosmic
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Borrador
```

# Lessons learned — thyrox-ucs-cosmic

## Resultado del WP

Primer **baseline COSMIC de THYROX = 677 CFP (OBSERVABLE)** en 4 capas FSM (A 108 · B 46 ·
C 378 · D 145). FUR documentados como product docs en `docs/requisitos/casos-uso/`. Skill
`cosmic` validado sobre el propio framework. Decisión: `decisions/adr-cosmic-baseline.md`.
Propagado a `ARCHITECTURE.md` (ADR-009 + sección "Tamaño funcional").

## Lecciones

### L-1 — El scope de la medición es la decisión que más mueve el resultado
La primera medición (154 CFP) cubría solo interfaz+motor; el audit reveló que era ~23% del
producto. La causa raíz no fue un error de conteo sino una **decisión de scope** declarada en
`measurement-strategy.md` ("coordinators = contenido, no core"). **Lección:** en COSMIC,
explicitar y validar el scope con el ejecutor **antes** de medir; un scope estrecho no
declarado se lee como under-count.

### L-2 — El audit de cobertura debe correr contra el codebase, no contra el inventario
El inventario DISCOVER decía 33 procesos; `ls`/`grep` del repo mostró 21 comandos + 84 skills
+ 29 agentes. **Lección:** auditar completitud de UCs **siempre** contra la superficie real
verificada (find/grep), nunca contra el documento de inventario (que hereda el sesgo de scope).

### L-3 — Early-sizing (Average FP) fue buen estimador, pero la lectura una-a-una destapa hechos
El patrón homogéneo estimó 668 CFP; el conteo OBSERVABLE dio 677 (error ~1.3%). El orden de
magnitud no cambió, pero la lectura individual reveló cosas invisibles a la estimación:
`pm-thyrox` sin SKILL.md (no es proceso), 11 pasos de 7 CFP, y el defecto TD-044.
**Lección:** usar Average FP para encuadrar y priorizar; refinar a OBSERVABLE cuando la cifra
va a un baseline durable o a una decisión.

### L-4 — Medir con COSMIC encuentra defectos de diseño "gratis"
Contar movimientos de `deep-review` (W=0) reveló que su `tools:` no incluía Write pese a que
su cuerpo exige persistir hallazgos → TD-044, ya corregido. **Lección:** la medición funcional
es también una forma de auditoría de coherencia tools-vs-comportamiento de agentes.

### L-5 — Paralelizar con regla de conteo idéntica permite reconciliar
4 lotes de agentes midieron capas C y D en paralelo. Pasarles la **misma regla de conteo
verbatim** (de `measurement-strategy.md`) hizo que los subtotales reconciliaran sin re-trabajo.
**Lección:** al fan-out de medición, el contrato de conteo debe ser idéntico y explícito.

## Propagación (qué se estandariza)

- **ADR permanente:** `decisions/adr-cosmic-baseline.md` (baseline 677 CFP, 4 capas FSM).
- **ARCHITECTURE.md:** ADR-009 + sección "Tamaño funcional (COSMIC baseline)".
- **Product docs durables:** `docs/requisitos/casos-uso/{interface,engine,methodology,agent}-ucs.md`.
- **Deuda técnica:** TD-044 (deep-review) abierto→resuelto en este WP.
- **Regla operativa futura:** mantener el baseline por capa al añadir comandos/hooks/pasos/agentes
  (medición de cambio COSMIC).

## Pendientes (no bloquean cierre)

- Refinar capa A/B si se añaden comandos (hoy completas).
- Re-medir cuando UC-ENG-14 (SubagentStop, PR #4) se mergee a la canónica → +1 proceso capa B.

**Última actualización:** 2026-06-03 04:28:08
