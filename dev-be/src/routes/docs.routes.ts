import type { Request } from 'express'
import { Router } from 'express'
import multer, { type FileFilterCallback } from 'multer'
import { docsController } from '../controllers/index.js'
import { requireAuth } from '../middlewares/auth.js'
import { AppError } from '../utils/errors.js'

const router = Router()

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new AppError('Unsupported file type', 400))
    }
    return cb(null, true)
  },
})

router.post('/upload', requireAuth, upload.single('file'), docsController.uploadDocument)
router.get('/', requireAuth, docsController.listDocuments)
router.get('/:id', requireAuth, docsController.getDocument)
router.put('/:id', requireAuth, docsController.updateDocument)
router.delete('/:id', requireAuth, docsController.deleteDocument)

export default router
