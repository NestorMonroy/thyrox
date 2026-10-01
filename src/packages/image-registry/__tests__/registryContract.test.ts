/**
 * El mismo contrato contra cada implementación: un consumidor que sólo
 * cuenta con él puede recibir cualquiera de ellas.
 */
import { createDockerHubRegistry } from '../dockerHubRegistry.ts'
import { createOciRegistry } from '../ociRegistry.ts'
import { createFakePodmanRegistry } from '../testing/fakePodmanRegistry.ts'
import { createInMemoryRegistry } from '../testing/inMemoryRegistry.ts'
import { describeImageRegistryContract } from '../testing/registryContract.ts'

const LOCAL = 'localhost/thyrox-model-quantizer:dev'
const OTHER_LOCAL = 'localhost/thyrox-model-quantizer:other'

describeImageRegistryContract('en memoria', () => ({
  registry: createInMemoryRegistry({ registry: 'registry.example.com' }),
  localImage: LOCAL,
  otherLocalImage: OTHER_LOCAL,
  destination: { registry: 'registry.example.com', repository: 'lab/quantizer', tag: 'v1' },
}))

describeImageRegistryContract('generic-oci sobre la primitiva', () => ({
  registry: createOciRegistry({ provider: 'generic-oci', registry: 'registry.example.com', podman: createFakePodmanRegistry() }),
  localImage: LOCAL,
  otherLocalImage: OTHER_LOCAL,
  destination: { registry: 'registry.example.com', repository: 'lab/quantizer', tag: 'v1' },
}))

describeImageRegistryContract('dockerhub sobre la primitiva', () => ({
  registry: createDockerHubRegistry({ podman: createFakePodmanRegistry() }),
  localImage: LOCAL,
  otherLocalImage: OTHER_LOCAL,
  destination: { registry: 'docker.io', repository: 'th3rox/thyrox-model-quantizer', tag: 'v1' },
}))
