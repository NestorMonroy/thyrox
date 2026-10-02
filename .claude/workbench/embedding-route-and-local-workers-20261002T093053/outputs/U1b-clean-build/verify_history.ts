// El gate de publicación existente (`assertImageFreeOf`) sobre la imagen
// candidata: sin variables de proxy grabadas en el historial ni en Config.Env.
import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { assertImageFreeOf } from '@thyrox/image-registry/promotion.ts'

const image = process.argv[2]
await assertImageFreeOf(createPodmanExecutor(), image, { forbiddenValues: [] })
console.log(`history clean: ${image}`)
