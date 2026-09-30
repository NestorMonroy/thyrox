# #106e-5c-3b — storage state de chatgpt-web

Porte de `normalizeChatGptWebStorageState` (`omniroute:
open-sse/utils/chatgptWebExecutorAdapter.ts`) y de
`validateChatGptWebProvider` (`omniroute:
src/lib/providers/validation/chatgptWeb.ts`), MIT.

- `red-106e5c3b.txt`: la mitad roja, antes de que existiera el módulo.
- `annul-106e5c3b.sh`: 24 anulaciones, una por decisión.
- `results-106e5c3b.txt`: fallos por anulación.

Divergencias con la referencia:

- El recorte del punto inicial del dominio (`replace(/^\./, '')`) no se
  porta: la anulación 3 mostró que no cambia ningún veredicto, porque
  `.chatgpt.com` ya cumple `endsWith('.chatgpt.com')`.
- La sonda de cookies web usa este validador por defecto para
  `chatgpt-web`; un mapa de validadores inyectado lo sustituye entero.
