import { Router } from 'express'
import { notificationsController } from '../controllers/index.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

router.get('/', requireAuth, notificationsController.listNotifications)
router.patch('/:id/read', requireAuth, notificationsController.markRead)

export default router
