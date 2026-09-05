```yml
created_at: 2026-04-18 10:24:53
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
fuente: Claude Architecture as Dynamic System — Part A v2.1
ratio_calibracion: 5/13 (38%)
clasificacion: REALISMO PERFORMATIVO
```

# Análisis de calibración: Claude Architecture as Dynamic System — Part A v2.1

---

## Sección 1 — Detección de realismo performativo

### Ratio de calibración: 5/13 (38%)
### Clasificación: REALISMO PERFORMATIVO

El documento opera en dos registros simultáneos: un núcleo de resultados importados con respaldo externo (Thm 3.2, Thm 3.3, softmax math) y un estrato de claims cuantitativos específicos sin fuente derivable (db_t/dt, ||u_1-u_0||, P(u_0|query), ᾱ). La Sección 4 admite limitaciones parcialmente, pero deja sin reconocer las brechas más graves.

### Tabla de afirmaciones — clasificación completa

| # | Claim (texto) | Sección | Tipo | Impacto | Problema |
|---|---------------|---------|------|---------|---------|
| 1 | `P(u_0|query) ≈ 0.95, P(u_1|query) ≈ 0.05` | 2 | Performativo | Alto | Sin protocolo de medición, tamaño de muestra, ni definición de "query" — son números CAP04 presentados como dato |
| 2 | `db_t/dt ≈ 0.02 por feedback iteration` | 2 | Performativo | Alto | `b_t` no está definido; la tasa diferencial no tiene unidades; no hay experimento citado |
| 3 | `convergencia ~45 iteraciones` | 2 | Performativo | Medio | Aritméticamente consistente con 1/0.02 = 50, lo que sugiere que el número no es empírico sino derivado de otro número sin fuente |
| 4 | `||u_1 - u_0||_2 ≈ 0.35 en intent space` | 2 | Performativo | Alto | "Intent space" no tiene métrica estándar; medir norma L2 requeriría acceso a representaciones internas; número es ilustrativo |
| 5 | `T_U es "sticky": training rewards confident answers` | 2 | Inferencia calibrada | Alto | Mecanismo conocido de RLHF — la dirección es correcta aunque la magnitud (0.02, 45 it.) no tenga fuente |
| 6 | Theorem 2.5.1: `P_ℓ(hall | h^(ℓ)) = P(h^(ℓ) ∈ B^(ℓ) | architecture)` "deterministic, independent of training weights" | 2.5 | Performativo | Alto (gate-bloqueante) | Definición disfrazada de teorema — los pesos determinan las funciones de atención y FFN; decir que P es independiente de pesos contradice la arquitectura transformer; no es un teorema demostrado sino una redefinición tautológica |
| 7 | `d_basin L5=0.150, L8=0.099, L15=0.027, L20=0.008, L32<0.001` | 2.5 | Observación directa (CAP04) | Medio | Serie internamente consistente; el problema es la generalización, no la medición en sí |
| 8 | `ᾱ ≈ 0.83 (average contraction)` | 2.5 | Inferencia no-calibrada | Alto | Los ratios calculables de la tabla (0.099/0.150 ≈ 0.66; 0.027/0.099 ≈ 0.27) no promedian a 0.83; la fórmula de derivación del promedio no está explicitada; el número es inconsistente con sus propios datos de soporte |
| 9 | Theorem 3.2 (Cherukuri & Varshney Thm 5.9): contracción exponencial, PROVEN | 3 | Inferencia calibrada condicional | Medio | Válido si la referencia existe y aplica a transformers discretos; la transitividad de la prueba (sistemas continuos → red discreta con pesos) no está garantizada en el documento pero está declarada como limitación implícita |
| 10 | Theorem 3.3: `ρ_var^(ℓ) = Var[factual]/Var[hallucinated] ≥ C log(|A|+1)` | 3 | Inferencia calibrada | Alto | La estructura del teorema es sólida y el resultado |A|=1 → AUROC ~0.91 tiene respaldo interno; la restricción a CAP04 está admitida en Sec 4 |
| 11 | Softmax concentration: input ambiguo → atención uniforme → output ≈ centroid | 2.5 | Observación directa (matemática) | Alto | Resultado matemático demostrable de la función softmax; no requiere experimento adicional |
| 12 | LayerNorm: `‖h^(ℓ)‖₂ ≤ R → estabiliza basin, previene escape` | 2.5 | Observación directa (matemática) | Medio | La cota es matemáticamente correcta dado LayerNorm; la implicación "prevents escape" es consecuencia directa de la cota |
| 13 | Sec 4 admite: "hidden states inferred", "CAP04 may not generalize", "correlation ≠ causation" | 4 | Especulación útil | Bajo | Admisión correcta pero incompleta — no admite que Thm 2.5.1 es una definición, ni que db_t/dt carece de fuente, ni la brecha de traducción entre sistemas continuos y transformers discretos |

### Conteo por tipo

| Tipo | Count |
|------|-------|
| Observación directa (matemática/tabla) | 3 |
| Inferencia calibrada | 2 |
| Inferencia calibrada condicional | 1 |
| Inferencia no-calibrada | 1 |
| Afirmación performativa | 5 |
| Especulación útil | 1 |

Ratio = (3 + 2 + 1) / 13 = **46%** si se incluye la inferencia condicional.
Ratio conservador (solo observaciones directas + calibradas) = **5/13 = 38%**.
Umbral para artefacto de análisis: ≥ 50%. **No alcanzado.**

### Brechas que la Sección 4 NO admite

1. **Theorem 2.5.1 no es un teorema.** Es una definición: reescribe P(hall | h) como P(h ∈ basin | architecture). No demuestra nada nuevo — tautologiza la relación. La Sec 4 lo lista bajo "PROVEN" sin caveat.

2. **db_t/dt ≈ 0.02 carece de fuente primaria.** La Sec 4 admite que "μ^(ℓ) requires hidden state access" pero no menciona que la tasa de cambio del belief tampoco tiene experimento de respaldo.

3. **ᾱ ≈ 0.83 es inconsistente con los datos de la tabla.** La Sec 4 no lo menciona. Un revisor que calcule los ratios de d_basin de la tabla CAP04 no llega a 0.83 con ninguna fórmula de promedio estándar.

4. **La aplicación de Thm 5.9 (Cherukuri & Varshney) a transformers discretos** requiere un paso de traducción que el documento no provee. La distinción sistemas continuos / redes discretas con pesos finitos es estructural.

---

## Sección 2 — Aplicación a THYROX

Solo se mapean conceptos con evidencia suficiente (observaciones directas + inferencias calibradas). Los claims performativos quedan excluidos de esta tabla.

| Concepto del documento | Estado epistémico | Aplicación concreta a THYROX | Condición de validez | Observable en THYROX |
|------------------------|-------------------|------------------------------|---------------------|----------------------|
| **Non-stationarity de T_U (sticky belief)** | Inferencia calibrada — mecanismo RLHF conocido | El mismo agente que genera un artefacto NO puede ser su propio evaluador en un gate: su belief sobre la calidad del artefacto está sesgado hacia confirmar lo que produjo (sticky toward confident output). Gate entre Stage 1→3 y Stage 3→5 DEBE involucrar un agente o proceso separado, o una checklist de evidencia externa al texto producido. | Validez condicional a que el evaluador comparte el mismo modelo base que el generador. Si el gate usa human review o tool output (grep, bash), el sesgo no aplica. | Si: comparar auto-evaluación del agente con checklist externa de evidencia — divergencia observable cuando el agente dice "completo" y la checklist marca items vacíos |
| **Softmax concentration (prompts ambiguos → centroid)** | Observación directa matemática | Cuando un exit criterion de THYROX es ambiguo ("el análisis es suficientemente completo"), el agente produce respuestas que parecen correctas pero son promedios del espacio de respuestas plausibles — no verificaciones reales. Implicación de diseño: los exit criteria de THYROX deben tener predicados booleanos `|A|=1`, no juicios de calidad abiertos. | Universal — es consecuencia matemática de softmax, no específica de CAP04. | Si: comparar exit criteria abiertos ("análisis completo") con exit criteria cerrados ("archivo X existe Y grep Z retorna output") — la diferencia en tasa de falsos positivos es medible |
| **Theorem 3.2: contracción exponencial por capas** | Inferencia calibrada condicional (requiere aceptar la referencia Cherukuri & Varshney en contexto transformer) | Si el error entra en un artefacto en Stage 1 (DISCOVER), las capas de procesamiento posterior (Stages 2-6) lo contraen hacia un basin de error, no lo corrigen. La validación de claims DEBE ocurrir en el stage donde se producen, no diferida a stages posteriores. Corrección tardía de un claim falso en Stage 5 es más costosa que detección en Stage 1. | Condición: aplicar solo a claims factuales que se propagan como inputs a stages posteriores. No aplica a claims locales a un stage que no se referencian después. | Si: rastrear qué afirmaciones del discover aparecen como premises en el risk register o en la estrategia — si el claim inicial era falso, la propagación es observable |
| **Theorem 3.3: |A|=1 maximiza verifiabilidad (AUROC ~0.91)** | Inferencia calibrada — estructura matemática sólida, AUROC empírico restringido a CAP04 | Exit conditions de THYROX deben diseñarse como predicados atómicos booleanos (|A|=1): "bash ls muestra archivo X" o "grep retorna al menos N matches". Predicados compuestos o de calidad abierta (|A|→∞) tienen AUROC cercano a chance — el agente no puede distinguir si los cumple o no. | El AUROC 0.91 específico aplica a CAP04; la dirección del efecto (|A|=1 > |A|>1) es estructuralmente robusta. No usar 0.91 como umbral — usar la dirección. | Si: comparar tasa de falsos positivos entre gates con predicados booleanos vs gates con criterios cualitativos en el historial de WPs anteriores |
| **LayerNorm: una vez en basin, escape geométricamente imposible sin intervención** | Observación directa matemática (la cota es consecuencia de LayerNorm) | Una vez que un artefacto THYROX contiene un claim falso que otros claims internos referencian, la revisión interna del artefacto no puede corregirlo — la "atención" del agente sobre el propio documento converge hacia la coherencia del basin existente. Corrección requiere intervención externa: herramienta (bash, grep) o human gate. | Universal dado el mecanismo de LayerNorm; aplica cuando el documento tiene suficiente coherencia interna para crear su propio atractor. | Si: pedir al agente que "revise" un artefacto con error deliberado — si el agente corrige el error vs. lo racionaliza, la diferencia es observable |

### Conceptos excluidos de la aplicación (performativos)

| Concepto excluido | Razón |
|-------------------|-------|
| `db_t/dt ≈ 0.02`, convergencia `~45 iteraciones` | Sin fuente — usar como parámetro de diseño sería propagar performatividad |
| `||u_1 - u_0||_2 ≈ 0.35` | Número ilustrativo en espacio sin métrica definida |
| `ᾱ ≈ 0.83` | Inconsistente con los datos de la tabla que supuestamente lo generan |
| Thm 2.5.1 como "deterministic, independent of weights" | Definición tautológica — no añade información sobre el sistema |

---

## Sección 3 — Evidencia observable para los claims INCIERTOS que THYROX querría usar

Estos son los claims del documento que son útiles para THYROX si pudieran calibrarse. Se propone el mecanismo mínimo de evidencia que los convertiría en inferencias calibradas.

### Claim A: Sticky belief — magnitud del sesgo de auto-evaluación

**Uso en THYROX:** justificar que el agente que genera no puede ser el agente que evalúa.
**Estado actual:** dirección correcta, magnitud sin evidencia.
**Evidencia que lo calibraría:**

```
Experimento: dado un artefacto generado por el mismo agente
  Paso 1: bash grep -c "COMPLETADO\|completo\|done" artefacto.md
  Paso 2: comparar con checklist externa de items requeridos
  Paso 3: registrar divergencia (auto-dice completo, checklist marca N items vacíos)
  Repetir en 5 WPs → distribución de divergencia observable
```

**Costo:** ~15 min por WP revisado. Viable a partir de 5 WPs (historial THYROX tiene >40).

### Claim B: Tasa de propagación de error entre stages

**Uso en THYROX:** calibrar cuándo es más costoso corregir un claim falso (Stage 1 vs Stage 5).
**Estado actual:** la dirección del Thm 3.2 es correcta, pero no hay curva de costo empírica.
**Evidencia que lo calibraría:**

```
Observación retrospectiva en historial de WPs:
  bash grep -rn "basado en\|según el análisis\|como se definió en" .thyrox/context/work/
  → identificar claims de Stage 1 que aparecen como premises en stages 3-6
  → para WPs con correcciones documentadas en track/: registrar en qué stage se detectó el error
  → calcular: (stages de propagación) × (artefactos afectados) por corrección tardía
```

**Costo:** ~30 min análisis retrospectivo. Usa el historial existente de THYROX.

### Claim C: Diferencia de tasa de error entre exit criteria booleanos vs cualitativos

**Uso en THYROX:** justificar diseño de exit conditions como predicados `|A|=1`.
**Estado actual:** la dirección del Thm 3.3 es robusta; el AUROC 0.91 es solo CAP04.
**Evidencia que lo calibraría:**

```
Auditoría de exit conditions en WPs anteriores (ÉPICA 35-41):
  bash grep -rn "exit\|gate\|criteria" .thyrox/context/work/ | grep -v "^Binary"
  → clasificar cada exit criterion: booleano (bash/grep verificable) vs cualitativo
  → para WPs completados: ¿el gate fue pasado correctamente? ¿hubo retrabajo posterior?
  → tasa de retrabajo post-gate: booleanos vs cualitativos
```

**Costo:** ~20 min. Usa historial existente. Resultado es ratio, no AUROC — más apropiado para THYROX.

### Claim D: Basin collapse y coherencia interna de artefacto

**Uso en THYROX:** justificar que revisión interna no corrige — se necesita herramienta o human.
**Estado actual:** el mecanismo LayerNorm es matemáticamente correcto; la implicación para artefactos THYROX es una analogía, no una derivación formal.
**Condición de uso sin experimento:** tratar como principio de diseño (hipótesis de trabajo), no como hecho demostrado. Marcar en el diseño de gates como `[HIPÓTESIS OPERATIVA: requiere validación en Pilot stage]`.

```
Evidencia mínima aceptable:
  En Stage 9 PILOT: generar deliberadamente un artefacto con error conocido
  → pedir al agente que lo "revise internamente"
  → pedir al agente que lo "valide con bash/grep"
  → comparar: ¿el agente detecta el error con revisión interna? ¿con herramienta?
  Resultado esperado por la analogía: herramienta detecta, revisión interna no.
```

---

## Resumen ejecutivo para THYROX

El documento provee **cuatro conceptos con suficiente validez estructural** para informar el diseño de gates THYROX, sin requerir aceptar los números específicos sin fuente:

1. **Sticky belief**: separar generador de evaluador en gates — implementable como checklist externa o herramienta.
2. **Softmax concentration**: exit criteria deben ser predicados booleanos — implementable en el template de exit conditions.
3. **Contracción temprana**: validar claims en el stage donde se producen, no diferir — implementable como gate explícito Stage 1→3.
4. **Basin escape imposible sin intervención**: la revisión interna de artefactos no es suficiente — implementable como regla: todo gate requiere al menos un observable de herramienta o human review.

Los cinco claims performativos del documento (db_t/dt, convergencia, ||u||, ᾱ, Thm 2.5.1) NO deben usarse como parámetros de diseño. Propagar números sin fuente a los gates de THYROX sería exactamente el realismo performativo que este WP intenta eliminar.

**Recomendación:** Avanzar con los cuatro conceptos válidos. Diseñar los experimentos de calibración de las Secciones A y B (Claims A-C) como parte del Stage 9 PILOT para obtener evidencia empírica del propio historial THYROX antes de standardizar los umbrales de gates.
