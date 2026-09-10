```yml
type: Análisis Arquitectónico
work_package: 2026-04-08-02-05-03-context-hygiene
created_at: 2026-04-08 02:05:03
status: Análisis de necesidad
purpose: Evaluar si es necesario comenzar la evolución arquitectónica ahora o es deuda técnica válida
```

# Análisis: ¿Es necesario evolucionar la arquitectura de pm-thyrox ahora?

## Contexto del problema

```
END USER:    Meta-framework de IA (pm-thyrox)
CURRENT:     Todo en 1 SKILL (que hace cualquier cosa)
PROBLEM:     SKILL crece, agentes crecen, brecha entre ellos
CONSTRAINT:  Solo Claude Code
GOAL:        Funcionar en paralelo sin perder integridad
```

**Pregunta clave: ¿Es correcto que el ÚNICO punto de entrada sea el SKILL?**

---

## Datos reales del sistema actual

Antes de evaluar alternativas, medir el estado real:

| Métrica | Valor actual | Umbral de preocupación |
|---------|-------------|----------------------|
| Líneas en SKILL.md | **422** | ~700 |
| Agentes nativos | **9** | Sin definir |
| WPs en paralelo real | **0** (todos secuenciales) | ≥2 WPs simultáneos |
| Veces que falló coordinación paralela | **0** (no se ha usado paralelo real) | Cualquier falla |
| Brecha documentada entre SKILL y agentes | **Comunicación** | Conflictos de datos |

**Hallazgo crítico:** El problema de escala es **proyectado**, no actual. SKILL.md está a 422 líneas — 278 líneas por debajo del umbral. El paralelo real entre WPs nunca se ha ejecutado.

---

## Los 5 niveles del análisis

### Nivel 1 — END USER: pm-thyrox meta-framework

Necesidades reales **hoy**:
- Orquestar 7 fases en 1 WP a la vez (secuencial)
- Lanzar agentes especializados en background dentro de Phase 6
- Mantener integridad de decisiones entre fases

Necesidades **proyectadas** (aún no materializadas):
- Orquestar múltiples WPs en paralelo (no ha ocurrido)
- Coordinación de 10+ agentes simultáneos (máximo actual: 3-4)
- Backtracking automático si falla un agente

**Diagnóstico:** El END USER actual tiene necesidades más simples que las del END USER proyectado. La arquitectura monolítica satisface al usuario actual con fricciones menores (tamaño, claridad), no con fallas.

---

### Nivel 2 — Requisitos arquitectónicos reales vs proyectados

| Requisito | ¿Real hoy? | ¿Proyectado? | ¿Resuelto por arquitectura actual? |
|-----------|-----------|-------------|----------------------------------|
| Punto de entrada único | ✓ Real | — | ✓ Sí — SKILL.md |
| Decidir qué agente usar | ✓ Real | — | ✓ Sí — SKILL invoca Agent() |
| Mantener estado compartido | ✓ Real | — | ✓ Sí — context/now.md + work/ |
| Adaptarse si falla un agente | Parcial | Proyectado | ⚠ Parcial — ERR-NNN, retry manual |
| Orquestar N WPs en paralelo | ✗ No real | Proyectado | ✗ No resuelto — tampoco necesario hoy |
| Backtracking automático (CSP) | ✗ No real | Proyectado | ✗ No resuelto — tampoco necesario hoy |

---

### Nivel 3 — Las 5 alternativas evaluadas

#### A) Monolithic SKILL (actual)
```
✅ Simple — un archivo, un punto de entrada
✅ Ya funciona — 19 FASEs completadas con éxito
✅ Bajo mantenimiento — un lugar para actualizar
❌ Crece con cada FASE (pero: actualmente a 422/700 líneas — 48 FASEs más a este ritmo)
❌ No escala a 10+ agentes en paralelo (pero: nunca se ha necesitado)
❌ Brecha creciente con agentes (pero: la brecha es de comunicación, no de conflictos)
```
**Veredicto:** Adecuado para el uso actual. Las debilidades son proyecciones.

#### B) SKILL = orquestador + Agent-Phase-X especializados
```
✅ Separación de concerns — cada agente domina su fase
✅ Escala en paralelo — Agent-Phase6 puede correr N veces
✅ SKILL más pequeño — solo lógica de decisión
❌ Requiere crear 5 nuevos agentes (Agent-Phase1..7)
❌ Complejidad de coordinación — ¿cómo pasan contexto entre fases?
❌ Duplicación riesgo — cada agente necesita conocer el WP completo
❌ Esfuerzo: 40-60h de diseño + implementación
```
**Veredicto:** Arquitectura correcta para el futuro. Prematura para hoy.

#### C) Multi-Agent sin SKILL central
```
✅ Máximo desacoplamiento
❌ ¿Quién decide cuál agente actúa? Requiere orquestador de todas formas
❌ Rompe el flujo ANALYZE-first — ningún agente tiene visión global
❌ Peor que A o B para el caso actual
```
**Veredicto:** Descartado — crea el problema que intenta resolver.

#### D) Hybrid: Agent & Repository + CSP
```
✅ Decisiones dinámicas — se adapta a fallos
✅ Backtracking si un agente falla
✅ Coordinación formal con section owners
⚠️ Requiere implementar CSP model (Variables, Domains, Constraints, Search)
⚠️ CSP en Claude Code = lógica en texto del SKILL — no hay motor de CSP nativo
❌ Altísima complejidad — el CSP en sí es un sistema que necesita diseño formal
❌ Esfuerzo: 80-120h mínimo, riesgo alto de over-engineering
```
**Veredicto:** Arquitectura elegante para un sistema distribuido real. Overkill para Claude Code donde el "motor de CSP" sería instrucciones de texto en SKILL.md.

#### E) Event-Driven
```
❌ No disponible en Claude Code — no hay event bus, no hay pub/sub
```
**Veredicto:** Descartado por constraint.

---

### Nivel 4 — CSP Model: ¿funciona en Claude Code?

El CSP propuesto es atractivo en teoría:
```
Variables: next_phase, available_agents, current_state
Constraints: no colisionar, respetar RC, section owners
Search: backtracking si falla agente
```

**El problema real:** En Claude Code, el "motor CSP" sería instrucciones en texto en SKILL.md. Claude no ejecuta un motor de búsqueda — aplica las constraints como razonamiento textual. Esto ya lo hace hoy con las instrucciones de Phase 5/6.

**Conclusión:** El CSP ya existe implícitamente — las instrucciones de gates, pre-flight, section owners, y ERR-NNN son constraints aplicadas por razonamiento. Formalizarlo en un "modelo CSP explícito" no añade capacidad de ejecución; añade vocabulario.

Valor real del CSP model: **documentación arquitectónica**, no capacidad nueva.

---

### Nivel 5 — Restricciones reales de Claude Code

```
✗ No puedo usar microservicios
✗ No puedo usar event bus externo
✗ No puedo usar job queue persistente
✓ Puedo usar: context files + git + Agent() con run_in_background
✓ Puedo usar: now-{agent-id}.md para estado por agente
✓ Puedo usar: section owners para evitar conflictos de escritura
```

**Lo que ya tenemos resuelto con estas restricciones:**
- Paralelismo: `Agent(run_in_background=True)` — funciona hoy
- Estado compartido: `context/now.md` + `context/now-{id}.md` — funciona hoy
- Conflict resolution: section owners — funciona hoy
- Recovery: ERR-NNN + retry manual — funciona hoy

**Lo que NO tenemos:**
- Backtracking automático (necesitaría loop en SKILL que detecte ERR y reasigne)
- Orquestación de múltiples WPs en paralelo (nadie lo ha pedido)

---

## Anti-patrones: ¿están presentes hoy?

| Anti-patrón | ¿Presente hoy? | Severidad |
|-------------|---------------|----------|
| Monolithic SKILL sin límites | Parcial — 422 líneas, patrón references/ ya mitiga | Baja |
| Un agente que hace todo | No — agentes son especializados (task-executor, task-planner, etc.) | N/A |
| Paralelismo sin coordinación | No — pre-flight + section owners cubren esto | N/A |
| Decisiones rígidas hardcodeadas | Parcial — Phase 5→6 gate resuelve casos obvios; backtracking manual vía ERR | Baja |

**Ningún anti-patrón es severo hoy.**

---

## Veredicto: ¿Es necesario empezar ahora?

### **NO — y aquí está por qué:**

**1. El problema de tamaño no es crítico:**
SKILL.md tiene 422 líneas. A ~10 líneas por FASE (ritmo actual), tenemos margen para ~28 FASEs más antes del umbral. La solución para cuando llegue es TD-004: extraer a `references/` — ya hay un patrón probado.

**2. El paralelo real nunca se ha ejecutado:**
La arquitectura B (orquestador + Agent-Phases) resuelve un problema que no ha ocurrido. Implementarla ahora es optimización prematura con costo real (40-60h) y riesgo real (complejidad).

**3. El CSP model no añade capacidad ejecutable:**
Las constraints ya existen como instrucciones. Un "CSP formal" sería documentación arquitectónica, no nueva funcionalidad. Valioso como ADR, no como refactoring urgente.

**4. Hay deuda más urgente:**
Context-hygiene (focus/now/project-state desactualizados) afecta CADA sesión. La arquitectura monolítica no afecta ninguna sesión actual.

**5. El patrón references/ ya mitiga el crecimiento:**
SKILL.md delega detalle a `references/`. Agregar más references es lineal y no rompe nada. La arquitectura B requiere diseño no-lineal de coordinación entre agentes.

---

## Recomendación de priorización

```
Ahora (este WP):    context-hygiene — afecta cada sesión
Después:            TD-004 — SKILL.md extraer a references/ cuando llegue a 600 líneas
Futuro (en 3 meses o cuando haya paralelo real): TD-005 — evaluar arquitectura B
```

**El trigger correcto para TD-005 NO es el tamaño de SKILL.md.**
**El trigger correcto es: el primer WP que necesite dos SKILL invocations simultáneas, o el primer fallo de coordinación entre agentes.**

Hasta entonces, el costo de la arquitectura B supera el beneficio.

---

## Qué SÍ vale implementar del análisis

Aunque la arquitectura completa es prematura, hay elementos valiosos implementables sin el overhaul:

| Elemento | Valor | Esfuerzo | Implementar ahora |
|----------|-------|---------|------------------|
| Documentar la distinción FASE vs Phase | Alto | Muy bajo | ✓ En context-hygiene |
| Nombrar explícitamente Agent-Phase-X como patrón futuro | Medio | Bajo | ✓ Como ADR |
| Definir qué haría cada Agent-Phase-X | Medio | Bajo | ✓ Como diseño en TD-005 |
| Implementar Agent-Phase-X | Alto | Muy alto | ✗ Prematuro |
| CSP model formal | Medio | Alto | ✗ Documentación arquitectónica sin ejecutabilidad |
