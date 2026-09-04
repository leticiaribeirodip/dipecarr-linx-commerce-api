import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth';
import { ProductService } from '../services/product.service';
import { createLinxController } from '../controllers/linx.controller';
import { HttpError } from '../utils/http-error';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isXlsx = file.mimetype.includes('spreadsheet') || file.originalname.toLowerCase().endsWith('.xlsx');
    if (!isXlsx) return cb(new HttpError(400, 'Somente arquivos .xlsx são aceitos.'));
    return cb(null, true);
  },
});

export function linxRoutes(service: ProductService) {
  const router = Router();
  const controller = createLinxController(service);
  router.use(authenticate);
  router.get('/template', controller.template);
  router.get('/products/feed', controller.feed);
  router.get('/products/export', controller.export);
  router.post('/products/import', upload.single('file'), controller.import);
  return router;
}
