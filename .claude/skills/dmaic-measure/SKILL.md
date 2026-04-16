---
name: dmaic-measure
description: "Use when establishing a quantitative baseline in a DMAIC project. dmaic:measure — define measurement plan, collect process data, calculate Sigma Level baseline, and validate measurement system."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /dmaic-measure — DMAIC: Measure

> *"In God we trust. All others must bring data." — W. Edwards Deming*

Ejecuta la fase **Measure** de DMAIC. Establece el baseline cuantitativo del proceso con un sistema de medición validado.

**Tollgate:** Baseline con Sigma Level calculado y MSA realizado antes de avanzar a Analyze.

---

## Cuándo usar este paso

- Cuando el Project Charter de Define está aprobado
- Para establecer con datos dónde está el proceso actualmente
- Para confirmar que el sistema de medición es confiable antes de confiar en los datos

## Cuándo NO usar este paso

- Sin Problem Statement y CTQs definidos en Define — Measure necesita saber qué medir
- Si ya existe un baseline reciente y confiable — documentarlo y avanzar a Analyze
- Si el proceso cambia significativamente durante la recolección — los datos son de un proceso en transición, no del proceso estable

---

## Actividades

### 1. Plan de medición

Antes de recopilar un solo dato, definir:

| ¿Qué? | ¿Cómo? | ¿Cuándo? | ¿Quién? | ¿Fuente? |
|-------|--------|----------|---------|---------|
| [CTQ principal] | [Instrumento/sistema] | [Frecuencia] | [Responsable] | [BD/sistema/manual] |
| [CTQs secundarios] | | | | |
| [Variables de proceso a monitorear] | | | | |

### 2. Determinar el tipo de dato — define qué análisis aplica

| Tipo de dato | Características | Métricas adecuadas | Herramientas |
|-------------|-----------------|-------------------|-------------|
| **Continuo** | Tiempo, temperatura, peso, costo | Media, desviación, Cp/Cpk | Histograma, control charts X-bar/R |
| **Discreto / Atributo** | Defecto sí/no, categoría | Proporción defectuosa, DPU, DPMO | p-chart, np-chart, Pareto |
| **Conteo** | Número de defectos por unidad | DPU, u-chart | c-chart, u-chart |

> Si tienes datos continuos, no los conviertas a atributo (ej: "cumple / no cumple") — perderás información valiosa sobre la distribución del proceso.

### 3. MSA — Measurement System Analysis

El MSA valida que el sistema de medición es confiable antes de confiar en los datos.

| Pregunta | Herramienta |
|----------|-------------|
| ¿Los medidores están midiendo lo mismo? (Reproducibilidad) | Gauge R&R |
| ¿El mismo medidor da el mismo resultado si mide lo mismo dos veces? (Repetibilidad) | Gauge R&R |
| ¿El instrumento está calibrado? (Exactitud) | Calibración / comparación con estándar |
| ¿El atributo se clasifica consistentemente? (para datos discretos) | Kappa de Cohen |

**Criterios de aceptación del MSA (Gauge R&R):**
- `%GR&R < 10%` → Sistema de medición aceptable
- `10% ≤ %GR&R < 30%` → Aceptable condicionalmente; documentar y monitorear
- `%GR&R ≥ 30%` → Sistema de medición no confiable → corregir antes de continuar

> Si el MSA falla, los datos que recopiles no son confiables — todo el análisis de Analyze será inválido. No omitir el MSA.

### 4. Recopilar datos — muestreo representativo

| Principio | Aplicación |
|-----------|-----------|
| **Tamaño de muestra** | Para proporciones: n ≥ 30 para datos estables; para eventos raros, más |
| **Período de recolección** | Suficiente para capturar variabilidad normal: turnos, días, semanas |
| **Estratificación** | Recopilar por subgrupo (turno, máquina, operador, región) para poder analizar en Analyze |
| **Datos del proceso, no del producto** | Medir el proceso mientras ocurre, no solo el resultado final |

### 5. Calcular métricas baseline

**Para datos de atributo (defectos):**

```
DPU = Defectos totales / Unidades totales

DPMO = (Defectos totales / (Unidades × Oportunidades de defecto)) × 1,000,000

Sigma Level ≈ conversión desde tabla DPMO:
  DPMO 308,537 → 2σ
  DPMO  66,807 → 3σ
  DPMO   6,210 → 4σ
  DPMO     233 → 5σ
  DPMO       3.4 → 6σ
```

**Para datos continuos (variables):**

```
Cp = (USL - LSL) / (6σ)          ← capacidad potencial (proceso centrado)
Cpk = min[(USL - μ)/3σ, (μ - LSL)/3σ]   ← capacidad real (considera centrado)

Cpk < 1.0 → proceso no capaz
Cpk 1.0-1.33 → proceso marginalmente capaz
Cpk > 1.33 → proceso capaz
```

### 6. Process Capability — análisis de capacidad

Responder: ¿Qué tan capaz es el proceso actual de cumplir los límites de especificación?

| Herramienta | Propósito |
|-------------|-----------|
| **Histograma + límites de especificación** | Ver visualmente cuánta producción cae fuera de spec |
| **Gráfica de control** | Determinar si el proceso está en control estadístico |
| **Capability plot** | Cp, Cpk, % fuera de especificación |

> Importante: Cp/Cpk solo son válidos si el proceso está en control estadístico. Si las gráficas de control muestran causas especiales, corregirlas primero.

---

## Artefacto esperado

`{wp}/dmaic-measure.md` — Estructura mínima:

```markdown
## Plan de medición
[Tabla: qué, cómo, cuándo, quién, fuente]

## Tipo de dato
[Continuo / Discreto — justificación]

## Resultados del MSA
- %GR&R: [valor]
- Conclusión: [aceptable / condicional / rechazado]

## Datos recopilados
- Período: [inicio → fin]
- Tamaño de muestra: [n]
- Resumen estadístico: [media, desviación, rango]

## Baseline del proceso
- DPU: [valor] / DPMO: [valor] / Sigma Level: [valor]  ← datos atributo
- Cp: [valor] / Cpk: [valor]  ← datos continuos

## Análisis de capacidad
[Histograma + conclusión: proceso capaz / no capaz]
```

---

## Red Flags — señales de Measure mal ejecutado

- **Sin MSA** — datos sin validación del sistema de medición son potencialmente inútiles
- **Muestra no representativa** — datos de un solo turno, un solo día, condiciones atípicas
- **Datos de resultado, no de proceso** — medir solo si el cliente se queja, no el proceso que genera el problema
- **Convertir datos continuos a binario innecesariamente** — se pierde sensibilidad para detectar mejoras
- **Baseline sin período definido** — *"tomamos datos de hace un tiempo"* no es un baseline confiable
- **Ignorar estratificación** — si no se desagrega por turno/máquina/operador, Analyze no podrá identificar fuentes de variación

---

## Estado en now.md

```
methodology_step: dmaic:measure
flow: dmaic
```

## Siguiente paso

Cuando el baseline está establecido y el MSA validado → `dmaic:analyze`

---

## Limitaciones

- Este skill guía el proceso de medición; las herramientas estadísticas específicas (Minitab, R, Python statsmodels) están fuera de scope
- Para procesos con alta complejidad estadística (múltiples correlaciones, no-normalidad severa), considerar la ayuda de un Black Belt o estadístico
- El cálculo de Sigma Level asume la convención Six Sigma estándar (incluye el shift de 1.5σ de largo plazo)
