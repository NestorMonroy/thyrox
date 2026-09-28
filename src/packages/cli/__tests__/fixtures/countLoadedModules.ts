// Precarga de prueba: al salir, escribe en stderr cuántos módulos cargó el proceso.
process.on('exit', () => {
  process.stderr.write(`LOADED_MODULES=${Object.keys(require.cache).length}\n`)
})
