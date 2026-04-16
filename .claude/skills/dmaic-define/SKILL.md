---
name: dmaic-define
description: "Use when starting a DMAIC Six Sigma project. dmaic:define — define project scope, create Project Charter, identify CTQs, map SIPOC, and get stakeholder alignment."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /dmaic-define — DMAIC: Define

> *"Define the problem correctly and you're 50% done. A vague problem statement is the root cause of most failed improvement projects."*

Ejecuta la fase **Define** de DMAIC. Produce el Project Charter aprobado que autoriza el proyecto de mejora.

**Tollgate:** Project Charter aprobado por sponsor antes de avanzar a Measure.

---

## Cuándo usar este paso

- Al iniciar un proyecto de mejora de proceso con metodología Six Sigma
- Cuando el problema requiere análisis estadístico riguroso (no solo un ciclo PDCA)
- Cuando el impacto en el negocio justifica un proyecto formal con sponsor y equipo

## Cuándo NO usar este paso

- Para mejoras simples que se pueden resolver en un ciclo PDCA — DMAIC es overhead para problemas pequeños
- Si el problema ya tiene causa raíz confirmada — ir directamente a Improve (o PDCA:Do)
- Sin sponsor identificado — DMAIC requiere autorización y recursos; sin sponsor, el proyecto no tiene tracción

---

## Actividades

### 1. Problem Statement — sin causas asumidas

El Problem Statement describe el síntoma observable con datos. Criterios de calidad:

| ✅ Buen Problem Statement | ❌ Mal Problem Statement |
|--------------------------|------------------------|
| *"El 18% de los pedidos se entrega fuera del plazo prometido (datos ene-mar 2026), generando $45K en créditos mensuales"* | *"El área de logística es ineficiente"* |
| Tiene número (18%, $45K) | Sin magnitud cuantitativa |
| Tiene período de tiempo | Vago y subjetivo |
| Describe síntoma, no causa | *"El sistema ERP es lento"* — asume causa |
| Tiene impacto en negocio | Sin conexión a consecuencia medible |

> Regla: si el Problem Statement menciona una solución o una causa, está mal — es hipótesis, no problema.

### 2. CTQ — Critical to Quality

CTQs son los atributos del proceso que el cliente considera críticos. Se derivan de la Voz del Cliente (VOC):

```
VOC (qué dice el cliente) → Necesidad (qué necesita realmente) → CTQ (cómo se mide)
```

Ejemplo:
- VOC: *"Los pedidos llegan tarde"*
- Necesidad: Entrega puntual
- CTQ: % de pedidos entregados en la fecha prometida ≥ 95%

### 3. SIPOC — mapa de alto nivel del proceso

El SIPOC define el alcance del proceso en 5 elementos:

| S — Suppliers | I — Inputs | P — Process | O — Outputs | C — Customers |
|---------------|-----------|------------|-------------|--------------|
| ¿Quién provee las entradas? | ¿Qué entra al proceso? | ¿Cuáles son los pasos principales (5-7 max)? | ¿Qué produce el proceso? | ¿Quién recibe los outputs? |

**Cómo construir el SIPOC:**
1. Empezar por el **Process** (columna del medio) — definir los 5-7 pasos de alto nivel
2. Definir los **Outputs** — qué produce ese proceso
3. Definir los **Customers** — quién usa esos outputs
4. Definir los **Inputs** — qué necesita el proceso para funcionar
5. Definir los **Suppliers** — quién provee esos inputs

### 4. Goal Statement — objetivo medible

Complementario al Problem Statement. Define adónde se quiere llegar:

```
Reducir [métrica CTQ] de [baseline] a [meta] para [fecha], 
manteniendo [otras métricas críticas] por encima de [umbral].
```

Ejemplo: *"Reducir el % de pedidos entregados fuera de plazo de 18% a menos de 5% para 2026-07-01, sin incrementar el costo de logística por unidad."*

### 5. Business Case — justificación formal

| Elemento | Contenido |
|----------|-----------|
| Impacto financiero actual | Costo del problema en $/período |
| Beneficio esperado | $/período si se alcanza el Goal Statement |
| Inversión estimada | Recursos, tiempo, costo del equipo |
| ROI estimado | Beneficio / Inversión |
| Riesgo de no hacer nada | ¿Qué pasa si el problema continúa? |

### 6. Scope — in / out

Delimitar explícitamente qué incluye y qué excluye el proyecto:

| In Scope | Out of Scope |
|----------|-------------|
| [Procesos, sistemas, áreas incluidos] | [Qué no se va a tocar] |

> Scope demasiado amplio = proyecto que nunca termina. Scope demasiado estrecho = solución parcial. El SIPOC ayuda a delimitar el scope.

### 7. Project Charter — documento formal

El charter integra todos los elementos anteriores:

| Campo | Contenido |
|-------|-----------|
| Proyecto | Nombre del proyecto |
| Sponsor | Quién autoriza y provee recursos |
| Team | Green Belt, Black Belt, miembros |
| Problem Statement | Ver actividad 1 |
| Goal Statement | Ver actividad 4 |
| Business Case | Ver actividad 5 |
| Scope | In / Out |
| CTQs | Ver actividad 2 |
| SIPOC | Ver actividad 3 |
| Timeline | Fechas estimadas por fase DMAIC |

---

## Artefacto esperado

`{wp}/dmaic-define.md` con el Project Charter completo siguiendo la estructura de las actividades.

---

## Red Flags — señales de Define mal ejecutado

- **Problem Statement que menciona una solución** — ej: *"Necesitamos un nuevo sistema"* es solución, no problema
- **CTQs sin número** — un CTQ sin métrica no se puede medir en Measure
- **SIPOC con demasiados pasos** — si el proceso tiene 20+ pasos en el SIPOC, el scope es demasiado amplio
- **Business case sin números** — *"mejorará la satisfacción del cliente"* no justifica un proyecto DMAIC
- **Scope que incluye todo** — *"todo el proceso de supply chain"* garantiza que el proyecto se alargue indefinidamente
- **Charter sin sponsor real** — si el sponsor es nominal (firma pero no se involucra), el proyecto no tendrá respaldo cuando necesite recursos

---

## Estado en now.md

```
methodology_step: dmaic:define
flow: dmaic
```

## Siguiente paso

Cuando el Project Charter está aprobado por el sponsor → `dmaic:measure`

---

## Limitaciones

- Define produce el alcance del proyecto; si el scope cambia significativamente durante Measure o Analyze, puede ser necesario regresar a revisar el charter
- La calidad del SIPOC depende del conocimiento del proceso — si el equipo no conoce bien el proceso, considerar Gemba walks o entrevistas antes de completar Define
- El tollgate (aprobación del sponsor) no es un formalismo; sin él, el proyecto no tiene autorización real para continuar
