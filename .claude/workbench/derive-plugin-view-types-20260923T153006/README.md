# Tipos de `/plugin` derivados de sus constructores

`commands/plugin/types.ts` (`ViewState`, `PluginSettingsProps`) y
`unifiedTypes.ts` (`UnifiedInstalledItem`) eran stubs `unknown`. Raíces medidas
agrupando TS18046 por expresión: `viewState` (32, `PluginSettings.tsx`),
`item` (24 en `UnifiedInstalledCell.tsx`, 12 en `ManagePlugins.tsx`).

Método: `viewstate-shapes.ts` lista los objetos literales con `type: '<lit>'`
en los 6 archivos que usan `ViewState`. Salen TRES uniones mezcladas: el
`ViewState` padre, la vista local de `ManagePlugins` y los ítems unificados.
`field-types.ts` pide al checker del proyecto el tipo de cada inicializador
(`field-types.out`). Un campo es opcional si algún constructor lo omite o le
asigna `undefined`.

Resultado: una pasada de tsc da 4 292 → 4 169, sin diagnósticos nuevos.

Métrica: tipos del checker sobre los inicializadores de los constructores.
Ciega a: un campo del original que ningún constructor del árbol asigne.
