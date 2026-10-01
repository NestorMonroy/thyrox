// Costo de importar cada módulo del camino de arranque, en orden, en un proceso nuevo por módulo.
const target = process.argv[2]!
const t0 = performance.now()
await import(target)
const ms = performance.now() - t0
console.log(`${ms.toFixed(0)}\t${Math.round(process.memoryUsage().rss / 1048576)}MB\t${target}`)
process.exit(0)
