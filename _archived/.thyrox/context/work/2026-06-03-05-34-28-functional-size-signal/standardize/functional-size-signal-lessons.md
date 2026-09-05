```yml
created_at: 2026-06-03 05:34:28
project: THYROX
work_package: 2026-06-03-05-34-28-functional-size-signal
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Lessons learned — functional-size-signal

## Resultado

`workflow-discover` ahora clasifica el tamaño del WP por **dos ejes**: Duración (subjetiva) +
**señal funcional objetiva** (nº de procesos funcionales/UCs/capas que toca), con **regla de
desempate** "si discrepan, gana la mayor". Ataca la raíz de ERR-002/006 (subestimar horas →
saltar fases). Es COSMIC aplicado al propio scoping de THYROX.

## Cambios

- `workflow-discover/SKILL.md` — tabla de escalabilidad con columna "Señal funcional" + regla
  de desempate + caveat de no-calibración.
- `workflow-discover/references/scalability.md` v1.1 — sección "Clasificar por DOS ejes".
- `errors/{project-size-misclassified,skipping-phases}.md` — nota de mitigación (ERR-002/006).

## Lecciones

### L-1 — La medición objetiva del propio proceso previene la subestimación recurrente
ERR-002 reincidió como ERR-006 porque la única señal de tamaño era la percepción de horas. Un
**conteo objetivo** (procesos funcionales) da un contrapeso que no se deja sesgar por "creo que
es rápido". El principio de COSMIC (medir por lo que el software hace, no por lo que se tarda)
aplica al scoping tanto como a la medición.

### L-2 — Heurística honesta > umbral falso
No hay datos para calibrar el umbral exacto (cuántos procesos = "mediano"). En vez de inventar
un número con falsa precisión, se deja como **banda heurística marcada no-calibrada** + regla
de desempate conservadora. Coherente con la regla de calibration.md (no CFP→horas sin histórico).

### L-3 — Cerrar el loop error→mitigación
Anotar la mitigación en el propio registro de error (ERR-002/006) hace trazable que el error
documentado efectivamente derivó en un cambio. El error deja de ser solo memoria; es un ciclo.

## Pendiente / deuda

- `scalability.md` arrastra estructura obsoleta (epics/, work-logs/, project.json) — fuera de
  scope de esta ÉPICA; candidata a limpieza futura.
- Calibrar el umbral de la señal funcional cuando haya datos de varios WPs.

**Última actualización:** 2026-06-03 05:34:28
