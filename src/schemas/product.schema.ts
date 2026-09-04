import { z } from 'zod';
import { Product } from '../types/product';

const skuSchema = z.object({
  id: z.number().int().default(0),
  integrationId: z.string().min(1),
  name: z.string().min(1),
  referenceCode: z.string().min(1),
  supplier: z.string().default(''),
  ean: z.string().default(''),
  stock: z.number().default(0),
  sellWithoutStock: z.boolean().default(false),
  maxBackorder: z.number().default(0),
  shippingDaysWithStock: z.number().int().default(0),
  shippingDaysWithoutStock: z.number().int().default(0),
  minimumStockEnabled: z.boolean().default(false),
  minimumStock: z.number().default(0),
  basePrice: z.number().default(0),
  costPrice: z.number().default(0),
  tax: z.number().default(0),
  promotion: z.boolean().default(false),
  promotionPrice: z.number().default(0),
  virtual: z.boolean().default(false),
  weight: z.number().default(0),
  width: z.number().default(0),
  height: z.number().default(0),
  depth: z.number().default(0),
  condition: z.string().default('Novo'),
  showCondition: z.boolean().default(true),
  packageQuantity: z.number().default(1),
  unitOfMeasure: z.string().default('Centímetros'),
  pointsProgram: z.boolean().default(false),
  points: z.number().default(0),
});

export const createProductSchema = z.object({
  integrationProductId: z.string().min(1),
  name: z.string().min(1),
  referenceCode: z.string().min(1),
  definition: z.string().default(''),
  brand: z.string().default(''),
  mainCategory: z.string().default(''),
  category: z.string().default(''),
  showOnSite: z.boolean().default(true),
  searchable: z.boolean().default(true),
  showPrice: z.boolean().default(true),
  showAvailability: z.boolean().default(true),
  showStock: z.boolean().default(true),
  shortDescription: z.string().default(''),
  longDescription: z.string().default(''),
  pageTitle: z.string().default(''),
  slug: z.string().default(''),
  metaDescription: z.string().default(''),
  searchTerms: z.string().default(''),
  material: z.string().default(''),
  warranty: z.string().default(''),
  side: z.string().default(''),
  productWeight: z.number().default(0),
  productWidth: z.number().default(0),
  productHeight: z.number().default(0),
  productLength: z.number().default(0),
  commercialCode: z.string().default(''),
  voltage: z.string().default(''),
  application: z.string().default(''),
  vehicleModel: z.string().default(''),
  compatibleVehicles: z.string().default(''),
  sku: skuSchema,
});

/**
 * PUT aceita campos parciais, mas `sku` continua sendo substituído por inteiro:
 * os repositories fazem merge raso, então um sku parcial apagaria os demais campos.
 */
export const updateProductSchema = createProductSchema.partial();

// Garante em tempo de compilação que o schema e o tipo Product não divirjam.
type CreateInput = z.infer<typeof createProductSchema>;
const _typeCheck: CreateInput extends Omit<Product, 'id'> ? true : never = true;
void _typeCheck;
