# El túnel de credencial por socket Unix (2.1.283)

Todo con `bin/binary` sobre `_references/claude-code-bin/2.1.283/bunfs-root`:

- `literal ANTHROPIC_UNIX_SOCKET` → 38 declaraciones en 18 chunks
  (`literal-ANTHROPIC_UNIX_SOCKET.txt`).
- `symbol chunk-7y2gzc5g.js i1` — la regla del túnel: socket presente, sin
  `ANTHROPIC_AUTH_TOKEN`, y exactamente una de `CLAUDE_CODE_OAUTH_TOKEN` /
  `ANTHROPIC_API_KEY` igual al marcador.
- `symbol chunk-vmq4raye.js nRe` — el marcador: `"ssh-placeholder"`.
- `symbol chunk-2r9e48vs.js dt at nt` — en túnel el cliente manda
  `authHeaders` vacíos con `socketPath`, y el tipo de autenticación es
  `"proxy"`.
- `symbol chunk-bfkwjer3.js Ijn` — el texto del propio ejecutable: con el
  socket y sin token OAuth, «requests on the socket carry no claude.ai login
  (on a claude ssh remote: the local machine is API-key-authed)». La
  credencial la pone quien escucha.
- `symbol chunk-bv3ay8p2.js up` y `chunk-vmq4raye.js f3n` — al componer el
  entorno de un hijo, el marcador se conserva cuando hay socket.

El lado que escucha (`claude ssh`, en la máquina local) no aparece en el
bundle: la búsqueda de sus argumentos de reenvío (`literal -R`, 16
declaraciones) no lo aísla. Se implementa por el contrato del cliente.

## En thyrox

- `provider: credentials.ts` — `SSH_PLACEHOLDER`, `tunnelSocket` (port de
  `i1`) y la fuente `proxy` de `resolveCredential`, sin secreto.
- `provider: credentialProxy.ts` — el proxy: escucha en el socket, descarta
  las cabeceras de autenticación de la petición, pone las suyas y reenvía al
  servicio; la respuesta vuelve como flujo.

Anulaciones, cada una tumba exactamente su caso: reenviar la credencial de la
petición → caso 5; no entrar en túnel → caso 3.

La credencial del proxy sale de las fuentes que el usuario declara en su
proceso. La del anfitrión de esta sesión no se usa: llega por un descriptor
que el shell no hereda, y el anfitrión la retira de los hijos a propósito
(`binary-host-auth-20260926T223508`).
