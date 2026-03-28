```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/cc-warp/
```

# Análisis: cc-warp — Programación Orquestada y Estado Genérico→Especializado

## Qué es

Proyecto brasileño que desarrolla una **metodología completa de programación orquestrada** usando Claude Code como plataforma. Tiene 9 agentes especializados, sistema de 5 capas, transformación automática genérico→especializado, 7 niveles de documentación, y diarios de referencia de 500+ líneas.

Es el proyecto con la **teoría más desarrollada** sobre cómo organizar desarrollo con AI.

---

## Los 3 conceptos fundamentales

### 1. Sistema de Programação Orquestrada (5 capas)

```
Capa 1: Interface do Usuário
  → Input mínimo (2-3 frases), validações, dashboard

Capa 2: Orquestração Claude Code
  → Interpretación, sistema de referências, estado, checkpoints

Capa 3: 9 Agentes Especializados
  → Orquestração: coordenador, orquestrador-usuario, gerente-validacao
  → Técnicos: analista-requisitos, arquiteto, avaliador-tech, levantamento
  → Qualidade: garantia-qualidade, documentador

Capa 4: 16 Modelos Organizados
  → 5 processos, 8 documentação, 3 validação

Capa 5: 4 Hooks Automáticos
  → pre-action, pre-validation, post-response, context-transition
```

**Métricas:** ~25 minutos de idea a documentación completa de 7 niveles. 70% reducción de contexto.

**Para THYROX:** Nuestro SKILL tiene 7 fases pero no tiene las capas intermedias. cc-warp tiene la orquestación explícita (Capa 2) que conecta al usuario (Capa 1) con los agentes (Capa 3). THYROX salta del usuario directo al SKILL sin orquestación.

### 2. Transformación Genérico → Especializado

El sistema empieza genérico y se **muta automáticamente** cuando se aprueba un stack:

```
Estado Genérico          TRIGGER (score ≥ 7.5)     Estado Especializado
├── Agentes generales    ──────────────────→       ├── Agentes expertos en React+Node
├── Templates universales                          ├── Templates React-specific
├── Docs genéricos                                 ├── Patterns de React
└── Proceso estándar                               └── Tests framework-specific
```

**4 sub-fases de especialización:**
1. Investigación oficial (500+ líneas de referencia por tecnología)
2. Creación de Diarios de Referência
3. Customización de agentes
4. Adaptación de templates

**Para THYROX:** No tenemos este concepto. Nuestro framework es siempre genérico. cc-warp demuestra que la especialización automática produce 90% más precisión y 50% más velocidad.

### 3. Diarios de Referências (6 partes, 500+ líneas cada uno)

```
DIARIO-REFERENCIAS-BEAM-PARTE1-BASE.md      ← Propuesta de valor, comparativos
DIARIO-REFERENCIAS-BEAM-PARTE2-CORE.md      ← VM internals, concurrencia
DIARIO-REFERENCIAS-BEAM-PARTE3-ELIXIR.md    ← Lenguaje, GenServers
DIARIO-REFERENCIAS-BEAM-PARTE4-PHOENIX.md   ← Web framework
DIARIO-REFERENCIAS-BEAM-PARTE5-PRODUCAO.md  ← Deploy, monitoring
DIARIO-REFERENCIAS-BEAM-PARTE6-AGENTICA.md  ← BEAM para agentes AI
```

**Reglas:**
- Solo fuentes OFICIALES
- Mínimo 500 líneas por diario
- Cross-validación entre tecnologías
- Health reports del ecosistema

**Para THYROX:** Nuestras references/ son guías de proceso (cómo hacer X). Los diarios de cc-warp son **knowledge bases de tecnología** (todo sobre X). Son conceptos diferentes que no deben mezclarse.

---

## Otros conceptos relevantes

### foco_atual.md — Más que focus.md

No es solo "qué estoy haciendo ahora." Es una **declaración filosófica** de cómo pensar sobre el problema:

- Los "Tres Pilares": Context, Model, Prompt
- Claude Code como "primitivo de ingeniería" (no como framework)
- Lógica de expansión: cómo los primitivos componen en capacidades emergentes

**vs Cortex focus.md:** Cortex es operacional ("qué hago hoy"). cc-warp es filosófico ("cómo pienso sobre esto").

### 4 Comandos de Planificación secuenciales

```
1. Levantamento Requisitos  (25-30 min) → Documento de requirements
2. Estudo Proposta Stack    (30-40 min) → Evaluación de tecnología
3. Início Adequação Config  (35-45 min) → Agentes especializados
4. Planejamento Central     (30-40 min) → CentralControle.md (dashboard)
```

Cada comando tiene agente responsable, duración estimada, output definido, y dependencia del anterior.

**Para THYROX:** Nuestras 7 fases no tienen duración estimada ni agente responsable. cc-warp lo hace explícito.

### 7 Niveles de Documentación

| Nivel | Audiencia | Propósito |
|-------|-----------|-----------|
| 1 | Devs internos | Decisiones de implementación |
| 2 | Partners técnicos | APIs, contratos |
| 3 | No-técnicos | Contexto de negocio |
| 4 | Engineering review | Matrices de calidad |
| 5 | Auditores externos | Compliance, seguridad |
| 6 | Ejecutivos | ROI, business case |
| 7 | LLMs | Optimizado para contexto AI |

**Para THYROX:** No documentamos por audiencia. Un solo formato para todo. cc-warp demuestra que la misma información necesita diferentes formatos según quién la lee (confirmado por claude-mlx-tts que también documenta por audiencia).

---

## Comparación con los 12 proyectos anteriores

| Aspecto | cc-warp | Proyecto más similar | THYROX |
|---------|---------|---------------------|--------|
| **Capas de orquestación** | 5 capas explícitas | Cortex (L0-L3) | 2 capas (SKILL + references) |
| **Especialización** | Genérico→Especializado automático | Ninguno | Siempre genérico |
| **Diarios técnicos** | 500+ líneas, solo fuentes oficiales | build-ledger (truths) | references/ (guías de proceso) |
| **Duración por fase** | Explícita (25-45 min) | Ninguno | No definida |
| **Niveles de doc** | 7 niveles por audiencia | claude-mlx-tts (6 capas) | 1 nivel (todo igual) |
| **Dashboard central** | CentralControle.md | Cortex (BRAIN-INDEX) | ROADMAP.md |
| **Agentes** | 9 especializados con roles claros | Cortex (90+) | 0 |
| **Hooks** | 4 automáticos (pre/post) | agentic-framework (16 gates) | 0 |

---

## Meta-patrones actualizados (13 proyectos)

### Patrón nuevo: Especialización automática

Solo cc-warp tiene transformación genérico→especializado. Pero el concepto aplica a THYROX: ¿debería el framework mutarse según el tipo de proyecto?

### Patrón confirmado: Documentación por audiencia

| Proyecto | Niveles de audiencia |
|----------|---------------------|
| cc-warp | 7 niveles |
| claude-mlx-tts | 6 capas |
| Cortex-Template | Tiers (free/pro/full) |
| almanack | Principios / Frameworks / Referencias |

**Convergencia:** La misma información, diferentes formatos. THYROX tiene un solo formato.

### Patrón confirmado: Fases con tiempo estimado

| Proyecto | Estimaciones de tiempo |
|----------|----------------------|
| cc-warp | 25-45 min por fase |
| claude-pipe | Implícito (5 milestones) |
| agentic-framework | No explícito |
| THYROX | No tiene |

---

## Lecciones para THYROX

### Adoptar

1. **"Primitivos, no frameworks"** — Tratar Claude Code como bloques componibles (hooks, sub-agents, commands, output styles), no como un monolito al que le das instrucciones.

2. **CentralControle como dashboard** — UN archivo que muestra el estado de TODO el proyecto. Como ROADMAP pero más denso y actualizado automáticamente.

### Evaluar

3. **Especialización por proyecto** — ¿THYROX debería tener un modo "React project" vs "Python project" vs "documentation project" que adapte templates y convenciones?

4. **7 niveles de documentación** — Probablemente 3 niveles son suficientes para THYROX: técnico-interno (L1), LLM-optimizado (L7), y humano-no-técnico (L3).

5. **Diarios de referencia** — 500 líneas por tecnología es mucho para un framework genérico. Pero el concepto de "knowledge base de fuentes oficiales" es valioso.

### No adoptar

6. **9 agentes en planificación** — Overhead excesivo para THYROX. Mejor tener 2-3 roles claros.

7. **5 capas de orquestación** — THYROX es un skill, no un sistema. 2-3 capas son suficientes.

---

## La reflexión

cc-warp es el proyecto más **teórico** de los 13. Tiene una filosofía ("primitivos de ingeniería"), una metodología ("programación orquestada"), y una transformación formal ("genérico→especializado"). Pero tiene 4,397 archivos y mucha complejidad.

La lección: **la teoría correcta con implementación simple** es más valiosa que la teoría completa con implementación compleja. cc-warp tiene la mejor teoría de los 13 proyectos. Pero claude-pipe (12KB → código funcional) tiene la mejor relación teoría/resultado.

THYROX debería tomar los CONCEPTOS de cc-warp pero la EJECUCIÓN de claude-pipe.

---

**Última actualización:** 2026-03-28
