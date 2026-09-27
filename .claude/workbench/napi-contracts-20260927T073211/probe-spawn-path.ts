// Sonda: ¿Bun.spawnSync resuelve el ejecutable con el PATH mutado en caliente?
process.env.PATH = '/tmp/tmp.qFVU3DFMUn:' + process.env.PATH
for (const run of [
  () => Bun.spawnSync({ cmd: ['zzfake'] }).stdout.toString().trim(),
  () => Bun.spawnSync({ cmd: ['zzfake'], env: process.env }).stdout.toString().trim(),
  () => String(Bun.which('zzfake')),
]) { try { console.log(run()) } catch (e) { console.log('lanza:', String(e)) } }
