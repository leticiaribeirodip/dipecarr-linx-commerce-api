import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { MemoryProductRepository } from '../src/repositories/memory-product.repository';
import { ProductService } from '../src/services/product.service';

describe('Linx Commerce Test API', () => {
  it('responde health', async () => {
    const app = createApp(new MemoryProductRepository());
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('faz login e acessa produtos', async () => {
    const repo = new MemoryProductRepository();
    const service = new ProductService(repo);
    await service.generateSamples(2);

    const app = createApp(repo);
    const login = await request(app).post('/api/auth/login').send({
      email: process.env.ADMIN_EMAIL ?? 'admin@local.test',
      password: process.env.ADMIN_PASSWORD ?? 'Admin123!',
    });

    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();

    const products = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(products.status).toBe(200);
    expect(products.body.count).toBe(2);
  });
});
