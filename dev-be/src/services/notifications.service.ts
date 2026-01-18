import { prisma } from '../utils/db.js'

export const createNotification = async (params: {
  userId: number
  type: string
  title: string
  message?: string
}) => {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message || null,
    },
  })
}

export const listNotifications = async (params: {
  userId: number
  page: number
  limit: number
}) => {
  const skip = (params.page - 1) * params.limit

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: params.limit,
    }),
    prisma.notification.count({ where: { userId: params.userId } }),
  ])

  return {
    data: notifications,
    meta: { total, page: params.page, limit: params.limit },
  }
}

export const markNotificationRead = async (params: {
  userId: number
  id: number
}) => {
  const result = await prisma.notification.updateMany({
    where: { id: params.id, userId: params.userId },
    data: { read: true },
  })

  return result.count > 0
}
