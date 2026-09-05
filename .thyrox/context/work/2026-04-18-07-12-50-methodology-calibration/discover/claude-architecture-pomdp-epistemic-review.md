```yml
created_at: 2026-04-18 10:03:28
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-dive
status: Borrador
version: 1.0.0
fuente: "CLAUDE ARCHITECTURE AS DYNAMIC SYSTEM: FORMAL ANALYSIS — PART A v2.1 (2026-04-18)"
nivel_epistémico_promedio: MIXTO — PROBADO + CALIBRADO + INFERIDO
```

# Deep-Dive: Claude Architecture as Dynamic System — PART A

---

## Metadata del documento

- **Tipo:** Análisis formal — framework matemático aplicado a sistema LLM
- **Versión:** 2.1 (Phase 2.A)
- **Scope:** Sections 1-3 (Preliminaries, POMDP Framework, Basin Attractors) + Sec 4 (Guarantees)
- **Status declarado:** "Complete with CHI 2026 Empirical Validation"
- **Referencias citadas:** 6 papers (4 arXiv 2026, 1 2025, 1 CHI 2026 proceedings)

---

## Mapa de notación completo

| Símbolo | Definición exacta | Dominio | Observación |
|---------|------------------|---------|-------------|
| **x** | Input token sequence | ℕ* (variable length) | — |
| **h^(ℓ)(x)** | Hidden state en layer ℓ | ℝ^d, d=768-2048 | No observable externamente — solo logits expuestos |
| **ℓ** | Layer index | {0, 1, ..., L-1}, L≈40-80 | — |
| **μ^(ℓ)** | Basin centroid en layer ℓ | ℝ^d | Computed from "non-informative contexts" — definición de C es crítica |
| **d_basin^(ℓ)(x)** | Distancia radial al basin | ℝ₊ | = ‖h^(ℓ)(x) - μ^(ℓ)‖₂ |
| **B^(ℓ)(r)** | Hallucination basin (bola) | Subconjunto de ℝ^d | = {h : d_basin^(ℓ)(h) ≤ r} |
| **α_ℓ** | Coeficiente de contracción radial | [0, 1) | Por capa; ᾱ = max_ℓ α_ℓ |
| **f_ℓ** | Layer transformation | ℝ^d → ℝ^d | Attention + FFN + LayerNorm |
| **u_t** | Latent intent en step t | U (intent space) | No observable: lo que el modelo "cree estar resolviendo" |
| **b_t** | Belief state (posterior sobre u_t) | Δ(U) — simplex de probabilidad | — |
| **T_U** | Intent transition kernel | U × U → [0,1] | NON-STATIONARY: cambia por feedback, redefinición, acumulación |
| **T_U^(s)** | T_U en time-step s | — | T_U^(s) ≠ T_U^(s') para s ≠ s' |
| **H(·\|·)** | Conditional entropy | [0, ∞) bits | Shannon |
| **I(·,·\|·)** | Mutual information | [0, ∞) bits | I(A,B\|C) = H(A\|C)+H(B\|C)-H(A,B\|C) |
| **ECE** | Expected Calibration Error | [0, 1] | ∑_B (n_B/N)\|acc_B - conf_B\| |
| **ρ_var** | Variance ratio factual/alucinado | ℝ₊ | Var[factual] / Var[hallucinated] |
| **ρ_Fisher** | Fisher separation ratio | ℝ₊ | ‖μ_fact - μ_hall‖₂² / (tr Σ_fact + tr Σ_hall) |

---

## Claims por nivel epistémico

| Claim | Nivel | Fuente en doc | Implicación THYROX |
|-------|-------|--------------|-------------------|
| Trajectory trapping: α^(ℓ-ℓ₁) decay de distancia a basin | ✓ PROBADO | Thm 3.2 (Cherukuri & Varshney Thm 5.9) | Validación debe ocurrir ANTES de que el basin atrape el contexto |
| RACE: H(R,A\|Q) = H(R\|Q)+H(A\|Q)-I(R,A\|Q) | ✓ PROBADO | Sec 4.1 (Pesaranghader & Li) | Descomposición válida para medir razonamiento vs respuesta |
| Dunning-Kruger en LLMs (p < 0.001) | ~ VALIDADO | Sec 4.1 (Ghosh & Panday) | Los modelos sobreestiman su propia corrección — P(correcto) ≠ P(model dice correcto) |
| Factoid AUROC ~0.91, open-ended AUROC ~0.50 | ~ VALIDADO | Sec 3.5 (CHI 2026 PAPER023) | Exit criteria cuantificables son detectables; cualitativos no |
| ρ_var ≥ C log(\|A\|+1) para task complexity | ~ INFERIDO | Thm 3.3 (Cherukuri & Varshney Thm 5.11) | Verificabilidad de exit criterion depende del tamaño del answer space |
| ᾱ ≈ 0.835 (contracción promedio por capa) | ~ CALIBRADO | Sec 3.3, fit a datos CAP04 | Parámetro ajustado a UNA tarea (element counting) — no generalizable |
| d₀ ≈ 0.165 (distancia inicial al basin) | ~ CALIBRADO | Sec 3.3 | Ídem: calibrado en CAP04, no universal |
| db_t/dt ≈ 0.02 por iteración de feedback | ~ ESTIMADO | Sec 2.3 | "Quantitative Evidence" pero sin fuente primaria citada explícitamente |
| t_convergence ≈ 45 iteraciones | ~ ESTIMADO | Sec 2.3 | Derivado de db_t/dt estimado — hereda su incertidumbre |
| P(u_0\|user_query) ≈ 0.95 inicial | ~ INFERIDO | Sec 2.3 (CAP04 application) | Ilustrativo del problema, no medición directa |
| P(u_1\|feedback) < 0.20 en primer paso | ~ INFERIDO | Sec 2.3 | Consecuencia de T_U sticky, no medición directa |
| ECE(d_basin, H(R,A\|Q)) como forma funcional | ✗ PERFORMATIVO* | Sec 4.1 | *El doc lo marca explícitamente como INFERIDO — correcto, no usar sin calibración |
| λ₁=5, λ₂=0.8 (parámetros calibrados) | ~ CALIBRADO* | Sec 4.1 | *Doc los marca como "calibrated against empirical data but not uniquely identifiable" |

---

## Teoremas / resultados centrales

### Theorem 3.1 — Hallucination Basin (Cherukuri & Varshney, Thm 5.1)

**Enunciado:** B^(ℓ)(r) = {h ∈ ℝ^d : ‖h - μ^(ℓ)‖₂ ≤ r} con dos propiedades:
1. **Attraction:** trayectorias que entran en B^(ℓ)(r) permanecen atrapadas en capas posteriores
2. **Insensitivity:** h ∈ B^(ℓ)(r) produce distribuciones de output casi idénticas independientemente del input x

**Condiciones del teorema:** Requiere que μ^(ℓ) esté bien definido — depende de la existencia de "contextos no informativos" C. Si el dominio no tiene un baseline claro, el basin centroid no es computable. Doc lo reconoce en Sec 4.2.

**Nivel:** ✓ PROBADO (peer-reviewed)

**Implicación para THYROX:**
El "Insensitivity Property" es la causa arquitectónica del realismo performativo: una vez que el estado oculto entra en el basin, el modelo produce outputs plausibles independientemente del contexto. El modelo no puede distinguir entre "razoné correctamente" y "el basin me atrajo a una respuesta plausible". Esto explica por qué el mismo agente no puede evaluar la calidad de sus propios outputs — su mecanismo de evaluación tiene el mismo basin attractor.

### Theorem 3.2 — Radial Contraction (Cherukuri & Varshney, Thm 5.9)

**Enunciado:** Si capas ℓ₁...ℓ₂ son radialmente contractivas con α_ℓ < 1:
- ‖f_ℓ(h) - μ^(ℓ+1)‖₂ ≤ α_ℓ ‖h - μ^(ℓ)‖₂
- Entonces: ‖h^(ℓ)(x) - μ^(ℓ)‖₂ ≤ ᾱ^(ℓ-ℓ₁) × r

**Corolario del doc:** "Distance to basin centroid decays **exponentially** per layer. Once trapped, **escape is geometrically infeasible**."

**Nivel:** ✓ PROBADO (peer-reviewed)

**Implicación para THYROX:**
Este teorema formaliza por qué la validación debe ser EXTERNA y TEMPRANA. En datos CAP04: por layer 20 queda ~2% de distancia al basin centroid. La información sobre "qué es correcto" está geométricamente destruida para entonces. Corolario directo: si el gate de Stage 3 DIAGNOSE usa el mismo Claude que generó el artefacto de Stage 1 DISCOVER, ese Claude ya está en el basin que atrapó al generador — evalúa con el mismo sesgo que produjo el artefacto.

**PRECAUCIÓN sobre el parámetro ᾱ ≈ 0.835:** Este valor está calibrado sobre UNA tarea (element counting en CAP04). Sec 3.4 y 4.2 reconocen que puede no generalizar. No usar 0.835 como constante universal.

### Theorem 3.3 — Task Complexity Effect (Cherukuri & Varshney, Thm 5.11)

**Enunciado:** ρ_var^(ℓ) = Var[factual states] / Var[hallucinated states] ≥ C log(|A| + 1)

**Nivel:** ~ INFERIDO — el documento cita Thm 5.11 de Cherukuri & Varshney, pero la validación empírica (Sec 3.5) es de CHI 2026 PAPER023, que mide AUROC (no ρ_var directamente). La conexión entre el teorema y la validación empírica es inferida en el documento.

**Implicación para THYROX:**
|A| determina la verificabilidad del exit criterion. Cuando |A| = 1 (una respuesta correcta): separación factual/alucinado es alta, exit criterion es verificable con predicado booleano. Cuando |A| → ∞ (respuesta abierta): ρ_var → 0, el exit criterion NO puede ser verificado automáticamente. Esto valida la tabla de routing del WP: los evaluadores rule-based aplican a criterios con |A| pequeño; los LLM-based o human escalation aplican a |A| grande.

---

## El POMDP y la no-estacionariedad — implicación central

El documento formaliza que T_U (intent transition) es NON-STATIONARY porque cambia por:
1. **Feedback explícito del usuario**
2. **Redefinición de la tarea**
3. **Acumulación de contexto**

Y que T_U es "sticky" porque el reward R:
- **Recompensa respuestas confiadas** (independientemente de su corrección)
- **Penaliza cambiar de opinión** (modelo debe ser consistente)

Consecuencia cuantitativa:
- Velocidad de update del belief: `db_t/dt ≈ 0.02` (estimado)
- Tiempo para convergencia a b_∞ ≈ 0.90 en intent correcto: `t_convergence ≈ 45 iteraciones`

**Implicación directa para el WP:**
La arquitectura de gate calibrado no puede depender del mismo Claude que generó el artefacto para "actualizar su belief" sobre la calidad del artefacto. El POMDP formaliza que ese Claude está anclado a b_0 (el belief que tuvo mientras generó). Un evaluador externo independiente no tiene ese anchor — su b_0 no está sesgado por el proceso de generación. Este es el fundamento teórico de los evaluadores paralelos del Cap. 3.

---

## Limitaciones documentadas por los autores (Sec 4.2)

El documento es explícito — las cite exactas:

1. **"Hidden State Access":** "We assume access to h^(ℓ) for all layers. In practice, only logits are exposed; h^(ℓ) must be inferred from behavior."
   - Esto significa que d_basin^(ℓ) no es computable directamente en producción — todos los números de Sec 3.3 asumen acceso que no existe.

2. **"Basin Centroid Computation":** "μ^(ℓ) requires running model on non-informative contexts. This assumes such contexts exist; some domains may lack clear 'generic' baseline."
   - Si el dominio THYROX no tiene baseline claro, el basin centroid no es computable.

3. **"Causality vs Correlation":** "We observe d_basin↓ correlates with ECE↑, but cannot prove causality without intervention (retraining with explicit basin-distance penalties)."
   - La relación observada puede no ser causal.

4. **"Extrapolation":** "Measurements on CAP04 (element counting) may not generalize to other tasks."
   - ᾱ ≈ 0.835 y d₀ ≈ 0.165 son específicos de CAP04.

---

## Conexión con la restricción de Temporal Decay

La investigación web confirmó: `P(correcto) = P₀ × e^(-r×d)` es una adaptación de la fórmula de decaimiento radiactivo de física nuclear `N = N₀ × e^(-λt)`.

El documento ANALIZADO usa decaimiento exponencial para **distancia al basin centroid por capa**: `d_basin^(ℓ) = d₀ × ᾱ^(ℓ-ℓ₀)`.

Estas son dos fórmulas **fundamentalmente distintas**:

| | Decaimiento de basin (CORRECTO en el paper) | Temporal Decay (PROHIBIDO en THYROX) |
|--|---------------------------------------------|--------------------------------------|
| **Variable** | Distancia al centroid en capas del modelo | Probabilidad de corrección en el tiempo |
| **Parámetro α/r** | Mide contractilidad de layer ℓ (geométrico) | Mide "tasa de olvido" (sin ancla empírica para THYROX) |
| **Origen** | Teorema matemático de espacios métricos | Adaptación arbitraria de física nuclear |
| **Nivel epistémico** | ~ CALIBRADO (parámetros en datos CAP04) | ✗ PERFORMATIVO (parámetros inventados) |
| **Condición de validez** | Requiere acceso a h^(ℓ) (no disponible en producción) | No tiene condición de validez derivada |

El Theorem 3.2 NO justifica usar `P₀ × e^(-r×d)` para modelar probabilidad de corrección a lo largo del tiempo. Son dominios distintos.

---

## Gaps vs corpus THYROX

| Concepto del documento | Cubierto en references | Estado |
|----------------------|----------------------|--------|
| POMDP como framework para LLMs | — | ❌ Ausente — nuevo para el corpus |
| Basin attractor / hallucination basin | — | ❌ Ausente |
| Distinction PROVEN vs INFERRED en papers | `glossary.md` (partial) | ⚠️ Parcial — glossary menciona Anti-hallucination protocol |
| AUROC como métrica de verificabilidad | `development-methodologies.md` (evals) | ~ Relacionado pero no el mismo concepto |
| Non-stationary intent transition | — | ❌ Ausente — explica por qué el mismo agente no puede auto-validar |
| ECE (Expected Calibration Error) | — | ❌ Ausente — métrica directamente aplicable a claims de THYROX |

---

## Implicaciones para el WP activo — Stage 1 DISCOVER

### Implicación 1 — Fundamento teórico del evaluador externo (ALTA RELEVANCIA)

El Theorem 3.2 + POMDP non-stationarity demuestran (a nivel de framework formal) por qué el sistema de calibración DEBE usar evaluadores externos:

> Un Claude que generó artefacto A tiene belief state b_t anclado al proceso de generación de A. Su T_U es sticky. Evaluar A con ese mismo Claude no produce evaluación independiente — produce confirmación del basin que atrapó la generación.

Los evaluadores paralelos del gate calibrado (Cap. 3 del libro) tienen fundamento teórico en el POMDP: un evaluador que NO generó el artefacto no tiene b_t anclado al mismo intent. Su evaluación es epistémicamente independiente.

### Implicación 2 — Timing de la validación (ALTA RELEVANCIA)

Por Theorem 3.2: la información sobre "qué es correcto" decae exponencialmente por capa. En CAP04, por layer 20 queda ~2% de separación. Esto no es directamente aplicable a THYROX (no tenemos acceso a h^(ℓ)), pero el principio generaliza: la validación debe ocurrir **antes de que el contexto se "solidifique"** en el siguiente stage.

Aplicación práctica: el gate debe ejecutarse sobre el artefacto recién generado, con el contexto de Stage N todavía activo — no sobre un resumen del artefacto procesado por Stage N+1.

### Implicación 3 — Verificabilidad de exit criteria según |A| (ALTA RELEVANCIA)

Por Theorem 3.3: la separabilidad factual/alucinado depende de |A| (tamaño del answer space):
- Exit criterion con |A| = 1 (predicado booleano) → AUROC ≈ 0.91 → verificable automáticamente
- Exit criterion con |A| → ∞ (calidad subjetiva) → AUROC ≈ 0.50 → NO verificable automáticamente

Esto formalmente valida la distinción del WP entre:
- Exit criteria rule-based (|A| pequeño) → evaluador determinístico
- Exit criteria LLM-based (|A| semántico) → evaluador probabilístico con umbral
- Exit criteria arquitectónicos (|A| = juicio irreducible) → human escalation (SP)

### Implicación 4 — ECE como métrica operacional del gate (MEDIA RELEVANCIA)

El documento introduce ECE = ∑_B (n_B/N)|acc_B - conf_B| como métrica de calibración.

ECE = 0 significa que cuando el modelo dice "estoy 70% seguro", acierta exactamente 70% de las veces. ECE alto significa el modelo está mal calibrado — confianza ≠ corrección.

Para THYROX: si el merger del gate emite `pass` con 80% de confianza pero históricamente esa confianza solo predice corrección el 40% del tiempo, el gate tiene ECE alto y debe recalibrarse.

**LIMITACIÓN:** ECE requiere datos históricos de gates anteriores (n_B por bin). En Stage 1 del primer WP no hay historial — ECE no es computable. Se vuelve útil en ÉPICA 3+ cuando hay suficiente historial de gates.

### Implicación 5 — El documento mismo como modelo de rigor epistémico (ALTA RELEVANCIA)

La Sec 4.1 del documento estructura explícitamente "PROVEN vs INFERRED". Este es el modelo de cómo THYROX debería estructurar sus propios claims:

```
✓ PROVEN: salida de herramienta ejecutada (bash, grep, read)
~ CALIBRATED: derivado de historial WP con parámetros ajustados
~ INFERRED: razonamiento explícito sobre evidencia observable
? ESTIMATED: juicio informado, marcado explícitamente
✗ PERFORMATIVE: afirmación sin fuente verificable
```

El gate calibrado debe clasificar cada claim del artefacto según este esquema antes de emitir veredicto.

---

## Recomendaciones para Stage 3 DIAGNOSE

1. **Crear `calibration-framework.md` en references/** incluyendo:
   - ECE como métrica de calibración a largo plazo (una vez haya historial)
   - La tabla de niveles epistémicos (PROVEN/CALIBRATED/INFERRED/ESTIMATED/PERFORMATIVE)
   - El principio de independencia epistémica de evaluadores (fundamento en POMDP)

2. **Extender `glossary.md`** con:
   - `Basin Attractor`: región del espacio de estados ocultos que captura trayectorias independientemente del input
   - `ECE (Expected Calibration Error)`: métrica de calibración de confianza vs corrección
   - `Non-stationary POMDP`: modelo formal de por qué el mismo agente no puede auto-validar

3. **Definir el contrato del evaluador de gate** con campo `nivel_epistémico` por cada claim evaluado — no solo `pass/fail` sino la clasificación de por qué pasa o falla.

4. **NO usar ᾱ ≈ 0.835 ni d₀ ≈ 0.165 como constantes** en ningún artefacto THYROX — son parámetros calibrados en CAP04 (element counting), no universales, y además requieren acceso a h^(ℓ) que no existe en producción.
