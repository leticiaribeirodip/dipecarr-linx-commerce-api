import { Product } from '../types/product';
import { ProductRepository } from '../repositories/product.repository';
import samples from '../data/product-samples.json';
import { slugify } from '../utils/slug';

export class ProductService {
  /** Quantidade máxima de produtos que generateSamples consegue produzir. */
  readonly maxSamples = samples.length;

  constructor(private readonly repository: ProductRepository) {}

  async list(filters?: Parameters<ProductRepository['list']>[0]) {
    return this.repository.list(filters);
  }

  async findById(id: number) {
    return this.repository.findById(id);
  }

  async create(input: Omit<Product, 'id'>) {
    return this.repository.create(input);
  }

  async update(id: number, input: Partial<Omit<Product, 'id'>>) {
    return this.repository.update(id, input);
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }

  /**
   * Gera produtos de teste a partir das primeiras linhas da planilha fornecida,
   * mas sem reutilizar os IDs reais da plataforma.
   */
  async generateSamples(count = samples.length) {
    const requested = Number.isFinite(count) ? Math.trunc(count) : samples.length;
    const amount = Math.max(1, Math.min(requested, samples.length));
    const products = Array.from({ length: amount }, (_, index) => {
      const s = samples[index % samples.length]!;
      const ref = `TEST-${s.ref}`;
      const integration = `TEST-LINX-${s.ref}`;
      return {
        integrationProductId: integration,
        name: `[TESTE LINX] ${s.name}`,
        referenceCode: ref,
        definition: s.definition || 'Envio Dipecarr',
        brand: s.brand || 'Dipecarr',
        mainCategory: s.mainCategory,
        category: s.category,
        showOnSite: true,
        searchable: true,
        showPrice: true,
        showAvailability: true,
        showStock: true,
        shortDescription: s.shortDescription || s.name,
        longDescription: s.longDescription || `<p>${s.name}</p>`,
        pageTitle: s.pageTitle || s.name,
        slug: slugify(`${s.slug || `produto-${s.ref}`}-teste-linx`),
        metaDescription: s.metaDescription || s.name,
        searchTerms: s.searchTerms || s.name,
        material: s.material || '',
        warranty: s.warranty || '180 DIAS',
        side: s.side || 'AMBOS',
        productWeight: toNumber(s.weight),
        productWidth: toNumber(s.width),
        productHeight: toNumber(s.height),
        productLength: toNumber(s.length),
        commercialCode: s.commercialCode || '',
        voltage: s.voltage || '',
        application: s.application || '',
        vehicleModel: s.vehicleModel || '',
        compatibleVehicles: s.compatibleVehicles || '',
        sku: {
          id: 0,
          integrationId: `${integration}-SKU`,
          name: `[TESTE LINX] ${s.name}`,
          referenceCode: `${ref}-SKU`,
          supplier: 'Dipecarr',
          ean: '',
          stock: toNumber(s.stock),
          sellWithoutStock: false,
          maxBackorder: 0,
          shippingDaysWithStock: 0,
          shippingDaysWithoutStock: 0,
          minimumStockEnabled: true,
          minimumStock: 0,
          basePrice: toNumber(s.basePrice),
          costPrice: toNumber(s.costPrice),
          tax: 0,
          promotion: false,
          promotionPrice: 0,
          virtual: false,
          weight: toNumber(s.weight),
          width: toNumber(s.width),
          height: toNumber(s.height),
          depth: toNumber(s.length),
          condition: s.condition || 'Novo',
          showCondition: true,
          packageQuantity: toNumber(s.packageQty) || 1,
          unitOfMeasure: s.unit || 'Centímetros',
          pointsProgram: false,
          points: 0,
        },
      } satisfies Omit<Product, 'id'>;
    });

    return this.repository.replaceAll(products);
  }
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const normalized = String(value).replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
