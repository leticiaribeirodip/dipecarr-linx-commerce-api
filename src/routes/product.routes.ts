import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { ProductService } from '../services/product.service';
import { createProductController } from '../controllers/product.controller';

export function productRoutes(service: ProductService) {
  const router = Router();
  const controller = createProductController(service);
  router.use(authenticate);
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.post('/', controller.create);
  router.post('/generate-samples', controller.generate);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);
  return router;
}
