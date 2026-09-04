const bearer = [{ bearerAuth: [] }];
const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
};
const limitParam = {
  name: 'limit',
  in: 'query',
  required: false,
  schema: { type: 'integer', minimum: 1, maximum: 500, default: 20 },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Linx Commerce Test API',
    version: '1.0.0',
    description: 'API para testar integração de produtos com a planilha de importação do Linx Commerce.',
  },
  // Relativo à URL do próprio /docs: acompanha a PORT configurada e funciona
  // também quando a API é acessada por outro host.
  servers: [{ url: '/', description: 'Servidor atual' }],
  paths: {
    '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
    '/api/auth/login': {
      post: {
        summary: 'Login JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: { '200': { description: 'Token JWT' }, '401': { description: 'Credenciais inválidas' } },
      },
    },
    '/api/auth/me': {
      get: { summary: 'Dados do token atual', security: bearer, responses: { '200': { description: 'OK' } } },
    },
    '/api/products': {
      get: {
        summary: 'Lista produtos',
        security: bearer,
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        ],
        responses: { '200': { description: 'Lista de produtos' } },
      },
      post: {
        summary: 'Cria produto',
        security: bearer,
        responses: { '201': { description: 'Criado' }, '400': { description: 'Dados inválidos' } },
      },
    },
    '/api/products/{id}': {
      get: { summary: 'Busca produto', security: bearer, parameters: [idParam], responses: { '200': { description: 'OK' }, '404': { description: 'Não encontrado' } } },
      put: { summary: 'Atualiza produto', security: bearer, parameters: [idParam], responses: { '200': { description: 'OK' }, '404': { description: 'Não encontrado' } } },
      delete: { summary: 'Remove produto', security: bearer, parameters: [idParam], responses: { '204': { description: 'Removido' }, '404': { description: 'Não encontrado' } } },
    },
    '/api/products/generate-samples': {
      post: { summary: 'Gera produtos de teste derivados do template', security: bearer, responses: { '201': { description: 'Gerados' } } },
    },
    '/api/linx/template': {
      get: { summary: 'Baixa o template XLSX do Linx', security: bearer, responses: { '200': { description: 'Arquivo XLSX' } } },
    },
    '/api/linx/products/feed': {
      get: { summary: 'Feed resumido de produtos', security: bearer, parameters: [limitParam], responses: { '200': { description: 'OK' } } },
    },
    '/api/linx/products/export': {
      get: { summary: 'Exporta XLSX no formato Linx', security: bearer, parameters: [limitParam], responses: { '200': { description: 'Arquivo XLSX' } } },
    },
    '/api/linx/products/import': {
      post: {
        summary: 'Valida um XLSX do Linx',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] },
            },
          },
        },
        responses: { '200': { description: 'Planilha válida' }, '422': { description: 'Planilha com erros' } },
      },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
};
