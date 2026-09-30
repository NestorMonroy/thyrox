# doble-renombrado-claude-code

## El encargo

Llevar a verde `config/__tests__/pluginIdentifier.test.ts`, que fallaba en
`isOfficialMarketplaceName('CLAUDE-CODE-PLUGINS')`.

## La premisa, si se corrigio al primer comando

Se suponía un fallo de mayúsculas; la función ya comparaba en minúsculas. El
fallo era el contenido del conjunto: `claude-code-marketplace` figuraba como
`claude-code-how-works-how-works-marketplace`. Un renombrado global se aplicó
dos veces sobre `claude-code`.

## Las piezas

| archivo | que hace |
|---|---|
| `outputs/archivos.txt` | los 115 archivos de `src/` y `tests/` que llevaban el literal doble, antes de sustituirlo |

## Los resultados

- 115 archivos, 89 formas distintas del literal doble, entre ellas
  `/etc/claude-code/managed-settings.json`, el bucket del actualizador,
  `anthropics/claude-code-action` y los mercados oficiales de plugins.
- El binario 2.1.275 contiene `/etc/claude-code`, `claude-code-releases` (6),
  `anthropics/claude-code-action` (16), `claude-code-keybindings.json` (3) y
  **0** veces `claude-code-how-works`.
- Sustituido `claude-code-how-works-how-works` → `claude-code`; quedan 0.
- Quedan 340 archivos con `@claude-code-how-works/*` sin repetir: es el
  alcance de paquetes del proyecto de referencia, citado como procedencia.
  No se toca.

Hallazgo: H-THYROX-171.

*Metrica:* `git grep` del literal doble sobre `src/` y `tests/`.
*Ciega a:* un literal que el binario escribe `claude-code` y que el renombrado
dejó como `claude-code-how-works` una sola vez: este grep no lo separa del
nombre legítimo del proyecto de referencia.
