```yml
created_at: 2026-04-20 00:15:50
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 8 — PLAN EXECUTION
author: deep-dive
status: Borrador
```

# Cluster A — Gaps: Arquitectura Claude + Basin/Hallucination + Causal

Análisis de hallazgos del Cluster A no cubiertos por T-001..T-024.
Fuentes: 7 archivos de `discover/` + task-plan actual.

---

## Metodología

Para cada archivo se extraen los 2-3 hallazgos más importantes para THYROX.
Luego se cruzan contra T-001..T-024 para identificar qué no está cubierto.
Por cada gap se propone una tarea en formato del task-plan con: acción concreta,
archivo a crear/modificar, dependencias, y prioridad.

---

## 1. Hallazgos por archivo

### 1.1 `claude-architecture-foundations-deep-dive.md`
*(Deep-dive de Part A original — 4 saltos, 3 contradicciones, 5 engaños)*

**H-A1 — Estructura PROVEN/INFERRED como modelo de rigor**
El documento introduce una distinción epistémica PROVEN / INFERRED / SPECULATIVE que,
aunque aplicada imperfectamente, es el modelo correcto que THYROX debería institucionalizar
en sus propios artefactos. El propio deep-dive lo identifica como "el modelo de rigor que
THYROX debería usar". El análisis concluye en Sec "Lo que sí es válido": la *estructura*
Proven vs Inferred de Sec 4.1 es aprovechable independientemente de los errores de
clasificación del documento.

**H-A2 — Tres principios cualitativos con respaldo empírico independiente**
El análisis destila tres principios que no dependen de la teoría del basin y tienen
evidencia independiente: (1) resistencia a actualizar comprensión implícita de la tarea
bajo feedback incremental, (2) tareas con espacio de respuesta pequeño son más verificables
(AUROC 0.91 factoid vs 0.50 open-ended en CHI 2026), (3) el agente que genera no puede
auto-validar. Estos principios son el fundamento empírico para el diseño de gates en THYROX.

**H-A3 — Números prohibidos: lista explícita para THYROX**
El deep-dive enumera ≥10 valores numéricos que no pueden propagarse como hechos en THYROX
(ᾱ≈0.835, layer-20 como umbral, db_t/dt≈0.02, t_conv≈45, etc.). No existe ningún
mecanismo en THYROX que impida que un agente cite estos valores si los encuentra en
referencia. La lista prohibida existe en el artefacto pero no en ningún archivo del sistema.

---

### 1.2 `claude-architecture-pomdp-deep-dive.md`
*(Deep-dive de Part A v2.1 — 8 saltos, 5 contradicciones, 6 engaños)*

**H-B1 — Principio 4 nuevo: el entrenamiento afecta geometría completa del basin**
El análisis demuestra que la afirmación del documento "Different training only shifts μ^(ℓ),
not basin geometry" es FALSA: los pesos W_Q, W_K, W_V determinan α_ℓ (el coeficiente de
contracción), que es la geometría del basin. Esto invalida la idea de que el comportamiento
del modelo es fijo por arquitectura — el entrenamiento (incluyendo RLHF y fine-tuning) puede
modificar los patrones de alucinación. Para THYROX: los agentes fine-tuned o con system
prompts extensos pueden tener perfiles de confianza/alucinación diferentes.

**H-B2 — Thm 2.5.1 como anti-patrón de pseudomatemática**
El deep-dive identifica y disecciona un "teorema" que es en realidad una definición circular
empaquetada con notación formal (Problem A: circularidad; B: "depends on" sin función
explícita; C: "deterministic" contradice "depends on H_attn"; D: "independent of weights"
falso por cadena de cómputo; E: ausencia de proof). Este es el caso de uso más claro del
patrón "notación formal encubriendo especulación" — un anti-patrón que los propios agentes
de THYROX pueden reproducir al emitir análisis con fórmulas sin derivación.

**H-B3 — CONTRADICCIÓN-4 "inevitable" vs "condicional" — 4 versiones sin corrección**
El encuadre retórico "Hallucination is inevitable" coexiste con mecanismos que incluyen "if"
condicionales en la misma sección. Este es el patrón de encuadre previo a la evidencia que
THYROX necesita detectar en sus propios artefactos: cuando el título de una sección es más
fuerte que lo que el contenido demuestra.

---

### 1.3 `basin-hallucination-framework-honest-deep-dive.md`
*(Deep-dive de Part A Honest Edition — 8 saltos, 7 contradicciones, 7 engaños)*

**H-C1 — Realismo performativo como patrón sistémico identificado**
El análisis nombra y define el patrón dominante: "Realismo performativo — el documento
despliega los mecanismos superficiales del rigor epistémico sin resolver los problemas de
fondo." Este patrón tiene 5 componentes operacionales identificados: Critical Preamble que
no modifica "inevitable", Sec 4 con clasificaciones incorrectas, Sec 6 que lista sesgos
genéricos pero omite instancias concretas, Sec 5 con experimentos falsificadores
inejectuables, y el nombre "Honest Edition" como licencia de confianza. THYROX produce
artefactos que pueden exhibir estos mismos 5 componentes.

**H-C2 — Principio 5 y 6 sobre evaluación de admisiones**
Dos principios nuevos: (5) "Una admisión es suficiente si modifica cómo el argumento
opera — performativa si el argumento continúa dependiendo del claim admitido como si
la admisión no hubiera ocurrido"; (6) "Cuando un documento propone experimentos de
falsificación, verificar si son ejecutables con los recursos disponibles antes de tratar
el framework como falsificable en la práctica." Estos son criterios de evaluación que
los agentes de revisión de THYROX no tienen formalizados.

**H-C3 — Tabla comparativa de evolución de versiones como metodología**
El deep-dive genera una tabla comparativa de 3 versiones del mismo documento (saltos,
contradicciones, engaños, progreso real, problemas nuevos, ratio mejora/regresión). Esta
metodología de tracking de versiones de documentos es exactamente lo que THYROX necesita
para iteraciones de claims: no solo evaluar la versión actual, sino trazar si la versión
nueva es mejor o peor neta.

---

### 1.4 `causal-architecture-structural-alternatives-deep-dive.md`
*(Deep-dive de Part C — 6 saltos, 5 contradicciones, 4 engaños)*

**H-D1 — SALTO-3 (LayerNorm) finalmente corregido — modelo de corrección estructural**
Part C corrige el error más concreto y persistente de las versiones anteriores (LayerNorm
bounds ≠ distancia al centroide) al definir explícitamente d_basin^(ℓ) = ‖h^(ℓ)(x) − μ^(ℓ)‖₂.
El mecanismo de corrección fue: colocar la definición formal con su caveat en la sección
de métricas (Sec 8.1) antes de usar el valor. Esto es el modelo correcto para THYROX:
una definición con su protocolo de medición y su limitación, antes de cualquier uso.

**H-D2 — Experimentos con falsificabilidad estructural pero no práctica**
El análisis distingue entre falsificabilidad en principio (las hipótesis son distinguibles)
y falsificabilidad en práctica (los experimentos son ejecutables). Los tests de Sec 10
requieren escritura en hidden states — más allá incluso de lo que open-source models
permitirían. Para THYROX: hay una diferencia entre "esto podría validarse" y "esto puede
validarse con nuestros recursos". Los gates deben distinguir ambas condiciones.

**H-D3 — Π_inconsist elidida en lugar de corregida — patrón de evasión de definición**
Part C evita mencionar Π_inconsist en la sección de métricas (Sec 8) aunque la usa como
nodo causal en Sec 9. El patrón: cuando una variable no tiene definición operacional,
el documento la elide de las secciones formales pero la mantiene en el argumento. Este
patrón de evasión es detectable: si una variable aparece en el argumento pero no en la
sección de definiciones, es indefinida. THYROX no tiene mecanismo para detectar este
patrón en sus propios análisis.

---

### 1.5 `reasoning-correctness-probability-honest-deep-dive.md`
*(Deep-dive de Part B Honest — 5 saltos, 4 contradicciones, 5 engaños)*

**H-E1 — Error aritmético verificable que persiste bajo admisión epistémica**
I(R,A|Q) = 0.05 bits es aritméticamente incorrecto dado las distribuciones del propio
documento: solo la contribución de R₁ y R₄ suma ≈0.371 bits — 7.4× mayor. La admisión
"Different analysts might get different values" aborda el origen de las distribuciones,
no la aritmética interna. El patrón: una admisión de incertidumbre sobre el origen puede
encubrir un error en los cálculos derivados de los datos aceptados. Para THYROX: los
agentes deben verificar la aritmética interna de los documentos con independencia de sus
declaraciones epistémicas.

**H-E2 — Forma exponencial prohibida P₀ × exp(-Σλᵢxᵢ) como Temporal Decay extendido**
El documento usa exactamente la forma funcional prohibida en THYROX por el agente deep-dive
(CLAUDE.md: "P₀ × e^(-r×d) — prohibido"). La admisión "chosen because it's nice" no la
habilita. Para THYROX: esta restricción existe en las instrucciones del deep-dive pero no
en ningún archivo que los demás agentes carguen. Un agente que no sea deep-dive puede
producir o citar esta fórmula sin restricción.

**H-E3 — Auto-crítica como blindaje epistémico — versión operacional**
El patrón: las secciones de limitaciones (8-10) admiten correctamente overfitting, retrodiction,
y sesgo de confirmación, pero omiten las contradicciones internas más técnicas (I aritmético,
Π indefinida, Sec 5.2 no propagada a Sec 6). El lector que ve las secciones de limitaciones
asume exhaustividad y baja su guardia. Para THYROX: los agentes de revisión deben buscar
activamente las instancias concretas de los sesgos admitidos, no solo verificar que los
sesgos fueron listados.

---

### 1.6 `agentic-characteristics-input.md`
*(Input de Cap.6 — características de sistemas agentic)*

**H-F1 — Adaptation sin loop cerrable: diagnóstico operacional del problema central**
El documento identifica que THYROX tiene los 6 atributos agentic EXCEPTO "Adaptation calibrada":
tiene autonomy, perception, action, goal-orientation, reasoning, pero su adaptation loop está
cerrado sobre sí mismo (el output previo como único input del feedback). La solución requiere
intervenir en Perception (gates que inyectan evidencia externa observable) y Adaptation
(predicción → observación → delta medible). Esta es la formulación más concisa del problema
que ÉPICA 42 intenta resolver.

**H-F2 — Tabla de riesgo por característica agentic**
Se genera una taxonomía de cómo cada característica contribuye al realismo performativo:
Autonomy (sin validación externa), Perception (feedback loop cerrado sobre output propio),
Action (sin gate de calidad), Goal-orientation (objetivo = bien formateado, no correcto),
Reasoning (genera justificaciones sin ancla empírica), Adaptation (ajusta hacia plausible,
no hacia verdadero). Esta taxonomía es una herramienta de diagnóstico que ningún stage de
THYROX tiene formalmente.

**H-F3 — Definición pendiente: qué cuenta como "observación externa" en un WP**
El documento cierra con una pregunta abierta explícita para Stage 3: "Definir qué cuenta
como 'observación externa' en el contexto de un WP (vs output del propio agente)." Esta
definición no existe en ningún artefacto del sistema. Sin ella, la sección "Evidencia de
respaldo" que T-020 agregaría a los templates no tiene criterio para clasificar qué es
"observación" y qué es "inferencia del propio agente".

---

### 1.7 `agentic-claims-management-patterns.md`
*(Patrones de gestión de claims observados en Cap.9-20)*

**H-G1 — Cherry-Pick Consciente como algoritmo formal**
El documento define un algoritmo con umbrales explícitos: score ≥ 0.80 → preservar exactamente;
0.60-0.80 → evaluar mejora; < 0.60 → reescribir. También formaliza el cálculo de break-even
ratio antes de agregar claims nuevos (si score_esperado_nuevos < ratio_v1, agregar degrada).
Estos algoritmos son el mecanismo operacional para T-020/T-021, pero no están referenciados
en ninguno de esos tasks.

**H-G2 — CAD (Calibración Asimétrica por Dominio) como métrica de gate**
Define criterios concretos: score global ≥ 0.75, mínimo por dominio ≥ 0.60, rango
(Máximo − Mínimo) ≤ 0.35. El criterio de mínimo por dominio es más estricto que el
global porque un dominio con 0.20 causa daño operacional real independientemente del
promedio. Estos son exactamente los criterios que T-021 (umbral de confianza en
exit-conditions.md.template) necesita, pero T-021 no los cita.

**H-G3 — Fix Declarado ≠ Fix Verificado como protocolo de revisión adversarial**
El protocolo: "Las declaraciones del autor sobre correcciones son hipótesis a verificar,
no hechos a aceptar." Incluye la taxonomía Real / Textual / Performativo para fixes y
el principio del bug no declarado (el más riesgoso porque no reduce la búsqueda del
adversario). Este protocolo formaliza el comportamiento que T-005 (agentic-validator)
debería implementar, pero no está en la especificación de T-004/T-005.

---

## 2. Cobertura por T-001..T-024

### Ya cubiertos (total o parcialmente)

| Hallazgo | Task que lo cubre | Cobertura |
|----------|------------------|-----------|
| H-F1 Adaptation loop cerrado | T-020, T-021 (Bloque 10) | Parcial — los templates agregan estructura pero sin definición de "observación externa" |
| H-G2 CAD criterios de gate | T-021 | Parcial — T-021 agrega umbral de confianza pero no cita los criterios CAD explícitamente |
| H-G3 Fix Declarado ≠ Fix Verificado | T-005 (agentic-validator) | Parcial — T-005 no tiene este protocolo en su especificación |
| H-D2 Falsificabilidad práctica vs estructural | T-021 | Parcial — el formato de gate nuevo aborda "herramienta ejecutada" pero no la distinción recurso-disponible |
| H-A3 Números prohibidos lista | Ninguno | NO CUBIERTO |
| H-A1 PROVEN/INFERRED en artefactos THYROX | T-020 (sección Evidencia) | Parcial — agrega tabla de claims pero no el esquema PROVEN/INFERRED como vocabulario |
| H-C1 Realismo performativo — 5 componentes | Ninguno | NO CUBIERTO |
| H-C2 Principios 5-6 evaluación de admisiones | Ninguno | NO CUBIERTO |
| H-C3 Tracking de versiones de documentos | Ninguno | NO CUBIERTO |
| H-B2 Anti-patrón pseudomatemática | Ninguno | NO CUBIERTO |
| H-E2 Forma exponencial prohibida — solo deep-dive la conoce | Ninguno | NO CUBIERTO |
| H-E3 Auto-crítica como blindaje epistémico | Ninguno | NO CUBIERTO |
| H-F2 Tabla de riesgo por característica | Ninguno | NO CUBIERTO |
| H-F3 Definición de "observación externa" | Ninguno | NO CUBIERTO — bloqueador de T-020 |
| H-G1 Cherry-Pick Consciente algoritmo | Ninguno | NO CUBIERTO |
| H-D3 Evasión de definición (variable elidida) | Ninguno | NO CUBIERTO |
| H-B1 Principio 4: entrenamiento afecta basin | Ninguno | NO CUBIERTO |
| H-D1 Modelo de corrección estructural | Ninguno | NO CUBIERTO |
| H-E1 Error aritmético bajo admisión epistémica | T-022 (indirectamente) | NO — T-022 detecta I-001 en WPs, no errores aritméticos en análisis |
| H-A2 Tres principios cualitativos con evidencia | T-016, T-018 (Bloque 8) | Parcial — T-018 define el mandato agentic pero no incorpora los principios como criterios empíricos |

### Gap summary

- NO CUBIERTOS completamente: H-A3, H-C1, H-C2, H-C3, H-B2, H-E2, H-E3, H-F2, H-F3, H-G1, H-D3, H-B1
- BLOQUEADORES de tasks existentes: H-F3 bloquea que T-020 tenga criterio operacional;
  H-G1 y H-G2 son los algoritmos que dan sustancia a T-021; H-G3 es el protocolo que
  da sustancia a T-004/T-005.

---

## 3. Tasks propuestas — hallazgos no cubiertos

### T-025 — Definir "observación externa" como criterio operacional del sistema
**Prioridad: CRÍTICO** — bloquea que T-020 tenga significado concreto

**Problema:** T-020 agrega una sección "Evidencia de respaldo" con columna "Tipo"
(observación/inferencia/gate-humano) en 3 templates. Sin definición de qué califica como
"observación" vs "inferencia del propio agente", los agentes llenarán esa columna basándose
en su criterio, reintroduciendo el problema que la columna debe resolver.

**Acción:**
1. Crear `.claude/skills/thyrox/references/evidence-classification.md`
2. Definir el esquema de 3 niveles:
   - OBSERVABLE: producido por herramienta ejecutada (Bash, Read, Grep, Glob) en este WP,
     con output citado textualmente. No requiere interpretación del agente.
   - INFERRED: derivado de uno o más observables mediante razonamiento del agente. Siempre
     requiere que los observables de origen estén documentados.
   - SPECULATIVE: sin observable de origen. No puede avanzar gate Stage→Stage. Requiere
     convertirse en INFERRED u OBSERVABLE antes del gate.
3. Agregar ejemplos concretos de cada nivel para contexto THYROX (no basin theory).
4. Actualizar T-020 para que los templates citen este documento como referencia de
   clasificación (con @ref o nota de pie).

**Archivo a crear:** `.claude/skills/thyrox/references/evidence-classification.md`
**Depende de:** Ninguno — debe ejecutarse ANTES de T-020
**Bloquea:** T-020 (la sección "Evidencia de respaldo" necesita este vocabulario)

---

### T-026 — Incorporar algoritmo Cherry-Pick en protocolo de iteración de artefactos
**Prioridad: ALTO** — operacionaliza el objetivo central de ÉPICA 42

**Problema:** El algoritmo Cherry-Pick (H-G1) con sus umbrales (≥0.80 preservar, 0.60-0.80
evaluar, <0.60 reescribir) y el cálculo de break-even ratio son exactamente los mecanismos
que los agentes necesitan para iterar artefactos sin el efecto denominador. Estos algoritmos
existen en `discover/agentic-claims-management-patterns.md` pero ningún template, skill, o
agente los referencia.

**Acción:**
1. Agregar sección "Protocolo de iteración calibrada" en
   `.claude/skills/workflow-decompose/assets/plan-execution.md.template`
   (el template de tasks plans — donde la iteración ocurre):
   ```
   ## Iteración de versión
   Antes de emitir una versión N+1:
   - [ ] Score por claim/dominio de versión N calculado
   - [ ] Break-even ratio verificado: score_esperado_nuevos ≥ ratio_vN
   - [ ] Claims ≥ 0.80: preservar exactamente (Cherry-Pick Consciente)
   - [ ] Claims nuevos sin fuente identificable: posponer o eliminar
   ```
2. Agregar referencia al algoritmo completo en
   `.claude/skills/thyrox/references/` (o como subsección de `evidence-classification.md`)

**Archivo a modificar:** `.claude/skills/workflow-decompose/assets/plan-execution.md.template`
**Archivo a crear (referencia):** subsección de `evidence-classification.md` o documento separado
**Depende de:** T-025 (vocabulario de evidencia base)
**Bloquea:** nada, pero habilita que T-020 y T-021 tengan coherencia operacional

---

### T-027 — Agregar esquema PROVEN/INFERRED/SPECULATIVE al vocabulario de artefactos WP
**Prioridad: ALTO** — institucionaliza el modelo de rigor extraído de los análisis

**Problema:** T-020 agrega una columna "Confianza" (alta/media/baja) a los templates de
Evidencia. Este esquema es menos preciso que PROVEN/INFERRED/SPECULATIVE porque no distingue
entre "tengo evidencia y es fuerte" (PROVEN) y "infiero sin observable" (SPECULATIVE). Los
valores alta/media/baja son subjetivos; PROVEN/INFERRED/SPECULATIVE son categorías con
definición operacional (una vez que T-025 existe).

**Acción:**
1. Actualizar T-020: cambiar la columna "Confianza" de alta/media/baja a
   PROVEN / INFERRED / SPECULATIVE, con referencia a `evidence-classification.md`.
2. Agregar al metadata estándar de artefactos WP (`.claude/rules/metadata-standards.md`)
   una nota en el template de "Documentos en stage directories":
   ```
   ### Claims y afirmaciones
   Todo claim en un artefacto debe clasificarse como PROVEN / INFERRED / SPECULATIVE
   según el esquema de evidence-classification.md. Claims SPECULATIVE no pueden ser
   fundamento de decisiones de arquitectura o diseño.
   ```
3. Actualizar la sección "Evidencia de respaldo" en los 3 templates de T-020 para
   usar las tres categorías y definir que SPECULATIVE bloquea el gate.

**Archivos a modificar:**
- `.claude/rules/metadata-standards.md` — agregar nota sobre clasificación de claims
- Los 3 templates de T-020 (cambio de columna "Confianza" a PROVEN/INFERRED/SPECULATIVE)
**Depende de:** T-025 (vocabulario base), T-020 (modifica los mismos templates)
**Bloquea:** nada

---

### T-028 — Crear lista de valores prohibidos como restricción del sistema (no solo del deep-dive)
**Prioridad: ALTO** — extiende una restricción hoy solo conocida por un agente

**Problema:** La lista de valores prohibidos en THYROX (ᾱ≈0.83, db_t/dt≈0.02,
t_conv≈45, P(u_0)≈0.95, Thm 2.5.1 como teorema, "hallucination is inevitable" como
claim sin condiciones, datos de d_basin/H_attn/ν_dead de tabla Sec 2.5.5, etc.) existe
solo en los artefactos de los deep-dives del WP. No está en ningún archivo que los
agentes operacionales carguen. Un agente que no sea deep-dive puede citar estos valores
en cualquier análisis sin restricción.

**Acción:**
1. Crear `.claude/skills/thyrox/references/prohibited-claims-registry.md`
   con tres secciones:
   - Valores numéricos prohibidos: tabla con valor → por qué → alternativa conceptual válida
   - Patrones de razonamiento prohibidos: forma exponencial P₀×e^(-r×d) con parámetros sin
     calibración empírica propia del dominio → por qué → qué usar en su lugar
   - Claims cualitativos prohibidos como absolutos: "inevitable" (sin condición explícita),
     "deterministic given architecture", "independent of training weights" para hallucination
2. Agregar en `.claude/rules/thyrox-invariants.md` una nueva invariante:
   ```
   ## I-012: Claims con fuente invalidada no propagables
   Valores y claims de fuentes con contradicción interna demostrada no pueden usarse
   como fundamento en artefactos THYROX. Ver prohibited-claims-registry.md para lista.
   ```
3. Referenciar el registry en CLAUDE.md sección "Restricciones críticas" (si existe)
   o en el SKILL.md principal.

**Archivo a crear:** `.claude/skills/thyrox/references/prohibited-claims-registry.md`
**Archivo a modificar:** `.claude/rules/thyrox-invariants.md` (agregar I-012)
**Depende de:** Ninguno
**Bloquea:** nada, pero elimina un vector de contaminación epistémica activo

---

### T-029 — Agregar protocolo de evaluación de admisiones en el agente deep-dive
**Prioridad: ALTO** — formaliza el test de suficiencia de admisiones (H-C2)

**Problema:** El análisis de la Honest Edition define el test de suficiencia: una admisión
es suficiente si modifica cómo opera el argumento; performativa si el argumento sigue
dependiendo del claim como si la admisión no hubiera ocurrido. El análisis también define
un segundo principio: cuando un documento propone experimentos de falsificación, verificar
si son ejecutables con los recursos disponibles. Estos principios son el corazón de la
distinción entre rigor real y realismo performativo, pero no están en el SKILL del
agente deep-dive.

**Acción:**
1. Agregar en `.claude/agents/deep-dive.md` (o el SKILL.md correspondiente) una
   sección después de Capa 5 (Engaños Estructurales):

   ```
   ### Test de suficiencia de admisiones
   Cuando el documento admite limitaciones, evaluar:
   A. ¿La admisión modifica el argumento o lo deja operacionalmente intacto?
      - Si X es admitido como incierto pero luego usado como cierto → admisión insuficiente
      - Si X es admitido como incierto y se propaga ese estatus en los usos → admisión suficiente
   B. ¿Los experimentos de falsificación propuestos son ejecutables con los recursos declarados?
      - Listar qué acceso requiere cada experimento
      - Verificar contra lo que el propio documento declara inaccesible
      - Un experimento que requiere exactamente lo que el documento dice no tener = falsificabilidad decorativa
   ```

2. Agregar en la Capa 5 (Engaños Estructurales) el patrón "Realismo performativo" con
   sus 5 componentes operacionales:
   - Admisión general que no propaga a instancia concreta
   - Clasificación de rigor con errores en las clasificaciones mismas
   - Auto-evaluación que lista sesgos genéricos pero omite instancias técnicas
   - Experimentos de falsificación inejectuables con recursos declarados
   - Nombre o etiqueta que opera como licencia de confianza previa

**Archivo a modificar:** `.claude/agents/deep-dive.md`
**Depende de:** Ninguno
**Bloquea:** nada — mejora la precisión del agente más usado para análisis adversarial

---

### T-030 — Definir protocolo de tracking de versiones de documentos analizados
**Prioridad: MEDIO** — habilita análisis comparativo entre versiones

**Problema:** El análisis de Part A Honest Edition genera una tabla comparativa de
3 versiones del mismo documento (saltos, contradicciones, engaños, progreso real, problemas
nuevos, ratio mejora/regresión). THYROX no tiene un formato estándar para este tipo de
análisis — cuando el mismo documento se revisa en iteraciones (v1, v2, v3), no hay
mecanismo para rastrear si la nueva versión es mejor o peor neta, ni para documentar
qué problemas persisten sin corrección.

**Acción:**
1. Agregar en `.claude/agents/deep-dive.md` una sección opcional:
   ```
   ### Capa adicional: Comparativa de versiones (cuando aplica)
   Si el artefacto analizado es versión N de un documento con análisis previos:
   | Dimensión | V(N-1) | V(N) | Estado |
   |-----------|--------|------|--------|
   | Saltos lógicos | N | M | MEJORA / REGRESIÓN / SIN CAMBIO |
   | Contradicciones | N | M | ... |
   | Problemas resueltos | lista | lista | ... |
   | Problemas nuevos | lista | lista | ... |
   | Ratio neto | (+X, -Y) | (+X', -Y') | MEJORA NETA si X'>X o Y'<Y |
   ```
2. Agregar en el metadata del artefacto de análisis los campos:
   ```yml
   version_analizada: N
   versiones_previas_analizadas: [lista de paths a análisis anteriores]
   ratio_mejora_neta: POSITIVO / NEGATIVO / NEUTRO
   ```
   (como extensión opcional de los campos del template tipo 2 en metadata-standards.md)

**Archivo a modificar:** `.claude/agents/deep-dive.md`
**Depende de:** Ninguno
**Bloquea:** nada

---

### T-031 — Agregar protocolo Fix Declarado ≠ Fix Verificado en agentic-validator
**Prioridad: MEDIO** — cierra la especificación de T-004/T-005

**Problema:** T-004 y T-005 crean el agente `agentic-validator` con la tarea de validar
código Python agentic contra AP-01..AP-30. Pero la especificación de T-004 no incluye el
protocolo de Fix Declarado ≠ Fix Verificado (H-G3): cuando un documento declara "Bugs
corregidos", el agente no debe reducir su búsqueda — debe verificar cada fix declarado
independientemente y buscar bugs no declarados con la misma intensidad.

**Acción:**
1. Actualizar la especificación de T-004 (`.thyrox/registry/agents/agentic-validator.yml`)
   para incluir en `system_prompt` el protocolo:
   ```
   ## Protocolo Fix Declarado vs. Fix Verificado
   Cuando el código o documento incluye "Bugs corregidos" / "Fixed" / "Updated":
   1. Leer los fixes declarados
   2. Verificar CADA fix declarado independientemente: ¿corrige el problema en el código o solo en el texto?
   3. Buscar bugs NO declarados con la misma intensidad (los más riesgosos son los no nombrados)
   Taxonomía de fixes:
   - Real: el bug fue corregido en el código/lógica
   - Textual: la descripción cambió pero el código no
   - Performativo: la anotación mejoró pero el runtime es idéntico
   ```
2. Actualizar la especificación de T-005 (`.claude/agents/agentic-validator.md`)
   para reflejar este protocolo en el cuerpo del agente.

**Archivos a modificar:** `.thyrox/registry/agents/agentic-validator.yml` (T-004),
`.claude/agents/agentic-validator.md` (T-005)
**Depende de:** T-004 y T-005 (deben crearse antes de actualizarse — o este task
puede colapsar con T-004/T-005 si se ejecutan juntos)
**Bloquea:** nada

---

### T-032 — Agregar tabla de riesgo por característica agentic en agentic-mandate.md
**Prioridad: MEDIO** — enriquece el documento de definición operacional del mandato

**Problema:** T-018 crea `.claude/references/agentic-mandate.md` con criterios
verificables de qué significa que THYROX es un sistema agentic. El análisis de
`agentic-characteristics-input.md` (H-F2) genera una tabla de riesgo que muestra
cómo cada característica agentic contribuye al realismo performativo. Esta tabla es
exactamente el diagnóstico que agentic-mandate.md necesita para justificar por qué
los criterios C2 y C5 del mandato son los más críticos.

**Acción:**
1. Agregar en `.claude/references/agentic-mandate.md` (cuando T-018 lo cree)
   la sección "Tabla de riesgo por característica":
   | Característica | Cómo contribuye al realismo performativo | Criterio del mandato que lo mitiga |
   |----------------|------------------------------------------|-----------------------------------|
   | Autonomy | Decisiones sin validación externa en cada paso | C2: razona sobre incertidumbre |
   | Perception | Feedback loop cerrado sobre output propio | C2: umbral de confianza con protocolo |
   | Action | Escribe artefactos sin gate de calidad | C4: agentes con scope acotado |
   | Goal-orientation | Objetivo = bien formateado, no correcto | C2: exit criteria con evidencia |
   | Reasoning | Justificaciones sin ancla empírica | T-025: clasificación PROVEN/INFERRED |
   | Adaptation | Ajusta hacia plausible, no hacia verdadero | T-021: umbral de confianza con tool_use |

**Archivo a modificar:** `.claude/references/agentic-mandate.md`
**Depende de:** T-018 (debe existir el documento antes de agregar la sección)
**Bloquea:** nada

---

### T-033 — Registrar patrón "evasión de definición" en prohibited-claims-registry
**Prioridad: BAJO** — extiende T-028 con un patrón estructural

**Problema:** El análisis de Part C identifica el patrón de evasión de definición
(H-D3): una variable aparece en el argumento pero no en la sección de definiciones.
Π_inconsist es el ejemplo: aparece con valor 0.87 en la cadena causal pero no tiene
definición operacional en ninguna de las 3 partes del framework. Este patrón es
detectable por inspección estructural: si una variable tiene valor numérico en una
sección pero no aparece en la sección de definiciones del mismo documento, es indefinida.

**Acción:**
1. Agregar en `.claude/skills/thyrox/references/prohibited-claims-registry.md`
   (creado en T-028) una cuarta sección:
   ```
   ## Patrón de evasión de definición
   Señal de detección: una variable tiene valor numérico en una sección de resultados
   pero no tiene definición operacional (protocolo de medición) en la sección de
   definiciones del mismo documento.
   Evaluación: el valor es UNDEFINED, no INFERRED. No puede usarse como evidencia.
   Corrección requerida: definir el protocolo de medición, o eliminar el valor.
   ```
2. Agregar como checklist de Capa 2 (Aislamiento de Capas) en el agente deep-dive:
   "Para cada variable con valor numérico: verificar que existe definición operacional
   en la misma sección de definiciones del documento."

**Archivos a modificar:** `.claude/skills/thyrox/references/prohibited-claims-registry.md`,
`.claude/agents/deep-dive.md`
**Depende de:** T-028 (el registry debe existir)
**Bloquea:** nada

---

## 4. DAG de nuevas tareas

```
T-025 (evidence-classification.md — definición de "observación externa")
  └── T-020 (sección "Evidencia de respaldo" en templates — T-025 da vocabulario)
  └── T-027 (esquema PROVEN/INFERRED/SPECULATIVE en metadata-standards.md — T-025 es base)
  └── T-026 (Cherry-Pick en plan-execution.md.template — coherencia con T-025)

T-028 (prohibited-claims-registry.md + I-012 en thyrox-invariants.md)
  └── T-033 (patrón evasión de definición en registry — extiende T-028)

T-029 (protocolo admisiones + realismo performativo en deep-dive.md)

T-030 (tracking de versiones en deep-dive.md — opcional, independiente)

T-031 (Fix Declarado ≠ Fix Verificado en agentic-validator)
  — después de T-004 y T-005

T-032 (tabla de riesgo en agentic-mandate.md)
  — después de T-018
```

---

## 5. Resumen ejecutivo — gaps críticos

| Task | Prioridad | Bloquea task existente | Nuevo artefacto |
|------|-----------|----------------------|-----------------|
| T-025 | CRÍTICO | T-020 (sin vocabulario, la columna es vacía) | `evidence-classification.md` |
| T-026 | ALTO | Coherencia de T-020 y T-021 | Subsección en plan-execution.md.template |
| T-027 | ALTO | Precisión de T-020 | Modificación a metadata-standards.md |
| T-028 | ALTO | Previene propagación de valores inválidos | `prohibited-claims-registry.md` + I-012 |
| T-029 | ALTO | Precisión del agente deep-dive | Modificación a deep-dive.md |
| T-030 | MEDIO | Nada — mejora tracking | Modificación a deep-dive.md |
| T-031 | MEDIO | Completitud de T-004/T-005 | Modificación a agentic-validator.yml y .md |
| T-032 | MEDIO | Completitud de T-018 | Sección en agentic-mandate.md |
| T-033 | BAJO | Nada — extiende T-028 | Modificación a registry + deep-dive.md |

**Gap más crítico:** T-025 bloquea T-020. Si T-020 se ejecuta sin T-025, la columna
"Tipo" (observación/inferencia/gate-humano) queda sin criterio de clasificación —
cada agente la llenará según su interpretación, reproduciendo exactamente el problema
de adaptation loop cerrado que ÉPICA 42 intenta resolver. T-025 debe ejecutarse ANTES
de T-020 o colapsarse con T-020 en un solo task.

**Segundo gap más crítico:** T-028 + I-012 cierran el vector de propagación de valores
prohibidos (H-A3, H-E2). Sin esta invariante, cualquier agente puede citar ᾱ≈0.83 o
la forma exponencial prohibida sin restricción sistémica — solo el agente deep-dive
tiene la restricción hoy.
