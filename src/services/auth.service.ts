import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types/auth';

const users: (AuthUser & { passwordHash: string })[] = [
  {
    id: 1,
    email: env.ADMIN_EMAIL,
    name: 'Administrador de Testes Linx',
    role: 'admin',
    passwordHash: bcrypt.hashSync(env.ADMIN_PASSWORD, 10),
  },
];

export async function login(email: string, password: string) {
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }

  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: env.JWT_EXPIRES_IN,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
