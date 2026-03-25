# Anthropic Best Practices - Guía de Uso

Skill: `anthropic-best-practices`
Ubicación: `.codex/skills/anthropic-best-practices/`
Versión: 1.0.0

---

## Propósito del Skill

Consolidar best practices oficiales de Anthropic sobre:
1. **Skill Authoring** - Crear skills efectivos
2. **Prompting** - Optimizar interacciones con Claude
3. **Long Context** - Trabajar con documentos grandes

Todo adaptado al contexto del proyecto ADT con ejemplos de arc42, Sphinx y RST.

---

## Archivos del Skill

### SKILL.md

**Tamaño**: ~200 líneas

**Contenido**:
- Overview del skill
- Decision framework (qué archivo consultar según necesidad)
- Trigger patterns
- Self-checks
- Quick reference con principios fundamentales

**Cuándo leer**: Siempre primero. Te guía a los archivos específicos.

---

### skill-authoring.md

**Tamaño**: ~450 líneas transformadas

**Contenido**:
- Principios fundamentales (concisión, grados de libertad, testing)
- Estructura de skills (naming conventions, descriptions efectivas)
- Progressive disclosure patterns (cuándo split contenido en archivos)
- Workflows y feedback loops
- Content guidelines (evitar time-sensitive, terminología consistente)
- Patrones comunes (templates, ejemplos, workflows condicionales)
- Evaluación e iteración (construir evaluaciones primero)

**Cuándo consultar**:
- Creando un nuevo skill
- Skill existente >500 líneas
- Necesitas reorganizar contenido de un skill
- Quieres mejorar calidad de skill

**Ejemplo de consulta**:
```
Problema: translation-workflow/SKILL.md tiene 620 líneas

Solución en skill-authoring.md:
- Sección "Progressive Disclosure Patterns"
- Patrón "Organización por Dominio"
- Aplicar: Split en modes/high-fidelity.md, modes/visual-markup.md, etc.
```

---

### prompting-tips.md

**Tamaño**: ~380 líneas transformadas

**Contenido**:
- Principios generales (ser explícito, agregar contexto, lenguaje fuerte)
- Long-horizon reasoning (permitir tiempo de pensamiento, razonamiento paso a paso)
- Context awareness (token budget, multi-window)
- State management (JSON para estructura, texto para progreso)
- Communication style (adaptar tono, feedback específico)
- Tool usage patterns
- Trabajar con documentos largos (data at top, XML tags, ground en quotes)
- Iteración y refinamiento
- Casos de uso ADT (análisis build, traducción, corrección incremental)

**Cuándo consultar**:
- Respuestas de Claude son vagas o incompletas
- Tareas complejas multi-paso
- Necesitas optimizar un prompt existente
- Quieres mejorar consistencia de respuestas

**Ejemplo de consulta**:
```
Problema: Análisis de 230 warnings es superficial

Solución en prompting-tips.md:
- Sección "Long-Horizon Reasoning"
- Técnica "Pedir Razonamiento Paso a Paso"
- Aplicar: Estructurar prompt con preguntas 1-5, pedir razonamiento visible
```

---

### long-context-tips.md

**Tamaño**: ~330 líneas transformadas

**Contenido**:
- Essential tips (data at top query at end → 30% mejora)
- Estructurar documentos con XML tags (jerarquía, navegación)
- Ground responses in quotes (prevenir alucinaciones)
- Casos de uso ADT:
  * Traducción de arc42 completo (13 secciones, 25,000 palabras)
  * Análisis de build output (230 warnings)
  * Cross-reference validation (múltiples documentos)
- Mejores prácticas resumidas
- Anti-patterns a evitar

**Cuándo consultar**:
- Documento >5,000 palabras
- Traducción de arc42 completo
- Análisis de build output extenso
- Validación entre múltiples archivos

**Ejemplo de consulta**:
```
Problema: Traducir arc42 completo (25,000 palabras)

Solución en long-context-tips.md:
- Caso de uso "Traducción de arc42 Completo"
- Estructura XML con secciones
- Patrón data at top, query at end
- Checkpoints incrementales
```

---

## Workflow Recomendado

### Paso 1: Identificar Tu Necesidad

```
¿Qué necesitas?

A) Crear o mejorar un skill
   → Ir a Paso 2a

B) Optimizar cómo interactúas con Claude
   → Ir a Paso 2b

C) Trabajar con documento grande (>5,000 palabras)
   → Ir a Paso 2c
```

---

### Paso 2a: Skill Authoring

1. **Leer SKILL.md** sección "Decision Framework" punto 1
2. **Abrir skill-authoring.md**
3. **Buscar tu caso específico**:
   - Skill muy largo → "Progressive Disclosure Patterns"
   - Mejorar descriptions → "Escribir Descriptions Efectivas"
   - Naming del skill → "Naming Conventions"
   - Evaluar skill → "Evaluación e Iteración"
4. **Aplicar principios a tu skill**
5. **Validar con self-check** (SKILL.md sección "Self-Check")

**Resultado esperado**: Skill mejorado siguiendo best practices oficiales.

---

### Paso 2b: Optimizar Prompting

1. **Leer SKILL.md** sección "Decision Framework" punto 2
2. **Abrir prompting-tips.md**
3. **Buscar tu caso específico**:
   - Prompt vago → "Principios Generales - Ser Explícito"
   - Tarea compleja → "Long-Horizon Reasoning"
   - Tareas multi-paso → "State Management"
   - Documento largo en prompt → "Trabajar con Documentos Largos"
4. **Aplicar técnica a tu prompt**
5. **Testar y comparar** resultados vs prompt original

**Resultado esperado**: Respuestas más precisas y consistentes.

---

### Paso 2c: Documento Grande

1. **Leer SKILL.md** sección "Decision Framework" punto 3
2. **Abrir long-context-tips.md**
3. **Buscar tu caso específico**:
   - Traducción arc42 → Caso de uso "Traducción de arc42 Completo"
   - Análisis build → Caso de uso "Análisis de Build Output"
   - Cross-references → Caso de uso "Cross-Reference Validation"
4. **Aplicar estructura recomendada**:
   - Data at top, query at end
   - XML tags para jerarquía
   - Pedir citas del original
5. **Implementar checkpoints** si documento es muy largo

**Resultado esperado**: 30% mejora en accuracy, procesamiento eficiente.

---

## Casos de Uso Reales

### Caso 1: Crear Skill de Validación Sphinx

**Situación**: Necesito crear un skill para validar documentación Sphinx.

**Flujo**:
1. Leer SKILL.md → Decision framework punto 1 → skill-authoring.md
2. Consultar sección "Naming Conventions" → Decidir nombre: `sphinx-validator`
3. Consultar "Escribir Descriptions Efectivas" → Crear description:
   ```yaml
   description: "Valida builds de Sphinx, analiza warnings y genera reportes. Usar cuando trabajas con documentación Sphinx o necesitas validar build."
   ```
4. Consultar "Establecer Grados de Libertad Apropiados" → Decidir nivel de especificidad
5. Consultar "Patrón de Template" → Usar template para estructura de reportes
6. Crear skill con ~200 líneas en SKILL.md
7. Si crece mucho, usar "Progressive Disclosure" para split

**Resultado**: Skill sphinx-validator bien estructurado desde el inicio.

---

### Caso 2: Mejorar Análisis de 230 Warnings

**Situación**: Claude da análisis superficial de build con 230 warnings.

**Prompt original**:
```
Analiza estos warnings:
[paste de 230 warnings]
```

**Flujo**:
1. Leer SKILL.md → Decision framework punto 2 → prompting-tips.md
2. Consultar "Long-Horizon Reasoning" → Ver patrón "Pedir Razonamiento Paso a Paso"
3. Consultar "Trabajar con Documentos Largos" → Aplicar "Data at Top"

**Prompt mejorado**:
```xml
<build-output>
[paste completo de 230 warnings]
</build-output>

Analizar este build output y proponer estrategia de corrección.

Razonar paso a paso:
1. ¿Qué tipos de warnings hay?
2. ¿Cuáles son más frecuentes?
3. ¿Hay patterns recurrentes?
4. ¿Cuál es el orden lógico de corrección?
5. Basado en 1-4, ¿cuál es la mejor estrategia?

Mostrar razonamiento antes de proponer estrategia final.
```

**Resultado**: Análisis exhaustivo con categorización, patterns y estrategia clara.

---

### Caso 3: Traducir arc42 Completo

**Situación**: Traducir todo arc42 (13 secciones, 25,000 palabras) inglés → español.

**Flujo**:
1. Leer SKILL.md → Decision framework punto 3 → long-context-tips.md
2. Consultar caso de uso "Traducción de arc42 Completo"
3. Aplicar estructura XML recomendada

**Prompt estructurado**:
```xml
<arc42-completo version="8.0" lang="en">
  <metadata>
    <proyecto>Sistema de Gestión</proyecto>
    <version>2.0</version>
  </metadata>
  
  <section id="01">
    [contenido completo section 1]
  </section>
  
  ...
  
  <section id="13">
    [contenido completo section 13]
  </section>
</arc42-completo>

Instrucciones:
Traducir arc42 completo a español usando modo Alta Fidelidad.

Workflow:
1. Procesar sección por sección (01 → 13)
2. Checkpoint después de cada sección
3. Preservar TODOS los labels y referencias
4. Consultar glossary.md para términos establecidos

Comenzar con section 01. Pausar para validación.
```

**Resultado**: Traducción de alta calidad con validación incremental.

---

## Integración con Otros Skills

### skills-management

**Relación**: skills-management usa principios de skill-authoring en sus templates.

**Workflow**:
1. Usar template SKILL.md.template de skills-management
2. Consultar anthropic-best-practices/skill-authoring.md para optimizar
3. Aplicar progressive disclosure si skill crece mucho

**Beneficio**: Skills nuevos siguen best practices desde el inicio.

---

### translation-workflow

**Relación**: long-context-tips optimiza traducción de documentos grandes.

**Workflow**:
1. Cuando traduces arc42 completo (modo Alta Fidelidad)
2. Consultar long-context-tips.md caso de uso "Traducción de arc42 Completo"
3. Aplicar estructura XML con secciones
4. Implementar checkpoints incrementales

**Beneficio**: Traducción 30% más precisa, validación por sección.

---

### incremental-correction-methodology

**Relación**: prompting-tips mejora análisis de build, long-context-tips para build output completo.

**Workflow en FASE 1 (Análisis)**:
1. Ejecutar build y capturar output (230 warnings)
2. Consultar prompting-tips.md "Long-Horizon Reasoning"
3. Consultar long-context-tips.md "Análisis de Build Output"
4. Estructurar prompt con XML y pedir razonamiento paso a paso

**Beneficio**: Análisis más exhaustivo, mejor categorización de issues.

---

## Preguntas Frecuentes

### Q1: ¿Debo leer los 3 archivos siempre?

**No**. Usar el decision framework en SKILL.md para identificar qué archivo es relevante a tu necesidad específica.

---

### Q2: ¿Este contenido es copia de documentación Anthropic?

**No**. El contenido ha sido **transformado** de llms-full.txt:
- Principios extraídos y adaptados
- Ejemplos reemplazados con casos ADT (arc42, Sphinx, RST)
- Decision frameworks creados
- Todo en español

---

### Q3: ¿Cuándo actualizar este skill?

Actualizar cuando:
- Anthropic lanza nuevas best practices oficiales
- Se identifican nuevos patterns en el proyecto ADT
- Claude tiene nuevas capabilities que requieren nuevas técnicas

Revisión recomendada: Cada 3-6 meses.

---

### Q4: ¿Los principios son aplicables solo a ADT?

**No**. Los principios fundamentales son universales. Los ejemplos están adaptados a ADT pero los conceptos aplican a cualquier proyecto que use Claude.

---

### Q5: ¿Qué archivo es más importante?

Depende de tu rol:
- **Creador de skills**: skill-authoring.md
- **Usuario de Claude**: prompting-tips.md
- **Trabajas con docs grandes**: long-context-tips.md

Todos tienen igual importancia en sus respectivos dominios.

---

### Q6: ¿Cómo saber si estoy aplicando bien los principios?

Usar self-checks en SKILL.md sección "Self-Check":
- Antes de consultar (¿identifiqué el problema?)
- Después de aplicar (¿mejoró el resultado?)

Métricas de mejora:
- Skill authoring: SKILL.md <500 líneas, ejemplos específicos
- Prompting: Respuestas más precisas y consistentes
- Long context: 30% mejora en accuracy

---

## Tips Rápidos

### Para Skill Authoring

**Regla de oro**: Conciso es clave - Solo agregar contexto que Claude NO tiene ya.

**Quick check**:
- [ ] SKILL.md <500 líneas?
- [ ] Description incluye "Usar cuando..."?
- [ ] Ejemplos son específicos (no genéricos)?

---

### Para Prompting

**Regla de oro**: Ser explícito - Claude responde mejor a instrucciones claras.

**Quick check**:
- [ ] ¿Instrucciones son específicas (no vagas)?
- [ ] ¿Agregué contexto que Claude no tiene?
- [ ] ¿Especifiqué formato de output deseado?

---

### Para Long Context

**Regla de oro**: Data at top, query at end - Mejora 30% en accuracy.

**Quick check**:
- [ ] ¿Documento completo está al inicio?
- [ ] ¿Query/instrucciones están al final?
- [ ] ¿Usé XML tags para estructura (si aplica)?

---

## Recursos Adicionales

### Dentro del Skill

- `SKILL.md` - Overview y navigation
- `skill-authoring.md` - Crear skills efectivos
- `prompting-tips.md` - Optimizar prompts
- `long-context-tips.md` - Documentos grandes

### Documentación Externa

- Anthropic Docs: https://docs.claude.com
- Prompt Engineering: https://docs.claude.com/en/docs/build-with-claude/prompt-engineering

### Skills Relacionados

- `skills-management` - Gestión de skills
- `project-context` - Contexto del proyecto
- `translation-workflow` - Traducción de docs
- `incremental-correction-methodology` - Corrección incremental

---

## Mantenimiento del Skill

### Actualización de Contenido

**Cuándo actualizar**:
- Anthropic publica nuevas best practices
- Se descubren nuevos patterns efectivos en ADT
- Claude 4.6+ introduce nuevas capabilities

**Proceso de actualización**:
1. Identificar nuevo contenido en documentación Anthropic
2. Transformar (NO copiar) con ejemplos ADT
3. Agregar a archivo relevante
4. Actualizar SKILL.md decision framework si necesario
5. Incrementar versión (MINOR para nuevos tips, MAJOR para cambios estructurales)

### Monitoreo de Efectividad

**Métricas a trackear**:
- Skills nuevos: ¿Siguen best practices desde inicio?
- Prompts: ¿Mejora en calidad de respuestas?
- Docs largos: ¿Se usa estructura recomendada?

**Feedback loop**:
1. Usuarios aplican principios
2. Observar resultados
3. Identificar gaps o mejoras
4. Actualizar skill

---

Última actualización: 2026-02-01
Versión: 1.0.0
Mantenedor: ADT Team
