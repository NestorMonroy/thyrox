"""Endurece «sin el artefacto en la caché, stage rehúsa»: el ENOENT de link también nombraba la ruta."""
from pathlib import Path

old = "    await expect(ollamaModelsMount(cacheDir).stage!(ARTIFACT)).rejects.toThrow(cachedArtifactPath(cacheDir, SHA))\n"
new = "    await expect(ollamaModelsMount(cacheDir).stage!(ARTIFACT)).rejects.toThrow('no está en la caché')\n"
for path in (Path("/home/user/thyrox/src/packages/local-models/__tests__/ollamaModelsDirectory.test.ts"),
             Path(__file__).with_name("models-directory.test.ts")):
    text = path.read_text(encoding="utf-8")
    assert text.count(old) == 1, path
    path.write_text(text.replace(old, new), encoding="utf-8")
