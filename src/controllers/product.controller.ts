import { Request, Response } from 'express';
import { z } from 'zod';
import { ProductService } from '../services/product.service';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema';
import { parseBoundedInt } from '../utils/numbers';

const idSchema = z.coerce.number().int().positive();
const priceSchema = z.coerce.number().finite();

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function optionalPrice(value: unknown) {
  const parsed = priceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function createProductController(service: ProductService) {
  return {
    list: async (req: Request, res: Response) => {
      const result = await service.list({
        search: optionalString(req.query.search),
        category: optionalString(req.query.category),
        brand: optionalString(req.query.brand),
        minPrice: optionalPrice(req.query.minPrice),
        maxPrice: optionalPrice(req.query.maxPrice),
      });
      return res.json({ count: result.length, data: result });
    },

    get: async (req: Request, res: Response) => {
      const parsed = idSchema.safeParse(req.params.id);
      if (!parsed.success) return res.status(400).json({ message: 'ID inválido.' });
      const product = await service.findById(parsed.data);
      if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });
      return res.json(product);
    },

    create: async (req: Request, res: Response) => {
      const parsed = createProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Dados inválidos.', errors: parsed.error.issues });
      }
      const created = await service.create(parsed.data);
      return res.status(201).json(created);
    },

    update: async (req: Request, res: Response) => {
      const id = idSchema.safeParse(req.params.id);
      if (!id.success) return res.status(400).json({ message: 'ID inválido.' });

      const body = updateProductSchema.safeParse(req.body);
      if (!body.success) {
        return res.status(400).json({ message: 'Dados inválidos.', errors: body.error.issues });
      }

      const updated = await service.update(id.data, body.data);
      if (!updated) return res.status(404).json({ message: 'Produto não encontrado.' });
      return res.json(updated);
    },

    delete: async (req: Request, res: Response) => {
      const parsed = idSchema.safeParse(req.params.id);
      if (!parsed.success) return res.status(400).json({ message: 'ID inválido.' });
      const deleted = await service.delete(parsed.data);
      if (!deleted) return res.status(404).json({ message: 'Produto não encontrado.' });
      return res.status(204).send();
    },

    generate: async (req: Request, res: Response) => {
      const max = service.maxSamples;
      const count = parseBoundedInt(req.body?.count, max, 1, max);
      const products = await service.generateSamples(count);
      return res.status(201).json({ message: 'Produtos de teste gerados.', count: products.length, data: products });
    },
  };
}
