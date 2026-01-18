import type { NextFunction, Request, Response } from 'express'

export class AppError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.details = details
  }
}

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' })
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err?.name === 'MulterError' && err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large' })
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500
  const message = err instanceof AppError ? err.message : 'Internal server error'

  res.status(statusCode).json({ message })
}
