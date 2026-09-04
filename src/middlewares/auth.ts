import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthTokenPayload } from '../types/auth';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

function toAuthPayload(decoded: string | jwt.JwtPayload): AuthTokenPayload | null {
  if (typeof decoded === 'string') return null;
  const { sub, email, role } = decoded;
  if (typeof sub !== 'number' && typeof sub !== 'string') return null;
  if (typeof email !== 'string') return null;
  if (role !== 'admin' && role !== 'operator') return null;
  return { sub: Number(sub), email, role };
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token Bearer não informado.' });
  }

  const token = header.slice('Bearer '.length).trim();
  let payload: AuthTokenPayload | null;
  try {
    payload = toAuthPayload(jwt.verify(token, env.JWT_SECRET));
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }

  if (!payload) return res.status(401).json({ message: 'Token com conteúdo inesperado.' });
  req.auth = payload;
  return next();
}
