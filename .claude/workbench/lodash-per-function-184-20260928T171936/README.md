# #184 — `lodash-es` por función

El análisis de arranque (#130) midió dos importadores del barril
`lodash-es`: `SkillTool/prompt.ts` y `shell/src/sandbox/sandbox-adapter.ts`.
El resto del árbol ya usa `lodash-es/<función>.js`.

- `red.txt` — `tests/package/lodash_imports.test.ts` falla nombrando los dos.
- `green.txt` — tras cambiar a `import memoize from 'lodash-es/memoize.js'`,
  3/3. El caso negativo de la suite es la línea real anterior al arreglo.
- `typecheck.txt` — `shell` y `tool-registry` sin errores propios.

*Métrica:* `from 'lodash-es'` literal en `.ts`/`.tsx` de `src/`.
*Ciega a:* un `require('lodash-es')` o un `import('lodash-es')` dinámico.
