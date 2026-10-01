import { describeCoordinationContract } from '../coordinationContract.ts'
import { createMemoryCoordination } from '../memoryCoordination.ts'

describeCoordinationContract('memoria (local)', async () => createMemoryCoordination())
