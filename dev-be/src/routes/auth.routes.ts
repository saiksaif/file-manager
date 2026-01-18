import { Router } from 'express'
import { authController } from '../controllers/index.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', requireAuth, authController.me)

export default router
