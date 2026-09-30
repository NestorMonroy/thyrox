```yml
created_at: 2026-04-19 06:53:25
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-dive
status: Borrador
version: 1.0.0
fuente: "Análisis Profundo de Calibración por Dominio — CAP10" (documento externo, producido por script Python, 2026-04-19)
veredicto_síntesis: PARCIALMENTE VÁLIDO — CON ERRORES DE CÁLCULO Y SALTOS DE DEFINICIÓN
saltos_lógicos: 5
contradicciones: 4
engaños_estructurales: 5
```

# Deep-Dive Adversarial — Análisis Granular de Calibración por Dominio (CAP10)

---

## VERIFICACIÓN DE COMPLETITUD DEL INPUT

El objeto de análisis es `mcp-granular-calibration-input.md` — un análisis externo producido por
script Python que evalúa Cap.10 con scoring por dominio y sub-caso de uso.

**Señales de completitud evaluadas:**

- El documento está preservado verbatim incluyendo la tabla de scoring de 9 casos de uso
- Los veredictos por dominio (A, B, C, D, E) están completos con justificación
- La Sección 7 (síntesis CAD) y Sección 8 (comparación Cap.9) están íntegras
- La nota sobre discrepancia de scores está incluida al final del input

**Señal de compresión detectada:** ninguna crítica — el input reproduce el documento completo.

**Material de referencia disponible para el meta-análisis:**

1. `mcp-pattern-calibration.md` — análisis THYROX del mismo capítulo (65%, 28 claims)
2. `mcp-audit-deep-dive.md` — deep-dive de la auditoría formal del mismo capítulo
3. `mcp-audit-input.md` — la auditoría formal (referencia secundaria)

Procediendo con análisis completo.

---

## CAPA 1: LECTURA INICIAL

### Tesis del documento

El Capítulo 10 exhibe "Calibración Asimétrica por Dominio (CAD)": la especificación técnica MCP
está bien calibrada (0.91) pero los casos de uso proyectados están pobremente calibrados (0.43),
y el código carece de producción-readiness (0.23). El promedio global es 0.54, inferior al 0.65
del análisis THYROX — el script sostiene que su metodología es "más crítica" y por tanto más precisa.

### Estructura argumental

```
Premisa: calibración = alineación entre certeza expresada y evidencia presentada
Mecanismo: evaluar cada dominio (A–E) con scores per-caso y promediar
Resultado: promedio 0.54 — más crítico que THYROX (0.65)
Implicación: análisis granular es más preciso porque es más severo
```

### Hallazgos centrales del documento

| Dominio | Score | Síntesis del documento |
|---------|-------|------------------------|
| A — Protocolo MCP | 0.91 | Excelente, basado en especificación técnica |
| B — Advertencias honestas | 0.90 | "MEJOR CALIBRADO DEL LIBRO COMPLETO" |
| C — Comparativo MCP vs Tool Calling | 0.72 | Moderado |
| D — Casos de uso (promedio) | 0.43 (tabla: 0.57) | Pobre — proyecciones sin validación |
| E — Defectos de código | 0.23 | Pésima — ausencia de error handling = defecto de calibración |

**Nota de discrepancia declarada por el propio documento:** promedio Dominio D reportado como
0.43 en el veredicto, pero la tabla calcula 0.57. El documento reconoce la discrepancia como
"margen de análisis" sin resolverla.

---

## CAPA 2: AISLAMIENTO DE CAPAS

### Sub-capa A: Frameworks teóricos

| Framework | Validez en dominio original | Instancia en el documento |
|-----------|----------------------------|--------------------------|
| Definición de calibración: "alineación entre certeza expresada y evidencia presentada" | VERDADERO — definición estándar en epistemología y forecasting | Sec.1, definición explícita |
| Scoring por dominio con promedio aritmético como proxy de calibración global | INCIERTO — el promedio aritmético de dominios heterogéneos supone igual peso a cada dominio, lo cual no está justificado | Secs. 2–6, Sec.7 tabla síntesis |
| "Ausencia de error handling = defecto de calibración" | PROBLEMÁTICO — confunde completitud del código con calibración de claims. Ver Capa 3. | Sec.6, todo el Dominio E |
| "Mejor calibrado del libro completo" como claim verificable | REQUIERE datos de todos los capítulos previos — el documento no tiene esos datos | Sec.3, veredicto Dominio B |

### Sub-capa B: Aplicaciones concretas de los frameworks

| Aplicación | Derivada o analógica | Evaluación |
|------------|---------------------|------------|
| Score 0.91 para Dominio A basado en definiciones técnicas correctas | Derivada — la especificación MCP es verificable y las definiciones son de la especificación oficial | CORRECTA |
| Score 0.90 para Dominio B ("MEJOR DEL LIBRO") | El 0.90 está derivado del análisis del Dominio B; el claim "MEJOR DEL LIBRO" requiere datos de todos los capítulos | SCORE DERIVADO, CLAIM COMPARATIVO NO DERIVADO |
| Score 0.43 vs 0.57 para Dominio D | Dos números distintos para el mismo conjunto de datos: contradictorio | FALSO POR INCONSISTENCIA INTERNA |
| Score 0.23 para Dominio E basado en ausencia de error handling | Requiere que la definición de calibración incluya "completitud del código" — no la incluye según Sec.1 | APLICACIÓN INCORRECTA DEL FRAMEWORK |
| Cap.9 "mantiene calibración consistente ~0.77 en todos los dominios" | Analógica — afirmación del documento sin desglose per-dominio de Cap.9 que la respalde | INCIERTO, posiblemente FALSO dado los hallazgos conocidos de Cap.9 |

### Sub-capa C: Números específicos

| Valor | Fuente en el documento | Evaluación |
|-------|----------------------|------------|
| Promedio Dominio D: 0.43 (veredicto sección) | Declarado sin cálculo | INCORRECTO — la tabla da 0.57 |
| Promedio Dominio D: 0.57 (frase entre paréntesis en la tabla) | Calcula el promedio aritmético de los 9 casos en la tabla | CORRECTO matemáticamente: (0.75+0.65+0.70+0.68+0.60+0.75+0.50+0.30+0.20)/9 = 5.13/9 = 0.570 |
| Promedio global: 0.54 | Calculado a partir de los dominios en Sec.7 | VERIFICAR: tabla Sec.7 tiene 10 filas para 5 dominios (D se desglosó en sub-casos). Promedio de la tabla de síntesis ≠ promedio por dominio. La metodología de agregación no está explicitada |
| Score Dominio C: 0.72 | El documento cita 3 sub-scores: 0.3, 0.6, 0.65 | INCONSISTENTE — el promedio de 0.3+0.6+0.65 = 0.517, no 0.72 |
| Cap.9 calibración ~0.77 en "todos los dominios" | Afirmación del documento sin desglose | INCIERTO — contradice hallazgos conocidos de Cap.9 (SICA 0.0, OpenEvolve inoperable) |

**Verificación aritmética del Dominio C:**

El veredicto del Dominio C dice 0.72. Los 3 sub-scores citados explícitamente son:
- "Dynamic discovery" claim: 0.3 (Sec.4, primera instancia)
- Lenguaje comparativo sesgado: calibración "0.6 vs 0.8" (Sec.4, segunda instancia — ambiguo: no queda claro cuál es el score del documento)
- "Superioridad sin reservas": 0.65 (Sec.4, tercera instancia)

El score de 0.72 no es el promedio de esos sub-scores. La metodología de cómo los sub-scores se
agregan al score del dominio no está documentada.

**Verificación aritmética del promedio global 0.54:**

La tabla de Sec.7 tiene 10 filas:
- A (0.91), B (0.90), D-Bases de datos (0.75), C (0.72), D-Medios (0.65), D-Herramientas (0.60),
  D-Multi-paso (0.50), E (0.23), D-IoT (0.30), D-Financiero (0.20)

Suma: 0.91+0.90+0.75+0.72+0.65+0.60+0.50+0.23+0.30+0.20 = 5.76
Promedio de 10 filas: 5.76/10 = 0.576 ≠ 0.54

El promedio declarado (0.54) no resulta de la tabla tal como está presentada. Si se usa solo
los 5 dominios (A, B, C, D-agregado, E) con D usando el promedio-dominio de 0.57:
(0.91+0.90+0.72+0.57+0.23)/5 = 3.33/5 = 0.666 ≠ 0.54

Si se usa D=0.43 (el valor incorrecto del veredicto):
(0.91+0.90+0.72+0.43+0.23)/5 = 3.19/5 = 0.638 ≠ 0.54

Ninguna combinación de los scores declarados reproduce el promedio global 0.54.
El número 0.54 es INCIERTO en su derivación — no está calculado de forma reproducible.

### Sub-capa D: Afirmaciones de garantía

| Garantía | Texto exacto | Evidencia de respaldo |
|---------|-------------|----------------------|
| "MEJOR CALIBRADO DEL LIBRO COMPLETO" (Dominio B) | Sec.3, veredicto | Ninguna comparación inter-capítulo presentada |
| "análisis granular es más crítico" (nota final) | "0.54 vs. 0.65 — análisis granular es más crítico" | La diferencia es atribuible a la metodología del Dominio E (incluir ausencia de error handling), no a mayor rigor en todos los dominios |
| "Riesgo LEGAL: Reguladores negarían licencia" | Sec.5, análisis de Servicios Financieros | Ninguna regulación específica, ninguna jurisdicción, ningún precedente citado |
| "Cap.9 mantiene calibración consistente (~0.77 en todos los dominios)" | Sec.8 | Ningún desglose por dominio de Cap.9 en el documento |

---

## CAPA 3: BÚSQUEDA DE SALTOS LÓGICOS

```
SALTO-1: [Código no incluye error handling] → [El capítulo "no calibra" el código]
          → [Score Dominio E: 0.23 — "calibración pésima"]
Ubicación: Sec.6, todo el análisis del Dominio E
Tipo de salto: redefinición de término encubierta — el documento aplica "calibración"
  a un atributo diferente al declarado en Sec.1
Tamaño: CRÍTICO — invalida el scoring del Dominio E completo
Justificación que debería existir: la definición de Sec.1 establece que calibración =
  "alineación entre certeza expresada y evidencia presentada." Para que la ausencia de
  error handling sea un defecto de calibración, el capítulo debería haber afirmado que
  "el código está listo para producción" o "este código maneja todos los casos de error."
  Si el capítulo presenta el código como ejemplo demostrativo de un concepto, la ausencia
  de error handling no viola la definición de Sec.1 — es un defecto de completitud, no
  de calibración. El documento no cita ningún claim del capítulo que afirme production-readiness
  del código. Sin ese claim, no hay sobrecerteza que calificar — solo código incompleto.
  La distinción importa: calibración mal aplicada produce el mayor diferencial entre
  este análisis (0.23) y el análisis THYROX (que clasifica Dominio E como defectos de
  código con otro criterio).
```

```
SALTO-2: [Score Dominio B: 0.90] → ["MEJOR CALIBRADO DEL LIBRO COMPLETO"]
Ubicación: Sec.3, veredicto del Dominio B
Tipo de salto: extrapolación sin datos
Tamaño: CRÍTICO — el claim requiere datos de todos los capítulos analizados previamente
Justificación que debería existir: el documento debería presentar los scores de Dominio
  equivalente en Cap.6, Cap.7, Cap.8, Cap.9 para comparar. El análisis THYROX tiene
  registros de calibración de advertencias/warnings en caps anteriores. El análisis
  THYROX reporta que Cap.9 tiene Grupo D (advertencias) con score promedio ~0.90 —
  lo que haría del Cap.9 Grupo D un score equivalente al Cap.10 Dominio B, no inferior.
  El claim "MEJOR DEL LIBRO" es una conclusión cross-capítulo que requiere datos
  cross-capítulo. El documento no los tiene.
```

```
SALTO-3: [Dominio D promedio 0.57 en tabla] → [Veredicto Dominio D: 0.43]
Ubicación: Sec.5, tabla vs. veredicto
Tipo de salto: contradicción interna sin resolución — el documento acusa el gap como
  "margen de análisis" sin explicar cuál de los dos números es el metodológicamente correcto
Tamaño: MEDIO — afecta directamente el promedio global
Justificación que debería existir: el documento debería declarar si el 0.43 viene de
  una ponderación diferente (casos de mayor riesgo tienen más peso) o si es simplemente
  un error de cálculo. "Margen de análisis" no es una justificación metodológica — es
  una evasión de la discrepancia.
```

```
SALTO-4: [0.54 < 0.65] → ["análisis granular es más crítico"] → ["más preciso"]
Ubicación: Sec.7 ("vs. reportado 0.65") y nota final del input
Tipo de salto: equiparación de "más severo" con "más preciso"
Tamaño: MEDIO — afecta la validez de la conclusión comparativa
Justificación que debería existir: que un análisis produzca un score más bajo no lo
  hace más preciso — lo hace más severo. La precisión depende de si la metodología
  aplica correctamente la definición declarada. Si el Dominio E está mal clasificado
  como defecto de calibración (ver SALTO-1), entonces el score más bajo del documento
  es consecuencia de un error metodológico, no de mayor rigor. "Más crítico" ≠ "más
  preciso."
```

```
SALTO-5: [Cap.9 fue bien calibrado a nivel global (~77%)] → ["calibración consistente
          en todos los dominios"] → [Score ~0.77 en todos los dominios de Cap.9]
Ubicación: Sec.8, comparación con Cap.9
Tipo de salto: generalización de ratio global a consistencia por dominio
Tamaño: MEDIO — Cap.9 sí tuvo problemas de calibración en dominios específicos
Justificación que debería existir: el análisis THYROX de Cap.9 identificó que SICA
  "opera sin paradigmas tradicionales" tenía score 0.0, y el código de OpenEvolve era
  inoperable (NameError). Esos hallazgos contradicen "calibración consistente en todos
  los dominios." El score global 77% incluye distribución desigual entre claims — no
  implica uniformidad por dominio.
```

---

## CAPA 4: IDENTIFICACIÓN DE CONTRADICCIONES

```
CONTRADICCIÓN-1 (interna al Dominio D — promedio):
Afirmación A: Sec.5, título del veredicto — "Calibración: POBRE (0.43)"
Afirmación B: Sec.5, tabla de scoring — "(Promedio: 0.57 vs. 0.43 reportado — margen de análisis)"
  Verificación directa: (0.75+0.65+0.70+0.68+0.60+0.75+0.50+0.30+0.20)/9 = 5.13/9 = 0.570
Por qué chocan: el número declarado en el veredicto (0.43) no resulta del promedio aritmético
  de los scores de la tabla (0.57). El documento reconoce la discrepancia pero la trata como
  "margen de análisis" — sin explicar qué operación produce 0.43 a partir de los 9 scores dados.
  0.43 podría venir de: (a) un cálculo diferente no documentado, (b) el score de los 3 casos
  "peores" únicamente (0.50+0.30+0.20 = 1.00/3 = 0.333 — tampoco da 0.43), (c) un error de
  cálculo del script Python, o (d) el score que el script asignó antes de actualizar la tabla.
Cuál prevalece: la tabla es el dato más granular y verificable. 0.57 es el promedio correcto de
  los 9 scores declarados. 0.43 es un número sin derivación visible — FALSO como promedio del
  Dominio D según los datos del propio documento.
```

```
CONTRADICCIÓN-2 (definición de calibración vs. aplicación en Dominio E):
Afirmación A: Sec.1 — "Calibración = Alineación entre certeza expresada y evidencia presentada"
  "Mal calibrado (0.0-0.4): 'MCP automatiza servicios financieros' (sin código que lo pruebe)"
  "Bien calibrado (0.85-1.0): 'Requiere soporte determinista' + explicación de fallo transaccional"
  El patrón de calibración mal es: CLAIM de certeza + AUSENCIA de evidencia
  El patrón de calibración bien es: CLAIM con evidencia de respaldo
Afirmación B: Sec.6 — Dominio E recibe 0.23 por: "No incluyen error handling, timeout, retry logic, logging"
  y "Hardcoding presentado como 'normal'"
Por qué chocan: la definición de Sec.1 evalúa si los CLAIMS del capítulo están respaldados por
  evidencia. Para que la ausencia de error handling sea un defecto de calibración, el capítulo
  debería haber hecho un claim sobre error handling (e.g., "este código maneja errores
  correctamente" o "listo para producción"). El documento no cita ningún claim de ese tipo.
  Si el capítulo presenta código como demostración de conectividad MCP sin afirmar completitud,
  entonces no hay sobrecerteza sobre error handling — el capítulo simplemente no aborda el tema.
  Eso es un defecto de completitud (el capítulo no cubre algo que debería cubrir), no un defecto
  de calibración (el capítulo afirma más de lo que puede respaldar).
Cuál prevalece: Afirmación A. La definición de Sec.1 es el framework declarado. Aplicar Dominio E
  con la lógica de Afirmación B viola el framework del propio documento.
Impacto: el score 0.23 del Dominio E es inválido dentro del marco metodológico que el
  documento declara usar. El Dominio E mide una cosa diferente a los dominios A–D.
```

```
CONTRADICCIÓN-3 (promedio global 0.54 — no reproducible):
Afirmación A: Sec.7 — "PROMEDIO: 0.54"
Afirmación B: Cualquier combinación de los scores declarados en el documento
Por qué chocan: como se demostró en la Sub-capa C:
  - Promedio de las 10 filas de Sec.7: 0.576 ≠ 0.54
  - Promedio de 5 dominios con D=0.57: 0.666 ≠ 0.54
  - Promedio de 5 dominios con D=0.43: 0.638 ≠ 0.54
  El 0.54 no es reproducible desde los datos del documento. El promedio global es el número
  más prominente del veredicto y no se puede verificar con los datos del documento.
Cuál prevalece: ninguno — el número es INCIERTO en origen. Ninguna interpretación de los
  datos disponibles produce exactamente 0.54.
```

```
CONTRADICCIÓN-4 (Dominio C — sub-scores vs. score del dominio):
Afirmación A: Sec.4 veredicto — "Calibración: MODERADA (0.72)"
Afirmación B: Sub-scores declarados en Sec.4:
  - "Dynamic discovery" claim: calibración 0.3
  - Lenguaje comparativo: "0.6 vs 0.8" (ambiguo — qué score asigna el documento no queda claro)
  - "Superioridad sin reservas": 0.65
  Ninguna combinación posible de estos tres valores produce 0.72:
  Promedio de 0.3 + 0.6 + 0.65 = 0.517 ≠ 0.72
  Promedio de 0.3 + 0.8 + 0.65 = 0.583 ≠ 0.72
Por qué chocan: el score del Dominio C no es el promedio de los sub-scores citados. No hay
  descripción de otra operación que produzca 0.72 a partir de los datos declarados.
Cuál prevalece: ninguno verificable. 0.72 es INCIERTO como derivación de los sub-scores del Dominio C.
```

---

## CAPA 5: MAPEO DE ENGAÑOS ESTRUCTURALES

| Patrón | Instancia específica | Ubicación | Efecto |
|--------|---------------------|-----------|--------|
| **Credibilidad prestada** | El documento adopta la definición epistémica de calibración (Sec.1) — término con rigor en forecasting — pero la aplica de forma inconsistente en Dominio E, donde mide completitud de código, no alineación claim/evidencia | Sec.1 vs. Sec.6 | La nomenclatura de calibración crea apariencia de rigor metodológico donde hay medición de un atributo diferente |
| **Notación formal encubriendo especulación** | Los scores numéricos (0.91, 0.72, 0.43, 0.23) crean apariencia de medición precisa, pero tres de los cuatro promedios de dominio no son reproducibles desde los sub-scores declarados (ver Contradicciones 1, 3, 4) | Secs. 3–7 | El formato de tabla con decimales crea apariencia de cálculo rigoroso cuando los números no son verificables |
| **Validación en contexto distinto extrapolada** | El claim "MEJOR CALIBRADO DEL LIBRO COMPLETO" para Dominio B (0.90) extrapola un score de un capítulo como comparación con todos los capítulos anteriores sin presentar los datos comparativos | Sec.3 | El claim cross-capítulo toma la validez del score local (0.90 para Dominio B en Cap.10) y la extiende como ranking global sin evidencia |
| **Limitación enterrada** | La discrepancia entre 0.43 y 0.57 en Dominio D está reconocida en el documento — pero en un paréntesis dentro de la tabla, y caracterizada como "margen de análisis" en lugar de error de cálculo | Sec.5, tabla y nota final del input | El reconocimiento parcial de la discrepancia en posición marginal evita que el lector la trate como problema metodológico central |
| **Profecía auto-cumplida** | El documento define en Sec.1 que código sin mecanismo de confirmación es "mal calibrado" (ejemplo IoT). Luego el Dominio E recibe 0.23 porque el código "no incluye error handling." El framework de evaluación fue construido para producir el veredicto que produce, pero sin declarar que "ausencia de características de producción = defecto de calibración" al inicio | Sec.1 (definición) → Sec.6 (aplicación) | La definición de Sec.1 parece objetiva; la expansión no declarada de esa definición en Sec.6 hace que el score bajo del Dominio E parezca derivado del framework cuando en realidad requirió ampliar el framework |

### Patrón dominante

**Nombre:** Scoring con aritmética no verificable y redefinición silenciosa del criterio.

**Descripción:** El documento produce scores detallados en formato numérico decimal que crean
apariencia de análisis cuantitativo riguroso. Pero múltiples operaciones aritméticas declaradas
no son reproducibles desde los datos del mismo documento (promedios de Dominios C, D, E y el
global). Adicionalmente, el criterio de evaluación se expande silenciosamente entre la definición
(Sec.1: certeza vs. evidencia) y la aplicación del Dominio E (completitud de código), sin declarar
la expansión.

**Cómo opera en este documento:** El formato de scoring granular — tabla con 9 casos, scores
con dos decimales, etiquetas por dominio — funciona como señal de rigor. El lector que no verifica
la aritmética acepta los números. El lector que no contrasta la definición de Sec.1 con la
metodología del Dominio E acepta el score 0.23 como calibración. El documento está
estructuralmente diseñado para parecer más preciso que el análisis THYROX porque tiene más números,
no porque los números sean más correctos.

---

## CAPA 6: SÍNTESIS DE VEREDICTO

### VERDADERO

| Claim | Evidencia que lo respalda | Fuente externa |
|-------|--------------------------|----------------|
| Dominio A (0.91) — especificación técnica MCP bien calibrada | La especificación MCP es verificable en `modelcontextprotocol.io`. El análisis THYROX asignó scores 0.85–1.0 a los claims del Grupo A | mcp-pattern-calibration.md, claims C-01 a C-06 |
| Dominio B — advertencias del Cap.10 están bien calibradas con razonamiento causal y ejemplos concretos | El análisis THYROX asignó 0.90–0.95 a C-16, C-17, C-18, C-24 (advertencias). Coincidencia independiente | mcp-pattern-calibration.md, Grupo D |
| Dominio D — casos de uso de IoT (0.30) y Servicios Financieros (0.20) están pobremente calibrados | El análisis THYROX asignó 0.30 a C-12 (IoT) y 0.20 a C-13 (Financial Services) — coincidencia exacta independiente | mcp-pattern-calibration.md, C-12 y C-13 |
| Dominio C — la tabla comparativa exagera la ventaja de MCP en discovery | Identificado también en el análisis THYROX y en la auditoría formal (Contradicción C-2) | mcp-audit-deep-dive.md, Capa 3, SALTO-2 |
| "Dynamic discovery" claim — los servidores en el código están hardcodeados | Verificable en el código del capítulo (Sec.7 y Sec.9 del original); corroborado por auditoría formal | mcp-audit-input.md, Contradicción 2 |
| El capítulo exhibe Calibración Asimétrica por Dominio (CAD) | El análisis THYROX nombró e identificó independientemente el mismo patrón CAD | mcp-pattern-calibration.md, Sec.6 — "Patrón identificado: CAD" |
| Ausencia de manejo de errores y gap desarrollo/producción son problemas reales del Dominio E | Identificado por el análisis THYROX bajo "Brecha 3" y como defectos de documentación del Grupo E | mcp-pattern-calibration.md, Sec.10 |

### FALSO

| Claim | Por qué es falso | Contradicción/evidencia contraria |
|-------|-----------------|----------------------------------|
| Promedio Dominio D: 0.43 | El promedio aritmético de los 9 scores declarados en la tabla es 0.570. No hay operación documentada que produzca 0.43 desde esos 9 valores | Aritmética directa: (0.75+0.65+0.70+0.68+0.60+0.75+0.50+0.30+0.20)/9 = 5.13/9 = 0.570 |
| Score Dominio C: 0.72 es el resultado del análisis de sub-scores | Los sub-scores declarados (0.3, ~0.6–0.65) no producen 0.72 bajo ninguna operación estándar. El score 0.72 no está derivado de los datos del Dominio C | Aritmética: promedios posibles de los sub-scores = 0.517–0.583 |
| Promedio global: 0.54 | Ninguna combinación de los scores declarados (ni por dominios, ni por filas de la tabla de Sec.7) produce exactamente 0.54 | Verificación: promedio de 10 filas Sec.7 = 0.576; promedio de 5 dominios con D=0.57 = 0.666; con D=0.43 = 0.638 |
| Dominio E (0.23) mide defectos de calibración según la definición de Sec.1 | La definición de Sec.1 establece calibración = alineación claim/evidencia. El capítulo no hace claims sobre production-readiness del código. La ausencia de error handling no es un claim de certeza sin evidencia — es ausencia de feature. El Dominio E mide completitud, no calibración | Contradicción-2 de este análisis; definición de Sec.1 del propio documento |
| Cap.9 "mantiene calibración consistente (~0.77 en todos los dominios)" | El análisis THYROX de Cap.9 identificó que SICA "opera sin paradigmas tradicionales" recibió score 0.0, y el código de OpenEvolve era inoperable (NameError en producción). Esos son defectos de dominio específico — contradicen la uniformidad | mcp-pattern-calibration.md, Sec.4, nota de Cap.9; mcp-audit-deep-dive.md referencias a Cap.9 |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría para volverse verdadero/falso |
|-------|--------------------------|----------------------------------------------|
| "MEJOR CALIBRADO DEL LIBRO COMPLETO" para Dominio B (0.90) | Requiere scores de Dominio B-equivalente en Cap.6, Cap.7, Cap.8, Cap.9 para comparar. El análisis THYROX tiene registros de advertencias en otros capítulos pero no en formato exactamente comparable. El Grupo D de Cap.9 (advertencias) tiene score promedio ~0.90 según mcp-pattern-calibration.md — lo que empataría con Cap.10 | Desglose de scores por dominio equivalente en todos los capítulos previos. El análisis THYROX tiene datos parciales pero no tablas cross-capítulo por tipo de dominio |
| "Riesgo LEGAL: Reguladores negarían licencia si MCP es ejecutor de transacciones" | No se cita ninguna regulación específica, ninguna jurisdicción, ningún precedente. El claim es plausible (reguladores financieros sí requieren supervisión humana) pero la palabra "negarían" implica certeza sobre una decisión regulatoria específica que no está documentada | Referencia a regulación específica: MiFID II Art. 17, SEC Reg BI, o equivalente. El claim es INCIERTO sin esto — podría ser verdadero o falso según jurisdicción y arquitectura |
| Promedio global 0.54 | No reproducible desde los datos del documento. Puede ser resultado de una ponderación diferente no declarada (e.g., el script Python usó pesos distintos por tipo de claim), o de un error de cálculo del script | Acceso al código Python del script para ver qué operación produce 0.54 |
| Score Dominio C: 0.72 como promedio ponderado | Si el documento usó ponderación no uniforme (e.g., "dynamic discovery" con mayor peso), 0.72 podría ser el resultado. Sin la documentación de la ponderación, es INCIERTO | Documentación del método de agregación del script |

### Patrón dominante

**Scoring numérico no reproducible + redefinición silenciosa de criterio.**

El documento opera creando dos impresiones simultáneas: (1) que es más granular que el análisis
THYROX porque tiene más sub-scores por dominio y caso de uso, y (2) que es más preciso porque
produce un número más bajo (0.54 vs 0.65). Ninguna de las dos impresiones es válida.

Mayor granularidad no implica mayor precisión si los agregados no son reproducibles desde los datos
granulares. Número más bajo no implica mayor rigor si resulta de aplicar el criterio de calibración
a un atributo diferente (completitud de código) al declarado en la definición (alineación
claim/evidencia).

Los problemas aritméticos son el síntoma visible. El problema estructural es que el documento
mezcla dos criterios diferentes bajo el mismo término ("calibración") sin declarar la mezcla:
criterio A = alineación claim/evidencia (aplicado en A, B, C, D), criterio B = completitud
técnica del código (aplicado en E). El score global 0.54 agrega resultados de dos criterios
incomparables como si fueran el mismo.

---

## ANÁLISIS DE LOS 6 PUNTOS CRÍTICOS SOLICITADOS

### Punto 1 — Discrepancia de scores: 0.43 vs 0.57 (Dominio D) y 0.54 vs 0.65 (global)

**Dominio D (0.43 vs 0.57):**

El promedio correcto de los 9 casos es 0.570. El documento declara 0.43 en el veredicto.
La diferencia es de 0.127 — mayor que un 25% del valor. No es "margen de análisis" —
es un error de cálculo que el script Python no detectó, y que el documento trata como
si fuera una discrepancia metodológica válida.

El valor 0.43 podría provenir de: (a) el script calculó el promedio antes de actualizar
algunos scores en la tabla y no recalculó el promedio, (b) el script usó un subconjunto
de los 9 casos, (c) hay un bug en el script. Sin el código Python, la causa es INCIERTA.
Pero el resultado es FALSO: 0.43 no es el promedio de los 9 scores declarados.

**Global (0.54 vs 0.65):**

Como se demostró en la Sub-capa C, 0.54 no es reproducible desde los datos del documento.
El análisis THYROX calculó 0.65 sobre 28 claims con metodología transparente (cada claim
tiene score individual documentado; la suma es verificable: 18.35/28 = 0.6553...). El análisis
THYROX es más transparente aritméticamente.

La diferencia entre 0.54 y 0.65 no refleja mayor rigor del script — refleja: (a) la inclusión
del Dominio E con criterio diferente, y (b) posibles errores de cálculo. Si se excluye el
Dominio E del análisis del script (porque aplica criterio diferente), el promedio de dominios
A, B, C, D con D=0.57 sería (0.91+0.90+0.72+0.57)/4 = 0.775 — más alto que el 0.65 de THYROX,
no más bajo.

**Conclusión:** La afirmación "análisis granular es más crítico" tiene la causalidad invertida.
El score más bajo proviene de incluir el Dominio E con un criterio diferente, no de mayor rigor
sobre los mismos claims.

---

### Punto 2 — Claim "MEJOR CALIBRADO DEL LIBRO COMPLETO" para advertencias (0.90)

**Verificación del claim:**

El claim aparece en Sec.3: "★ MEJOR CALIBRADO DEL LIBRO COMPLETO" y es repetido en Sec.10.

**Está derivado el score 0.90 para Dominio B:** SÍ — el análisis del Dominio B es coherente
con su propia metodología y con el análisis THYROX independiente (Grupo D, scores 0.85–0.95).

**Está derivado el claim comparativo "MEJOR DEL LIBRO":** NO. Para sostenerlo, el documento
debería mostrar los scores de advertencias/caveats honesti en Cap.6, Cap.7, Cap.8, Cap.9 y
demostrar que todos son inferiores a 0.90. El documento no presenta esos datos.

**Evidencia contraria parcial:** El análisis THYROX de Cap.9 (mcp-pattern-calibration.md, Sec.5,
Pregunta 2) documenta que las advertencias del Grupo D de Cap.10 son "los claims de mayor valor
epistémico del capítulo" y tienen scores 0.85–0.95. Pero el mismo documento también señala que
Cap.9 tiene 77% de calibración global con su Grupo D equivalente. Los Grupos D de Cap.9 que el
análisis THYROX encontró bien calibrados incluyen C-16/D-tipo: "Agentes no reemplazan mágicamente
flujos deterministas" — score 0.90. Esto sugiere que el Grupo D de Cap.10 es comparable al Grupo
D-tipo de Cap.9, no superior.

**Veredicto:** INCIERTO. El 0.90 para Dominio B está bien derivado. "MEJOR DEL LIBRO COMPLETO"
es un claim comparativo sin datos comparativos — no está derivado.

---

### Punto 3 — Dominio E (0.23): ¿defecto de calibración o defecto de completitud?

**Análisis de la definición:**

Sec.1 define: "Mal calibrado (0.0-0.4): 'MCP automatiza servicios financieros' (sin código que lo pruebe)"

El patrón de mal calibrado según la propia definición es: CLAIM de capacidad/certeza + AUSENCIA de
evidencia que lo respalde.

Para que el Dominio E reciba score 0.23 por calibración, el capítulo debería haber hecho claims como:
- "Este código está listo para producción"
- "Este código maneja todos los escenarios de error"
- "Este código es seguro para uso en entornos reales"

El documento no cita ninguno de estos claims. Lo que afirma el capítulo original (según el análisis
THYROX y la auditoría) es que el código demonstra cómo conectar un agente a un servidor MCP via
STDIO. Ese claim está respaldado por el código — el código efectivamente demuestra la conexión.
La ausencia de error handling no invalida ese claim.

**Distinción calibración vs. completitud:**

- Defecto de calibración: afirmar "el código es production-ready" sin que el código lo sea
- Defecto de completitud: el código no incluye todas las características que debería incluir para ser production-ready, pero el capítulo no afirma que lo sea

El Dominio E es un defecto de completitud, no de calibración, según la definición de Sec.1.

**Resultado:** El scoring del Dominio E (0.23) aplica una definición diferente a la declarada
en Sec.1. El Dominio E está mal clasificado en el marco metodológico del propio documento.
Un score de calibración correcto para el Dominio E según la definición de Sec.1 requeriría
identificar si el capítulo hace claims sobre las características que faltan. Si no los hace,
el score debería reflejar solo los defectos ya identificados (tool_filter, StdioConnectionParams,
import sin uso) — los que sí son contradicciones internas donde el capítulo implícitamente
reclama consistencia de API.

El análisis THYROX clasificó estos correctamente como "defectos de código" con score 0.0 per defecto,
pero como categoría separada con impacto ponderado en el ratio global — reconociendo que miden
algo diferente a los claims de texto. El script Python colapsa todo en "calibración 0.23" sin esa distinción.

---

### Punto 4 — "Riesgo LEGAL: Reguladores negarían licencia"

**Análisis del claim:**

Sec.5 (análisis de Servicios Financieros): "Riesgo LEGAL: Reguladores negarían licencia si MCP
es ejecutor de transacciones."

**Derivado de evidencia:**

No. El documento no cita:
- Ninguna regulación específica (MiFID II, Dodd-Frank, SEC Reg BI, FINRA, equivalentes europeos o latinoamericanos)
- Ninguna jurisdicción
- Ningún precedente regulatorio sobre sistemas de ejecución de órdenes con LLMs
- Ninguna definición de "ejecutor de transacciones" que active el requisito de licencia

**Es plausible:** SÍ. En la UE (MiFID II Art. 17) y en EEUU (SEC Reg BI), los sistemas de
ejecución de órdenes requieren controles de riesgo, registro de operaciones, y supervisión
humana. Un sistema basado en LLM sin controles ACID podría ser incompatible con esos requisitos.
Pero "podría ser incompatible" es muy diferente a "reguladores negarían licencia" — el segundo
es una afirmación de acción regulatoria definitiva.

**Patrón de engaño:** El claim usa terminología de alto impacto ("LEGAL", "negarían licencia")
para amplificar la severidad de un problema real (servicios financieros requieren controles
que el ejemplo no demuestra) más allá de lo que la evidencia sostiene. Es análogo al "perderán
dinero" de la auditoría formal — ambos documentos amplifican problemas reales con proyecciones
de consecuencias severas sin evidencia de las consecuencias específicas.

**Veredicto:** INCIERTO en la formulación específica. El problema subyacente (servicios
financieros requieren controles ausentes en el ejemplo) es VERDADERO. La afirmación sobre
"reguladores negarían licencia" es especulación formulada como certeza.

---

### Punto 5 — Comparación con Cap.9 (Sec.8): "calibración consistente (~0.77 en todos los dominios)"

**Análisis del claim:**

El documento afirma: "Cap.9 mantiene calibración consistente (~0.77 en todos los dominios)"

**Contradicción con análisis THYROX:**

El análisis THYROX de Cap.9 identificó (según referencias en mcp-pattern-calibration.md y
mcp-audit-deep-dive.md):
- SICA "opera sin paradigmas tradicionales": score 0.0 por claim comparativo sin evidencia
- OpenEvolve: código con NameError (inoperable en producción)

Estos no son consistentes con "~0.77 en todos los dominios." Un score 0.0 en un claim
específico viola la consistencia.

**Lo que el 77% global de Cap.9 significa:** El ratio 77% es el promedio ponderado de 28 claims
(análisis THYROX), donde los problemas (SICA 0.0, OpenEvolve) son compensados por la mayoría
de claims bien calibrados. "Consistente en todos los dominios" requeriría que no haya outliers
bajos — y los hay.

**El documento simplifica Cap.9 como si fuera uniformemente calibrado**, lo que sirve para
maximizar el contraste con la "asimetría" de Cap.10. Esto sugiere que la comparación con Cap.9
en Sec.8 no es un análisis real de Cap.9, sino una simplificación que sirve como contraste
retórico para hacer parecer más notable el patrón CAD de Cap.10.

**Veredicto:** FALSO. "Calibración consistente (~0.77 en todos los dominios)" de Cap.9 es
una simplificación que ignora los outliers documentados en el análisis THYROX de Cap.9.

---

### Punto 6 — Coherencia del patrón CAD: ¿hallazgo nuevo o ya nombrado?

**Evidencia del análisis THYROX:**

El análisis THYROX (mcp-pattern-calibration.md) nombra y describe el patrón CAD en Sec.6:

> "CAD (Calibración Asimétrica por Dominio): Un capítulo tiene ratios de calibración
> significativamente distintos entre sus dominios internos."

Con tabla de desglose:
```
Dominio                   | Claims  | Score promedio
A — Protocolo MCP         | 8       | 0.91/1.0
B — MCP vs Tool calling   | 5       | 0.72/1.0
C — Casos de uso          | 5       | 0.43/1.0
D — Advertencias honestas | 4       | 0.90/1.0
E — Defectos de código    | 4       | 0.23/1.0
```

El documento de calibración granular nombra el mismo patrón en Sec.7 y Sec.10:
"CALIBRACIÓN ASIMÉTRICA POR DOMINIO (CAD)" — incluso con el mismo acrónimo.

**¿El documento reconoce el análisis THYROX?**

No. No hay ninguna referencia al análisis THYROX en el documento. El patrón CAD se presenta
como hallazgo del script Python sin reconocer que fue nombrado e identificado previamente.

**Implicaciones:**

a) Si el script fue desarrollado después del análisis THYROX y los responsables del script
   conocían ese análisis, hay una omisión de atribución.

b) Si el script fue desarrollado independientemente, la convergencia en el mismo nombre
   de patrón es notable — y aumenta la confiabilidad del hallazgo por corroboración
   independiente (mismo nombre, misma estructura).

c) El más probable dado el contexto del WP: el script y el análisis THYROX son productos
   del mismo proceso de investigación del WP, desarrollados en paralelo o en secuencia.
   El script puede haber tomado el nombre del análisis THYROX sin declararlo explícitamente.

**Veredicto sobre el patrón en sí:** VERDADERO — el patrón CAD es real y fue identificado
independientemente (o convergentemente) por ambos documentos. La ausencia de atribución
es un problema de rigor documental, no de validez del hallazgo.

---

## VEREDICTO COMPARATIVO: ¿Análisis granular más preciso que análisis THYROX?

**NO.** El análisis THYROX (mcp-pattern-calibration.md) es más preciso en los siguientes aspectos:

| Dimensión | Análisis granular (script) | Análisis THYROX |
|-----------|---------------------------|-----------------|
| Aritmética verificable | DEFICIENTE — promedios de Dominios C, D, y global no reproducibles | CORRECTA — 18.35/28 = 0.6553 verificable directamente |
| Consistencia metodológica | DEFICIENTE — Dominio E usa criterio diferente sin declararlo | CORRECTA — defectos de código clasificados por separado con justificación |
| Claims del Dominio D | 9 casos, scoring granular, algunos correctos | 5 claims representativos con scores y justificación completa |
| Comparaciones cross-capítulo | Cap.9 simplificado incorrectamente | Cap.9 comparado con datos específicos del análisis correspondiente |
| Claims "MEJOR DEL LIBRO" | No derivado, sin datos comparativos | No hace claims cross-capítulo sin datos |
| Claims legales | "Reguladores negarían licencia" sin cita | Señala actividades reguladas con caveat explícito |
| Patrón estructural | CAD identificado correctamente | CAD identificado correctamente + con mayor desglose |

**El análisis granular es más severo, no más preciso.** La severidad adicional proviene de:
1. Incluir Dominio E con criterio diferente (completitud vs. calibración)
2. Errores de cálculo que producen números más bajos de los correctos

Los hallazgos principales del análisis granular que son VERDADEROS (Dominio D casos críticos,
Dominio C tabla sesgada, Dominio B bien calibrado, patrón CAD) están todos corroborados por
el análisis THYROX. Los hallazgos específicos del análisis granular que el análisis THYROX
no tiene (scoring por sub-caso de Dominio D con 9 casos) aportan valor marginal — la granularidad
de los 9 casos es útil si los scores individuales son correctos, y los 9 scores individuales
parecen razonables. El problema no está en los scores individuales de los 9 casos, sino en
la agregación.

**Conclusión final:** El análisis granular es un insumo complementario útil para los scores
individuales del Dominio D (9 casos). No debe usarse para el promedio global (0.54 no es
reproducible), ni para el Dominio E (criterio diferente al declarado), ni para las comparaciones
cross-capítulo (Cap.9 simplificado, claim "MEJOR DEL LIBRO" sin datos). El análisis THYROX
sigue siendo la referencia de calibración más confiable para Cap.10.

---

## Nota de completitud del input

Secciones potencialmente comprimidas: ninguna detectada.

El input preserva verbatim el documento completo incluyendo tabla de scoring, veredictos,
análisis críticos y nota sobre discrepancia de scores.

Saltos no analizables por compresión: ninguno.
