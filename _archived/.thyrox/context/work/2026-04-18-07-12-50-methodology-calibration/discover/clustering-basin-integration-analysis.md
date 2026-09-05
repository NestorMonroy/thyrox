```yml
created_at: 2026-04-18 10:44:13
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: Unsupervised Clustering (ML) + Claude Architecture Part A REPAIRED + calibration-gaps analysis
tema: Integración de clustering como proxy observable de basin attractors para gates THYROX
```

# Clustering como Proxy Observable de Basin Attractors

## Problema que resuelve

El análisis adversarial de Part A REPAIRED identificó un problema no resuelto en `[^7]`:

> "h^(ℓ) vectors extracted via backward pass to hidden states"

Este protocolo requiere acceso a activaciones internas del modelo. Claude no expone hidden states vía API pública — ningún verificador externo puede replicarlo. Por consecuencia:

- `μ^(ℓ)` (centroid del basin) es **inobservable** por el método descrito
- `r` (radio del basin) es **inobservable**
- `d_basin^(ℓ)` es **inobservable**
- El argumento empírico de Sec 2.5.5 carece de protocolo replicable

**Clustering resuelve este problema.** El basin attractor es estructuralmente un cluster en el espacio de outputs — y clustering no supervisado puede aproximar `μ^(ℓ)`, `r`, y `d_basin` desde el exterior, sin acceso a hidden states.

---

## Sección 1: Equivalencia estructural — Basin = Cluster

### 1.1 Definición formal del basin (Cherukuri & Varshney Thm 5.9)

```
B^(ℓ)(r) = {h ∈ ℝ^d : ‖h - μ^(ℓ)‖₂ ≤ r}
μ^(ℓ) = E_{x ∈ C}[h^(ℓ)(x)]   donde C = contextos genéricos
```

### 1.2 Definición operacional de cluster (ML no supervisado)

```
Cluster K = {x_i : ‖x_i - c_K‖₂ ≤ r_K}   (hard clustering, Euclidean)
c_K = (1/|K|) Σ_{x_i ∈ K} x_i             (centroid = promedio)
```

### 1.3 Correspondencia directa

| Concepto basin (Part A) | Concepto clustering | Observable vía API? |
|------------------------|--------------------|--------------------|
| `μ^(ℓ)` — centroid del basin | `c_K` — centroid del cluster | **No** (hidden states) → **Sí** (clustering sobre outputs) |
| `r` — radio del basin | `r_K` — radio del cluster | **No** → **Sí** (distancia máxima al centroid en cluster) |
| `d_basin^(ℓ) = ‖h - μ‖₂` | `‖x - c_K‖₂` — distancia al centroid | **No** → **Sí** (distancia de output al centroid observable) |
| `B^(ℓ)(r)` — región del basin | Cluster K completo | **No** → **Sí** |
| `ν_dead^(ℓ)` — fracción muerta | Densidad del cluster genérico | Indirecto |

**Implicación:** Clustering no supervisado sobre outputs observables es el proxy replicable del basin analysis que Part A requería pero no podía entregar.

---

## Sección 2: Protocolo observable — μ^(ℓ) sin hidden states

### 2.1 Aproximación del centroid desde outputs

En lugar del "backward pass to hidden states" no replicable:

```
Protocolo observable:
1. Generar N inputs de contexto genérico (vacíos, single-token, ambiguos)
   C = {x₁, x₂, ..., x_N}  con N ≥ 50

2. Obtener outputs observables para cada input:
   O = {o₁, o₂, ..., o_N}  donde o_i puede ser:
   - Vector de logits (si accesible)
   - Embedding del output text (via modelo de embeddings externo)
   - Distribución sobre respuestas posibles

3. Computar centroid del cluster genérico:
   μ_obs = (1/N) Σ o_i   ← proxy observable de μ^(ℓ)

4. Para un input de tarea X:
   d_obs(X) = ‖o_X - μ_obs‖₂   ← proxy de d_basin^(ℓ)
```

**Condición de validez:** La correspondencia `μ_obs ≈ μ^(ℓ)` se sostiene si los outputs preservan suficiente información sobre el estado interno. Esta es una hipótesis operativa — verificable en Stage 9 PILOT comparando predicciones de `d_obs` con tasas reales de error.

### 2.2 Protocolo para radio r

```
r_obs = max_{x_i ∈ C} ‖o_i - μ_obs‖₂   ← límite del cluster genérico

Interpretación: un output X está "en basin" si d_obs(X) ≤ r_obs
```

### 2.3 Validación cruzada de ᾱ

El problema crítico identificado: `ᾱ ≈ 0.83` fue ajustado sobre los mismos datos que luego "valida" (circularidad de segundo orden).

Con clustering multi-tarea:

```
Para k tareas distintas T₁, T₂, ..., T_k:
1. Computar d_obs^(T_k) en múltiples layers (si accesibles) o en múltiples runs
2. Ajustar ᾱ en tareas T₁...T_{k-1}
3. Validar predicción sobre T_k (held-out)
4. Si error < ε en T_k → ᾱ tiene significado empírico real
   Si error ≫ ε → ᾱ es específico de CAP04, no generalizable
```

Esta prueba convertiría `ᾱ = 0.83` de INCIERTO a VERDADERO o FALSO — sin requerir acceso a hidden states.

---

## Sección 3: Aplicación a gates THYROX

### 3.1 Gate calibrado con clustering

El gate calibrado THYROX (arquitectura definida en Stage 1 DISCOVER) usa evaluadores paralelos + merger + router. Clustering se integra como Evaluador-Basin:

```
Stage N produce artefacto A
│
▼ [CHAINING]
Gate calibrado
│
▼ [PARALLELIZATION — evaluadores en paralelo]
├── Evaluador-Estructura:   ¿campos obligatorios presentes?      output_key="structural_result"
├── Evaluador-Evidencia:    ¿claims con ancla observable?        output_key="evidence_result"
├── Evaluador-Consistencia: ¿contradice estado acumulado del WP? output_key="consistency_result"
└── Evaluador-Basin:        ¿output en cluster genérico?         output_key="basin_result"
    │
    │  Protocolo interno:
    │  1. Obtener embedding del artefacto A
    │  2. Computar d_obs(A) = ‖emb(A) - μ_obs‖₂
    │  3. Si d_obs(A) ≤ r_obs → artefacto en basin genérico → flag
    │  4. Output: {en_basin: bool, d_obs: float, ratio: d_obs/r_obs}
    │
▼ [BARRERA de sincronización]
Merger (grounded exclusively on evaluator outputs)
│
▼ [ROUTING]
├── pass      → Stage N+1
├── rework    → diagnóstico específico por evaluador
├── escalate  → contradicción con decisión previa
└── unclear   → criterio del evaluador mal definido
```

### 3.2 Implementación práctica del Evaluador-Basin

```python
# Pseudocódigo — Evaluador-Basin para gate THYROX
import numpy as np
from sklearn.metrics.pairwise import euclidean_distances

def evaluador_basin(artifact_text, generic_baseline, threshold_ratio=1.0):
    """
    artifact_text: texto del artefacto a evaluar
    generic_baseline: lista de N outputs de contexto genérico (precomputado)
    threshold_ratio: multiplicador del radio (1.0 = radio exacto del cluster)
    """
    # Paso 1: Obtener embeddings observables
    emb_artifact = embed(artifact_text)         # modelo externo (no hidden states)
    emb_baseline = [embed(x) for x in generic_baseline]

    # Paso 2: Computar centroid y radio del cluster genérico
    mu_obs = np.mean(emb_baseline, axis=0)      # proxy de μ^(ℓ)
    r_obs = np.max(euclidean_distances(          # proxy de r
        emb_baseline, mu_obs.reshape(1, -1)
    ))

    # Paso 3: Distancia del artefacto al centroid
    d_obs = np.linalg.norm(emb_artifact - mu_obs)

    # Paso 4: Clasificación
    en_basin = d_obs <= (r_obs * threshold_ratio)

    return {
        "en_basin": en_basin,
        "d_obs": float(d_obs),
        "r_obs": float(r_obs),
        "ratio": float(d_obs / r_obs),  # < 1.0 = dentro del basin
        "flag": "riesgo_genericidad" if en_basin else "ok"
    }
```

**Condición de uso:** El baseline genérico (`generic_baseline`) debe precomputarse por tipo de stage, no ser universal. Un artefacto de Stage 1 DISCOVER tiene un centroid genérico diferente al de Stage 5 STRATEGY.

---

## Sección 4: Exit criteria como problema de clustering

### 4.1 Theorem 3.3 reformulado en términos de clustering

Theorem 3.3 (Cherukuri & Varshney): `ρ_var^(ℓ) ≥ C log(|A| + 1)`

En términos de clustering:

| Tipo de exit criterion | |A| | Clusters esperados | Separabilidad | AUROC esperado |
|------------------------|-----|-------------------|---------------|----------------|
| Predicado booleano (`archivo existe`) | 1 | 2 (sí/no) | Alta | ~0.91 |
| Predicado con rango (`N entre 3 y 5`) | 3 | 2-3 (pass/fail/borde) | Media | ~0.75 |
| Calidad subjetiva (`análisis suficiente`) | ∞ | Continuo | Baja | ~0.50 |

**Regla de diseño derivada:** Todo exit criterion de THYROX debe producir ≤ 3 clusters bien separados. Si un criterio produce clusters no separables, es señal de que el criterio necesita descomposición en predicados más atómicos.

### 4.2 Test de separabilidad de exit criteria

Antes de adoptar un exit criterion para un gate:

```
Test de separabilidad (Stage 9 PILOT):
1. Recolectar K artefactos históricos que pasaron el gate (positivos)
2. Recolectar K artefactos que no pasaron (negativos)
3. Aplicar clustering no supervisado sobre embeddings de ambos grupos
4. Medir silhouette score o within/between cluster distance ratio
5. Si separación alta → criterio verifiable → adoptar
6. Si separación baja → criterio ambiguo → descomponer en sub-predicados
```

---

## Sección 5: Conexión con ECE y calibración de gates

### 5.1 ECE via clustering

`ECE = Σ_B (n_B/N) |acc_B - conf_B|`

Los bins `B` de ECE pueden construirse via clustering:

```
En lugar de bins manuales por percentil de confianza:
1. Cluster artefactos históricos por similitud de output
2. Cada cluster K_i es un bin natural
3. Medir accuracy real en cada cluster: acc_{K_i}
4. Medir confidence promedio del gate en cada cluster: conf_{K_i}
5. ECE = Σ_i (|K_i|/N) |acc_{K_i} - conf_{K_i}|
```

**Ventaja:** Bins de clustering capturan estructura natural del espacio de artefactos — no dependen de umbral arbitrario de percentil.

### 5.2 Historial THYROX como corpus de calibración

THYROX tiene >40 WPs históricos. Cada WP contiene artefactos de múltiples stages. Este corpus permite:

```
Para cada stage S:
1. Extraer artefactos históricos de stage S
2. Etiquetar como pass/rework según gate decision histórica
3. Clustering sobre embeddings de artefactos
4. Medir separación entre cluster-pass y cluster-rework
5. Calibrar threshold de Evaluador-Basin sobre datos reales
```

Esto convierte el historial THYROX en el corpus de calibración empírica — sin necesidad de experimentos controlados separados.

---

## Sección 6: Pendientes para Stage 9 PILOT

| Experimento | Qué valida | Métrica |
|-------------|-----------|---------|
| Pilot-C1: baseline genérico por stage | Si μ_obs es estable por tipo de stage | Varianza del centroid entre runs |
| Pilot-C2: separabilidad de exit criteria | Si predicados booleanos son más separables que cualitativos | Silhouette score, AUROC |
| Pilot-C3: validación cruzada de ᾱ | Si ᾱ=0.83 generaliza entre tareas | Error de predicción en held-out |
| Pilot-C4: ECE por clustering vs bins manuales | Si clustering produce mejor calibración | ECE comparativo |
| Pilot-C5: Evaluador-Basin en gate histórico | Si d_obs predice rework en WPs pasados | Precision/Recall vs gate histórico |

---

## Síntesis

Clustering no supervisado resuelve el problema estructural más grave del análisis de Part A REPAIRED: el protocolo de medición de basin attractors requería acceso a hidden states no disponibles vía API. Con clustering sobre outputs observables, los tres parámetros centrales (`μ^(ℓ)`, `r`, `d_basin`) pasan de inobservables a aproximables empíricamente.

La integración produce cuatro mecanismos concretos para THYROX:

1. **Evaluador-Basin** como cuarto evaluador en gates calibrados — detecta artefactos en zona genérica
2. **Test de separabilidad** de exit criteria antes de adoptar un criterio en un gate
3. **ECE via clustering** para bins naturales en lugar de percentiles arbitrarios
4. **Validación cruzada de ᾱ** que convertiría el parámetro de INCIERTO a VERDADERO/FALSO

Los cinco experimentos PILOT (C1-C5) deben ejecutarse antes de fijar umbrales numéricos en los gates.
