# #106f-1 — hogar del store y `thyrox providers list|remove`

Porte de `findConnectionFromResponse`, `runProviderRemoveCommand` y
`confirmRemoval` (`omniroute: bin/cli/commands/provider-crud.mjs`), de
`runListCommand`, `publicConnection` y `printProviderTable`
(`bin/cli/commands/providers.mjs`) y del hogar de datos
(`bin/cli/data-dir.mjs`), MIT.

- `red-106f1.txt`: la mitad roja de las dos suites.
- `annul-106f1.sh`: 31 anulaciones; `rerun-106f1.sh` repite las tres afinadas.
- `results-106f1.txt`: las dos pasadas.

Divergencias con la referencia:

- El store es local: `remove` borra en el store, no pide el borrado a un
  servidor remoto.
- La tabla no lleva color ANSI: el estado va como texto.
- El hogar cuelga del de configuración de thyrox (`THYROX_PROVIDERS_DATA_DIR`
  lo declara aparte) y se cierra a su dueño aunque ya existiera.
