const r = await Bun.build({ entrypoints: [process.argv[2]!], target: 'bun', metafile: true, external: ['*.node'], throw: false })
const inputs = r.metafile!.inputs
const boot = Object.keys(inputs).filter(k => k.includes('runtime/bootstrap'))
console.log(boot, boot.map(k => inputs[k]!.imports.slice(0, 3)))
