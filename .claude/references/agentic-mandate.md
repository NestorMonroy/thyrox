```yml
created_at: 2026-04-20 13:41:02
project: THYROX
author: NestorMonroy
status: Borrador
```

# Mandato Agentic de THYROX — Definición Operacional

THYROX declara ser un "Sistema de Agentic AI". Este documento define qué significa eso en términos verificables.

## Definición verificable

THYROX es agentic cuando cumple TODOS los criterios siguientes:

| Criterio | Descripción | Estado |
|---------|-------------|--------|
| C1 — Auto-rechazo | El motor puede rechazar su propio output | CUMPLE — bound-detector.py (PreToolUse) |
| C2 — Razonamiento sobre incertidumbre | Cada artefacto de gate declara confianza con umbral | PARCIAL — exit-conditions.md.template tiene umbrales, no todos los artefactos los usan |
| C3 — Persistencia de estado | Persiste estado entre sesiones sin intervención humana | CUMPLE — sync-wp-state.sh, git |
| C4 — Orquestación especializada | Puede orquestar agentes especializados con scope acotado | CUMPLE — 25+ agentes, bound-detector |

## Criterios NO cumplidos todavía

- C2 parcial: los WPs producidos no siempre declaran confianza epistémica en sus claims
- No hay criterio C5 todavía: capacidad de detectar cuando el WP activo contradice decisions/ anteriores

## Cómo evaluar si un WP contribuye al mandato agentic

1. ¿El WP mejora la capacidad del motor de rechazar outputs incorrectos? → contribuye a C1
2. ¿El WP mejora la calibración epistémica de artefactos? → contribuye a C2
3. ¿El WP mejora la persistencia o recuperación de estado? → contribuye a C3
4. ¿El WP agrega agentes especializados con scope acotado? → contribuye a C4
