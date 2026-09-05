```yml
created_at: 2026-04-18 07:12:50
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
current_phase: Phase 1 — DISCOVER
author: NestorMonroy
updated_at: 2026-04-18 07:12:50
```

# Risk Register — methodology-calibration (ÉPICA 42)

---

## Riesgos activos

### R-01: Caer en el mismo problema que se resuelve

**Descripción:** Al diseñar el mecanismo de calibración, agregar P values sin derivación empírica — exactamente el "realismo performativo" que este WP combate.

**Probabilidad:** P(ocurre)=0.6, P(no-ocurre)=0.4
**Derivación:** Patrón observado en ÉPICA 41 (deep-review v1 y v2 necesarios) y en el documento de arquitectura formal de Claude analizado en Stage 1.

**Impacto:** Alto — invalida el WP completo si ocurre.

**Mitigación:** Cada P en los nuevos templates debe tener campo `evidencia:` obligatorio. Si no hay evidencia observable, el campo se deja en `null` con nota explícita — no se inventa.

---

### R-02: Scope creep hacia routing y orchestration

**Descripción:** Durante Stage 3 ANALYZE emergen los problemas E-2 (handoff inter-coordinators) y E-3 (vista consolidada) del deep-dive de coordinación desacoplada, y se intenta resolverlos en este WP.

**Probabilidad:** P(ocurre)=0.5, P(no-ocurre)=0.5
**Derivación:** Histórico ÉPICA 41 que absorbió trabajo de ÉPICA 42 (declarado en risk-register de goto-problem-fix).

**Impacto:** Medio — alarga el WP y diluye el foco en calibración.

**Mitigación:** SP-07 gate-decision explícito. Si emerge routing/orchestration → diferir a ÉPICA 43.

---

### R-03: Fricción excesiva en stages de exploración

**Descripción:** El mecanismo de evidencia añade pasos obligatorios a stages de bajo riesgo (Stage 1 DISCOVER, Stage 5 STRATEGY), donde la exploración libre es el valor principal.

**Probabilidad:** P(ocurre)=0.4, P(no-ocurre)=0.6
**Derivación:** Tensión identificada en "Atributos de calidad" — practicidad vs calibración.

**Impacto:** Alto — si el sistema se vuelve más lento sin beneficio proporcional, no se adoptará.

**Mitigación:** Diferenciar por nivel de riesgo: stages de exploración (1, 2) usan evidencia opcional; stages de decisión (5, 6, 8) usan evidencia requerida.

---

### R-04: Templates incompatibles entre stages

**Descripción:** Los cambios en exit-conditions y risk-register no son coherentes entre stages — cada stage implementa "evidencia" de forma distinta.

**Probabilidad:** P(ocurre)=0.35, P(no-ocurre)=0.65
**Derivación:** Observado en ÉPICA 39 donde el renaming de fases fue inconsistente entre skills hasta deep-review.

**Impacto:** Medio — dificulta la comprensión y mantenimiento del sistema.

**Mitigación:** Definir el modelo de evidencia una vez en Stage 5 STRATEGY antes de modificar templates individuales.

---

## Riesgos cerrados

*(ninguno en Stage 1)*
