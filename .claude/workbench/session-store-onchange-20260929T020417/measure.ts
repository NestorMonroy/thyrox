// Módulos que `repl/onChangeAppState.ts` añade al grafo del bootstrap:
// la unión de los dos grafos menos el del bootstrap solo.
const root = process.argv[2]!
const graph = async (entry: string) => {
  const r = await Bun.build({ entrypoints: [entry], target: 'bun', metafile: true, packages: 'bundle', external: ['*.node'] })
  if (!r.success) throw new Error(r.logs.map(String).join('\n'))
  return new Set(Object.keys(r.metafile!.inputs))
}
const boot = await graph(`${root}/src/packages/app-host/src/runtime/bootstrap.ts`)
const change = await graph(`${root}/src/packages/repl/src/onChangeAppState.ts`)
const added = [...change].filter(p => !boot.has(p))
console.log(`bootstrap=${boot.size} onChangeAppState=${change.size} added=${added.length}`)
console.log(added.slice(0, 40).join('\n'))
