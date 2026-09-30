```yml
created_at: 2026-04-18 10:50:39
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-dive
status: Borrador
version: 1.0.0
fuente: "CLAUDE ARCHITECTURE AS DYNAMIC SYSTEM — PART B: Information Theory & Calibration (2026-04-18)"
veredicto_síntesis: ENGAÑOSO — fórmula exponencial prohibida con calibración circular; distribuciones de probabilidad sin fuente empírica; I(R,A|Q) matemáticamente incorrecto dado los propios datos del documento; λ₁ ajustado arbitrariamente de 4.0 a 5.0 sin justificación; P(correct|CAP04)=0.34% construida para confirmar conclusión predeterminada; validación en Sec 7 es alineación cualitativa, no cuantitativa
saltos_lógicos: 9
contradicciones: 6
engaños_estructurales: 7
capas_adicionales: 3 (Calibración-Circular + Información-Teórica + Comparativa-con-Part-A)
referencia_análisis_previo: discover/claude-architecture-part-a-deep-dive.md, discover/claude-architecture-part-a-repaired-deep-dive.md
```

# Deep-Dive (9 capas): Claude Architecture as Dynamic System — PART B: Information Theory & Calibration

> Análisis adversarial completo. 6 capas obligatorias + 3 adicionales requeridas por el
> documento: (7) análisis de calibración circular de la fórmula exponencial, (8) verificación
> aritmética de la teoría de información en Sec 4, (9) comparativa con patrones de Part A.
> Prerequisito: leer `claude-architecture-part-a-repaired-deep-dive.md` para contexto de base.

---

## CAPA 1: LECTURA INICIAL — Qué dice el documento

El documento Part B extiende Part A con cuatro secciones numeradas 4-7, continuando la
numeración del documento previo. La tesis se estructura así:

**Sec 4 (H(R,A|Q)):** Define una métrica de entropía conjunta para medir la inconsistencia
entre el proceso de razonamiento R y la respuesta A dada una query Q, usando la fórmula de
Pesaranghader & Li (2026). Calcula valores específicos para CAP04: H(R,A|Q) = 2.92 bits.
Establece el umbral: > 2.0 bits → señal de alucinación.

**Sec 5 (Fórmula unificada):** Presenta la ecuación central del documento:
```
P(correct | h^(ℓ), history, Q) = P₀ × e^(-λ₁d_basin - λ₂H(R,A|Q) - λ₃Δu_t - λ₄Π_inconsist - λ₅τ_latency)
```
Afirma calibrar los parámetros contra datos de Ghosh & Panday (2026) para Claude Haiku
(accuracy 75.4%, ECE 0.122) y Kimi K2 (accuracy 23.3%, ECE 0.726). Produce:
λ₁=5.0, λ₂=0.8, λ₃=3.0, λ₄=2.0, λ₅=0.02, P₀=0.95.

**Sec 6 (Aplicación CAP04):** Aplica la fórmula a CAP04 con d_basin=0.10, H(R,A|Q)=2.92,
Δu_t=0.35, Π_inconsist=0.87, τ=0. Obtiene P(correct|CAP04) = 0.34%. Contrasta con
"implied confidence ~95%". Calcula ECE ≈ 0.95.

**Sec 7 (Validación CHI 2026):** Alega que tres papers CHI 2026 "se alinean" con los
resultados del modelo.

**Estructura del argumento:**
entropía información-teórica (Sec 4) → fórmula calibrada (Sec 5) → resultado extremo (Sec 6)
→ confirmación por literatura (Sec 7).

---

## CAPA 2: AISLAMIENTO DE CAPAS

### Sub-capa A: Frameworks teóricos

| Framework | Validez en su dominio | Fuente en documento |
|-----------|----------------------|---------------------|
| Shannon entropy H(X) = -Σ p(x) log p(x) | Correcto — definición estándar | Sec 4, base implícita |
| H(R,A\|Q) = H(R\|Q) + H(A\|Q) - I(R,A\|Q) | Correcto — regla de cadena de entropía condicional | Sec 4, Definition 4.1 |
| Pesaranghader & Li (2026) arXiv:2601.09929v1 | No verificable — preprint arXiv enero 2026 | Sec 4, ref [1] |
| Ghosh & Panday (2026) arXiv:2603.09985v1 | No verificable — preprint arXiv marzo 2026 | Sec 5, ref [2] |
| ECE (Expected Calibration Error) = |confidence - accuracy| | Parcialmente correcto — definición simplificada; ECE formal es una integral/suma | Sec 6 |
| Decaimiento exponencial P₀ × e^(-Σλᵢxᵢ) | Prohibido en THYROX — parámetros sin calibración empírica independiente | Sec 5, fórmula central |

### Sub-capa B: Aplicaciones concretas

| Aplicación | Tipo | ¿Derivación formal o analogía? |
|-----------|------|-------------------------------|
| H(R\|Q) calculado con distribución P(Rᵢ\|Q) inventada | Sin derivación | SIN FUENTE — ver SALTO-1 |
| I(R,A\|Q) ≈ 0.05 bits con P(A\|R) asumida | Sin derivación | SALTO-4 — aritméticamente incorrecto dado los datos propios |
| d_basin asumidos (Haiku ≈ 0.05, Kimi ≈ 0.20) | Sin fuente | "assumed" — explícito en Sec 5 |
| λ₁ derivado: 0.604 = λ₁ × 0.15 → λ₁ ≈ 4.0 | Derivación sobre datos asumidos | Circular — usa d_basin asumidos |
| Cambio de λ₁=4.0 a λ₁=5.0 "HIGH confidence" | Sin justificación | SALTO-5 — arbitrario |
| Π_inconsist=0.87 para CAP04 | Sin definición operacional | SALTO-7 — no definido en el documento |
| τ_latency=0 para CAP04 | Elegido para simplificar | Decisión de conveniencia |

### Sub-capa C: Números específicos

| Valor | Presentado como | Fuente real |
|-------|----------------|-------------|
| P(R₁\|Q)=0.40, P(R₂\|Q)=0.15, P(R₃\|Q)=0.20, P(R₄\|Q)=0.15, P(R₅+\|Q)=0.10 | "CAP04 computation" | SIN FUENTE — distribución inventada |
| P(A₁\|Q)=0.60, P(A₂\|Q)=0.30, P(A₃\|Q)=0.10 | "CAP04 computation" | SIN FUENTE — distribución inventada |
| P(A₁\|R₁)=0.95, P(A₂\|R₁)=0.04, P(A₃\|R₁)=0.01 | "CAP04 computation" | SIN FUENTE — asumida |
| P(A₁\|R₄)=0.05, P(A₂\|R₄)=0.90, P(A₃\|R₄)=0.05 | "CAP04 computation" | SIN FUENTE — asumida |
| I(R,A\|Q) ≈ 0.05 bits | "CAP04 computation" | MATEMÁTICAMENTE INCORRECTO — ver CAPA 8 |
| H(R,A\|Q) = 2.92 bits | "CAP04 computation" | Dependiente de datos sin fuente |
| d_basin Haiku ≈ 0.05 | "assumed" | Explícitamente asumido |
| d_basin Kimi ≈ 0.20 | "assumed" | Explícitamente asumido |
| accuracy gap: Claude 75.4% vs Kimi 23.3% → diferencia 52.1% | Datos de Ghosh & Panday | Preprint arXiv — no peer-reviewed |
| λ₁=5.0 "HIGH confidence" | "Validated" | Ajustado arbitrariamente desde 4.0 derivado circularmente |
| λ₂=0.8, λ₃=3.0, λ₄=2.0, λ₅=0.02 | "Calibration" | Sin derivación — inventados |
| P₀=0.95 | "Calibration" | Sin fuente — coincide con "implied confidence ~95%" |
| Π_inconsist=0.87 para CAP04 | "CAP04 Application" | SIN DEFINICIÓN OPERACIONAL |
| P(correct\|CAP04) = 0.0034 = 0.34% | "Result" | Calculado, pero sobre parámetros sin fuente |
| ECE = \|0.95 - 0.0034\| ≈ 0.95 | "Calibration Error" | Definición incorrecta de ECE formal |

### Sub-capa D: Afirmaciones de garantía

| Garantía | Evidencia provista | ¿Respaldada? |
|---------|-------------------|-------------|
| H(R,A\|Q) = 2.92 bits es señal de alucinación para CAP04 | Cálculo basado en distribuciones sin fuente | NO — las distribuciones son inventadas |
| "Threshold: > 2.0 bits → HALLUCINATION SIGNAL" | No derivado — presentado como establecido | SIN FUENTE — de dónde viene 2.0 bits |
| λ₁-λ₅ calibrados contra Ghosh & Panday | Derivación parcial de λ₁ sobre datos asumidos | NO — calibración circular |
| P(correct\|CAP04) = 0.34% | Aplicación de fórmula con parámetros sin fuente | CALCULADO PERO NO VÁLIDO |
| CHI papers "alinean" con resultados | Alineación cualitativa | NO ES VALIDACIÓN CUANTITATIVA |

---

## CAPA 3: SALTOS LÓGICOS

### SALTO-1: P(Rᵢ|Q) como "CAP04 computation" sin protocolo de medición

**Ubicación:** Sec 4, "CAP04 computation"
**Premisa:** P(R₁|Q)=0.40, P(R₂|Q)=0.15, P(R₃|Q)=0.20, P(R₄|Q)=0.15, P(R₅+|Q)=0.10
**Tipo de salto:** Datos presentados como medición sin protocolo
**Tamaño:** CRÍTICO
**Problema:** P(Rᵢ|Q) es la probabilidad de que el modelo use el razonamiento Rᵢ dado Q.
Para medir esta distribución se necesita: (a) definir el espacio de razonamientos {Rᵢ} de
forma operacional y mutuamente excluyente, (b) ejecutar el modelo en múltiples queries del
tipo Q, (c) clasificar el razonamiento producido en cada ejecución. El documento no define
qué constituye cada Rᵢ, no especifica cuántas ejecuciones, no provee protocolo de
clasificación. "CAP04 computation" implica que estas probabilidades fueron medidas — no
hay evidencia de ello.
**Justificación que debería existir:** Definición de Rᵢ, n de ejecuciones, clasificador
de razonamiento, y distribución empírica resultante.

### SALTO-2: P(Aⱼ|Q) como "CAP04 computation" sin protocolo de medición

**Ubicación:** Sec 4, "CAP04 computation"
**Premisa:** P(A₁|Q)=0.60, P(A₂|Q)=0.30, P(A₃|Q)=0.10
**Tipo de salto:** Análogo al SALTO-1
**Tamaño:** CRÍTICO
**Problema:** Medir P(Aⱼ|Q) requiere definir el espacio de respuestas {Aⱼ}, ejecutar el
modelo múltiples veces en CAP04, y clasificar cada respuesta. Sin protocolo, estas son
distribuciones de conveniencia que suman a 1 pero no representan mediciones empíricas.
**Adicionalmente:** Las distribuciones P(Rᵢ|Q) y P(Aⱼ|Q) son mutuamente dependientes —
el razonamiento elegido afecta la respuesta. El documento las presenta como si fueran
distribuciones marginales independientes, lo cual presupone que ya conoce la distribución
conjunta P(R,A|Q) — exactamente lo que se está tratando de calcular.

### SALTO-3: P(A|R) asumida → I(R,A|Q) como valor medido

**Ubicación:** Sec 4, derivación de I(R,A|Q)
**Premisa:** P(A₁|R₁)=0.95, P(A₂|R₁)=0.04, P(A₃|R₁)=0.01;
P(A₁|R₄)=0.05, P(A₂|R₄)=0.90, P(A₃|R₄)=0.05 → I(R,A|Q) ≈ 0.05 bits
**Tipo de salto:** Distribuciones asumidas presentadas como parámetros empíricos
**Tamaño:** CRÍTICO
**Problema:** P(Aⱼ|Rᵢ) requiere acceso a los procesos internos del modelo — saber no solo
cuál respuesta da, sino cuál razonamiento usó para cada respuesta. Para Claude API, Sec 4.2
de Part A admite que "Only logits visible; h^(ℓ) must be inferred." No existe protocolo para
medir P(A₁|R₁)=0.95 sin acceso a los estados internos que determinan qué razonamiento siguió
el modelo. Estos valores son inventados, no medidos.

### SALTO-4: I(R,A|Q) ≈ 0.05 bits dado P(A|R) presentada

**Ubicación:** Sec 4, resultado "I(R,A|Q) ≈ 0.05 bits"
**Tipo de salto:** Error aritmético / selección de datos conveniente — ver CAPA 8 para
análisis detallado
**Tamaño:** CRÍTICO
**Problema:** Dado P(A₁|R₁)=0.95 y P(A₁|Q)=0.60, la contribución de R₁ a la información
mutua es sustancialmente mayor que 0.05 bits. El valor reportado es inconsistente con las
distribuciones presentadas. Ver CAPA 8 (análisis de información mutua) para la derivación
completa.

### SALTO-5: λ₁ = 4.0 → λ₁ = 5.0 "HIGH confidence"

**Ubicación:** Sec 5, "Calibration against Ghosh & Panday (2026) data"
**Premisa:** "λ₁ derived: 0.604 = λ₁ × 0.15 → λ₁ ≈ 4.0 / Then 'validated': λ₁=5.0"
**Tipo de salto:** Ajuste arbitrario sin justificación presentado como validación
**Tamaño:** CRÍTICO
**Problema:** El documento deriva λ₁ ≈ 4.0 de la ecuación 0.604 = λ₁ × 0.15. Luego
"valida" usando λ₁=5.0. El cambio de 4.0 a 5.0 representa un incremento del 25% sobre
el valor derivado. El documento no explica por qué 5.0 en lugar de 4.0. La frase
"HIGH confidence" no es una justificación estadística — es una afirmación de certeza
sin respaldo. Un cambio de parámetro del 25% sin justificación es señal de ajuste por
conveniencia, no calibración.
**Adicionalmente:** La ecuación 0.604 = λ₁ × 0.15 asume que la diferencia log entre
las accuracy de Haiku y Kimi se explica solo por d_basin — esto ignora todos los otros
términos de la fórmula (λ₂H + λ₃Δu_t + λ₄Π + λ₅τ). La derivación de λ₁ es inválida
porque ignora los otros términos.

### SALTO-6: d_basin "assumed" → λ₁ "derived"

**Ubicación:** Sec 5, derivación de λ₁
**Premisa:** "d_basin assumed ≈ 0.05 [Claude Haiku]" y "d_basin assumed ≈ 0.20 [Kimi K2]"
→ λ₁ derived
**Tipo de salto:** Derivación de parámetro sobre parámetro asumido
**Tamaño:** CRÍTICO
**Problema:** La "derivación" de λ₁ usa d_basin para Claude Haiku y Kimi que son
explícitamente "assumed" (el documento usa esa palabra). Derivar λ₁ sobre d_basin
asumidos no es derivación — es una ecuación con dos incógnitas donde una se asume.
El resultado λ₁ hereda la incertidumbre de d_basin: si d_basin fuera 0.10 en lugar
de 0.05, λ₁ derivado sería la mitad. El campo de incertidumbre del parámetro no
se propaga a la "derivación."

### SALTO-7: Π_inconsist = 0.87 para CAP04 sin definición

**Ubicación:** Sec 6, "CAP04 Application"
**Premisa:** Π_inconsist=0.87 → contribuye -λ₄×Π_inconsist = -2.0×0.87 = -1.74 al exponente
**Tipo de salto:** Uso de parámetro indefinido como si tuviera valor medido
**Tamaño:** CRÍTICO
**Problema:** Π_inconsist no está definido operacionalmente en ninguna parte del documento
Part B. No hay sección que explique qué es, cómo se mide, qué escala usa (¿0 a 1? ¿sin
cota?), qué significa un valor de 0.87. Este parámetro contribuye -1.74 al exponente —
la segunda mayor contribución al resultado final — y no existe ninguna metodología para
medirlo. El valor 0.87 no tiene fuente.

### SALTO-8: "Implied confidence ~95%" para CAP04

**Ubicación:** Sec 6, "Reality Check"
**Premisa:** "Model reported '67 elements' with implied confidence ~95%"
**Tipo de salto:** Definición de "confidence" no declarada
**Tamaño:** GRANDE
**Problema:** El documento afirma que el modelo tiene "implied confidence ~95%" en CAP04.
¿Qué significa "implied confidence"? ¿Es P₀=0.95 (que el documento mismo establece como
prior)? ¿Es la confianza verbal del modelo? ¿Es una estimación de calibración? El 95%
coincide con P₀=0.95 — esto sugiere que "implied confidence" es simplemente el prior P₀
usado en la fórmula, lo cual hace que la comparación P(correct)=0.34% vs confidence=95%
sea una tautología: el prior fue elegido como 0.95 y el resultado se presenta como
"violación" de ese prior.

### SALTO-9: P(correct|CAP05) = 20.1% sin verificación de parámetros

**Ubicación:** Sec 6, "CAP05"
**Premisa:** d_basin=0.06, H(R,A|Q)=0.80, Δu_t=0.05, Π_inconsist=0.23 → P=20.1%
**Tipo de salto:** Segunda aplicación que valida la primera sin tener fuente independiente
**Tamaño:** MEDIO
**Problema:** Los parámetros de CAP05 tampoco tienen fuente — siguen el mismo patrón
de valores asumidos. El hecho de que CAP05 produzca un resultado diferente (20.1% vs 0.34%)
no valida la fórmula; simplemente muestra que la fórmula es sensible a los parámetros
de entrada. Con parámetros sin fuente, producir valores diferentes es trivial.

---

## CAPA 4: CONTRADICCIONES

### CONTRADICCIÓN-1 (CRÍTICA): Calibración de λ₁ vs. uso de todos los términos en Sec 6

**Afirmación A (Sec 5, derivación):**
> "λ₁ derived: 0.604 = λ₁ × 0.15 → λ₁ ≈ 4.0"
Esta ecuación asume que la diferencia de log-accuracy entre Claude Haiku y Kimi K2
se explica exclusivamente por el término d_basin (diferencia = λ₁ × Δd_basin).

**Afirmación B (Sec 5, fórmula y Sec 6 aplicación):**
La fórmula tiene cinco términos: λ₁d_basin + λ₂H(R,A|Q) + λ₃Δu_t + λ₄Π_inconsist + λ₅τ_latency.
Todos contribuyen al resultado.

**Por qué chocan:** Si se derivan los λᵢ de la diferencia entre Haiku y Kimi, esa diferencia
debería estar explicada por la suma de TODOS los términos, no solo λ₁d_basin. Si Claude Haiku
tiene accuracy 75.4% y Kimi K2 tiene 23.3%, la diferencia de log(P) ≈ log(0.754) - log(0.233)
debería igualar Σλᵢ(xᵢ_Kimi - xᵢ_Haiku) para todos los i. Usar solo λ₁Δd_basin para derivar
λ₁ asume que los otros cuatro términos son idénticos para Haiku y Kimi — lo cual no se afirma
ni justifica en el documento.

**Cuál prevalece:** La afirmación B invalida la derivación de λ₁: la ecuación que usa
el documento para derivarlo está subdeterminada (falta la contribución de los otros cuatro
términos).

### CONTRADICCIÓN-2 (CRÍTICA): P₀=0.95 como prior vs. P₀=0.95 como "implied confidence"

**Afirmación A (Sec 5):**
> P₀=0.95 es el prior inicial de la fórmula — el valor de P(correct) antes de aplicar
> penalización por d_basin, H, Δu_t, Π_inconsist, τ.

**Afirmación B (Sec 6):**
> "Model reported '67 elements' with implied confidence ~95%"
> ECE = |0.95 - 0.0034| ≈ 0.95

**Por qué chocan:** Si "implied confidence ~95%" es P₀, entonces la comparación
|confidence - P(correct)| = |0.95 - 0.0034| es simplemente |P₀ - resultado_final|.
El ECE calculado mide la diferencia entre el prior y el resultado de la fórmula — no entre
la confianza real del modelo y su accuracy real. Esto convierte el ECE en una
auto-validación tautológica: el documento define P₀=0.95, aplica penalizaciones,
obtiene 0.34%, y entonces dice "look, ECE ≈ 0.95 — el modelo está muy mal calibrado."
El ECE que calcula no es ECE del modelo — es la magnitud de las penalizaciones de la fórmula.

**Cuál prevalece:** Ninguna — ambas son presentaciones del mismo número (0.95) en roles
diferentes para crear la apariencia de una comparación externa.

### CONTRADICCIÓN-3 (CRÍTICA): I(R,A|Q) ≈ 0.05 bits vs. P(A|R) presentada

**Afirmación A (Sec 4):**
> P(A₁|R₁)=0.95 (con P(A₁|Q)=0.60 y P(R₁|Q)=0.40) → I(R,A|Q) ≈ 0.05 bits

**Afirmación B (matemática estándar de información mutua):**
I(R,A|Q) = Σᵢ Σⱼ P(Rᵢ|Q) P(Aⱼ|Rᵢ) log[P(Aⱼ|Rᵢ) / P(Aⱼ|Q)]

**Por qué chocan:** Con P(A₁|R₁)=0.95 y P(A₁|Q)=0.60, el término log(0.95/0.60) = log(1.583)
≈ 0.663 nats = 0.956 bits. Multiplicado por P(R₁|Q)×P(A₁|R₁) = 0.40×0.95 = 0.38.
Solo este término contribuye 0.38 × 0.956 ≈ 0.363 bits a I(R,A|Q). Si la información mutua
tiene apenas esta contribución parcial de R₁-A₁ de ~0.363 bits, afirmar que la
I(R,A|Q) total ≈ 0.05 bits es matemáticamente inconsistente con los datos presentados.
Ver CAPA 8 para la estimación completa.

**Cuál prevalece:** La matemática estándar. I(R,A|Q) ≈ 0.05 bits es incorrecto dado los
valores de P(A|R) que el propio documento presenta.

### CONTRADICCIÓN-4 (CRÍTICA): "Validated" en Sec 5 vs. datos que muestran que la fórmula no acierta

**Afirmación A (Sec 5):**
> "Then 'validated': λ₁=5.0, λ₂=0.8 → 5.0×0.15 + 0.8×2.7 = 0.75 + 2.16 = 2.91
> (exceeds observed gap)"

**Afirmación B (interpretación estándar de validación):**
Un modelo está validado cuando sus predicciones coinciden con los datos observados.

**Por qué chocan:** El documento mismo admite que la combinación λ₁=5.0, λ₂=0.8 produce
2.91, que "exceeds observed gap." Si la predicción excede el gap observado, el modelo
sobre-estima. Un modelo que sobre-estima no está validado — está ajustado hacia un valor
que no coincide con la observación. El documento usa "validates" para describir un resultado
que el propio texto admite excede la observación.

**Cuál prevalece:** La Afirmación B. Lo que el documento llama "validated" es un ajuste
que sobre-estima el gap observado — no es validación.

### CONTRADICCIÓN-5 (GRANDE): Sec 7 "aligns with" vs. ausencia de medición cuantitativa

**Afirmación A (Sec 7):**
> "CHI PAPER012: 'Users report very low trust' → aligns with P≈0.34%"
> "CHI PAPER019: 'Users report reasoning doesn't justify answer' → aligns with H=2.92 bits"
> "CHI PAPER023: ECE pattern (Kimi 0.726, Claude 0.122) → aligns with formula"

**Afirmación B (lo que validación cuantitativa requiere):**
Para que un paper CHI "alinee" cuantitativamente con P≈0.34%, el paper debería reportar
una métrica de confianza del usuario que pueda compararse con 0.34%. "Very low trust"
es una descripción cualitativa de una encuesta — no es una probabilidad comparable con 0.34%.

**Por qué chocan:** El documento presenta alineación cualitativa (usuarios reportan baja
confianza; el modelo predice baja probabilidad de corrección) como si fuera validación
cuantitativa. "Aligns with" no requiere que los papers CHI hayan medido H(R,A|Q) o
P(correct) — solo que su descripción cualitativa apunta en la misma dirección.

**Cuál prevalece:** Sec 7 provee evidencia de plausibilidad, no validación.

### CONTRADICCIÓN-6 (GRANDE): ECE reportado vs. definición formal de ECE

**Afirmación A (Sec 6):**
> ECE = |0.95 - 0.0034| ≈ 0.95

**Afirmación B (definición formal de ECE — Naeini et al. 2015, Guo et al. 2017):**
ECE = Σ_b (|B_b|/n) × |acc(B_b) - conf(B_b)|
donde B_b son bins de confianza, acc(B_b) es la accuracy real en ese bin, conf(B_b) es
la confianza promedio en ese bin, y n es el número total de muestras.

**Por qué chocan:** La definición formal de ECE requiere múltiples muestras, binning de
confianza, y promedios ponderados. Lo que el documento calcula es la diferencia absoluta
entre un único valor de confianza (0.95) y un único valor de P(correct) (0.0034) para
un solo caso. Esto no es ECE — es calibration error para una sola instancia. ECE es una
estadística de población sobre muchas predicciones y muestras. El documento usa el término
técnico para describir un cálculo de instancia única.

**Cuál prevalece:** La definición formal invalida el uso del término ECE en Sec 6.
Lo que se calcula es \|P₀ - P(correct\|CAP04)\| — una penalización de instancia, no ECE de población.

---

## CAPA 5: ENGAÑOS ESTRUCTURALES

### E-1 (CRÍTICO): La fórmula exponencial prohibida presentada como "calibración empírica"

**Patrón:** Notación formal encubriendo especulación.
**Ubicación:** Sec 5, fórmula principal.
**Cómo opera:** La fórmula `P₀ × e^(-Σλᵢxᵢ)` es exactamente la fórmula de Temporal Decay
`P₀ × e^(-r×d)` con cinco términos de decaimiento en lugar de uno. El documento presenta
esta estructura como si fuera una fórmula "calibrada empíricamente" contra datos de Ghosh
& Panday. Pero la calibración tiene dos problemas: (a) los d_basin usados para derivar λ₁
son explícitamente "assumed", no medidos; (b) los otros cuatro λᵢ (λ₂ a λ₅) no tienen
derivación — aparecen directamente en los valores finales sin ninguna ecuación que los
conecte a los datos de Ghosh & Panday. El lector ve "Calibration against Ghosh & Panday
(2026) data" y asume que todos los parámetros fueron calibrados contra esos datos, cuando
en realidad solo λ₁ tiene una derivación (inválida), y los otros cuatro son valores asignados
sin justificación.

### E-2 (CRÍTICO): Circularidad de calibración — ajustar y "validar" sobre los mismos datos

**Patrón:** Profecía auto-cumplida / validación circular.
**Ubicación:** Sec 5, proceso de "calibración" y "validación."
**Cómo opera:** El documento usa los datos de Ghosh & Panday (accuracy Haiku vs Kimi) para
derivar λ₁, luego usa los mismos datos para "validar" que la fórmula produce resultados
consistentes con esos mismos datos. Esto es calibración in-sample: los datos que se usan
para ajustar el parámetro son los mismos que se usan para evaluar si el ajuste es bueno.
El único resultado garantizado de este proceso es que el ajuste va a "funcionar" — porque
se diseñó para hacerlo. No existe conjunto de validación independiente.

### E-3 (CRÍTICO): Distribuciones de probabilidad en Sec 4 presentadas como "CAP04 computation"

**Patrón:** Números redondos disfrazados como cálculo empírico.
**Ubicación:** Sec 4, todas las distribuciones P(Rᵢ|Q), P(Aⱼ|Q), P(Aⱼ|Rᵢ).
**Cómo opera:** La etiqueta "CAP04 computation" implica que estas distribuciones fueron
computadas — es decir, medidas empíricamente en el contexto de CAP04. Pero los valores
(0.40, 0.15, 0.20, 0.15, 0.10; 0.60, 0.30, 0.10) suman exactamente a 1 con valores redondos
de dos decimales, lo cual es característico de valores elegidos para ilustrar un cálculo, no
de distribuciones empíricas. Las distribuciones empíricas típicamente no suman exactamente
a 1 con valores redondos. La etiqueta "computation" encubre que estos son supuestos de
trabajo, no mediciones.

### E-4 (CRÍTICO): I(R,A|Q) ≈ 0.05 bits — error aritmético que produce el resultado deseado

**Patrón:** Notación formal encubriendo especulación.
**Ubicación:** Sec 4, resultado de I(R,A|Q).
**Cómo opera:** El valor I(R,A|Q) ≈ 0.05 bits es utilizado en la fórmula H(R,A|Q) = 2.09 +
0.88 - 0.05 = 2.92 bits. Si la información mutua fuera mayor (como la aritmética correcta
muestra — ver CAPA 8, estimación ~0.75 bits), entonces H(R,A|Q) sería 2.09 + 0.88 - 0.75
= 2.22 bits. Esto aún superaría el umbral de 2.0 bits para CAP04, pero produciría un valor
de P(correct) diferente. El 0.05 bits produce el cálculo más dramático — razonamiento y
respuesta casi independientes, lo cual maximiza el resultado de H(R,A|Q) y por tanto
minimiza P(correct). El valor 0.05 bits sirve la narrativa del documento: CAP04 como
caso extremo de alucinación.

### E-5 (CRÍTICO): "HIGH confidence" como validación estadística

**Patrón:** Terminología técnica encubriendo afirmación arbitraria.
**Ubicación:** Sec 5, cambio de λ₁=4.0 a λ₁=5.0.
**Cómo opera:** El documento escribe "Then 'validated': λ₁=5.0 [...] HIGH confidence."
"HIGH confidence" suena como un nivel de significancia estadística o una métrica de
bondad del ajuste. En realidad, el texto no provee ningún número — ni p-value, ni R², ni
intervalo de confianza — que justifique λ₁=5.0 sobre λ₁=4.0. Es una etiqueta de certeza
aplicada a un ajuste arbitrario.

### E-6 (GRANDE): Sec 7 como "validación" por alineación cualitativa

**Patrón:** Validación en contexto distinto extrapolada.
**Ubicación:** Sec 7, referencias CHI 2026.
**Cómo opera:** El documento usa tres papers CHI 2026 para "validar" sus resultados
cuantitativos. Pero los papers CHI miden confianza de usuarios, patrones ECE entre modelos
diferentes, y percepciones cualitativas — no miden H(R,A|Q) ni aplican la fórmula de Sec 5.
La alineación cualitativa ("usuarios reportan baja confianza" ↔ P≈0.34%) no valida los
parámetros λᵢ, la forma funcional exponencial, ni el cálculo de información mutua. Es
plausibilidad confirmada por selección de citas consistentes — no validación cuantitativa.
**Adicionalmente:** El documento admite que CHI PAPER012 parece fabricado ("this seems
fabricated") dentro de la propia cita — lo que levanta preguntas sobre la existencia del
paper.

### E-7 (GRANDE): Threshold de 2.0 bits sin derivación — diseñado para capturar CAP04

**Patrón:** Números redondos disfrazados.
**Ubicación:** Sec 4, "Threshold: > 2.0 bits → HALLUCINATION SIGNAL."
**Cómo opera:** El umbral de 2.0 bits no tiene derivación — no hay referencia a Pesaranghader
& Li (2026) que establezca este umbral, no hay análisis de sensibilidad que muestre por qué
2.0 y no 1.5 o 2.5. El umbral aparece inmediatamente después del cálculo H(R,A|Q) = 2.92
bits. La relación entre umbral (2.0) y resultado (2.92) sugiere que el umbral fue elegido
para que CAP04 lo supere — no derivado independientemente. Si el umbral fuera 3.0, CAP04
no mostraría "señal de alucinación."

---

## CAPA 6: SÍNTESIS DE VEREDICTO

### VERDADERO

| Claim | Evidencia que lo respalda | Fuente |
|-------|--------------------------|--------|
| La fórmula H(R,A|Q) = H(R\|Q) + H(A\|Q) - I(R,A\|Q) es matemáticamente correcta | Regla de cadena de entropía condicional | Shannon (1948), teoría de información estándar |
| H(R\|Q) = 2.09 bits es correcto dado P(Rᵢ\|Q) presentada | El cálculo aritmético es verificable y correcto | Shannon entropy estándar |
| H(A\|Q) = 0.88 bits es correcto dado P(Aⱼ\|Q) presentada | El cálculo aritmético es verificable y correcto | Shannon entropy estándar |
| ECE de Claude Haiku (0.122) es menor que Kimi K2 (0.726) según Ghosh & Panday | Datos tomados del paper — plausible aunque no peer-reviewed | Ghosh & Panday (2026) preprint |
| Claude Haiku tiene mayor accuracy que Kimi K2 en el benchmark citado | Ídem — diferencia consistente con múltiples benchmarks | Ghosh & Panday (2026) preprint |
| La entropía conjunta H(R,A\|Q) mide inconsistencia entre razonamiento y respuesta cualitativamente | Principio conceptual correcto de información mutua | Teoría de información estándar |

### FALSO (como presentado)

| Claim | Por qué es falso | Contradicción/evidencia |
|-------|-----------------|------------------------|
| I(R,A\|Q) ≈ 0.05 bits dado P(A₁\|R₁)=0.95 y P(A₁\|Q)=0.60 | Aritméticamente incorrecto — solo el término R₁-A₁ contribuye ~0.36 bits | CONTRADICCIÓN-3 + CAPA 8 |
| λ₁-λ₅ fueron "calibrados" contra Ghosh & Panday | Solo λ₁ tiene derivación (circular); λ₂-λ₅ son valores asignados sin ecuación | E-1 + CONTRADICCIÓN-1 |
| λ₁=5.0 está "validado" con "HIGH confidence" | El resultado (2.91) "exceeds observed gap" — el propio texto admite que sobre-estima | CONTRADICCIÓN-4 + SALTO-5 |
| ECE = \|0.95 - 0.0034\| ≈ 0.95 es Expected Calibration Error | ECE formal requiere binning y promedios sobre múltiples muestras; esto es calibration error para una instancia | CONTRADICCIÓN-6 |
| "Model reported '67 elements' with implied confidence ~95%" | "Implied confidence" no está definida; coincide con P₀=0.95 elegido arbitrariamente | CONTRADICCIÓN-2 + SALTO-8 |
| CHI 2026 papers "validan" los resultados cuantitativos del modelo | Los papers proveen alineación cualitativa, no validación cuantitativa de H(R,A\|Q) ni λᵢ | CONTRADICCIÓN-5 |
| P(Rᵢ\|Q) y P(Aⱼ\|Q) son "CAP04 computation" medidas | Distribuciones con valores redondos sin protocolo de medición — inventadas | SALTO-1 + SALTO-2 + E-3 |
| P(Aⱼ\|Rᵢ) son valores medidos | Requieren acceso a procesos internos del modelo imposible para Claude API | SALTO-3 |
| Threshold 2.0 bits está derivado de Pesaranghader & Li (2026) | No hay referencia que establezca este umbral; diseñado para capturar CAP04 | E-7 |
| La fórmula de Sec 5 es diferente a Temporal Decay prohibida | Es estructuralmente P₀×e^(-Σλᵢxᵢ) — extensión multidimensional de P₀×e^(-r×d) | Restricción THYROX deep-dive |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría para volverse verdadero/falso |
|-------|--------------------------|----------------------------------------------|
| H(R,A\|Q) captura información relevante sobre alucinación | Concepto plausible pero no validado cuantitativamente | Experimento controlado con acceso a razonamiento interno del modelo |
| Pesaranghader & Li (2026) Definition 4.1 es aplicable a LLMs | Preprint no peer-reviewed; aplicación a LLMs no derivada en el documento | Publicación peer-reviewed + protocolo de medición de P(R\|Q) |
| Ghosh & Panday accuracy y ECE de Haiku/Kimi son correctos | Preprint arXiv, benchmark no especificado en el documento | Acceso al paper completo + replicación del benchmark |
| Π_inconsist existe como variable medible | No definido operacionalmente en el documento | Definición operacional + protocolo de medición |
| Δu_t = 0.35 para CAP04 | Hereda el mismo problema de u_t inobservable de Part A Sec 2.3 | Ver análisis de SALTO-8 en Part A deep-dive |
| La forma exponencial es la correcta para modelar P(correct) | Supuesto funcional no justificado | Comparación con formas alternativas (lineal, logística, etc.) sobre datos reales |

### Patrón dominante: Calibración performativa

**Definición:** Ejecutar operaciones que parecen calibración (usar datos externos, derivar
parámetros con ecuaciones, aplicar a casos de estudio) sin que ninguna de esas operaciones
produzca constricción real de los parámetros por los datos.

**Cómo opera en este documento específicamente:**

1. Los datos "externos" (Ghosh & Panday) son preprints no peer-reviewed con información
   suficiente para crear apariencia de calibración pero insuficiente para constrañir todos
   los parámetros.
2. Los d_basin usados para derivar λ₁ son "assumed" — el documento lo dice explícitamente.
   Una "derivación" sobre datos asumidos no es calibración.
3. λ₂, λ₃, λ₄, λ₅ no tienen ninguna ecuación que los conecte a los datos de Ghosh & Panday —
   aparecen directamente como valores finales.
4. λ₁ se cambia de 4.0 (derivado) a 5.0 (final) sin justificación.
5. Los resultados finales (P=0.34% para CAP04) son consistentes con los datos CHI de
   manera cualitativa — lo cual confirma la plausibilidad pero no valida los parámetros.

El efecto neto: el documento parece haber calibrado 5 parámetros contra 2 datasets
externos, pero en realidad tiene libertad completa para elegir cualquier valor porque
las constrañen solo datos asumidos y ecuaciones con grados de libertad no cerrados.

---

## CAPA 7: ANÁLISIS DE CALIBRACIÓN CIRCULAR

Esta capa examina si los parámetros λᵢ tienen calibración empírica independiente.

### Anatomía de la "calibración" en Sec 5

**Datos disponibles:**
- Claude Haiku: accuracy 75.4%, confidence 86.0%, ECE 0.122
- Kimi K2: accuracy 23.3%, confidence 95.7%, ECE 0.726
- d_basin Haiku: "assumed ≈ 0.05" (no medido)
- d_basin Kimi: "assumed ≈ 0.20" (no medido)

**Ecuación usada para derivar λ₁:**
```
log(P_Haiku / P_Kimi) ≈ λ₁ × (d_Kimi - d_Haiku)
log(0.754 / 0.233) ≈ λ₁ × (0.20 - 0.05)
0.604 ≈ λ₁ × 0.15
λ₁ ≈ 4.0
```

**Problema A — Ecuación subdeterminada:**
Esta ecuación asume que TODOS los otros términos (λ₂H + λ₃Δu_t + λ₄Π + λ₅τ) son iguales
para Haiku y Kimi o igual a cero. El documento no justifica esta asunción. Si H(R,A|Q)
fuera diferente para Haiku y Kimi (plausible — modelos con diferente calibración probablemente
tienen diferente consistencia razonamiento-respuesta), entonces la ecuación tiene múltiples
incógnitas y la "derivación" de λ₁=4.0 no es única.

**Problema B — d_basin "assumed" no constraine λ₁:**
Si d_Haiku ≈ 0.05 se cambia a 0.10 (valor que el propio Part B usa para CAP04), la
ecuación produce λ₁ = 0.604 / (0.20 - 0.10) = 0.604 / 0.10 = 6.04. La derivación
de λ₁ es extremadamente sensible al valor de d_basin asumido — sensibilidad que el
documento ignora.

**Problema C — λ₂, λ₃, λ₄, λ₅ sin calibración:**
No existe ninguna ecuación en el documento que conecte λ₂=0.8, λ₃=3.0, λ₄=2.0, λ₅=0.02
a los datos de Ghosh & Panday. Estos valores aparecen sin justificación. Podría elegirse
λ₂=1.5, λ₃=0.5, λ₄=4.0, λ₅=0.1 y producir resultados igualmente "plausibles" sin
contradecir ningún dato del documento.

**Problema D — Circularidad del ajuste final:**
El documento "valida" λ₁=5.0 con la ecuación:
```
5.0×0.15 + 0.8×2.7 = 0.75 + 2.16 = 2.91 (exceeds observed gap)
```
El "observed gap" es log(0.754/0.233) = 0.604 bits. La predicción 2.91 excede 0.604 por
un factor de ~4.8. El documento llama a esto "validates" cuando en realidad muestra que
la fórmula sobrestima el gap por 380%. Si una fórmula produce resultados que exceden la
observación en 380%, no está validada — está mal calibrada.

**Conteo de grados de libertad:**
- Incógnitas: λ₁, λ₂, λ₃, λ₄, λ₅, P₀ = 6 parámetros
- Ecuaciones con datos reales: 0 (todos los datos son asumidos o hay una sola ecuación
  subdeterminada)
- Resultado: el sistema está completamente subidentificado — cualquier combinación de
  λᵢ es compatible con los "datos"

**Conclusión:** La fórmula de Sec 5 tiene 6 parámetros libres calibrados con 0 datos
empíricos independientes. No es calibración — es ajuste de parámetros libre.

---

## CAPA 8: VERIFICACIÓN ARITMÉTICA DE INFORMACIÓN MUTUA (I(R,A|Q))

Esta capa computa I(R,A|Q) usando las distribuciones presentadas en el documento.

### Datos del documento

```
P(R₁|Q)=0.40, P(R₂|Q)=0.15, P(R₃|Q)=0.20, P(R₄|Q)=0.15, P(R₅+|Q)=0.10
P(A₁|Q)=0.60, P(A₂|Q)=0.30, P(A₃|Q)=0.10

P(A₁|R₁)=0.95, P(A₂|R₁)=0.04, P(A₃|R₁)=0.01
P(A₁|R₄)=0.05, P(A₂|R₄)=0.90, P(A₃|R₄)=0.05

[Para R₂, R₃, R₅+ no se dan valores de P(A|R) — el documento los ignora]
```

### Fórmula de información mutua condicional

```
I(R,A|Q) = Σᵢ Σⱼ P(Rᵢ|Q) · P(Aⱼ|Rᵢ) · log₂[P(Aⱼ|Rᵢ) / P(Aⱼ|Q)]
```

### Cálculo del término R₁-A₁ (el término dominante)

```
Contribución(R₁,A₁) = P(R₁|Q) × P(A₁|R₁) × log₂[P(A₁|R₁) / P(A₁|Q)]
                     = 0.40 × 0.95 × log₂(0.95/0.60)
                     = 0.38 × log₂(1.5833)
                     = 0.38 × 0.6634 bits
                     ≈ 0.252 bits
```

### Cálculo del término R₁-A₂

```
Contribución(R₁,A₂) = 0.40 × 0.04 × log₂(0.04/0.30)
                     = 0.016 × log₂(0.1333)
                     = 0.016 × (-2.907 bits)
                     ≈ -0.047 bits  [contribución negativa — reduce I]
```

### Cálculo del término R₁-A₃

```
Contribución(R₁,A₃) = 0.40 × 0.01 × log₂(0.01/0.10)
                     = 0.004 × log₂(0.10)
                     = 0.004 × (-3.322 bits)
                     ≈ -0.013 bits  [contribución negativa — reduce I]
```

### Cálculo del término R₄-A₁

```
Contribución(R₄,A₁) = 0.15 × 0.05 × log₂(0.05/0.60)
                     = 0.0075 × log₂(0.0833)
                     = 0.0075 × (-3.585 bits)
                     ≈ -0.027 bits  [contribución negativa — reduce I]
```

### Cálculo del término R₄-A₂

```
Contribución(R₄,A₂) = 0.15 × 0.90 × log₂(0.90/0.30)
                     = 0.135 × log₂(3.0)
                     = 0.135 × 1.585 bits
                     ≈ 0.214 bits
```

### Cálculo del término R₄-A₃

```
Contribución(R₄,A₃) = 0.15 × 0.05 × log₂(0.05/0.10)
                     = 0.0075 × log₂(0.50)
                     = 0.0075 × (-1.0 bits)
                     ≈ -0.008 bits
```

### Suma parcial — solo R₁ y R₄ (únicos con P(A|R) especificados)

```
I_parcial(R₁,R₄) ≈ 0.252 - 0.047 - 0.013 - 0.027 + 0.214 - 0.008
                  ≈ 0.371 bits
```

Esta suma parcial incluye solo los razonamientos R₁ y R₄ — para los cuales el documento
provee P(Aⱼ|Rᵢ). Ya es 0.371 bits, mayor por un factor de 7.4 que el valor reportado de
0.05 bits. La información mutua total I(R,A|Q) solo puede ser mayor que esta suma parcial
si las contribuciones de R₂, R₃, R₅+ son fuertemente negativas — lo cual requeriría que
esos razonamientos tengan distribuciones de respuesta extremadamente sesgadas en sentido
opuesto al prior P(Aⱼ|Q).

### Inconsistencia central

Para obtener I(R,A|Q) ≈ 0.05 bits dado los datos presentados, las distribuciones P(Aⱼ|R₂),
P(Aⱼ|R₃), P(Aⱼ|R₅+) tendrían que contribuir aproximadamente -0.321 bits. Esto requeriría
que esos razonamientos produzcan respuestas con distribuciones fuertemente anti-correladas
con el prior — es decir, si P(A₁|Q)=0.60, entonces P(A₁|R₂), P(A₁|R₃), P(A₁|R₅+) tendrían
que ser cercanas a 0. Esto no es imposible, pero el documento no presenta estas distribuciones
y no puede ser asumido sin justificación.

**Conclusión:** I(R,A|Q) ≈ 0.05 bits es FALSO dado los datos que el documento presenta
para R₁ y R₄. La estimación mínima computable con datos disponibles es ~0.371 bits.
La diferencia hace que H(R,A|Q) sería como máximo 2.09 + 0.88 - 0.371 = 2.599 bits —
no 2.92 bits. Esto aún supera el umbral de 2.0 bits, pero el cálculo presentado no es
consistente internamente.

---

## CAPA 9: COMPARATIVA CON PART A — ¿Mismos patrones o diferentes?

### Tabla de patrones compartidos con Part A

| Patrón estructural | Part A | Part B | Evaluación |
|-------------------|--------|--------|------------|
| Números sin fuente presentados como "computation" o "empirical" | ᾱ=0.83, db_t/dt=0.02, d_basin tabla | P(Rᵢ\|Q), P(Aⱼ\|Q), P(Aⱼ\|Rᵢ), Π_inconsist=0.87 | MISMO PATRÓN — intensificado en Part B (más variables sin fuente) |
| Inobservabilidad no declarada | d_basin requiere h^(ℓ) inaccesible | P(Rᵢ\|Q) requiere acceso a procesos internos inaccesibles | MISMO PATRÓN — aplica a todas las distribuciones de Sec 4 |
| Calibración circular | ᾱ=0.83 calibrado sobre datos usados para "validar" | λ₁ derivado sobre d_basin asumidos; fórmula "validada" sobre mismos datos | MISMO PATRÓN — más agresivo en Part B (6 parámetros libres) |
| Mislabeling epistémico | arXiv como "Peer-Reviewed" | "HIGH confidence" como estadística; "validates" cuando sobre-estima en 380% | MISMO PATRÓN — peor en Part B (afirmaciones cuantitativas sin respaldo) |
| Límitación enterrada | h^(ℓ) inaccesible en Sec 4.2 lejos de tabla Sec 2.5.5 | No hay sección de limitaciones en Part B | PEOR EN PART B — no hay sección de limitaciones en absoluto |
| Engaño por referencia a literatura | Cherukuri & Varshney usado sin verificar precondiciones | Pesaranghader & Li (2026) y Ghosh & Panday (2026) — ambos preprints sin peer-review | MISMO PATRÓN |
| Fórmula exponencial prohibida | No presente en Part A (aparece Thm 2.5.1 pero sin forma e^x) | Sección 5 — forma explícita P₀×e^(-Σλᵢxᵢ) | NUEVO EN PART B — este es el patrón central y el más grave |
| Pseudomatemática formal | Thm 2.5.1 sin proof | Threshold 2.0 bits sin derivación; I(R,A\|Q) incorrecto | MISMO PATRÓN — diferente manifestación |
| Validación cualitativa presentada como cuantitativa | Tabla layer-by-layer como "empirical" | CHI papers "align with" P=0.34% | MISMO PATRÓN |

### Diferencias estructurales entre Part A y Part B

| Dimensión | Part A | Part B | Dirección |
|-----------|--------|--------|-----------|
| Número de parámetros sin fuente | ~7 (ᾱ, db/dt, ||u||, t_conv, etc.) | ~12 (6 λᵢ + 5 distribuciones + Π_inconsist) | PEOR EN PART B |
| Presencia de sección de limitaciones | Sí — Sec 4.2 admite h^(ℓ) inaccesible | No — ninguna sección equivalente | PEOR EN PART B |
| Derivación que falla aritméticamente | Thm 2.5.1 sin proof pero sin aritmética incorrecta | I(R,A\|Q) ≈ 0.05 bits matemáticamente inconsistente | NUEVO TIPO DE ERROR — Part B tiene error aritmético verificable |
| Uso de fórmula exponencial prohibida | Ausente | Central (Sec 5) | NUEVO PROBLEMA GRAVE EN PART B |
| Grados de libertad en calibración | ᾱ=1 parámetro libre | λ₁-λ₅, P₀ = 6 parámetros libres | PEOR EN PART B — más grados de libertad |
| Error en término técnico (ECE) | No presente | ECE calculado incorrectamente como instancia única | NUEVO TIPO DE ERROR EN PART B |

### Evolución del patrón de engaño

Part A establece los mecanismos cualitativos (basin theory, inobservabilidad). Part B
construye sobre Part A con una fórmula cuantitativa que debería "demostrar" los mecanismos
de Part A. Esta estructura crea una apariencia de progresión científica:

```
Part A: Marco teórico cualitativo + datos inobservables presentados como mediciones
Part B: Fórmula cuantitativa calibrada sobre los datos cuestionables de Part A
        + datasets externos (preprints) para dar apariencia de validación externa
        + aplicación a casos concretos que producen valores dramáticos (0.34%)
        + confirmación cualitativa de literatura CHI
```

El resultado es un circuito autorreferencial: Part B cita Part A como base (que tiene datos
problemáticos), calibra parámetros con libertad completa, produce resultados dramáticos, y
los "valida" con papers que no miden las mismas cantidades. Ningún paso del circuito tiene
validación externa real.

### Lo nuevo de Part B que no estaba en Part A

Part B introduce tres problemas sin precedente en Part A:

1. **Error aritmético verificable:** I(R,A|Q) ≈ 0.05 bits es matemáticamente incorrecto
   dado los propios datos del documento. En Part A, los problemas eran inobservabilidad
   e inflación semántica — no errores aritméticos directamente verificables.

2. **Fórmula explícitamente prohibida:** La forma P₀×e^(-Σλᵢxᵢ) es la fórmula de Temporal
   Decay prohibida en THYROX (ver restricción en deep-dive.md). Part A no presentó esta
   forma explícita.

3. **Término técnico mal aplicado:** ECE se calcula como |P₀ - P(correct)| para una instancia.
   Esta no es la definición de ECE — es la diferencia entre prior y resultado. En Part A,
   los términos técnicos son usados correctamente aunque sus aplicaciones son problemáticas.

---

## Resumen ejecutivo: Lo que es válido y lo que no usar en THYROX

### Aprovechable (con precaución explícita)

1. **Concepto de H(R,A|Q) como medida de inconsistencia:** La idea de usar entropía conjunta
   para cuantificar inconsistencia entre razonamiento y respuesta es conceptualmente interesante.
   Puede usarse como hipótesis de trabajo — no como métrica calibrada.

2. **Diferencia ECE entre Claude Haiku y Kimi K2:** La observación de que Haiku tiene ECE
   0.122 y Kimi K2 tiene ECE 0.726 (según Ghosh & Panday preprint) es consistente con
   lo que se sabe cualitativamente sobre la calibración de los modelos. Puede citarse como
   observación de preprint — no como hecho validado.

3. **Principio cualitativo:** Modelos con mayor inconsistencia razonamiento-respuesta tienen
   mayor probabilidad de alucinación. Es plausible y alineado con literatura de hallucination.

### Prohibido en THYROX (claims específicos)

- ❌ La fórmula P₀×e^(-λ₁d_basin - λ₂H(R,A|Q) - ...) — es la fórmula de Temporal Decay
  prohibida extendida a 5 dimensiones
- ❌ λ₁=5.0, λ₂=0.8, λ₃=3.0, λ₄=2.0, λ₅=0.02, P₀=0.95 — sin calibración empírica
  independiente
- ❌ I(R,A|Q) ≈ 0.05 bits — matemáticamente incorrecto dado datos propios del documento
- ❌ H(R,A|Q) = 2.92 bits para CAP04 — dependiente de distribuciones sin fuente
- ❌ Threshold 2.0 bits como señal de alucinación — sin derivación
- ❌ P(correct|CAP04) = 0.34% — construido sobre 12+ parámetros sin fuente
- ❌ ECE = |0.95 - 0.0034| ≈ 0.95 — no es la definición de ECE
- ❌ Π_inconsist — no definido operacionalmente
- ❌ "HIGH confidence" para λ₁=5.0 — no es una categoría estadística
- ❌ Las distribuciones P(Rᵢ|Q), P(Aⱼ|Q), P(Aⱼ|Rᵢ) de Sec 4 como datos empíricos

### Línea de base para decisiones en THYROX (Principios cualitativos con respaldo independiente)

Además de los 4 principios identificados en el análisis de Part A:

> **Principio 5 (de Part B — versión qualitativa):** Cuando el razonamiento de un modelo
> es inconsistente con su respuesta (el modelo concluye X pero responde Y, o usa razonamiento
> que no conduce a su respuesta), la probabilidad de que la respuesta sea correcta disminuye.
> Este principio no requiere I(R,A|Q) = 0.05 bits — es robusto a cualquier medida de
> inconsistencia razonamiento-respuesta.
>
> **Principio 6:** Los modelos con alta confianza declarada y baja accuracy tienen ECE alta —
> lo cual crea problemas de calibración que el usuario no puede corregir solo viendo el output.
> (Respaldado empíricamente por Ghosh & Panday preprint, aunque pendiente de revisión por pares.)

