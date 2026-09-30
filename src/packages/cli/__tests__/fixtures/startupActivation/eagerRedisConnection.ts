// Control de anulación: una inicialización ansiosa que abre una conexión TCP a THYROX_REDIS_URL al evaluarse.
const redisUrl = new URL(process.env.THYROX_REDIS_URL ?? '')

await new Promise<void>((resolve, reject) => {
  Bun.connect({
    hostname: redisUrl.hostname,
    port: Number(redisUrl.port),
    socket: {
      open(socket) {
        socket.end()
        resolve()
      },
      data() {},
      connectError(_socket, error) {
        reject(error)
      },
    },
  }).catch(reject)
})

export {}
