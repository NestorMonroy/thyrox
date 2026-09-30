```yml
ID work package: 2026-04-03-00-49-34-voltfactory-adaptation
Fecha cierre: 2026-04-04-00-00-00
Proyecto: THYROX
Fase de origen: Phase 7 — TRACK
Total lecciones: 8
Autor: claude
```

# Lessons Learned — Voltfactory Adaptation

## Propósito

Capturar qué funcionó, qué falló y qué regla generalizable surge del WP
`voltfactory-adaptation` — análisis de Volt Factory y construcción del meta-framework
generativo de tech skills.

---

## Lecciones

### L-001: Declarar fase completa sin esperar aprobación del usuario rompe el control de calidad

**Qué pasó**
Al completar los artefactos de Phase 3, se declaró "Phase 3 completada" antes de
recibir confirmación explícita del usuario. El exit criteria incluía aprobación humana
y fue ignorado. → ERR-030.

**Raíz**
Confusión entre "artefacto creado" y "fase aprobada". Los exit criteria tienen dos
tipos de condiciones: técnicas (archivo existe, sin marcadores) y humanas (aprobación).
Las humanas no son verificables por script.

**Regla**
Cuando el exit criteria incluye "aprobado por usuario", no declarar la fase completa
hasta recibir respuesta explícita. Formular siempre: "¿Apruebas para continuar a Phase N?"

---

### L-002: Phase 3 sin artefacto en el WP elimina la trazabilidad de scope

**Qué pasó**
SKILL.md Phase 3 solo decía "actualizar ROADMAP.md". Sin un documento en el WP, al
revisar el WP en el futuro no había registro del scope decidido, qué quedó fuera ni por qué. → TD-002.

**Raíz**
Brecha en el diseño del framework: Phase 3 era la única fase sin artefacto propio en
el WP. ROADMAP.md es un archivo global — no captura el razonamiento específico del WP.

**Regla**
Cada fase debe producir al menos un artefacto dentro del WP. Para Phase 3: crear
`{nombre}-plan.md` con scope statement, in-scope, out-of-scope con razones. Resolución:
`plan.md.template` creado, SKILL.md Phase 3 actualizado.

---

### L-003: Timestamps incompletos en artefactos rompen la trazabilidad temporal

**Qué pasó**
[voltfactory-adaptation-solution-strategy](voltfactory-adaptation-solution-strategy.md) fue creado con `Fecha: 2026-04-03`
(sin hora) mientras que el análisis usó `Fecha: 2026-04-03-00-49-34` (completo). → TD-001.

**Raíz**
No existe validación automática del formato de timestamp en artefactos. El campo
`Fecha:` se llenó manualmente sin verificar el formato requerido por el template.

**Regla**
Al crear un artefacto, copiar el timestamp del WP como referencia:
`2026-04-03-00-49-34`. La regla en `conventions.md` debe establecer que `Fecha:`
en artefactos WP siempre usa `YYYY-MM-DD-HH-MM-SS`.

---

### L-004: Los dos ejes ortogonales son el patrón correcto para frameworks generativos

**Qué pasó**
El análisis de Volt Factory reveló que su arquitectura (BC/AL específica) no era
adaptable directamente. El insight clave: la visión real era un framework generativo,
no una adaptación de Volt Factory.

**Raíz**
La pregunta correcta no era "¿qué de Volt Factory copiamos?" sino "¿qué patrón
subyace a Volt Factory que podemos usar en cualquier tecnología?".

**Regla**
Al analizar un sistema externo para adaptarlo, buscar el patrón abstracto detrás
de la implementación concreta. En este caso: skills especializados + commands como
entry points + instructions siempre-on = patrón reutilizable independiente de BC/AL.

---

### L-005: Bootstrap once, use forever elimina la fricción de sesión

**Qué pasó**
La primera propuesta era detectar el stack en cada sesión. El usuario señaló que eso
no era correcto — la detección debe ocurrir una sola vez y los skills deben persistir
en git.

**Raíz**
ADR-008 (Git as persistence) ya establecía este principio. Se necesitaba aplicarlo
explícitamente al dominio de tech skills.

**Regla**
Cuando algo requiere descubrimiento (stack, estructura, convenciones del proyecto),
hacerlo UNA VEZ y committear el resultado. Las sesiones siguientes leen lo que existe.
No redescubrir lo que ya se sabe.

---

### L-006: Los templates con marcadores HTML comment permiten generación limpia

**Qué pasó**
Al diseñar el formato de templates del registry, se evaluaron separadores `---`,
múltiples archivos, y marcadores HTML comment. Los marcadores resultaron ser la
solución más limpia: un archivo por tecnología, extracción con `awk` sin ambigüedad.

**Raíz**
`---` colisiona con frontmatter YAML. Múltiples archivos duplican mantenimiento.
Los HTML comments son invisibles en render Markdown y no colisionan con ningún
patrón del contenido.

**Regla**
Para separar secciones en archivos Markdown que serán procesados programáticamente,
usar `<!-- MARKER_NAME -->` como delimitador. Es inequívoco y no interfiere con el
contenido renderizado.

---

### L-007: Titulos especiales necesitan overrides explícitos en scripts de generación

**Qué pasó**
`_generator.sh` usaba `awk toupper` para capitalizar layer y framework. Esto producía
"Db" en lugar de "DB" y "Nodejs" en lugar de "Node.js".

**Raíz**
El script asumía que capitalizar el primer carácter era suficiente. Nombres como
"db", "nodejs", "postgresql" tienen convenciones de título que no siguen esa regla.

**Regla**
Cuando un script genera texto presentable al usuario a partir de identificadores técnicos,
incluir un mapa de overrides para los casos conocidos. Expandir el mapa al agregar
nuevos templates.

---

### L-008: La auditoría de templates huérfanos revela deuda de diseño acumulada

**Qué pasó**
Al auditar los templates en `assets/`, se encontraron 6 templates no referenciados
en SKILL.md ni en ningún flujo activo. → TD-003.

**Raíz**
Los templates fueron creados en sesiones anteriores sin verificar si SKILL.md los
referenciaba. Sin un "gatekeep" de que cada template debe tener una fase asignada,
la deuda se acumula silenciosamente.

**Regla**
Al crear un template en `assets/`, simultáneamente agregar la referencia en SKILL.md
en la fase correspondiente. Si no hay fase para él, no crear el template — o moverlo
a `assets/legacy/` con documentación de por qué existe.

---

## Patrones reutilizables identificados

1. **Registry + generator**: patrón para auto-generar artefactos especializados desde templates centralizados. Aplicable a cualquier tipo de skill especializado.

2. **Slash commands como phase entry points**: reducen la fricción de arranque de sesión. El comando carga el contexto correcto sin que el usuario tenga que recordar qué fase seguir.

3. **Instructions siempre-on + SKILL bajo demanda**: las `.instructions.md` enforcan reglas pasivamente; el SKILL.md proporciona guía activa. Usar ambos en paralelo.

4. **Auditoría de gaps antes de implementar**: el análisis sistemático de templates, artefactos y flujos revela deuda acumulada. Vale la pena hacer esta auditoría al inicio de cualquier refactor de framework.
