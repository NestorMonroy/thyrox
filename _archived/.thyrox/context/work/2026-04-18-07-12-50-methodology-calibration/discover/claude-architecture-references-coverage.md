```yml
created_at: 2026-04-18 10:08:10
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-review
status: Borrador
version: 1.0.0
fuente: "CLAUDE ARCHITECTURE AS DYNAMIC SYSTEM: FORMAL ANALYSIS — PART A v2.1 (2026-04-18)"
scope: Gap analysis vs .claude/references/ + Proven/Inferred model + uncovered areas del deep-dive
```

# References Coverage — Claude Architecture Formal Document

**Propósito:** Identificar qué cubre el documento formal (POMDP + Basin Attractors) respecto al
corpus existente de `.claude/references/`, qué references crear o actualizar, y qué áreas dejó
sin cubrir el `claude-architecture-pomdp-deep-dive.md`.

---

## 1. Gap analysis — documento formal vs corpus de references

El corpus cubre 49 archivos en `.claude/references/`. El análisis anterior
(`references-calibration-coverage.md`) revisó los 49 en relación al problema general del WP.
Este análisis se enfoca específicamente en los conceptos del documento formal matemático
y su cobertura en el corpus.

| Concepto del documento formal | Archivo más cercano en references | Estado | Brecha concreta |
|-------------------------------|----------------------------------|--------|----------------|
| POMDP como modelo de sesión LLM | — | **Ausente** | No existe ninguna referencia a teoría de decisión bajo incertidumbre aplicada a LLMs |
| Basin attractor / hallucination basin | `glossary.md` → "Hallucination" (1 línea) | **Parcial — definición superficial** | Glossary define hallucination como "información incorrecta con alta confianza". No menciona el mecanismo geométrico (atractor, basin, contracción radial) ni la irreversibilidad por capa |
| Non-stationary intent (T_U sticky) | `subagent-patterns.md` → "aislamiento de contexto" | **Parcial — correlacionado** | Subagent patterns documenta context isolation como solución; el documento formal provee el fundamento de POR QUÉ el aislamiento es necesario (T_U pegajosa al proceso de generación). Son complementarios, no redundantes |
| Distinción epistémica PROVEN vs INFERRED | `glossary.md` → "Anti-hallucination protocol" (1 línea) | **Parcial — sin estructura** | Anti-hallucination protocol dice "verificar contra código real". El documento formal provee una taxonomía de 4 niveles (PROVEN/INFERRED/CALIBRATED/LIMITATIONS) con criterios explícitos por nivel. No hay equivalente en el corpus |
| ECE (Expected Calibration Error) | — | **Ausente** | No existe referencia a métricas de calibración confidence/accuracy en ningún archivo |
| AUROC como métrica de verificabilidad | `development-methodologies.md` → "Eval-Driven" | **Parcial — sin conexión a verificabilidad** | Eval-Driven menciona tipos de eval pero no AUROC ni la relación entre tamaño del answer space |A| y verificabilidad automática |
| Dependencia de la verificabilidad en |A| | — | **Ausente** | El teorema de que verificabilidad decae con |A| → ∞ no aparece en ninguna referencia |
| Radial contraction coefficient α | — | **Ausente** | Concepto matemático sin análogo en el corpus; no necesita un reference file propio (muy técnico) |
| Fisher separation ρ_Fisher | — | **Ausente** | Ídem — exclusivamente matemático, sin aplicación directa a THYROX sin acceso a h^(ℓ) |
| Dunning-Kruger en LLMs (Ghosh & Panday) | `glossary.md` → "Verification paradox" | **Parcial — sin cita** | Verification paradox captura la tensión pero no el resultado empírico cuantitativo (p < 0.001) de que los modelos sobreestiman corrección |
| Evaluador externo como requisito arquitectónico | `subagent-patterns.md` → Pattern 1 (context isolation) | **Parcial — mecánico sin fundamento** | Subagent patterns documenta el CÓMO (agente separado). El documento formal documenta el POR QUÉ (b_t anclado al proceso de generación hace la auto-evaluación inválida) |

### Resumen de cobertura

| Estado | Count | Conceptos |
|--------|-------|-----------|
| Ausente en corpus | 5 | POMDP, ECE, Dependencia en \|A\|, α radial (demasiado técnico), Fisher ρ |
| Parcial (relacionado pero sin el fundamento formal) | 6 | Hallucination, T_U sticky, PROVEN vs INFERRED, AUROC, Dunning-Kruger, evaluador externo |
| Cubierto | 0 | — |

Ningún concepto del documento formal está completamente cubierto en el corpus existente.
El corpus tiene piezas del "qué" (comportamiento observable) pero no el "por qué" (fundamento matemático).

---

## 2. Referencias a crear o actualizar

### 2.1 Crear — `epistemic-classification.md`

**Prioridad:** Alta.

**Justificación:** El gap más importante del corpus no es técnico — es estructural.
El corpus carece de un protocolo para clasificar claims por nivel epistémico.
El documento formal provee un modelo de 4 niveles (Sec 4.1) que es directamente
extrapolable a artefactos THYROX. El `Anti-hallucination protocol` en `glossary.md`
toca el tema en 1 línea; el problema requiere un reference file completo.

**Contenido mínimo del nuevo archivo:**

1. Taxonomía de 5 niveles epistémicos para claims en artefactos THYROX:
   - PROVEN: salida de herramienta ejecutada (Bash, grep, Read) — resultado reproducible
   - CALIBRATED: derivado de historial WP con parámetros ajustados a evidencia observable
   - INFERRED: razonamiento explícito sobre evidencia observable, cadena de pasos visible
   - ESTIMATED: juicio informado, marcado como tal, con incertidumbre declarada
   - PERFORMATIVE: afirmación sin fuente verificable — prohibido en artefactos WP aprobados
2. Protocolo de clasificación: cómo etiquetar cada sección de un artefacto
3. Relación entre nivel epistémico y tipo de evaluador requerido en el gate
4. Ejemplos de cada nivel tomados de artefactos THYROX reales

**Fuente primaria:** Sec 4.1 del documento formal (PROVEN/INFERRED + LIMITATIONS),
adaptada al contexto THYROX.

---

### 2.2 Actualizar — `glossary.md`

**Prioridad:** Media.

Los siguientes términos del documento formal deben agregarse al glosario:

| Término | Definición propuesta | Categoría |
|---------|---------------------|-----------|
| Basin Attractor | Región del espacio de estados internos de un LLM que captura trayectorias independientemente del input x una vez dentro. Propiedad key: insensitivity — el modelo produce distribuciones de output casi idénticas sin importar el input. (Cherukuri & Varshney 2026, Thm 5.1) | AI Engineering |
| ECE (Expected Calibration Error) | Métrica de calibración: ∑_B (n_B/N)\|acc_B - conf_B\|. ECE = 0 significa confianza = corrección empírica; ECE alto = modelo malcalibrado. Requiere historial de gates. | AI Engineering |
| Non-stationary POMDP | Modelo donde la función de transición de intents T_U cambia con el tiempo (por feedback, redefinición, acumulación de contexto). Formaliza por qué el mismo agente que generó un artefacto no puede auto-evaluarlo sin sesgo. | AI Engineering |
| Answer space \|A\| | Tamaño del espacio de respuestas correctas posibles para un exit criterion. \|A\| = 1 → predicado booleano, verificable automáticamente (AUROC ~0.91). \|A\| → ∞ → criterio cualitativo abierto, no verificable automáticamente (AUROC ~0.50). (CHI 2026 PAPER023) | AI Engineering |
| Dunning-Kruger en LLMs | Hallazgo empírico (Ghosh & Panday, p < 0.001): los modelos sobreestiman sistemáticamente la corrección de sus propios outputs. P(model dice correcto) ≠ P(correcto). Fundamento cuantitativo del Artifact Paradox. | Investigación |

Estos 5 términos van en la sección "AI Engineering" del glosario existente.

---

### 2.3 Actualizar — `development-methodologies.md` (sección Eval-Driven)

**Prioridad:** Media-baja.

La sección "Eval-Driven Development" documenta tres tipos de evals (Code-based, LLM-based,
Human grading) sin criterio de cuándo aplicar cada uno. El documento formal provee ese criterio:
el tamaño del answer space |A| determina qué tipo de evaluador es apropiado.

**Adición recomendada:** una nota al final de la sección Eval-Driven:

> Criterio de routing entre tipos de eval: verificabilidad depende de |A| (tamaño del
> answer space). |A| = 1 → Code-based (AUROC ~0.91). |A| semántico pequeño → LLM-based.
> |A| → ∞ → Human grading. Fuente: CHI 2026 PAPER023.

**Nota:** esta adición es de 3 líneas. No requiere crear un nuevo reference file.

---

### 2.4 No crear — fundamentos matemáticos (Basin, POMDP formal)

**Decisión:** No crear un reference file de "claude-architecture-theory.md".

**Justificación:** El documento formal tiene dos limitaciones críticas para uso directo en THYROX:
1. h^(ℓ) no es observable en producción — solo logits están expuestos (Sec 4.2 del documento)
2. Los parámetros calibrados (ᾱ = 0.835, d₀ = 0.165) son específicos de CAP04 y no generalizables

Un reference file con el formalismo matemático completo induciría a usarlo como si los
parámetros fueran aplicables a THYROX, lo cual no tiene base empírica. El valor del
documento formal para THYROX es principio (independencia del evaluador, timing de validación,
verificabilidad según |A|) — no los parámetros numéricos específicos.

El principio ya quedó documentado en `claude-architecture-pomdp-deep-dive.md` (artefacto WP,
no reference) y en el nuevo `epistemic-classification.md` (reference).

---

## 3. Modelo "Proven vs Inferred" como plantilla THYROX

La Sec 4.1 del documento formal estructura claims en dos categorías con símbolos visuales:
`✓ PROVEN` y `⚠ INFERRED`, seguido de `LIMITATIONS` como categoría separada.

Esta estructura es el patrón más transferible del documento a artefactos THYROX.

### 3.1 Por qué esta estructura funciona

El documento formal resuelve un problema que THYROX también tiene: mezcla de claims con
niveles epistémicos distintos en el mismo artefacto, sin señalización al lector.

En el documento formal, la Sec 4.1 separa explícitamente:
- Qué puede el lector usar sin caveat (PROVEN — peer-reviewed)
- Qué requiere juicio adicional (INFERRED — inferido desde evidencia)
- Parámetros específicos que no deben generalizarse (LIMITATIONS — con cita exacta)

En artefactos THYROX actuales, un artefacto de Stage 1 mezcla:
- Outputs de grep (reproducibles = PROVEN)
- Razonamiento del agente (no verificado = INFERRED o PERFORMATIVE)
- Sin separación visual entre ambos

### 3.2 Adaptación propuesta para artefactos THYROX

```markdown
## Claims del artefacto

### Evidencia directa (PROVEN)
> Cada claim en esta sección tiene fuente verificable citada.

- [claim] — Fuente: `grep -r "..." .` → N resultados (ver Bash output línea X)
- [claim] — Fuente: Read `/path/to/file.md:L42`

### Razonamiento derivado (INFERRED)
> Claims derivados de la evidencia anterior. Verificables pero requieren seguir la cadena.

- [claim] — Derivado de: [claim PROVEN anterior] + [regla del sistema]

### Estimaciones (ESTIMATED)
> Juicios informados. Marcados explícitamente. No usar como base de decisión sin verificar.

- [claim] — Estimado porque: [razón]. Rango probable: [X–Y].

### Limitaciones conocidas
> Lo que este análisis NO puede afirmar.

- [limitación] — Porque: [razón específica]
```

### 3.3 Diferencias con el modelo del documento formal

| Dimensión | Documento formal | Adaptación THYROX |
|-----------|-----------------|-------------------|
| Niveles | 2 (PROVEN / INFERRED) + LIMITATIONS | 4 (PROVEN / INFERRED / ESTIMATED / LIMITATIONS) |
| Por qué 4 en THYROX | — | La distinción INFERRED vs ESTIMATED es crítica: un claim INFERRED tiene cadena lógica visible; un ESTIMATED es juicio sin cadena |
| Símbolo visual | ✓ / ⚠ | Encabezado de sección (más legible en markdown) |
| Granularidad | Por claim numerado | Por claim con fuente inline |
| CALIBRATED | Sí (parámetros ajustados a datos) | Incluido en INFERRED para simplificar (THYROX raramente tiene parámetros calibrados en el sentido matemático) |

### 3.4 Dónde aplicar esta plantilla

Aplicar en artefactos que contienen análisis mixto (grep + razonamiento):
- `discover/*-analysis.md` (síntesis de Stage 1)
- `analyze/*-review.md` (sub-análisis de Stage 3)
- `constraints/*-constraints.md` (Stage 4)

No aplicar en artefactos puramente operacionales (task-plans, exit-conditions) — estos
son declarativos, no mixtos epistémicamente.

---

## 4. Lo que el deep-dive NO cubrió — y por qué importa

El `claude-architecture-pomdp-deep-dive.md` es exhaustivo en:
- Notación matemática completa (tabla de 16 símbolos)
- Claims por nivel epistémico (tabla de 12 claims)
- Los 3 teoremas con implicaciones para THYROX
- Las 4 limitaciones reconocidas por los autores
- La conexión con el problema de Temporal Decay

### 4.1 Áreas no cubiertas por el deep-dive

**4.1.1 — Cómo usar estos principios en artefactos THYROX concretos (ALTA RELEVANCIA)**

El deep-dive identifica que el modelo "PROVEN vs INFERRED" es aplicable a THYROX
(Implicación 5, líneas 222-233) pero no provee el formato concreto.
La sección 3 de este documento llena ese gap con una plantilla directamente usable.

**4.1.2 — Gap analysis contra el corpus de references (ALTA RELEVANCIA)**

El deep-dive tiene una tabla "Gaps vs corpus THYROX" (líneas 172-179) con 6 filas,
pero fue escrita sin leer los 49 archivos de references completamente — es una estimación
del agente que generó el deep-dive. El análisis en la sección 1 de este documento
es el resultado de leer los archivos relevantes y verificar cobertura real.

**Diferencia clave:** el deep-dive marca AUROC como "Relacionado pero no el mismo concepto"
en `development-methodologies.md`. La verificación real muestra que Eval-Driven en ese
archivo no menciona AUROC ni la relación con |A|. El gap es mayor que lo estimado.

**4.1.3 — La distinción entre "fundamento formal" y "parámetro aplicable" (MEDIA RELEVANCIA)**

El deep-dive documenta correctamente que ᾱ = 0.835 y d₀ = 0.165 no son universales
(Precaución en Thm 3.2, líneas 99-100). Pero no aborda explícitamente la pregunta de
diseño: ¿qué parte del documento formal SÍ es aplicable a THYROX sin acceso a h^(ℓ)?

Respuesta (no en el deep-dive): el principio de independencia epistémica del evaluador
(fundado en el POMDP) y el criterio de routing por |A| (Thm 3.3) son los dos aportes
aplicables directamente. Los números específicos (ᾱ, d₀, db_t/dt) no lo son.

**4.1.4 — Qué reference files crear — no cubierto en el deep-dive**

El deep-dive recomienda (Sec "Recomendaciones para Stage 3 DIAGNOSE"):
- Crear `calibration-framework.md` — este documento renombra y refina esa recomendación
  como `epistemic-classification.md` (scope más preciso: clasificación epistémica,
  no calibración estadística que requeriría historial de gates)
- Extender `glossary.md` — este documento provee los 5 términos concretos con definiciones

El deep-dive no investiga si ya existe un archivo similar (no lee el índice de references).
La verificación muestra que no existe, confirmando la recomendación.

**4.1.5 — El rol de Dunning-Kruger como fundamento del evaluador externo (MEDIA RELEVANCIA)**

El deep-dive documenta el resultado de Ghosh & Panday en la tabla de claims (línea 57)
pero no conecta ese resultado con la necesidad del evaluador externo. La conexión es:

> Si P(model dice correcto) ≠ P(correcto) sistemáticamente (Dunning-Kruger en LLMs),
> y el gate evalúa con el mismo modelo que generó el artefacto,
> entonces la evaluación hereda el mismo sesgo de sobreestimación.

Esto complementa el argumento del POMDP (b_t anclado) con evidencia empírica independiente
(Dunning-Kruger). Dos fundamentos distintos para la misma conclusión. El deep-dive los
documenta por separado sin conectarlos en una sola cadena de argumento.

---

## 5. Mapa de acción — qué hacer con este análisis

| Acción | Archivo | Stage correcto | Prioridad |
|--------|---------|---------------|-----------|
| Crear `epistemic-classification.md` | `.claude/references/epistemic-classification.md` | Stage 3 DIAGNOSE | Alta |
| Agregar 5 términos a `glossary.md` | `.claude/references/glossary.md` | Stage 3 DIAGNOSE | Media |
| Agregar nota de routing por \|A\| | `.claude/references/development-methodologies.md` | Stage 3 DIAGNOSE | Media-baja |
| Aplicar plantilla PROVEN/INFERRED | Síntesis de Stage 3 DIAGNOSE | Stage 3 DIAGNOSE | Alta |
| No crear `claude-architecture-theory.md` | — | — | Decisión cerrada |

**Nota sobre timing:** estas acciones pertenecen a Stage 3 DIAGNOSE, no al Stage 1 actual.
En Stage 1 DISCOVER el objetivo es identificar los gaps. Las acciones se ejecutan en el stage
correcto según el ciclo THYROX.

---

## 6. Conclusión de cobertura

El documento formal "CLAUDE ARCHITECTURE AS DYNAMIC SYSTEM: FORMAL ANALYSIS — PART A v2.1"
aporta al corpus THYROX principalmente en dos dimensiones:

1. **Modelo epistémico estructurado (PROVEN/INFERRED/LIMITATIONS):** el corpus no tiene equivalente.
   Esta es la transferencia más directa y de mayor valor práctico para artefactos THYROX.

2. **Fundamento formal del evaluador externo:** el corpus tiene el "cómo" (subagent-patterns,
   dual-instance planning) pero no el "por qué" matemático. El POMDP + Dunning-Kruger proveen
   ese fundamento. Valor: legitimación del diseño, no instrucción nueva.

El corpus ya tiene vocabulario adecuado para el problema central del WP (Artifact Paradox,
Trust Calibration, Verification paradox). El documento formal agrega el rigor formal que
justifica por qué esos problemas son estructurales, no accidentales.

**Recomendación:** Avanzar a Stage 3 DIAGNOSE. El corpus de references tiene suficiente base.
La brecha principal (modelo epistémico para artefactos) tiene acción definida y acotada.
