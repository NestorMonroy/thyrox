```yml
created_at: 2026-04-20 13:53:00
project: THYROX
author: NestorMonroy
status: Borrador
```

# State Files para Ejecución Paralela de Agentes

## Convención de naming

| Contexto | Archivo | Propietario |
|----------|---------|-------------|
| Estado compartido / orquestador | `.thyrox/context/now.md` | Orquestador principal |
| Agente nativo en ejecución | `.thyrox/context/now-{agent-name}.md` | El agente |
| Skill especializado | `.thyrox/context/now-{skill-name}-{wp-id}.md` | El skill |
| Gate evaluador (paralelo) | `.thyrox/context/gate-{stage}-eval-{n}.json` | Evaluador N |
| Gate Merger output | `.thyrox/context/gate-{stage}-merged.json` | Merger |

## Campos requeridos en now-{agent-name}.md

Todo state file de agente en ejecución paralela DEBE incluir estos campos:

```yml
agent_id: {agent-name}           # identificador único del agente
status: running|completed|failed  # estado actual
output_key: {nombre}             # qué output_key produce este agente
started_at: YYYY-MM-DD HH:MM:SS  # timestamp de inicio
timeout_at: YYYY-MM-DD HH:MM:SS  # timestamp de expiración (started_at + límite)
```

## Protocolo de lectura por el Merger

1. Leer todos los `now-{evaluator-N}.md` de los evaluadores paralelos
2. Verificar `status=completed` en cada uno antes de consolidar
3. Si algún evaluador tiene `status=running` y `timeout_at` expirado → tratarlo como `status=failed`
4. Si `status=failed`: Merger procede con N-1 evaluadores y registra el evaluador fallido como gap en el reporte
5. NUNCA inferir un output de un evaluador que no completó

## Reglas de cleanup

- Gate files (`gate-{stage}-eval-*.json`) se eliminan después de que el Merger los consume
- `now-{agent}.md` se elimina cuando el agente termina correctamente Y el Merger confirmó recepción
- Si el agente termina con error, `now-{agent}.md` persiste para diagnóstico

## Verificación en validate-session-close.sh

`validate-session-close.sh` detecta dos tipos de archivos huérfanos:

1. `now-{agent}.md` huérfanos — agente terminó pero archivo persiste → WARN (puede ser evidencia diagnóstica)
2. `gate-{stage}-eval-*.json` sin su `gate-{stage}-merged.json` correspondiente → WARN "gate files huérfanos"

Ambos son WARN (no BLOCK) — el archivo puede ser evidencia de diagnóstico.
