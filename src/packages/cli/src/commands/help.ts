/**
 * `--help`: el texto de ayuda.
 *
 * Vive en su propio módulo porque es contenido, no logica: un binario delgado
 * no aloja 45 lineas de texto, y quien edita la ayuda no deberia tener que
 * abrir el punto de entrada para hacerlo.
 *
 * Extraido de `bin/harness.ts` en #205. El texto se actualiza al nombre nuevo
 * del binario: citaba `bun run bin/harness.ts`, que ya no existe.
 */
export const HELP = `thyrox — el bucle de agente, nativo

  bun run bin/thyrox.ts --prompt "..." [opciones]

  --prompt <texto>        lo que se le pide al modelo (obligatorio, salvo --chat/--sessions)
  --chat                  conversación: una línea de stdin por turno, misma sesión
  --provider <n>          recorded (por defecto) | http
  --grabacion <ruta>      JSON con los turnos grabados (provider recorded)
  --model <id>            identificador completo, nunca alias
  --system <texto>        prompt de sistema
  --cwd <ruta>            directorio de trabajo de las herramientas
  --transcript-dir <ruta> dónde vive el JSONL (por defecto ~/.harness/<proyecto>)
  --store <ruta>          agent_store.sqlite3 donde el harness escribe la fila de
                          cada subagente (source=harness). Sin él, la herramienta
                          Agent sigue usable pero no registra nada
  --agent-defs <ruta>     JSON {tipo: {model, systemPrompt, tools, maxTurns}} con
                          las definiciones de subagente por subagent_type
  --resume <sesion>       reanuda una sesión por id
  --sessions              lista las sesiones reanudables y sale
  --max-turns <n>         corte del bucle (por defecto 20)
  --settings <ruta>       JSON con las claves "hooks" y "permissions"
  --settings-source <n>   project: lee <cwd>/.claude/settings.json (+ .local.json)
  --config-origin         imprime de qué fuente salió cada clave y sale
  --output-style <n>      text (por defecto) | json | quiet
  --stream                pide el turno como SSE y escribe el texto conforme llega
  --select-tests          imprime QUÉ pruebas correr para los cambios del árbol,
                          con su denominador y su ceguera — sin ejecutarlas
  --import-tasks          importa las casillas sin marcar de un --rst al tablero
  --check-premises        mide las premisas declaradas (--premises <json>) contra
                          el árbol; --strict sale 1 sólo ante overclaimed
  --workbench-new <slug>  andamia un banco de trabajo en .claude/eventos/ y
                          nombra lo que le falta para ser conforme
  --workbench-check <dir> mide un banco contra las cinco claves; con --strict
                          sale 1 si hay problemas
  --status-line           imprime la línea de estado al terminar
  --journal <ruta>        diario de eventos JSONL
  --json                  imprime el resultado final como JSON

  Claim ledger de coordinación (T-101) — texto JSONL versionado, no el store:
  --claim <ruta>          reserva una ruta; exige --owner y --branch. Rehúsa si
                          otro dueño ya la tiene, salvo --force
  --release <ruta>        libera una reserva; exige --owner
  --who-has <ruta>        imprime quién tiene reservas que solapan la ruta
  --overlap               imprime los solapes entre dueños distintos; sale 3 si hay
  --owner <n>             quién reserva            --branch <n>  su rama
  --task <n>              tarea que motiva          --ledger <ruta>  ledger explícito
  --force                 fuerza --claim sobre una reserva ajena
`
