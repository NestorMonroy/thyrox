```yml
type: Análisis
work_package: 2026-04-08-02-05-03-context-hygiene
created_at: 2026-04-08 02:05:03
purpose: Evaluar si es necesaria una Phase 0 de contexto de END USER antes de ANALYZE
```

# Análisis: ¿Es necesaria una Phase 0 — END USER CONTEXT?

## La propuesta

Añadir una Phase 0 antes de Phase 1 (ANALYZE) cuyo propósito es establecer:
1. Quién es el END USER real (no el developer, sino el beneficiario final)
2. La cadena de traducción de requisitos: END USER → capas → implementación
3. Las restricciones que suben desde las capas inferiores y cómo afectan lo que se puede prometer al END USER

---

## ¿Qué hace Phase 1 hoy con el END USER?

Phase 1 incluye "Stakeholders — ¿quiénes son los usuarios y qué necesitan?" como el **segundo ítem** de una lista de 8. Es una pregunta entre 7 más.

**El problema:** Stakeholders es un ítem secundario, no el punto de partida. Phase 1 puede ejecutarse sin que Claude haya identificado explícitamente quién se beneficia del trabajo ni qué promesas pueden hacerse dado el stack de restricciones debajo.

---

## La cadena de traducción aplicada a pm-thyrox

Para entender la propuesta, apliquémosla al meta-framework mismo:

```
NIVEL 0 — END USER
  "Necesito continuar trabajando en mi proyecto sin rehacer el contexto"
  "Quiero saber cuándo Claude va a parar y por qué"
  "Quiero que las decisiones que tomé ayer sigan vigentes hoy"

    ↓ traduce a

NIVEL 1 — USUARIO DE pm-thyrox (desarrollador usando Claude Code)
  "Necesito que focus.md/now.md estén actualizados al iniciar sesión"
  "Necesito un Stopping Point Manifest que me diga cuándo Claude para"
  "Necesito ADRs que persistan entre sesiones"

    ↓ traduce a

NIVEL 2 — pm-thyrox FRAMEWORK
  "Phase 7 debe actualizar los archivos de estado"
  "Phase 1 debe producir un Stopping Point Manifest"
  "context/decisions/ aloja ADRs permanentes"

    ↓ traduce a

NIVEL 3 — CLAUDE CODE PLATFORM
  "El Skill tool inyecta instrucciones en el contexto de cada sesión"
  "El Agent tool lanza subprocesos independientes"
  "Los archivos en el repo persisten; el contexto de Claude no"

    ↓ traduce a

NIVEL 4 — RESTRICCIONES DEL MODELO (equivalente al hardware)
  "Contexto máximo ~200k tokens — SKILL.md no puede ser infinito"
  "Sin memoria nativa entre sesiones — todo estado debe ir a archivos"
  "Context compaction ocurre — instrucciones al final del SKILL se pierden"
```

**Las restricciones suben:**

```
NIVEL 4: "Contexto limitado, sin memoria nativa"
    ↑
NIVEL 3: "Los archivos son el único estado persistente"
    ↑
NIVEL 2: "Phase 7 DEBE actualizar archivos — no es opcional"
    ↑
NIVEL 1: "Necesito que focus.md esté actualizado al iniciar"
    ↑
NIVEL 0: "No quiero rehacer el contexto en cada sesión"
```

Esto **explica exactamente** por qué context-hygiene es urgente: la restricción del hardware (sin memoria nativa) sube hasta el END USER como "tengo que reconstruir el estado manualmente cada sesión".

---

## ¿Phase 0 resuelve algo que Phase 1 no resuelve?

| Capacidad | Phase 1 actual | Con Phase 0 |
|-----------|---------------|------------|
| Identificar stakeholders | ✓ Segundo ítem de 8 | ✓ Punto de partida explícito |
| Mapear cadena de traducción | ✗ No existe | ✓ Artefacto específico |
| Trazar restricciones que suben | ✗ No sistemático | ✓ Explícito por nivel |
| Saber qué prometer al END USER dado el stack real | ✗ No cubre esto | ✓ Constrain propagation map |
| Trazar cada decisión hasta un requisito del END USER | ✗ Solo referencias a RC en Phase 3/4 | ✓ Desde Phase 0 |

**Gap real identificado:** Phase 1 analiza el PROBLEMA. Phase 0 establecería el CONTEXTO de quién tiene el problema y qué restricciones reales existen en cada capa. Son preguntas distintas.

---

## El riesgo de no tener Phase 0

**Análisis "en el vacío":** Claude analiza el problema técnico sin anclar quién se beneficia. Resultado: soluciones técnicamente correctas que no responden al END USER real.

**Ejemplo concreto de este proyecto:**
- TD-004 (SKILL.md tamaño) fue identificado como "deuda técnica técnica"
- Con Phase 0, se hubiera identificado como: "restricción de Nivel 4 que sube como 'instrucciones de Phase 6 se pierden por compactación' → afecta al END USER como 'Claude no aplica los gates correctamente'"
- La misma deuda, pero con trazabilidad completa hasta el END USER y urgencia correcta.

---

## ¿Phase 0 o Phase 1 mejorada?

### Opción A — Phase 0 separada (antes de ANALYZE)

```
Phase 0: CONTEXT
  Artefacto: *-context.md
  Produce: cadena END USER → niveles → restricciones
  Duración típica: 15-30 min

Phase 1: ANALYZE
  Artefacto: *-analysis.md
  Produce: análisis del problema específico
  (Con contexto de Phase 0 disponible)
```

**Pros:** Separación clara de concerns. Phase 0 es reusable entre WPs del mismo proyecto.
**Contras:** Overhead adicional. Para WPs pequeños, sería excesivo.

### Opción B — Phase 1 con Step 0 interno (preferida)

```
Phase 1: ANALYZE
  Step 0 (nuevo): Establecer END USER CONTEXT
    - ¿Quién es el END USER real? (no el developer, sino el beneficiario)
    - Cadena de traducción: END USER → niveles
    - Restricciones que suben desde los niveles inferiores
    - ¿Qué podemos prometer al END USER dado ese stack de restricciones?
  Steps 1-9: los existentes (análisis del problema)
```

**Pros:** No añade overhead para WPs pequeños. La escala ya maneja "micro/pequeño: solo step 0 rápido".
**Contras:** Phase 1 crece un poco más.

### Opción C — Solo para WPs Mediano/Grande

Añadir Phase 0 como fase explícita solo cuando el WP es Mediano o Grande, al igual que Phase 3, 4, 5 son opcionales para Micro/Pequeño.

---

## Aplicar la cadena al WP actual (context-hygiene)

**END USER real:** El desarrollador que arranca una sesión de Claude Code.

| Nivel | Actor | Necesidad | Restricción |
|-------|-------|---------|------------|
| 0 | Desarrollador | Continuar sin reconstruir contexto | — |
| 1 | Usuario pm-thyrox | focus.md/now.md actualizados | Debe abrir el archivo manualmente |
| 2 | pm-thyrox SKILL | Phase 7 actualiza archivos de estado | Phase 7 no lista qué archivos actualizar |
| 3 | Claude Code | Archivos persisten; contexto no | Sin memoria nativa entre sesiones |
| 4 | Modelo | Contexto limitado, sin estado | Context compaction, cold boot |

**Restricción que sube:** "Sin memoria nativa (Nivel 4) → archivos son el único estado (Nivel 3) → Phase 7 DEBE actualizar archivos (Nivel 2) → desarrollador necesita archivos actualizados (Nivel 1) → desarrollador puede continuar sin reconstruir (Nivel 0)."

**Lo que podemos prometer al END USER:** "Al iniciar sesión, focus.md/now.md/project-state.md siempre reflejan el estado real del proyecto." — Eso es exactamente lo que context-hygiene resuelve.

---

## Veredicto

**Sí — Phase 0 (o Step 0 dentro de Phase 1) es necesario**, por estas razones:

1. **Ancla el trabajo al END USER real** — previene análisis en el vacío
2. **Hace explícita la cadena de restricciones** — TD-004/TD-005 hubieran sido mejor priorizados si la cadena de restricciones hubiera estado mapeada
3. **Crea trazabilidad completa** — cada decisión en Phases 2-7 puede rastrearse hasta un requisito del END USER
4. **Permite comunicar honestamente** — "dada la restricción X, no puedo prometerte Y, pero sí Z"

**Formato recomendado: Opción B — Step 0 dentro de Phase 1**, escala con el tamaño del WP:

| Tamaño WP | Step 0 |
|-----------|--------|
| Micro | Identificar END USER en una línea. Sin cadena formal. |
| Pequeño | END USER + restricción principal que sube. Sin niveles intermedios. |
| Mediano | Cadena completa de traducción + restricciones que suben |
| Grande | Cadena completa + artefacto separado `*-context.md` |

**Artefacto para Mediano/Grande:** `*-context.md` con:
- END USER explícito
- Cadena de traducción por niveles
- Mapa de restricciones que suben
- Promesas que podemos y no podemos hacer al END USER

---

## Registro como nuevo ítem de work

Esto NO entra en context-hygiene — es un cambio metodológico que requiere su propio WP.

**Registrar como TD-007:** "Phase 1 Step 0 — END USER CONTEXT: establecer cadena de traducción de requisitos y mapa de restricciones antes de analizar el problema técnico."
