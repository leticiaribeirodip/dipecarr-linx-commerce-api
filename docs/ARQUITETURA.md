# Arquitetura

A aplicação separa o que é **fonte de dados** do que é **integração com Linx**.

```text
HTTP
 │
 ├── AuthController → AuthService → JWT
 │
 ├── ProductController
 │        ↓
 │   ProductService
 │        ↓
 │   ProductRepository
 │       ├── Memory
 │       └── SQL Server
 │
 └── LinxController
          ↓
     LinxExcelService
          ↓
     Template XLSX
```

## Por que essa separação?

Porque o banco real ainda precisa ser descoberto.

Não devemos acoplar os endpoints ao banco antes de saber se:

- o produto vem do ERP;
- o SKU vem de outra tabela;
- preço e estoque vêm de serviços separados;
- existem views/stored procedures;
- há uma API intermediária;
- o Linx é alimentado por arquivo, API ou ambos.

Quando essas respostas existirem, o repository e o futuro `LinxCommerceClient` podem ser implementados sem alterar a interface HTTP.
