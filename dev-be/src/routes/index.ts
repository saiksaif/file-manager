import { Router } from 'express'
import authRoutes from './auth.routes.js'
import docsRoutes from './docs.routes.js'
import categoriesRoutes from './categories.routes.js'
import notificationsRoutes from './notifications.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/documents', docsRoutes)
router.use('/categories', categoriesRoutes)
router.use('/notifications', notificationsRoutes)

export default router
