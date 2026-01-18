import { getUserNamespace } from '../socket/index.js'

export const emitToAll = (event: string, payload: unknown) => {
  try {
    const namespace = getUserNamespace()
    namespace.emit(event, payload)
  } catch {
    // Socket server not initialized yet
  }
}

export const emitToUser = (userId: number, event: string, payload: unknown) => {
  try {
    const namespace = getUserNamespace()
    namespace.to(`user:${userId}`).emit(event, payload)
  } catch {
    // Socket server not initialized yet
  }
}
