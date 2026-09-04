import { Product } from '../types/product';

export interface ProductFilters {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductRepository {
  list(filters?: ProductFilters): Promise<Product[]>;
  findById(id: number): Promise<Product | null>;
  create(product: Omit<Product, 'id'>): Promise<Product>;
  update(id: number, product: Partial<Omit<Product, 'id'>>): Promise<Product | null>;
  delete(id: number): Promise<boolean>;
  replaceAll(products: Omit<Product, 'id'>[]): Promise<Product[]>;
}
