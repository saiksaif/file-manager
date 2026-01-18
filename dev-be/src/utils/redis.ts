import { createClient, type RedisClientType } from 'redis'
import { env } from './env.js'

let client: RedisClientType | null = null
let ready = false

export const initRedis = async () => {
  if (!env.REDIS_URL) {
    return
  }

  if (!client) {
    client = createClient({ url: env.REDIS_URL })
    client.on('ready', () => {
      ready = true
    })
    client.on('error', (error: unknown) => {
      ready = false
      console.warn('Redis error:', error)
    })
    client.on('end', () => {
      ready = false
    })
  }

  if (!client.isOpen) {
    await client.connect()
  }

}

export const getRedisClient = () => {
  if (!client || !ready) {
    return null
  }
  return client
}

export const closeRedis = async () => {
  if (client && client.isOpen) {
    await client.quit()
  }
}
