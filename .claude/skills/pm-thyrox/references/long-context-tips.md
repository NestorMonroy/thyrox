```yml
Tipo: Mejores Prácticas Anthropic
Categoría: Contexto Largo
Versión: 1.0
Propósito: Compilación de mejores prácticas para trabajar con documentos grandes y contextos extensos.
Objetivo: Optimizar uso de token budget en conversaciones largas.
Fecha actualización: 2026-03-25
```

# Long Context Tips - Trabajar con Documentos Grandes

## Propósito

Compilación de mejores prácticas para trabajar con documentos grandes y contextos extensos.

> Objetivo: Optimizar uso de token budget en conversaciones largas.

---

Basado en: Anthropic Long Context Best Practices
Adaptado para: THYROX
Fecha: 2026-02-01

---

## Essential Tips

Claude 4.5 puede manejar contextos muy largos (hasta 200K tokens), pero la forma en que estructuras el input afecta significativamente la calidad de las respuestas.

### Tip #1: Data at Top, Query at End

**Principio fundamental**: Poner el contenido del documento al inicio, la pregunta/instrucción al final.

**Estructura óptima**:
```
<documento>
[contenido completo del documento - puede ser muy largo]
</documento>

Instrucciones:
[tu query o tarea específica]
```

**Por qué funciona**: Claude procesa el documento secuencialmente. Al tener toda la data primero, cuando llega a las instrucciones ya tiene todo el contexto necesario para responder de forma precisa y completa.

---

### Comparación de Efectividad

**Mal estructurado (query primero)**:
```
Traducir este documento de architecture docs a español usando modo Alta Fidelidad.

<documento>
[5000 palabras de contenido]
</documento>
```
**Resultado**: Claude puede empezar a procesar antes de tener todo el documento, menos efectivo.

---

**Bien estructurado (data primero)**:
```
<documento>
[5000 palabras de contenido completo]
</documento>

Instrucciones:
Traducir este documento de architecture docs a español usando modo Alta Fidelidad.
Preservar toda estructura, labels y referencias.
```
**Resultado**: Claude procesa documento completo, luego aplica instrucciones con contexto total.

---

**Mejora medida**: 30% mejor accuracy en tareas de análisis y transformación de documentos largos.

---

## Estructurar Documentos con XML Tags

### Por Qué Usar XML Tags

XML tags crean estructura semántica que ayuda a Claude:
- Identificar secciones rápidamente
- Entender jerarquía de contenido
- Referenciar partes específicas

**Reglas de uso**:
- Tags descriptivos y consistentes
- Anidación refleja jerarquía del documento
- IDs únicos para referencias

---

### Patrón Básico - Documento Simple

```xml
<documento id="architecture-docs-section-10">
  <metadata>
    <titulo>Quality Requirements</titulo>
    <seccion>10</seccion>
    <version>1.0</version>
  </metadata>
  
  <contenido>
    [contenido del documento]
  </contenido>
</documento>

Instrucción:
Analizar el documento y extraer todos los requisitos de calidad.
```

---

### Patrón Avanzado - Documento con Subsecciones

**Ejemplo - architecture docs completo**:

```xml
<architecture-docs version="8.0">
  <section id="01-introduction">
    <titulo>Introduction and Goals</titulo>
    <subsection id="01-1-requirements">
      <titulo>Requirements Overview</titulo>
      <contenido>
        [contenido de requirements]
      </contenido>
    </subsection>
    <subsection id="01-2-quality-goals">
      <titulo>Quality Goals</titulo>
      <contenido>
        [contenido de quality goals]
      </contenido>
    </subsection>
    <subsection id="01-3-stakeholders">
      <titulo>Stakeholders</titulo>
      <contenido>
        [contenido de stakeholders]
      </contenido>
    </subsection>
  </section>
  
  <section id="02-constraints">
    <titulo>Architecture Constraints</titulo>
    <contenido>
      [contenido de constraints]
    </contenido>
  </section>
  
  <section id="03-context">
    <titulo>Context and Scope</titulo>
    <subsection id="03-1-business-context">
      <titulo>Business Context</titulo>
      <contenido>
        [contenido]
      </contenido>
    </subsection>
    <subsection id="03-2-technical-context">
      <titulo>Technical Context</titulo>
      <contenido>
        [contenido]
      </contenido>
    </subsection>
  </section>
</architecture-docs>

Instrucciones:
Analizar la sección <section id="03-context"> y:
1. Resumir el Business Context
2. Resumir el Technical Context
3. Identificar dependencies entre ambos
```

Claude puede navegar directamente a `section id="03-context"` sin procesar otras secciones innecesariamente.

---

### Patrón para Documentos Múltiples

Cuando trabajas con múltiples documentos relacionados:

```xml
<documentos-relacionados proyecto="ADT">
  <documento id="glossary" tipo="referencia">
    <titulo>Glossary de Términos</titulo>
    <contenido>
      [términos y definiciones]
    </contenido>
  </documento>
  
  <documento id="architecture-docs-sec-05" tipo="principal">
    <titulo>Building Block View</titulo>
    <referencias>
      <ref id-doc="glossary" terminos="microservice, API Gateway" />
    </referencias>
    <contenido>
      [contenido de section 5]
    </contenido>
  </documento>
  
  <documento id="architecture-docs-sec-06" tipo="principal">
    <titulo>Runtime View</titulo>
    <referencias>
      <ref id-doc="architecture-docs-sec-05" componentes="API Gateway, Backend Services" />
    </referencias>
    <contenido>
      [contenido de section 6]
    </contenido>
  </documento>
</documentos-relacionados>

Instrucciones:
Revisar consistencia entre architecture-docs-sec-05 y architecture-docs-sec-06.
Verificar que componentes mencionados en sec-06 están definidos en sec-05.
Usar glossary para verificar terminología.
```

---

## Ground Responses in Quotes

### Por Qué Citar el Original

Cuando analizas documentos largos, citar texto original:
- Asegura que análisis está basado en contenido real
- Permite verificar interpretaciones
- Previene alucinaciones
- Facilita localizar información en documento fuente

---

### Patrón de Citación - Análisis

```xml
<documento id="architecture-docs-section-09">
  <titulo>Architecture Decisions</titulo>
  <contenido>
    We decided to use microservices architecture because it provides
    better scalability and allows independent deployment of services.
    However, this increases operational complexity and requires
    sophisticated monitoring.
    
    Another key decision was to use REST APIs for inter-service
    communication. This was chosen over gRPC because our team has
    more experience with REST and it's easier to debug.
  </contenido>
</documento>

Instrucciones:
Analizar las decisiones de arquitectura documentadas.

Para cada decisión:
1. Citar el texto exacto del documento
2. Identificar: ¿Qué se decidió? ¿Por qué? ¿Trade-offs?
3. Evaluar calidad de la documentación

Formato:
**Decisión X**:
> [cita textual]

Análisis:
- Qué: [descripción]
- Por qué: [razón]
- Trade-offs: [pros/cons identificados]
- Calidad documentación: [Alta/Media/Baja con justificación]
```

**Respuesta esperada**:
```
**Decisión 1: Arquitectura de Microservicios**:
> "We decided to use microservices architecture because it provides
> better scalability and allows independent deployment of services.
> However, this increases operational complexity and requires
> sophisticated monitoring."

Análisis:
- Qué: Adopción de arquitectura de microservicios
- Por qué: Escalabilidad y deployment independiente
- Trade-offs: Reconoce aumento en complejidad operacional y necesidad de monitoring
- Calidad documentación: ALTA - Incluye razón y trade-offs explícitos

**Decisión 2: REST APIs para Comunicación Inter-Servicio**:
> "Another key decision was to use REST APIs for inter-service
> communication. This was chosen over gRPC because our team has
> more experience with REST and it's easier to debug."

Análisis:
- Qué: REST APIs (vs gRPC)
- Por qué: Experiencia del equipo y facilidad de debugging
- Trade-offs: Reconoce alternativa (gRPC), criterio basado en pragmatismo
- Calidad documentación: MEDIA - Razón clara pero falta análisis de trade-offs técnicos (performance, typing)
```

---

### Patrón de Citación - Traducción

Para validar calidad de traducción:

```xml
<original lang="en">
  <parrafo id="p1">
    The system shall provide high availability with 99.9% uptime.
    This is a critical requirement for our SaaS platform.
  </parrafo>
</original>

<traduccion lang="es">
  <parrafo id="p1">
    El sistema debe proporcionar alta disponibilidad con 99.9% de tiempo activo.
    Este es un requisito crítico para nuestra plataforma SaaS.
  </parrafo>
</traduccion>

Instrucciones:
Validar calidad de traducción.

Para cada párrafo:
1. Citar original y traducción lado a lado
2. Verificar accuracy semántica
3. Verificar preservation de terminología técnica
4. Identificar mejoras potenciales

Formato:
**Párrafo [id]**:
Original:
> [texto original]

Traducción:
> [texto traducido]

Evaluación:
- Accuracy: [correcta/incorrecta con detalles]
- Terminología: [preservada/modificada con ejemplos]
- Mejoras: [sugerencias si aplican]
```

---

## Casos de Uso ADT

### Caso 1: Traducción de architecture docs Completo

**Escenario**: Traducir todo el documento architecture docs (13 secciones, ~25,000 palabras) de inglés a español.

**Estructura recomendada**:
```xml
<architecture-docs-completo version="8.0" lang="en">
  <metadata>
    <proyecto>Sistema de Gestión de Contenidos</proyecto>
    <version>2.0</version>
    <fecha>2026-02-01</fecha>
  </metadata>
  
  <section id="01">
    [contenido section 1 completo]
  </section>
  
  <section id="02">
    [contenido section 2 completo]
  </section>
  
  [... sections 3-13 ...]
</architecture-docs-completo>

Instrucciones:
Traducir architecture docs completo de inglés a español usando modo Alta Fidelidad.

Workflow:
1. Procesar sección por sección (01 → 13)
2. Checkpoint después de cada sección
3. Preservar TODOS los labels y referencias
4. Consultar glossary.md para términos establecidos
5. Mantener terminología técnica en inglés cuando es estándar

Comenzar con section 01. Después de traducirla, pausar para validación.
```

**Por qué funciona**:
- XML estructura permite procesamiento sección por sección
- Checkpoints permiten validación incremental
- Metadata da contexto del proyecto
- Data at top → query at end optimiza procesamiento

---

### Caso 2: Análisis de Build Output (230 Warnings)

**Escenario**: Analizar output de build de Sphinx con 230 warnings para categorizar y planificar corrección.

**Estructura recomendada**:
```xml
<build-output proyecto="ADT" comando="make html" fecha="2026-02-01">
  <summary>
    <total-lines>3500</total-lines>
    <warnings>230</warnings>
    <errors>0</errors>
  </summary>
  
  <output>
[aquí todo el output completo del build, línea por línea]

/tmp/ADT/source/architecture/section-01.rst:45: WARNING: undefined label: introduction-goals
/tmp/ADT/source/architecture/section-02.rst:12: WARNING: duplicate label constraints
/tmp/ADT/source/architecture/section-05.rst:78: WARNING: toctree contains reference to nonexisting document 'components/api'
[... todos los 230 warnings ...]
  </output>
</build-output>

Instrucciones:
Analizar este build output de Sphinx y:

1. Categorizar los 230 warnings por tipo
2. Para cada tipo:
   - Contar cuántos warnings hay
   - Listar archivos más afectados
   - Identificar si hay pattern recurrente
3. Proponer estrategia de corrección en lotes (5-6 lotes)
4. Estimar tiempo por lote

Mostrar razonamiento paso a paso antes de la propuesta final.
```

**Por qué funciona**:
- Todo el output al inicio da contexto completo
- Summary en XML facilita referencia
- Output completo permite identificar patterns reales
- Instrucciones al final aplican a todo el contexto

---

### Caso 3: Cross-Reference Validation

**Escenario**: Verificar que todas las referencias entre secciones de architecture docs son correctas.

**Estructura recomendada**:
```xml
<architecture-docs-project>
  <seccion-origen id="sec-05" archivo="source/architecture/section-05.rst">
    <contenido>
      ... text ...
      Ver :ref:`quality-requirements` para detalles de calidad.
      ... text ...
      El deployment está descrito en :ref:`deployment-view`.
    </contenido>
    <referencias-salientes>
      <ref target="quality-requirements" />
      <ref target="deployment-view" />
    </referencias-salientes>
  </seccion-origen>
  
  <seccion-destino id="sec-10" archivo="source/architecture/section-10.rst">
    <contenido>
      .. _quality-requirements:
      
      Quality Requirements
      ====================
      
      [contenido]
    </contenido>
    <labels-definidos>
      <label name="quality-requirements" linea="1" />
    </labels-definidos>
  </seccion-destino>
  
  <seccion-destino id="sec-07" archivo="source/architecture/section-07.rst">
    <contenido>
      .. _deployment-view:
      
      Deployment View
      ===============
      
      [contenido]
    </contenido>
    <labels-definidos>
      <label name="deployment-view" linea="1" />
    </labels-definidos>
  </seccion-destino>
</architecture-docs-project>

Instrucciones:
Validar que todas las referencias en seccion-origen tienen labels correspondientes definidos.

Para cada referencia:
1. Citar el uso de la referencia en origen
2. Verificar si el label existe en destino
3. Si existe: Confirmar ✓
4. Si NO existe: Reportar como ROTO con ubicación exacta

Formato resultado:
**Referencia**: `quality-requirements`
Usado en: section-05.rst línea [X]
> [cita del contexto donde se usa]

Label definido en: section-10.rst línea 1 ✓

**Referencia**: `deployment-view`
[similar análisis]
```

---

## Mejores Prácticas Resumidas

### 1. Estructura del Prompt

```
[DOCUMENTO COMPLETO - puede ser muy largo]

[INSTRUCCIONES CLARAS Y ESPECÍFICAS]
```

**Beneficio**: 30% mejora en accuracy

---

### 2. Usar XML para Jerarquía

```xml
<nivel-1>
  <nivel-2>
    <nivel-3>
      contenido
    </nivel-3>
  </nivel-2>
</nivel-1>
```

**Beneficio**: Navegación eficiente, referencias precisas

---

### 3. Requerir Citas

```
Para cada [X]:
1. Citar texto original
> [cita]

2. Analizar
[análisis]
```

**Beneficio**: Previene alucinaciones, facilita verificación

---

### 4. Checkpoints en Documentos Largos

```
Workflow:
1. Procesar sección A
2. CHECKPOINT - validar antes de continuar
3. Procesar sección B
4. CHECKPOINT - validar antes de continuar
...
```

**Beneficio**: Corrección de curso temprana, menos re-trabajo

---

### 5. Metadata en XML

```xml
<documento>
  <metadata>
    <proyecto>ADT</proyecto>
    <version>2.0</version>
    <fecha>2026-02-01</fecha>
  </metadata>
  <contenido>
    [documento]
  </contenido>
</documento>
```

**Beneficio**: Contexto adicional sin mezclar con contenido

---

## Anti-Patterns (Evitar)

### ❌ Query First, Data Last

```
Traducir este documento.

<documento>
[5000 palabras]
</documento>
```

**Problema**: Claude puede empezar a procesar antes de tener contexto completo.

---

### ❌ Sin Estructura en Documentos Largos

```
[25,000 palabras de architecture docs sin ninguna estructura XML]

Analizar sección 5.
```

**Problema**: Claude tiene que buscar sección 5 en texto plano, ineficiente.

---

### ❌ Sin Citas en Análisis

```
Analizar decisiones de arquitectura.
```

**Respuesta sin citas**:
```
El documento menciona varias decisiones importantes sobre microservicios...
```

**Problema**: No verificable, propenso a imprecisión.

---

### ❌ Documentos Múltiples Sin Identificadores

```
[documento 1 - sin identificador]
[documento 2 - sin identificador]
[documento 3 - sin identificador]

Comparar los tres documentos.
```

**Problema**: Difícil referenciar documentos específicos en respuesta.

---

## Conclusión

Trabajar con documentos largos efectivamente requiere:

1. **Data at top, query at end** - 30% mejora en accuracy
2. **Estructura XML** - Navegación eficiente
3. **Ground en quotes** - Previene alucinaciones
4. **Checkpoints** - Validación incremental
5. **Metadata** - Contexto sin contaminar contenido

Aplicar estos principios en proyectos ADT donde documentos largos (architecture docs, build outputs, documentación técnica) son comunes.

---

**Documento basado en**: Anthropic Long Context Best Practices
**Adaptado para**: THYROX con ejemplos architecture docs, Sphinx, build analysis
**Fecha**: 2026-02-01
**Ver también**: skill-authoring.md, prompting-tips.md
