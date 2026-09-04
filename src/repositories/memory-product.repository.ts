import { Product } from '../types/product';
import { ProductFilters, ProductRepository } from './product.repository';

export class MemoryProductRepository implements ProductRepository {
  private products: Product[];
  private nextId = 1;

  constructor(initialProducts: Product[] = []) {
    this.products = structuredClone(initialProducts);
    this.nextId = this.products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  }

  async list(filters: ProductFilters = {}) {
    const search = filters.search?.toLowerCase().trim();
    return this.products.filter((p) => {
      const haystack = [
        p.name,
        p.referenceCode,
        p.integrationProductId,
        p.brand,
        p.category,
        p.application,
        p.vehicleModel,
        p.compatibleVehicles,
        p.sku.referenceCode,
        p.sku.integrationId,
      ].join(' ').toLowerCase();

      if (search && !haystack.includes(search)) return false;
      if (filters.category && !p.category.toLowerCase().includes(filters.category.toLowerCase())) return false;
      if (filters.brand && p.brand.toLowerCase() !== filters.brand.toLowerCase()) return false;
      if (filters.minPrice !== undefined && p.sku.basePrice < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && p.sku.basePrice > filters.maxPrice) return false;
      return true;
    });
  }

  async findById(id: number) {
    return this.products.find((p) => p.id === id) ?? null;
  }

  async create(input: Omit<Product, 'id'>) {
    const product = { ...structuredClone(input), id: this.nextId++ };
    this.products.push(product);
    return product;
  }

  async update(id: number, input: Partial<Omit<Product, 'id'>>) {
    const index = this.products.findIndex((p) => p.id === id);
    if (index < 0) return null;
    this.products[index] = { ...this.products[index], ...structuredClone(input) } as Product;
    return this.products[index];
  }

  async delete(id: number) {
    const before = this.products.length;
    this.products = this.products.filter((p) => p.id !== id);
    return this.products.length !== before;
  }

  async replaceAll(inputs: Omit<Product, 'id'>[]) {
    this.products = inputs.map((p, index) => ({ ...structuredClone(p), id: index + 1 }));
    this.nextId = this.products.length + 1;
    return this.products;
  }
}
