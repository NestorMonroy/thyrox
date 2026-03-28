```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/Cortex-Template/
```

# Análisis: Cortex-Template — OS completo para cerebro AI

## Qué es

Un **sistema operativo externalizado** para sesiones de Claude. No es un skill ni un plugin — es una arquitectura completa de "cerebro" con 90+ agentes, constitution, claims system, metabolism metrics, memory layers, workflows YAML, y un brain-engine con SQLite + RAG.

Es el proyecto más ambicioso de los 7 analizados.

---

## Conceptos clave

### 1. Tres capas del cerebro

```
Brain (kernel)   = Identidad inmutable. KERNEL.md, agents/, profil/
Cortex (coord)   = Señales entre instancias. BSI protocol, claims, locks
Cosmos (satélites) = Conocimiento orbitante. todo/, toolkit/, progression/
```

### 2. Constitution como Layer 0

`brain-constitution.md` se carga ANTES que todo. Si falta o está corrupta → HALT (no hay sesión).

Invariantes clave:
- **Determinismo:** El cerebro nunca adivina. Dato ausente = "INFORMATION MANQUANTE"
- **Autonomía:** Reversible + sin efecto externo → ejecuta solo. Irreversible → escala a humano.
- **Degradación graceful:** 4 niveles (FULL → SEMI+ → SEMI → NO) según qué layers están disponibles

### 3. Scribe pattern (escritor único por territorio)

Cada directorio tiene UN agente dueño que es el único que puede escribirlo:
- `todo-scribe` → escribe todo/
- `toolkit-scribe` → escribe toolkit/
- `metabolism-scribe` → escribe metabolism/

Ningún otro agente toca esos archivos. Git blame es significativo.

### 4. Context-tier-split (boot vs detail)

Cada agente tiene:
- **Header (20 líneas)** — cargado en L1 al boot
- **Detail (completo)** — cargado solo cuando se invoca

KPI: always-tier < 2,000 líneas. Cold start < 2 min.

### 5. focus.md + now.md (estado actual)

| Archivo | Para quién | Qué contiene |
|---------|-----------|-------------|
| focus.md | Humanos | Dirección actual, blockers, próxima acción |
| now.md | Máquina | cold_boot flag, última sesión, blockers YAML |

Al cerrar sesión → scribe actualiza focus.md, metabolism-scribe actualiza now.md.
Al abrir sesión → helloWorld lee ambos y rehydrata contexto.

### 6. Metabolism (métricas de salud)

Por sesión: tokens_used, context_peak, agents_loaded, duration, commits, todos_closed, health_score.

```
health = (todos_closed × 40%) + (commits × 30%) + (no_errors × 20%) + (efficiency × 10%)
```

### 7. Workflows YAML

```yaml
name: refactor-secure
chain:
  - step: 1
    type: code
    scope: auth/
    gate: 0-failures
  - step: 2
    type: review
    gate: human
```

Cadenas de agentes con gates entre pasos. Ejecutables con `workflow-launch.sh`.

### 8. Claims (ownership de sesión)

```yaml
sess_id: sess-20260322-1200-work-superoauth
scope: superoauth/src/auth/
status: open
expires: 4h
```

Declaraciones de "esta sesión trabaja en este scope." Pre-flight checks verifican que no hay colisiones.

### 9. PATHS.md (paths semánticos)

Nunca hardcodear rutas. Usar nombres semánticos:
```
brain/ → <BRAIN_ROOT>
toolkit/ → <BRAIN_ROOT>/toolkit/
```

Si el brain se mueve de directorio, actualizar PATHS.md una vez. Todo sigue funcionando.

### 10. Handoff pattern

Al cerrar sesión:
1. Session summary → qué se entregó
2. Coach feedback → progresión observada
3. Next session prompt → listo para copiar

Checkpoints < 50 líneas entre sesiones. Warm restart < 30 seg.

---

## Lo genuinamente útil vs lo overengineered

### Genuinamente útil (adoptar)

| Concepto | Por qué | Esfuerzo |
|----------|---------|---------|
| **Scribe pattern** | Elimina 80% de conflictos de estado | Bajo |
| **Constitution Layer 0** | Previene drift silencioso | Bajo |
| **Context-tier-split** | Escala a 100+ agentes sin explotar contexto | Medio |
| **focus.md + now.md** | Reemplaza ROADMAP + work-logs con 2 archivos simples | Bajo |
| **Checkpoint < 50 líneas** | Warm restart rápido | Bajo |
| **PATHS.md** | Previene paths hardcodeados | Bajo |
| **Metabolism metrics** | Medir si el framework mejora | Medio |

### Overengineered (no adoptar)

| Concepto | Por qué no | Cuándo sí |
|----------|-----------|----------|
| **90+ agentes** | Confuso para un solo usuario | Cuando hay equipo grande |
| **4 tiers** (free→full) | Innecesario sin monetización | Cuando hay producto comercial |
| **BSI claims system** | Complejidad para single-user | Cuando hay multi-instancia |
| **brain-hypervisor** | Futuro, no presente | Cuando hay workflows paralelos reales |
| **brain-engine SQLite+RAG** | Overhead de infraestructura | Cuando grep no es suficiente |

---

## Comparación con los 7 proyectos

| Aspecto | spec-kit | claude-pipe | mlx-tts | oh-my-claude | conv-temp | clawpal | Cortex | THYROX |
|---------|----------|-------------|---------|-------------|-----------|---------|--------|--------|
| **Complejidad** | Media | Baja | Baja | Media | Baja | Media | **Muy Alta** | Media |
| **Agentes** | No | No | No | 5 | No | No | **90+** | No |
| **Constitution** | Sí | No | No | Decision gate | No | No | **Sí (Layer 0)** | Template |
| **Estado actual** | tasks.md | No | No | save/load | 3 tiers | focus+checklists | **focus+now+metabolism** | ROADMAP |
| **Workflows** | 4 commands | Manual | Hooks | Ralph loops | Manual | 48 plans | **YAML chains** | 7 fases |
| **Memory** | Checkboxes | Sessions | No | Save/load | 3 tiers manual | Plans inmutables | **3 layers auto** | work-logs vacíos |
| **Enforcement** | Templates | Manual | Hooks | Hooks+loops | Manual | cc.md feedback | **Constitution+pre-flight** | Documental |

---

## Lo que esto significa para THYROX

Cortex-Template es lo que THYROX podría ser si escalara al máximo. Pero la lección no es "copiar Cortex" — es **extraer los patrones universales**:

1. **focus.md + now.md** > ROADMAP + work-logs (más simple, más útil)
2. **Scribe pattern** > "cualquier agente escribe cualquier archivo" (menos conflictos)
3. **Constitution Layer 0** > principios dispersos (enforcement real)
4. **Checkpoint < 50 líneas** > work-logs de 150 líneas (más eficiente)
5. **Context-tier-split** > cargar todo siempre (escalable)

El resto (90+ agentes, BSI claims, brain-engine, metabolism) es para cuando THYROX crezca. No ahora.

---

**Última actualización:** 2026-03-28
