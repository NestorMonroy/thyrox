from pathlib import Path
import shutil, os
d = Path('src/packages/model-scheduling/bin'); d.mkdir(exist_ok=True)
shutil.copy('/scratch/p4/socketPath.ts', d / 'socketPath.ts'); os.chmod(d / 'socketPath.ts', 0o755)
p = Path('src/packages/model-scheduling/coordinatorProtocol.ts'); s = p.read_text()
old = "export const MODEL_COORDINATOR_RUNTIME_ENV = 'THYROX_RUNTIME_DIR'\n"
assert s.count(old) == 1
s = s.replace(old, old + "/**\n * El socket declarado gana a la ruta derivada (TASK-THYROX-0759): una unidad lo\n * recibe montado sin redefinir el runtime entero, que gobierna otros estados.\n */\nexport const MODEL_COORDINATOR_SOCKET_ENV = 'THYROX_MODEL_COORDINATOR_SOCKET'\n")
old = "  return `${resolveDataDir(MODEL_COORDINATOR_RUNTIME_ENV, MODEL_COORDINATOR_SUBDIR, env)}/${MODEL_COORDINATOR_SOCKET}`"
assert s.count(old) == 1
s = s.replace(old, "  const declared = env[MODEL_COORDINATOR_SOCKET_ENV]?.trim()\n  if (declared) return declared\n" + old)
p.write_text(s)
e = Path('.env.example'); s = e.read_text()
old = "THYROX_RUNTIME_DIR=\n"
assert s.count(old) == 1
s = s.replace(old, old + "\n# El socket del coordinador de model scheduling, si no es el derivado del\n# runtime (`coordinatorProtocol.ts::modelCoordinatorSocketPath`). Vacío = el\n# derivado. `headless-pool --execution unit` lo nombra en la unidad del ítem,\n# junto a su directorio montado de sólo lectura.\nTHYROX_MODEL_COORDINATOR_SOCKET=\n", 1)
e.write_text(s); print('ok')
