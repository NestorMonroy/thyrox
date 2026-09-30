# Cabeceras de identidad de sesión y de subagente del cliente

Pregunta: ¿el cliente de thyrox manda las cabeceras con que el ejecutable
2.1.283 identifica la sesión y el subagente de cada petición? Un proxy
local las necesita para no mezclar la afinidad de credencial de un
subagente con la de su padre.

## Extracción (`bin/binary`, raíz `_references/claude-code-bin/2.1.283/bunfs-root`)

| Salida | Qué es |
|---|---|
| `outputs/literal-session-id.txt` | el literal `X-Claude-Code-Session-Id` vive en `Fdt` (`chunk-t6pwageh.js`) |
| `outputs/references-Fdt.txt` | sus tres usuarios: `EV`, `me`, `TC` |
| `outputs/symbol-EV.txt` | `EV`, el constructor del cliente: sesión (`[Fdt]: Y()`), `x-claude-code-agent-id` y `x-claude-code-parent-agent-id` (tramo `V`, sólo fuera del hilo principal) y tres cabeceras de pista para pasarela bajo `qnn()` |
| `outputs/symbol-n3n.txt` | `n3n`: codifica `%` y lo que no es ASCII imprimible |
| `outputs/symbol-agent-helpers.txt` | `of` (¿hilo principal?), `VOo`, `qOo`, `qnn` y los nombres `yqn`/`_qn`/`bqn` |
| `outputs/EV-calls.txt` | las llamadas a `EV`: casi todas pasan `agentContext: Ac()`, el contexto en curso |

## Lo que la medición corrigió

La primera búsqueda concluyó «thyrox no manda cabecera de sesión». Era
falso: `client.ts` manda `X-Claude-Code-Session-Id` con
`anthropic.getSessionId()`. El `git grep` se cortó con `head -5` y las cinco
primeras líneas eran usos de `--session-id` en otros paquetes. Lo que falta
de verdad son las cabeceras del **subagente**.

## Lo que se portó (TDD)

- `provider/src/anthropic/agentIdentityHeaders.ts`: el tramo `V` y `n3n`. El
  hilo principal no se identifica; un subagente manda su id y el de su padre,
  codificados.
- `getAnthropicClient` recibe `agentContext` y, sin él, toma el contexto en
  curso (`getAgentContext()`), el equivalente de `Ac()` en cada llamada.
- Nombres: `x-thyrox-agent-id` y `x-thyrox-parent-agent-id`, porque
  `check_product_word` rechaza «Claude» nuevo en el código (decisión del
  ejecutor). La cabecera de sesión existente no se tocó: está en el baseline,
  y el proxy tiene el id de sesión en `metadata.user_id`.

Anulaciones: retirar la exclusión del hilo principal, la codificación o la
cabecera del padre tumba cada una su caso. La primera anulación del padre
dejó un literal de objeto inválido (`void 0,`), y el «1 fallo» era el
archivo sin cargar; se repitió con un `...({})` válido.

## Pendiente

- Las tres cabeceras de pista para pasarela (`x-claude-code-request-class`,
  `-agent-type`, `-prompt-id`) bajo `qnn()`: dependen de una bandera remota
  (`tengu_splendid_sutton`) y de `ks()`, sin portar.
- La afinidad de sesión del proxy (tarea #75) que las consume.
