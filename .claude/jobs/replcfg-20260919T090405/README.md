# replcfg — el subconjunto derivado, y su ceguera

## Qué se lanzó

```
bun test src/packages/repl src/packages/config \
         src/packages/tool-registry/src/tools/shared/__tests__
```

## Qué se preguntaba

`alcance-de-la-suite.md` manda derivar el subconjunto de los símbolos
tocados. El comando derivador —`grep -rlE "ProjectConfig|writeThrough…"`
sobre los `*.test.ts` del árbol— devuelve **un solo directorio**:
`tool-registry/src/tools/shared/__tests__`.

Ese uno es insuficiente por construcción: el derivador ve el símbolo
CITADO, y los consumidores que importaban el módulo sin nombrarlo —los
de `repl`, que es donde el porte movió la aguja— no aparecen. Es la
ceguera que la propia regla declara. Por eso se corrieron los tres.

## Qué se recogió

`__BG_EXIT__=1`: **1139 pass, 21 fail, 3 errors** sobre 1160 casos en 64
archivos. La cifra NO es comparable con el 529/4/0 del porte, porque su
universo es otro — de ahí `replsolo`, que aísla `repl`.

Destapó un defecto pre-existente ajeno a este pase:

```
Cannot find module '@thyrox/config/managedPath'
  from tool-registry/src/markdownConfigLoader.ts
```

`managedPath` vive en `config/settings/managedPath.ts`. El comodín
`"./*": "./*.ts"` resuelve el specifier a `config/managedPath.ts`, que no
existe: el import está mal escrito, le falta el segmento `settings/`. No
se corrigió aquí — es de `tool-registry`, fuera del pathspec de este
commit.

*Metrica:* `bun test` sobre tres rutas, agregando sus tres universos.
*Ciega a:* la atribución por suite — un agregado de tres no dice cuál de
las tres movió qué, y por eso no sirve para comparar contra un baseline
de una sola.
