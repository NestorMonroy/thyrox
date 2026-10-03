# Clean quantizer build: accepted

- Image `localhost/thyrox-model-quantizer:clean-candidate`, id b3014db2…, 1 279 630 682 B,
  labels thyrox.task=TASK-THYROX-0747, io.thyrox.image.lifecycle=cache.
- History: `assertImageFreeOf` (image-registry/promotion.ts) passes. Control: the same guard on
  the old `:dev` image (ddf16d444d8b) refuses it (HTTPS_PROXY, https_proxy).
- `llama-embedding --version` runs inside the image (build 11277, commit eae11d221).
- Free disk 8 926 765 056 B before, 7 665 123 328 B after (the image and its layers).
- Definition test `buildDefinitionHistory.test.ts`: 2/2; with the old Containerfile the definition
  case fails and the control passes.
