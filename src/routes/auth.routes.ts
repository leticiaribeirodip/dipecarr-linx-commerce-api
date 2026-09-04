import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { loginController, meController } from '../controllers/auth.controller';

export const authRoutes = Router();
authRoutes.post('/login', loginController);
authRoutes.get('/me', authenticate, meController);
