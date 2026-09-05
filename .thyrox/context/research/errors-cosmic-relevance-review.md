```yml
type: Investigación
created_at: 2026-06-03 05:36:00
project: THYROX
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Revisión de los errores documentados (.thyrox/context/errors) a través de la lente COSMIC

> Pedido del Ejecutor: revisar todos los errores documentados para COSMIC. Corpus: 21 archivos
> (ERR-001..030 + cosmic-session-manual-errors.md + README). Triage por señales de
> tamaño/medición/conteo (grep) + lectura de los relevantes.

## Veredicto honesto

De 21 registros, **solo 3 son COSMIC-relevantes ALTA**; el resto son errores de proceso
THYROX generales (saltar gates de aprobación, ADRs faltantes, work-log, spec-validation…) sin
relación con dimensionamiento funcional. No fuerzo conexiones donde no las hay.

## Mapeo (solo los relevantes; el resto = NULA)

| Error | Tema | Relevancia | ¿Check determinístico lo previene? |
|-------|------|------------|-------------------------------------|
| **ERR-002** | Clasificación incorrecta de tamaño del proyecto | **ALTA** | PARCIAL — un tamaño objetivo (CFP / nº procesos funcionales) da señal que la heurística de horas no |
| **ERR-006** | Saltar fases (reincidencia de ERR-002) | **ALTA** | PARCIAL — misma raíz: tamaño mal estimado → fases saltadas |
| **cosmic-session-manual-errors** | 8 errores de aritmética/colocación de esta sesión | **ALTA** | SÍ — `tally-cfp.py` + `verify-cosmic-baseline.sh` ya los cubren |
| ERR-030 | "artefacto creado ≠ fase aprobada" | MEDIA | NO — gate humano, no medible |
| ERR-025 | WP sin timestamp completo | BAJA | SÍ (pero no es COSMIC — es regla I-004) |

## Los 3 más conectados — y el patrón

**ERR-002 + ERR-006 son el mismo error, reincidente:** clasificar el tamaño del proyecto
**por tiempo subjetivo** (`<2h` / `2-8h` / `8h+`) y, al subestimarlo, **saltar fases**. La
causa raíz documentada: "se evaluó la tarea aislada en vez del contexto completo". Es una
estimación de tamaño **sin medida objetiva**.

**Aquí entra COSMIC:** da un tamaño funcional **objetivo** (CFP / nº de procesos funcionales)
independiente de "cuánto creo que tardaré". Un WP que toca 20 procesos funcionales **no es
pequeño**, aunque cada uno parezca rápido. La heurística de horas es justo lo que falló dos
veces; un conteo objetivo de procesos funcionales es la señal que faltaba.

## Qué habría prevenido un baseline COSMIC objetivo

- ERR-002/006: si la clasificación de tamaño incluyera "¿cuántos procesos funcionales/UCs
  toca este WP?", la subestimación "proyecto pequeño" se habría caído sola (eran 93 archivos,
  30+ commits → muchos procesos).
- Los errores de esta sesión (aritmética 677, colocación): el tooling determinístico
  (`tally-cfp.py`, `verify-cosmic-baseline.sh`) ya los previene a futuro.

## Caveat de calibración (no sobre-vender)

COSMIC da **tamaño**, no horas. THYROX **no tiene histórico de esfuerzo** (regla en
`calibration.md` tras ÉPICA 46): no se puede mapear CFP→horas. Pero **sí** se puede usar el
tamaño funcional como señal **relativa y objetiva** de "esto no es pequeño" — que es
exactamente lo que ERR-002/006 necesitaban.

## Recomendaciones accionables

1. **Complementar la clasificación de tamaño de WP con señal funcional** (no solo horas):
   en DISCOVER, contar procesos funcionales/UCs que el WP toca; si supera un umbral, no es
   "pequeño" → no saltar fases. Targetea la raíz de ERR-002/006. *(candidato a guideline o
   a check en validate-phase-readiness, no a regla dura hasta calibrar el umbral).*
2. **No** intentar CFP→horas sin histórico de esfuerzo (ya está en `calibration.md`).
3. Los errores de aritmética/colocación: cubiertos; mantener `verify-cosmic-baseline.sh` como
   gate (considerar correrlo en CI).

## No-relevantes a COSMIC (registrado para cerrar la revisión)

ERR-001/003/004/005/019/020/021/022/023/024/026/027/028/029, agent-state-lifecycle: son
errores de proceso/estructura/estado del framework, sin relación con dimensionamiento. No
requieren acción desde COSMIC.

**Última actualización:** 2026-06-03 05:36:00
