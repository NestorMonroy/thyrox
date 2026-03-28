```yml
Fecha: 2026-03-28
Tipo: Phase 1 (ANALYZE)
Work: Diseño de test cases para pm-thyrox
```

# Análisis: Diseño de Test Cases para pm-thyrox

## Qué dice skill-creator sobre tests

Dos tipos de tests necesarios:

### Tipo 1: Trigger Evals (description optimization)

20 queries: mezcla de should-trigger y should-not-trigger.

**Reglas del skill-creator:**
- Queries realistas, concretas, con detalle (paths, contexto personal, nombres)
- Mix de longitudes, casual speech, abreviaciones
- Focus en edge cases, no en casos obvios
- should-not-trigger deben ser near-misses (no obvios)
- Queries deben ser sustantivas (Claude no activa skills para tareas simples)

### Tipo 2: Functional Evals (workflow verification)

2-3 prompts realistas que un usuario diría. Verifican que el skill produce los outputs correctos.

---

## Análisis: ¿Qué DEBERÍA activar pm-thyrox?

### Dominios del skill (de la description)

1. **Planificación** — "crea un plan para X", "cómo organizo esto"
2. **Análisis** — "analiza X", "investiga por qué falla Y"
3. **Diseño/Arquitectura** — "diseña la solución para X", "qué stack usar"
4. **Organización** — "organiza este trabajo", "crea un work package"
5. **Tracking** — "¿cuál es el estado?", "¿qué falta?"
6. **Tareas** — "descompón X en tareas", "¿qué hago primero?"
7. **Decisiones** — "documenta esta decisión", "crea un ADR"
8. **Desarrollo estructurado** — "quiero seguir un proceso", "necesito metodología"

### Qué NO debería activar

1. **Código directo** — "escribe una función que ordene un array"
2. **Debug simple** — "por qué este error: TypeError undefined"
3. **Git operacional** — "haz commit de estos cambios"
4. **Lectura de archivos** — "lee el README.md"
5. **Preguntas de conocimiento** — "¿qué es REST?"
6. **Refactoring directo** — "renombra esta variable de foo a bar"

---

## Trigger Evals Diseñados (20 queries)

### SHOULD TRIGGER (10 queries)

Cada una busca un aspecto diferente del skill:

**TE-01: Inicio de proyecto (trigger: planificación)**
```
"Tengo una idea para un sistema de notificaciones push. No sé por dónde empezar,
hay varias tecnologías posibles (Firebase, OneSignal, custom). ¿Cómo me organizo
para evaluar las opciones y crear un plan?"
```
**Por qué debería triggear:** Involucra análisis de alternativas + planificación + organización. Mapea a Phase 1-3.

**TE-02: Status check (trigger: tracking)**
```
"Llevo dos semanas trabajando en la migración de la base de datos y siento que
perdí el hilo. ¿Puedes revisar en qué punto estamos y qué falta?"
```
**Por qué debería triggear:** Pide status + qué falta. Mapea a Phase 7: TRACK.

**TE-03: Descomposición (trigger: tareas)**
```
"Necesito implementar un sistema de autenticación con OAuth2, JWT, refresh tokens,
y roles de usuario. Es bastante grande. Ayúdame a dividirlo en tareas manejables."
```
**Por qué debería triggear:** Pide explícitamente descomponer. Mapea a Phase 5: DECOMPOSE.

**TE-04: Decisión arquitectónica (trigger: decisiones)**
```
"Estamos discutiendo si usar PostgreSQL o MongoDB para el nuevo servicio. Ya
investigué un poco pero no sé cómo documentar la decisión para que el equipo
la entienda después."
```
**Por qué debería triggear:** Pide documentar decisión + investigación previa. Mapea a Phase 2 + ADR.

**TE-05: Pregunta implícita de metodología (trigger: "¿qué hago primero?")**
```
"Me acaban de asignar un proyecto legacy que nadie documentó. Hay código por todos
lados, sin tests, y el README está desactualizado. ¿por dónde empiezo?"
```
**Por qué debería triggear:** "¿por dónde empiezo?" es ANALYZE first. No pide el skill explícitamente pero lo necesita.

**TE-06: Trabajo grande sin estructura (trigger: organización)**
```
"Quiero refactorizar toda la capa de servicios de la API. Son como 15 archivos y
varias dependencias entre ellos. No quiero romper nada. ¿cómo lo hago sin perder
el control?"
```
**Por qué debería triggear:** Trabajo grande que necesita estructura. Mapea a Phase 3-6.

**TE-07: Bug complejo que requiere investigación (trigger: análisis)**
```
"Los usuarios reportan que la app se congela intermitentemente al hacer scroll
en la lista de productos. Solo pasa con +500 items y en dispositivos Android
viejos. Necesito investigar a fondo antes de intentar arreglar."
```
**Por qué debería triggear:** "investigar a fondo antes de arreglar" = ANALYZE first. No es un debug simple.

**TE-08: Documentación de trabajo existente (trigger: retroactivo)**
```
"Ya hice un montón de cambios esta semana pero no documenté nada. Hay como 20
commits sin estructura. ¿Puedes ayudarme a organizar lo que hice y crear un
resumen para el equipo?"
```
**Por qué debería triggear:** Organizar trabajo retroactivo + documentar. Mapea a Phase 7.

**TE-09: Evaluación de tecnología (trigger: solution strategy)**
```
"Tenemos que elegir entre React Native, Flutter y Kotlin Multiplatform para la
app mobile. El equipo tiene experiencia en React pero el performance nos preocupa.
¿Cómo estructuro esta evaluación?"
```
**Por qué debería triggear:** Evaluación de alternativas = Phase 2: SOLUTION_STRATEGY.

**TE-10: Spec de feature (trigger: structure)**
```
"El producto quiere agregar un sistema de comentarios con threads, reactions y
menciones. Antes de que empiece a codear, necesito escribir una especificación
clara para que no haya malentendidos."
```
**Por qué debería triggear:** "especificación clara antes de codear" = Phase 4: STRUCTURE.

### SHOULD NOT TRIGGER (10 queries)

Near-misses que comparten keywords pero no necesitan PM:

**TE-11: Código directo con keywords PM**
```
"Escribe una función en Python que tome una lista de tareas con prioridades
y las ordene por fecha de vencimiento. Usa dataclasses."
```
**Por qué NO:** Aunque menciona "tareas" y "prioridades," es una tarea de coding puro. No necesita metodología PM.

**TE-12: Debug simple con contexto de proyecto**
```
"En mi proyecto de e-commerce, la función calcularTotal() en utils/cart.js
devuelve NaN cuando el carrito tiene descuentos. El error está en la línea 45."
```
**Por qué NO:** Debug puntual con ubicación exacta. No necesita análisis de proyecto ni descomposición.

**TE-13: Git operacional**
```
"Necesito hacer rebase de mi branch feature/auth-refactor sobre main. Hay 3
conflictos en src/auth/. ¿Me ayudas a resolverlos?"
```
**Por qué NO:** Operación git específica. No es planificación ni tracking.

**TE-14: Pregunta de conocimiento con keywords**
```
"¿Cuál es la diferencia entre análisis estático y análisis dinámico en testing?
¿Cuándo uso cada uno?"
```
**Por qué NO:** Aunque dice "análisis," es una pregunta de conocimiento, no de gestión de proyecto.

**TE-15: Refactoring inline**
```
"Renombra la variable 'data' a 'userProfile' en todos los archivos de
src/components/ y actualiza los imports."
```
**Por qué NO:** Refactoring mecánico. No necesita spec ni plan.

**TE-16: Code review simple**
```
"Revisa este PR que cambié el endpoint de login para usar bcrypt en vez de
md5. Son solo 15 líneas. ¿Se ve bien?"
```
**Por qué NO:** Review de código puntual, no gestión de proyecto.

**TE-17: Configuración de herramientas**
```
"Configura ESLint con las reglas de Airbnb para mi proyecto de React.
Agrega prettier también."
```
**Por qué NO:** Setup de tooling. No es planificación ni análisis.

**TE-18: Generación de datos**
```
"Genera 50 registros de prueba para la tabla usuarios con nombres, emails
y fechas de creación aleatorias en formato SQL."
```
**Por qué NO:** Generación de datos. Nada que ver con PM.

**TE-19: Explicación de código existente**
```
"¿Qué hace esta función? Es de un proyecto que heredé y no entiendo el
regex de la línea 23 en src/parsers/validator.js"
```
**Por qué NO:** Explicación de código. "Proyecto heredado" podría parecer PM pero la pregunta es de comprensión.

**TE-20: Deployment operacional**
```
"Despliega la versión v2.3.1 a producción. El dockerfile ya está listo,
solo falta hacer push al registry y actualizar el kubernetes manifest."
```
**Por qué NO:** Ejecución operacional. No necesita análisis ni planificación.

---

## Functional Evals (3 workflows)

### FE-01: Inicio de proyecto nuevo (workflow completo fases 1-3)

```
"Quiero crear un sistema de inventario para una tienda pequeña. Manejaría
productos, categorías, stock, y alertas cuando un producto está por agotarse.
La tienda tiene 2 empleados y unos 500 productos. Ayúdame a empezar."
```

**Expected output:**
- Empieza con Phase 1: ANALYZE (no salta a planificar)
- Crea o propone crear work package con timestamp
- Hace preguntas de análisis (requisitos, stakeholders, constraints)
- NO escribe código directamente

**Expectations:**
- Claude consulta el SKILL antes de actuar
- La respuesta menciona análisis/entender antes de planificar
- Se propone crear un work package
- No se salta a la implementación

### FE-02: Estado y siguiente paso (Phase 7 → siguiente)

```
"¿En qué punto estamos del proyecto? ¿Qué debería hacer ahora?"
```

**Expected output:**
- Lee focus.md y/o now.md
- Lee ROADMAP.md
- Reporta estado actual
- Sugiere siguiente paso basado en la fase actual

**Expectations:**
- Claude lee archivos de estado (no inventa)
- La respuesta es basada en datos reales del proyecto
- Sugiere una acción concreta

### FE-03: Descomposición de feature (Phases 4-5)

```
"Necesito agregar soporte multi-idioma a la aplicación. Los textos están
hardcodeados en español por todo el código. Hay unas 30 pantallas.
Descompón esto en tareas que pueda ir haciendo."
```

**Expected output:**
- Primero analiza el scope (Phase 4: STRUCTURE)
- Luego descompone en tareas con formato [T-NNN] (Phase 5: DECOMPOSE)
- Cada tarea referencia lo que resuelve
- Tareas son atómicas y con orden

**Expectations:**
- Tareas tienen IDs [T-NNN]
- Hay un orden lógico (no random)
- Las tareas son atómicas (no "implementar todo")
- Se sugiere guardar en plan.md o tasks.md

---

## Lo que NO testearemos ahora

- **Description optimization con run_loop.py** — Requiere `claude -p` CLI. Evaluar si está disponible en este entorno.
- **Blind comparison** — Requiere subagents. Evaluar después.
- **Benchmarking cuantitativo** — Requiere baseline. Primero verificar que los evals básicos pasan.

---

## Plan de ejecución

1. Documentar los 20 trigger evals + 3 functional evals en evals.json
2. Evaluar CLAUDE.md post-rewrite
3. Verificar references >300 líneas para TOC
4. Considerar description optimization si el entorno lo permite

---

**Última actualización:** 2026-03-28
