```yml
created_at: 2026-04-17 02:00:20
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Deep-Review: Escalabilidad y anclaje de methodology skills en thyrox/SKILL.md

## Objetivo

Analizar cómo los 29 methodology skills se anclan a los workflow stages THYROX, determinar cómo cambia la lógica de escalabilidad cuando hay un methodology skill activo, e identificar qué falta en las propuestas ya formuladas en `thyrox-skill-update-review.md`.

---

## A. Mapa de anclaje completo — 6 metodologías × workflow stages

Datos extraídos de los `**THYROX Stage:**` declarados en cada SKILL.md de metodología.

### Tabla maestra: methodology skill → workflow stage(s)

| Namespace | Skill | THYROX Stage(s) de anclaje |
|-----------|-------|---------------------------|
| `pdca:` | pdca-plan | Stage 3 DIAGNOSE (1er ciclo) · Stage 10 IMPLEMENT (ciclos subsiguientes) |
| `pdca:` | pdca-do | Stage 10 IMPLEMENT |
| `pdca:` | pdca-check | Stage 10 IMPLEMENT · Stage 11 TRACK/EVALUATE |
| `pdca:` | pdca-act | Stage 10 IMPLEMENT · Stage 12 STANDARDIZE |
| `dmaic:` | dmaic-define | Stage 3 DIAGNOSE |
| `dmaic:` | dmaic-measure | Stage 2 BASELINE |
| `dmaic:` | dmaic-analyze | Stage 3 DIAGNOSE |
| `dmaic:` | dmaic-improve | Stage 10 IMPLEMENT |
| `dmaic:` | dmaic-control | Stage 11 TRACK/EVALUATE · Stage 12 STANDARDIZE |
| `rup:` | rup-inception | Stage 1 DISCOVER · Stage 3 DIAGNOSE |
| `rup:` | rup-elaboration | Stage 5 STRATEGY · Stage 7 DESIGN/SPECIFY |
| `rup:` | rup-construction | Stage 10 IMPLEMENT |
| `rup:` | rup-transition | Stage 11 TRACK/EVALUATE · Stage 12 STANDARDIZE |
| `rm:` | rm-elicitation | Stage 1 DISCOVER · Stage 3 DIAGNOSE |
| `rm:` | rm-analysis | Stage 3 DIAGNOSE · Stage 5 STRATEGY |
| `rm:` | rm-specification | Stage 7 DESIGN/SPECIFY |
| `rm:` | rm-validation | Stage 9 PILOT/VALIDATE |
| `rm:` | rm-management | Stage 10 IMPLEMENT · Stage 11 TRACK/EVALUATE |
| `pm:` | pm-initiating | Stage 1 DISCOVER · Stage 3 DIAGNOSE |
| `pm:` | pm-planning | Stage 5 STRATEGY · Stage 6 SCOPE · Stage 7 DESIGN/SPECIFY |
| `pm:` | pm-executing | Stage 10 IMPLEMENT |
| `pm:` | pm-monitoring | Stage 11 TRACK/EVALUATE (paralelo con Stage 10 IMPLEMENT) |
| `pm:` | pm-closing | Stage 11 TRACK/EVALUATE · Stage 12 STANDARDIZE |
| `ba:` | ba-elicitation | Stage 1 DISCOVER · Stage 2 BASELINE |
| `ba:` | ba-strategy | Stage 3 DIAGNOSE · Stage 5 STRATEGY |
| `ba:` | ba-requirements-analysis | Stage 7 DESIGN/SPECIFY |
| `ba:` | ba-requirements-lifecycle | Stage 7 DESIGN/SPECIFY · Stage 10 IMPLEMENT (continuo) |
| `ba:` | ba-solution-evaluation | Stage 11 TRACK/EVALUATE · Stage 12 STANDARDIZE |
| `ba:` | ba-planning | Stage 5 STRATEGY · Stage 6 SCOPE |

### Vista inversa: workflow stage → methodology skills disponibles

| Workflow Stage | Skills disponibles |
|---------------|--------------------|
| Stage 1 DISCOVER | rup-inception · rm-elicitation · pm-initiating · ba-elicitation |
| Stage 2 BASELINE | dmaic-measure · ba-elicitation |
| Stage 3 DIAGNOSE | pdca-plan (1er ciclo) · dmaic-define · dmaic-analyze · rup-inception · rm-elicitation · rm-analysis · pm-initiating · ba-strategy |
| Stage 4 CONSTRAINTS | (ninguno) |
| Stage 5 STRATEGY | rup-elaboration · rm-analysis · ba-strategy · ba-planning · pm-planning |
| Stage 6 SCOPE | ba-planning · pm-planning |
| Stage 7 DESIGN/SPECIFY | rup-elaboration · rm-specification · ba-requirements-analysis · ba-requirements-lifecycle · pm-planning |
| Stage 8 PLAN EXECUTION | (ninguno) |
| Stage 9 PILOT/VALIDATE | rm-validation |
| Stage 10 IMPLEMENT | pdca-plan (ciclos subsiguientes) · pdca-do · pdca-check · pdca-act · dmaic-improve · rup-construction · rm-management · pm-executing · pm-monitoring · ba-requirements-lifecycle |
| Stage 11 TRACK/EVALUATE | pdca-check · pdca-act · dmaic-control · rup-transition · rm-management · pm-monitoring · pm-closing · ba-solution-evaluation |
| Stage 12 STANDARDIZE | pdca-act · dmaic-control · rup-transition · pm-closing · ba-solution-evaluation |

### Observaciones del mapa

1. **Stage 3 DIAGNOSE es el stage más denso**: 8 methodology skills pueden activarse aquí. Es el hub de convergencia — todas las metodologías tienen algo que decir sobre diagnóstico/definición del problema.

2. **Stage 4 CONSTRAINTS y Stage 8 PLAN EXECUTION están vacíos**: ningún methodology skill se ancla a ellos. Son stages propios del ciclo THYROX sin análogos en las metodologías externas.

3. **Stage 10 IMPLEMENT tiene la segunda mayor densidad**: 10 skills (con pdca-do, pdca-check, pdca-act, dmaic-improve, rup-construction, rm-management, pm-executing, pm-monitoring, ba-requirements-lifecycle, y pdca-plan en ciclos subsiguientes). Implica que la ejecución es donde más metodologías convergen.

4. **pdca-plan tiene anclaje dual por diseño**: en Stage 3 (primer ciclo) y Stage 10 (ciclos subsiguientes de mejora continua). El mismo skill opera en distintos contextos temporales dentro del WP.

5. **Stages 11 y 12 tienen coverage de todas las metodologías**: todas terminan en cierre/estandarización, lo cual es consistente con la naturaleza del ciclo THYROX.

---

## B. Lógica de escalabilidad actual vs lo que debería ser

### Lógica actual del SKILL.md (tabla micro/pequeño/mediano/grande)

```
| Micro    | 1, 10, 11        | Fix rápido, tarea puntual                         |
| Pequeño  | 1, 3, 10, 11     | Feature simple con análisis                       |
| Mediano  | 1, 3, 5, 6, 8, 10, 11 | Feature con estrategia y descomposición      |
| Grande   | 1–12 completo    | Proyecto complejo multi-sesión                    |
```

Esta tabla asume ciclo THYROX puro. Las preguntas que no responde:

**Pregunta 1: ¿Cómo cambia la selección de stages si hay `flow: dmaic`?**

Con `flow: dmaic` activo:
- Stage 3 DIAGNOSE no es "un stage": es el contenedor de 5 pasos DMAIC (define → measure → analyze → improve → control), distribuidos en múltiples stages (Stage 2, 3, 10, 11, 12).
- La recomendación de "pequeño: saltar Stage 3" ya no aplica — si el WP requiere DMAIC, Stage 3 es obligatorio Y tiene sub-pasos estructurados.
- La pregunta de escalabilidad pasa de "¿cuántos stages usar?" a "¿qué methodology skill activo y cuántos stages de THYROX necesita?"

**Pregunta 2: ¿Se puede saltar Stage 3 si hay methodology skill activo?**

No de forma simple. Si el methodology skill se ancla a Stage 3 (dmaic-define, dmaic-analyze, pdca-plan, etc.), saltar Stage 3 significa saltar el methodology skill entero. Lo que sí puede ocurrir: si la metodología activa no tiene steps en Stage 3 (ej: pdca en ciclos subsiguientes anclados a Stage 10), entonces Stage 3 puede saltarse.

**Pregunta 3: ¿El Stage 3 tiene sub-pasos cuando hay methodology skill activo?**

Sí, de facto. Cuando `flow: dmaic`, Stage 3 contiene:
- dmaic:define (sub-paso 1)
- dmaic:analyze (sub-paso 2)

Y dmaic:measure está en Stage 2 BASELINE. No son "Stage 3 expandido" — son stages THYROX distintos cubiertos por distintos pasos DMAIC. La metodología DMAIC se distribuye a través de los stages THYROX, no se colapsa en uno.

### Lógica que debería existir

La escalabilidad con methodology skills requiere un **eje adicional**: no solo "tamaño del WP" sino también "¿hay methodology skill activo?".

Propuesta de estructura lógica:

```
Dimensión 1 — Tamaño:       micro / pequeño / mediano / grande
Dimensión 2 — Metodología:  ninguna (THYROX puro) / flow activo (pdca/dmaic/rup/rm/pm/ba)
```

Los stages mínimos cambian según ambas dimensiones:

| Tamaño | Sin flow | Con flow — stages mínimos requeridos |
|--------|---------|---------------------------------------|
| Micro | 1, 10, 11 | Depende del flow: verificar qué stages cubre el primer step del flow |
| Pequeño | 1, 3, 10, 11 | Igual + stages que el flow ancle en Stage 3 |
| Mediano | 1, 3, 5, 6, 8, 10, 11 | Los stages donde el flow tiene steps = obligatorios; el resto = opcionales |
| Grande | 1–12 | Los stages donde el flow tiene steps tienen sub-pasos metodológicos; el resto = THYROX puro |

**Regla de precedencia:** si el flow activo ancla un step a un stage, ese stage no se puede saltar en la selección de escalabilidad.

---

## C. Patrón de convivencia: ¿workflow stage y methodology skill son excluyentes?

### Evidencia de los SKILL.md leídos

Los methodology skills **no son excluyentes** con el workflow stage — son complementarios. Evidencia:

1. `dmaic-define/SKILL.md` declara `**THYROX Stage:** Stage 3 DIAGNOSE` — esto significa que el methodology skill opera *dentro* del stage THYROX, no en lugar de él.

2. El workflow stage (`workflow-diagnose`) define el objetivo macro: "análisis profundo de causa raíz". El methodology skill define cómo lograrlo: "con DMAIC, el diagnóstico incluye VOC, CTQs, SIPOC, Project Charter aprobado por sponsor".

3. Los campos de `now.md` reflejan esto: `stage:` captura el nivel THYROX (Stage 3), mientras `flow:` y `methodology_step:` capturan el nivel metodológico (dmaic:define). Son capas, no alternativas.

### Conclusión sobre convivencia

`workflow-diagnose` + `dmaic-define` pueden (y deben) estar activos simultáneamente cuando el WP usa DMAIC. No son excluyentes. El workflow stage es el contenedor; el methodology skill es el contenido estructurado.

**Lo que NO existe documentado:**
- No hay indicación en ningún SKILL.md de methodology de si el `workflow-{stage}` skill debe invocarse primero, en paralelo, o si queda implícito.
- No hay regla sobre qué artefacto es el "producto" del stage en ese caso: ¿el artefacto del workflow-diagnose o el del methodology skill (ej: `dmaic-define.md`)?

---

## D. Lo que el SKILL.md debería decir: reglas de selección

Partiendo del análisis anterior, las reglas que el SKILL.md necesita articular (no existentes hoy):

### Regla 1 — Selección de methodology skill (cuándo activar)

```
Sin flow (THYROX puro):
→ Los 12 workflow stages son suficientes.
→ Cada stage produce artefactos propios según su cajón.

Con flow activo:
→ El flow define qué methodology skills se usan en qué stages.
→ Los stages donde el flow ancla steps son obligatorios (no saltables).
→ Los stages sin anclaje del flow siguen la lógica de escalabilidad normal.
```

### Regla 2 — Stages "no saltables" con flow activo

```
Identificar stages obligatorios = {stages donde el flow tiene al menos un skill anclado}

Ejemplo con flow: dmaic:
  Stage 2 — dmaic:measure anclado → obligatorio
  Stage 3 — dmaic:define + dmaic:analyze anclados → obligatorio
  Stage 10 — dmaic:improve anclado → obligatorio
  Stage 11/12 — dmaic:control anclado → obligatorio
  Stages 4, 6, 7, 8, 9 — sin anclaje dmaic → selección normal según tamaño
```

### Regla 3 — Artefactos con flow activo

```
Con flow activo, el artefacto primario del stage es el artefacto del methodology skill:
  Stage 3 con flow: dmaic → artefacto es `{wp}/dmaic-define.md`, no solo analyze/*.md
  Stage 10 con flow: pdca → artefacto es `{wp}/pdca-do.md`
  
El cajón THYROX sigue siendo el destino de almacenamiento.
```

### Regla 4 — Convivencia de capas

```
workflow stage = marco macro (objetivo del stage)
methodology skill = protocolo específico para lograr ese objetivo

Ambos activos simultáneamente. El state en now.md refleja ambas capas:
  stage: Stage 3 DIAGNOSE         ← capa THYROX
  flow: dmaic                      ← capa metodológica
  methodology_step: dmaic:define   ← paso actual en la metodología
```

---

## E. Gaps vs propuestas ya formuladas en `thyrox-skill-update-review.md`

### Propuestas del deep-review anterior (recap)

1. **Adición 1** — Nueva sección "Methodology skills" con tabla de namespaces y anclaje por workflow stage.
2. **Adición 2** — Nueva sección "Arquitectura de orquestación" explicando Nivel 1 (workflow stages) + Nivel 2 (methodology skills).
3. **Adición 3** — Subsección en "References por dominio" para entry point a methodology skills.

### Gaps no cubiertos por esas propuestas

#### Gap A — La tabla de anclaje de la propuesta está incompleta y parcialmente incorrecta

La tabla propuesta en `thyrox-skill-update-review.md` (líneas 117–124) declara:

```
| pdca: | Stage 3 DIAGNOSE / Stage 10 IMPLEMENT |
| dmaic: | Stage 3 DIAGNOSE |
| rup: | Stage 3 DIAGNOSE |
| rm: | Stage 1 / Stage 3 |
| pm: | Stages 1–10 |
| ba: | Stage 1 / Stage 3 |
```

Problemas vs el mapa real del presente análisis:

- **dmaic**: el anclaje es Stage 2 (dmaic:measure), Stage 3, Stage 10, Stage 11, Stage 12 — no solo Stage 3.
- **rup**: el anclaje incluye Stage 5, Stage 7, Stage 11, Stage 12 — no solo Stage 3.
- **rm**: el anclaje incluye Stage 5, Stage 7, Stage 9, Stage 10, Stage 11 — va mucho más allá de Stage 1/3.
- **pm**: "Stages 1–10" es impreciso; pm-monitoring también corre en Stage 11.
- **ba**: ba-planning ancla a Stage 5/6; ba-requirements-analysis a Stage 7; ba-solution-evaluation a Stage 11/12 — no solo Stage 1/3.

**Impacto: Alto.** La tabla resumida que llega al SKILL.md debe ser corregida antes de incluirse.

#### Gap B — La lógica de escalabilidad no está abordada en ninguna de las 3 propuestas

Las Adiciones 1, 2 y 3 son additive (nuevas secciones). Ninguna toca la tabla de escalabilidad existente (micro/pequeño/mediano/grande). El problema documentado en `thyrox-skill-problem-statement.md` (Capa B) no está cubierto por ninguna propuesta.

**Lo que falta:** una **Adición 4** que modifique o extienda la tabla de escalabilidad para contemplar el caso "WP con flow activo".

Opciones posibles:
- **Opción A**: Nota bajo la tabla actual explicando la dimensión `flow`. Simple, no rompe la tabla.
- **Opción B**: Segunda tabla "Escalabilidad con methodology skill activo". Más explícito, más extenso.
- **Opción C**: Sección dedicada "Escalabilidad con flow activo" en el reference de scalability.md. Desacoplada del SKILL.md principal.

Recomendación: Opción A en SKILL.md (nota breve) + Opción C en scalability.md (regla detallada). El SKILL.md señala, scalability.md explica.

#### Gap C — La regla de artefactos con flow activo no está documentada en ningún lugar

¿Cuando `flow: dmaic` está activo y se ejecuta Stage 3, cuál es el artefacto? ¿`analyze/{subdomain}/*.md`? ¿`{wp}/dmaic-define.md`? Los methodology skills declaran `{wp}/dmaic-define.md` como artefacto esperado (dmaic-define/SKILL.md, línea 194). Pero la tabla de artefactos en thyrox/SKILL.md no menciona esto.

**Impacto: Medio.** El usuario sin experiencia no sabe qué cajón usar ni qué artefacto produce el stage cuando hay flow activo.

#### Gap D — No hay regla sobre stages "no saltables" con flow activo

Las propuestas del deep-review anterior explican qué es un methodology skill y cómo se ancla, pero no articulan la regla de escalabilidad derivada: si el flow ancla un step a un stage, ese stage no se puede saltar.

**Impacto: Medio.** Sin esta regla, un usuario con WP "pequeño" + `flow: dmaic` podría intentar saltar Stage 2 (que dmaic:measure requiere).

---

## F. Veredicto: ¿son suficientes las propuestas del deep-review anterior?

**No son suficientes.** Las propuestas de `thyrox-skill-update-review.md` cubren la Capa A (documentación faltante) con las Adiciones 1, 2 y 3. Pero:

1. La **tabla de anclaje** propuesta en Adición 1 tiene errores de simplificación que deben corregirse antes de incluirla en el SKILL.md.
2. La **Capa B** (lógica de escalabilidad con methodology skills) no tiene propuesta concreta — es el gap de mayor impacto no cubierto.
3. La **regla de artefactos con flow activo** (Gap C) no está en ninguna propuesta.
4. La **regla de stages no saltables** (Gap D) no está en ninguna propuesta.

### Adiciones necesarias (incrementales a las ya propuestas)

| Adición | Qué cubre | Gap resuelto |
|---------|-----------|-------------|
| Adición 1 (corregir) | Tabla de anclaje completa y precisa (6 metodologías × todos sus stages) | Gap A |
| Adición 4 — nota en tabla escalabilidad | "Con flow activo: los stages con methodology steps son no-saltables" | Gap B + Gap D |
| Adición 5 — en tabla de artefactos | Fila indicando artefactos de methodology skills vs artefactos THYROX | Gap C |
| Adición 6 — en scalability.md | Sección "Escalabilidad con methodology skill activo" con regla detallada | Gap B extendido |

### Suficiencia de la Adición 2 (arquitectura de orquestación)

La propuesta de Adición 2 es correcta en su estructura (Nivel 1 / Nivel 2, campos de now.md). No necesita cambios de fondo. Puede absorber parte del Gap C si se agrega un ejemplo concreto del artefacto esperado.

---

## Resumen ejecutivo

| Aspecto | Estado |
|---------|--------|
| Mapa de anclaje (6 metodologías × stages) | Construido — ver Sección A |
| Stage más denso | Stage 3 DIAGNOSE (8 methodology skills) |
| Stages sin metodología | Stage 4 CONSTRAINTS · Stage 8 PLAN EXECUTION |
| Patrón de convivencia workflow + methodology | Complementarios, no excluyentes |
| Escalabilidad tabla actual | Incompleta para casos con flow activo |
| Propuestas anteriores cubren Capa A | Parcialmente (tabla de anclaje necesita corrección) |
| Propuestas anteriores cubren Capa B | No — Gap B, C y D sin propuesta concreta |
| Adiciones nuevas requeridas | 3 (Adición 4, 5, 6) + corrección de Adición 1 |
