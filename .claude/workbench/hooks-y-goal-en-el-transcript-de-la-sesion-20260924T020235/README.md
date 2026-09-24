# hooks-y-goal-en-el-transcript-de-la-sesion

## El encargo

> nosotros ya tenemos scripts que analizan y revisan lo del transcript , analizalo

## La premisa, si se corrigio al primer comando

La afirmación previa —«ningún `Stop` ni `PreToolUse` está activo»— salía de
revisar archivos de settings, no de lo que el cliente ejecutó. El transcript
la refuta en parte: **un** Stop hook sí corre.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/medir.sh` | con `jq` y `gawk` sobre el JSONL: adjuntos por tipo, adjuntos `hook_*`, registros de sistema de goal/Stop, cwd de arranque, instrucciones cargadas por repo |
| `outputs/medicion.txt` | su salida sobre el transcript de esta sesión |

## Los resultados

- **16 registros `stop_hook_summary`**, todos del mismo hook,
  `~/.claude/stop-hook-git-check.sh`, y todos con `cwd: /home/user`. Lo
  declara `/root/.claude/launcher-settings.json`, que el lanzador pasa como
  `--settings` (la fuente `flagSettings`): los Stop hooks funcionan en esta
  sesión; lo que no carga es el cableado de thyrox y del consumidor.
- **0 adjuntos `hook_*` y 0 registros de goal**: ningún `/goal` se declaró en
  esta sesión, y ningún hook de `SessionStart`, `UserPromptSubmit` ni
  `PreToolUse` del consumidor corrió.
- **cwd de arranque `/home/user`** (primera instantánea `environment`, y el
  `cwd` de los 16 registros de Stop). El `workingDirectory` de las
  instantáneas siguientes sigue al `cd` del shell, así que no es la raíz del
  proyecto.
- **Instrucciones cargadas:** 41 archivos de `kaupamex-docs` y 8 de `thyrox`,
  todos como tipo «Project» por `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`.

Un primer conteo por `grep` sobre el archivo entero dio 30 «goal/Stop hook»:
eran la conversación que NOMBRA `/goal`. La sonda cuenta sólo registros de
sistema y adjuntos.

*Métrica:* registros del JSONL por `type`, `subtype` y `attachment.type`.
*Ciega a:* un hook que corra sin dejar adjunto; no hay en el disco un
transcript con adjuntos `hook_*` que sirva de positivo, así que el cero de esa
fila no discrimina. El de `stop_hook_summary` sí: el instrumento vio 16.
