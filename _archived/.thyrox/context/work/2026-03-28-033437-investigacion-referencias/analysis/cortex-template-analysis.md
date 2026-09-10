```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia profundo (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/Cortex-Template/
```

# Análisis: Cortex-Template — Brain OS para Claude

## Qué es

Un sistema operativo completo para Claude Code. No es un skill ni un plugin — es un **brain externalizado** con 90+ agentes, constitution inmutable, sistema de claims, metabolismo, memoria de 3 capas, workflows YAML, y motor de búsqueda semántica (SQLite + RAG).

Es el proyecto más ambicioso de los 7 que analizamos. Y el más relevante para THYROX.

---

## Los conceptos que importan

### 1. Capas de contexto (Layer 0-3)

```
L0 (~5%):  Constitution + KERNEL + PATHS     ← SIEMPRE cargado, inmutable
L1 (~10%): focus.md + now.md + coach-boot    ← Estado de sesión
L2 (~8%):  Proyecto activo + todos           ← Scope del trabajo
L3 (0%):   Bajo demanda                      ← Solo si se necesita
```

**KPI constitucional:** L0+L1 < 2,000 líneas. Más = sesión lenta.

**Para THYROX:**
- L0 = CLAUDE.md + SKILL.md (ya lo tenemos)
- L1 = project-state.md + ROADMAP.md (ya lo tenemos)
- L2 = references/ cargados bajo demanda (ya lo tenemos)
- L3 = assets/ + git history (ya lo tenemos)

**Lo que NO tenemos:** El KPI de líneas y el budget de contexto explícito.

### 2. Constitution como Layer 0 inmutable

brain-constitution.md define:
- **Halt conditions** — si la constitution falta/está corrupta → NO se inicia sesión
- **Invariantes de identidad** — "el brain es determinístico, nunca adivina"
- **Degradación graceful** — qué pasa cuando faltan capas (FULL → SEMI+ → SEMI → NO)
- **Regla de autonomía** — reversible + sin efecto externo → ejecutar solo; irreversible → escalar a humano

**Lo que THYROX tiene:** constitution.md.template sin instanciar, gates en EXIT_CONDITIONS.
**Lo que le falta:** Halt conditions reales, degradación graceful, regla de autonomía.

### 3. focus.md + now.md (estado de sesión)

| Archivo | Propósito | Para quién | Formato |
|---------|-----------|-----------|---------|
| focus.md | Dirección actual, bloqueadores | Humano | Markdown libre |
| now.md | Estado de sesión (cold_boot, última sesión) | AI | YAML structured |

**Juntos reemplazan:** work-logs + project-state.md + parte de ROADMAP.md.

**Para THYROX:** Esto es más simple y efectivo que nuestro sistema actual de work-logs narrativos + project-state.md + ROADMAP.md. Son 2 archivos en vez de 3, con propósitos claros.

### 4. Scribe pattern (single writer per territory)

```
todo-scribe     → solo él escribe en todo/
toolkit-scribe  → solo él escribe en toolkit/
coach-scribe    → solo él escribe en progression/
metabolism-scribe → solo él escribe métricas
```

**Regla:** Ningún agente toca el territorio de otro. Si necesita datos, envía señal HANDOFF.

**Para THYROX:** Nuestro analysis/ tiene 20+ archivos escritos por "Claude" sin distinción. No hay ownership. Cualquier fase escribe donde quiere.

### 5. Context-tier-split (boot-summary + detail)

Cada agente tiene:
- **Header (20 líneas)** — cargado en L1 (siempre visible)
- **Detail (200+ líneas)** — cargado bajo demanda

**Para THYROX:** Nuestras references/ son toda "detail." No hay headers. SKILL.md intenta ser el header de todo, pero 288 líneas es mucho para un boot summary.

### 6. Checkpoint pattern (< 50 líneas)

Al final de una sesión:
```markdown
# Checkpoint — Sprint 123

## State
- JWT validation refactored
- Tests: 8/12 passing
- Blockers: Redis pool (async)

## Next
1. Debug Redis
2. Complete tests
```

**Siguiente sesión:** Lee checkpoint → warm restart en 30 segundos.

**Para THYROX:** Esto es lo que now.md hace. Más útil que un work-log de 150 líneas.

### 7. Metabolismo (métricas de sesión)

```yaml
tokens_used: 45000
context_peak: 72%
agents_loaded: 5
duration_min: 45
commits: 8
todos_closed: 3
health_score: 78
```

**Capturado automáticamente** al cerrar sesión por metabolism-scribe.

**Para THYROX:** No tenemos métricas de sesión. No sabemos si una sesión fue productiva o no.

### 8. Workflows como YAML

```yaml
name: refactor-secure
chain:
  - step: 1
    type: code
    scope: auth/
    gate: 0-failures
  - step: 2
    type: test
    gate: 80%-coverage
  - step: 3
    type: review
    gate: human
```

**Para THYROX:** Nuestras 7 fases son un workflow implícito en SKILL.md. No son ejecutables como YAML.

### 9. PATHS.md (anti-hallucination)

```
| Nombre semántico | Path real |
|-----------------|-----------|
| brain/          | /home/user/Brain |
| projects/       | /home/user/Dev |
```

**Regla:** Si un path no está en PATHS.md → "INFORMACIÓN FALTANTE." Nunca inventar paths.

**Para THYROX:** No tenemos esto. Claude adivina paths (y a veces se equivoca).

---

## Comparación con los 7 proyectos

| Aspecto | spec-kit | claude-pipe | mlx-tts | oh-my-claude | conv-temp | clawpal | Cortex | THYROX |
|---------|----------|-------------|---------|-------------|-----------|---------|--------|--------|
| **Agentes** | No | No | No | 5 | No | No | 90+ | No |
| **Constitution** | Template | No | No | Decision gate | No | No | L0 inmutable | Template sin instanciar |
| **Estado sesión** | Checkboxes | Sessions API | Hooks | Save/load | 3 tiers manual | cc.md | focus+now.md | project-state (incompleto) |
| **Métricas** | No | No | No | No | No | No | Metabolismo | No |
| **Workflows** | 4 comandos | No | 7 commands | STV skills | No | Planes con fecha | YAML chains | 7 fases en SKILL.md |
| **Ownership** | No | No | No | Agentes por rol | No | No | Scribe pattern | No |
| **Paths** | No | No | No | No | No | No | PATHS.md | No |
| **Context budget** | No | No | No | No | Sí (3 tiers) | No | L0-L3 con KPI | No |

---

## Lo genuinamente útil vs lo overengineered

### ADOPTAR (alto valor, implementable)

1. **focus.md + now.md** — Reemplaza work-logs + project-state con 2 archivos claros
2. **Constitution instanciada** — Con halt conditions y regla de autonomía
3. **Context budget** — L0+L1 < N líneas como KPI
4. **Checkpoint pattern** — < 50 líneas al final de sesión
5. **PATHS.md** — Anti-hallucination para paths

### EVALUAR (alto valor, requiere diseño)

6. **Scribe pattern** — Ownership de directorios
7. **Metabolismo** — Métricas automáticas de sesión
8. **Workflows YAML** — Fases como cadenas ejecutables

### NO ADOPTAR (overengineered para THYROX)

9. **90+ agentes** — THYROX es un skill, no un OS
10. **BSI claims** — Solo para multi-instancia
11. **brain-engine (SQLite + RAG)** — Solo cuando hay >1000 archivos
12. **4 tiers** — 2 son suficientes
13. **Modes** — Sessions ya cubren esto
14. **Signals (SPAWN, RETURN, BLOCKED_ON)** — Solo para multi-agente complejo

---

## La reflexión central

Cortex-Template es lo que THYROX **podría ser si creciera 10x.** Demuestra que la dirección es correcta (constitution, fases, references, scripts) pero que hay conceptos intermedios que THYROX necesita antes de escalar:

1. **focus.md + now.md** > work-logs narrativos
2. **Constitution instanciada** > template sin usar
3. **Context budget explícito** > cargar todo y esperar
4. **Checkpoint** > reconstruir todo cada sesión
5. **PATHS.md** > adivinar rutas

Estos 5 conceptos son el puente entre THYROX actual y un sistema que escala.

---

**Última actualización:** 2026-03-28
