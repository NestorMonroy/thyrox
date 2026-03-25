---
name: anthropic-best-practices
description: "Best practices oficiales de Anthropic para skill authoring, prompting y manejo de contexto largo. Usar cuando creas skills, optimizas prompts o trabajas con documentos grandes."
version: 1.0.0
created: 2026-02-01
updated: 2026-02-01
---

# Anthropic Best Practices

Best practices oficiales de Anthropic transformadas y adaptadas para el proyecto ADT.

---

## Descripción

Este skill consolida conocimiento oficial de Anthropic sobre tres áreas fundamentales:

1. **Skill Authoring**: Cómo crear skills efectivos y bien estructurados
2. **Prompting**: Técnicas para obtener mejores respuestas de Claude 4.5
3. **Long Context**: Optimización para trabajar con documentos grandes (>10,000 palabras)

Todo el contenido está adaptado al contexto ADT con ejemplos de arc42, Sphinx, RST y workflows del proyecto.

---

## Cuándo Usar Este Skill

### Usar cuando:

**Para skill authoring** (crear o mejorar skills):
- Estás creando un nuevo skill para el proyecto
- Un skill existente es muy largo (>500 líneas)
- Necesitas decidir cómo estructurar contenido de un skill
- Quieres mejorar la calidad de un skill existente

**Para prompting** (optimizar interacciones):
- Claude no entiende tus instrucciones
- Necesitas resultados más precisos en tareas complejas
- Trabajas en proyectos largos que requieren múltiples pasos
- Quieres mejorar consistencia de respuestas

**Para long context** (documentos grandes):
- Trabajas con archivos >5,000 palabras
- Necesitas analizar build output extenso
- Traduces documentación arc42 completa
- Validar cross-references en múltiples archivos

---

## Decision Framework

**Usa este framework para saber qué archivo consultar**:

### 1. ¿Necesitas crear o mejorar un SKILL?

→ Consultar **[skill-authoring.md](skill-authoring.md)**

Temas que cubre:
- Principios fundamentales (concisión, grados de libertad, testing)
- Estructura de skills (naming, descriptions)
- Progressive disclosure (cuándo split contenido)
- Workflows y feedback loops
- Content guidelines
- Patrones comunes (templates, ejemplos, workflows condicionales)
- Evaluación e iteración

**Ejemplo de uso**:
```
Estoy creando un skill para validar documentación arc42.
El contenido está creciendo mucho (>600 líneas).
¿Cómo debería estructurarlo?

→ Leer skill-authoring.md sección "Progressive Disclosure Patterns"
```

---

### 2. ¿Necesitas OPTIMIZAR cómo interactúas con Claude?

→ Consultar **[prompting-tips.md](prompting-tips.md)**

Temas que cubre:
- Principios generales (ser explícito, agregar contexto, lenguaje fuerte)
- Long-horizon reasoning (tareas complejas multi-paso)
- Context awareness (Claude 4.5 específico)
- State management (JSON + texto)
- Communication style (adaptar tono)
- Tool usage patterns
- Iteración y refinamiento
- Casos de uso ADT (análisis build, traducción, corrección incremental)

**Ejemplo de uso**:
```
Estoy pidiendo a Claude que analice 230 warnings de Sphinx
pero las respuestas son superficiales.
¿Cómo mejorar mi prompt?

→ Leer prompting-tips.md sección "Long-Horizon Reasoning"
```

---

### 3. ¿Trabajas con DOCUMENTOS GRANDES (>5,000 palabras)?

→ Consultar **[long-context-tips.md](long-context-tips.md)**

Temas que cubre:
- Essential tips (data at top, query at end → 30% mejora)
- Estructurar con XML tags (jerarquía y navegación)
- Ground responses in quotes (prevenir alucinaciones)
- Casos de uso ADT (traducción arc42, análisis build, cross-reference validation)
- Mejores prácticas resumidas
- Anti-patterns a evitar

**Ejemplo de uso**:
```
Necesito traducir arc42 completo (13 secciones, 25,000 palabras).
¿Cuál es la mejor forma de estructurar el prompt?

→ Leer long-context-tips.md caso de uso "Traducción de arc42 Completo"
```

---

## Trigger Patterns

### Señales Explícitas

**Skill authoring**:
- "crear un nuevo skill"
- "este skill es muy largo"
- "cómo estructuro este contenido"
- "mejorar calidad del skill"

**Prompting**:
- "Claude no entiende mis instrucciones"
- "cómo hago mejor este prompt"
- "necesito respuestas más precisas"
- "optimizar mi interacción con Claude"

**Long context**:
- "documento muy grande"
- "traducir arc42 completo"
- "analizar todo el build output"
- "trabajar con 10,000+ palabras"

### Señales Implícitas

**Skill authoring**:
- SKILL.md tiene >500 líneas
- Usuario repite mismo contenido en múltiples skills
- Skill tiene poca estructura o difícil de navegar

**Prompting**:
- Respuestas de Claude son vagas o incompletas
- Tareas multi-paso fallan en pasos intermedios
- Inconsistencia entre respuestas similares

**Long context**:
- Trabajando con archivos de documentación técnica
- Necesidad de analizar outputs completos de herramientas
- Validar consistencia entre múltiples documentos

---

## Self-Check

### Antes de Consultar

**Para skill authoring**:
- [ ] ¿Ya revisé skills existentes similares?
- [ ] ¿Identifiqué qué problema específico del skill quiero resolver?
- [ ] ¿Tengo claro si el issue es de contenido o estructura?

**Para prompting**:
- [ ] ¿Intenté hacer el prompt más explícito?
- [ ] ¿Agregué contexto relevante que Claude no tiene?
- [ ] ¿Especifiqué claramente el formato de output deseado?

**Para long context**:
- [ ] ¿El documento es realmente largo (>5,000 palabras)?
- [ ] ¿Tengo clara la tarea específica sobre el documento?
- [ ] ¿Sé qué partes del documento son relevantes?

### Después de Aplicar

**Skill authoring**:
- [ ] ¿El skill quedó <500 líneas o usé progressive disclosure?
- [ ] ¿La descripción incluye "Usar cuando..."?
- [ ] ¿Los ejemplos son específicos de ADT (no genéricos)?

**Prompting**:
- [ ] ¿Claude ahora entiende la tarea claramente?
- [ ] ¿Las respuestas son más precisas y completas?
- [ ] ¿Puedo replicar resultados consistentemente?

**Long context**:
- [ ] ¿Puse data primero, query al final?
- [ ] ¿Usé XML tags para estructura (si aplica)?
- [ ] ¿Pedí que Claude cite el texto original?

---

## Relación con Otros Skills

### Complementa a:

**skills-management**:
- skill-authoring.md provee best practices para crear skills
- skills-management usa estos principios en sus templates

**project-context**:
- prompting-tips.md tiene técnicas para proveer contexto efectivo
- Aplicable cuando Claude necesita entender el proyecto ADT

**translation-workflow**:
- long-context-tips.md optimiza traducción de documentos grandes
- Casos de uso específicos para arc42 completo

**incremental-correction-methodology**:
- prompting-tips.md para análisis de build (long-horizon reasoning)
- long-context-tips.md para procesar build output completo

### Es usado por:

Cualquier skill que:
- Necesita proveer instrucciones claras a Claude
- Trabaja con documentos largos
- Requiere razonamiento multi-paso
- Debe mantener consistencia en tareas complejas

---

## Archivos del Skill

```
anthropic-best-practices/
├── SKILL.md (este archivo - overview y navigation)
├── skill-authoring.md (450 líneas - crear skills efectivos)
├── prompting-tips.md (380 líneas - optimizar prompts)
├── long-context-tips.md (330 líneas - documentos grandes)
└── README.md (guía de uso y casos reales)
```

---

## Quick Reference

### Principio más importante de cada área:

**Skill Authoring**:
> "Conciso es clave - Solo agregar contexto que Claude NO tiene ya"

**Prompting**:
> "Ser explícito - Claude responde mejor a instrucciones claras y específicas"

**Long Context**:
> "Data at top, query at end - Mejora 30% en accuracy"

---

## Ejemplos de Uso

### Ejemplo 1: Mejorar skill existente

**Situación**: translation-workflow/SKILL.md tiene 620 líneas y es difícil de navegar.

**Acción**:
1. Consultar skill-authoring.md sección "Progressive Disclosure Patterns"
2. Aplicar patrón "Organización por Dominio"
3. Split contenido en modes/high-fidelity.md, modes/visual-markup.md, modes/enrichment.md
4. SKILL.md queda en ~200 líneas con overview y navegación

**Resultado**: Skill más manejable, Claude carga solo lo necesario.

---

### Ejemplo 2: Optimizar prompt de análisis

**Situación**: Pidiendo a Claude analizar 230 warnings pero respuestas son superficiales.

**Prompt original**:
```
Analiza estos warnings y dime qué hacer.
```

**Acción**:
1. Consultar prompting-tips.md sección "Long-Horizon Reasoning"
2. Aplicar "Pedir Razonamiento Paso a Paso"

**Prompt mejorado**:
```
Analizar estos 230 warnings de Sphinx y proponer estrategia de corrección.

Razonar paso a paso:
1. ¿Qué tipos de warnings hay?
2. ¿Cuáles son más frecuentes?
3. ¿Hay patterns que sugieren corrección en batch?
4. ¿Cuál es el orden lógico de corrección?
5. Basado en 1-4, ¿cuál es la mejor estrategia?

Mostrar razonamiento antes de proponer estrategia final.
```

**Resultado**: Análisis exhaustivo con razonamiento visible.

---

### Ejemplo 3: Estructurar traducción de documento grande

**Situación**: Necesito traducir arc42 completo (13 secciones, 25,000 palabras).

**Acción**:
1. Consultar long-context-tips.md caso de uso "Traducción de arc42 Completo"
2. Aplicar estructura XML con secciones
3. Usar patrón "data at top, query at end"

**Estructura aplicada**:
```xml
<arc42-completo version="8.0" lang="en">
  <section id="01">...</section>
  <section id="02">...</section>
  ...
  <section id="13">...</section>
</arc42-completo>

Instrucciones:
Traducir arc42 completo usando modo Alta Fidelidad.
Procesar sección por sección con checkpoints.
```

**Resultado**: Traducción consistente y de alta calidad con validación incremental.

---

## Notas

- **Contenido transformado**: Este skill NO es copia literal de documentación Anthropic. Ha sido transformado y adaptado con ejemplos específicos de ADT.

- **Fuente oficial**: Basado en Anthropic Skill Authoring Best Practices, Prompting Best Practices, y Long Context Tips de llms-full.txt.

- **Actualización**: Los principios fundamentales son estables, pero pueden aparecer nuevas técnicas con futuras versiones de Claude. Revisar periódicamente.

- **Aplicabilidad**: Aunque está adaptado a ADT, los principios son transferibles a cualquier proyecto que use Claude.

---

## Referencias

### Documentación Interna

- `skill-authoring.md` - Principios de creación de skills
- `prompting-tips.md` - Técnicas de prompting para Claude 4.5
- `long-context-tips.md` - Optimización para documentos grandes
- `README.md` - Guía completa con casos de uso reales

### Documentación Externa

- Anthropic Documentation: https://docs.claude.com
- Anthropic Prompt Engineering: https://docs.claude.com/en/docs/build-with-claude/prompt-engineering

### Skills Relacionados

- `skills-management` - Usa principios de skill-authoring en templates
- `project-context` - Aplica prompting-tips para proveer contexto
- `translation-workflow` - Usa long-context-tips para documentos grandes
- `incremental-correction-methodology` - Aplica técnicas de long-horizon reasoning

---

## Changelog

### v1.0.0 - 2026-02-01

**Creación inicial del skill**

**Archivos incluidos**:
- SKILL.md (overview, decision framework, navigation)
- skill-authoring.md (450 líneas transformadas)
- prompting-tips.md (380 líneas transformadas)
- long-context-tips.md (330 líneas transformadas)
- README.md (guía de uso)

**Contenido**:
- Transformado de llms-full.txt líneas 27212-28500, 2382-2900, 47737-47950
- Adaptado con ejemplos ADT (arc42, Sphinx, RST)
- Decision frameworks accionables
- Casos de uso específicos del proyecto
- En español (idioma del proyecto)

**Propósito**:
- Consolidar best practices oficiales de Anthropic
- Proveer referencia para crear skills de alta calidad
- Optimizar interacciones con Claude
- Mejorar trabajo con documentos grandes

**Beneficio esperado**:
- Skills futuros siguen best practices desde el inicio
- Prompts más efectivos (mejor calidad de respuestas)
- Trabajo con documentos largos 30% más eficiente
- Conocimiento oficial accesible en contexto del proyecto

---

**Última actualización**: 2026-02-01
**Ver**: README.md para guía completa de uso
