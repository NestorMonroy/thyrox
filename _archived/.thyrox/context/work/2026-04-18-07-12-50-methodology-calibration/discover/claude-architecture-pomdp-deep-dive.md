```yml
created_at: 2026-04-18 10:25:00
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-dive
status: Borrador
version: 1.0.0
fuente: "CLAUDE ARCHITECTURE AS DYNAMIC SYSTEM: FORMAL ANALYSIS — PART A v2.1 (2026-04-18)"
veredicto_síntesis: PARCIALMENTE VÁLIDO — frameworks correctos, aplicación con saltos lógicos, datos empíricos contradichos por las propias limitaciones del documento
saltos_lógicos: 4
contradicciones: 3
engaños_estructurales: 5
nota: Complementa claude-architecture-pomdp-deep-dive.md (clasificación epistémica). Este archivo aplica metodología de 6 capas de disección adversarial.
```

# Deep-Dive (6 capas): Claude Architecture as Dynamic System — PART A

---

## CAPA 1: LECTURA INICIAL — Qué dice el documento

El documento presenta tres tesis articuladas en secuencia:

**Tesis 1 (Sec 2):** Claude opera como un POMDP no-estacionario. Su "latent intent" u_t cambia durante la inferencia y el kernel de transición T_U es "sticky" (resistente a actualización) porque el reward de entrenamiento premia respuestas confiadas y penaliza cambiar de opinión.

**Tesis 2 (Sec 3):** Las representaciones internas de Claude convergen a "basins de alucinación" (Hallucination Basins), según los Teoremas de Cherukuri & Varshney (2026). La distancia al centroid del basin decae exponencialmente por capa (ᾱ ≈ 0.835), de modo que para la capa 20 solo queda ~2% de la separación original — la información sobre "qué es correcto" queda geométricamente destruida.

**Tesis 3 (Sec 4):** El documento provee garantías formales distinguiendo lo PROBADO (peer-reviewed) de lo INFERIDO (calibrado), presentando esto como rigor epistémico.

**Propuesta implícita:** Estos tres elementos juntos explican formalmente por qué Claude alucina y por qué es difícil corregirlo mediante feedback.

---

## CAPA 2: AISLAMIENTO DE CAPAS

### Sub-capa A: Frameworks teóricos

| Framework | Validez en su dominio | Fuente |
|-----------|----------------------|--------|
| POMDP ⟨U, S, A, O, T_U, T_E, R, T_obs⟩ | ✓ Framework establecido en IA y control | Literatura estándar |
| Cherukuri & Varshney Thm 5.1 (Basin Definition) | ? No verificable sin acceso al paper arXiv:2604.04743v1 | arXiv 2026 (no peer-reviewed en journal) |
| Cherukuri & Varshney Thm 5.9 (Radial Contraction) | ? Ídem | arXiv 2026 |
| Cherukuri & Varshney Thm 5.11 (Task Complexity) | ? Ídem | arXiv 2026 |
| RACE: H(R,A\|Q) = H(R\|Q)+H(A\|Q)-I(R,A\|Q) | ✓ Descomposición de información válida (teoría de la información) | Pesaranghader & Li (arXiv 2601) |
| Dunning-Kruger en LLMs (p < 0.001) | ✓ Resultado empírico reportado | Ghosh & Panday (arXiv 2603) |
| CHI 2026 PAPER023 AUROC | ✓ Resultado empírico de conferencia | CHI 2026 |

**Observación sobre los arXiv papers:** El documento los cita como "Peer-Reviewed". arXiv es un repositorio de preprints, no peer-review. Cherukuri & Varshney 2026 es un preprint — puede no haber pasado revisión formal. El documento los llama "✓ PROVEN (Peer-Reviewed)" lo cual es técnicamente incorrecto para preprints arXiv.

### Sub-capa B: Aplicaciones concretas

| Aplicación | Tipo | ¿Derivación formal o analogía? |
|-----------|------|-------------------------------|
| Claude modeled as POMDP | Analogía conceptual | ANALOGÍA — "u_t = latent intent" no es un estado observable ni medible |
| Basin theory explica alucinación en Claude | Aplicación | ANALOGÍA — Thm 5.1 requiere verificar precondiciones de contractividad en Claude específicamente |
| ᾱ ≈ 0.835 como medición en Claude | Calibración | CALIBRADO en CAP04 — una tarea específica (element counting) |

### Sub-capa C: Números específicos

| Valor | Presentado como | Fuente real |
|-------|----------------|-------------|
| ᾱ ≈ 0.835 | Parámetro calibrado en CAP04 | Ajuste de curva a datos de CAP04 (UNA tarea) |
| d₀ ≈ 0.165 | Parámetro calibrado en CAP04 | Ídem |
| d_basin Layer 5: 0.150, Layer 6: 0.131, etc. | "Empirical Validation" | Requiere acceso a h^(ℓ) — contradecido por Sec 4.2 |
| db_t/dt ≈ 0.02 | "Quantitative Evidence" | **Sin fuente citada** — no hay metodología de medición en el documento |
| t_convergence ≈ 45 | "Quantitative Evidence" | Derivado aritméticamente de db_t/dt ≈ 0.02 (que no tiene fuente) |
| P(u_0\|user_query) ≈ 0.95 | "Belief State b_0" | Ilustrativo — no es un posterior computable |
| P(u_1\|feedback) < 0.20 | Resultado | Inferido de T_U sticky — no medido |

### Sub-capa D: Afirmaciones de garantía

| Garantía | Evidencia provista | ¿Respaldada? |
|---------|-------------------|-------------|
| "By layer 20, information geometrically annihilated" | Tabla de Sec 3.3 | ❌ La tabla requiere h^(ℓ) (Sec 4.2 dice que no es accesible) |
| "Exactly matches Theorem 3.3's prediction" | CHI PAPER023 AUROC | ❌ AUROC ≠ ρ_var — métricas en espacios distintos |
| "Measurements on CAP04" son empirical validation | Tabla de Sec 3.3 | ❌ Si h^(ℓ) es inobservable (Sec 4.2), no son mediciones |

---

## CAPA 3: SALTOS LÓGICOS

### SALTO-1: Thm 3.2 (válido) → "layer 20 es el umbral de destrucción"

**Ubicación:** Sec 3.3, interpretación final  
**Premisa:** Thm 3.2 dice que la distancia al centroid decae como ᾱ^(ℓ-ℓ₁)  
**Conclusión presentada:** "By layer 20, ~2% separation remains → information destroyed"  
**Tipo de salto:** Extrapolación de parámetro específico de tarea  
**Tamaño:** CRÍTICO  
**Problema:** El "layer 20" no es una predicción del teorema — es consecuencia de ᾱ ≈ 0.835 calibrado en CAP04. Con una tarea diferente, ᾱ podría ser 0.5 (destrucción en layer 6) o 0.95 (destruction en layer 60). El umbral no es universal.

### SALTO-2: db_t/dt ≈ 0.02 → t_convergence ≈ 45 iteraciones

**Ubicación:** Sec 2.3, "Quantitative Evidence"  
**Premisa:** "Model's update velocity: db_t/dt ≈ 0.02 per feedback iteration"  
**Conclusión:** "t_convergence ≈ 45 iterations"  
**Tipo de salto:** Aritmética sobre número sin fuente  
**Tamaño:** CRÍTICO  
**Problema:** La derivación aritmética (45 ≈ 0.85 / 0.02) es válida internamente. Pero db_t/dt ≈ 0.02 no tiene fuente citada, ni metodología de medición, ni experimento que lo produzca. El documento lo presenta bajo el encabezado "Quantitative Evidence" y "From Deep-Dive analysis" — ninguna de estas frases provee una fuente verificable.

### SALTO-3: Mediciones de h^(ℓ) en Sec 3.3 → "Empirical Validation"

**Ubicación:** Sec 3.3 header y tabla de resultados  
**Premisa:** Protocolo: "Extract h^(ℓ) for all layers ℓ ∈ {1,...,32} during CAP04"  
**Conclusión:** "Fit to Theorem 3.2" con valores específicos (0.150, 0.131, 0.114...)  
**Tipo de salto:** Datos que requieren condición imposible  
**Tamaño:** CRÍTICO (invalida la "validación" central del documento)  
**Problema:** Ver CONTRADICCIÓN-1 abajo.

### SALTO-4: AUROC de CHI PAPER023 → valida Thm 3.3

**Ubicación:** Sec 3.5, "Interpretation"  
**Premisa:** CHI 2026: AUROC ~0.91 para factoid, ~0.50 para open-ended  
**Conclusión:** "This exactly matches Theorem 3.3's prediction"  
**Tipo de salto:** Métricas en espacios distintos sin puente formal  
**Tamaño:** GRANDE  
**Problema:** Thm 3.3 predice ρ_var^(ℓ) = Var[factual states] / Var[hallucinated states] en ℝ^d (espacio de estados ocultos). AUROC mide la capacidad de detectores humanos de clasificar respuestas como correctas/incorrectas. Son métricas en espacios fundamentalmente distintos. El documento afirma que "exactly matches" sin mostrar la derivación formal de por qué AUROC debería reflejar ρ_var.

---

## CAPA 4: CONTRADICCIONES

### CONTRADICCIÓN-1 (CRÍTICA): Sec 3.3 vs Sec 4.2 — datos que no pueden existir

**Sec 3.3 dice:**
> "Extract h^(ℓ) for all layers ℓ ∈ {1, ..., 32} during CAP04 computation"
> [tabla con valores específicos: Layer 5: 0.150, Layer 6: 0.131, α_ℓ: 0.873...]

**Sec 4.2 admite:**
> "Hidden State Access: We assume access to h^(ℓ) for all layers. In practice, **only logits are exposed; h^(ℓ) must be inferred from behavior**."

**Choque:** Sec 3.3 presenta datos que requieren acceso a h^(ℓ). Sec 4.2 admite que ese acceso no existe en práctica. El documento no conecta estas dos secciones ni explica cómo se obtuvieron los datos de Sec 3.3 si h^(ℓ) no es accesible.

**Cuál prevalece:** Sec 4.2 invalida los datos de Sec 3.3 como "mediciones". Lo que la tabla presenta como "Empirical Validation" es en realidad una reconstrucción basada en comportamiento (logits), no acceso directo a estados ocultos. La tabla puede ser válida como *estimación derivada del comportamiento*, pero no como medición directa de h^(ℓ).

### CONTRADICCIÓN-2 (MEDIA): "Empirical Validation" vs "Assumption"

**Sec 3.3 header:** "Empirical Validation from CAP04"  
**Sec 4.2:** "We **assume** access to h^(ℓ) for all layers"

Un análisis que parte de una asunción no cumplida en práctica no es "validación empírica" — es validación bajo supuesto idealizado. El título de la sección es incorrecto bajo las propias admisiones del documento.

### CONTRADICCIÓN-3 (MEDIA): "Proven" para preprints arXiv

**Sec 4.1:** "✓ PROVEN (Peer-Reviewed): Cherukuri & Varshney (2026), Theorem 5.9"  
**Realidad:** arXiv:2604.04743v1 es un preprint. Los preprints arXiv no son "peer-reviewed" por definición — pueden ser correctos, pero no han pasado revisión formal de journal.

El documento usa "peer-reviewed" incorrectamente para todos los papers arXiv citados. CHI 2026 sí es peer-reviewed (conferencia con proceedings formales), pero los arXiv papers no.

---

## CAPA 5: ENGAÑOS ESTRUCTURALES

### E-1: Credibilidad prestada (CRÍTICO)

**Patrón:** Citar teoremas de Cherukuri & Varshney → aplicar a Claude sin verificar precondiciones

**Cómo opera:** Thm 5.9 (Radial Contraction) requiere que las capas sean "radially contractile" con coeficientes α_ℓ < 1. El documento asume que las capas de Claude satisfacen esta condición, pero nunca lo verifica. La existencia del teorema no garantiza que Claude lo instancia — eso requiere demostrar que las capas de Claude satisfacen la hipótesis de contractividad.

**Efecto:** El rigor matemático del teorema se transfiere a la aplicación aunque la transferencia no esté justificada.

### E-2: Limitación enterrada que invalida resultado central (CRÍTICO)

**Patrón:** Presentar datos en Sec 3.3 → admitir en Sec 4.2 que esos datos son inaccesibles → sin conexión explícita entre ambas secciones

**Cómo opera:** Un lector que lea Sec 3.3 en detalle (la sección de "resultados") y no llegue a Sec 4.2 (la sección de "limitaciones") creerá que los datos son mediciones reales. La limitación está presente en el documento, pero en sección separada, sin ninguna nota de reenvío en Sec 3.3. El documento habría sido honesto si Sec 3.3 dijera: "Nota: estos valores se derivan de comportamiento externo (logits), no de acceso directo a h^(ℓ)."

### E-3: Números redondos disfrazados de evidencia cuantitativa

**Patrón:** db_t/dt ≈ 0.02 presentado bajo encabezado "Quantitative Evidence"

**Cómo opera:** El encabezado "Quantitative Evidence / From Deep-Dive analysis" implica que hay datos experimentales. El valor 0.02 por iteración no tiene metodología de medición, no tiene n (número de experimentos), no tiene intervalos de confianza, no cita un paper que lo derive. Es una estimación presentada con la forma de dato empírico.

### E-4: Validación de contexto distinto (GRANDE)

**Patrón:** AUROC de CHI 2026 (detección humana) → valida Thm 3.3 (geometría de estados ocultos)

**Cómo opera:** El documento aserta "exactly matches" sin mostrar el puente formal entre AUROC (métrica conductual humana) y ρ_var (métrica geométrica en ℝ^d). Puede haber una correlación intuitiva (tareas fáciles → más AUROC Y más ρ_var), pero no es una validación formal del teorema.

### E-5: Notación formal encubriendo analogía

**Patrón:** POMDP ⟨U, S, A, O, T_U, T_E, R, T_obs⟩ con valores específicos para b_t

**Cómo opera:** El POMDP es un framework matemático riguroso. Pero "u_t = latent intent" no es un estado observable del modelo — es una interpretación conceptual. Presentar b_t = {P(u_0)=0.95, P(u_1)=0.05} con valores específicos implica que el posterior es computable, cuando en realidad es una ilustración del mecanismo propuesto. La notación del simplex Δ(U) hace que la ilustración parezca un cálculo formal.

---

## CAPA 6: SÍNTESIS DE VEREDICTO

### VERDADERO

| Claim | Evidencia que lo respalda | Fuente |
|-------|--------------------------|--------|
| Dunning-Kruger en LLMs (p < 0.001) | Resultado empírico reproducible | Ghosh & Panday arXiv:2603.09985 |
| AUROC ~0.91 factoid, ~0.50 open-ended | Medición en CHI 2026 PAPER023 | CHI 2026 proceedings |
| RACE: H(R,A\|Q) = H(R\|Q)+H(A\|Q)-I(R,A\|Q) | Identidad de teoría de información | Pesaranghader & Li |
| Tareas más difíciles tienen más modos de respuesta | Principio cualitativo válido (AUROC lo respalda) | CHI 2026 PAPER023 |
| Basin attractor theory es matemáticamente válida en su dominio | Los teoremas son formalmente consistentes | Cherukuri & Varshney (si el preprint es correcto) |

### FALSO (como presentado)

| Claim | Por qué es falso | Contradicción/evidencia |
|-------|-----------------|------------------------|
| "Empirical Validation from CAP04" — datos de h^(ℓ) en Sec 3.3 | h^(ℓ) no es observable en práctica (Sec 4.2 lo admite) | CONTRADICCIÓN-1 |
| "Exactly matches Theorem 3.3's prediction" | AUROC ≠ ρ_var; métricas en espacios distintos sin puente formal | SALTO-4 |
| arXiv preprints son "PROVEN (Peer-Reviewed)" | arXiv no es peer-review por definición | CONTRADICCIÓN-3 |
| "Quantitative Evidence: db_t/dt ≈ 0.02" | El valor no tiene fuente, metodología, ni n | E-3 |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría para resolverse |
|-------|--------------------------|--------------------------------|
| Claude satisface precondiciones de contractividad radial | No se demuestra en el documento | Verificar que cada capa de Claude satisface ‖f_ℓ(h)-μ^(ℓ+1)‖ ≤ α_ℓ‖h-μ^(ℓ)‖ |
| ᾱ ≈ 0.835 es representativo de Claude en general | Calibrado en UNA tarea (element counting) | Medir en ≥10 dominios distintos |
| t_convergence ≈ 45 iteraciones | Derivado de db_t/dt sin fuente | Medir db_t/dt empíricamente con protocolo reproducible |
| Basin theory aplica a Claude específicamente | Aplicación analógica, no derivada | Verificar precondiciones de los teoremas en arquitectura de Claude |
| P(u_0\|query) ≈ 0.95 (belief state inicial) | Ilustrativo, no posterior computable | No hay protocolo para computar b_t sin acceso a u_t |

---

### Patrón dominante: Credibilidad prestada + Limitación enterrada

**Cómo opera en este documento:**

1. Se citan teoremas matemáticamente sólidos (Cherukuri & Varshney, teoría de información)
2. Se aplican a Claude por analogía sin verificar precondiciones
3. Se presenta una tabla de "datos empíricos" (Sec 3.3) que requiere condiciones imposibles
4. La admisión de imposibilidad está en sección separada (Sec 4.2) sin conexión explícita
5. El lector que no conecte Sec 3.3 con Sec 4.2 creerá que hay validación empírica donde hay reconstrucción conductual

**Por qué funciona como engaño estructural:**
El documento es formalmente honesto — las limitaciones están en Sec 4.2. Pero la arquitectura del documento (resultados primero en Sec 3, limitaciones enterradas en Sec 4) maximiza el tiempo que el lector pasa convencido de la validación antes de llegar a la duda. Un documento con rigor epistémico honesto conectaría cada resultado con sus limitaciones aplicables en la misma sección, no en una sección separada.

---

## Lo que sí es válido y aprovechable para THYROX

A pesar de las objeciones anteriores, el documento provee principios CUALITATIVOS válidos:

1. **El mismo agente que genera no puede auto-validar** — el mecanismo del basin attractor, aunque no medido directamente en Claude, es un modelo plausible de por qué el sesgo de generación persiste. Los evaluadores externos tienen fundamento conceptual.

2. **Tareas con |A| pequeño son más verificables** — el AUROC de CHI 2026 lo respalda empíricamente (0.91 vs 0.50), aunque el vínculo con ρ_var sea analógico.

3. **La estructura "Proven vs Inferred" de Sec 4.1** — independientemente de si el documento la aplica perfectamente, es el modelo de rigor que THYROX debería usar en sus propios artefactos.

4. **T_U sticky como principio** — que los LLMs son resistentes a actualizar su "intención implícita" es consistente con evidencia empírica de literatura de hallucination. El mecanismo POMDP es una analogía útil aunque no formalmente derivada.

---

## Qué NO usar de este documento en THYROX

- ❌ ᾱ ≈ 0.835 como constante universal
- ❌ "layer 20" como umbral de validación
- ❌ db_t/dt ≈ 0.02 como velocidad de actualización de belief
- ❌ t_convergence ≈ 45 iteraciones como tiempo de convergencia
- ❌ "Empirical Validation" como respaldo de la arquitectura de evaluadores (es conceptual, no empírico)
- ❌ La aplicación del basin theory a THYROX como si fuera demostrada (es una analogía útil)
