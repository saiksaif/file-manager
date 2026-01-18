import { Router } from 'express'
import { categoriesController } from '../controllers/index.js'
import { requireAdmin, requireAuth } from '../middlewares/auth.js'

const router = Router()

router.get('/', categoriesController.listCategories)
router.post('/', requireAuth, requireAdmin, categoriesController.createCategory)

export default router
