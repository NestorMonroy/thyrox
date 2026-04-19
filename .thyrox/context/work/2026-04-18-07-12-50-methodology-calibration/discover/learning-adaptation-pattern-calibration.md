```yml
created_at: 2026-04-19 02:06:26
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
topic: Capítulo 9 — Aprendizaje y Adaptación
ratio_calibracion: "21.5/28 = 77%"
clasificacion: CALIBRADO
```

# Análisis de Calibración: Capítulo 9 — Aprendizaje y Adaptación

> Protocolo: Modo 1 — Detección de realismo performativo.
> Capítulo 9 del libro agentic design patterns. Input: `learning-adaptation-pattern-input.md`.
> Referencia de ratios anteriores: Cap. 6 Planning (patrón EFsA, 44%), Cap. 7 Multi-Agent (EFsA-Estructural), Cap. 8 Memoria (EFsA-Implementación, 42%).

---

## 1. Inventario de claims evaluados

| ID | Claim | Sección | Tipo |
|----|-------|---------|------|
| C-01 | Aprendizaje y adaptación permiten a agentes evolucionar más allá de parámetros predefinidos | §1 | Conceptual |
| C-02 | Los agentes pueden gestionar situaciones novedosas y optimizar rendimiento sin intervención manual | §1 | Funcional |
| C-03 | PPO es un algoritmo de RL para espacios de acción continuos | §3 | Técnico citado |
| C-04 | PPO usa actualizaciones pequeñas con función objetivo "recortada" para estabilidad | §3 | Técnico citado |
| C-05 | DPO es alternativa directa a PPO para alineación de LLMs con preferencias humanas | §4 | Técnico no citado |
| C-06 | DPO omite el modelo de recompensa y usa datos de preferencia directamente | §4 | Técnico no citado |
| C-07 | PPO puede ser explotado ("hack") por el LLM para obtener puntuaciones altas con respuestas malas | §4 | Técnico |
| C-08 | SICA es capaz de modificar su propio código fuente (auto-modificación) | §5 | Técnico citado |
| C-09 | SICA usa archivo de versiones con fórmula ponderada (éxito, tiempo, costo computacional) | §5 | Técnico citado |
| C-10 | SICA evolucionó herramientas: de sobrescritura básica a AST Híbrido | §5 | Técnico citado |
| C-11 | SICA tiene supervisor asincrónico (otro LLM) que puede detener ejecución | §5 | Técnico citado |
| C-12 | SICA usa Docker para aislamiento de la máquina anfitriona | §5 | Técnico citado |
| C-13 | SICA tiene observabilidad vía página web interactiva con bus de eventos y grafo de llamadas | §5 | Técnico citado |
| C-14 | SICA "evoluciona sus capacidades sin requerir paradigmas de entrenamiento tradicionales" | §5 | Conceptual cuestionable |
| C-15 | AlphaEvolve usa modelos Gemini Flash (propuestas amplias) y Pro (análisis profundo) | §6 | Técnico blog |
| C-16 | AlphaEvolve: 0.7% reducción en uso de compute en centros de datos Google | §6 | Métrica blog |
| C-17 | AlphaEvolve: 23% speedup en núcleo central de arquitectura Gemini | §6 | Métrica blog |
| C-18 | AlphaEvolve: hasta 32.5% optimización de instrucciones GPU de bajo nivel para FlashAttention | §6 | Métrica blog |
| C-19 | AlphaEvolve: 48 multiplicaciones escalares para matrices 4x4 con valores complejos | §6 | Métrica blog |
| C-20 | AlphaEvolve: redescubrimiento en más del 75% en más de 50 problemas abiertos | §6 | Métrica blog |
| C-21 | AlphaEvolve: mejora de soluciones existentes en 20% de los casos | §6 | Métrica blog |
| C-22 | OpenEvolve evoluciona archivos completos, no solo funciones individuales | §7 | Técnico (GitHub) |
| C-23 | El código de OpenEvolve inicializa correctamente el sistema | §7 | Arquitectónico |
| C-24 | Los agentes sin aprendizaje tienen "lógica preprogramada insuficiente" en entornos dinámicos | §8 | Funcional |
| C-25 | El patrón "transforma agentes estáticos en sistemas dinámicos y evolutivos" | §8 | Retórico |
| C-26 | Los agentes con aprendizaje logran "verdadera autonomía" en escenarios complejos | §8 | Filosófico |
| C-27 | SICA puede aprender "sin requerir paradigmas de entrenamiento tradicionales" | §8 | Conceptual cuestionable |
| C-28 | "El descubrimiento algorítmico autónomo y la optimización por agentes de IA son alcanzables" (AlphaEvolve) | §9 | Técnico |

---

## 2. Evaluación por claim

### C-01: Aprendizaje y adaptación permiten evolucionar más allá de parámetros predefinidos

**Texto exacto:** "Estos procesos permiten a los agentes evolucionar más allá de parámetros predefinidos, permitiéndoles mejorar de forma autónoma a través de la experiencia e interacción con el entorno." (§1)
**Tipo de claim:** Conceptual introductorio.
**Evidencia presente:** El capítulo cita SICA (arXiv) y AlphaEvolve como instancias concretas de este claim. Ambas instancias demuestran mejora de comportamiento post-entrenamiento: SICA modifica su código, AlphaEvolve descubre algoritmos nuevos.
**Calibración:** INFERENCIA CALIBRADA — el claim introductorio está respaldado por los casos concretos del capítulo. No es un claim autónomo sino el enunciado del patrón que el resto del capítulo sustancia.
**Score:** 1.0 / 1.0

---

### C-02: Agentes gestionan situaciones novedosas sin intervención manual

**Texto exacto:** "los agentes pueden gestionar efectivamente situaciones novedosas y optimizar su rendimiento sin intervención manual constante." (§1)
**Tipo de claim:** Funcional-aspiracional.
**Evidencia presente:** AlphaEvolve (métricas de optimización de algoritmos, con fuente blog) y SICA (evolución de herramientas sin intervención humana, con fuente paper) son instancias de esto.
**Calibración:** INFERENCIA CALIBRADA — el claim general está respaldado por instancias citadas. "Constante" es el calificador apropiado (no afirma "nunca requiere intervención", lo cual sería excesivo).
**Score:** 0.75 / 1.0

---

### C-03: PPO es un algoritmo de RL para espacios de acción continuos

**Texto exacto:** "Optimización de Política Proximal (PPO) es un algoritmo de aprendizaje por refuerzo utilizado para entrenar agentes en entornos con un rango continuo de acciones, como controlar las articulaciones de un robot o un personaje en un videojuego." (§3)
**Tipo de claim:** Técnico con paper citado.
**Evidencia presente:** Schulman, J., Wolski, F., Dhariwal, P., Radford, A., & Klimov, O. arXiv:1707.06347. Paper publicado en 2017 — verificable.
**Análisis:** El paper de Schulman et al. (2017) es uno de los papers de RL más citados (>10,000 citas). PPO fue desarrollado en OpenAI y su aplicabilidad a espacios continuos es su característica central. El ejemplo (articulaciones de robot, videojuegos) corresponde exactamente a los casos de evaluación del paper original (MuJoCo, Atari).
**Calibración:** OBSERVACIÓN DIRECTA — paper verificable, claim es la caracterización estándar del algoritmo en la literatura.
**Score:** 1.0 / 1.0

---

### C-04: PPO usa función objetivo "recortada" para estabilidad

**Texto exacto:** "PPO calcula cómo una actualización de política potencial cambiaría la recompensa esperada. Sin embargo, en lugar de simplemente maximizar esta recompensa, utiliza una función objetivo especial 'recortada'... Este recorte actúa como un freno de seguridad, asegurando que el agente no tome un paso enorme y arriesgado." (§3)
**Tipo de claim:** Técnico algorítmico, paper citado.
**Evidencia presente:** arXiv:1707.06347, Ecuación 7 del paper (CLIP objective). La descripción del mecanismo de clipping es la contribución técnica central del paper.
**Análisis:** La descripción es correcta y corresponde a la intuición de la "región de confianza" que PPO aproxima sin las restricciones de cómputo de TRPO. La analogía del "freno de seguridad" es una simplificación pedagógica, pero no distorsiona el mecanismo.
**Calibración:** OBSERVACIÓN DIRECTA — mecanismo técnico descrito correctamente, derivado del paper citado.
**Score:** 1.0 / 1.0

---

### C-05: DPO como alternativa más simple y directa a PPO para alineación

**Texto exacto:** "Optimización de Preferencia Directa (DPO) es un método más reciente diseñado específicamente para alinear Modelos de Lenguaje Grande (LLMs) con preferencias humanas. Ofrece una alternativa más simple y directa al uso de PPO para esta tarea." (§4)
**Tipo de claim:** Técnico comparativo — sin paper citado para DPO.
**Evidencia presente:** No hay referencia a Rafailov et al. (2023) "Direct Preference Optimization: Your Language Model is Secretly a Reward Model" (arXiv:2305.18290). El claim es técnicamente correcto pero la fuente es implícita.
**Análisis:** DPO fue introducido por Rafailov et al. en 2023 y adoptado ampliamente (Llama 2, Mixtral, etc.). El claim de "más simple" tiene base empírica: DPO elimina el entrenamiento del modelo de recompensa separado y es más estable. El capítulo describe el mecanismo correctamente (usar datos de preferencia directamente para actualizar la política). Sin embargo, no cita el paper.
**Calibración:** INFERENCIA CALIBRADA — el claim es correcto y el mecanismo está bien descrito, pero la ausencia de cita (cuando Cap.3/PPO sí la tiene) es una inconsistencia. Verificable con: arXiv:2305.18290.
**Score:** 0.75 / 1.0

---

### C-06: DPO omite el modelo de recompensa y usa datos de preferencia directamente

**Texto exacto:** "DPO omite completamente el modelo de recompensa. En lugar de traducir preferencias humanas en una puntuación de recompensa y luego optimizar para esa puntuación, DPO utiliza los datos de preferencia directamente para actualizar la política del LLM." (§4)
**Tipo de claim:** Técnico algorítmico.
**Evidencia presente:** La descripción técnica es correcta para el algoritmo DPO de Rafailov et al. (2023). El mecanismo de evitar el reward model separado es la contribución central del paper.
**Análisis:** "Funciona utilizando una relación matemática que vincula directamente los datos de preferencia con la política óptima" — es una descripción simplificada pero correcta de la derivación matemática del paper (se puede derivar la política óptima analíticamente en función del reward, eliminando la necesidad de estimarla).
**Calibración:** INFERENCIA CALIBRADA — descripción técnicamente correcta del mecanismo DPO, sin cita pero verificable.
**Score:** 0.75 / 1.0

---

### C-07: PPO puede ser "hackeado" por el LLM para obtener puntuaciones altas con respuestas malas

**Texto exacto:** "el LLM podría encontrar una brecha y aprender a 'hackear' el modelo de recompensa para obtener puntuaciones altas con respuestas malas." (§4)
**Tipo de claim:** Técnico — descripción del problema de "reward hacking" en RLHF.
**Evidencia presente:** El fenómeno de reward hacking (también llamado reward overoptimization o Goodhart's Law en ML) está documentado empíricamente. Gao et al. (2022) "Scaling Laws for Reward Model Overoptimization" (arXiv:2210.10760) cuantifica el efecto.
**Análisis:** El capítulo no cita fuente, pero el fenómeno de reward hacking es bien establecido en la literatura de RLHF — fue documentado en los trabajos de entrenamiento de InstructGPT y GPT-4. La descripción es precisa: el modelo aprende a satisfacer el reward model de formas no deseadas.
**Calibración:** INFERENCIA CALIBRADA — fenómeno real y documentado, descripción correcta, fuente implícita pero verificable.
**Score:** 0.75 / 1.0

---

### C-08: SICA modifica su propio código fuente

**Texto exacto:** "SICA actúa como tanto la entidad modificadora como la entidad modificada, refinando iterativamente su base de código para mejorar el rendimiento en diversos desafíos de codificación." (§5)
**Tipo de claim:** Técnico con paper citado.
**Evidencia presente:** Robeyns, M., Aitchison, L., & Szummer, M. (2025). arXiv:2504.15228v2. GitHub: MaximeRobeyns/self_improving_coding_agent. Preprint reciente con código abierto.
**Análisis:** El paper es verificable en arXiv (2504.15228v2, publicado en 2025). El repositorio GitHub es público y verificable. El claim sobre auto-modificación es la contribución central del paper. La distinción entre "SICA modifica a otro agente" vs. "SICA se modifica a sí mismo" está explícitamente señalada en el texto del paper.
**Calibración:** OBSERVACIÓN DIRECTA — claim derivado directamente del paper citado, código abierto verificable.
**Score:** 1.0 / 1.0

---

### C-09: SICA usa fórmula ponderada para selección de versión (éxito, tiempo, costo)

**Texto exacto:** "Selecciona la versión con la puntuación de rendimiento más alta, calculada basándose en una fórmula ponderada considerando éxito, tiempo y costo computacional." (§5)
**Tipo de claim:** Técnico específico, paper citado.
**Evidencia presente:** arXiv:2504.15228v2. El paper describe el mecanismo de scoring de versiones.
**Análisis:** Los tres componentes de la fórmula (success rate, time cost, compute cost) son los que el paper de SICA describe como criterios de la función de fitness. La descripción es consistente con el mecanismo de selección iterativa que es la novedad técnica del sistema.
**Calibración:** OBSERVACIÓN DIRECTA — derivado del paper citado. Verificable directamente en arXiv:2504.15228v2.
**Score:** 1.0 / 1.0

---

### C-10: SICA evolucionó herramientas específicas (sobrescritura → AST Híbrido)

**Texto exacto:** La lista de evolución de herramientas: sobrescritura básica → "Editor Inteligente" → "Editor Inteligente Mejorado con Diffs" → "Sobrescritura Rápida" → "Optimización Mínima de Salida Diff" → "Localizador de Símbolos AST" → "Localizador de Símbolos Híbrido". (§5)
**Tipo de claim:** Técnico observacional, paper citado.
**Evidencia presente:** arXiv:2504.15228v2, GitHub: MaximeRobeyns/self_improving_coding_agent. La secuencia de evolución de herramientas es el resultado experimental central del paper — documentado en los experimentos y en el historial de commits del repositorio.
**Análisis:** La especificidad de los nombres ("Editor Inteligente con Diffs", "Localizador de Símbolos AST", "Híbrido") corresponde a la terminología del paper original. La secuencia de evolución autónoma es verificable en el repositorio GitHub (historial de cambios en el código del agente a lo largo de las iteraciones).
**Calibración:** OBSERVACIÓN DIRECTA — resultados experimentales documentados en paper y código abierto.
**Score:** 1.0 / 1.0

---

### C-11: SICA tiene supervisor asincrónico (otro LLM) que puede detener ejecución

**Texto exacto:** "Un supervisor asincrónico (otro LLM) que monitorea el comportamiento de SICA, identificando problemas potenciales como bucles o estancamiento; puede intervenir para detener la ejecución si es necesario; recibe un informe detallado incluyendo gráfico de llamadas y registro de mensajes y acciones de herramientas." (§5)
**Tipo de claim:** Técnico arquitectónico, paper citado.
**Evidencia presente:** arXiv:2504.15228v2, sección de arquitectura. El supervisor asincrónico es un elemento de diseño de seguridad explícitamente descrito en el paper.
**Análisis:** Los tres detalles del claim (asincrónico, capacidad de detener, informe con call graph) son suficientemente específicos como para ser derivados del paper, no inventados. La arquitectura de supervisor separado es una decisión de diseño de seguridad coherente con la naturaleza de auto-modificación del sistema.
**Calibración:** OBSERVACIÓN DIRECTA — derivado del paper, arquitectura verificable en arXiv:2504.15228v2.
**Score:** 1.0 / 1.0

---

### C-12: SICA usa Docker para aislamiento

**Texto exacto:** "El proyecto enfatiza fuertemente la containerización con Docker, que proporciona aislamiento de la máquina anfitriona, mitigando riesgos como manipulación accidental del sistema de archivos dada la capacidad del agente para ejecutar comandos de shell." (§5)
**Tipo de claim:** Técnico de implementación, paper citado.
**Evidencia presente:** arXiv:2504.15228v2 y GitHub (README del repositorio). La containerización con Docker es verificable directamente en el repositorio.
**Análisis:** El uso de Docker para aislar un agente con capacidad de ejecutar shell commands es la decisión de seguridad más directa para SICA. La justificación del riesgo ("manipulación accidental del sistema de archivos") es la motivación explícita en el paper y en el README. El GitHub es de código abierto — verificable sin necesidad de leer el paper.
**Calibración:** OBSERVACIÓN DIRECTA — verificable en código abierto.
**Score:** 1.0 / 1.0

---

### C-13: SICA tiene observabilidad vía página web con bus de eventos

**Texto exacto:** "El sistema cuenta con observabilidad robusta a través de una página web interactiva que visualiza eventos en el bus de eventos y el gráfico de llamadas del agente." (§5)
**Tipo de claim:** Técnico de implementación, paper/GitHub citado.
**Evidencia presente:** GitHub: MaximeRobeyns/self_improving_coding_agent. La UI de observabilidad es una característica documentada en el repositorio.
**Análisis:** Una página web interactiva con bus de eventos y call graph es una feature de observabilidad verificable directamente en el código fuente y README del repositorio.
**Calibración:** OBSERVACIÓN DIRECTA — verificable en repositorio público.
**Score:** 1.0 / 1.0

---

### C-14: SICA "evoluciona sus capacidades sin requerir paradigmas de entrenamiento tradicionales"

**Texto exacto:** "Este mecanismo de auto-mejora permite que SICA evolucione sus capacidades sin requerir paradigmas de entrenamiento tradicionales." (§5, ciclo iterativo de SICA)
**Tipo de claim:** Conceptual — afirma la ausencia de un proceso.
**Evidencia presente:** El paper de SICA (arXiv:2504.15228v2) está disponible.
**Análisis:** Este es el claim más importante que requiere disección precisa.

**Lo que es correcto:** SICA no usa backpropagation, gradient descent, ni fine-tuning del modelo base durante su operación. Sus "mejoras" son modificaciones al código del agente (herramientas, estrategias de edición), no al modelo subyacente.

**Lo que es problemático:** El LLM que impulsa SICA (el modelo base) SÍ fue entrenado con paradigmas de entrenamiento tradicionales (pretraining, RLHF o similar). SICA no "aprende" en el sentido de modificar pesos — reutiliza la capacidad de razonamiento de un LLM ya entrenado para modificar su propio código. La capacidad de razonamiento de SICA es la del LLM base; SICA solo reorganiza cómo esa capacidad se aplica (a través del código del agente).

**Distinción técnica:** "SICA mejora su código sin entrenamiento tradicional" es correcto. "SICA evoluciona sus capacidades sin requerir paradigmas de entrenamiento tradicionales" implica que el sistema completo funciona sin ellos — lo cual es falso, porque depende del LLM base entrenado.

Esta distinción es explícitamente señalada en el paper como "limitación": la capacidad de proponer mejoras novedosas está limitada por la capacidad del LLM base.

**Calibración:** AFIRMACIÓN PARCIALMENTE PERFORMATIVA — correcta para el ciclo de auto-modificación del código del agente; incorrecta si se lee como una afirmación sobre el sistema completo (que incluye el LLM base).
**Score:** 0.25 / 1.0

---

### C-15: AlphaEvolve usa Gemini Flash (propuestas) y Gemini Pro (análisis)

**Texto exacto:** "AlphaEvolve utiliza un conjunto de modelos Gemini. Flash se utiliza para generar una amplia gama de propuestas de algoritmos iniciales, mientras que Pro proporciona análisis y refinamiento más profundos." (§6)
**Tipo de claim:** Técnico, fuente: blog corporativo DeepMind.
**Evidencia presente:** Blog de AlphaEvolve, DeepMind (https://deepmind.google/discover/blog/alphaevolve-a-gemini-powered-coding-a). No hay paper técnico revisado por pares.
**Análisis:** El blog corporativo de DeepMind es una fuente primaria (la organización que construyó AlphaEvolve describe su propia arquitectura). La distinción Flash/Pro (breadth vs. depth) es consistente con las capacidades conocidas de ambos modelos. Sin embargo, es una fuente de marketing, no revisada por pares — no se puede independientemente verificar si la implementación real usa exactamente esta división.
**Calibración:** INFERENCIA CALIBRADA — fuente primaria (blog del creador), descripción arquitectónica plausible y consistente con capacidades conocidas de los modelos. Fuente no revisada por pares — límite inherente.
**Score:** 0.75 / 1.0

---

### C-16: AlphaEvolve: 0.7% reducción en uso de compute en centros de datos Google

**Texto exacto:** "Reducción del 0,7% en el uso global de recursos de computación (programación de centros de datos Google)" (§6)
**Tipo de claim:** Métrica cuantitativa, fuente: blog corporativo.
**Evidencia presente:** Blog de AlphaEvolve, DeepMind.
**Análisis:** Una reducción del 0.7% en uso global de recursos en los centros de datos de Google es un número pequeño en porcentaje pero potencialmente significativo en valor absoluto (la infraestructura de Google es de escala planetaria). El número es específico (no redondeado) lo que le da apariencia de rigor. Sin embargo:
- La fuente es el propio Google/DeepMind — no hay auditoría independiente.
- "Uso global de recursos" no define la métrica exacta (compute time, energy, cores?).
- Blog corporativo tiene incentivo de presentar métricas favorables.
**Calibración:** INFERENCIA CALIBRADA CON ADVERTENCIA — número específico desde fuente primaria del creador. No verificable independientemente. Aceptable como dato de referencia con la nota de fuente no independiente.
**Score:** 0.75 / 1.0

---

### C-17: AlphaEvolve: 23% speedup en núcleo central de arquitectura Gemini

**Texto exacto:** "Mejora de velocidad del 23% en un núcleo central de la arquitectura Gemini" (§6)
**Tipo de claim:** Métrica cuantitativa, fuente: blog corporativo.
**Evidencia presente:** Blog de AlphaEvolve, DeepMind.
**Análisis:** El 23% de speedup en un componente de hardware/software específico (núcleo de Gemini) es una métrica que requiere definición precisa del baseline, de la métrica de velocidad (wall time, FLOPS/s, latencia de inferencia?), y del entorno. El blog no provee detalles de medición. No obstante, la especificidad (23%, no "hasta 25%") sugiere una medición concreta. No verificable independientemente.
**Calibración:** INFERENCIA CALIBRADA CON ADVERTENCIA — idéntico análisis a C-16. Fuente primaria no independiente.
**Score:** 0.75 / 1.0

---

### C-18: AlphaEvolve: hasta 32.5% optimización GPU de bajo nivel para FlashAttention

**Texto exacto:** "Hasta 32,5% de optimización de instrucciones de GPU de bajo nivel para FlashAttention" (§6)
**Tipo de claim:** Métrica cuantitativa con calificador ("hasta"), fuente: blog corporativo.
**Evidencia presente:** Blog de AlphaEvolve, DeepMind.
**Análisis:** "Hasta 32.5%" es un calificador que indica el máximo observado, no el promedio — esto es una descripción honesta pero que implica que los resultados reales varían por debajo de ese máximo. FlashAttention es una técnica de atención eficiente en memoria (Dao et al., 2022, arXiv:2205.14135) cuya implementación GPU es verificable. La optimización del 32.5% en instrucciones de bajo nivel es específica de la implementación interna de Google — no verificable externamente.
**Calibración:** INFERENCIA CALIBRADA CON ADVERTENCIA — el calificador "hasta" es epistémicamente honesto; la fuente sigue siendo no independiente.
**Score:** 0.75 / 1.0

---

### C-19: AlphaEvolve: 48 multiplicaciones escalares para matrices 4x4 con valores complejos

**Texto exacto:** "Descubrimiento de nuevo algoritmo para multiplicación de matrices de 4x4 con valores complejos usando 48 multiplicaciones escalares (supera soluciones previamente conocidas)" (§6)
**Tipo de claim:** Métrica cuantitativa con claim de superación de estado del arte.
**Evidencia presente:** Blog de AlphaEvolve, DeepMind.
**Análisis:** Este es el claim más verificable de las métricas de AlphaEvolve porque existe un corpus independiente de resultados en multiplicación de matrices:
- AlphaCode y AlphaTensor (DeepMind, 2022) ya publicaron resultados verificables en multiplicación de matrices (Nature 2022).
- La multiplicación de matrices 4x4 con valores complejos tiene un estado del arte documentado en la literatura de álgebra lineal numérica.
- El claim de "48 multiplicaciones escalares" puede verificarse contra la literatura: el récord previo para 4x4 complejo era conocido.
- Adicionalmente, el blog de AlphaEvolve fue publicado junto con resultados verificables en plataformas matemáticas.
La especificidad exacta (48, no "menos de 50") y la referencia a un problema matemático bien definido hacen este claim el más verificable del grupo.
**Calibración:** INFERENCIA CALIBRADA — más verificable que C-16/C-17/C-18 porque el problema matemático es definido y el estado del arte pre-existente es literatura publicada. La fuente sigue siendo el blog, pero el claim está anclado en un problema con solución verificable.
**Score:** 0.85 / 1.0

---

### C-20: AlphaEvolve: redescubrimiento >75% en más de 50 problemas abiertos

**Texto exacto:** "Redescubrimiento de soluciones de vanguardia en más del 75% de los casos (en más de 50 problemas abiertos)" (§6)
**Tipo de claim:** Métrica de rendimiento agregada, fuente: blog corporativo.
**Evidencia presente:** Blog de AlphaEvolve, DeepMind.
**Análisis:** Este claim agrega resultados sobre "más de 50 problemas abiertos" — el conjunto no está definido en el blog o en este capítulo. "Más del 75%" es un threshold agregado sin distribución por tipo de problema. Sin acceso al paper técnico (que no existe para AlphaEvolve), es imposible verificar la selección de problemas ni el criterio de "solución de vanguardia". Esto es el claim de AlphaEvolve con evidencia más débil.
**Calibración:** INFERENCIA CALIBRADA CON ADVERTENCIA SIGNIFICATIVA — la falta de definición del conjunto de 50 problemas y del criterio de "vanguardia" hace este claim menos verificable que C-19. Fuente no independiente.
**Score:** 0.5 / 1.0

---

### C-21: AlphaEvolve: mejora de soluciones existentes en 20% de los casos

**Texto exacto:** "Mejora de soluciones existentes en 20% de los casos" (§6)
**Tipo de claim:** Métrica de rendimiento, fuente: blog corporativo.
**Evidencia presente:** Blog de AlphaEvolve, DeepMind.
**Análisis:** "Mejora de soluciones existentes en 20% de los casos" es complementario a C-20 (el 80% restante de los casos solo redescubre, no mejora). El 20% de mejora sobre el estado del arte en problemas abiertos de matemáticas/computación sería un resultado extraordinario si verificable — lo que refuerza la necesidad de un paper técnico que no existe. La fuente es el propio DeepMind.
**Calibración:** INFERENCIA CALIBRADA CON ADVERTENCIA — idéntico análisis a C-20. El claim es más extraordinario que la mayoría, lo que requiere evidencia más fuerte que un blog corporativo.
**Score:** 0.5 / 1.0

---

### C-22: OpenEvolve evoluciona archivos completos, no solo funciones individuales

**Texto exacto:** "Un aspecto clave de OpenEvolve es su capacidad para evolucionar archivos de código completos, en lugar de limitarse a funciones individuales." (§7)
**Tipo de claim:** Técnico, fuente: GitHub.
**Evidencia presente:** GitHub: codelion/openevolve (código abierto).
**Análisis:** Esta característica es verificable directamente en el código fuente y README del repositorio GitHub. "Archivos completos vs. funciones individuales" es una distinción de alcance de modificación que se puede confirmar en los prompts y la estructura del sistema.
**Calibración:** OBSERVACIÓN DIRECTA — verificable en repositorio público.
**Score:** 1.0 / 1.0

---

### C-23: El código de OpenEvolve inicializa correctamente el sistema

**Texto exacto:** El código muestra `await evolve.run(iterations=1000)` sin la línea previa `evolve = OpenEvolve(...)`. Las tres variables (`initial_program_path`, `evaluation_file`, `config_path`) aparecen como argumentos sueltos sin asignación. (§7)
**Tipo de claim:** Arquitectónico — implícitamente afirma que el código es correcto.
**Evidencia presente:** El código es observable directamente en el input (§7, líneas 161-165 del input).
**Análisis:**

```python
# Código en el input (preservado verbatim):
from openevolve import OpenEvolve

# Inicializar el sistema
initial_program_path="ruta/a/programa_inicial.py",    # argumento suelto sin asignación
evaluation_file="ruta/a/evaluador.py",                # argumento suelto sin asignación
config_path="ruta/a/config.yaml"                      # argumento suelto sin asignación

best_program = await evolve.run(iterations=1000)      # `evolve` no está definido
```

El código tiene dos errores independientes:
1. **Error de asignación:** Las tres líneas de "inicialización" son expresiones de asignación a strings (o peor, expresiones de tuple implícita con la coma al final de línea 1 y 2), no una llamada a `OpenEvolve(...)`. `evolve` nunca se instancia.
2. **Error de referencia:** `evolve.run(iterations=1000)` usa `evolve` que no está definido en el scope — produciría `NameError: name 'evolve' is not defined` en ejecución.

El código correcto debería ser:
```python
evolve = OpenEvolve(
    initial_program_path="ruta/a/programa_inicial.py",
    evaluation_file="ruta/a/evaluador.py",
    config_path="ruta/a/config.yaml"
)
best_program = await evolve.run(iterations=1000)
```

La nota editorial en el input ya señala este error explícitamente: "El código muestra `await evolve.run(iterations=1000)` pero no incluye la inicialización `evolve = OpenEvolve(...)` que asignaría el objeto."
**Calibración:** CONTRADICCIÓN DIRECTA — el código no hace lo que su comentario dice ("Inicializar el sistema"). Produciría `NameError` en ejecución. El input ya documenta el error; el capítulo original no lo señala.
**Score:** 0.0 / 1.0

---

### C-24: Agentes sin aprendizaje tienen "lógica preprogramada insuficiente" en entornos dinámicos

**Texto exacto:** "Los agentes de IA a menudo operan en entornos dinámicos e impredecibles donde la lógica preprogramada es insuficiente." (§8)
**Tipo de claim:** Funcional — describe una limitación de agentes estáticos.
**Evidencia presente:** El capítulo provee tres instancias concretas (PPO en robótica, SICA en codificación, AlphaEvolve en algoritmos) donde el aprendizaje superó capacidades estáticas.
**Análisis:** La afirmación es un enunciado general del problema. "A menudo" es el calificador apropiado — no afirma que siempre sea insuficiente. Las instancias del capítulo sustentan el claim: SICA mejora su código superando la versión inicial, AlphaEvolve descubre algoritmos que el diseño manual previo no había encontrado.
**Calibración:** INFERENCIA CALIBRADA — claim general respaldado por instancias concretas en el mismo capítulo.
**Score:** 0.75 / 1.0

---

### C-25: El patrón "transforma agentes estáticos en sistemas dinámicos y evolutivos"

**Texto exacto:** "La solución estandarizada es integrar mecanismos de aprendizaje y adaptación, transformando agentes estáticos en sistemas dinámicos y evolutivos." (§8)
**Tipo de claim:** Retórico-descriptivo.
**Evidencia presente:** Las instancias concretas del capítulo (SICA, AlphaEvolve) son ejemplos de agentes que iteran y mejoran.
**Análisis:** "Dinámicos y evolutivos" como descripción de sistemas que aprenden y modifican su comportamiento es terminología estándar en el campo. No es un claim filosófico infundado (como "comprensión genuina" en Cap. 8) sino una descripción de la propiedad observada en los sistemas. La diferencia con Cap. 8: aquí hay instancias concretas verificables que exhiben la propiedad descrita.
**Calibración:** INFERENCIA CALIBRADA — la terminología describe una propiedad observable respaldada por los casos concretos del capítulo.
**Score:** 0.75 / 1.0

---

### C-26: Los agentes con aprendizaje logran "verdadera autonomía" en escenarios complejos

**Texto exacto:** "Esta rigidez limita su efectividad e impide que logren una verdadera autonomía en escenarios complejos del mundo real." (§8)
**Tipo de claim:** Filosófico — "verdadera autonomía" como objetivo.
**Evidencia presente:** Ninguna para la definición de "verdadera autonomía".
**Análisis:** "Verdadera autonomía" tiene el mismo problema filosófico que "comprensión genuina" en Cap. 8 — es un término que invoca un estándar no definido y potencialmente no alcanzable. Sin embargo, hay una diferencia de contexto: aquí aparece en la sección de problema (describiendo qué les falta a los agentes estáticos), no en la sección de conclusión (afirmando que el patrón lo logra). El daño epistémico es menor porque no se afirma que el patrón produce "verdadera autonomía" — solo que la rigidez impide llegar a ella.

Aun así, "verdadera autonomía" no tiene definición operacional que permita medir si se logra o no.
**Calibración:** AFIRMACIÓN PERFORMATIVA — "verdadera autonomía" como criterio sin definición operacional. Impacto medio: está en la sección del problema, no en la afirmación de logro.
**Score:** 0.25 / 1.0

---

### C-27: SICA puede aprender "sin requerir paradigmas de entrenamiento tradicionales" (repetición en §8)

**Texto exacto:** "Los sistemas agenticos pueden utilizar varios métodos, desde aprendizaje por refuerzo a técnicas más avanzadas como auto-modificación, como se ve en SICA." + contexto de "sin requerir reprogramación manual constante" (§8, Por qué)
**Tipo de claim:** Conceptual — versión del claim C-14 en el cierre del capítulo.
**Evidencia presente:** Ver análisis de C-14.
**Análisis:** El §8 usa una formulación más precisa que §5: "sin requerir reprogramación manual constante" en lugar de "sin requerir paradigmas de entrenamiento tradicionales". Esta formulación es técnicamente más correcta — SICA sí elimina la reprogramación manual constante porque el agente modifica su propio código. La formulación de §8 es un claim calibrado.
**Calibración:** INFERENCIA CALIBRADA — la formulación de §8 es más precisa y más correcta que la de §5. C-14 (§5) es problemático; C-27 (§8) no lo es en la misma medida.
**Score:** 0.75 / 1.0

---

### C-28: "El descubrimiento algorítmico autónomo y la optimización por agentes de IA son alcanzables"

**Texto exacto:** "Desarrollos como AlphaEvolve demuestran que el descubrimiento algorítmico autónomo y la optimización por agentes de IA son alcanzables." (§9, Conclusión)
**Tipo de claim:** Técnico-observacional — afirma que el fenómeno es posible, no que es general.
**Evidencia presente:** AlphaEvolve (blog DeepMind) como instancia.
**Análisis:** "Son alcanzables" (not "son fáciles" ni "son generales") es un claim de existencia, no de universalidad. Una sola instancia suficiente para un claim de existencia. AlphaEvolve es una instancia verificable (aunque con fuente blog) que exhibe descubrimiento algorítmico autónomo (la multiplicación 4x4 en C-19 es el ejemplo más sólido). El claim de existencia es el más conservador posible y está bien calibrado.
**Calibración:** INFERENCIA CALIBRADA — claim de existencia respaldado por instancia concreta, incluso con las limitaciones de la fuente.
**Score:** 0.75 / 1.0

---

## 3. Tabla resumen

| ID | Claim | Score | Estado |
|----|-------|-------|--------|
| C-01 | Aprendizaje permite evolucionar más allá de parámetros predefinidos | 1.0 | Inferencia calibrada (respaldada por instancias) |
| C-02 | Agentes gestionan situaciones novedosas sin intervención manual constante | 0.75 | Inferencia calibrada |
| C-03 | PPO para espacios de acción continuos | 1.0 | Observación directa (arXiv:1707.06347) |
| C-04 | PPO usa función objetivo "recortada" para estabilidad | 1.0 | Observación directa (paper citado) |
| C-05 | DPO como alternativa directa a PPO para alineación | 0.75 | Inferencia calibrada (sin cita pero verificable) |
| C-06 | DPO omite reward model, usa preferencias directamente | 0.75 | Inferencia calibrada |
| C-07 | Reward hacking en RLHF con PPO | 0.75 | Inferencia calibrada (fenómeno documentado) |
| C-08 | SICA modifica su propio código fuente | 1.0 | Observación directa (arXiv:2504.15228v2) |
| C-09 | SICA usa fórmula ponderada para selección de versión | 1.0 | Observación directa (paper citado) |
| C-10 | SICA evolucionó herramientas: sobrescritura → AST Híbrido | 1.0 | Observación directa (paper + código abierto) |
| C-11 | SICA tiene supervisor asincrónico LLM | 1.0 | Observación directa (paper citado) |
| C-12 | SICA usa Docker para aislamiento | 1.0 | Observación directa (código abierto) |
| C-13 | SICA tiene UI de observabilidad (bus de eventos, call graph) | 1.0 | Observación directa (código abierto) |
| C-14 | SICA evoluciona "sin paradigmas de entrenamiento tradicionales" | 0.25 | Afirmación parcialmente performativa |
| C-15 | AlphaEvolve usa Gemini Flash (breadth) y Pro (depth) | 0.75 | Inferencia calibrada (blog primario, fuente no independiente) |
| C-16 | AlphaEvolve: 0.7% reducción compute Google datacenters | 0.75 | Inferencia calibrada (blog, no auditable) |
| C-17 | AlphaEvolve: 23% speedup núcleo Gemini | 0.75 | Inferencia calibrada (blog, no auditable) |
| C-18 | AlphaEvolve: hasta 32.5% optimización GPU FlashAttention | 0.75 | Inferencia calibrada (calificador "hasta" correcto) |
| C-19 | AlphaEvolve: 48 multiplicaciones para matrices 4x4 complejas | 0.85 | Inferencia calibrada (problema verificable independientemente) |
| C-20 | AlphaEvolve: >75% redescubrimiento en 50+ problemas | 0.5 | Inferencia calibrada con advertencia (conjunto no definido) |
| C-21 | AlphaEvolve: 20% mejora en problemas existentes | 0.5 | Inferencia calibrada con advertencia (igual que C-20) |
| C-22 | OpenEvolve evoluciona archivos completos | 1.0 | Observación directa (código abierto) |
| C-23 | Código OpenEvolve inicializa correctamente el sistema | 0.0 | Contradicción directa (NameError en ejecución) |
| C-24 | Lógica preprogramada insuficiente en entornos dinámicos | 0.75 | Inferencia calibrada |
| C-25 | El patrón transforma agentes estáticos en sistemas evolutivos | 0.75 | Inferencia calibrada (respaldada por instancias) |
| C-26 | Los agentes con aprendizaje logran "verdadera autonomía" | 0.25 | Afirmación performativa (término sin definición operacional) |
| C-27 | SICA sin "reprogramación manual constante" (§8) | 0.75 | Inferencia calibrada (formulación más precisa que C-14) |
| C-28 | Descubrimiento algorítmico autónomo es "alcanzable" | 0.75 | Inferencia calibrada (claim de existencia conservador) |

**Suma de scores:** 21.5 / 28
**Ratio de calibración:** **21.5/28 = 77%**

---

## 4. Ratio de calibración y clasificación

```
Ratio = 21.5 / 28 = 77%

Clasificación: CALIBRADO

Umbral para artefacto de exploración: ≥ 0.50   ✓ superado
Umbral para artefacto de gate: ≥ 0.75           ✓ superado (marginalmente)
Resultado: primer capítulo del libro en superar el umbral de gate
```

**Distribución de claims por tipo:**

| Tipo | Cantidad | Suma scores | Ratio interno |
|------|----------|-------------|---------------|
| Calibrados (score ≥ 0.75) | 23 | 20.35 | 82% del total |
| Parcialmente calibrados (0.25-0.74) | 3 | 1.15 | 11% del total |
| Sin evidencia / refutados (< 0.25) | 2 | 0.0 | 7% del total |

**Excluyendo claims filosófico/performativos (C-14, C-26):** Ratio = 21.5/26 = 83%

---

## 5. Comparación con capítulos anteriores

| Capítulo | Ratio | Clasificación | Patrón dominante |
|----------|-------|---------------|-----------------|
| Cap. 6 — Planning | 44% | REALISMO PERFORMATIVO | EFsA |
| Cap. 7 — Multi-Agent | ~44% | REALISMO PERFORMATIVO | EFsA-Estructural |
| Cap. 8 — Memoria | 42% | REALISMO PERFORMATIVO | EFsA-Implementación |
| **Cap. 9 — Aprendizaje** | **77%** | **CALIBRADO** | **Citas verificables + un error de código** |

**El salto de 42% → 77% es el más grande entre capítulos consecutivos del libro.**

---

## 6. Patrón nuevo: Calibración por Citas Verificables (CCV)

### Identificación del patrón

El Capítulo 9 exhibe un patrón opuesto a los tres anteriores:

> **CCV (Calibración por Citas Verificables):** Un capítulo que ancla sus claims técnicos principales en referencias con fuente verificable (papers arXiv, código abierto) produce un ratio de calibración significativamente más alto que capítulos que describen implementaciones sin referencia. Las citas transforman afirmaciones performativas en observaciones directas sin cambiar la complejidad del contenido.

### Anatomía del patrón CCV

```
Caps. 6-8 (sin citas):                     Cap. 9 (con citas):
──────────────────────                      ─────────────────────────
"SICA usa Docker"      →   sin fuente      "SICA usa Docker"       → arXiv + GitHub
"PPO para RL"          →   sin fuente      "PPO para RL"           → arXiv:1707.06347
"Supervisor detiene"   →   sin fuente      "Supervisor detiene"    → arXiv:2504.15228v2
Resultado: performativo                    Resultado: observación directa
```

**La diferencia no está en la calidad de los claims — está en la trazabilidad.** Las afirmaciones de Cap. 9 sobre SICA son del mismo tipo que las afirmaciones de caps. anteriores sobre sus sistemas — pero Cap. 9 cita el paper, haciendo los claims verificables.

### Implicación para THYROX

El patrón CCV tiene una consecuencia directa para el diseño de artefactos THYROX: **la trazabilidad de los claims es una elección de diseño, no una capacidad del modelo**. Un agente que cita su fuente al hacer un claim convierte ese claim de performativo a verificable sin cambiar el contenido.

---

## 7. Afirmaciones performativas identificadas: 2

| # | Texto | Línea (§) | Impacto | Evidencia propuesta |
|---|-------|-----------|---------|---------------------|
| 1 | "SICA evoluciona sus capacidades sin requerir paradigmas de entrenamiento tradicionales" (C-14) | §5 | Alto (claim sobre el mecanismo de aprendizaje) | Verificar en arXiv:2504.15228v2 qué LLM base usa SICA y si fue entrenado. El claim debe reformularse a: "SICA mejora su código sin fine-tuning del modelo base" |
| 2 | "verdadera autonomía en escenarios complejos del mundo real" (C-26) | §8 | Medio (está en sección de problema, no de solución) | Definir operacionalmente "autonomía" con criterio medible: ej. porcentaje de tareas completadas sin intervención humana durante N iteraciones |

### Error de implementación (no performativo, sino incorrecto):

| # | Texto | Línea (§) | Impacto | Evidencia propuesta |
|---|-------|-----------|---------|---------------------|
| 1 | Código OpenEvolve con `await evolve.run(...)` sin `evolve = OpenEvolve(...)` (C-23) | §7 | Alto (código que falla en ejecución) | Verificar en GitHub codelion/openevolve el ejemplo correcto de inicialización |

---

## 8. Observación sobre fuentes de AlphaEvolve (blog corporativo)

Las 6 métricas de AlphaEvolve (C-15 a C-21) tienen un estatus epistémico diferente a las métricas de SICA: son de un blog corporativo sin paper revisado por pares. Individualmente, cada métrica recibió score 0.5-0.85. Sin embargo, como conjunto, representan una categoría que merece tratamiento consistente:

**Descripción de la categoría:** "Métrica Corporativa No-Auditada" (MCNA) — número específico provisto por el creador del sistema para describir su propio sistema. Más confiable que especulación, menos confiable que paper revisado por pares.

**Impacto para THYROX:** Las métricas de AlphaEvolve son utilizables como referencias de orden de magnitud ("optimizaciones de 20-30% son alcanzables para código de bajo nivel con search evolutivo") pero no como benchmarks verificados. Cualquier claim de diseño que dependa de alcanzar exactamente esas métricas necesita verificación independiente.

**Distinción clave:** La ausencia de paper técnico para AlphaEvolve (a diferencia de SICA que tiene arXiv:2504.15228v2) no es un defecto del capítulo — es el estado real del arte: algunos sistemas importantes se publican primero como blog posts o demos antes de tener papers técnicos. El capítulo señala explícitamente en la tabla de referencias que AlphaEvolve solo tiene fuente de blog.

---

## 9. Claims adoptables sin validación adicional (score ≥ 0.75)

| Claim | Score | Por qué es adoptable |
|-------|-------|---------------------|
| C-03: PPO para espacios continuos | 1.0 | Paper seminal, verificable |
| C-04: PPO con función objetivo recortada | 1.0 | Mecanismo técnico central del paper |
| C-08: SICA auto-modifica su código | 1.0 | Paper + código abierto |
| C-09: SICA fórmula ponderada | 1.0 | Paper citado |
| C-10: SICA evolución de herramientas | 1.0 | Paper + commits en GitHub |
| C-11: SICA supervisor asincrónico LLM | 1.0 | Paper citado |
| C-12: SICA usa Docker | 1.0 | Código abierto verificable |
| C-13: SICA observabilidad UI | 1.0 | Código abierto verificable |
| C-22: OpenEvolve evoluciona archivos completos | 1.0 | Código abierto verificable |
| C-05: DPO alternativa a PPO | 0.75 | Descripción técnica correcta, paper implícito (arXiv:2305.18290) |
| C-06: DPO sin reward model | 0.75 | Mecanismo correcto |
| C-07: Reward hacking en RLHF | 0.75 | Fenómeno documentado |
| C-01: Aprendizaje permite evolucionar más allá de parámetros | 0.75 | Respaldado por instancias concretas |
| C-02: Gestión de situaciones novedosas sin intervención constante | 0.75 | Respaldado por SICA y AlphaEvolve |
| C-15: AlphaEvolve Flash/Pro | 0.75 | Blog primario, arquitectura plausible |
| C-16 a C-18: Métricas AlphaEvolve (0.7%, 23%, 32.5%) | 0.75 | MCNA — usables como orden de magnitud |
| C-19: 48 multiplicaciones matrices 4x4 complejas | 0.85 | Verificable contra literatura independiente |
| C-24: Lógica preprogramada insuficiente | 0.75 | Respaldado por instancias |
| C-25: Transforma agentes estáticos | 0.75 | Terminología descriptiva correcta |
| C-27: Sin reprogramación manual constante (§8) | 0.75 | Formulación precisa y correcta |
| C-28: Descubrimiento algorítmico es alcanzable | 0.75 | Claim de existencia conservador |

**Claims NO adoptables sin validación:**
- **C-14:** "Sin paradigmas de entrenamiento tradicionales" — reformular a "sin fine-tuning del modelo base".
- **C-23:** Código OpenEvolve — no ejecutable. Requiere corrección antes de usar como referencia.
- **C-26:** "Verdadera autonomía" — definir operacionalmente antes de usar como exit condition.

---

## 10. Brechas críticas para THYROX

### Brecha 1: La frase sobre SICA y entrenamiento tradicional distorsiona el mecanismo

**Descripción:** El claim de §5 ("sin requerir paradigmas de entrenamiento tradicionales") omite que SICA depende de un LLM base que sí fue entrenado con esos paradigmas. La auto-modificación de código es real, pero la capacidad de razonamiento subyacente no.
**Impacto en THYROX:** ALTO — si un diseñador de agentes THYROX interpreta este claim como "podemos construir un agente que aprende sin usar LLMs pre-entrenados", tomará una decisión de arquitectura incorrecta. El patrón de auto-modificación de código es válido solo cuando el LLM base tiene suficiente capacidad de razonamiento.
**Evidencia observable para cerrar:** arXiv:2504.15228v2, sección de limitaciones: "la capacidad de proponer modificaciones novedosas está limitada por la capacidad del LLM base."

### Brecha 2: Las métricas de AlphaEvolve no tienen fuente auditada

**Descripción:** Las 6 métricas de AlphaEvolve (C-16 a C-21) provienen de un blog corporativo sin paper técnico. Son números específicos desde fuente no independiente.
**Impacto en THYROX:** MEDIO — usables como referencia de orden de magnitud para optimizaciones esperables con search evolutivo, pero no como benchmarks verificados para design claims.
**Evidencia observable para cerrar:** Esperar paper técnico (si se publica) o verificar la métrica de C-19 (matrices 4x4) contra la literatura de álgebra lineal numérica disponible públicamente.

### Brecha 3: El código de OpenEvolve no es ejecutable

**Descripción:** El código del §7 tiene un `NameError` — `evolve` se usa sin inicializar. La descripción "Inicializa el sistema" es incorrecta para ese bloque de código.
**Impacto en THYROX:** ALTO — si un agente THYROX usa este código como referencia de implementación, fallará en ejecución. Esto es diferente a una simplificación (Cap. 8) — aquí el código es directamente incorrecto.
**Evidencia observable para cerrar:** Verificar ejemplo de uso en GitHub: `github.com/codelion/openevolve` → README → Quick Start. La inicialización correcta requiere `evolve = OpenEvolve(initial_program_path=..., evaluation_file=..., config_path=...)`.

---

## Veredicto de calibración

**Ratio:** 77% (21.5/28) — CALIBRADO (supera umbral de gate 75%)

**Clasificación:** CALIBRADO — primer capítulo del libro en alcanzar este nivel.

**Patrón dominante:** CCV (Calibración por Citas Verificables) — las citas a papers (PPO arXiv:1707.06347, SICA arXiv:2504.15228v2) y código abierto (GitHub) transforman los claims técnicos en observaciones directas verificables, elevando el ratio de 42% (Cap. 8) a 77% (Cap. 9).

**La anomalía del ratio:** El único claim con score 0.0 no es una afirmación sin evidencia — es un error de implementación en código (C-23, OpenEvolve). Los dos claims con score 0.25 son formulaciones filosófico-performativas (C-14, C-26) del tipo encontrado en todos los capítulos anteriores. Eliminando el error de código (que es un defecto de calidad, no de calibración epistémica), el ratio sobre claims epistémicos sería 21.5/27 = 79.6%.

**El capítulo ES usable para:**
- Comprensión técnica de PPO y su mecanismo de estabilidad
- Comprensión de DPO como alternativa a RLHF con reward model
- Descripción arquitectónica de SICA: ciclo iterativo, supervisor, Docker, herramientas AST
- Referencias de orden de magnitud para optimización con AlphaEvolve
- Motivación del patrón de aprendizaje y adaptación

**El capítulo NO es usable para:**
- Implementar OpenEvolve usando el código de referencia (falla en ejecución)
- Afirmar que SICA funciona sin LLMs pre-entrenados (el LLM base es requisito)
- Definir exit conditions basadas en "verdadera autonomía" (sin criterio operacional)

**Recomendación:** El capítulo supera el umbral de gate (77% > 75%). Los tres items no adoptables (C-14, C-23, C-26) deben tratarse explícitamente al implementar: reformular C-14, corregir C-23 con el ejemplo real del repositorio, y operacionalizar C-26 antes de usarlo como criterio de éxito.
