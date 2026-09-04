# Linx Commerce Test API

API Node.js + TypeScript criada para testar o fluxo de catálogo/integracão com o **Linx Commerce**, usando como fonte de verdade o template de importação de produtos fornecido.

> **Importante:** esta API não chama a API do Linx diretamente. Ela prepara e valida os dados no mesmo formato da planilha, permitindo testar o fluxo com segurança antes de conectar os servidores reais.

## O que já vem pronto

- Node.js 22+ e TypeScript.
- Express 5.
- JWT Bearer Authentication.
- Hash de senha com bcrypt.
- CORS + Helmet.
- Swagger em `/docs`.
- CRUD de produtos.
- Busca por nome, código, categoria e marca.
- Geração automática de produtos de teste baseada nas primeiras linhas do template recebido.
- Exportação de XLSX no formato do template Linx.
- Importação/validação de XLSX.
- Repository Pattern.
- Adapter para memória, para testar imediatamente.
- Adapter preparado para SQL Server, sem credenciais reais.
- Script SQL para criar a tabela de apoio.
- Teste automatizado com Vitest + Supertest.
- Template original preservado em `templates/`.

## Fluxo recomendado para testar o Linx

```text
                    ┌─────────────────────────┐
                    │  API Node + JWT         │
                    │  localhost:3333         │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
        Produtos JSON       Exportação XLSX    Importação XLSX
              │                  │                  │
              │                  ▼                  │
              │       Template Linx Commerce      │
              │                  │                  │
              └──────────────────┴──────────────────┘
                                 │
                                 ▼
                         Linx Commerce
                                 │
                                 ▼
                       Loja / catálogo / testes

       Futuro:
       API → SQL Server / ERP → API Linx → Linx Commerce
```

## Instalação

```bash
npm install
copy .env.example .env
npm run dev
```

Linux/macOS:

```bash
cp .env.example .env
npm install
npm run dev
```

API:

- `http://localhost:3333`
- Swagger: `http://localhost:3333/docs`
- Health: `http://localhost:3333/health`

### Usuário inicial

```text
E-mail: admin@local.test
Senha:  Admin123!
```

Troque no `.env` antes de qualquer uso real.

## Endpoints

### Auth

| Método | Endpoint | Auth |
|---|---|---|
| POST | `/api/auth/login` | Não |
| GET | `/api/auth/me` | JWT |

Login:

```json
{
  "email": "admin@local.test",
  "password": "Admin123!"
}
```

Resposta:

```json
{
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresIn": "8h",
  "user": {
    "id": 1,
    "email": "admin@local.test",
    "name": "Administrador de Testes Linx",
    "role": "admin"
  }
}
```

### Produtos

Todos exigem:

```http
Authorization: Bearer SEU_TOKEN
```

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/products` | Lista produtos |
| GET | `/api/products/:id` | Detalhe |
| POST | `/api/products` | Cria |
| PUT | `/api/products/:id` | Atualiza |
| DELETE | `/api/products/:id` | Remove |
| POST | `/api/products/generate-samples` | Gera produtos de teste |

Exemplos de busca:

```text
GET /api/products?search=SCANIA
GET /api/products?category=Elétrica
GET /api/products?brand=Dipecarr
GET /api/products?minPrice=50&maxPrice=200
```

Gerar novamente:

```json
POST /api/products/generate-samples

{
  "count": 20
}
```

## Endpoints específicos do Linx

### Baixar template

```http
GET /api/linx/template
```

Retorna um `.xlsx` baseado no arquivo recebido.

### Feed JSON de teste

```http
GET /api/linx/products/feed?limit=20
```

Esse endpoint é propositalmente um **feed da API de teste**, não uma alegação de que este é o endpoint oficial da Linx. Ele serve para validar o contrato da sua camada de integração antes de conectar o client oficial do Linx.

### Exportar produtos de teste

```http
GET /api/linx/products/export?limit=20
```

O arquivo contém as abas:

- `INSTRUCOES`
- `PRODUTOS`
- `DEFINIÇÕES DE PRODUTO`

A aba `PRODUTOS` usa as **81 colunas do template** recebido.

Os IDs reais do template não são reutilizados. Os produtos gerados recebem códigos de teste como:

```text
TEST-LINX-658
TEST-658
TEST-LINX-658-SKU
```

Isso reduz o risco de você enviar acidentalmente IDs de produção para o Linx.

### Importar e validar um XLSX

Campo multipart:

```text
file = arquivo.xlsx
```

Endpoint:

```http
POST /api/linx/products/import
```

Exemplo com cURL:

```bash
curl -X POST http://localhost:3333/api/linx/products/import \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "file=@linx-products-test-20.xlsx"
```

A API verifica se as 81 colunas do template estão presentes e valida os principais campos obrigatórios.

## Como conectar ao servidor de dados depois

Por enquanto:

```env
DATA_SOURCE=memory
```

Quando você tiver os dados reais:

```env
DATA_SOURCE=sqlserver
DB_HOST=servidor
DB_PORT=1433
DB_USER=usuario
DB_PASSWORD=senha
DB_NAME=banco
DB_SCHEMA=dbo
DB_PRODUCTS_TABLE=linx_products
```

A API usa:

```text
Controller
   ↓
Service
   ↓
ProductRepository
   ├── MemoryProductRepository
   └── SqlServerProductRepository
```

Assim você não precisa reescrever os endpoints quando descobrir a estrutura real do banco.

### Ponto importante

O adapter SQL Server fornecido é uma **estrutura inicial**, não uma suposição de que o banco da empresa tenha exatamente essa tabela.

Quando você descobrir:

- servidor;
- banco;
- tabelas;
- views;
- stored procedures;
- relacionamentos;
- origem de estoque;
- origem de preço;
- origem de cadastro de produto;

você adapta apenas o repository/queries.

## Segurança

Antes de produção:

- alterar `JWT_SECRET`;
- remover senha padrão;
- usar HTTPS;
- restringir `CORS_ORIGIN`;
- colocar secrets em secret manager;
- limitar rate;
- adicionar auditoria;
- não expor banco diretamente na internet;
- separar DEV/HML/PROD;
- adicionar controle de permissões por endpoint;
- configurar logs centralizados.

## Próxima evolução

A estrutura foi pensada para evoluir para:

```text
ERP / Banco
     ↓
Integration API (.NET ou Node)
     ↓
Linx Commerce
     ↓
dip.com.br

Linx / E-commerce
     ↓
Customer / Order / Product Events
     ↓
Salesforce / BI / WhatsApp
```

A próxima etapa ideal, depois de você conseguir acesso à documentação/API do ambiente Linx, é criar um `LinxCommerceClient` separado do repository de dados, com:

- autenticação da API Linx;
- consulta de produtos;
- envio/atualização;
- estoque;
- preços;
- pedidos;
- clientes;
- webhooks/events, quando disponíveis;
- retry e logs;
- filas;
- idempotência;
- correlação de requisições.

Isso mantém a integração externa isolada e segura.

## Testes

```bash
npm test
```

Build:

```bash
npm run build
```

## Arquivos importantes

```text
src/
├── config/
│   └── env.ts
├── controllers/
├── data/
│   └── product-samples.json
├── middlewares/
├── repositories/
│   ├── memory-product.repository.ts
│   ├── product.repository.ts
│   └── sqlserver-product.repository.ts
├── routes/
├── services/
│   ├── auth.service.ts
│   ├── linx-excel.service.ts
│   └── product.service.ts
├── types/
├── app.ts
└── server.ts

sql/
└── 001_create_linx_products.sql

templates/
└── Exportacao de Produtos Linx - Template.xlsx
```

## Observação sobre o template

O projeto foi montado a partir da planilha fornecida nesta conversa. A estrutura mantém as três abas originais e utiliza as 81 colunas da aba `PRODUTOS`.

A API transforma os registros de teste para o padrão textual usado no arquivo, inclusive valores `Sim/Não`, preços com vírgula e campos de SKU.
