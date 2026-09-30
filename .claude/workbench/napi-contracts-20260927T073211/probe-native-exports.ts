// Sonda: métodos que exporta cada .node, el vendorizado y el de 2.1.283.
const [, , ...files] = process.argv
for (const f of files) {
  try {
    const m = require(f) as Record<string, unknown>
    console.log(`${f}\t${Object.keys(m).sort().join(',')}`)
  } catch (e) { console.log(`${f}\tNO CARGA: ${e}`) }
}
