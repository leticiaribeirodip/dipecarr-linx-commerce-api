import { Request, Response } from 'express';
import fs from 'node:fs/promises';
import { ProductService } from '../services/product.service';
import { exportProducts, importProducts, TEMPLATE_PATH } from '../services/linx-excel.service';
import { parseBoundedInt } from '../utils/numbers';
import { HttpError } from '../utils/http-error';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function createLinxController(service: ProductService) {
  const readLimit = (req: Request) => parseBoundedInt(req.query.limit, 20, 1, 500);

  return {
    template: async (_req: Request, res: Response) => {
      const file = await fs.readFile(TEMPLATE_PATH).catch(() => {
        throw new HttpError(500, 'Template do Linx não encontrado em templates/.');
      });
      res.setHeader('Content-Type', XLSX_MIME);
      res.setHeader('Content-Disposition', 'attachment; filename="linx-commerce-template.xlsx"');
      return res.send(file);
    },

    feed: async (req: Request, res: Response) => {
      const limit = readLimit(req);
      const products = (await service.list()).slice(0, limit);
      return res.json({
        source: 'linx-commerce-test-api',
        generatedAt: new Date().toISOString(),
        count: products.length,
        data: products.map((p) => ({
          integrationProductId: p.integrationProductId,
          name: p.name,
          referenceCode: p.referenceCode,
          brand: p.brand,
          category: p.category,
          application: p.application,
          compatibleVehicles: p.compatibleVehicles,
          sku: p.sku,
        })),
      });
    },

    export: async (req: Request, res: Response) => {
      const limit = readLimit(req);
      const products = (await service.list()).slice(0, limit);
      const buffer = await exportProducts(products);
      res.setHeader('Content-Type', XLSX_MIME);
      res.setHeader('Content-Disposition', `attachment; filename="linx-products-test-${products.length}.xlsx"`);
      return res.send(Buffer.from(buffer));
    },

    import: async (req: Request, res: Response) => {
      if (!req.file) return res.status(400).json({ message: 'Envie um arquivo .xlsx no campo "file".' });
      const result = await importProducts(req.file.buffer);
      return res.status(result.validation.valid ? 200 : 422).json(result);
    },
  };
}
