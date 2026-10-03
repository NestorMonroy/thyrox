# Especialista matemático local - 1.0.0

Redactó instrucciones y recomendó un modelo matemático

Diseñaste la integración matemática

Se buscaron 2 sitios web

Sí. Yo no reemplazaría `qwen3-4b` como worker general. Añadiría un **especialista matemático local** y haría que Thyrox lo seleccione cuando la tarea requiera razonamiento matemático.

Para vuestra máquina, empezaría con **`qwen2-math:1.5b-instruct`**: está disponible oficialmente en Ollama; la variante 1.5B ocupa alrededor de 935 MB y está especializada en matemáticas. [Ollama](https://ollama.com/library/qwen2-math?utm_source=chatgpt.com) Como segunda opción probaría **DeepScaler 1.5B**, también disponible en Ollama y específicamente afinado para evaluaciones matemáticas. [Ollama](https://ollama.com/library/deepscaler?utm_source=chatgpt.com) `Mathstral:7b` es más grande, 4.1 GB y 32K de contexto; lo dejaría para después de que disk/RAM admission diga que cabe. [Ollama](https://registry.ollama.com/library/mathstral?utm_source=chatgpt.com)

Le diría esto:

Quiero añadir a Thyrox un **modelo matemático local especializado**, sin sustituir `qwen3-4b` como worker general.

El objetivo es que Thyrox pueda seleccionar un especialista cuando una tarea o subtarea requiera matemáticas:

```
TASK
→ Search Existing
→ requirements/capabilities
→ model selection
    ├─ coding/tools/general → qwen3-4b
    └─ mathematical reasoning → math specialist
→ managed Ollama
→ qualification
→ result
```

No hardcodees el modelo directamente en el worker.

La selección debe pasar por las autoridades actuales:

`catalog`  
→ `artifact identity`  
→ `ensure/materialization`  
→ `qualification`  
→ `recommendExecution/model selection`  
→ `ExecutionGrant`  
→ `managed Ollama`.

## 1. Primer candidato

Empieza midiendo:

`qwen2-math:1.5b-instruct`

de Ollama.

Es el primer candidato porque:

- es especializado en matemáticas;
    
- es pequeño;
    
- es razonable para esta máquina sin CUDA;
    
- no necesitamos materializar primero un modelo de 7B para demostrar la arquitectura.
    

No hagas simplemente:

`ollama pull qwen2-math:1.5b-instruct`

fuera de Thyrox.

Haz Search Existing para determinar cómo declararlo mediante:

`local-models catalog`  
→ artifact/publication  
→ `local-models-ensure`  
→ managed Ollama.

Si el catálogo necesita extensión, EXTEND la autoridad existente.

## 2. Segundo candidato

Si el primero no alcanza el nivel requerido, mide después:

`deepscaler`

1.5B.

No sustituyas el primer modelo por opinión o benchmarks externos: compara ambos mediante una suite local.

Un tercer candidato, sólo si resource admission demuestra que cabe, puede ser:

`mathstral:7b`.

No descargues Mathstral mientras disk admission diga que no existe margen suficiente.

## 3. No conviertas el modelo matemático en agente general

Un modelo matemático no tiene que poseer:

- Git;
    
- Search Existing;
    
- worktrees;
    
- integración;
    
- lifecycle;
    
- edición general del repositorio.
    

`qwen3-4b` puede seguir siendo el worker/orquestador para tareas de código.

El especialista matemático debe resolver una capacidad concreta.

Conceptualmente:

```
qwen3-4b worker
        |
        | detecta/subdivide problema
        |
        +→ coding / tools
        |
        `→ math-reasoning request
                 |
                 v
         qwen2-math:1.5b-instruct
                 |
                 v
          resultado matemático
                 |
                 v
         vuelve al worker
```

No quiero crear subagentes Claude para esto.

Ambos son modelos locales gestionados por Thyrox.

## 4. Busca primero si ya existe la capacidad

Antes de implementar una nueva clase, Search Existing por:

- math;
    
- mathematics;
    
- mathematical;
    
- STEM;
    
- reasoning;
    
- numeric;
    
- algebra;
    
- probability;
    
- statistics;
    
- calculus;
    
- task capabilities;
    
- model capabilities;
    
- qualification suites.
    

Clasifica:

`REUSE | EXTEND | MISSING`.

No inventes automáticamente `taskClass=matematica` si la arquitectura actual permite expresar esto como capability.

Prefiero:

```
requirements.capabilities = [mathematical-reasoning]
```

si existe o puede extenderse la autoridad de capabilities.

Sólo introduce una nueva clase de tarea si Search Existing demuestra que ésa es la abstracción canónica.

## 5. Qualification matemática

No declares el modelo apto sólo porque Ollama lo llama Math.

Construye o reutiliza una suite de qualification independiente.

Quiero primero una suite pequeña con categorías como:

1. aritmética exacta;
    
2. álgebra;
    
3. ecuaciones;
    
4. probabilidad;
    
5. estadística;
    
6. cálculo básico;
    
7. razonamiento de varios pasos;
    
8. lectura correcta de notación matemática.
    

Guarda:

```
model
revision
suite
capability
casesPassed
casesTotal
contextTokens
measurementCondition
tokensPerSecond
```

No uses esos mismos casos como la prueba final.

Qualification decide elegibilidad; una tarea independiente mide uso real.

## 6. Empieza con contexto pequeño

`qwen2-math:1.5b-instruct` no debe recibir documentos completos.

Haz:

```
source/document
→ retrieval/chunking
→ problema matemático relevante
→ math specialist
```

No:

```
PDF completo
→ modelo matemático pequeño
```

Para documentos como `learning.pdf`, el modelo debería recibir la sección y el ejercicio pertinentes, junto con las definiciones necesarias.

## 7. Primera prueba real

Después de qualification, dale un problema matemático que NO forme parte de la suite.

Quiero demostrar:

```
task requirement = mathematical-reasoning
        ↓
model selector
        ↓
qwen2-math:1.5b-instruct
        ↓
managed Ollama
        ↓
correct answer
```

sin:

- Claude;
    
- API remota;
    
- elección manual del modelo durante la ejecución.
    

## 8. Después integra routing por capacidad

Una vez cualificado:

```
requirements
    mathematical-reasoning=true
            ↓
eligible models
            ↓
math-qualified locals
            ↓
ranking
            ↓
selected math model
```

Si no hay especialista matemático elegible:

- no inventes que `qwen3-4b` tiene esa capacidad;
    
- comprueba si `qwen3-4b` tiene qualification matemática propia;
    
- si tampoco la tiene, la tarea queda `UNSCHEDULABLE` para esa capability.
    

No uses provider fallback silencioso.

## 9. Relación con la autoimplementación

No detengas la autoimplementación general para hacer esto.

El flujo queda:

```
qwen3-4b
→ worker general / código / tools

qwen2-math:1.5b-instruct
→ mathematical reasoning specialist

nomic
→ embeddings
```

Son roles distintos dentro del mismo control plane.

Thyrox, no el prompt, debe decidir cuál usar según requirements y qualifications.

Continúa con Search Existing para catalogar y cualificar el primer especialista matemático.

### Por qué elegiría ese primero

Con tus restricciones actuales, la secuencia que probaría es:

1. **`qwen2-math:1.5b-instruct`** — primera opción: especializado y pequeño. [Ollama](https://ollama.com/library/qwen2-math%3A1.5b-instruct?utm_source=chatgpt.com)
2. **`deepscaler` 1.5B** — comparación matemática pequeña. [Ollama](https://ollama.com/library/deepscaler?utm_source=chatgpt.com)
3. **`qwen3-4b`** — también debería cualificarse en matemáticas, porque la familia Qwen3 declara mejoras importantes en razonamiento matemático y ya la tienes materializada. [Ollama](https://ollama.com/library/qwen3?utm_source=chatgpt.com)
4. **`mathstral:7b`** — candidato más grande cuando haya margen de recursos; Ollama lo publica como un modelo específicamente diseñado para razonamiento matemático y científico. [Ollama](https://registry.ollama.com/library/mathstral?utm_source=chatgpt.com)

La idea importante es **no decirle simplemente “usa qwen2-math”**. Dile que convierta _mathematical reasoning_ en una capacidad que Thyrox pueda **medir, cualificar y seleccionar automáticamente**. Así, cuando luego trabajes con `learning.pdf`, Thyrox puede mandar la demostración o cálculo al especialista matemático y mantener a `qwen3-4b` como worker que controla el trabajo completo.



# Modelos que encajan mejor con lo que quieres construir en Thyrox 



Buscaste modelos similares

Comparé alternativas

Afinaste la selección

Ajusté el criterio y comparé candidatos locales

Se buscaron 7 sitios web

Sí. Busqué en Hugging Face y hay modelos que encajan **mejor con lo que quieres construir en Thyrox** que limitarse a `qwen2-math`.

La distinción útil es entre un **especialista matemático puro** y un **especialista de razonamiento que también sabe matemáticas, código y ciencia**.

### Los candidatos que probaría

|Modelo|Rol para Thyrox|Tamaño práctico|Ollama/GGUF|Valor|
|---|---|---|---|---|
|**OpenReasoning-Nemotron-1.5B**|razonamiento + matemáticas + código + ciencia|Q4_K_M ≈ **986 MB**|Sí|**Mi primera prueba**|
|**OpenMath-Nemotron-1.5B**|especialista matemático puro|Q4_K_M ≈ **986 MB**|Sí|**Mejor candidato matemático**|
|**DeepScaleR-1.5B-Preview**|matemáticas difíciles / razonamiento largo|Q4_K_M ≈ **1.12 GB**|Sí|Muy interesante|
|**Qwen2.5-Math-1.5B-Instruct**|baseline matemático CoT/TIR|BF16 ≈ 3.1 GB; hay quantizations|Sí vía GGUF|Baseline sólido|
|**DeepSeek-R1-Distill-Qwen-1.5B**|razonamiento general/matemático|1.5B|cuantizaciones disponibles|Baseline|
|**AceMath-1.5B-Instruct**|matemáticas puras|GGUF ~1 GB–1.3 GB|Sí|Bueno, pero licencia NC|

## 1. El que más me interesa para Thyrox: OpenReasoning-Nemotron-1.5B

Este es distinto de OpenMath-Nemotron.

NVIDIA lo describe como un modelo de 1.5B post-entrenado específicamente para **math, code y science reasoning**, no sólo matemáticas. En sus resultados publicados, el 1.5B marca, entre otros, 55.5 en AIME24, 45.6 en AIME25 y 28.6 en LiveCodeBench. [Hugging Face](https://huggingface.co/nvidia/OpenReasoning-Nemotron-1.5B?utm_source=chatgpt.com)

Eso lo hace particularmente interesante para vuestra arquitectura:

```
qwen3-4b
    → worker general / tools / repo

OpenReasoning-Nemotron-1.5B
    → reasoning specialist
       ├─ mathematics
       ├─ algorithms
       ├─ science
       └─ some coding reasoning
```

Y existe GGUF `Q4_K_M` de unos **986 MB** que Hugging Face documenta directamente para uso con Ollama:

````
ollama run hf.co/lmstudio-community/OpenReasoning-Nemotron-1.5B-GGUF:Q4_K_M
``` :chatgpt-content-reference{index="1"}


Para una máquina sin CUDA y con espacio limitado, esto es muy atractivo.

[OpenReasoning-Nemotron-1.5B en Hugging Face](https://huggingface.co/nvidia/OpenReasoning-Nemotron-1.5B?utm_source=chatgpt.com)

---

## 2. Para matemáticas puras: OpenMath-Nemotron-1.5B

Este probablemente sea el **especialista matemático que primero compararía**.

Es un fine-tune de `Qwen2.5-Math-1.5B` entrenado sobre OpenMathReasoning. NVIDIA publica para el modelo 1.5B resultados de 61.6% en AIME24 y 49.5% en AIME25 usando CoT, bastante por encima del `DeepSeek-R1-Distill-Qwen-1.5B` que ellos comparan. También contempla Tool-Integrated Reasoning. :chatgpt-content-reference{index="3"}

Lo importante para vosotros: hay GGUF muy pequeños.

`Q4_K_M`:

```text
986 MB
````

y está recomendado como tamaño por defecto para muchos casos. También hay Q3/Q2 más pequeños, aunque yo no empezaría sacrificando calidad. [Hugging Face](https://huggingface.co/bartowski/nvidia_OpenMath-Nemotron-1.5B-GGUF?utm_source=chatgpt.com)

Además Hugging Face muestra uso directo desde Ollama:

````
ollama run hf.co/lmstudio-community/OpenMath-Nemotron-1.5B-GGUF:Q4_K_M
``` :chatgpt-content-reference{index="5"}


Para Thyrox yo lo clasificaría como:

```text
capability:
    mathematical-reasoning
````

no como worker general.

[OpenMath-Nemotron-1.5B en Hugging Face](https://huggingface.co/nvidia/OpenMath-Nemotron-1.5B?utm_source=chatgpt.com)

---

## 3. DeepScaleR-1.5B es también muy apropiado

Encontré el modelo original:

```
agentica-org/DeepScaleR-1.5B-Preview
```

Es un fine-tune mediante RL de `DeepSeek-R1-Distill-Qwen-1.5B`. Su model card reporta 43.1% Pass@1 en AIME 2024 frente a 28.8% del modelo base. [Hugging Face](https://huggingface.co/agentica-org/DeepScaleR-1.5B-Preview?utm_source=chatgpt.com)

Tiene GGUF compatible con Ollama. En Q4_K_M son aproximadamente:

```
1.117 GB
```

y esa cuantización está marcada como equilibrada/recomendada. [Hugging Face](https://huggingface.co/tensorblock/DeepScaleR-1.5B-Preview-GGUF)

También Hugging Face muestra explícitamente su ejecución mediante Ollama. [Hugging Face](https://huggingface.co/tensorblock/DeepScaleR-1.5B-Preview-GGUF?utm_source=chatgpt.com)

Éste lo usaría más para:

```
competition math
multi-step reasoning
proof-like reasoning
hard quantitative tasks
```

que como agente con herramientas.

[DeepScaleR-1.5B-Preview en Hugging Face](https://huggingface.co/agentica-org/DeepScaleR-1.5B-Preview?utm_source=chatgpt.com)

---

## 4. Qwen2.5-Math es mejor baseline que Qwen2-Math

También encontré que `Qwen2.5-Math-1.5B-Instruct` es más interesante que el Qwen2-Math original.

Qwen dice que Qwen2.5-Math amplió el modelo anterior para trabajar tanto con **Chain-of-Thought como Tool-Integrated Reasoning**, y soporta problemas matemáticos en inglés y chino. La propia ficha advierte que está pensado específicamente para matemáticas, no para tareas generales. [Hugging Face](https://huggingface.co/Qwen/Qwen2.5-Math-1.5B-Instruct?utm_source=chatgpt.com)

Así que yo usaría:

```
Qwen2.5-Math-1.5B-Instruct
```

como **baseline de control**, no necesariamente como ganador.

¿Por qué?

Porque OpenMath-Nemotron deriva precisamente de esta familia. Entonces una comparación Thyrox:

```
Qwen2.5-Math-1.5B
vs
OpenMath-Nemotron-1.5B
```

te permite medir cuánto aporta el post-training especializado.

[Qwen2.5-Math-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Math-1.5B-Instruct?utm_source=chatgpt.com)

---

## 5. AceMath-1.5B también existe

NVIDIA tiene:

```
AceMath-1.5B-Instruct
```

derivado de Qwen2.5-Math con varias fases de SFT matemático. Está destinado específicamente a resolver problemas matemáticos. [Hugging Face](https://huggingface.co/nvidia/AceMath-1.5B-Instruct?utm_source=chatgpt.com)

También hay GGUF pequeños y compatibles con llama.cpp/Ollama. [Hugging Face](https://huggingface.co/models?apps=lmstudio&other=base_model%3Aquantized%3Anvidia%2FAceMath-1.5B-Instruct&utm_source=chatgpt.com)

Pero lo pondría por debajo de los anteriores porque su licencia es `CC-BY-NC-4.0`. [Hugging Face](https://huggingface.co/nvidia/AceMath-1.5B-Instruct/tree/main?utm_source=chatgpt.com)

Para pruebas internas sirve; como modelo base de una arquitectura que luego quieras usar más ampliamente, prefiero los otros.

---

# El descubrimiento más interesante

Después de mirar estos modelos, **cambiaría ligeramente la propuesta anterior**.

No empezaría por:

```
qwen2-math:1.5b
```

Empezaría por estos tres:

```
A. OpenReasoning-Nemotron-1.5B
   math + code + science
   Q4_K_M ≈ 986 MB

B. OpenMath-Nemotron-1.5B
   pure math
   Q4_K_M ≈ 986 MB

C. DeepScaleR-1.5B
   hard mathematical reasoning
   Q4_K_M ≈ 1.117 GB
```

Y mantendría:

```
qwen3-4b
```

como generalista.

Eso te permitiría construir en Thyrox algo bastante mejor:

```
                        TASK
                          │
                          ▼
                    requirements
                          │
          ┌───────────────┼─────────────────┐
          │               │                 │
          ▼               ▼                 ▼
       coding        mathematical      reasoning/
       tools          reasoning        science/code
          │               │                 │
          ▼               ▼                 ▼
     qwen3-4b      OpenMath-Nemotron   OpenReasoning-
                        1.5B           Nemotron-1.5B
                          │                 │
                          └────────┬────────┘
                                   ▼
                             managed Ollama
```

Y DeepScaleR podría entrar como candidato adicional cuando la dificultad matemática sea mayor.

## Algo todavía mejor para vuestro caso

**OpenReasoning-Nemotron-1.5B me parece especialmente interesante porque no es solamente matemático.**

La intención de Thyrox no es construir una calculadora matemática; quieres que pueda analizar documentos como `learning.pdf`, entender matemáticas, resolver razonamiento y seguir participando en trabajo técnico.

Así que conceptualmente:

```
qwen3-4b
= general worker

OpenReasoning-Nemotron-1.5B
= reasoning specialist

OpenMath-Nemotron-1.5B
= math specialist

nomic
= embedding specialist
```

me parece una arquitectura mucho más interesante.

Y todos siguen siendo suficientemente pequeños como para que **no necesites CUDA para empezar a evaluarlos**.

### Cómo los probaría en Thyrox

No instalaría los tres de golpe. Haría:

```
1. OpenReasoning-Nemotron-1.5B Q4_K_M
        ↓
   artifact admission
        ↓
   qualification math/code/reasoning

2. OpenMath-Nemotron-1.5B Q4_K_M
        ↓
   misma math qualification

3. DeepScaleR-1.5B Q4_K_M
        ↓
   misma math qualification
```

Y después:

```
same held-out suite
        ↓
accuracy
tokens/s
RAM
context useful
reasoning length
        ↓
winner per capability
```

No elegiría basándome sólo en los benchmarks publicados.

En vuestra arquitectura, el benchmark real debe decidir:

```
model × capability → qualification
```

y el scheduler simplemente consume esa evidencia.

También encontré modelos todavía más recientes, incluyendo familias Nemotron de 2026 orientadas a matemática olímpica, pero las variantes punteras son enormes y no son relevantes para vuestra máquina actual. [Hugging Face](https://huggingface.co/nvidia/Nemotron-3-Labs-Ultra-Math-RL?utm_source=chatgpt.com)

Si quieres, el siguiente paso útil es que te prepare **el texto exacto para decirle al agente que añada OpenReasoning-Nemotron + OpenMath-Nemotron al catálogo Thyrox, los materialice como GGUF Q4_K_M y los compare contra qwen3-4b sin romper el flujo de autoimplementación**.