# ListAgents de 2.1.284 — un ítem de dos (TASK-THYROX-0600)

Trabajas en un worktree de thyrox. Identificadores, nombres de archivo y firmas en inglés;
comentarios en español técnico, sin coloquialismos, con los términos técnicos en inglés. No
toques `_references/` (sólo lectura), `agent-results/` ni `.claude/`. Operaciones de archivo
por Bash (`sed`, `gawk`, `bin/replace_literal`); para una herramienta de `src/` usa su
envoltorio de `bin/`, nunca su ruta.

## Cómo se lee la referencia — con la herramienta, no a mano

La referencia es el corpus extraído de 2.1.284, de sólo lectura:

```bash
R=_references/claude-code-bin/2.1.284/bunfs-root
bash bin/binary declarations chunk-7h1n9jsx.js --root $R      # el módulo de ListAgents
bash bin/binary symbol chunk-6vtp2w5r.js tj M6 --root $R       # definición completa, sigue import/export
bash bin/binary references chunk-6vtp2w5r.js tj --root $R      # quién lo usa
```

La cabecera de `src/packages/binary/bin/binary.ts` es la ayuda de `bin/binary`. **Nunca
ejecutes `bin/binary extract`**: escribe en `_references/`. Porta cada símbolo que tu ítem
nombra y cada auxiliar que su definición use; si uno ya existe en thyrox, impórtalo en vez de
duplicarlo; si decides no portarlo, déjalo escrito en el docstring con su razón. Cada función
portada cita su símbolo de origen en el docstring (p. ej. «`tj` de 2.1.284»).

## Reglas, sin excepción

- **Prohibido `git stash`** en cualquier forma.
- **Nada en segundo plano y nunca termines el turno para esperar algo**: si cierras el turno,
  el ítem termina. Corre las pruebas en primer plano, acotadas con `timeout`.
- TDD: la prueba primero, en rojo; luego el porte. Trae un **control de anulación**: retira una
  rama de juicio y comprueba que caen exactamente las aserciones que dependen de ella;
  restáurala y vuelve a verde. Informa las dos salidas.
- Tu último mensaje es un informe: qué portaste, qué dejaste fuera y por qué, las pruebas con
  su salida.

Tu ítem es el que dice `Item:` al final. Haz SÓLO ese.

## Item `peer-ref-table`

Archivo nuevo `src/packages/local-observability/src/uds/peerRefTable.ts` y su prueba en
`src/packages/local-observability/src/uds/__tests__/peerRefTable.test.ts`. Porta de
`chunk-6vtp2w5r.js`:

- `tj` — la tabla de candidatos con `[ref]` (tipos `main`, `teammate`, `subagent`, `session`,
  `cloud-session`, `bridge-session`), con su cálculo de ref único por prefijo;
- `M6` — el formato `nombre [ref]`;
- `DUe` y `oBo` — la ref de la sesión propia y si el socket propio debe usar su ref larga;
- sus auxiliares internos (`R`, `M`, `Me`, `se`, `re`, `IUe`, `hr`, `hmt` y los que aparezcan).

El estado de la app (`teamContext`, `agentNameRegistry`, `tasks`) y el id de sesión entran como
parámetros o dependencias inyectadas, no se importan de un singleton. Ya existen y se
reutilizan: `normalizeSessionName` (`sessionNameState.ts`), `stableAddressEnabled`
(`sessionRegistryState.ts`), `isSameSocket`/`mayBeSameSocket` (`peerAddress.ts`). Las pruebas
cubren: refs distintos para nombres que colisionan, el prefijo mínimo que los separa, y que
`M6` compone `nombre [ref]`.

## Item `list-agents-format`

Archivo nuevo `src/packages/local-observability/src/uds/listAgentsFormat.ts` y su prueba en
`src/packages/local-observability/src/uds/__tests__/listAgentsFormat.test.ts`. Porta de
`chunk-7h1n9jsx.js` (`declarations` te da los 33) todo **salvo** `clr` y `dlr`:

- `aYo` (`formatForModel`) y `ulr` (`formatForUser`), con sus auxiliares `H R U F M X v I j D E
  q z V Y J C B y Q w` y las constantes `L O _ k W G N K`, con los textos **verbatim**;
- donde el original llama a `tj`/`M6` (la tabla de refs, que porta otro ítem en paralelo),
  recíbelos como **dependencia inyectada** con un tipo propio; no crees `peerRefTable.ts`;
- `Wne`, `jne`, `Ir`, `gmt`, `RBt`, `HUe`, `G8e`, `H6`, `sRr`, `OUe`, `nWr` de
  `chunk-6vtp2w5r.js`/`chunk-jzr0ww3p.js`: pórtalos aquí si no existen ya;
- `Zt` (duración con `mostSignificantOnly`) ya existe en `@thyrox/output`: impórtalo.

Las filas `cloud`, `bridge` y `did` se portan en el formato (el formato no decide si existen,
sólo las pinta). Las pruebas cubren: «No reachable agents.» sin filas, la línea de la sesión
propia con su nombre, las secciones Subagents / Teammates / Peer sessions con su recuento, el
recorte a 100 con «(… N more not shown)», y el aviso de mensajería apagada antepuesto.
