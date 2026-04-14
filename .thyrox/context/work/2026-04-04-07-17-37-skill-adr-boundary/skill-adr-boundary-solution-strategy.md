```yml
Tipo: Solution Strategy
Fase: 2 - SOLUTION_STRATEGY
WP: 2026-04-04-07-17-37-skill-adr-boundary
Fecha: 2026-04-04
```

# Solution Strategy — skill-adr-boundary

## Key Ideas (desde Phase 1)

1. **Boundary no existe:** No hay ningún texto en ningún archivo que diga explícitamente qué es SKILL vs qué es ADR.
2. **Haiku no infiere, necesita reglas atomicas:** La solución debe ser SI/NO, no narrativa.
3. **CLAUDE.md se lee primero:** Es el punto de entrada Level 2 — es el mejor lugar para el boundary primario.
4. **El stop hook es local:** No puede ser parte de la solución portátil.

---

## Flujos de decision

### Flujo 1 — Sesion con otro modelo: como procesa el repo y donde falla

```mermaid
flowchart TD
    A[Inicio de sesion] --> B{Lee CLAUDE.md?}

    B -->|Si| C{Boundary SKILL vs ADR\npresente?}
    B -->|No — SKILL tool no disponible\no modelo lo omite| D[Va directo a trabajar\nsin contexto de boundary]

    C -->|Hoy: no existe| E[Confusion posible\ndesde el inicio]
    C -->|Con solucion: tabla presente| F[Boundary claro antes\nde cualquier accion]

    E --> G{Activa SKILL.md?}
    F --> G
    D --> G

    G -->|Si| H{Step 8 Phase 1\nes claro?}
    G -->|No| I[Trabaja sin metodologia\nriesgo alto de artefactos incorrectos]

    H -->|Hoy: texto vago| J[Interpreta 'decision arquitectonica'\nde forma incorrecta]
    H -->|Con solucion: lista SI/NO| K[Decision correcta\nen cada caso]

    J --> L[Crea ADR donde no corresponde\no no lo crea cuando si corresponde]
    K --> M[Artefacto en lugar correcto]
    I --> L

    L --> N{Stop hook activo\nen esta maquina?}
    N -->|Si — ~/.claude/| O[Detecta archivos sin commit\nbloquea la sesion]
    N -->|No — otro entorno| P[Confusion pasa desapercibida\nse propaga al repo]

    O --> Q[Modelo debe corregir\nantes de continuar]
    M --> R[Sesion exitosa]
    P --> S[Deuda tecnica acumulada\nen el proyecto]
```

### Flujo 2 — Interaccion entre las 3 capas: no siempre se activan todas

```mermaid
flowchart TD
    START[Inicio sesion] --> C1{Capa 1: CLAUDE.md\nleido?}

    C1 -->|Si| C1OK[Boundary SKILL/ADR conocido]
    C1 -->|No| C1FAIL[Sin boundary\nmodelo trabaja a ciegas]

    C1OK --> C2{Capa 2: SKILL.md\nactivado?}
    C1FAIL --> C2

    C2 -->|Si, Capa 1 OK| BEST[Boundary + Trigger correcto\nriesgo minimo]
    C2 -->|Si, Capa 1 FAIL| MID1[Solo trigger operacional\nsin definicion de que es cada artefacto\nriesgo medio]
    C2 -->|No, Capa 1 OK| MID2[Solo boundary conceptual\nsin regla SI/NO en Phase 1\nriesgo medio]
    C2 -->|No, Capa 1 FAIL| HIGH[Sin boundary ni trigger\nriesgo alto de confusion]

    BEST --> C3{Modelo abre\nadr.md.template?}
    MID1 --> C3
    MID2 --> C3
    HIGH --> ERR[Confusion casi garantizada\nstop hook o usuario deben corregir]

    C3 -->|Si| C3OK[Campo Uso confirma\nla intencion del modelo]
    C3 -->|No — crea ADR de memoria| C3SKIP[Capa 3 no aporta\npero Capas 1 y 2 ya actuaron]

    C3OK --> COMMIT[Artefacto correcto]
    C3SKIP --> COMMIT
```

### Flujo 3 — Arbol de decision del modelo al documentar algo

Este flujo es no-lineal: hay ramas que regresan, ambiguedades que requieren consulta, y casos donde el modelo no puede decidir solo.

```mermaid
flowchart TD
    START[El modelo necesita\ndocumentar algo] --> Q1{Cambia COMO\nse trabaja en general\npara todos los proyectos?}

    Q1 -->|Si| SKILL[Modifica SKILL.md\nSolo si eres mantenedor\ndel framework]
    Q1 -->|No — es especifico a este proyecto| Q2{Es una decision permanente\nque afecta todos los WPs\nfuturos del proyecto?}

    Q2 -->|Si| Q3{Ya existe un ADR\nsobre este tema?}
    Q3 -->|Si| Q3EX[Actualizar ADR existente\nno crear uno nuevo]
    Q3 -->|No| Q4{Fue discutida con\nalternativas consideradas?}
    Q4 -->|Si| ADR[Crear ADR en\ncontext/decisions/adr-NNN.md]
    Q4 -->|No — se decidio sin analizar| BACK[Volver a Phase 2\ndocumentar alternativas primero]
    BACK --> Q4

    Q2 -->|No — es local al WP| Q5{Solo afecta\nel WP actual?}
    Q5 -->|Si| WPDOC[design.md o plan.md\ndel WP actual]
    Q5 -->|No — afecta mas de un WP\npero no es permanente| Q6{Es una convencion\nde nomenclatura, formato\no regla de estilo?}

    Q6 -->|Si| CONV[conventions.md\nen references/]
    Q6 -->|No| Q7{Es estado del proyecto\no de sesion actual?}

    Q7 -->|Si| CTX[project-state.md\nfocus.md / now.md]
    Q7 -->|No — no encaja en ninguna categoria| ASK[Consultar con el usuario\nantes de crear nuevo artefacto]
    ASK --> START
```

---

## Alternativas evaluadas

### Opcion A — Solo `adr-guide.md` (nueva referencia)

Crear `references/adr-guide.md` con reglas SI/NO y que SKILL.md lo referencie.

**Pros:**
- Separacion de concerns: SKILL.md no crece
- La guia puede tener ejemplos detallados

**Contras:**
- Haiku sigue un link solo si SKILL.md dice REQUERIDO — y actualmente no lo hace
- Requiere que el modelo lea un archivo extra bajo demanda
- No resuelve RC-001 (boundary statement) en el punto de entrada

**Veredicto:** Util como complemento, insuficiente como solucion primaria.

---

### Opcion B — Solo fix en SKILL.md (inline)

Reemplazar Step 8 de Phase 1 con reglas SI/NO. Agregar seccion "SKILL vs ADR" al inicio.

**Pros:**
- Todo en un archivo
- SKILL.md ya es el motor; Haiku lo lee

**Contras:**
- SKILL.md crece (ya es largo)
- La boundary statement llega tarde — SKILL.md se activa despues de CLAUDE.md
- No tiene efecto si el modelo no activa el SKILL correctamente

**Veredicto:** Necesario pero no suficiente como unica capa.

---

### Opcion C — Solo CLAUDE.md

Agregar seccion `## Boundary: SKILL vs ADR` a CLAUDE.md con 4-6 lineas de reglas atomicas.

**Pros:**
- CLAUDE.md se lee SIEMPRE, PRIMERO, por cualquier modelo
- Minima superficie de cambio
- Haiku no puede saltarse este punto de entrada

**Contras:**
- CLAUDE.md no puede tener todo el detalle de ejemplos
- No resuelve la ambiguedad del trigger en SKILL.md Phase 1

**Veredicto:** Mejor capa primaria, pero necesita apoyo en SKILL.md.

---

### Opcion D — Tres capas: CLAUDE.md + SKILL.md + adr.md.template — ELEGIDA

**Capa 1 — CLAUDE.md** (boundary primario, siempre leido):
- Nueva seccion `## SKILL vs ADR — Regla de uso` con tabla de 4 filas

**Capa 2 — SKILL.md Phase 1** (trigger operacional):
- Reemplazar Step 8 vago con lista SI/NO de 7 items concretos

**Capa 3 — adr.md.template** (artefacto auto-descriptivo):
- Agregar campo `Uso:` en frontmatter que diga "Solo para decisiones permanentes de arquitectura"

**Pros:**
- Tres puntos de contacto independientes — si Haiku falla en uno, los otros compensan
- RC-007 cumplido: cada capa usa formato atomico, no narrativa
- Cambios son aditivos — no rompe nada existente
- CLAUDE.md resuelve RC-001 y RC-003; SKILL.md resuelve RC-002; template resuelve RC-006

**Contras:**
- 3 archivos modificados en lugar de 1
- El campo `Uso:` en el template solo ayuda si el modelo lee el template antes de crear el ADR

**Veredicto:** Mejor cobertura con menor riesgo. Elegida.

---

## Decision arquitectonica

No crear `adr-guide.md`. La guia completa va inline en las capas existentes.
Un archivo extra que Haiku debe seguir mediante link introduce una dependencia fragil.
Toda regla que Haiku necesita debe estar en archivos que ya lee de forma garantizada.

---

## Diseno de cada capa (detalle)

### Capa 1 — CLAUDE.md: nueva seccion

Ubicacion: despues de `## Locked Decisions`, antes de `## Estructura`.

```markdown
## SKILL vs ADR — Regla de uso

|                  | SKILL.md                                    | ADR en context/decisions/                          |
|------------------|---------------------------------------------|----------------------------------------------------|
| Que es           | Instrucciones de metodologia (como trabajar) | Registro de decisiones tomadas (por que se eligio X) |
| Quien lo escribe | Mantenedor del framework                    | Claude durante Phase 1-2, cuando hay decision permanente |
| Cuando modificar | Solo si cambia la metodologia de gestion    | Al tomar una nueva decision arquitectonica del proyecto |
| Duracion         | Vive con el framework                       | Inmutable una vez aprobado                         |

REGLA: Si la duda es "documento esto en SKILL.md o en un ADR?":
- Cambia COMO se trabaja -> SKILL.md
- Registra POR QUE se eligio algo en el proyecto -> ADR
```

### Capa 2 — SKILL.md Phase 1 Step 8: trigger atomico

Reemplazar:
> "Si hay decision arquitectonica (cambio de stack tecnologico, adopcion de patron nuevo
> como microservicios o event-driven, o reemplazo de componente principal), crear ADR"

Por lista SI/NO:

```markdown
8. ADR: Crear en `context/decisions/adr-NNN.md` usando [adr.md.template](assets/adr.md.template) SOLO SI:
   - SI: cambio de stack tecnologico (lenguaje, DB, framework principal)
   - SI: adopcion de nuevo patron arquitectonico (microservicios, event-driven, CQRS)
   - SI: reemplazo de componente principal del sistema
   - SI: decision que afecta todos los work packages futuros
   - NO: convencion de naming, formato de archivo, template nuevo
   - NO: decision que solo afecta el WP actual
   - NO: cambios a la metodologia de gestion (eso va en SKILL.md)
```

### Capa 3 — adr.md.template: frontmatter auto-descriptivo

Agregar campo `Uso:` en el bloque YAML del template:

```yaml
Uso: Solo para decisiones arquitectonicas permanentes del PROYECTO (stack, patrones, componentes).
     NO usar para decisiones de metodologia — esas van en SKILL.md.
```

---

## Pre-design check

| Principio              | Se respeta?                                    |
|------------------------|------------------------------------------------|
| ADR-001 Markdown only  | Si — Todo en Markdown                          |
| ADR-008 Git as persist | Si — Cambios en archivos versionados           |
| ADR-010 ANALYZE first  | Si — Phase 1 completada antes                  |
| RC-007 Reglas atomicas | Si — Formato lista SI/NO, no narrativa         |
| Cambios aditivos       | Si — Secciones nuevas, no reemplazos de estructura |

---

## Post-design check

- La Capa 1 (CLAUDE.md) funciona sin que Haiku active el SKILL
- La Capa 2 (SKILL.md) funciona incluso si Haiku no lee CLAUDE.md
- La Capa 3 (template) es educativa, no critica
- Los tres cambios son independientes — pueden fallar individualmente sin romper los otros
- Los flujos 1-3 son verificables en texto plano sin herramientas externas

---

## Criterio de exito de esta fase

Arquitectura aprobada con 3 capas definidas, 3 flujos documentados, y pre/post-design check pasado.
