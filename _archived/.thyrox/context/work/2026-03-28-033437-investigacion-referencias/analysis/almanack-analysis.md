```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/almanack/
Nota: Proyecto de experiencias personales destiladas, no un framework
```

# Análisis: almanack — Conocimiento destilado como asset

## Qué es

Un almanaque personal en git — principios destilados, modelos mentales, lecciones de vida, y prompts reutilizables. No es un framework ni una herramienta. Es la **filosofía operacional de una persona** hecha accesible para AI agents.

Es el proyecto más diferente de los 11 que analizamos. Y aporta una perspectiva que ningún otro tiene.

---

## Lo que lo hace único

### 1. Principios > Contenido

Los otros 10 proyectos almacenan CÓMO hacer cosas (specs, plans, workflows). El almanack almacena CÓMO PENSAR sobre cosas.

```
Otros proyectos:  "Ejecuta estos 7 pasos para hacer X"
Almanack:         "Aquí hay 25 modelos mentales para pensar sobre cualquier X"
```

Los principios escalan. Los procedimientos caducan.

### 2. CLAUDE.md como contrato aprendido

```markdown
"Every time I correct you, add a new rule to the CLAUDE.md file
so it never happens again."
```

CLAUDE.md no es documentación estática. Es un **contrato vivo** que se enriquece con cada error. Cada corrección se convierte en una regla permanente.

**Para THYROX:** Nuestros ERR-001 a ERR-023 deberían convertirse en reglas en CLAUDE.md o constitution.md. Actualmente son archivos de error que nadie relee.

### 3. Prompts como herramientas cognitivas reutilizables

```
prompts/
├── gary-tan-swe.md     ← Code review como Gary Tan (Y Combinator)
└── hedge-fund.md       ← Trading como Head of Options Research
```

No son prompts descartables. Son **externalizaciones de frameworks de decisión.** Un prompt dice: "Aquí es cómo yo pienso sobre este problema; replica este pensamiento."

**Para THYROX:** Nuestros references/ son guías de proceso. No tenemos prompts que externalicen cómo PENSAR sobre un problema.

### 4. Modelos mentales como activos numerados

25+ modelos mentales en mental_models.md:

- "Invert, always invert" — resolver desde la dirección opuesta
- "Don't fall in love with solutions, only with problems"
- "Subtract before adding" (hábitos, metas, tiempo)
- "Think in percentages, not absolutes"
- "Most work is useless" — enfócate en lo que da valor

**Para THYROX:** No tenemos modelos mentales documentados. Tenemos procedimientos. Un modelo mental como "ANALYZE before PLAN" es más poderoso que una regla porque se aplica a CUALQUIER contexto.

### 5. 35 lecciones de vida como filosofía operacional

```
5.  "Dopamine from action, not info" — el gap entre aprender y hacer debe ser mínimo
12. "Finish things" — la mayoría están a medias; los que terminan destacan
17. "Life repeats lessons" — el mismo desafío hasta que lo aprendes
32. "You can just do things" — mundo permissionless; no necesitas aprobación
```

Esto no es advice genérico. Son **principios operacionales destilados de experiencia real.**

---

## Lo que el almanack enseña sobre documentation

### La jerarquía de valor del conocimiento

```
Nivel 1: Principios (mental_models.md, life.md)
  → Aplican a todo, componen con el tiempo, nunca caducan

Nivel 2: Frameworks (prompts/, entrepreneurship.md)
  → Aplican a un dominio, reutilizables, actualizables

Nivel 3: Referencias (bookmarks.md, ai.md)
  → Links a fuentes, curables, reemplazables

Nivel 4: Work-in-progress (not_indexed/)
  → Ideas en desarrollo, pueden promoverse o descartarse
```

**Para THYROX:**
- Nuestras references/ son Nivel 2-3 (frameworks + refs)
- Nuestro SKILL.md intenta ser Nivel 1 pero mezcla procedimiento con principio
- No tenemos Nivel 1 puro (principios que aplican a todo)
- Constitution.md debería ser Nivel 1

### El ciclo virtuoso: Work → Learn → Document → Work

```
Trabajar con Claude → Claude comete error
→ Corregir a Claude → Agregar regla a CLAUDE.md
→ Claude ya no comete ese error → Trabajar más eficientemente
→ Nuevo error → Repeat
```

**Para THYROX:** Nuestros ERR-001 a ERR-023 son el registro del error, pero no se retroalimentan a SKILL.md o CLAUDE.md como reglas. El ciclo está roto — documentamos el error pero no lo convertimos en prevención.

---

## Comparación con los 11 proyectos

| Aspecto | Almanack | Todos los demás |
|---------|----------|----------------|
| **Tipo de conocimiento** | Principios y filosofía | Procedimientos y reglas |
| **Audiencia** | La persona misma + AI agents | Equipos y desarrolladores |
| **Evolución** | Crece con cada lección | Crece con cada feature |
| **Formato** | Numerado, denso, destilado | Variable (specs, plans, tasks) |
| **CLAUDE.md** | Contrato aprendido (crece con errores) | Contexto estático |
| **Valor a largo plazo** | Compone (principios aplican siempre) | Caduca (procedimientos cambian) |

---

## Lecciones para THYROX

### Adoptar

1. **Constitution como principios, no como reglas** — No "debes crear constitution.md" sino "estos son los principios que guían todo: ANALYZE first, enforce > document, less is more."

2. **Errores → reglas permanentes** — Cada ERR-NNN debe producir una regla en CLAUDE.md o SKILL.md. Si no cambia el comportamiento futuro, el error se va a repetir (ya lo vimos: ERR-002 → ERR-006).

3. **Prompts como assets reutilizables** — Crear prompts/ con frameworks de decisión: code-review-prompt.md, architecture-decision-prompt.md, spec-quality-prompt.md.

### Evaluar

4. **Modelos mentales documentados** — ¿THYROX necesita sus propios "mental models" para PM con AI? Ejemplo: "switching cost model" (de oh-my-claude), "3-tier memory" (de conv-temp), "constrained autonomy" (de build-ledger).

5. **Knowledge hierarchy** — Separar principios (permanentes) de procedimientos (cambiantes) de referencias (descartables). No mezclar en los mismos archivos.

### La reflexión

El almanack demuestra que el **conocimiento más valioso no es procedural sino principial.** Saber QUÉ HACER es menos valioso que saber CÓMO PENSAR.

THYROX documenta QUÉ HACER (7 fases, exit conditions, gates). Pero no documenta CÓMO PENSAR (cuándo simplificar, cuándo profundizar, cuándo parar).

Los 35 principios de vida de este almanack son más útiles que cualquier framework de 7 fases porque aplican a TODO, no solo a PM.

---

**Última actualización:** 2026-03-28
