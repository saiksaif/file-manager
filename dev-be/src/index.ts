import http from 'node:http'
import type { Request, Response } from 'express'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import apiRoutes from './routes/index.js'
import { env } from './utils/env.js'
import { errorHandler, notFoundHandler } from './utils/errors.js'
import { closeRedis, initRedis } from './utils/redis.js'
import { initSocket } from './socket/index.js'
import { prisma } from './utils/db.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  })
)
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.use('/api', apiRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

const server = http.createServer(app)

initRedis().catch((error) => {
  console.warn('Redis initialization failed:', error)
})

initSocket(server)

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`)
})

const shutdown = async () => {
  await closeRedis()
  await prisma.$disconnect()
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
