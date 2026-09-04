import sql from 'mssql';
import { Product } from '../types/product';
import { ProductFilters, ProductRepository } from './product.repository';
import { env } from '../config/env';

/**
 * Adapter inicial para o futuro servidor de dados.
 *
 * A tabela esperada está em sql/001_create_linx_products.sql.
 * Em produção, adapte somente este repository caso o ERP/servidor existente
 * tenha outra estrutura. A camada HTTP e os serviços permanecem iguais.
 */

const MAX_ROWS = 1000;

/** Colunas gravadas por create/update/replaceAll, na ordem do INSERT. */
const WRITABLE_COLUMNS = [
  'integration_product_id','name','reference_code','definition','brand','main_category','category',
  'show_on_site','searchable','show_price','show_availability','show_stock','short_description','long_description',
  'page_title','slug','meta_description','search_terms','material','warranty','side','product_weight','product_width',
  'product_height','product_length','commercial_code','voltage','application','vehicle_model','compatible_vehicles','sku_json',
] as const;

interface ProductRow {
  id: number;
  integration_product_id: string;
  name: string;
  reference_code: string;
  definition: string;
  brand: string;
  main_category: string;
  category: string;
  show_on_site: boolean | number;
  searchable: boolean | number;
  show_price: boolean | number;
  show_availability: boolean | number;
  show_stock: boolean | number;
  short_description: string | null;
  long_description: string | null;
  page_title: string | null;
  slug: string | null;
  meta_description: string | null;
  search_terms: string | null;
  material: string | null;
  warranty: string | null;
  side: string | null;
  product_weight: number | string | null;
  product_width: number | string | null;
  product_height: number | string | null;
  product_length: number | string | null;
  commercial_code: string | null;
  voltage: string | null;
  application: string | null;
  vehicle_model: string | null;
  compatible_vehicles: string | null;
  sku_json: string | Product['sku'];
}

export class SqlServerProductRepository implements ProductRepository {
  private pool?: Promise<sql.ConnectionPool>;

  /**
   * A conexão é aberta na primeira consulta, não no construtor: assim uma falha
   * de rede vira erro da requisição (tratável) em vez de unhandled rejection no
   * boot, e instanciar o repository não bloqueia a subida da API.
   */
  private getPool(): Promise<sql.ConnectionPool> {
    this.pool ??= new sql.ConnectionPool({
      server: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      options: {
        encrypt: env.DB_ENCRYPT === 'true',
        trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      },
    })
      .connect()
      .catch((error) => {
        // Sem isto o pool ficaria cacheado como rejeitado para sempre.
        this.pool = undefined;
        throw error;
      });
    return this.pool;
  }

  async close() {
    const pool = this.pool;
    this.pool = undefined;
    if (pool) await pool.then((p) => p.close()).catch(() => undefined);
  }

  private table() {
    // DB_PRODUCTS_TABLE é controlado por configuração; não aceite input HTTP aqui.
    return `[${env.DB_SCHEMA.replace(/[^a-zA-Z0-9_]/g, '')}].[${env.DB_PRODUCTS_TABLE.replace(/[^a-zA-Z0-9_]/g, '')}]`;
  }

  private bindProduct(request: sql.Request, product: Omit<Product, 'id'>) {
    return request
      .input('integration_product_id', sql.NVarChar, product.integrationProductId)
      .input('name', sql.NVarChar, product.name)
      .input('reference_code', sql.NVarChar, product.referenceCode)
      .input('definition', sql.NVarChar, product.definition)
      .input('brand', sql.NVarChar, product.brand)
      .input('main_category', sql.NVarChar, product.mainCategory)
      .input('category', sql.NVarChar, product.category)
      .input('show_on_site', sql.Bit, product.showOnSite)
      .input('searchable', sql.Bit, product.searchable)
      .input('show_price', sql.Bit, product.showPrice)
      .input('show_availability', sql.Bit, product.showAvailability)
      .input('show_stock', sql.Bit, product.showStock)
      .input('short_description', sql.NVarChar, product.shortDescription)
      .input('long_description', sql.NVarChar(sql.MAX), product.longDescription)
      .input('page_title', sql.NVarChar, product.pageTitle)
      .input('slug', sql.NVarChar, product.slug)
      .input('meta_description', sql.NVarChar, product.metaDescription)
      .input('search_terms', sql.NVarChar(sql.MAX), product.searchTerms)
      .input('material', sql.NVarChar, product.material)
      .input('warranty', sql.NVarChar, product.warranty)
      .input('side', sql.NVarChar, product.side)
      .input('product_weight', sql.Decimal(18, 4), product.productWeight)
      .input('product_width', sql.Decimal(18, 4), product.productWidth)
      .input('product_height', sql.Decimal(18, 4), product.productHeight)
      .input('product_length', sql.Decimal(18, 4), product.productLength)
      .input('commercial_code', sql.NVarChar, product.commercialCode)
      .input('voltage', sql.NVarChar, product.voltage)
      .input('application', sql.NVarChar, product.application)
      .input('vehicle_model', sql.NVarChar, product.vehicleModel)
      .input('compatible_vehicles', sql.NVarChar, product.compatibleVehicles)
      .input('sku_json', sql.NVarChar(sql.MAX), JSON.stringify(product.sku));
  }

  private insertSql() {
    return `
      INSERT INTO ${this.table()} (${WRITABLE_COLUMNS.join(',')})
      OUTPUT INSERTED.*
      VALUES (${WRITABLE_COLUMNS.map((c) => `@${c}`).join(',')})
    `;
  }

  async list(filters: ProductFilters = {}) {
    const pool = await this.getPool();
    const request = pool.request();
    const conditions: string[] = [];

    if (filters.search) {
      request.input('search', sql.NVarChar, `%${filters.search}%`);
      conditions.push(
        '(name LIKE @search OR reference_code LIKE @search OR integration_product_id LIKE @search OR category LIKE @search)',
      );
    }
    if (filters.category) {
      request.input('category', sql.NVarChar, `%${filters.category}%`);
      conditions.push('category LIKE @category');
    }
    if (filters.brand) {
      request.input('brand', sql.NVarChar, filters.brand);
      conditions.push('brand = @brand');
    }
    if (filters.minPrice !== undefined) {
      request.input('minPrice', sql.Decimal(18, 2), filters.minPrice);
      conditions.push('TRY_CAST(JSON_VALUE(sku_json, \'$.basePrice\') AS DECIMAL(18,2)) >= @minPrice');
    }
    if (filters.maxPrice !== undefined) {
      request.input('maxPrice', sql.Decimal(18, 2), filters.maxPrice);
      conditions.push('TRY_CAST(JSON_VALUE(sku_json, \'$.basePrice\') AS DECIMAL(18,2)) <= @maxPrice');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await request.query<ProductRow>(`
      SELECT TOP (${MAX_ROWS}) *
      FROM ${this.table()}
      ${where}
      ORDER BY id
    `);

    return result.recordset.map(mapRow);
  }

  async findById(id: number) {
    const pool = await this.getPool();
    const result = await pool.request().input('id', sql.Int, id).query<ProductRow>(`
      SELECT TOP (1) * FROM ${this.table()} WHERE id = @id
    `);
    const row = result.recordset[0];
    return row ? mapRow(row) : null;
  }

  async create(product: Omit<Product, 'id'>) {
    const pool = await this.getPool();
    const result = await this.bindProduct(pool.request(), product).query<ProductRow>(this.insertSql());
    const row = result.recordset[0];
    if (!row) throw new Error('INSERT não retornou a linha criada.');
    return mapRow(row);
  }

  async update(id: number, input: Partial<Omit<Product, 'id'>>) {
    // Leitura + merge + UPDATE completo: gravar só alguns campos faria o PUT
    // aceitar a alteração e descartá-la silenciosamente.
    const current = await this.findById(id);
    if (!current) return null;

    const { id: _ignored, ...merged } = { ...current, ...input };
    const pool = await this.getPool();
    const request = this.bindProduct(pool.request(), merged).input('id', sql.Int, id);
    const result = await request.query<ProductRow>(`
      UPDATE ${this.table()}
      SET ${WRITABLE_COLUMNS.map((c) => `${c}=@${c}`).join(',')}, updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);
    const row = result.recordset[0];
    return row ? mapRow(row) : null;
  }

  async delete(id: number) {
    const pool = await this.getPool();
    const result = await pool.request().input('id', sql.Int, id).query(`DELETE FROM ${this.table()} WHERE id=@id`);
    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async replaceAll(products: Omit<Product, 'id'>[]) {
    const pool = await this.getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await new sql.Request(transaction).query(`DELETE FROM ${this.table()}`);
      const created: Product[] = [];
      for (const p of products) {
        const result = await this.bindProduct(new sql.Request(transaction), p).query<ProductRow>(this.insertSql());
        const row = result.recordset[0];
        if (!row) throw new Error('INSERT não retornou a linha criada.');
        created.push(mapRow(row));
      }
      await transaction.commit();
      return created;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

function mapRow(row: ProductRow): Product {
  return {
    id: Number(row.id),
    integrationProductId: row.integration_product_id,
    name: row.name,
    referenceCode: row.reference_code,
    definition: row.definition,
    brand: row.brand,
    mainCategory: row.main_category,
    category: row.category,
    showOnSite: Boolean(row.show_on_site),
    searchable: Boolean(row.searchable),
    showPrice: Boolean(row.show_price),
    showAvailability: Boolean(row.show_availability),
    showStock: Boolean(row.show_stock),
    shortDescription: row.short_description ?? '',
    longDescription: row.long_description ?? '',
    pageTitle: row.page_title ?? '',
    slug: row.slug ?? '',
    metaDescription: row.meta_description ?? '',
    searchTerms: row.search_terms ?? '',
    material: row.material ?? '',
    warranty: row.warranty ?? '',
    side: row.side ?? '',
    productWeight: Number(row.product_weight ?? 0),
    productWidth: Number(row.product_width ?? 0),
    productHeight: Number(row.product_height ?? 0),
    productLength: Number(row.product_length ?? 0),
    commercialCode: row.commercial_code ?? '',
    voltage: row.voltage ?? '',
    application: row.application ?? '',
    vehicleModel: row.vehicle_model ?? '',
    compatibleVehicles: row.compatible_vehicles ?? '',
    sku: typeof row.sku_json === 'string' ? JSON.parse(row.sku_json) : row.sku_json,
  };
}
