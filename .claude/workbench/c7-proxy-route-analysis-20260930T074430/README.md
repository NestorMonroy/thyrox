# C7 — cómo 2.1.283 atiende una petición sin credencial propia (túnel por socket)

Pregunta: TASK-THYROX-0500 (C7) retira la delegación directa de `thyrox -p` en
`claude -p`: sin credencial, `thyrox -p` debe apuntar su provider http al proxy
local (upstream `claude-cli`, C5, TASK-THYROX-0498). ¿Cómo lo resuelve el
ejecutable de referencia?

Corpus: `/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root`.
Consultas lanzadas en paralelo con `bin/parallel_map` sobre `bin/binary literal`
y `bin/binary symbol`; cada salida está en `literals/` y `symbol-*.txt`.

## Lo medido

| Símbolo | Chunk | Qué hace |
|---|---|---|
| `nRe` | `chunk-vmq4raye.js` | `nRe="ssh-placeholder"`: el marcador de credencial |
| `i1` | `chunk-7y2gzc5g.js` [25187,25430) | el socket del túnel: `ANTHROPIC_UNIX_SOCKET` activa el túnel sólo si NO hay `ANTHROPIC_AUTH_TOKEN` y exactamente una de `CLAUDE_CODE_OAUTH_TOKEN`/`ANTHROPIC_API_KEY` vale el marcador; memoizado en el estado global (`h().tunnelSocket`) |
| `NB` | `chunk-bfkwjer3.js` [1597,1703) | con túnel (`i1() !== void 0`) cuenta como autenticado aunque no haya credencial real; con `ANTHROPIC_UNIX_SOCKET` sin marcador, no |
| `r0r` | `chunk-7y2gzc5g.js` [2321,3660) | la cabecera de atribución consulta `ANTHROPIC_UNIX_SOCKET`: el túnel cambia qué se firma |
| `Q3o` | `chunk-bfkwjer3.js` [5918,6890) | el diagnóstico de auth lista `ANTHROPIC_UNIX_SOCKET` junto a las credenciales |

`ANTHROPIC_UNIX_SOCKET` aparece en 39 declaraciones del corpus
(`literals/ANTHROPIC_UNIX_SOCKET.txt`); `ssh-placeholder`, en 1.

## Lo que ya está portado en thyrox

`tunnelSocket` (`provider/src/credentials.ts:86`) es el porte de `i1`, y
`resolveCredential` devuelve `source: 'proxy'` sin secreto cuando hay túnel.
`printDelegation.ts` no delega con esa fuente (`source !== 'none'`). El pool ya
entrega a cada ítem `ANTHROPIC_UNIX_SOCKET` y `ANTHROPIC_API_KEY=ssh-placeholder`
con `--credential-proxy`.

## Consecuencia para C7

La referencia no «delega»: el cliente sin credencial habla con un socket local
que pone la credencial. C7 es entonces, sin credencial propia y sin túnel
declarado: localizar o levantar el proxy local con el upstream `claude-cli` de
C5 y entrar al túnel (`ANTHROPIC_UNIX_SOCKET` + marcador) en vez de lanzar
`claude -p`; sin proxy disponible, rehusar con causa. La delegación directa se
retira cuando C5a–C5c estén en verde, como dice la tarea.

*Métrica:* declaraciones de nivel superior del corpus 2.1.283 que contienen cada
literal, y el cuerpo de cada símbolo por `bin/binary symbol`.
*Ciega a:* el lado servidor del túnel (quien escucha y pone la credencial): en la
referencia es la sesión SSH remota, fuera de este ejecutable.
