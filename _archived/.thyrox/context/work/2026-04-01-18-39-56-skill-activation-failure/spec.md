```yml
Tipo: Phase 2 — SOLUTION_STRATEGY
Work package: 2026-04-01-18-39-56-skill-activation-failure
Fecha: 2026-04-01
Status: draft
```

# Solution Strategy: SKILL Activation Failure + Haiku Compatibility

Problema raíz (Phase 1): El SKILL no se activa automáticamente en ningún modelo.
Problema secundario: Cuando se activa, los huecos implícitos hacen que Haiku
falle en múltiples puntos del flujo.

---

## 1. Key Ideas

### Idea 1: Dos problemas independientes, una solución coordinada

El fallo tiene dos capas que deben resolverse juntas:

- **Capa de activación** — El SKILL nunca se invoca (problema de CLAUDE.md)
- **Capa de instrucción** — Cuando se invoca, los huecos implícitos hacen fallar a Haiku (problema de SKILL.md)

Sonnet/Opus llenan los huecos solos. Haiku no puede. El objetivo es que ambas
capas funcionen sin depender de la capacidad de inferencia del modelo.

### Idea 2: CLAUDE.md como enforcement layer obligatorio

CLAUDE.md es el único archivo que **siempre se lee**. Debe ser donde se enforce
el uso del SKILL, no solo donde se menciona.

- Actual (mencionar): "Todo trabajo pasa por el SKILL" → ignorable
- Objetivo (enforcer): "ANTES de responder cualquier tarea: invocar Skill tool → pm-thyrox" → obligatorio

### Idea 3: Cada fase debe ser autocontenida

Una fase autocontenida tiene:
- **Entrada**: qué verificar antes de empezar
- **Pasos**: instrucciones atómicas (sin "cuando sea necesario", sin "si aplica")
- **Salida**: criterios verificables (no "hallazgos documentados" — eso es subjetivo)

Si el modelo necesita inferir para ejecutar un paso, ese paso fallará en Haiku.

### Idea 4: Templates son obligatorios, no sugestivos

Actual: "usar [template] como gate" → Haiku lo ignora (es sugerencia)
Objetivo: "REQUERIDO: completar [template] ANTES de avanzar" → no negociable

### Idea 5: Mecanismo de activación dual (push + pull)

- **Push** (ya existe): usuario escribe `/pm-thyrox` → Skill tool activa metodología
- **Pull** (no existe): CLAUDE.md instruye al modelo invocar Skill tool al recibir cualquier tarea

---

## 2. Research

### Unknown 1: ¿Cómo hacer que CLAUDE.md active el SKILL automáticamente?

**Alternativas:**

**Opción A: Instrucción directa + lenguaje fuerte en CLAUDE.md**
- Agregar "SIEMPRE invocar Skill tool → pm-thyrox ANTES de trabajar"
- Pros: Simple, no duplica contenido, aprovecha Skill tool existente
- Cons: Modelos menos capaces pueden no ejecutar el Skill tool correctamente

**Opción B: Incrustar flujo de 7 fases inline en CLAUDE.md (sin Skill tool)**
- Duplicar las fases directamente en CLAUDE.md
- Pros: Funciona con cualquier modelo, sin dependencia del Skill tool
- Cons: Duplica contenido, mantenimiento doble, CLAUDE.md se vuelve muy largo

**Opción C: Startup hook que inyecta recordatorio al inicio de sesión**

Investigación: Claude Code soporta hooks tipo `session_start` configurables en settings.json.
El proyecto ya tiene infraestructura de hooks: `validate-session-close.sh` (cierre de sesión)
y `commit-msg-hook.sh` (pre-commit). Un hook de apertura sería el complemento natural.

Mecanismo: crear `session-start.sh` que imprime al contexto:
```
=== PM-THYROX ACTIVO ===
ANTES de cualquier tarea: invocar Skill tool → pm-thyrox
Si no disponible: leer .claude/skills/pm-thyrox/SKILL.md
Work package activo: [detectar automáticamente]
=========================
```
- Pros: Se ejecuta automáticamente en cada sesión sin depender de CLAUDE.md ni del usuario;
  complementa cualquier otra opción; ya existe infraestructura de hooks en el proyecto
- Cons: Solo actúa al inicio — si la sesión ya está corriendo, no reinyecta el recordatorio;
  requiere configurar settings.json además de crear el script

**Opción D: Combinar A + C + fallback inline (triple capa)**
- CLAUDE.md con lenguaje fuerte (capa de texto)
- Startup hook (capa de ejecución automática)
- Fallback inline "Si Skill tool no disponible, leer SKILL.md" (capa de respaldo)
- Pros: Máxima robustez — falla una capa, las otras dos cubren
- Cons: Más componentes a mantener

**Decisión**: Opción D
Razón: Las 3 capas son independientes entre sí. Cada una cubre el fallo de las otras.
CLAUDE.md cubre texto; hook cubre inicio de sesión; fallback cubre modelos que no ven el hook.

---

### Unknown 2: ¿Cuáles son TODOS los huecos implícitos del SKILL que Haiku no llena?

Inventario completo por fase:

#### Phase 1 — Huecos

**Hueco 1.1**: "Investigar requisitos, stakeholders, constraints y contexto"
- Haiku: no sabe qué preguntar, cuándo parar, qué formato usar
- Fix: Listar los 8 aspectos concretos directamente en Phase 1

**Hueco 1.2**: "Si hay decisiones arquitectónicas, crear ADR"
- Haiku: no sabe cuándo aplica — puede omitirlo siempre
- Fix: Definir explícitamente: cambio de stack, adopción de patrón nuevo, reemplazo de componente

**Hueco 1.3**: "Documentar hallazgos en work/.../analysis/" — ¿qué estructura?
- Haiku: crea un archivo libre o no crea nada
- Fix: "REQUERIDO: crear analysis/introduction.md usando [introduction.md.template]"

**Hueco 1.4**: "Salir cuando: Los hallazgos están documentados y aprobados"
- "Documentados" es subjetivo. Haiku puede declarar Phase 1 completa con 2 líneas
- Fix: Exit criteria verificable: "introduction.md existe Y no tiene [NEEDS CLARIFICATION]"

#### Phase 2 — Huecos

**Hueco 2.1**: No dice "leer solution-strategy.md PRIMERO"
- Haiku: empieza sin leerlo, usa estructura inventada
- Fix: Agregar como PASO 0 explícito: "Leer [solution-strategy](references/solution-strategy.md) ANTES de empezar (REQUERIDO)"

**Hueco 2.2**: "Key Ideas — definir conceptos centrales" — ¿a partir de qué?
- Haiku: puede inventar ideas sin basarse en Phase 1
- Fix: "Basarse en los hallazgos de work/.../analysis/ para definir Key Ideas"

#### Phase 3 — Huecos

**Hueco 3.1**: "Verificar que el work package existe (creado en Phase 1)"
- Haiku: no sabe cómo verificar
- Fix: "Verificar: `ls context/work/` — si no existe, volver a Phase 1"

#### Phase 4 — Huecos

**Hueco 4.1**: "Usar spec-quality-checklist.md.template como gate"
- "Como gate" es débil. Haiku lo ignora
- Fix: "REQUERIDO: completar [spec-quality-checklist.md.template] antes de Phase 5. No avanzar si hay items sin ✓"

**Hueco 4.2**: Sin exit criteria verificable
- Fix: "spec.md existe Y no tiene marcadores [NEEDS CLARIFICATION]"

#### Phase 5 — Huecos

**Hueco 5.1**: "Leer spec.md del work package" — ¿cuál work package activo?
- Haiku: puede no saber cuál es el work package activo
- Fix: "Leer el work package activo: el directorio más reciente en context/work/"

#### Phase 6 — Huecos

**Hueco 6.1**: "Tomar siguiente tarea sin bloqueos" — ¿de dónde?
- Haiku: no sabe de dónde tomar tareas
- Fix: "Leer work/.../plan.md y tomar la primera tarea `- [ ] [T-NNN]` sin bloqueos"

**Hueco 6.2**: "Si falla, crear ERR-NNN antes de reintentar"
- No dice qué poner dentro, no menciona error-report.md.template
- Fix: "Crear context/errors/ERR-NNN-descripcion.md usando [error-report.md.template]"

**Hueco 6.3**: Numeración duplicada (dos pasos "4" en Phase 6)
- Confunde a Haiku sobre cuántos pasos hay
- Fix: Renumerar correctamente 1→6

#### Escalabilidad — Hueco transversal

**Hueco E.1**: "Trabajos <2h usan fases 1, 2, 6, 7" — ¿qué significa "usar"?
- Haiku: ¿saltarlas? ¿hacerlas igual? ¿combinarlas?
- Fix: Tabla explícita con qué hacer en cada tamaño de trabajo

---

### Unknown 3: ¿Qué nivel de explicitez necesita SKILL.md para Haiku sin romper Sonnet/Opus?

**skill-authoring.md — Principio "Grados de Libertad":**

> "Baja Libertad (Scripts específicos, pocos parámetros): Usar cuando operaciones son
> frágiles, consistencia es crítica, secuencia específica debe seguirse"

> "Si planeas usar el skill con múltiples modelos, apunta a instrucciones que funcionen
> bien con todos. Claude Haiku: ¿El skill da suficiente guía?"

El SKILL actual está en "Alta Libertad" (instrucciones basadas en texto, heurísticas).
Las transiciones entre fases y los pasos críticos necesitan "Baja Libertad" para Haiku.

**Tensión real**: "Conciso es Clave" vs "Haiku necesita más guía"

Resolución via **Progressive Disclosure** (skill-authoring.md):
- SKILL.md <500 líneas (conciso para Sonnet/Opus)
- Cada paso crítico usa lenguaje "Baja Libertad" (REQUERIDO, SIEMPRE, NO)
- El contenido dentro de cada fase puede quedar en "Alta Libertad"
- Los GATES entre fases deben ser "Baja Libertad" explícitos

**Lo que cambia concretamente (lenguaje):**

| Actual (Alta Libertad) | Objetivo (Baja Libertad para gates) |
|------------------------|-------------------------------------|
| "usar [template] como guide" | "REQUERIDO: usar [template]. No avanzar sin él" |
| "si hay decisiones arquitectónicas" | "Decisión arquitectónica = cambio de stack / patrón nuevo / reemplazo de componente" |
| "Salir cuando: hallazgos documentados" | "Salir cuando: introduction.md existe Y sin [NEEDS CLARIFICATION]" |
| "Tomar siguiente tarea" | "Leer plan.md. Tomar primera `- [ ] [T-NNN]` sin dependencias pendientes" |
| "cuando se necesite profundidad" | Eliminar — deja la decisión al modelo; reemplazar con criterio específico |

**Conclusión**: No reescribir todo. Aplicar "Baja Libertad" SOLO en:
1. Los gates de entrada/salida de cada fase
2. Las referencias a templates (de sugestivas a REQUERIDO)
3. Las condiciones ambiguas ("si aplica", "cuando sea necesario")

El contenido de análisis dentro de cada fase puede quedarse en "Alta Libertad" —
ahí sí queremos que el modelo use criterio.

**Riesgo de degradación para Sonnet/Opus — documentado y mitigado:**

skill-authoring.md confirma: instrucciones más explícitas benefician a todos los modelos.
Sin embargo, documentamos las salvaguardas concretas:

| Salvaguarda | Detalle |
|-------------|---------|
| Baseline conocido | Evals actuales: 40/40 (100%) con Sonnet antes de cualquier cambio |
| Test incremental | Re-ejecutar `bash scripts/run-functional-evals.sh` después de cada tarea T-NNN |
| Criterio de degradación | Si cualquier eval baja de 100% → revertir ese cambio, diagnosticar |
| Cambios aditivos | No eliminar texto existente — solo agregar/fortalecer lenguaje |
| Revisión manual | Verificar que cada "REQUERIDO:" no restrinja casos que Sonnet/Opus manejaban bien |

Los cambios de "Alta Libertad" → "Baja Libertad" aplican SOLO a gates y referencias
a templates. El contenido de análisis queda en "Alta Libertad" — ahí Sonnet/Opus
sigue usando criterio propio, sin restricción.

---

### Unknown 4: ¿Hay inconsistencias adicionales a corregir?

**examples.md desactualizado**:
- Usa nomenclatura diferente: Phase 1=PLAN, Phase 3=DECOMPOSE (vs. ANALYZE, PLAN actual)
- Haiku que lea examples.md aprende un flujo incorrecto
- Decisión: fuera de scope de esta iteración. Crear issue separado.

---

## 3. Pre-design check

| Locked Decision | ¿Respetada? | Nota |
|----------------|-------------|------|
| ANALYZE first | ✓ | No cambia |
| Markdown only | ✓ | Solo cambios en .md |
| Git as persistence | ✓ | No se crean backups |
| Single skill | ✓ | No se crean skills nuevos |
| Conventional Commits | ✓ | No cambia |
| Work packages with timestamp | ✓ corregido | Renombrado con timestamp real |

Sin violaciones. Seguir.

---

## 4. Decisions

### Decisión 1: Triple capa de activación (CLAUDE.md + hook + fallback)

**Capa 1 — CLAUDE.md con lenguaje fuerte:**

```markdown
## Flujo de sesión — OBLIGATORIO

SIEMPRE seguir este flujo antes de trabajar en cualquier tarea:

1. **Inicio** — Leer focus.md + now.md + ROADMAP.md
2. **Activar SKILL** — Invocar Skill tool → pm-thyrox ANTES de responder cualquier tarea.
   Si el Skill tool no está disponible: leer SKILL.md completo y seguirlo paso a paso.
3. **Identificar fase activa** — Revisar context/work/:
   - Hay work package activo → continuar en la fase donde quedó
   - No hay work package → empezar Phase 1: ANALYZE
4. **Trabajar** — Seguir cada fase hasta su exit criteria. NO saltarse fases.
5. **Cierre** — Actualizar focus.md + now.md
```

**Capa 2 — Startup hook (`session-start.sh`):**
- Crear `.claude/skills/pm-thyrox/scripts/session-start.sh`
- Configurar en settings.json como hook `SessionStart`
- El script detecta work package activo y lo inyecta como contexto de inicio
- Complemento de `validate-session-close.sh` que ya existe

**Capa 3 — Fallback inline (ya incluido en Capa 1)**

**Justificación**: 3 capas independientes. Una puede fallar, las otras 2 cubren.
Basado en: Unknown 1 Opción D + infraestructura de hooks ya existente en el proyecto.

---

### Decisión 2: SKILL.md — aplicar "Baja Libertad" en gates, "Alta Libertad" en contenido

**Principio** (de skill-authoring.md):
- Gates entre fases = "Baja Libertad" (secuencia específica, no negociable)
- Contenido de análisis dentro de cada fase = "Alta Libertad" (criterio del modelo)

**Cambios por fase — solo los gates y puntos de decisión críticos:**

**Phase 1:**
- "Investigar requisitos..." → listar los 8 aspectos (gate de entrada explícito) (H1.1)
- "Si hay decisiones arquitectónicas" → definir con 3 ejemplos concretos (H1.2)
- Referencia a introduction.md.template: sugestiva → `REQUERIDO:` (H1.3)
- Exit criteria: "hallazgos documentados" → "introduction.md existe Y sin [NEEDS CLARIFICATION]" (H1.4)

**Phase 2:**
- Agregar PASO 0 (gate de entrada): "REQUERIDO: leer [solution-strategy](references/solution-strategy.md) antes de empezar" (H2.1)
- Key Ideas: aclarar que se basan en analysis/ de Phase 1 (H2.2)

**Phase 3:**
- Gate de verificación: `ls context/work/` — si no existe, volver a Phase 1 (H3.1)

**Phase 4:**
- "como gate" → "REQUERIDO: completar antes de Phase 5. NO avanzar sin ✓ completo" (H4.1)
- Exit criteria verificable: spec.md existe Y sin [NEEDS CLARIFICATION] (H4.2)

**Phase 5:**
- Work package activo: "el directorio más reciente en context/work/" (H5.1)

**Phase 6:**
- Fuente de tareas: "Leer plan.md. Tomar primera `- [ ] [T-NNN]` sin dependencias" (H6.1)
- ERR-NNN: ruta exacta + template específico (H6.2)
- Corregir numeración duplicada (H6.3)

**Escalabilidad:**
- Tabla explícita: tamaño → fases activas → qué omitir (HE.1)

---

### Decisión 3: Work package — Phase 1 es la única fuente de verdad

- Phase 1: "Crear work package" → ya está, es correcto
- Phase 3: cambiar a "Verificar que existe el work package creado en Phase 1"
- Tabla de artefactos: sin cambios (Phase 1 → Work package ya está correcto)

---

### Decisión 4: examples.md — fuera de scope, deuda técnica

No bloquea el problema principal. Documentar como pendiente para siguiente iteración.

---

### Decisión 5: NO reescribir SKILL.md completamente

Cambios quirúrgicos y aditivos. Evals actuales: 40/40 (100%).
Cambios mínimos = riesgo mínimo de romper lo que funciona.

---

## 5. Post-design re-check

### Huecos de Haiku cubiertos

| Hueco | Decisión | Cerrado |
|-------|----------|---------|
| SKILL no se activa | D1: CLAUDE.md obligatorio | ✓ |
| H1.1: qué investigar en Phase 1 | D2: 8 aspectos explícitos | ✓ |
| H1.2: cuándo crear ADR | D2: definición explícita | ✓ |
| H1.3: qué crear en analysis/ | D2: REQUERIDO + template | ✓ |
| H1.4: exit criteria vago | D2: criterio verificable | ✓ |
| H2.1: no lee solution-strategy | D2: PASO 0 explícito | ✓ |
| H2.2: Key Ideas sin base | D2: referencia a analysis/ | ✓ |
| H3.1: verificación de WP vaga | D2+D3: cómo verificar | ✓ |
| H4.1: template sugestivo | D2: REQUERIDO | ✓ |
| H4.2: exit criteria vago | D2: criterio verificable | ✓ |
| H5.1: WP activo ambiguo | D2: cómo identificarlo | ✓ |
| H6.1: de dónde tomar tareas | D2: plan.md explícito | ✓ |
| H6.2: ERR-NNN vago | D2: ruta + template | ✓ |
| H6.3: numeración duplicada | D2: corrección | ✓ |
| HE.1: escalabilidad ambigua | D2: tabla explícita | ✓ |
| examples.md desactualizado | D4: fuera de scope | ⚠ deuda |

### Comportamiento esperado de Haiku después de los cambios

- ✓ Activa el SKILL por instrucción en CLAUDE.md (no por inferencia)
- ✓ Crea work package en Phase 1 con timestamp real
- ✓ Usa introduction.md.template (REQUERIDO, no sugestión)
- ✓ Verifica exit criteria antes de avanzar de fase
- ✓ Lee solution-strategy.md antes de empezar Phase 2
- ✓ Sabe de dónde tomar tareas en Phase 6
- ✓ Documenta errores con el template correcto

### Riesgos residuales

- **Riesgo 1**: Cambios en CLAUDE.md afectan sesiones activas
  → Mitigación: Cambios aditivos, no destructivos

- **Riesgo 2**: SKILL.md más verboso usa más tokens de contexto
  → Mitigación: ~50 líneas adicionales en ~200 actuales — aceptable

- **Riesgo 3**: examples.md sigue confundiendo (fuera de scope)
  → Mitigación: Deuda técnica documentada, no bloquea el fix principal

---

## Artefactos a modificar

```
Cambiar:
  .claude/CLAUDE.md                                      ← D1 capa 1: lenguaje fuerte
  .claude/skills/pm-thyrox/SKILL.md                      ← D2+D3: gates Baja Libertad
  .claude/skills/pm-thyrox/scripts/session-start.sh      ← D1 capa 2: NUEVO startup hook
  settings.json (o .claude/settings.json)                ← D1 capa 2: configurar hook SessionStart

Fuera de scope:
  .claude/skills/pm-thyrox/references/examples.md        ← D4: deuda técnica
```

---

## Phase 4: STRUCTURE

### Requisitos Funcionales

| ID | Requisito | Criterio de aceptación (AC) |
|----|-----------|----------------------------|
| R-1 | CLAUDE.md instruye invocar Skill tool antes de cualquier tarea | "Skill tool → pm-thyrox" aparece en flujo de sesión con lenguaje imperativo |
| R-2 | CLAUDE.md tiene fallback explícito para cuando el Skill tool no está disponible | Texto "Si el Skill tool no está disponible: leer SKILL.md" presente |
| R-3 | Startup hook se ejecuta al inicio de cada sesión | settings.json tiene hook SessionStart; session-start.sh existe y es ejecutable |
| R-4 | Phase 1 del SKILL lista los 8 aspectos de análisis explícitamente | No contiene "Investigar requisitos" sin detallar; lista 8 ítems nombrados |
| R-5 | Phase 1 define cuándo crear un ADR (3 criterios concretos) | Texto contiene ≥ 3 ejemplos de qué es una decisión arquitectónica |
| R-6 | introduction.md.template es REQUERIDO en Phase 1, no sugestivo | Contiene "REQUERIDO" en la referencia al template |
| R-7 | Phase 1 tiene exit criteria verificable (no subjetivo) | Exit criteria menciona "introduction.md" como artefacto verificable |
| R-8 | Phase 2 lee solution-strategy.md como PASO 0 explícito | Primer paso de Phase 2 contiene "REQUERIDO" y link a solution-strategy |
| R-9 | Phase 3 verifica existencia del work package con instrucción concreta | Contiene instrucción de verificar context/work/ |
| R-10 | spec-quality-checklist es REQUERIDO antes de avanzar a Phase 5 | Contiene "REQUERIDO: completar" y "NO avanzar" en Phase 4 |
| R-11 | Phase 5 identifica work package activo de forma determinista | Define "work package activo = más reciente en context/work/" |
| R-12 | Phase 6 especifica fuente de tareas (plan.md) | Contiene "Leer plan.md" o equivalente explícito |
| R-13 | Phase 6 especifica cómo crear ERR-NNN con template | Contiene ruta context/errors/ y referencia a error-report.md.template |
| R-14 | Phase 6 tiene numeración de pasos sin duplicados | Pasos 1,2,3,4,5,6 sin repetición |
| R-15 | Escalabilidad tiene tabla explícita de tamaño → fases activas | Existe tabla o lista estructurada con al menos 3 tamaños de trabajo |
| R-16 | Evals pasan al 100% después de todos los cambios | run-functional-evals.sh reporta ≥ 40/40 |

### Requisitos No Funcionales

| ID | Requisito |
|----|-----------|
| RNF-1 | SKILL.md no supera 500 líneas después de los cambios (progressive disclosure) |
| RNF-2 | Ningún cambio elimina texto existente que funciona — solo agregar/fortalecer |
| RNF-3 | Cada "REQUERIDO:" no restringe casos válidos que Sonnet/Opus manejaban correctamente |

### Design: cambios exactos por archivo

#### CLAUDE.md — T-001

Sección a reemplazar: "Flujo de sesión"

```markdown
## Flujo de sesión — OBLIGATORIO

SIEMPRE seguir este flujo. NO omitir pasos.

1. **Inicio** — Leer focus.md + now.md + ROADMAP.md
2. **Activar SKILL** — ANTES de responder cualquier tarea:
   invocar Skill tool → pm-thyrox.
   Si el Skill tool no está disponible: leer SKILL.md completo y seguirlo paso a paso.
3. **Identificar fase activa** — Revisar context/work/:
   - Hay work package con work en curso → continuar en la fase donde quedó
   - No hay work package activo → empezar Phase 1: ANALYZE
4. **Trabajar** — Seguir cada fase hasta su exit criteria. NO saltarse fases.
5. **Cierre** — Actualizar focus.md + now.md
```

#### session-start.sh — T-002

Nuevo archivo: `.claude/skills/pm-thyrox/scripts/session-start.sh`

```bash
#!/usr/bin/env bash
# session-start.sh — SessionStart hook para Claude Code
# Inyecta contexto de activación del SKILL al inicio de cada sesión.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && cd .. && pwd)"
CONTEXT_DIR="${PROJECT_ROOT}/.claude/context"

# Detectar work package activo (más reciente en context/work/)
ACTIVE_WP=""
if [ -d "${CONTEXT_DIR}/work" ]; then
    ACTIVE_WP=$(ls -1t "${CONTEXT_DIR}/work" 2>/dev/null | head -1)
fi

echo ""
echo "=== PM-THYROX — ACTIVAR SKILL ANTES DE TRABAJAR ==="
echo ""
echo "  REQUERIDO: Invocar Skill tool → pm-thyrox"
echo "  Si no disponible: leer .claude/skills/pm-thyrox/SKILL.md"
echo ""
if [ -n "$ACTIVE_WP" ]; then
    echo "  Work package activo: context/work/${ACTIVE_WP}/"
    # Detectar phase actual desde now.md
    if [ -f "${CONTEXT_DIR}/now.md" ]; then
        PHASE=$(grep "^phase:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/phase: *//')
        [ -n "$PHASE" ] && echo "  Fase actual: ${PHASE}"
    fi
else
    echo "  Sin work package activo → empezar Phase 1: ANALYZE"
fi
echo ""
echo "===================================================="
echo ""
```

#### settings.json — T-003

Agregar hook `SessionStart` apuntando a `session-start.sh`.

Verificar si ya existe `.claude/settings.json` o `settings.json` en raíz.
Agregar (o crear) entrada:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "bash .claude/skills/pm-thyrox/scripts/session-start.sh"
      }
    ]
  }
}
```

#### SKILL.md — T-004 a T-010

**T-004 — Phase 1** (cambios quirúrgicos):

1. Reemplazar paso 1 actual:
   - De: `"Investigar requisitos, stakeholders, constraints y contexto"`
   - A: lista de 8 aspectos: objetivo/por qué, stakeholders, uso operacional, atributos de calidad, restricciones, contexto/sistemas vecinos, fuera de alcance, criterios de éxito

2. Paso 4 (ADR): agregar criterio — "Decisión arquitectónica = cambio de stack tecnológico, adopción de patrón nuevo (microservicios, event-driven, etc.), o reemplazo de componente principal"

3. Línea de introduction.md.template: agregar `REQUERIDO:` antes de "usar"

4. Exit criteria: reemplazar "hallazgos documentados" por "analysis/introduction.md existe Y no contiene [NEEDS CLARIFICATION]"

**T-005 — Phase 2**:
- Insertar como primer ítem (antes de Key Ideas):
  `0. REQUERIDO: Leer [solution-strategy](references/solution-strategy.md) antes de empezar esta fase. Key Ideas deben basarse en los hallazgos de work/.../analysis/`

**T-006 — Phase 3**:
- En paso 2 (verificar work package): agregar "Si no existe → volver a Phase 1"

**T-007 — Phase 4**:
- Cambiar "Usar [spec-quality-checklist.md.template] como gate" →
  "REQUERIDO: Completar [spec-quality-checklist.md.template] ANTES de Phase 5. NO avanzar si hay ítems sin ✓"
- Exit criteria: agregar "spec.md no contiene [NEEDS CLARIFICATION]"

**T-008 — Phase 5**:
- En paso 1: agregar "Work package activo = directorio más reciente en context/work/"

**T-009 — Phase 6**:
- Paso 1: cambiar "Tomar siguiente tarea sin bloqueos" → "Leer work/.../plan.md. Tomar la primera tarea `- [ ] [T-NNN]` sin dependencias pendientes"
- Paso 2: cambiar "crear ERR-NNN" → "crear context/errors/ERR-NNN-descripcion.md usando [error-report.md.template](assets/error-report.md.template)"
- Corregir numeración: renumerar los pasos 1-6 sin duplicados

**T-010 — Escalabilidad** (sección existente o nueva):
```markdown
| Tamaño | Fases activas | Qué omitir |
|--------|--------------|------------|
| <30 min (hotfix) | 6, 7 | Fases 1-5 |
| 30 min – 2h (fix pequeño) | 1, 2, 6, 7 | Fases 3, 4, 5 |
| 2h – 8h (feature) | 1, 2, 3, 4, 5, 6, 7 | Ninguna |
| 8h+ (proyecto) | 1, 2, 3, 4, 5, 6, 7 (rigurosas) | Ninguna |
```

### Spec Quality Checklist

**Completitud:**
- [x] Todos los requisitos funcionales documentados (R-1 a R-16)
- [x] Requisitos no funcionales identificados (RNF-1 a RNF-3)
- [x] Criterios de aceptación definidos y medibles por tarea
- [x] Scope delimitado (qué incluye: CLAUDE.md, SKILL.md, session-start.sh, settings.json — qué excluye: examples.md)
- [x] Dependencias identificadas (T-003 depende de T-002; T-011 depende de T-004 a T-010)
- [x] Assumptions documentadas (evals actuales = 40/40 como baseline)

**Claridad:**
- [x] Cada requisito es específico (R-4: "lista 8 ítems nombrados", no "sea más claro")
- [x] Sin términos ambiguos sin definir
- [x] Cada requisito tiene un solo significado posible
- [x] Zero [NEEDS CLARIFICATION] markers

**Consistencia:**
- [x] Requisitos no se contradicen
- [x] Terminología consistente (Baja Libertad = gates; Alta Libertad = contenido)
- [x] Alineado con Locked Decisions de CLAUDE.md

**Medibilidad:**
- [x] Cada criterio de aceptación es verificable (grep, ls, conteo de líneas)
- [x] T-016/R-16: run-functional-evals.sh ≥ 40/40 es objetivo/binario

**Cobertura:**
- [x] Todos los huecos de Haiku (H1.1 a HE.1) tienen tarea asignada
- [x] Flujo de activación (D1) y flujo de instrucción (D2) cubiertos
- [x] Riesgo de degradación Sonnet/Opus cubierto (T-011 + salvaguardas RNF)

**Resultado checklist:** 20/20 ítems ✓ — Sin [NEEDS CLARIFICATION]

---

## Checklist de Validación (solution-strategy.md)

- [x] Key Ideas identificadas y articuladas
- [x] Research con pros/cons por cada unknown
- [x] Pre-design check contra Locked Decisions
- [x] Decisiones fundamentales documentadas con justificación
- [x] Alternativas consideradas
- [x] Post-design re-check: todos los huecos cubiertos
- [x] Riesgos identificados
- [x] Scope acotado con deuda técnica documentada
