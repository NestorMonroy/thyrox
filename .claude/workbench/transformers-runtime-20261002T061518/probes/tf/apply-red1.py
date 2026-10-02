from pathlib import Path
t = Path('src/packages/model-scheduling/__tests__/podmanModelUnitMaterializer.test.ts'); s = t.read_text()
old = "import { MODEL_UNIT_CONTAINER_PREFIX, MODEL_UNIT_LABELS, PodmanModelUnitMaterializer } from '../podmanModelUnitMaterializer.ts'"
assert s.count(old) == 1
s = s.replace(old, "import { MODEL_UNIT_CONTAINER_PREFIX, MODEL_UNIT_LABELS, modelUnitId, PodmanModelUnitMaterializer } from '../podmanModelUnitMaterializer.ts'")
t.write_text(s + Path('/scratch/tf/materializer-tests.ts').read_text())
c = Path('src/packages/local-models/__tests__/hostCoordinatorComposition.test.ts')
c.write_text(c.read_text() + Path('/scratch/tf/placement-tests.ts').read_text())
print('ok')
