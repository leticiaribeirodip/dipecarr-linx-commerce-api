import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { isHttpError } from '../utils/http-error';
import { isProduction } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({ message: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isHttpError(error)) {
    if (error.status >= 500) console.error(error);
    return res.status(error.status).json({ message: error.message, details: error.details });
  }

  // Upload acima do limite ou campo inesperado é erro do cliente, não 500.
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message, field: error.field });
  }

  console.error(error);
  const message = error instanceof Error && !isProduction ? error.message : 'Erro interno.';
  return res.status(500).json({ message });
}
