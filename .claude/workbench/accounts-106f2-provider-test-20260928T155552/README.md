# #106f-2 — `thyrox providers test|test-all|validate`

Porte de `testProviderApiKey` (`omniroute: bin/cli/provider-test.mjs`), de
`runProviderTest`, `validateConnection`, `runTestCommand`,
`runTestAllCommand` y `runValidateCommand` (`bin/cli/commands/providers.mjs`)
y de `updateProviderTestResult` (`bin/cli/provider-store.mjs`), MIT.

- `red-106f2-*.txt`: la mitad roja de las tres suites.
- `annul-106f2.sh`: 36 anulaciones; `results-106f2.txt`, sus fallos.

Divergencias con la referencia:

- Las variables de modelo de la prueba son `THYROX_PROVIDER_TEST_<ID>_MODEL` y
  `THYROX_PROVIDER_TEST_MODEL`.
- Lo que la receta de clave no sabe probar, la referencia lo pide a su
  servidor; aquí una conexión de cookie web va a la sonda local de su sesión
  (`validateWebCookieProvider`), y lo demás se salta sin guardarse.
- `validate` además señala las credenciales que no se pudieron descifrar con
  la clave configurada.
- La salida de texto no lleva encabezado ni color.
