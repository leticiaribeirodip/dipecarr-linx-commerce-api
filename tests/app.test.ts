import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../src/app';
import { MemoryProductRepository } from '../src/repositories/memory-product.repository';
import { ProductService } from '../src/services/product.service';

const credentials = {
  email: process.env.ADMIN_EMAIL ?? 'admin@local.test',
  password: process.env.ADMIN_PASSWORD ?? 'Admin123!',
};

async function authenticatedApp(sampleCount = 2) {
  const repository = new MemoryProductRepository();
  await new ProductService(repository).generateSamples(sampleCount);
  const app = createApp(repository);
  const login = await request(app).post('/api/auth/login').send(credentials);
  return { app, token: login.body.accessToken as string, login };
}

describe('Linx Commerce Test API', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    const context = await authenticatedApp(2);
    app = context.app;
    token = context.token;
    expect(context.login.status).toBe(200);
    expect(token).toBeTruthy();
  });

  it('responde health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('lista produtos autenticado', async () => {
    const response = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
  });

  it('rejeita produtos sem token', async () => {
    const response = await request(app).get('/api/products');
    expect(response.status).toBe(401);
  });

  it('responde 404 em JSON para rota desconhecida', async () => {
    const response = await request(app).get('/rota-que-nao-existe');
    expect(response.status).toBe(404);
    expect(response.body.message).toContain('Rota não encontrada');
  });

  // Fora de produção o ETag faz o navegador revalidar e receber 304, e o
  // Swagger UI mostra a resposta sem body.
  it('não envia ETag e marca no-store fora de produção', async () => {
    const response = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`);
    expect(response.headers.etag).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('responde 200 mesmo com If-None-Match reenviado', async () => {
    const first = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`);
    const second = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .set('If-None-Match', first.headers.etag ?? 'W/"qualquer-coisa"');
    expect(second.status).toBe(200);
    expect(second.body.count).toBe(2);
  });

  it('recusa payload de produto sem sku', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', integrationProductId: 'X', referenceCode: 'X', sku: 'nao-e-objeto' });
    expect(response.status).toBe(400);
  });

  it('ignora limit inválido no feed em vez de devolver lista vazia', async () => {
    const response = await request(app)
      .get('/api/linx/products/feed?limit=abc')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
  });

  it('gera amostras mesmo com count inválido', async () => {
    const response = await request(app)
      .post('/api/products/generate-samples')
      .set('Authorization', `Bearer ${token}`)
      .send({ count: 'abc' });
    expect(response.status).toBe(201);
    expect(response.body.count).toBeGreaterThan(0);
  });
});

describe('Exportação XLSX', () => {
  it('grava os valores dos produtos nas linhas da planilha', async () => {
    const { app, token } = await authenticatedApp(2);
    const response = await request(app)
      .get('/api/linx/products/export?limit=2')
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body);
    const sheet = workbook.getWorksheet('PRODUTOS');
    expect(sheet).toBeDefined();

    const headers: string[] = [];
    sheet!.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = String(cell.value ?? '').trim();
    });

    const nameColumn = headers.indexOf('Nome do Produto') + 1;
    expect(nameColumn).toBeGreaterThan(0);

    // Antes da correção addRow recebia um objeto e, como a planilha lida do
    // template não tem column.key, as linhas saíam completamente em branco —
    // e as ~6.500 linhas de exemplo do template continuavam no arquivo.
    expect(sheet!.rowCount).toBe(3);
    expect(String(sheet!.getRow(2).getCell(nameColumn).value)).toContain('[TESTE LINX]');
    expect(String(sheet!.getRow(3).getCell(nameColumn).value)).toContain('[TESTE LINX]');
  }, 120_000);

  it('reimporta o próprio arquivo exportado sem erros de validação', async () => {
    const repository = new MemoryProductRepository();
    const products = await new ProductService(repository).generateSamples(3);

    const { exportProducts, importProducts } = await import('../src/services/linx-excel.service.js');
    const result = await importProducts(Buffer.from(await exportProducts(products)));

    expect(result.rowsRead).toBe(3);
    expect(result.validation.errors).toEqual([]);
    expect(result.validation.valid).toBe(true);
    expect(result.rows[0]?.['Nome do Produto']).toContain('[TESTE LINX]');
  }, 120_000);
});
