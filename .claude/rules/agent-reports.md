# Registro de reportes de agentes

> Cargado en cada sesión. El productor persiste, no el padre.
> Adaptación Markdown de la regla canónica `registro-reportes-agentes` (e-comerce).

## Principio

Cuando un subagente produce un output analítico (auditoría, síntesis, comparación,
deep-review, plan, veredicto), **el padre solo ve el resumen** — el análisis completo
se pierde si no se persiste al terminar el agente.

## Cómo se cumple (dos capas)

1. **Automático (hook SubagentStop).** `.claude/settings.json` registra
   `.claude/scripts/save-agent-report.py`, que al terminar cada subagente toma
   `last_assistant_message` (o parsea el transcript) y lo apende —con procedencia
   (agente + timestamp ISO)— a `reports/registro-de-agentes.md` del WP activo
   (el más reciente en `.thyrox/context/work/`). Append-only, en `.thyrox/` (sin
   prompts de permiso). Fail-open: nunca rompe la sesión.

2. **Explícito (defensa en profundidad).** El subagente debería **escribir su reporte
   completo** en el WP antes de devolver el resumen, y verificar que aterrizó
   (`git ls-files --error-unmatch <ruta>`) antes de declararse completo. El hook es la
   red de seguridad; no exime al agente de persistir artefactos formales.

## Gotcha de activación

Un hook recién añadido a `settings.json` **no se activa hasta recargar la config**
(`/hooks` una vez o reiniciar Claude Code). Si `settings.json` no existía al arrancar
la sesión, los subagentes de esa sesión no se auto-registran — persistir a mano esa vez.

## Verificación

```bash
echo '{"agent_type":"x","last_assistant_message":"hola"}' \
  | python3 .claude/scripts/save-agent-report.py
# debe apender una entrada con timestamp y salir 0
```
