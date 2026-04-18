```yml
created_at: 2026-04-18 07:12:50
project: THYROX
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Stage 1 DISCOVER — methodology-calibration (ÉPICA 42)

---

## 1. Objetivo / Por qué

THYROX se declaró sistema de Agentic AI (ÉPICA 41) y tiene arquitectura de coordinación desacoplada (ÉPICA 40). Sin embargo, su metodología opera como si P(correcto) ≈ 1.0 en cada artefacto: los análisis afirman calidad sin derivarla, las exit conditions son binarias sin umbral de confianza, los risk registers usan "Alta/Media/Baja" sin distribución completa de probabilidad.

Esto produce **realismo performativo**: el sistema usa la apariencia de rigor (stages, gates, artefactos) sin el mecanismo de validación que le daría sustancia. Un Agentic AI que no puede razonar sobre su propia incertidumbre no cumple con la identidad que declaró.

**El cambio concreto:** pasar de *afirmar* calidad a *requerir evidencia* para afirmarla.

---

## 2. Stakeholders

| Stakeholder | Necesidad |
|-------------|-----------|
| NestorMonroy (usuario activo) | Saber cuándo confiar en el output de THYROX sin re-verificar manualmente |
| Claude (motor de ejecución) | Instrucciones que distingan cuándo generar vs cuándo validar con herramientas |
| Futuros contributors | Metodología cuya calidad es visible y verificable, no implícita |

---

## 3. Uso operacional

**Hoy:** El usuario recibe un análisis de Stage 3, una estrategia de Stage 5, o un task plan de Stage 8. No sabe cuánto confiar sin releerlos completos. Los artefactos no declaran su propio nivel de confianza ni qué evidencia los respalda.

**Después:** Cada artefacto de stage tiene una sección de evidencia explícita. Las exit conditions incluyen un umbral de confianza derivado de evidencia observable (herramientas ejecutadas, triangulación). El usuario puede leer la sección de evidencia en 30 segundos y decidir si el artefacto requiere revisión o puede avanzar.

---

## 4. Atributos de calidad

| Atributo | Definición en este WP |
|----------|-----------------------|
| **Verificabilidad** | Cada claim en un artefacto tiene fuente de evidencia identificable (bash output, triangulación, human gate) |
| **Calibración** | El umbral de confianza declarado corresponde a la confianza real (no overconfidence de ~15%) |
| **Mantenibilidad** | El mecanismo de evidencia es parte del template — no requiere disciplina extra por sesión |
| **Practicidad** | No añade fricción innecesaria a stages de bajo riesgo (exploración, brainstorming) |

---

## 5. Restricciones

| Restricción | Origen |
|-------------|--------|
| Markdown only (I-003) | No se puede usar DB o código para tracking de confianza |
| No inventar P sin derivación | El problema que estamos resolviendo — agregar P sin evidencia es la misma trampa |
| Cross-cutting — toca 12 stages | Cambios en templates deben ser coherentes entre stages o no son calibración real |
| Compatibilidad retroactiva | Los WPs existentes no se reescribiran — el mecanismo aplica a WPs nuevos |

---

## 6. Contexto / Sistemas vecinos

**Lo que existe hoy y se relaciona:**

- `workflow-*/SKILL.md` — cada skill tiene exit criteria binarios (presente/ausente) sin confianza
- `assets/risk-register.md.template` — campos `probability` y `impact` son texto libre, no P cuantificada
- `assets/exit-conditions.md.template` — gates binarios sin umbral de confianza
- `workflow-audit/SKILL.md` — auditor que evalúa calidad pero con scoring propio, no integrado al ciclo de stages
- El motor Claude — P(correcto sin validación) ≈ 0.70-0.80, P(con tool use) ≥ 0.999 (documentado externamente)

**La brecha:** existe un motor probabilístico (Claude), existe un auditor post-hoc (`workflow-audit`), pero no existe un mecanismo dentro del ciclo de stages que requiera evidencia antes de declarar un artefacto completo.

---

## 7. Fuera de alcance

| Ítem | Razón |
|------|-------|
| Routing automático de coordinator (8.1 ÉPICA 41) | Requiere WP separado — diferente capa de problema |
| Multi-coordinator orchestration (8.2) | ÉPICA 42+ — handoff inter-coordinators es arquitectura, no calibración |
| Reescribir artefactos de WPs cerrados | Retrocompat: I-002 (git es la única persistencia) |
| Inventar P sin datos | Contra-principio: es el problema que resolvemos |
| Agente `agentic-reasoning` | Puede emerger de este WP, pero no es el WP mismo |

---

## 8. Criterios de éxito

**Verificables al cierre del WP:**

1. Los templates de las 3 stages de mayor riesgo (Stage 3 ANALYZE, Stage 5 STRATEGY, Stage 8 PLAN EXECUTION) tienen sección de evidencia estructurada
2. `risk-register.md.template` tiene campos P con instrucción de derivación (no texto libre)
3. `exit-conditions.md.template` tiene umbral de confianza con protocolo de verificación
4. Al ejecutar Stage 1 DISCOVER en un WP nuevo, el análisis declara explícitamente qué es observación directa vs inferencia
5. El mecanismo no añade más de 10 minutos a un stage mediano

---

## Stopping Point Manifest

| SP | Stage | Tipo | Evento | Acción requerida |
|----|-------|------|--------|-----------------|
| SP-01 | 1→3 | gate-fase | Stage 1 DISCOVER completo | Validar 8 aspectos + risk register → confirmar avance a Stage 3 ANALYZE |
| SP-02 | 3→5 | gate-fase | Stage 3 ANALYZE completo | Confirmar diagnóstico de brechas de calibración antes de diseñar estrategia |
| SP-03 | 5→6 | gate-fase | Stage 5 STRATEGY completo | Aprobar estrategia de cambios en templates antes de scope |
| SP-04 | 6→8 | gate-fase | Stage 6 PLAN/SCOPE completo | Aprobar scope (qué stages/templates se modifican) |
| SP-05 | 8→10 | gate-fase | Stage 8 PLAN EXECUTION completo | Autorizar implementación de cambios en templates |
| SP-06 | 10→11 | gate-fase | Stage 10 IMPLEMENT completo | Confirmar que implementación cumple criterios de éxito antes de TRACK |
| SP-07 | scope | gate-decision | Si emerge trabajo de routing/orchestration durante análisis | Decidir: diferir a ÉPICA 43 vs incluir en este WP |
