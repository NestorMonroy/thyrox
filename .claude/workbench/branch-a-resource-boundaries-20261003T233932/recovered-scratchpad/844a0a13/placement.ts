import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { observedUnitPlacement } from '/home/user/thyrox/src/packages/local-models/unitPlacement.ts'
console.log(await observedUnitPlacement(createPodmanExecutor())())
