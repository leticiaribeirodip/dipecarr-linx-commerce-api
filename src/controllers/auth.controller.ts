import { Request, Response } from 'express';
import { z } from 'zod';
import { login } from '../services/auth.service';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function loginController(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dados inválidos.', errors: parsed.error.issues });

  const result = await login(parsed.data.email, parsed.data.password);
  if (!result) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  return res.json(result);
}

export function meController(req: Request, res: Response) {
  return res.json({ authenticated: true, token: req.auth });
}
