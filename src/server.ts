import { createApp } from './app';
import { env } from './config/env';
import { MemoryProductRepository } from './repositories/memory-product.repository';
import { ProductRepository } from './repositories/product.repository';
import { ProductService } from './services/product.service';

async function createRepository(): Promise<ProductRepository> {
  if (env.DATA_SOURCE !== 'sqlserver') {
    const repository = new MemoryProductRepository();
    // Em modo memory, a API começa com o catálogo de teste baseado na planilha.
    await new ProductService(repository).generateSamples(20);
    return repository;
  }

  // Import dinâmico: o driver mssql carrega centenas de arquivos e só é
  // necessário quando DATA_SOURCE=sqlserver.
  const { SqlServerProductRepository } = await import('./repositories/sqlserver-product.repository.js');
  return new SqlServerProductRepository();
}

async function bootstrap() {
  const app = createApp(await createRepository());
  const server = app.listen(env.PORT, () => {
    console.log(`Linx Commerce Test API em http://localhost:${env.PORT}`);
    console.log(`Swagger em http://localhost:${env.PORT}/docs`);
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  }
}

bootstrap().catch((error) => {
  console.error('Falha ao iniciar API:', error);
  process.exit(1);
});
