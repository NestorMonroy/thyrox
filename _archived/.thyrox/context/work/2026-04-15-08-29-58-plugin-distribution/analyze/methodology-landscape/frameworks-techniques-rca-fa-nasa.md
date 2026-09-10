---
created_at: 2026-04-15 10:32:00
project: THYROX
topic: Sub-análisis detallado — Frameworks/Técnicas (RCA, Framework Analysis, NASA Logical Decomposition)
author: NestorMonroy
status: Borrador
---

# Sub-análisis: Técnicas — RCA, Framework Analysis, NASA Logical Decomposition

## Por qué son TÉCNICAS y no MARCOS METODOLÓGICOS

La distinción entre MARCOS y TÉCNICAS es fundamental para el Skills Registry de THYROX:

| Tipo | Definición | Puede iniciar proyecto solo | Genera skills independientes |
|------|------------|----------------------------|------------------------------|
| MARCO METODOLÓGICO | Proceso end-to-end completo que guía desde la identificación del problema hasta la evaluación de resultados | Sí | Sí (`/thyrox:nombre`) |
| FRAMEWORK/TÉCNICA | Herramienta de análisis o descomposición que asume trabajo previo hecho, o es usada dentro de marcos más grandes | No | No (sub-herramienta) |

### Tabla Resumen — Las 3 Técnicas

| # | Técnica | Dominio | Tipo | Flexibilidad | Por qué es TÉCNICA |
|---|---------|---------|------|--------------|-------------------|
| T1 | Root Cause Analysis (RCA) | Resolución de Problemas | Iterativo | MEDIA | Es herramienta dentro de otros marcos — no proceso end-to-end |
| T2 | Framework Analysis | Investigación Cualitativa | Secuencial flexible | MEDIA-ALTA | Metodología para analizar datos ya recopilados — no incluye recopilación |
| T3 | NASA Logical Decomposition | Ingeniería de Sistemas | Secuencial/Jerárquico | BAJA | Asume que requisitos de alto nivel ya están definidos |

### Implicación para el Skills Registry

Las TÉCNICAS no generan skills independientes `/thyrox:nombre`. Se implementan como:

1. **Sub-herramientas documentadas** dentro de skills existentes (ej: RCA como herramienta dentro de `ps-analyze`, `dmaic-analyze`)
2. **Referencias en assets/** de los skills de marco que las utilizan
3. **Templates o helpers** dentro de `assets/` de skills existentes (ej: plantilla de Fishbone en `dmaic-analyze/assets/`)
4. **Sección de técnicas** en el SKILL.md del marco que las consume

---

## Técnica 1: Root Cause Analysis (RCA)

**Tipo:** FRAMEWORK/TÉCNICA — Resolución de Problemas
**Subtipo:** Herramienta de análisis de causa raíz
**Flexibilidad:** MEDIA

**Primer paso:** Define Problem — articular claramente el problema

### Por qué es TÉCNICA y no MARCO

RCA no es un proceso de inicio a fin para gestionar un problema o proyecto. Es una herramienta específica que se activa cuando un marco más grande llega a la fase de análisis de causas. Ninguna organización "inicia un proyecto RCA" como metodología completa — se usa RCA **dentro** de otros proyectos.

**Evidencia:** Problem Solving 8-Step (Toyota) usa RCA en su paso 4. DMAIC usa RCA en su fase Analyze. Strategic Management puede usar RCA en su fase Evaluation. RCA es el martillo, no el plan de construcción.

### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Define Problem | Articular claramente el problema; precisar qué está ocurriendo, cuándo, dónde y con qué frecuencia; separar síntomas del problema real |
| 2 | Collect Data | Recopilar información relevante sobre el problema; datos históricos, observaciones, reportes, testimonios de quienes están cercanos al problema |
| 3 | Identify Possible Causal Factors | Analizar los datos recopilados para encontrar factores que contribuyen al problema; generar hipótesis causales sin descartar ninguna prematuramente |
| 4 | Identify Root Cause | Usar técnicas específicas para llegar a la causa subyacente real (no síntoma); validar que eliminar esta causa resuelve el problema |
| 5 | Recommend & Implement Solutions | Desarrollar acciones correctivas dirigidas a la causa raíz; implementar y verificar que el problema no recurre |

### Técnicas Disponibles dentro de RCA

| Técnica | Descripción | Cuándo usar |
|---------|-------------|-------------|
| 5 Whys | Preguntar "¿por qué?" cinco veces consecutivas para llegar a causa raíz | Problemas simples-medios con causa lineal |
| Fishbone / Ishikawa | Diagrama de espina de pescado que categoriza causas posibles (6M: Man, Machine, Method, Material, Measurement, Mother Nature) | Problemas con múltiples causas potenciales |
| Fault Tree Analysis (FTA) | Árbol lógico top-down de fallas que lleva de síntoma a causa | Sistemas técnicos complejos, análisis de seguridad |
| RCA Pro | Metodología estructurada de análisis con árbol de causas y evidencias | Investigaciones formales, incidentes críticos |

### Dónde Aparece en Marcos THYROX

| Marco receptor | Fase donde se usa RCA | Skill THYROX receptor |
|---------------|----------------------|----------------------|
| Problem Solving 8-step | Paso 4: Analyze Root Cause | `ps-analyze` |
| DMAIC / Six Sigma | Fase 3: Analyze | `dmaic-analyze` |
| Lean Six Sigma | Fase 3: Analyze | `lss-analyze` |
| Business Process Analysis | Fase 3: Analyze | `bpa-analyze` |
| Strategic Management | Fase 4: Evaluation and Control | `sm-evaluate` |

### Características Clave

- **Previene problemas recurrentes:** atacar la causa raíz evita que el mismo problema reaparezca
- **Iterativo si causas no claras:** si la causa identificada no resuelve el problema, se regresa a paso 3
- **Aplicación amplia:** manufacturing, healthcare, IT, procesos de negocio, investigación de incidentes
- **Requiere contexto previo:** RCA siempre se ejecuta con un problema ya definido — no es el punto de partida

### Verificación del Patrón Universal

Comienza con **Define Problem** = articular claramente el problema. ✓ (Aunque el problema fue identificado por el marco padre, RCA lo re-clarifica antes de buscar causas.)

### Implementación en THYROX

**No genera skills propios.** Se implementa como:
- Sub-herramienta documentada en los SKILL.md de `ps-analyze`, `dmaic-analyze`, `lss-analyze`, `bpa-analyze`
- Templates de Fishbone y 5 Whys en `assets/` de los skills que la utilizan
- Referencia en `references/rca-techniques.md` dentro del skill `thyrox` principal

---

## Técnica 2: Framework Analysis (Investigación Cualitativa)

**Tipo:** FRAMEWORK/TÉCNICA — Investigación Cualitativa
**Subtipo:** Metodología de análisis temático de datos cualitativos
**Flexibilidad:** MEDIA-ALTA

**Primer paso:** Familiarization — familiarizarse con los datos (IDENTIFICACIÓN DE CONTEXTO)

### Por qué es TÉCNICA y no MARCO

Framework Analysis es una metodología para analizar **datos que ya fueron recopilados**. Asume que existe una investigación previa (entrevistas realizadas, transcripts existentes, field notes tomados). No incluye los pasos de diseño de investigación, definición de preguntas de investigación, ni recopilación de datos. Es la fase de análisis de una investigación más amplia, no la investigación completa.

### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Familiarization | Leer y releer transcripts, field notes o datos múltiples veces; desarrollar familiaridad profunda con el material; tomar notas iniciales sobre temas emergentes |
| 2 | Indexing | Dividir y codificar el material con etiquetas temáticas; asignar códigos a segmentos de datos; construir índice temático del material |
| 3 | Charting | Rearreglar los datos codificados en orden discernible; crear matrices temáticas; sintetizar datos por tema en lugar de por participante/fuente |
| 4 | Mapping & Interpretation | Mapear relaciones entre temas; identificar patrones, contradicciones y conexiones; comenzar a interpretar el significado de los temas |
| 5 | Analysis | Analizar e interpretar los datos mapeados; generar conclusiones; verificar hallazgos contra datos originales; redactar análisis final |

### Tipos de Datos que Procesa

| Tipo de dato | Ejemplo |
|-------------|---------|
| Transcripts | Transcripciones de entrevistas, focus groups |
| Field notes | Notas de observación etnográfica o de campo |
| Recordings | Grabaciones de audio/video (antes de transcribir) |
| Documentos | Políticas, reportes, comunicaciones escritas |
| Datos secundarios | Resultados de encuestas cualitativas previas |

### Aplicaciones

| Dominio | Uso típico |
|---------|-----------|
| Healthcare | Análisis de experiencias de pacientes, evaluación de políticas de salud |
| Education | Investigación sobre experiencias de aprendizaje, evaluación de programas |
| Policy research | Análisis de impacto de políticas públicas |
| Marketing | Análisis de entrevistas a consumidores, análisis de focus groups |
| Investigación organizacional | Cultura organizacional, experiencia de empleados |

### Características Clave

- **Flexible:** los temas pueden emerger durante el análisis, no necesariamente predefinidos
- **Iterativo:** el indexing puede revisarse múltiples veces antes de charting
- **Scalable:** funciona con 5 entrevistas o 500 transcripts con apoyo de software (NVivo, Atlas.ti)
- **Preserva contexto:** el charting mantiene la fuente de cada dato, evitando descontextualización
- **Explícitamente cualitativo:** no aplica a datos cuantitativos

### Verificación del Patrón Universal

Comienza con **Familiarization** = identificación del contexto a través de inmersión profunda en los datos existentes. ✓

### Implementación en THYROX

**No genera skills propios.** Se implementa como:
- Sub-herramienta dentro de las fases de análisis de skills de Consulting (cp-diagnosis, ct-analyze) y Business Analysis (ba-analysis)
- Referencia en `references/qualitative-analysis-techniques.md` del skill `thyrox`
- Potencialmente: template de matriz temática en `assets/` del skill ba-analysis

---

## Técnica 3: NASA Logical Decomposition

**Tipo:** TÉCNICA DE INGENIERÍA — Ingeniería de Sistemas
**Subtipo:** Descomposición jerárquica de requisitos de sistemas complejos
**Flexibilidad:** BAJA

**Primer paso:** Establish System Architecture Model — definir arquitectura del sistema

### Por qué es TÉCNICA y no MARCO (Reclasificación V3.0)

Esta reclasificación es una corrección respecto a versiones anteriores del análisis donde NASA Logical Decomposition aparecía como "Marco Metodológico".

**NASA Logical Decomposition NO es un marco completo porque:**

1. **No incluye identificación de requisitos:** Asume que los requisitos de alto nivel ya están definidos por un proceso previo (ej: stakeholder analysis, requirements elicitation)
2. **No incluye problem framing:** No hay un paso de "¿qué problema estamos resolviendo?"
3. **No es end-to-end:** Empieza en el punto donde ya se sabe el "qué" y se necesita determinar el "cómo"
4. **Es una técnica de descomposición:** Su función específica es tomar requisitos ya definidos y descomponerlos jerárquicamente hasta niveles implementables

**Comparación con marcos reales:**

| Aspecto | Marco real (ej: SDLC) | NASA Logical Decomposition |
|---------|----------------------|---------------------------|
| Punto de partida | "Necesitamos construir algo" (problema abierto) | "Ya tenemos requisitos de alto nivel" (punto medio) |
| Incluye identificación | Sí (Planning) | No |
| Incluye stakeholder analysis | Sí (Requirements Analysis) | No |
| Puede iniciar proyecto solo | Sí | No |

### Contexto Crítico

NASA Logical Decomposition se usa dentro de proyectos de **ingeniería de sistemas complejos** (aerospace, defensa, sistemas críticos) donde los requisitos de misión de alto nivel ya fueron definidos por fases previas del proyecto (Mission Definition, Requirements Engineering, etc.). Es el paso de "cómo descomponer lo que ya definimos" no "cómo definir qué construir".

### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Establish System Architecture Model | Definir la arquitectura conceptual del sistema; identificar los elementos principales y sus relaciones lógicas; establecer el modelo de referencia |
| 2 | Functional Analysis | Descomponer las funciones del sistema; identificar qué debe hacer cada elemento arquitectural; crear árbol de funciones |
| 3 | Decompose Requirements | Descomponer requisitos de alto nivel hacia funciones de niveles inferiores; asignar requisitos a elementos de la arquitectura; crear trazabilidad requisito-función |
| 4 | Define Interfaces | Definir interfaces y relaciones entre elementos del sistema; especificar protocolos de comunicación, flujos de datos, restricciones de integración |
| 5 | Design Solution Definition | Crear la definición de solución física y lógica; transformar requisitos funcionales en especificaciones de diseño implementables |

### Características Clave

- **Altamente sistemático:** cada paso tiene entradas y salidas formalmente definidas
- **Enfoque jerárquico:** la descomposición es top-down, de nivel de misión a nivel de componente
- **Sistemas de alto riesgo:** diseñado para proyectos donde el fallo tiene consecuencias catastróficas
- **Trazabilidad completa:** cada decisión de diseño se traza hasta un requisito, que se traza hasta un objetivo de misión
- **Aplicación:** aerospace, defensa, sistemas de control críticos, infraestructura nacional
- **Prerrequisito no incluido:** los requisitos de misión de alto nivel deben existir antes de activar esta técnica

### Verificación del Patrón Universal

Comienza con **Establish System Architecture Model** = definición del contexto de la arquitectura. ✓ (Con la nota de que el verdadero primer paso — identificar qué sistema se necesita — ocurre en un proceso padre previo.)

### Implementación en THYROX

**No genera skills propios.** Se implementa como:
- Sub-herramienta dentro del skill `structure` o `decompose` del flujo base de THYROX, con una variante para proyectos de ingeniería de sistemas
- Referencia en `references/systems-engineering-techniques.md` del skill `thyrox`
- Potencialmente: template de árbol de descomposición en `assets/` del skill `decompose`

---

## Análisis Comparativo: Las 3 Técnicas

### Por qué estas 3 técnicas están en la lista de 14 frameworks

A pesar de ser TÉCNICAS y no MARCOS, estas 3 aparecen en el inventario de 14 frameworks porque:

1. **Relevancia metodológica alta:** RCA, Framework Analysis y NASA Logical Decomposition son metodologías reconocidas en sus dominios con suficiente estructura para documentar
2. **Potencial de uso en THYROX:** los proyectos asistidos por THYROX pueden requerir estas técnicas
3. **Necesidad de documentación explícita:** sin documentar su naturaleza de TÉCNICA, podrían confundirse con marcos y generar skills innecesarios o incorrectos

### Impacto en la Estructura del Skills Registry

| Técnica | Skills independientes generados | Implementación |
|---------|--------------------------------|----------------|
| RCA | 0 | Sub-herramienta en ps-analyze, dmaic-analyze, lss-analyze, bpa-analyze |
| Framework Analysis | 0 | Sub-herramienta en cp-diagnosis, ct-analyze, ba-analysis |
| NASA Logical Decomposition | 0 | Sub-herramienta en structure/decompose (variante sistemas complejos) |
| **TOTAL TÉCNICAS** | **0 skills independientes** | **Integradas en skills de marcos existentes** |

### Comparación: MARCOS vs TÉCNICAS en el inventario de 14

| Clasificación | Cantidad | Skills generados | Coordinators |
|--------------|----------|-----------------|-------------|
| MARCOS METODOLÓGICOS | 12 (11 confirmados + 1 vacante) | ~56 nuevos | ~10 |
| FRAMEWORKS/TÉCNICAS | 3 | 0 | 0 |
| **TOTAL** | **14 + 1 vacante** | **~56 skills nuevos** | **~10 coordinators** |

---

## Implicaciones para el Skills Registry de THYROX

### Conteo Final — Técnicas

| Técnica | Skills nuevos | Coordinator | Dónde se implementa |
|---------|---------------|-------------|---------------------|
| RCA | 0 | No | Dentro de phase-skills de análisis de marcos existentes |
| Framework Analysis | 0 | No | Dentro de phase-skills de elicitation/diagnosis |
| NASA Logical Decomposition | 0 | No | Dentro del skill `decompose` como variante systems-engineering |
| **TOTAL TÉCNICAS** | **0** | **0** | **Assets y referencias de skills existentes** |

### Estimado de Tokens de Contexto

Las técnicas no agregan skills nuevos, pero sí agregan documentación a skills existentes:

| Componente | Impacto en tokens |
|------------|------------------|
| Sección "técnicas disponibles" en SKILL.md de marcos receptores | ~500 tokens adicionales por marco |
| Templates en assets/ (Fishbone, 5 Whys, etc.) | Tokens de assets, no cargados automáticamente |
| References de técnicas en skill thyrox | On-demand, no en contexto base |
| **Impacto neto en contexto activo** | **Mínimo (+~2,000 tokens distribuidos)** |

### Totales Globales del Inventario (Cat 1-6 + Técnicas)

| Componente | Valor |
|------------|-------|
| MARCOS documentados | 11 (+ 1 vacante) |
| TÉCNICAS documentadas | 3 |
| **Total items en inventario** | **14 + 1 vacante** |
| Skills nuevos propuestos (MARCOS) | ~56 |
| Skills existentes (SDLC base THYROX) | 7 |
| Coordinators propuestos | ~10 |
| Skills generados por TÉCNICAS | 0 |
| **Total skills en registry post-FASE 39** | **~73 skills** |
| Tokens estimados en contexto activo | ~150,000+ (con todos los coordinators activos) |

**Nota sobre tokens:** El número de ~150,000 tokens si todos los coordinators estuvieran activos simultáneamente excede la ventana práctica. La arquitectura de distribución via plugin (objetivo de FASE 39) resuelve esto: cada framework se carga on-demand, no todos simultáneamente.
