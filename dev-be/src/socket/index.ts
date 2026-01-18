import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import cookie from 'cookie'
import { verifyAccessToken } from '../utils/jwt.js'
import { getRedisClient } from '../utils/redis.js'
import { env } from '../utils/env.js'

let io: Server | null = null

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : true,
      credentials: true,
    },
  })

  const users = io.of('/users')

  users.use((socket: Socket, next: (err?: Error) => void) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie
      const parsedCookies = cookieHeader ? cookie.parse(cookieHeader) : {}
      const authHeader = socket.handshake.headers.authorization
      const bearerToken = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined
      const token =
        socket.handshake.auth?.token ||
        parsedCookies.access_token ||
        bearerToken

      if (!token) {
        return next(new Error('Unauthorized'))
      }

      const payload = verifyAccessToken(token)
      socket.data.userId = Number(payload.sub)
      socket.data.role = payload.role

      return next()
    } catch {
      return next(new Error('Unauthorized'))
    }
  })

  users.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId as number
    const room = `user:${userId}`
    socket.join(room)

    const redis = getRedisClient()
    if (redis) {
      try {
        await redis.sAdd(`user:sockets:${userId}`, socket.id)
        await redis.sAdd('online:users', String(userId))
      } catch {
        // Ignore Redis failures to keep sockets alive
      }
    }

    users.emit('user:online', { userId })
    socket.emit('connection:status', { status: 'connected' })

    socket.on('disconnect', async () => {
      const redisClient = getRedisClient()
      if (redisClient) {
        try {
          await redisClient.sRem(`user:sockets:${userId}`, socket.id)
          const remaining = await redisClient.sCard(`user:sockets:${userId}`)
          if (remaining === 0) {
            await redisClient.sRem('online:users', String(userId))
            users.emit('user:offline', { userId })
          }
        } catch {
          // Ignore Redis failures
        }
      }
    })
  })

  return io
}

export const getUserNamespace = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized')
  }
  return io.of('/users')
}
