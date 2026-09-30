# Rotación de THYROX_STORAGE_ENCRYPTION_KEY

La clave de almacenamiento quedó publicada en `origin/feature/thyrox-l6`
(`ae7fd40d`, H-THYROX-245). El árbol no sabía rotarla: el generador rehusaba
a propósito, porque una clave nueva deja ilegibles las credenciales que la
anterior cifró. Este banco valida `rotateStorageKey` y `--rotate`.

- `suite.txt`: las pruebas de provider que nombran el cifrador, el
  generador o la rotación.
- `validate.sh`: typecheck estricto de provider y esas suites, en serie.
